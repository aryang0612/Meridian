// Monitoring & Observability Service
// TEMPORARILY DISABLED - Complex async issues
// This file is disabled until async types are properly resolved

/*
Original implementation commented out due to type issues
*/

// Stub interfaces for compatibility
export interface MetricData {
  name: string;
  value: number;
  tags: Record<string, string>;
  timestamp: string;
}

export interface LogEntry {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  context: Record<string, any>;
  tenantId?: string;
  userId?: string;
  timestamp: string;
  source: string;
  traceId?: string;
}

export interface ErrorReport {
  id: string;
  error: {
    name: string;
    message: string;
    stack: string;
  };
  context: {
    url: string;
    userAgent: string;
    userId?: string;
    tenantId?: string;
    component?: string;
    action?: string;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  resolved: boolean;
}

export interface PerformanceMetric {
  id: string;
  metric: 'page_load' | 'api_response' | 'database_query' | 'file_processing';
  duration: number;
  endpoint?: string;
  tenantId?: string;
  timestamp: string;
}

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  message?: string;
  timestamp: string;
}

// Stub MonitoringService class
export class MonitoringService {
  private static instance: MonitoringService;

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  constructor() {
    console.warn('MonitoringService disabled - type issues need resolution');
  }

  generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  log(level: LogEntry['level'], message: string, context: Record<string, any> = {}): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${level.toUpperCase()}] ${message}`, context);
    }
  }

  captureError(error: Error, context: Record<string, any> = {}): void {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error captured:', error.message, context);
    }
  }

  recordPerformance(metric: PerformanceMetric['metric'], duration: number, endpoint?: string): void {
    // No-op when disabled
  }

  recordMetric(name: string, value: number, tags: Record<string, string> = {}): void {
    // No-op when disabled
  }

  getMonitoringData(): {
    errors: ErrorReport[];
    logs: LogEntry[];
    metrics: MetricData[];
    performance: PerformanceMetric[];
  } {
    return {
      errors: [],
      logs: [],
      metrics: [],
      performance: []
    };
  }

  getErrorSummary(): {
    total: number;
    byLevel: Record<string, number>;
    recent: ErrorReport[];
    unresolved: number;
  } {
    return {
      total: 0,
      byLevel: {},
      recent: [],
      unresolved: 0
    };
  }

  getPerformanceSummary(): {
    averagePageLoad: number;
    averageApiResponse: number;
    slowQueries: PerformanceMetric[];
  } {
    return {
      averagePageLoad: 0,
      averageApiResponse: 0,
      slowQueries: []
    };
  }
}

// Export singleton instance
export const monitoringService = MonitoringService.getInstance(); 