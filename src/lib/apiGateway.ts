// API Gateway with Rate Limiting & Security
import { NextRequest, NextResponse } from 'next/server';
import { multiTenantService } from './multiTenant';
import { billingService } from './billing';
import { monitoringService } from './monitoring';
import { getCurrentUser } from './supabase';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: NextRequest) => string;
  message?: string;
}

export interface APIQuota {
  tenantId: string;
  endpoint: string;
  limit: number;
  used: number;
  resetDate: string;
}

export interface APIKey {
  id: string;
  tenantId: string;
  key: string;
  name: string;
  permissions: string[];
  rateLimit: RateLimitConfig;
  status: 'active' | 'suspended' | 'revoked';
  lastUsed?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface RequestLog {
  id: string;
  tenantId: string;
  apiKey?: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  userAgent: string;
  ip: string;
  timestamp: string;
}

export class APIGatewayService {
  private static instance: APIGatewayService;
  private rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();
  private quotaStore: Map<string, APIQuota> = new Map();
  private apiKeys: Map<string, APIKey> = new Map();
  private requestLogs: RequestLog[] = [];

  // Default rate limits by plan
  private readonly DEFAULT_RATE_LIMITS = {
    starter: { windowMs: 60000, maxRequests: 100 }, // 100 requests per minute
    professional: { windowMs: 60000, maxRequests: 500 }, // 500 requests per minute
    enterprise: { windowMs: 60000, maxRequests: 2000 }, // 2000 requests per minute
  };

  // Default quotas by plan (per month)
  private readonly DEFAULT_QUOTAS = {
    starter: { transactions: 10000, storage: 100 },
    professional: { transactions: 50000, storage: 500 },
    enterprise: { transactions: -1, storage: 2000 }, // unlimited
  };

  public static getInstance(): APIGatewayService {
    if (!APIGatewayService.instance) {
      APIGatewayService.instance = new APIGatewayService();
    }
    return APIGatewayService.instance;
  }

  constructor() {
    this.initializeCleanup();
  }

  /**
   * Initialize cleanup tasks
   */
  private initializeCleanup(): void {
    // Clean up expired rate limit entries every 5 minutes
    setInterval(() => {
      this.cleanupExpiredRateLimits();
    }, 5 * 60 * 1000);

    // Clean up old request logs every hour
    setInterval(() => {
      this.cleanupRequestLogs();
    }, 60 * 60 * 1000);
  }

  /**
   * Middleware for API authentication and rate limiting
   */
  async middleware(request: NextRequest): Promise<NextResponse | null> {
    const startTime = Date.now();
    
    try {
      // Skip middleware for non-API routes
      if (!request.nextUrl.pathname.startsWith('/api/')) {
        return null;
      }

      // Skip middleware for health checks and webhooks
      if (request.nextUrl.pathname.includes('/health') || 
          request.nextUrl.pathname.includes('/webhook')) {
        return null;
      }

      // Extract API key or user authentication
      const apiKey = this.extractAPIKey(request);
      const user = await getCurrentUser();

      let tenantId: string | null = null;
      let rateLimitConfig: RateLimitConfig;

      if (apiKey) {
        // API key authentication
        const keyData = await this.validateAPIKey(apiKey);
        if (!keyData) {
          return this.createErrorResponse(401, 'Invalid API key');
        }
        tenantId = keyData.tenantId;
        rateLimitConfig = keyData.rateLimit;
      } else if (user) {
        // User authentication
        const tenant = multiTenantService.getCurrentTenant();
        if (!tenant) {
          return this.createErrorResponse(401, 'No tenant context');
        }
        tenantId = tenant.id;
        rateLimitConfig = this.getRateLimitForPlan(tenant.plan);
      } else {
        return this.createErrorResponse(401, 'Authentication required');
      }

      // Check rate limits
      const rateLimitCheck = await this.checkRateLimit(request, tenantId!, rateLimitConfig);
      if (!rateLimitCheck.allowed) {
        return this.createRateLimitResponse(rateLimitCheck);
      }

      // Check API quotas
      const quotaCheck = await this.checkQuota(tenantId, request.nextUrl.pathname);
      if (!quotaCheck.allowed) {
        return this.createQuotaResponse(quotaCheck);
      }

      // Log request
      await this.logRequest(request, tenantId!, apiKey || undefined, startTime);

      return null; // Allow request to continue
    } catch (error) {
      monitoringService.captureError(error as Error, {
        component: 'api_gateway',
        action: 'middleware',
        path: request.nextUrl.pathname,
      });
      
      return this.createErrorResponse(500, 'Internal server error');
    }
  }

