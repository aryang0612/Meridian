export interface CategoryDefinition {
  name: string;
  description: string;
  taxDeductible: boolean;
  commonAccounts: string[];
  examples: string[];
}

export const BUSINESS_CATEGORIES: CategoryDefinition[] = [
  {
    name: 'Meals & Entertainment',
    description: '50% deductible business meals and entertainment expenses',
    taxDeductible: true,
    commonAccounts: ['428 - Meals & Entertainment'],
    examples: ['Restaurant bills', 'Coffee meetings', 'Client dinners', 'Business lunches']
  },
  {
    name: 'Motor Vehicle Expenses',
    description: 'Vehicle operating expenses for business use',
    taxDeductible: true,
    commonAccounts: ['456 - Motor Vehicle Expenses'],
    examples: ['Gas', 'Oil changes', 'Repairs', 'Car washes', 'Parking']
  },
  {
    name: 'Office Supplies',
    description: 'Office materials and supplies',
    taxDeductible: true,
    commonAccounts: ['460 - Office Supplies'],
    examples: ['Paper', 'Pens', 'Ink cartridges', 'Software', 'Computer accessories']
  },
  {
    name: 'Bank Fees',
    description: 'Banking charges and transaction fees',
    taxDeductible: true,
    commonAccounts: ['404 - Bank Charges'],
    examples: ['Monthly fees', 'Transaction charges', 'Overdraft fees', 'Wire transfers']
  },
  {
    name: 'Telecommunications',
    description: 'Phone, internet, and communication services',
    taxDeductible: true,
    commonAccounts: ['464 - Telecommunications'],
    examples: ['Cell phone bills', 'Internet service', 'Business phone lines', 'Conference calling']
  },
  {
    name: 'Utilities',
    description: 'Electricity, gas, water, and other utilities',
    taxDeductible: true,
    commonAccounts: ['466 - Utilities'],
    examples: ['Hydro bills', 'Natural gas', 'Water bills', 'Waste management']
  },
  {
    name: 'Transportation',
    description: 'Public transit, flights, and travel expenses',
    taxDeductible: true,
    commonAccounts: ['458 - Travel & Transportation'],
    examples: ['Transit passes', 'Taxi/Uber', 'Flight tickets', 'Train tickets']
  },
  {
    name: 'Professional Services',
    description: 'Legal, accounting, consulting, and professional fees',
    taxDeductible: true,
    commonAccounts: ['462 - Professional Fees'],
    examples: ['Legal fees', 'Accounting services', 'Consulting', 'Business coaching']
  },
  {
    name: 'Insurance',
    description: 'Business insurance premiums',
    taxDeductible: true,
    commonAccounts: ['454 - Insurance'],
    examples: ['Liability insurance', 'Professional insurance', 'Business property insurance']
  },
  {
    name: 'Software',
    description: 'Business software and subscriptions',
    taxDeductible: true,
    commonAccounts: ['460 - Software & Technology'],
    examples: ['Software licenses', 'SaaS subscriptions', 'Cloud services', 'Apps']
  },
  {
    name: 'Online Services',
    description: 'Web services and online tools',
    taxDeductible: true,
    commonAccounts: ['460 - Online Services'],
    examples: ['Website hosting', 'Domain names', 'Online tools', 'Digital services']
  },
  {
    name: 'Subscriptions',
    description: 'Recurring subscription services',
    taxDeductible: false,
    commonAccounts: ['470 - Personal Expenses'],
    examples: ['Netflix', 'Spotify', 'Personal magazines', 'Entertainment subscriptions']
  },
  {
    name: 'Medical Expenses',
    description: 'Health and medical related expenses',
    taxDeductible: false,
    commonAccounts: ['470 - Personal Expenses'],
    examples: ['Pharmacy purchases', 'Medical supplies', 'Health services']
  },
  {
    name: 'General Expenses',
    description: 'Miscellaneous business expenses',
    taxDeductible: true,
    commonAccounts: ['468 - General Expenses'],
    examples: ['Miscellaneous supplies', 'Small equipment', 'General purchases']
  },
  {
    name: 'Interest Income',
    description: 'Interest earned on business accounts',
    taxDeductible: false,
    commonAccounts: ['270 - Interest Income'],
    examples: ['Bank interest', 'Investment interest', 'GIC interest']
  },
  {
    name: 'Investment Income',
    description: 'Dividends and investment returns',
    taxDeductible: false,
    commonAccounts: ['275 - Investment Income'],
    examples: ['Stock dividends', 'Investment returns', 'Capital gains']
  },
  {
    name: 'Investments',
    description: 'Investment purchases and transfers',
    taxDeductible: false,
    commonAccounts: ['1200 - Investments'],
    examples: ['Stock purchases', 'Bond investments', 'Mutual funds', 'RRSP contributions']
  },
  {
    name: 'E-Transfer',
    description: 'Electronic transfers that require manual account assignment',
    taxDeductible: false,
    commonAccounts: [],
    examples: ['Interac e-transfers', 'Electronic money transfers', 'Online transfers']
  }
];

export const getCategoryByName = (name: string): CategoryDefinition | undefined => {
  return BUSINESS_CATEGORIES.find(cat => cat.name === name);
};

export const getTaxDeductibleCategories = (): CategoryDefinition[] => {
  return BUSINESS_CATEGORIES.filter(cat => cat.taxDeductible);
};

export const getCategoryNames = (): string[] => {
  return BUSINESS_CATEGORIES.map(cat => cat.name).sort();
}; 