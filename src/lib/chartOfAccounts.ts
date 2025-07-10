import { Account } from './types';
import { PROVINCES, Province } from '../data/provinces';

export interface AccountWithTax extends Account {
  taxRate: number;
  taxType: 'HST' | 'GST+PST' | 'GST+QST' | 'Exempt';
  province: string;
  description?: string;
}

export interface AccountSearchResult {
  account: AccountWithTax;
  score: number;
  reason: string;
}

export interface ChartAccount {
  code: string;
  name: string;
  type: string;
  taxCode: string;
  description: string;
}

export class ChartOfAccounts {
  private accounts: Map<string, Account> = new Map();
  private currentProvince: string = 'ON';
  private popularAccounts: Map<string, number> = new Map();
  private static instances: Map<string, ChartOfAccounts> = new Map();

  constructor(province: string = 'ON') {
    this.currentProvince = province;
    this.initializeAccounts();
  }

  // Singleton pattern to prevent multiple instances
  static getInstance(province: string = 'ON'): ChartOfAccounts {
    if (!ChartOfAccounts.instances.has(province)) {
      ChartOfAccounts.instances.set(province, new ChartOfAccounts(province));
    }
    return ChartOfAccounts.instances.get(province)!;
  }

  private async initializeAccounts(): Promise<void> {
    this.accounts.clear();
    
    try {
      // Dynamically import the province-specific accounts
      const moduleMap: Record<string, () => Promise<any>> = {
        AB: () => import('../data/chartOfAccounts/alberta'),
        BC: () => import('../data/chartOfAccounts/britishColumbia'),
        MB: () => import('../data/chartOfAccounts/manitoba'),
        NB: () => import('../data/chartOfAccounts/newBrunswick'),
        NL: () => import('../data/chartOfAccounts/newfoundlandLabrador'),
        NS: () => import('../data/chartOfAccounts/novaScotia'),
        NU: () => import('../data/chartOfAccounts/nunavut'),
        NT: () => import('../data/chartOfAccounts/northwestTerritories'),
        ON: () => import('../data/chartOfAccounts/ontario'),
        PE: () => import('../data/chartOfAccounts/princeEdwardIsland'),
        QC: () => import('../data/chartOfAccounts/quebec'),
        SK: () => import('../data/chartOfAccounts/saskatchewan'),
        YT: () => import('../data/chartOfAccounts/yukon'),
      };

      const importModule = moduleMap[this.currentProvince] || moduleMap['ON'];
      const module = await importModule();
      const accountsKey = `${this.currentProvince}_ACCOUNTS`;
      const accounts = module[accountsKey] || module['ON_ACCOUNTS'];

      for (const acc of accounts) {
        this.accounts.set(acc.code, {
          code: acc.code,
          name: acc.name,
          type: acc.type as any,
          taxCode: acc.taxCode,
          isPopular: false,
          description: acc.description
        });
      }
    } catch (error) {
      console.error('Error loading chart of accounts:', error);
      // Fallback to basic accounts if loading fails
      this.loadFallbackAccounts();
    }
  }