  /**
   * Extract API key from request
   */
  private extractAPIKey(request: NextRequest): string | null {
    // Check Authorization header
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check X-API-Key header
    const apiKeyHeader = request.headers.get('X-API-Key');
    if (apiKeyHeader) {
      return apiKeyHeader;
    }

    // Check query parameter
    const url = new URL(request.url);
    const apiKeyParam = url.searchParams.get('api_key');
    if (apiKeyParam) {
      return apiKeyParam;
    }

    return null;
  }

  /**
   * Validate API key
   */
  private async validateAPIKey(key: string): Promise<APIKey | null> {
    // Check in-memory cache first
    const cachedKey = this.apiKeys.get(key);
    if (cachedKey) {
      if (cachedKey.status !== 'active') {
        return null;
      }
      if (cachedKey.expiresAt && new Date(cachedKey.expiresAt) < new Date()) {
        return null;
      }
      return cachedKey;
    }

    // Check database
    try {
      const query = multiTenantService.getTenantQuery('api_keys');
      const { data, error } = await query
        .eq('key', key)
        .eq('status', 'active')
        .single();

      if (error || !data) {
        return null;
      }

      // Cache the key
      this.apiKeys.set(key, data);
      
      return data;
    } catch (error) {
      monitoringService.captureError(error as Error, {
        component: 'api_gateway',
        action: 'validate_api_key',
      });
      return null;
    }
  }

  /**
   * Get rate limit configuration for plan
   */
  private getRateLimitForPlan(plan: string): RateLimitConfig {
    const config = this.DEFAULT_RATE_LIMITS[plan as keyof typeof this.DEFAULT_RATE_LIMITS];
    return config || this.DEFAULT_RATE_LIMITS.starter;
  }

  /**
   * Check rate limit
   */
  private async checkRateLimit(
    request: NextRequest,
    tenantId: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; limit: number; remaining: number; resetTime: number }> {
    const key = config.keyGenerator ? config.keyGenerator(request) : `${tenantId}:${request.nextUrl.pathname}`;
    const now = Date.now();
    
    const entry = this.rateLimitStore.get(key);
    
    if (!entry || now > entry.resetTime) {
      // New window
      const resetTime = now + config.windowMs;
      this.rateLimitStore.set(key, { count: 1, resetTime });
      
      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        resetTime,
      };
    }
    
    if (entry.count >= config.maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }
    
    // Increment counter
    entry.count++;
    
    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Check API quota
   */
  private async checkQuota(tenantId: string, endpoint: string): Promise<{ allowed: boolean; quota: APIQuota }> {
    const quotaKey = `${tenantId}:${endpoint}`;
    
    // Get or create quota
    let quota = this.quotaStore.get(quotaKey);
    if (!quota) {
      const tenant = multiTenantService.getCurrentTenant();
      const planQuotas = this.DEFAULT_QUOTAS[tenant?.plan as keyof typeof this.DEFAULT_QUOTAS] || this.DEFAULT_QUOTAS.starter;
      
      quota = {
        tenantId,
        endpoint,
        limit: planQuotas.transactions,
        used: 0,
        resetDate: this.getNextMonthStart(),
      };
      
      this.quotaStore.set(quotaKey, quota);
    }
    
    // Check if quota period has reset
    if (new Date(quota.resetDate) <= new Date()) {
      quota.used = 0;
      quota.resetDate = this.getNextMonthStart();
    }
    
    // Check if quota is exceeded
    if (quota.limit !== -1 && quota.used >= quota.limit) {
      return { allowed: false, quota };
    }
    
    // Increment usage
    quota.used++;
    
    return { allowed: true, quota };
  }

  /**
   * Log API request
   */
  private async logRequest(
    request: NextRequest,
    tenantId: string,
    apiKey?: string,
    startTime?: number
  ): Promise<void> {
    const log: RequestLog = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      apiKey,
      endpoint: request.nextUrl.pathname,
      method: request.method,
      statusCode: 0, // Will be updated by response middleware
      responseTime: startTime ? Date.now() - startTime : 0,
      userAgent: request.headers.get('User-Agent') || 'Unknown',
      ip: request.headers.get('X-Forwarded-For') || request.headers.get('X-Real-IP') || 'Unknown',
      timestamp: new Date().toISOString(),
    };

    this.requestLogs.push(log);

    // Send to monitoring service
    monitoringService.recordMetric('api_request', 1, {
      tenantId,
      endpoint: request.nextUrl.pathname,
      method: request.method,
    });
  }

  /**
   * Create error response
   */
  private createErrorResponse(status: number, message: string): NextResponse {
    return NextResponse.json(
      { error: message, timestamp: new Date().toISOString() },
      { status }
    );
  }

