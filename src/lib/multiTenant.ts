// Multi-Tenant Architecture Service
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from './supabase';

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'trial';
  settings: {
    branding: {
      logo?: string;
      primaryColor: string;
      secondaryColor: string;
    };
    features: {
      aiCategorization: boolean;
      bulkOperations: boolean;
      customReports: boolean;
      apiAccess: boolean;
    };
    limits: {
      users: number;
      transactions: number;
      storage: number; // in MB
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface TenantUser {
  id: string;
  tenantId: string;
  userId: string;
  role: 'owner' | 'admin' | 'user' | 'viewer';
  permissions: string[];
  invitedBy?: string;
  invitedAt?: string;
  joinedAt?: string;
  status: 'active' | 'invited' | 'suspended';
}

export class MultiTenantService {
  private static instance: MultiTenantService;
  private currentTenant: Tenant | null = null;
  private currentUserRole: TenantUser | null = null;

  public static getInstance(): MultiTenantService {
    if (!MultiTenantService.instance) {
      MultiTenantService.instance = new MultiTenantService();
    }
    return MultiTenantService.instance;
  }

  /**
   * Initialize tenant context for current user
   */
  async initializeTenantContext(): Promise<void> {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      // Get user's tenant memberships
      const tenantMemberships = await this.getUserTenantMemberships(user.id);
      
      if (tenantMemberships.length === 0) {
        // New user - create personal tenant
        await this.createPersonalTenant(user);
      } else {
        // Set current tenant (last used or first available)
        const lastTenantId = localStorage.getItem('lastTenantId');
        const targetTenant = tenantMemberships.find(tm => tm.tenantId === lastTenantId) || tenantMemberships[0];
        
        await this.setCurrentTenant(targetTenant.tenantId);
      }
    } catch (error) {
      console.error('Failed to initialize tenant context:', error);
    }
  }

  /**
   * Get current tenant context
   */
  getCurrentTenant(): Tenant | null {
    return this.currentTenant;
  }

  /**
   * Get current user's role in tenant
   */
  getCurrentUserRole(): TenantUser | null {
    return this.currentUserRole;
  }

  /**
   * Switch to different tenant
   */
  async setCurrentTenant(tenantId: string): Promise<void> {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get tenant details
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      throw new Error('Failed to load tenant');
    }

    // Get user role in tenant
    const user = await getCurrentUser();
    const { data: userRole, error: roleError } = await supabase
      .from('tenant_users')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', user?.id)
      .single();

    if (roleError || !userRole) {
      throw new Error('User not authorized for this tenant');
    }

    this.currentTenant = tenant;
    this.currentUserRole = userRole;
    
    // Store in localStorage for persistence
    localStorage.setItem('lastTenantId', tenantId);
    
    console.log('✅ Tenant context set:', tenant.name);
  }

  /**
   * Create personal tenant for new user
   */
  private async createPersonalTenant(user: any): Promise<void> {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const tenantData: Partial<Tenant> = {
      name: `${user.email}'s Company`,
      domain: user.email.split('@')[1] || 'personal',
      plan: 'starter',
      status: 'trial',
      settings: {
        branding: {
          primaryColor: '#3B82F6',
          secondaryColor: '#64748B',
        },
        features: {
          aiCategorization: true,
          bulkOperations: true,
          customReports: false,
          apiAccess: false,
        },
        limits: {
          users: 5,
          transactions: 10000,
          storage: 100,
        },
      },
    };

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert(tenantData)
      .select()
      .single();

    if (tenantError) {
      throw new Error('Failed to create tenant');
    }

    // Add user as owner
    const { error: userError } = await supabase
      .from('tenant_users')
      .insert({
        tenant_id: tenant.id,
        user_id: user.id,
        role: 'owner',
        permissions: ['*'],
        status: 'active',
        joined_at: new Date().toISOString(),
      });

    if (userError) {
      throw new Error('Failed to add user to tenant');
    }

    await this.setCurrentTenant(tenant.id);
  }

  /**
   * Get user's tenant memberships
   */
  private async getUserTenantMemberships(userId: string): Promise<TenantUser[]> {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase
      .from('tenant_users')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) {
      throw new Error('Failed to load tenant memberships');
    }

    return data || [];
  }

  /**
   * Check if user has permission
   */
  hasPermission(permission: string): boolean {
    if (!this.currentUserRole) return false;
    
    // Owner has all permissions
    if (this.currentUserRole.role === 'owner') return true;
    
    // Check specific permissions
    return this.currentUserRole.permissions.includes(permission) || 
           this.currentUserRole.permissions.includes('*');
  }

  /**
   * Get tenant-scoped database query
   */
  getTenantQuery(tableName: string) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    if (!this.currentTenant) {
      throw new Error('No tenant context available');
    }

    return supabase
      .from(tableName)
      .select('*')
      .eq('tenant_id', this.currentTenant.id);
  }

  /**
   * Insert with tenant context
   */
  async insertWithTenant(tableName: string, data: any) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    if (!this.currentTenant) {
      throw new Error('No tenant context available');
    }

    return supabase
      .from(tableName)
      .insert({
        ...data,
        tenant_id: this.currentTenant.id,
      });
  }

  /**
   * Update with tenant context
   */
  async updateWithTenant(tableName: string, id: string, data: any) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    if (!this.currentTenant) {
      throw new Error('No tenant context available');
    }

    return supabase
      .from(tableName)
      .update(data)
      .eq('id', id)
      .eq('tenant_id', this.currentTenant.id);
  }

  /**
   * Delete with tenant context
   */
  async deleteWithTenant(tableName: string, id: string) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    if (!this.currentTenant) {
      throw new Error('No tenant context available');
    }

    return supabase
      .from(tableName)
      .delete()
      .eq('id', id)
      .eq('tenant_id', this.currentTenant.id);
  }

  /**
   * Invite user to tenant
   */
  async inviteUser(email: string, role: 'admin' | 'user' | 'viewer', permissions: string[] = []): Promise<void> {
    if (!this.hasPermission('invite_users')) {
      throw new Error('Insufficient permissions to invite users');
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const user = await getCurrentUser();
    
    // Create invitation
    const { error } = await supabase
      .from('tenant_invitations')
      .insert({
        tenant_id: this.currentTenant?.id,
        email,
        role,
        permissions,
        invited_by: user?.id,
        invited_at: new Date().toISOString(),
        status: 'pending',
      });

    if (error) {
      throw new Error('Failed to create invitation');
    }

    // Send invitation email (implement email service)
    await this.sendInvitationEmail(email, role);
  }

  /**
   * Send invitation email
   */
  private async sendInvitationEmail(email: string, role: string): Promise<void> {
    // Implement email service integration
    console.log(`📧 Sending invitation to ${email} as ${role}`);
  }

  /**
   * Get tenant usage statistics
   */
  async getTenantUsage(): Promise<{
    users: number;
    transactions: number;
    storage: number;
  }> {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    if (!this.currentTenant) {
      throw new Error('No tenant context available');
    }

    // Get user count
    const { count: userCount } = await supabase
      .from('tenant_users')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', this.currentTenant.id)
      .eq('status', 'active');

    // Get transaction count
    const { count: transactionCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', this.currentTenant.id);

    // Calculate storage usage (simplified)
    const { data: storageData } = await supabase
      .from('file_uploads')
      .select('file_size')
      .eq('tenant_id', this.currentTenant.id);

    const storageUsage = storageData?.reduce((total, file) => total + (file.file_size || 0), 0) || 0;

    return {
      users: userCount || 0,
      transactions: transactionCount || 0,
      storage: Math.round(storageUsage / (1024 * 1024)), // Convert to MB
    };
  }

  /**
   * Check if tenant is within limits
   */
  async checkTenantLimits(): Promise<{
    withinLimits: boolean;
    usage: any;
    limits: any;
  }> {
    if (!this.currentTenant) {
      throw new Error('No tenant context available');
    }

    const usage = await this.getTenantUsage();
    const limits = this.currentTenant.settings.limits;

    return {
      withinLimits: usage.users <= limits.users && 
                   usage.transactions <= limits.transactions && 
                   usage.storage <= limits.storage,
      usage,
      limits,
    };
  }
}

// Export singleton instance
export const multiTenantService = MultiTenantService.getInstance(); 