export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD format
  description: string;
  originalDescription: string;
  amount: number;
  category?: string;
  subcategory?: string;
  accountCode?: string;
  confidence?: number;
  isApproved?: boolean;
  isManuallyEdited?: boolean;
  merchant?: string;
  taxCode?: string;
  taxRate?: number; // Tax rate as percentage (e.g., 13 for 13%)
  // Feedback system (optional - won't break existing data)
  feedback?: {
    isCorrect: boolean;
    suggestedCategory?: string;
    userNote?: string;
  };
}

export interface Account {
  code: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  description?: string;
  taxCode: string;
  isPopular: boolean;
}

export interface MerchantPattern {
  pattern: RegExp;
  category: string;
  subcategory?: string;
  confidence: number;
  merchant: string;
}

export interface Province {
  code: string;
  name: string;
  gst: number;
  pst: number;
  hst?: number;
  qst?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CategorySuggestion {
  category: string;
  confidence: number;
  reasoning: string;
}

export interface DuplicateGroup {
  originalIndex: number;
  duplicateIndexes: number[];
  transaction: Transaction;
  confidence: number;
}

export interface DuplicateDetectionResult {
  duplicateGroups: DuplicateGroup[];
  cleanTransactions: Transaction[];
  duplicateCount: number;
}

export type BankFormat = 
  | 'Generic' 
  | 'Generic_DADB'
  | 'RBC' 
  | 'TD' 
  | 'Scotia' 
  | 'Scotia_DayToDay'
  | 'BMO' 
  | 'CIBC'
  | 'BT_Records'
  | 'ElectronicTransfer';

export interface CategoryMapping {
  category: string;
  subcategory?: string;
  primaryAccount: string;
  alternativeAccounts?: string[];
  description: string;
  taxImplications?: string;
}

export interface FinancialData {
  revenue: number;
  expenses: number;
  netIncome: number;
  assets: number;
  liabilities: number;
  equity: number;
}

export interface ProfitLossData {
  revenue: { [account: string]: number };
  expenses: { [account: string]: number };
  netIncome: number;
  period: string;
}

export interface BalanceSheetData {
  assets: { [account: string]: number };
  liabilities: { [account: string]: number };
  equity: { [account: string]: number };
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  period: string;
}

export interface CategorizationResult {
  category: string;
  confidence: number;
  reasoning: string;
} 