  /**
   * Create rate limit response
   */
  private createRateLimitResponse(rateLimitCheck: any): NextResponse {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        limit: rateLimitCheck.limit,
        remaining: rateLimitCheck.remaining,
        resetTime: rateLimitCheck.resetTime,
        timestamp: new Date().toISOString(),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitCheck.limit.toString(),
          'X-RateLimit-Remaining': rateLimitCheck.remaining.toString(),
          'X-RateLimit-Reset': rateLimitCheck.resetTime.toString(),
        },
      }
    );
  }

  /**
   * Create quota response
   */
  private createQuotaResponse(quotaCheck: any): NextResponse {
    return NextResponse.json(
      {
        error: 'API quota exceeded',
        quota: quotaCheck.quota,
        timestamp: new Date().toISOString(),
      },
      { status: 402 } // Payment Required
    );
  }

  /**
   * Generate API key
   */
  async generateAPIKey(
    tenantId: string,
    name: string,
    permissions: string[] = ['read'],
    expiresAt?: string
  ): Promise<APIKey> {
    const key = `sk_${tenantId.substring(0, 8)}_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
    
    const tenant = multiTenantService.getCurrentTenant();
    const rateLimitConfig = this.getRateLimitForPlan(tenant?.plan || 'starter');

    const apiKey: APIKey = {
      id: `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      key,
      name,
      permissions,
      rateLimit: rateLimitConfig,
      status: 'active',
      createdAt: new Date().toISOString(),
      expiresAt,
    };

    // Save to database
    await multiTenantService.insertWithTenant('api_keys', apiKey);
    
    // Cache the key
    this.apiKeys.set(key, apiKey);

    return apiKey;
  }

  /**
   * Revoke API key
   */
  async revokeAPIKey(keyId: string): Promise<void> {
    await multiTenantService.updateWithTenant('api_keys', keyId, {
      status: 'revoked',
      revokedAt: new Date().toISOString(),
    });

    // Remove from cache
    for (const [key, apiKey] of this.apiKeys.entries()) {
      if (apiKey.id === keyId) {
        this.apiKeys.delete(key);
        break;
      }
    }
  }

  /**
   * Get tenant API keys
   */
  async getTenantAPIKeys(tenantId: string): Promise<APIKey[]> {
    const query = multiTenantService.getTenantQuery('api_keys');
    const { data, error } = await query
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to get API keys');
    }

    return data || [];
  }

  /**
   * Get API usage statistics
   */
  async getAPIUsage(tenantId: string, days: number = 30): Promise<{
    totalRequests: number;
    requestsByEndpoint: Record<string, number>;
    requestsByDay: Record<string, number>;
    averageResponseTime: number;
    errorRate: number;
  }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const tenantLogs = this.requestLogs.filter(
      log => log.tenantId === tenantId && new Date(log.timestamp) >= since
    );

    const requestsByEndpoint = tenantLogs.reduce((acc, log) => {
      acc[log.endpoint] = (acc[log.endpoint] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const requestsByDay = tenantLogs.reduce((acc, log) => {
      const day = log.timestamp.substring(0, 10);
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalRequests = tenantLogs.length;
    const averageResponseTime = tenantLogs.reduce((sum, log) => sum + log.responseTime, 0) / totalRequests || 0;
    const errorRequests = tenantLogs.filter(log => log.statusCode >= 400).length;
    const errorRate = totalRequests > 0 ? errorRequests / totalRequests : 0;

    return {
      totalRequests,
      requestsByEndpoint,
      requestsByDay,
      averageResponseTime,
      errorRate,
    };
  }

  /**
   * Clean up expired rate limit entries
   */
  private cleanupExpiredRateLimits(): void {
    const now = Date.now();
    for (const [key, entry] of this.rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        this.rateLimitStore.delete(key);
      }
    }
  }

  /**
   * Clean up old request logs
   */
  private cleanupRequestLogs(): void {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
    this.requestLogs = this.requestLogs.filter(log => new Date(log.timestamp) >= cutoff);
  }

  /**
   * Get next month start date
   */
  private getNextMonthStart(): string {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString();
  }

  /**
   * Validate request permissions
   */
  validatePermissions(apiKey: APIKey, requiredPermission: string): boolean {
    return apiKey.permissions.includes('*') || apiKey.permissions.includes(requiredPermission);
  }

  /**
   * Get rate limit headers for response
   */
  getRateLimitHeaders(tenantId: string, endpoint: string): Record<string, string> {
    const key = `${tenantId}:${endpoint}`;
    const entry = this.rateLimitStore.get(key);
    const tenant = multiTenantService.getCurrentTenant();
    const config = this.getRateLimitForPlan(tenant?.plan || 'starter');

    if (!entry) {
      return {
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': config.maxRequests.toString(),
        'X-RateLimit-Reset': (Date.now() + config.windowMs).toString(),
      };
    }

    return {
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': Math.max(0, config.maxRequests - entry.count).toString(),
      'X-RateLimit-Reset': entry.resetTime.toString(),
    };
  }
}

// Export singleton instance
export const apiGatewayService = APIGatewayService.getInstance(); 