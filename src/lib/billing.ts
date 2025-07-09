// SaaS Billing & Subscription Management
// TEMPORARILY DISABLED - Stripe not installed
// This file is disabled until Stripe is properly configured

/*
// Conditional Stripe import - gracefully handle when not available
let Stripe: any;
try {
  Stripe = require('stripe');
} catch (error) {
  console.warn('Stripe not available - billing features disabled');
  Stripe = null;
}

import { multiTenantService } from './multiTenant';
import { getCurrentUser } from './supabase';
*/

// Stub interfaces for compatibility
export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'usd' | 'cad';
  interval: 'month' | 'year';
  features: {
    users: number;
    transactions: number;
    storage: number;
    aiCategorization: boolean;
    bulkOperations: boolean;
    customReports: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
  };
  stripeProductId: string;
  stripePriceId: string;
  popular?: boolean;
}

export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEnd?: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  tenantId: string;
  stripeInvoiceId: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  dueDate: string;
  paidAt?: string;
  invoiceUrl: string;
  createdAt: string;
}

export interface UsageRecord {
  id: string;
  tenantId: string;
  metric: 'users' | 'transactions' | 'storage';
  value: number;
  timestamp: string;
  billingPeriod: string;
}

// Stub BillingService class
export class BillingService {
  private static instance: BillingService;

  public static getInstance(): BillingService {
    if (!BillingService.instance) {
      BillingService.instance = new BillingService();
    }
    return BillingService.instance;
  }

  constructor() {
    console.warn('BillingService disabled - Stripe not configured');
  }

  getPlans(): Plan[] {
    return [];
  }

  getPlan(planId: string): Plan | null {
    return null;
  }

  async createCustomer(tenantId: string, email: string, name: string): Promise<string> {
    throw new Error('Billing service disabled - Stripe not configured');
  }

  async createSubscription(tenantId: string, planId: string, customerId: string, trialDays: number = 14): Promise<Subscription> {
    throw new Error('Billing service disabled - Stripe not configured');
  }

  async getTenantSubscription(tenantId: string): Promise<Subscription | null> {
    return null;
  }

  async updateSubscription(tenantId: string, newPlanId: string): Promise<void> {
    throw new Error('Billing service disabled - Stripe not configured');
  }

  async cancelSubscription(tenantId: string, immediately: boolean = false): Promise<void> {
    throw new Error('Billing service disabled - Stripe not configured');
  }

  async createPortalSession(tenantId: string, returnUrl: string): Promise<string> {
    throw new Error('Billing service disabled - Stripe not configured');
  }

  async createCheckoutSession(tenantId: string, planId: string, successUrl: string, cancelUrl: string): Promise<string> {
    throw new Error('Billing service disabled - Stripe not configured');
  }

  async handleWebhook(event: any): Promise<void> {
    throw new Error('Billing service disabled - Stripe not configured');
  }

  async recordUsage(tenantId: string, metric: 'users' | 'transactions' | 'storage', value: number): Promise<void> {
    // No-op when disabled
  }

  async canPerformAction(tenantId: string, action: 'add_user' | 'process_transaction' | 'use_storage'): Promise<boolean> {
    return true; // Allow all actions when billing is disabled
  }

  async getBillingSummary(tenantId: string): Promise<{
    subscription: Subscription | null;
    plan: Plan | null;
    usage: any;
    nextBillingDate: string | null;
    upcomingInvoice: any;
  }> {
    return {
      subscription: null,
      plan: null,
      usage: {},
      nextBillingDate: null,
      upcomingInvoice: null
    };
  }
}

/*
// Original implementation commented out until Stripe is configured
... rest of the original code ...
*/

// Export singleton instance
export const billingService = BillingService.getInstance(); 