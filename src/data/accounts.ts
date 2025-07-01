// Chart of Accounts - CRA Compliant Canadian Business Accounts
// Account codes follow CRA guidelines: 1000-1999 (Assets), 2000-2999 (Liabilities), 3000-3999 (Equity), 4000-4999 (Revenue), 5000-7999 (Expenses)

export interface ChartAccount {
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  category: string;
  description: string;
  isActive: boolean;
}

export const CHART_OF_ACCOUNTS: ChartAccount[] = [
  // ASSETS (1000-1999)
  {
    code: '1000',
    name: 'Bank Account',
    type: 'asset',
    category: 'Current Assets',
    description: 'Primary business bank account',
    isActive: true
  },
  {
    code: '1100',
    name: 'Accounts Receivable',
    type: 'asset',
    category: 'Current Assets',
    description: 'Money owed by customers',
    isActive: true
  },
  {
    code: '1200',
    name: 'Inventory',
    type: 'asset',
    category: 'Current Assets',
    description: 'Goods held for sale',
    isActive: true
  },
  {
    code: '1300',
    name: 'Prepaid Expenses',
    type: 'asset',
    category: 'Current Assets',
    description: 'Expenses paid in advance',
    isActive: true
  },
  {
    code: '1400',
    name: 'Office Equipment',
    type: 'asset',
    category: 'Fixed Assets',
    description: 'Computers, furniture, etc.',
    isActive: true
  },
  {
    code: '1500',
    name: 'Vehicles',
    type: 'asset',
    category: 'Fixed Assets',
    description: 'Business vehicles',
    isActive: true
  },
  {
    code: '1600',
    name: 'Buildings',
    type: 'asset',
    category: 'Fixed Assets',
    description: 'Business premises',
    isActive: true
  },
  {
    code: '1700',
    name: 'Accumulated Depreciation',
    type: 'asset',
    category: 'Fixed Assets',
    description: 'Depreciation on fixed assets',
    isActive: true
  },

  // LIABILITIES (2000-2999)
  {
    code: '2000',
    name: 'Accounts Payable',
    type: 'liability',
    category: 'Current Liabilities',
    description: 'Money owed to suppliers',
    isActive: true
  },
  {
    code: '2100',
    name: 'Credit Cards',
    type: 'liability',
    category: 'Current Liabilities',
    description: 'Business credit card balances',
    isActive: true
  },
  {
    code: '2200',
    name: 'GST/HST Payable',
    type: 'liability',
    category: 'Current Liabilities',
    description: 'Goods and Services Tax owed',
    isActive: true
  },
  {
    code: '2300',
    name: 'PST Payable',
    type: 'liability',
    category: 'Current Liabilities',
    description: 'Provincial Sales Tax owed',
    isActive: true
  },
  {
    code: '2400',
    name: 'Payroll Liabilities',
    type: 'liability',
    category: 'Current Liabilities',
    description: 'CPP, EI, and income tax deductions',
    isActive: true
  },
  {
    code: '2500',
    name: 'Bank Loans',
    type: 'liability',
    category: 'Long-term Liabilities',
    description: 'Long-term bank loans',
    isActive: true
  },
  {
    code: '2600',
    name: 'Mortgage Payable',
    type: 'liability',
    category: 'Long-term Liabilities',
    description: 'Business mortgage',
    isActive: true
  },

  // EQUITY (3000-3999)
  {
    code: '3000',
    name: 'Owner\'s Equity',
    type: 'equity',
    category: 'Equity',
    description: 'Owner\'s investment in business',
    isActive: true
  },
  {
    code: '3100',
    name: 'Retained Earnings',
    type: 'equity',
    category: 'Equity',
    description: 'Accumulated profits',
    isActive: true
  },
  {
    code: '3200',
    name: 'Owner\'s Draw',
    type: 'equity',
    category: 'Equity',
    description: 'Owner withdrawals',
    isActive: true
  },

  // REVENUE (4000-4999)
  {
    code: '4000',
    name: 'Sales Revenue',
    type: 'revenue',
    category: 'Operating Revenue',
    description: 'Revenue from sales of goods/services',
    isActive: true
  },
  {
    code: '4100',
    name: 'Service Revenue',
    type: 'revenue',
    category: 'Operating Revenue',
    description: 'Revenue from services provided',
    isActive: true
  },
  {
    code: '4200',
    name: 'Interest Income',
    type: 'revenue',
    category: 'Other Revenue',
    description: 'Interest earned on investments',
    isActive: true
  },
  {
    code: '4300',
    name: 'Commission Income',
    type: 'revenue',
    category: 'Operating Revenue',
    description: 'Commission revenue',
    isActive: true
  },
  {
    code: '4400',
    name: 'Rental Income',
    type: 'revenue',
    category: 'Other Revenue',
    description: 'Income from property rental',
    isActive: true
  },

  // EXPENSES (5000-7999)
  {
    code: '5000',
    name: 'Cost of Goods Sold',
    type: 'expense',
    category: 'Cost of Sales',
    description: 'Direct costs of producing goods',
    isActive: true
  },
  {
    code: '5100',
    name: 'Advertising & Marketing',
    type: 'expense',
    category: 'Operating Expenses',
    description: 'Marketing and advertising costs',
    isActive: true
  },
  {
    code: '5200',
    name: 'Office Supplies',
    type: 'expense',
    category: 'Operating Expenses',
    description: 'Office supplies and materials',
    isActive: true
  },
  {
    code: '5300',
    name: 'Rent Expense',
    type: 'expense',
    category: 'Operating Expenses',
    description: 'Office and equipment rent',
    isActive: true
  },
  {
    code: '5400',
    name: 'Utilities',
    type: 'expense',
    category: 'Operating Expenses',
    description: 'Electricity, water, gas, internet',
    isActive: true
  },
  {
    code: '5500',
    name: 'Telephone & Internet',
    type: 'expense',
    category: 'Operating Expenses',
    description: 'Phone and internet services',
    isActive: true
  },
  {
    code: '5600',
    name: 'Insurance',
    type: 'expense',
    category: 'Operating Expenses',
    description: 'Business insurance premiums',
    isActive: true
  },
  {
    code: '5700',
    name: 'Vehicle Expenses',
    type: 'expense',
    category: 'Operating Expenses',
    description: 'Fuel, maintenance, repairs',
    isActive: true
  },
  {
    code: '5800',
    name: 'Travel & Entertainment',
    type: 'expense',
    category: 'Operating Expenses',
    description: 'Business travel and meals',
    isActive: true
  },
  {
    code: '5900',
    name: 'Professional Fees',
    type: 'expense',
    category: 'Operating Expenses',
    description: 'Legal, accounting, consulting',
    isActive: true
  },
  {
    code: '6000',
    name: 'Wages & Salaries',
    type: 'expense',
    category: 'Operating Expenses',
    description: 'Employee wages and salaries',
    isActive: true
  },
  {
    code: '6100',
    name: 'Payroll Taxes',
    type: 'expense',
    category: 'Operating Expenses',
    description: 'Employer portion of CPP, EI',
    isActive: true
  },
  {
    code: '6200',
    name: 'Benefits',
    type: 'expense',
    category: 'Operating Expenses',
    description: 'Employee benefits and health insurance',
    isActive: true
  },
  {
    code: '6300',
    name: 'Depreciation',
    type: 'expense',
    category: 'Operating Expenses',
    description: 'Depreciation on fixed assets',
    isActive: true
  },
  {
    code: '6400',
    name: 'Bank Charges',
    type: 'expense',
    category: 'Operating Expenses',
    description: 'Bank fees and service charges',
    isActive: true
  },
  {
    code: '6500',
    name: 'Interest Expense',
    type: 'expense',
    category: 'Operating Expenses',
    description: 'Interest on loans and credit',
    isActive: true
  },
  {
    code: '6600',
    name: 'Meals & Entertainment',
    type: 'expense',
    category: 'Operating Expenses',
    description: 'Business meals and entertainment',
    isActive: true
  },
  {
    code: '6700',
    name: 'Software & Subscriptions',
    type: 'expense',
    category: 'Operating Expenses',
    description: 'Software licenses and subscriptions',
    isActive: true
  },
  {
    code: '6800',
    name: 'Maintenance & Repairs',
    type: 'expense',
    category: 'Operating Expenses',
    description: 'Equipment and property maintenance',
    isActive: true
  },
  {
    code: '6900',
    name: 'Miscellaneous Expenses',
    type: 'expense',
    category: 'Operating Expenses',
    description: 'Other business expenses',
    isActive: true
  }
];

// Helper functions
export function getAccountByCode(code: string): ChartAccount | undefined {
  return CHART_OF_ACCOUNTS.find(account => account.code === code);
}

export function getAccountsByType(type: ChartAccount['type']): ChartAccount[] {
  return CHART_OF_ACCOUNTS.filter(account => account.type === type);
}

export function getActiveAccounts(): ChartAccount[] {
  return CHART_OF_ACCOUNTS.filter(account => account.isActive);
}

export function getRevenueAccounts(): ChartAccount[] {
  return getAccountsByType('revenue');
}

export function getExpenseAccounts(): ChartAccount[] {
  return getAccountsByType('expense');
}

export function getAssetAccounts(): ChartAccount[] {
  return getAccountsByType('asset');
}

export function getLiabilityAccounts(): ChartAccount[] {
  return getAccountsByType('liability');
}

export function getEquityAccounts(): ChartAccount[] {
  return getAccountsByType('equity');
}

// Default export for backward compatibility
export default CHART_OF_ACCOUNTS;
