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

interface CSVAccount {
  Name: string;
  Type: string;
  Code: string;
  'Tax Code': string;
  Description: string;
}

export class ChartOfAccounts {
  private accounts: Map<string, Account> = new Map();
  private currentProvince: string = 'ON';
  private popularAccounts: Map<string, number> = new Map();
  private csvData: Map<string, CSVAccount[]> = new Map(); // Store CSV data by province
  private isInitialized: boolean = false;

  constructor(province: string = 'ON') {
    this.currentProvince = province;
    this.initializeHardcodedAccounts(); // Start with hardcoded accounts
    this.isInitialized = true; // Mark as initialized with hardcoded accounts
    // CSV loading is now handled on the client via loadFromCSV
  }

  /**
   * Client-side: Load CSV data for a province and initialize accounts
   */
  public loadFromCSV(province: string, csvText: string) {
    console.log(`🔄 Loading CSV data for province: ${province}`);
    console.log(`📄 CSV text length: ${csvText.length} characters`);
    console.log(`📄 First 200 characters: ${csvText.substring(0, 200)}`);
    
    const accounts = this.parseCSV(csvText);
    console.log(`📊 Parsed ${accounts.length} accounts from CSV`);
    
    this.csvData.set(province, accounts);
    if (province === this.currentProvince) {
      this.initializeAccountsFromCSV();
      this.isInitialized = true;
      console.log(`📊 Successfully initialized Chart of Accounts for province: ${province}`);
    }
  }