  private loadFallbackAccounts(): void {
    const fallbackAccounts = [
      { code: '200', name: 'Sales Revenue', type: 'Revenue', taxCode: 'HST on Sales (13%)', description: 'Income from the sale of products.' },
      { code: '220', name: 'Service Revenue', type: 'Revenue', taxCode: 'HST on Sales (13%)', description: 'Income from performing services.' },
      { code: '310', name: 'Cost of Goods Sold', type: 'Direct Costs', taxCode: 'HST on Purchases (13%)', description: 'Cost of goods sold by the business' },
      { code: '400', name: 'Advertising', type: 'Expense', taxCode: 'HST on Purchases (13%)', description: 'Expenses incurred for advertising while trying to increase sales' },
      { code: '442', name: 'Electricity', type: 'Expense', taxCode: 'HST on Purchases (13%)', description: 'Expenses incurred for electricity use' },
      { code: '453', name: 'Office Expenses', type: 'Expense', taxCode: 'HST on Purchases (13%)', description: 'General expenses related to the running of the business office.' },
      { code: '455', name: 'Supplies and Small Tools', type: 'Expense', taxCode: 'HST on Purchases (13%)', description: 'Supplies and small tools purchases for running the business' },
      { code: '468', name: 'Commercial Rent', type: 'Expense', taxCode: 'HST on Purchases (13%)', description: 'The payment to lease commercial space' },
      { code: '477', name: 'Wages and Salaries', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Payment to employees in exchange for their resources' },
      { code: '489', name: 'Telephone & Internet', type: 'Expense', taxCode: 'HST on Purchases (13%)', description: 'Expenditure incurred from any business-related phone calls, phone lines, or internet connections' },
      { code: '610', name: 'Accounts Receivable', type: 'Accounts Receivable', taxCode: 'Tax Exempt (0%)', description: 'Outstanding invoices the company has issued out to the client but has not yet received in cash at balance date.' },
      { code: '800', name: 'Accounts Payable', type: 'Accounts Payable', taxCode: 'Tax Exempt (0%)', description: 'Outstanding invoices the company has received from suppliers but has not yet paid at balance date' },
      { code: '820', name: 'Sales Tax', type: 'Sales Tax', taxCode: 'Tax Exempt (0%)', description: 'The balance in this account represents Sales Tax owing to or from your tax authority.' },
      { code: '960', name: 'Retained Earnings', type: 'Retained Earnings', taxCode: 'Tax Exempt (0%)', description: 'Do not Use' },
      { code: '970', name: 'Owner A Share Capital', type: 'Equity', taxCode: 'Tax Exempt (0%)', description: 'The value of shares purchased by the shareholders' },
    ];

    for (const acc of fallbackAccounts) {
      this.accounts.set(acc.code, {
        code: acc.code,
        name: acc.name,
        type: acc.type as any,
        taxCode: acc.taxCode,
        isPopular: false,
        description: acc.description
      });
    }
  }

  async setProvince(province: string): Promise<void> {
    if (this.currentProvince !== province) {
      this.currentProvince = province;
      await this.initializeAccounts();
    }
  }

  getProvince(): string {
    return this.currentProvince;
  }

  getAllAccounts(): AccountWithTax[] {
    return Array.from(this.accounts.values()).map(account => this.addTaxInfo(account));
  }

  getAccount(code: string): AccountWithTax | undefined {
    const account = this.accounts.get(code);
    return account ? this.addTaxInfo(account) : undefined;
  }

  searchAccounts(query: string): AccountSearchResult[] {
    const results: AccountSearchResult[] = [];
    const searchTerms = query.toLowerCase().split(' ');

    for (const account of this.accounts.values()) {
      let score = 0;
      let reasons: string[] = [];

      // Check name match
      const nameMatch = searchTerms.every(term => account.name.toLowerCase().includes(term));
      if (nameMatch) {
        score += 100;
        reasons.push('Name match');
      }

      // Check description match
      if (account.description) {
        const descMatch = searchTerms.every(term => account.description!.toLowerCase().includes(term));
        if (descMatch) {
          score += 50;
          reasons.push('Description match');
        }
      }

      // Check type match
      const typeMatch = searchTerms.some(term => account.type.toLowerCase().includes(term));
      if (typeMatch) {
        score += 30;
        reasons.push('Type match');
      }

      // Check partial matches
      const partialNameMatch = searchTerms.some(term => account.name.toLowerCase().includes(term));
      if (partialNameMatch && !nameMatch) {
        score += 20;
        reasons.push('Partial name match');
      }

      if (score > 0) {
        results.push({
          account: this.addTaxInfo(account),
          score,
          reason: reasons.join(', ')
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  private addTaxInfo(account: Account): AccountWithTax {
    const province = this.getCurrentProvinceTaxInfo();
    let taxRate = 0;
    let taxType: AccountWithTax['taxType'] = 'Exempt';

    // Parse tax information from the Tax Code field
    const taxCode = account.taxCode.toLowerCase();
    
    if (taxCode.includes('hst')) {
      const hstMatch = taxCode.match(/(\d+(?:\.\d+)?)%/);
      if (hstMatch) {
        taxRate = parseFloat(hstMatch[1]);
        taxType = 'HST';
      }
    } else if (taxCode.includes('gst/pst') || taxCode.includes('gst/rst') || taxCode.includes('gst/qst')) {
      const gstPstMatch = taxCode.match(/(\d+(?:\.\d+)?)%/);
      if (gstPstMatch) {
        taxRate = parseFloat(gstPstMatch[1]);
        taxType = this.currentProvince === 'QC' ? 'GST+QST' : 'GST+PST';
      }
    } else if (taxCode.includes('gst')) {
      const gstMatch = taxCode.match(/(\d+(?:\.\d+)?)%/);
      if (gstMatch) {
        taxRate = parseFloat(gstMatch[1]);
        taxType = 'GST+PST';
      }
    } else if (taxCode.includes('exempt') || taxCode.includes('0%')) {
      taxRate = 0;
      taxType = 'Exempt';
    }

    return {
      ...account,
      taxRate,
      taxType,
      province: province.code,
      description: account.description
    };
  }

  private getCurrentProvinceTaxInfo(): Province {
    return PROVINCES.find(p => p.code === this.currentProvince) || PROVINCES[0];
  }

  getStats(): {
    totalAccounts: number;
    accountsByType: Record<string, number>;
    popularAccounts: number;
    currentProvince: string;
  } {
    const accountsByType: Record<string, number> = {};
    
    for (const account of this.accounts.values()) {
      accountsByType[account.type] = (accountsByType[account.type] || 0) + 1;
    }

    return {
      totalAccounts: this.accounts.size,
      accountsByType,
      popularAccounts: Array.from(this.accounts.values()).filter(a => a.isPopular).length,
      currentProvince: this.currentProvince
    };
  }

  // Additional utility methods
  getAccountsByType(type: string): AccountWithTax[] {
    return this.getAllAccounts().filter(account => account.type === type);
  }

  getPopularAccounts(): AccountWithTax[] {
    return this.getAllAccounts().filter(account => account.isPopular);
  }

  markAccountAsPopular(code: string): void {
    const account = this.accounts.get(code);
    if (account) {
      account.isPopular = true;
      this.popularAccounts.set(code, (this.popularAccounts.get(code) || 0) + 1);
    }
  }

  getTaxableAccounts(): AccountWithTax[] {
    return this.getAllAccounts().filter(account => account.taxRate > 0);
  }

  getExemptAccounts(): AccountWithTax[] {
    return this.getAllAccounts().filter(account => account.taxRate === 0);
  }

  findAccountByCategory(category: string): AccountWithTax | null {
    // Enhanced category mappings based on CSV data
    const categoryMappings: Record<string, string[]> = {
      'Meals & Entertainment': ['420', '421'], // Entertainment, Entertainment - Alcohol
      'Motor Vehicle Expenses': ['449', '450'], // Motor Vehicle, Motor Vehicle - PST Exempt
      'Office Supplies': ['455', '453'], // Supplies and Small Tools, Office Expenses
      'Bank Fees': ['404'], // Bank Fees
      'Telecommunications': ['489'], // Telephone & Internet
      'Utilities': ['442', '445', '447'], // Electricity, Natural Gas, Water
      'Professional Services': ['412', '441'], // Consulting & Accounting, Legal expenses
      'Insurance': ['433'], // Insurance
      'Software': ['455'], // Supplies and Small Tools (software falls under this)
      'General Expenses': ['453'], // Office Expenses
      'Interest Income': ['270'], // Interest Income
      'Advertising': ['400'], // Advertising
      'Travel': ['493', '494'], // Travel - National, Travel - International
      'Rent': ['469', '468'], // Rent, Commercial Rent
      'Training': ['487'], // Training and Continuing Education
      'Subscriptions': ['485'], // Subscriptions
      'Cleaning': ['408'], // Cleaning
      'Repairs': ['473'], // Repairs and Maintenance
      'Freight': ['425'] // Freight & Courier
    };

    const accountCodes = categoryMappings[category] || [];
    for (const code of accountCodes) {
      const account = this.getAccount(code);
      if (account) {
        return account;
      }
    }
    return null;
  }
}

// Export default instance for easy access
export const getChartOfAccounts = (province: string = 'ON') => ChartOfAccounts.getInstance(province);
