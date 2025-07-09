'use client';

import React, { useState, useEffect } from 'react';
import { multiTenantService, Tenant, TenantUser } from '../../lib/multiTenant';
import { billingService } from '../../lib/billing';
import { monitoringService } from '../../lib/monitoring';
import { apiGatewayService } from '../../lib/apiGateway';
import NavigationBar from '../../components/NavigationBar';

interface AdminStats {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  totalRevenue: number;
  systemHealth: 'healthy' | 'degraded' | 'unhealthy';
}

interface TenantDetails extends Tenant {
  userCount: number;
  subscription: any;
  usage: any;
}

export default function AdminPanel() {
  const [stats, setStats] = useState<AdminStats>({
    totalTenants: 0,
    activeTenants: 0,
    totalUsers: 0,
    totalRevenue: 0,
    systemHealth: 'healthy',
  });
  const [tenants, setTenants] = useState<TenantDetails[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<TenantDetails | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'tenants' | 'billing' | 'monitoring' | 'api'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadStats(),
        loadTenants(),
      ]);
    } catch (err) {
      setError('Failed to load admin data');
      console.error('Admin data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    // Mock data for demonstration - replace with actual API calls
    setStats({
      totalTenants: 127,
      activeTenants: 98,
      totalUsers: 1456,
      totalRevenue: 45670,
      systemHealth: 'healthy',
    });
  };

  const loadTenants = async () => {
    // Mock data for demonstration - replace with actual API calls
    const mockTenants: TenantDetails[] = [
      {
        id: '1',
        name: 'Acme Corporation',
        domain: 'acme.com',
        plan: 'enterprise',
        status: 'active',
        settings: {
          branding: { primaryColor: '#3B82F6', secondaryColor: '#64748B' },
          features: { aiCategorization: true, bulkOperations: true, customReports: true, apiAccess: true },
          limits: { users: 100, transactions: -1, storage: 2000 },
        },
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-20T15:45:00Z',
        userCount: 25,
        subscription: { plan: 'enterprise', status: 'active', nextBilling: '2024-02-15' },
        usage: { users: 25, transactions: 15420, storage: 450 },
      },
      {
        id: '2',
        name: 'TechStart Inc',
        domain: 'techstart.io',
        plan: 'professional',
        status: 'active',
        settings: {
          branding: { primaryColor: '#10B981', secondaryColor: '#64748B' },
          features: { aiCategorization: true, bulkOperations: true, customReports: true, apiAccess: true },
          limits: { users: 25, transactions: 50000, storage: 500 },
        },
        createdAt: '2024-01-10T09:15:00Z',
        updatedAt: '2024-01-18T11:20:00Z',
        userCount: 8,
        subscription: { plan: 'professional', status: 'active', nextBilling: '2024-02-10' },
        usage: { users: 8, transactions: 3250, storage: 120 },
      },
    ];
    setTenants(mockTenants);
  };

  const suspendTenant = async (tenantId: string) => {
    try {
      // Implement tenant suspension
      console.log('Suspending tenant:', tenantId);
      // Update tenant status in database
      // Send notification to tenant
      await loadTenants(); // Refresh data
    } catch (err) {
      setError('Failed to suspend tenant');
    }
  };

  const activateTenant = async (tenantId: string) => {
    try {
      // Implement tenant activation
      console.log('Activating tenant:', tenantId);
      await loadTenants(); // Refresh data
    } catch (err) {
      setError('Failed to activate tenant');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavigationBar activeSection="settings" />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavigationBar activeSection="settings" />
      
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Admin Panel</h1>
          <p className="text-slate-600 mt-2">Manage tenants, billing, and system monitoring</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview' },
              { id: 'tenants', name: 'Tenants' },
              { id: 'billing', name: 'Billing' },
              { id: 'monitoring', name: 'Monitoring' },
              { id: 'api', name: 'API Management' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-600">Total Tenants</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.totalTenants}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-600">Active Tenants</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.activeTenants}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-600">Total Users</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.totalUsers}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-600">Monthly Revenue</p>
                    <p className="text-2xl font-bold text-slate-900">${stats.totalRevenue.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* System Health */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-medium text-slate-900 mb-4">System Health</h3>
              <div className="flex items-center space-x-4">
                <div className={`w-3 h-3 rounded-full ${
                  stats.systemHealth === 'healthy' ? 'bg-green-500' :
                  stats.systemHealth === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <span className="text-sm font-medium text-slate-700 capitalize">{stats.systemHealth}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tenants Tab */}
        {activeTab === 'tenants' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-medium text-slate-900">Tenant Management</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Plan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Users
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Usage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {tenants.map((tenant) => (
                      <tr key={tenant.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-slate-900">{tenant.name}</div>
                            <div className="text-sm text-slate-500">{tenant.domain}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            tenant.plan === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                            tenant.plan === 'professional' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {tenant.plan}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            tenant.status === 'active' ? 'bg-green-100 text-green-800' :
                            tenant.status === 'trial' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {tenant.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {tenant.userCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          <div className="text-xs">
                            <div>Transactions: {tenant.usage.transactions.toLocaleString()}</div>
                            <div>Storage: {tenant.usage.storage} MB</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setSelectedTenant(tenant)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View
                            </button>
                            {tenant.status === 'active' ? (
                              <button
                                onClick={() => suspendTenant(tenant.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Suspend
                              </button>
                            ) : (
                              <button
                                onClick={() => activateTenant(tenant.id)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Activate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-medium text-slate-900 mb-4">Billing Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900">$45,670</div>
                  <div className="text-sm text-slate-500">Monthly Recurring Revenue</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900">$547,240</div>
                  <div className="text-sm text-slate-500">Annual Recurring Revenue</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900">2.3%</div>
                  <div className="text-sm text-slate-500">Churn Rate</div>
                </div>
              </div>
            </div>

            {/* Revenue Chart Placeholder */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-medium text-slate-900 mb-4">Revenue Trends</h3>
              <div className="h-64 bg-slate-100 rounded-lg flex items-center justify-center">
                <p className="text-slate-500">Revenue chart would be implemented here</p>
              </div>
            </div>
          </div>
        )}

        {/* Monitoring Tab */}
        {activeTab === 'monitoring' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-medium text-slate-900 mb-4">Error Rate</h3>
                <div className="text-3xl font-bold text-slate-900">0.23%</div>
                <div className="text-sm text-green-600">↓ 0.05% from last week</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-medium text-slate-900 mb-4">Response Time</h3>
                <div className="text-3xl font-bold text-slate-900">245ms</div>
                <div className="text-sm text-green-600">↓ 12ms from last week</div>
              </div>
            </div>

            {/* Performance Chart Placeholder */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-medium text-slate-900 mb-4">System Performance</h3>
              <div className="h-64 bg-slate-100 rounded-lg flex items-center justify-center">
                <p className="text-slate-500">Performance monitoring charts would be implemented here</p>
              </div>
            </div>
          </div>
        )}

        {/* API Management Tab */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-medium text-slate-900 mb-4">API Usage Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900">1.2M</div>
                  <div className="text-sm text-slate-500">Total API Calls</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900">99.8%</div>
                  <div className="text-sm text-slate-500">Success Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900">156ms</div>
                  <div className="text-sm text-slate-500">Avg Response Time</div>
                </div>
              </div>
            </div>

            {/* API Endpoints */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-medium text-slate-900 mb-4">Popular Endpoints</h3>
              <div className="space-y-4">
                {[
                  { endpoint: '/api/transactions', calls: 456789, avgTime: '123ms' },
                  { endpoint: '/api/categorize', calls: 234567, avgTime: '89ms' },
                  { endpoint: '/api/export', calls: 123456, avgTime: '234ms' },
                ].map((endpoint, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-slate-100">
                    <div>
                      <div className="font-medium text-slate-900">{endpoint.endpoint}</div>
                      <div className="text-sm text-slate-500">{endpoint.calls.toLocaleString()} calls</div>
                    </div>
                    <div className="text-sm text-slate-600">{endpoint.avgTime}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tenant Details Modal */}
      {selectedTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-slate-900">Tenant Details: {selectedTenant.name}</h3>
              <button
                onClick={() => setSelectedTenant(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-slate-900 mb-2">Basic Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Domain:</span> {selectedTenant.domain}</div>
                    <div><span className="font-medium">Plan:</span> {selectedTenant.plan}</div>
                    <div><span className="font-medium">Status:</span> {selectedTenant.status}</div>
                    <div><span className="font-medium">Created:</span> {new Date(selectedTenant.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-slate-900 mb-2">Usage Statistics</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Users:</span> {selectedTenant.usage.users} / {selectedTenant.settings.limits.users}</div>
                    <div><span className="font-medium">Transactions:</span> {selectedTenant.usage.transactions.toLocaleString()}</div>
                    <div><span className="font-medium">Storage:</span> {selectedTenant.usage.storage} MB / {selectedTenant.settings.limits.storage} MB</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 