  private parseCSV(csvText: string): CSVAccount[] {
    const lines = csvText.trim().split('\n');
    console.log(`📄 CSV has ${lines.length} lines`);
    console.log(`📄 Headers: ${lines[0]}`);
    
    const headers = lines[0].split(',');
    const accounts: CSVAccount[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      console.log(`📄 Line ${i}: ${lines[i].substring(0, 100)}... -> ${values.length} values`);
      if (values.length >= 5) {
        accounts.push({
          Name: values[0],
          Type: values[1],
          Code: values[2],
          'Tax Code': values[3],
          Description: values[4]
        });
      } else {
        console.warn(`⚠️ Line ${i} has insufficient values: ${values.length} < 5`);
      }
    }

    return accounts;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  private initializeAccountsFromCSV(): void {
    const provinceData = this.csvData.get(this.currentProvince);
    if (!provinceData) {
      console.warn(`No CSV data found for province ${this.currentProvince}, using hardcoded accounts`);
      this.initializeHardcodedAccounts();
      return;
    }

    this.accounts.clear();

    for (const csvAccount of provinceData) {
      // Map CSV account types to our Account type enum
      let accountType: Account['type'];
      switch (csvAccount.Type.toLowerCase()) {
        case 'revenue':
          accountType = 'Revenue';
          break;
        case 'expense':
        case 'direct costs':
          accountType = 'Expense';
          break;
        case 'current asset':
        case 'non-current asset':
        case 'fixed asset':
        case 'accounts receivable':
        case 'inventory':
          accountType = 'Asset';
          break;
        case 'current liability':
        case 'non-current liability':
        case 'accounts payable':
        case 'wages payable':
        case 'sales tax':
          accountType = 'Liability';
          break;
        case 'equity':
        case 'retained earnings':
          accountType = 'Equity';
          break;
        default:
          accountType = 'Expense'; // Default fallback
      }

      // Determine if account is popular based on common business accounts
      const isPopular = this.isPopularAccount(csvAccount.Name, csvAccount.Code);

      const account: Account = {
        code: csvAccount.Code,
        name: csvAccount.Name,
        type: accountType,
        taxCode: csvAccount['Tax Code'],
        isPopular
      };

      this.accounts.set(csvAccount.Code, account);
    }

    console.log(`📊 Loaded ${this.accounts.size} accounts from CSV for province: ${this.currentProvince}`);
  }

  private isPopularAccount(name: string, code: string): boolean {
    // Define popular accounts based on common business usage
    const popularPatterns = [
      'sales revenue', 'service revenue', 'bank fees', 'office expenses',
      'advertising', 'motor vehicle', 'telephone', 'utilities', 'rent',
      'insurance', 'legal expenses', 'meals', 'entertainment', 'supplies',
      'accounts receivable', 'accounts payable', 'equipment', 'vehicles'
    ];

    const nameLower = name.toLowerCase();
    return popularPatterns.some(pattern => nameLower.includes(pattern)) ||
           ['200', '220', '404', '453', '400', '449', '489', '433', '441', '420', '455', '610', '800', '710', '714'].includes(code);
  }

  private initializeHardcodedAccounts(): void {
    // Fallback to original hardcoded accounts if CSV loading fails
    // Assets (1000-1999)
    this.addAccount({
      code: '1000',
      name: 'Checking Account',
      type: 'Asset',
      taxCode: 'Exempt',
      isPopular: true
    });

    this.addAccount({
      code: '1010',
      name: 'Savings Account',
      type: 'Asset',
      taxCode: 'Exempt',
      isPopular: false
    });

    this.addAccount({
      code: '1100',
      name: 'Accounts Receivable',
      type: 'Asset',
      taxCode: 'Exempt',
      isPopular: true
    });

    this.addAccount({
      code: '1200',
      name: 'Inventory',
      type: 'Asset',
      taxCode: 'Exempt',
      isPopular: false
    });

    this.addAccount({
      code: '1500',
      name: 'Equipment',
      type: 'Asset',
      taxCode: 'HST/GST',
      isPopular: false
    });

    // Liabilities (2000-2999)
    this.addAccount({
      code: '2000',
      name: 'Accounts Payable',
      type: 'Liability',
      taxCode: 'Exempt',
      isPopular: true
    });

    this.addAccount({
      code: '2100',
      name: 'Credit Card Payable',
      type: 'Liability',
      taxCode: 'Exempt',
      isPopular: true
    });

    this.addAccount({
      code: '2200',
      name: 'GST/HST Payable',
      type: 'Liability',
      taxCode: 'Exempt',
      isPopular: true
    });

    // Equity (3000-3999)
    this.addAccount({
      code: '3000',
      name: 'Owner\'s Equity',
      type: 'Equity',
      taxCode: 'Exempt',
      isPopular: true
    });

    // Revenue (4000-4999)
    this.addAccount({
      code: '4000',
      name: 'Sales Revenue',
      type: 'Revenue',
      taxCode: 'HST/GST',
      isPopular: true
    });

    this.addAccount({
      code: '4100',
      name: 'Service Revenue',
      type: 'Revenue',
      taxCode: 'HST/GST',
      isPopular: true
    });

    this.addAccount({
      code: '4200',
      name: 'Interest Income',
      type: 'Revenue',
      taxCode: 'Exempt',
      isPopular: false
    });

    // Expenses (5000-5999)
    this.addAccount({
      code: '5100',
      name: 'Advertising & Marketing',
      type: 'Expense',
      taxCode: 'HST/GST',
      isPopular: true
    });

    this.addAccount({
      code: '5200',
      name: 'Bank Fees',
      type: 'Expense',
      taxCode: 'Exempt',
      isPopular: true
    });

    this.addAccount({
      code: '5300',
      name: 'Insurance',
      type: 'Expense',
      taxCode: 'Exempt',
      isPopular: true
    });

    this.addAccount({
      code: '5400',
      name: 'Legal & Professional Fees',
      type: 'Expense',
      taxCode: 'HST/GST',
      isPopular: true
    });

    this.addAccount({
      code: '5500',
      name: 'Meals & Entertainment (50%)',
      type: 'Expense',
      taxCode: 'HST/GST',
      isPopular: true
    });

    this.addAccount({
      code: '5600',
      name: 'Motor Vehicle Expenses',
      type: 'Expense',
      taxCode: 'HST/GST',
      isPopular: true
    });

    this.addAccount({
      code: '5700',
      name: 'Office Expenses',
      type: 'Expense',
      taxCode: 'HST/GST',
      isPopular: true
    });

    this.addAccount({
      code: '5710',
      name: 'Office Supplies',
      type: 'Expense',
      taxCode: 'HST/GST',
      isPopular: true
    });

    this.addAccount({
      code: '5720',
      name: 'Software & Technology',
      type: 'Expense',
      taxCode: 'HST/GST',
      isPopular: true
    });

    this.addAccount({
      code: '5800',
      name: 'Rent Expense',
      type: 'Expense',
      taxCode: 'Exempt',
      isPopular: true
    });

    this.addAccount({
      code: '5900',
      name: 'Telephone & Internet',
      type: 'Expense',
      taxCode: 'HST/GST',
      isPopular: true
    });

    this.addAccount({
      code: '5980',
      name: 'Utilities',
      type: 'Expense',
      taxCode: 'HST/GST',
      isPopular: true
    });

    console.log(`📊 Initialized ${this.accounts.size} hardcoded accounts for province: ${this.currentProvince}`);
  }

  private addAccount(account: Account): void {
    this.accounts.set(account.code, account);
  }

  getAccount(code: string): AccountWithTax | null {
    const account = this.accounts.get(code);
    if (!account) return null;
    return this.addTaxInfo(account);
  }

  getAllAccounts(): AccountWithTax[] {
    const accounts = Array.from(this.accounts.values())
      .map(account => this.addTaxInfo(account));
    
    return this.sortAccountsByPopularity(accounts);
  }

  private sortAccountsByPopularity(accounts: AccountWithTax[]): AccountWithTax[] {
    return accounts.sort((a, b) => {
      // First sort by popularity
      if (a.isPopular && !b.isPopular) return -1;
      if (!a.isPopular && b.isPopular) return 1;
      
      // Then by usage count
      const aCount = this.popularAccounts.get(a.code) || 0;
      const bCount = this.popularAccounts.get(b.code) || 0;
      if (aCount !== bCount) return bCount - aCount;
      
      // Finally by account code
      return a.code.localeCompare(b.code);
    });
  }

  getAccountsByType(type: Account['type']): AccountWithTax[] {
    const accounts = Array.from(this.accounts.values())
      .filter(account => account.type === type)
      .map(account => this.addTaxInfo(account));

    return this.sortAccountsByPopularity(accounts);
  }

  getPopularAccounts(limit: number = 10): AccountSearchResult[] {
    const popularCodes = Array.from(this.accounts.keys())
      .filter(code => this.accounts.get(code)?.isPopular)
      .sort((a, b) => {
        const aCount = this.popularAccounts.get(a) || 0;
        const bCount = this.popularAccounts.get(b) || 0;
        return bCount - aCount;
      });

    return popularCodes.slice(0, limit).map(code => {
      const account = this.accounts.get(code)!;
      return {
        account: this.addTaxInfo(account),
        score: 100,
        reason: 'Popular account'
      };
    });
  }

  getSuggestedAccountsForCategory(category: string): AccountWithTax[] {
    const suggestions: AccountWithTax[] = [];
    
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
        suggestions.push(account);
      }
    }
    return suggestions;
  }

  findAccountByCategory(category: string): AccountWithTax | null {
    const suggestions = this.getSuggestedAccountsForCategory(category);
    return suggestions.length > 0 ? suggestions[0] : null;
  }

  recordAccountUsage(accountCode: string): void {
    const currentCount = this.popularAccounts.get(accountCode) || 0;
    this.popularAccounts.set(accountCode, currentCount + 1);
  }

  setProvince(province: string): void {
    if (this.currentProvince !== province) {
      this.currentProvince = province;
      
      // If CSV data is available for this province, use it
      if (this.csvData.has(province)) {
        this.initializeAccountsFromCSV();
      } else {
        // Otherwise use hardcoded accounts
        this.initializeHardcodedAccounts();
      }
    }
  }

  getProvince(): string {
    return this.currentProvince;
  }

  private getCurrentProvinceTaxInfo(): Province {
    return PROVINCES.find(p => p.code === this.currentProvince) || PROVINCES[0];
  }

  private addTaxInfo(account: Account): AccountWithTax {
    const province = this.getCurrentProvinceTaxInfo();
    let taxRate = 0;
    let taxType: AccountWithTax['taxType'] = 'Exempt';

    // Parse tax information from the Tax Code field in CSV
    const taxCode = account.taxCode.toLowerCase();
    
    if (taxCode.includes('hst')) {
      // HST provinces (ON, NB, NL, NS, PE)
      const hstMatch = taxCode.match(/(\d+)%/);
      if (hstMatch) {
        taxRate = parseInt(hstMatch[1]);
        taxType = 'HST';
      } else if (province.taxRate.hst) {
        taxRate = province.taxRate.hst;
        taxType = 'HST';
      }
    } else if (taxCode.includes('gst/pst') || (taxCode.includes('gst') && taxCode.includes('pst'))) {
      // GST+PST provinces (BC, SK, MB) - handles "GST/PST" format
      const gstPstMatch = taxCode.match(/(\d+)%/);
      if (gstPstMatch) {
        taxRate = parseInt(gstPstMatch[1]);
        taxType = 'GST+PST';
      } else {
        taxRate = province.taxRate.gst + province.taxRate.pst;
        taxType = 'GST+PST';
      }
    } else if (taxCode.includes('gst')) {
      // GST only - could be GST-only items or GST-only provinces
      const gstMatch = taxCode.match(/(\d+)%/);
      if (gstMatch) {
        taxRate = parseInt(gstMatch[1]);
      } else {
        taxRate = province.taxRate.gst;
      }
      
      // Determine tax type based on province
      if (this.currentProvince === 'QC') {
        taxRate = province.taxRate.gst + province.taxRate.pst; // PST is QST in Quebec
        taxType = 'GST+QST';
      } else if (this.currentProvince === 'AB') {
        taxType = 'GST+PST'; // Alberta is GST-only, but we use this type for consistency
      } else if (['BC', 'SK', 'MB'].includes(this.currentProvince)) {
        // For GST-only items in GST+PST provinces, keep as GST rate but mark as GST+PST province
        taxType = 'GST+PST';
      } else {
        taxType = 'GST+PST';
      }
    } else if (taxCode.includes('exempt') || taxCode.includes('0%')) {
      // Tax exempt items
      taxRate = 0;
      taxType = 'Exempt';
    }

    // Get description from CSV if available
    const csvAccount = this.csvData.get(this.currentProvince)?.find(csv => csv.Code === account.code);
    const description = csvAccount?.Description;

    return {
      ...account,
      taxRate,
      taxType,
      province: province.code,
      description
    };
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

  /**
   * Wait for the chart of accounts to be fully initialized
   */
  async waitForInitialization(): Promise<void> {
    // If already initialized, return immediately
    if (this.isInitialized) {
      return;
    }

    // Wait for initialization to complete (max 5 seconds)
    const maxWaitTime = 5000;
    const checkInterval = 100;
    let waited = 0;

    while (!this.isInitialized && waited < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    if (!this.isInitialized) {
      console.warn('Chart of accounts initialization timed out, using hardcoded accounts');
      // Ensure we're initialized with hardcoded accounts
      this.isInitialized = true;
    }
  }
}
