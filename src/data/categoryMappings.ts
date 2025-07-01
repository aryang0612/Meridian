export interface CategoryMapping {
  category: string;
  primaryAccount: string;
  alternativeAccounts: string[];
  description: string;
}

export const CATEGORY_MAPPINGS: CategoryMapping[] = [
  {
    category: 'Meals & Entertainment',
    primaryAccount: '5500',
    alternativeAccounts: ['5700'],
    description: 'Business meals and entertainment (50% deductible)'
  },
  {
    category: 'Motor Vehicle Expenses',
    primaryAccount: '5600',
    alternativeAccounts: ['5950'],
    description: 'Vehicle operating costs and travel'
  },
  {
    category: 'Office Supplies',
    primaryAccount: '5710',
    alternativeAccounts: ['5700', '5720'],
    description: 'Office materials and basic supplies'
  },
  {
    category: 'Bank Fees',
    primaryAccount: '5200',
    alternativeAccounts: ['5210'],
    description: 'Banking charges and transaction fees'
  },
  {
    category: 'Telecommunications',
    primaryAccount: '5900',
    alternativeAccounts: ['5730'],
    description: 'Phone, internet, and communication services'
  },
  {
    category: 'Utilities',
    primaryAccount: '5980',
    alternativeAccounts: [],
    description: 'Electricity, gas, water, and utilities'
  },
  {
    category: 'Transportation',
    primaryAccount: '5950',
    alternativeAccounts: ['5600'],
    description: 'Public transit, flights, and travel'
  },
  {
    category: 'Professional Services',
    primaryAccount: '5400',
    alternativeAccounts: [],
    description: 'Legal, accounting, and consulting fees'
  },
  {
    category: 'Insurance',
    primaryAccount: '5300',
    alternativeAccounts: ['5310'],
    description: 'Business insurance premiums'
  },
  {
    category: 'Software',
    primaryAccount: '5720',
    alternativeAccounts: ['5730', '5740'],
    description: 'Software licenses and technology'
  },
  {
    category: 'Online Services',
    primaryAccount: '5730',
    alternativeAccounts: ['5720', '5740'],
    description: 'Web services and online tools'
  },
  {
    category: 'Subscriptions',
    primaryAccount: '5740',
    alternativeAccounts: ['5700'],
    description: 'Recurring subscriptions and memberships'
  },
  {
    category: 'General Expenses',
    primaryAccount: '5700',
    alternativeAccounts: ['5710'],
    description: 'Miscellaneous business expenses'
  },
  {
    category: 'Tax Payments',
    primaryAccount: '5800',
    alternativeAccounts: [],
    description: 'Tax payments to CRA and other government agencies'
  },
  {
    category: 'Revenue',
    primaryAccount: '4000',
    alternativeAccounts: ['4100', '4200'],
    description: 'Business income and revenue'
  },
  {
    category: 'Payroll',
    primaryAccount: '5100',
    alternativeAccounts: ['5110'],
    description: 'Employee wages and payroll expenses'
  },
  {
    category: 'Bank Related',
    primaryAccount: '5200',
    alternativeAccounts: ['5210'],
    description: 'Bank transfers and related transactions'
  },
  {
    category: 'Interest Income',
    primaryAccount: '4200',
    alternativeAccounts: [],
    description: 'Interest earned on business accounts'
  }
];

// Add named export for categoryMappings
export const categoryMappings = CATEGORY_MAPPINGS;

export const getCategoryMapping = (category: string): CategoryMapping | undefined => {
  return CATEGORY_MAPPINGS.find(mapping => mapping.category === category);
};

export const getAccountForCategory = (category: string): string | undefined => {
  const mapping = getCategoryMapping(category);
  return mapping?.primaryAccount;
}; 

// Default export for backwards compatibility
export default CATEGORY_MAPPINGS; 