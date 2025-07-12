import { Transaction } from './types';
import { categorizationCache, patternCache, CacheUtils, performanceTracker } from './performanceOptimizer';
import { getInflowOutflow } from './aiEngine';

// Unified Pattern Interface
export interface UnifiedPattern {
  pattern: RegExp;
  merchant: string;
  accountCode: string;
  confidence: number;
  priority: number; // Higher priority = checked first
  category: 'bank' | 'merchant' | 'financial' | 'system' | 'training'; // Added 'training' category
  description?: string;
}

// Pattern Categories with Clear Priorities
export const UNIFIED_PATTERNS: UnifiedPattern[] = [
  // =============================================================================
  // PRIORITY 1: TRAINING DATA PATTERNS (HIGHEST PRIORITY - SINGLE SOURCE OF TRUTH)
  // =============================================================================
  // These patterns are based on the user's training data and should override all others
  
  // Federal/Government Payments -> Other Revenue (260)
  { pattern: /federal\s*payment\s*canada/i, merchant: 'Federal Payment Canada', accountCode: '260', confidence: 100, priority: 120, category: 'training' },
  { pattern: /federal\s*payment\s*canada\s*interest\s*credit/i, merchant: 'Federal Payment Canada Interest Credit', accountCode: '270', confidence: 100, priority: 120, category: 'training' },
  { pattern: /federal\s*payment\s*canada\s*debit\s*memo/i, merchant: 'Federal Payment Canada Debit Memo', accountCode: '260', confidence: 100, priority: 120, category: 'training' },
  { pattern: /federal\s*payment$/i, merchant: 'Federal Payment', accountCode: '260', confidence: 98, priority: 119, category: 'training' },
  
  // Government Tax Payments -> Other Revenue (260) - Based on training data
  { pattern: /business\s*pad\s*emptx.*government\s*tax\s*payments/i, merchant: 'Government Tax Payments EMPTX', accountCode: '260', confidence: 100, priority: 120, category: 'training' },
  { pattern: /business\s*pad\s*gst34.*government\s*tax\s*payments/i, merchant: 'Government Tax Payments GST', accountCode: '260', confidence: 100, priority: 120, category: 'training' },
  { pattern: /business\s*pad\s*txins.*government\s*tax\s*payments/i, merchant: 'Government Tax Payments TXINS', accountCode: '260', confidence: 100, priority: 120, category: 'training' },
  { pattern: /business\s*pad.*government\s*tax\s*payments/i, merchant: 'Government Tax Payments', accountCode: '260', confidence: 100, priority: 118, category: 'training' },
  
  // Service Charges -> Bank Fees (404)
  { pattern: /service\s*charge$/i, merchant: 'Service Charge', accountCode: '404', confidence: 100, priority: 120, category: 'training' },
  { pattern: /service\s*charge\s*interac\s*e[\-\s]*transfer\s*fee/i, merchant: 'E-Transfer Fee', accountCode: '404', confidence: 100, priority: 120, category: 'training' },
  { pattern: /service\s*charge.*overdraft\s*interest/i, merchant: 'Overdraft Interest', accountCode: '404', confidence: 100, priority: 120, category: 'training' },
  
  // Deposits -> Service Revenue (220) - Based on training data
  { pattern: /deposit\s*hamilton\s*on.*mb[\-\s]*dep/i, merchant: 'Deposit Hamilton ON', accountCode: '220', confidence: 100, priority: 120, category: 'training' },
  { pattern: /deposit\s*hamilton\s*on/i, merchant: 'Deposit Hamilton ON', accountCode: '220', confidence: 100, priority: 118, category: 'training' },
  { pattern: /deposit.*mb[\-\s]*dep/i, merchant: 'Deposit', accountCode: '220', confidence: 98, priority: 117, category: 'training' },
  { pattern: /abm\s*deposit/i, merchant: 'ABM Deposit', accountCode: '220', confidence: 100, priority: 120, category: 'training' },
  { pattern: /^deposit$/i, merchant: 'Deposit', accountCode: '220', confidence: 95, priority: 116, category: 'training' },
  
  // Accounts Payable -> Service Revenue (220) - Based on training data
  { pattern: /accounts\s*payable\s*cfc\/fcc/i, merchant: 'Accounts Payable CFC/FCC', accountCode: '220', confidence: 100, priority: 120, category: 'training' },
  { pattern: /accounts\s*payable\s*deposit\s*intuit\s*canada/i, merchant: 'Accounts Payable Intuit Canada', accountCode: '220', confidence: 100, priority: 120, category: 'training' },
  { pattern: /accounts\s*payable\s*intuit.*intuit\s*canada/i, merchant: 'Accounts Payable Intuit Canada', accountCode: '220', confidence: 100, priority: 120, category: 'training' },
  { pattern: /intuit\s*canada.*accounts\s*payable/i, merchant: 'Intuit Canada Accounts Payable', accountCode: '220', confidence: 100, priority: 120, category: 'training' },
  { pattern: /intuit\s*canada.*credit\s*memo/i, merchant: 'Intuit Canada Credit Memo', accountCode: '220', confidence: 100, priority: 120, category: 'training' },
  
  // Transaction Fees -> Bank Fees (404) - Based on training data
  { pattern: /accounts\s*payable\s*tran\s*fee\s*intuit\s*canada/i, merchant: 'Intuit Canada Transaction Fee', accountCode: '404', confidence: 100, priority: 120, category: 'training' },
  { pattern: /intuit\s*canada.*tran\s*fee/i, merchant: 'Intuit Canada Transaction Fee', accountCode: '404', confidence: 100, priority: 120, category: 'training' },
  { pattern: /bill\s*payment\s*txnfee.*government\s*tax\s*payments/i, merchant: 'Government Tax Payment Fee', accountCode: '404', confidence: 100, priority: 120, category: 'training' },
  { pattern: /bill\s*payment\s*txnfee/i, merchant: 'Bill Payment Transaction Fee', accountCode: '404', confidence: 100, priority: 120, category: 'training' },
  { pattern: /misc\s*payment\s*pay[\-\s]*file\s*fees/i, merchant: 'Pay File Fees', accountCode: '404', confidence: 100, priority: 120, category: 'training' },
  { pattern: /misc\s*payment\s*sec\s*reg\s*fee/i, merchant: 'Securities Registration Fee', accountCode: '404', confidence: 100, priority: 120, category: 'training' },
  
  // Fitness & Membership Fees -> Bank Fees (404) - Based on training data
  { pattern: /fees\/dues\s*planet\s*fitness/i, merchant: 'Planet Fitness', accountCode: '404', confidence: 100, priority: 120, category: 'training' },
  
  // Annual Fees -> Bank Fees (404) - Based on training data
  { pattern: /annual\s*fee/i, merchant: 'Annual Fee', accountCode: '404', confidence: 100, priority: 120, category: 'training' },
  
  // Direct Deposits -> Service Revenue (220) - Based on training data
  { pattern: /direct\s*deposits.*pay\s*emp[\-\s]*vendor/i, merchant: 'Direct Deposits Employee/Vendor', accountCode: '220', confidence: 100, priority: 120, category: 'training' },
  { pattern: /direct\s*deposits.*pds.*service\s*total/i, merchant: 'Direct Deposits PDS Service', accountCode: '220', confidence: 100, priority: 120, category: 'training' },
  
  // Monthly Fees -> Bank Fees (404) - Based on training data
  { pattern: /monthly\s*fee/i, merchant: 'Monthly Fee', accountCode: '404', confidence: 100, priority: 120, category: 'training' },
  { pattern: /mon\s*fee\d+/i, merchant: 'Monthly Fee', accountCode: '404', confidence: 100, priority: 120, category: 'training' },
  
  // NSF and Overdraft Fees -> Bank Fees (404) - Based on training data
  { pattern: /nsf\s*service\s*charge/i, merchant: 'NSF Service Charge', accountCode: '404', confidence: 100, priority: 120, category: 'training' },
  { pattern: /overlimit\s*fee/i, merchant: 'Overlimit Fee', accountCode: '404', confidence: 100, priority: 120, category: 'training' },
  { pattern: /cross[\-\s]*border\s*debit\s*fee/i, merchant: 'Cross-Border Debit Fee', accountCode: '404', confidence: 100, priority: 120, category: 'training' },
  
  // Interest Credit -> Interest Income (270) - Based on training data
  { pattern: /federal\s*payment\s*canada\s*interest\s*credit/i, merchant: 'Federal Payment Canada Interest Credit', accountCode: '270', confidence: 100, priority: 120, category: 'training' },
  { pattern: /interest\s*credit/i, merchant: 'Interest Credit', accountCode: '270', confidence: 100, priority: 118, category: 'training' },
  
  // Credit Card/LOC Payments -> Service Revenue (220) - Based on training data
  { pattern: /mb[\-\s]*credit\s*card\/loc\s*pay.*deposit\s*hamilton\s*on/i, merchant: 'Credit Card/LOC Payment', accountCode: '220', confidence: 100, priority: 120, category: 'training' },
  { pattern: /mb[\-\s]*credit\s*card\/loc\s*pay/i, merchant: 'Credit Card/LOC Payment', accountCode: '220', confidence: 98, priority: 118, category: 'training' },
  
  // Interac Purchases -> Meals & Entertainment (420) - Based on training data
  { pattern: /contactless\s*interac\s*purchase.*tim\s*hortons/i, merchant: 'Tim Hortons', accountCode: '420', confidence: 100, priority: 120, category: 'training' },
  { pattern: /contactless\s*interac\s*purchase.*mcdonald/i, merchant: 'McDonalds', accountCode: '420', confidence: 100, priority: 120, category: 'training' },
  { pattern: /contactless\s*interac\s*purchase.*boston\s*pizza/i, merchant: 'Boston Pizza', accountCode: '420', confidence: 100, priority: 120, category: 'training' },
  { pattern: /contactless\s*interac\s*purchase.*a&w/i, merchant: 'A&W Restaurant', accountCode: '420', confidence: 100, priority: 120, category: 'training' },
  { pattern: /contactless\s*interac\s*purchase.*wendy/i, merchant: 'Wendys', accountCode: '420', confidence: 100, priority: 120, category: 'training' },
  { pattern: /contactless\s*interac\s*purchase.*pizza/i, merchant: 'Pizza Restaurant', accountCode: '420', confidence: 100, priority: 120, category: 'training' },
  { pattern: /interac\s*purchase.*pizza/i, merchant: 'Pizza Restaurant', accountCode: '420', confidence: 100, priority: 120, category: 'training' },
  
  // Interac Purchases -> Supplies (455) - Based on training data
  { pattern: /contactless\s*interac\s*purchase.*dollarama/i, merchant: 'Dollarama', accountCode: '455', confidence: 100, priority: 120, category: 'training' },
  { pattern: /interac\s*purchase.*dollarama/i, merchant: 'Dollarama', accountCode: '455', confidence: 100, priority: 120, category: 'training' },
  { pattern: /contactless\s*interac\s*purchase.*walmart/i, merchant: 'Walmart', accountCode: '455', confidence: 100, priority: 120, category: 'training' },
  { pattern: /interac\s*purchase.*walmart/i, merchant: 'Walmart', accountCode: '455', confidence: 100, priority: 120, category: 'training' },
  
  // =============================================================================
  // PRIORITY 2: BANK SYSTEM PATTERNS (High Priority)
  // =============================================================================
  
  // E-Transfer patterns (Note: User wants these in Tracking Transfers per memory)
  { pattern: /balance\s*forward\s*debit\s*memo.*interac\s*e[\-\s]*transfer/i, merchant: 'E-Transfer', accountCode: '877', confidence: 100, priority: 105, category: 'bank' },
  { pattern: /debit\s*memo.*interac\s*e[\-\s]*transfer/i, merchant: 'E-Transfer', accountCode: '877', confidence: 100, priority: 105, category: 'bank' },
  { pattern: /credit\s*memo.*interac\s*e[\-\s]*transfer/i, merchant: 'E-Transfer', accountCode: '877', confidence: 100, priority: 105, category: 'bank' },
  { pattern: /interac\s*e[\-\s]*transfer(?!.*fee)/i, merchant: 'E-Transfer', accountCode: '877', confidence: 98, priority: 104, category: 'bank' },
  
  // Transfer patterns -> Tracking Transfers (877)
  { pattern: /transfer\s*to\s*cr\.\s*card/i, merchant: 'Credit Card Transfer', accountCode: '877', confidence: 100, priority: 105, category: 'bank' },
  
  // Mobile Banking Bill Payments (Account Code: 800 for credit cards, specific for utilities)
  { pattern: /mb[\-\s]*bill\s*payment.*(?:mastercard|visa|credit\s*card)/i, merchant: 'Credit Card Payment', accountCode: '800', confidence: 98, priority: 100, category: 'bank' },
  { pattern: /mb[\-\s]*bill\s*payment.*walmart.*mastercard/i, merchant: 'Walmart Mastercard Payment', accountCode: '800', confidence: 98, priority: 100, category: 'bank' },
  { pattern: /mb[\-\s]*bill\s*payment.*rogers.*mastercard/i, merchant: 'Rogers Bank Mastercard Payment', accountCode: '800', confidence: 98, priority: 100, category: 'bank' },
  { pattern: /mb[\-\s]*bill\s*payment.*virgin.*plus/i, merchant: 'Virgin Plus', accountCode: '489', confidence: 98, priority: 100, category: 'bank' },
  { pattern: /mb[\-\s]*bill\s*payment.*rogers(?!\s*mastercard)/i, merchant: 'Rogers', accountCode: '489', confidence: 98, priority: 100, category: 'bank' },
  { pattern: /mb[\-\s]*bill\s*payment.*bell/i, merchant: 'Bell Canada', accountCode: '489', confidence: 98, priority: 100, category: 'bank' },
  { pattern: /mb[\-\s]*bill\s*payment.*telus/i, merchant: 'Telus', accountCode: '489', confidence: 98, priority: 100, category: 'bank' },
  { pattern: /mb[\-\s]*bill\s*payment.*hydro/i, merchant: 'Hydro Bill', accountCode: '442', confidence: 98, priority: 100, category: 'bank' },
  { pattern: /mb[\-\s]*bill\s*payment.*gas/i, merchant: 'Gas Bill', accountCode: '442', confidence: 98, priority: 100, category: 'bank' },
  { pattern: /mb[\-\s]*bill\s*payment/i, merchant: 'Bill Payment', accountCode: '800', confidence: 85, priority: 98, category: 'bank' },
  
  // Bank Fees (Account Code: 404)
  { pattern: /overdrawn\s*handling\s*charge/i, merchant: 'Bank Fee', accountCode: '404', confidence: 98, priority: 100, category: 'bank' },
  { pattern: /monthly\s*account\s*fee/i, merchant: 'Bank Fee', accountCode: '404', confidence: 98, priority: 100, category: 'bank' },
  { pattern: /service\s*charge/i, merchant: 'Bank Fee', accountCode: '404', confidence: 97, priority: 100, category: 'bank' },
  { pattern: /nsf\s*fee/i, merchant: 'NSF Fee', accountCode: '404', confidence: 98, priority: 100, category: 'bank' },
  { pattern: /overdraft\s*interest/i, merchant: 'Overdraft Interest', accountCode: '404', confidence: 98, priority: 100, category: 'bank' },
  { pattern: /atm\s*fee/i, merchant: 'ATM Fee', accountCode: '404', confidence: 97, priority: 100, category: 'bank' },
  { pattern: /e[\-\s]*transfer\s*fee(?!\s*free)/i, merchant: 'E-Transfer Fee', accountCode: '404', confidence: 97, priority: 100, category: 'bank' },
  { pattern: /foreign\s*exchange\s*fee/i, merchant: 'Foreign Exchange Fee', accountCode: '404', confidence: 97, priority: 100, category: 'bank' },
  { pattern: /wire\s*transfer\s*fee/i, merchant: 'Wire Transfer Fee', accountCode: '404', confidence: 97, priority: 100, category: 'bank' },
  
  // Interest & Investment Income (Account Code: 270)
  { pattern: /interest\s*paid/i, merchant: 'Interest Income', accountCode: '270', confidence: 98, priority: 95, category: 'financial' },
  { pattern: /interest\s*earned/i, merchant: 'Interest Income', accountCode: '270', confidence: 98, priority: 95, category: 'financial' },
  { pattern: /dividend/i, merchant: 'Dividend', accountCode: '270', confidence: 95, priority: 95, category: 'financial' },
  { pattern: /investment\s*income/i, merchant: 'Investment Income', accountCode: '270', confidence: 95, priority: 95, category: 'financial' },
  
  // Government Deposits (Account Code: 200)
  { pattern: /government\s*canada/i, merchant: 'Government Deposit', accountCode: '200', confidence: 95, priority: 90, category: 'financial' },
  { pattern: /cra\s*deposit/i, merchant: 'CRA Deposit', accountCode: '200', confidence: 95, priority: 90, category: 'financial' },
  { pattern: /employment\s*insurance/i, merchant: 'EI Deposit', accountCode: '200', confidence: 95, priority: 90, category: 'financial' },
  
  // Internal Transfers (Account Code: 877)
  { pattern: /mb[\-\s]*transfer/i, merchant: 'MB Transfer', accountCode: '877', confidence: 98, priority: 95, category: 'bank' },
  { pattern: /internal\s*transfer/i, merchant: 'Internal Transfer', accountCode: '877', confidence: 95, priority: 90, category: 'bank' },
  { pattern: /account\s*transfer/i, merchant: 'Account Transfer', accountCode: '877', confidence: 95, priority: 90, category: 'bank' },
  { pattern: /transfer\s*to\s*savings/i, merchant: 'Transfer to Savings', accountCode: '877', confidence: 95, priority: 90, category: 'bank' },
  { pattern: /transfer\s*from\s*savings/i, merchant: 'Transfer from Savings', accountCode: '877', confidence: 95, priority: 90, category: 'bank' },
  { pattern: /transfer\s*to\s*chequing/i, merchant: 'Transfer to Chequing', accountCode: '877', confidence: 95, priority: 90, category: 'bank' },
  { pattern: /transfer\s*from\s*chequing/i, merchant: 'Transfer from Chequing', accountCode: '877', confidence: 95, priority: 90, category: 'bank' },
  // E-Transfer patterns REMOVED - now require manual entry per user request
  // { pattern: /interac\s*e[\-\s]*transfer/i, merchant: 'Interac E-Transfer', accountCode: '877', confidence: 90, priority: 85, category: 'bank' },
  // { pattern: /(?:e[\-\s]*transfer|e[\-\s]*tfr|etfr)(?!\s*fee)/i, merchant: 'E-Transfer', accountCode: '877', confidence: 85, priority: 80, category: 'bank' },
  { pattern: /atm\s*withdrawal/i, merchant: 'ATM Withdrawal', accountCode: '610', confidence: 95, priority: 90, category: 'bank' },
  { pattern: /atm\s*deposit/i, merchant: 'ATM Deposit', accountCode: '610', confidence: 95, priority: 90, category: 'bank' },
  
  // Credit Card & Loan Payments (FIXED: Account Code: 800 - Accounts Payable)
  { pattern: /credit\s*card\s*payment/i, merchant: 'Credit Card Payment', accountCode: '800', confidence: 95, priority: 85, category: 'financial' },
  { pattern: /loan\s*payment/i, merchant: 'Loan Payment', accountCode: '800', confidence: 95, priority: 85, category: 'financial' },
  { pattern: /mortgage\s*payment/i, merchant: 'Mortgage Payment', accountCode: '800', confidence: 95, priority: 85, category: 'financial' },
  { pattern: /visa\s*payment/i, merchant: 'Visa Payment', accountCode: '800', confidence: 95, priority: 85, category: 'financial' },
  { pattern: /mastercard\s*payment/i, merchant: 'Mastercard Payment', accountCode: '800', confidence: 95, priority: 85, category: 'financial' },
  
  // =============================================================================
  // PRIORITY 3: MERCHANT PATTERNS (Medium Priority)
  // =============================================================================
  
  // Specific Bill Payment Patterns (Higher priority than generic patterns)
  { pattern: /virgin\s*plus/i, merchant: 'Virgin Plus', accountCode: '489', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /walmart.*mastercard/i, merchant: 'Walmart Mastercard Payment', accountCode: '800', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /rogers.*bank.*mastercard/i, merchant: 'Rogers Bank Mastercard Payment', accountCode: '800', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /rogers.*mastercard/i, merchant: 'Rogers Mastercard Payment', accountCode: '800', confidence: 96, priority: 85, category: 'merchant' },
  
  // === GAS STATIONS AND FUEL (HIGH PRIORITY - FIXED CATEGORIZATION) ===
  { pattern: /phillips\s*66/i, merchant: 'Phillips 66', accountCode: '449', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /shell\s+\d+/i, merchant: 'Shell Gas Station', accountCode: '449', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /shell/i, merchant: 'Shell Gas Station', accountCode: '449', confidence: 90, priority: 80, category: 'merchant' },
  { pattern: /esso\s+\d+/i, merchant: 'Esso', accountCode: '449', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /esso/i, merchant: 'Esso', accountCode: '449', confidence: 90, priority: 80, category: 'merchant' },
  { pattern: /petro[\s\-]?canada/i, merchant: 'Petro-Canada', accountCode: '449', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /chevron\s+\d+/i, merchant: 'Chevron', accountCode: '449', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /chevron/i, merchant: 'Chevron', accountCode: '449', confidence: 90, priority: 80, category: 'merchant' },
  { pattern: /speedway\s+\d+/i, merchant: 'Speedway', accountCode: '449', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /speedway/i, merchant: 'Speedway', accountCode: '449', confidence: 90, priority: 80, category: 'merchant' },
  { pattern: /husky\s+\d+/i, merchant: 'Husky', accountCode: '449', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /husky/i, merchant: 'Husky', accountCode: '449', confidence: 90, priority: 80, category: 'merchant' },
  { pattern: /mobil\s+\d+/i, merchant: 'Mobil', accountCode: '449', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /mobil/i, merchant: 'Mobil', accountCode: '449', confidence: 90, priority: 80, category: 'merchant' },
  { pattern: /sunoco\s+\d+/i, merchant: 'Sunoco', accountCode: '449', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /sunoco/i, merchant: 'Sunoco', accountCode: '449', confidence: 90, priority: 80, category: 'merchant' },
  { pattern: /fuel\s+point/i, merchant: 'Fuel Point', accountCode: '449', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /point\s+fuel/i, merchant: 'Point Fuel', accountCode: '449', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /gas\s+station/i, merchant: 'Gas Station', accountCode: '449', confidence: 90, priority: 80, category: 'merchant' },

  // === INTEREST AND FEES (FIXED CATEGORIZATION) ===
  { pattern: /purchase\s+interest/i, merchant: 'Purchase Interest', accountCode: '437', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /interest\s+charge/i, merchant: 'Interest Charge', accountCode: '437', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /interest\s+expense/i, merchant: 'Interest Expense', accountCode: '437', confidence: 96, priority: 85, category: 'merchant' },

  // === ONLINE SHOPPING (IMPROVED CATEGORIZATION) ===
  { pattern: /alibaba\.com/i, merchant: 'Alibaba.com', accountCode: '310', confidence: 90, priority: 80, category: 'merchant' }, // Cost of goods sold for business purchases
  { pattern: /aliexpress/i, merchant: 'AliExpress', accountCode: '455', confidence: 90, priority: 80, category: 'merchant' }, // Supplies for smaller items
  { pattern: /amazon\s+mktp/i, merchant: 'Amazon Marketplace', accountCode: '455', confidence: 85, priority: 75, category: 'merchant' },
  { pattern: /amzn\s+mktp/i, merchant: 'Amazon Marketplace', accountCode: '455', confidence: 85, priority: 75, category: 'merchant' },
  { pattern: /amazon\.ca/i, merchant: 'Amazon Canada', accountCode: '455', confidence: 85, priority: 75, category: 'merchant' },
  { pattern: /amazon/i, merchant: 'Amazon', accountCode: '455', confidence: 80, priority: 70, category: 'merchant' },

  // Food & Restaurants (Account Code: 420)
  { pattern: /tim\s*hortons?/i, merchant: 'Tim Hortons', accountCode: '420', confidence: 96, priority: 80, category: 'merchant' },
  { pattern: /tims/i, merchant: 'Tim Hortons', accountCode: '420', confidence: 90, priority: 75, category: 'merchant' },
  { pattern: /starbucks/i, merchant: 'Starbucks', accountCode: '420', confidence: 96, priority: 80, category: 'merchant' },
  { pattern: /mcdonald'?s/i, merchant: 'McDonalds', accountCode: '420', confidence: 96, priority: 80, category: 'merchant' },
  { pattern: /mcdonald/i, merchant: 'McDonalds', accountCode: '420', confidence: 90, priority: 75, category: 'merchant' },
  { pattern: /macdonalds/i, merchant: 'McDonalds', accountCode: '420', confidence: 85, priority: 70, category: 'merchant' },
  { pattern: /burger\s*king/i, merchant: 'Burger King', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /burgerking/i, merchant: 'Burger King', accountCode: '420', confidence: 90, priority: 75, category: 'merchant' },
  { pattern: /\bbk\b/i, merchant: 'Burger King', accountCode: '420', confidence: 85, priority: 70, category: 'merchant' },
  { pattern: /subway/i, merchant: 'Subway', accountCode: '420', confidence: 94, priority: 80, category: 'merchant' },
  { pattern: /kfc/i, merchant: 'KFC', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /taco\s*bell/i, merchant: 'Taco Bell', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /tacobell/i, merchant: 'Taco Bell', accountCode: '420', confidence: 90, priority: 75, category: 'merchant' },
  { pattern: /harvey'?s/i, merchant: 'Harveys', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /wendy'?s/i, merchant: 'Wendys', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /wendys/i, merchant: 'Wendys', accountCode: '420', confidence: 90, priority: 75, category: 'merchant' },
  { pattern: /dairy\s*queen/i, merchant: 'Dairy Queen', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /dairyqueen/i, merchant: 'Dairy Queen', accountCode: '420', confidence: 90, priority: 75, category: 'merchant' },
  { pattern: /pizza\s+garden/i, merchant: 'Pizza Garden', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /pizza\s+hut/i, merchant: 'Pizza Hut', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /pizzeria/i, merchant: 'Pizzeria', accountCode: '420', confidence: 90, priority: 75, category: 'merchant' },
  { pattern: /ristorante/i, merchant: 'Restaurant', accountCode: '420', confidence: 90, priority: 75, category: 'merchant' },
  { pattern: /restaurant/i, merchant: 'Restaurant', accountCode: '420', confidence: 85, priority: 70, category: 'merchant' },
  { pattern: /lounge/i, merchant: 'Lounge', accountCode: '420', confidence: 85, priority: 70, category: 'merchant' },
  { pattern: /tap\s+&?\s*barrel/i, merchant: 'Tap & Barrel', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /thaigo/i, merchant: 'Thai Restaurant', accountCode: '420', confidence: 90, priority: 75, category: 'merchant' },
  { pattern: /chickpea/i, merchant: 'Chickpea Restaurant', accountCode: '420', confidence: 90, priority: 75, category: 'merchant' },
  { pattern: /\bdq\b/i, merchant: 'Dairy Queen', accountCode: '420', confidence: 85, priority: 70, category: 'merchant' },
  { pattern: /pizza\s*pizza/i, merchant: 'Pizza Pizza', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /pizza\s*hut/i, merchant: 'Pizza Hut', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /pizzahut/i, merchant: 'Pizza Hut', accountCode: '420', confidence: 90, priority: 75, category: 'merchant' },
  { pattern: /domino'?s/i, merchant: 'Dominos', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /dominos/i, merchant: 'Dominos', accountCode: '420', confidence: 90, priority: 75, category: 'merchant' },
  { pattern: /little\s*caesars/i, merchant: 'Little Caesars', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /littlecaesars/i, merchant: 'Little Caesars', accountCode: '420', confidence: 90, priority: 75, category: 'merchant' },
  { pattern: /a&w/i, merchant: 'A&W', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /a[\s&]*w/i, merchant: 'A&W', accountCode: '420', confidence: 90, priority: 75, category: 'merchant' },
  { pattern: /swiss\s*chalet/i, merchant: 'Swiss Chalet', accountCode: '420', confidence: 96, priority: 80, category: 'merchant' },
  { pattern: /swisschalet/i, merchant: 'Swiss Chalet', accountCode: '420', confidence: 90, priority: 75, category: 'merchant' },
  { pattern: /boston\s*pizza/i, merchant: 'Boston Pizza', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /bostonpizza/i, merchant: 'Boston Pizza', accountCode: '420', confidence: 90, priority: 75, category: 'merchant' },
  
  // Additional Fast Food from DataTest
  { pattern: /snappy\s*tomato\s*pizza/i, merchant: 'Snappy Tomato Pizza', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /the\s*waffle\s*bus\s*stop/i, merchant: 'The Waffle Bus Stop', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /freshii/i, merchant: 'Freshii', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /miller\s*s\s*ale\s*house/i, merchant: 'Miller\'s Ale House', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /7[\-\s]*eleven/i, merchant: '7-Eleven', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /doubletree.*f&b/i, merchant: 'DoubleTree Restaurant', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /hudson\s*sto/i, merchant: 'Hudson', accountCode: '420', confidence: 90, priority: 75, category: 'merchant' },
  
  // Additional Restaurants from Training Data
  { pattern: /big\s*smoke\s*burger/i, merchant: 'Big Smoke Burger', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /west\s*block\s*cafeteria/i, merchant: 'West Block Cafeteria', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /pizza\s*delight/i, merchant: 'Pizza Delight', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /wheel\s*pizza/i, merchant: 'Wheel Pizza', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /justamere\s*cafe/i, merchant: 'Justamere Cafe', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /ac\s*rouge\s*on\s*board\s*cafe/i, merchant: 'AC Rouge On Board Cafe', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  
  // Food Distributors -> Supplies (455)
  { pattern: /top\s*food\s*distributors/i, merchant: 'Top Food Distributors', accountCode: '455', confidence: 95, priority: 80, category: 'merchant' },
  
  // Grocery Stores -> Supplies (455)
  { pattern: /atlantic\s*superstore/i, merchant: 'Atlantic Superstore', accountCode: '455', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /superstore/i, merchant: 'Superstore', accountCode: '455', confidence: 90, priority: 75, category: 'merchant' },
  { pattern: /dollarama/i, merchant: 'Dollarama', accountCode: '455', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /walmart/i, merchant: 'Walmart', accountCode: '455', confidence: 95, priority: 80, category: 'merchant' },
  
  // Food Delivery Services (Account Code: 420)
  { pattern: /uber\s*eats/i, merchant: 'Uber Eats', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /paypal\s*\*\s*uber\s*eats/i, merchant: 'Uber Eats', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /chefsplate/i, merchant: 'ChefsPlate', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /skip\s*the\s*dishes/i, merchant: 'Skip The Dishes', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /doordash/i, merchant: 'DoorDash', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /foodora/i, merchant: 'Foodora', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  
  // Meal Kits & Subscription Food (Account Code: 420)
  { pattern: /hello\s*fresh/i, merchant: 'HelloFresh', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /good\s*food/i, merchant: 'Good Food', accountCode: '420', confidence: 90, priority: 75, category: 'merchant' },
  { pattern: /fresh\s*prep/i, merchant: 'Fresh Prep', accountCode: '420', confidence: 90, priority: 75, category: 'merchant' },
  
  // Generic Food Categories (Account Code: 420)
  { pattern: /\brestaurant\b/i, merchant: 'Restaurant', accountCode: '420', confidence: 75, priority: 60, category: 'merchant' },
  { pattern: /\bcafe\b/i, merchant: 'Cafe', accountCode: '420', confidence: 75, priority: 60, category: 'merchant' },
  { pattern: /\bcoffee\s*shop\b/i, merchant: 'Coffee Shop', accountCode: '420', confidence: 75, priority: 60, category: 'merchant' },
  { pattern: /\bfast\s*food\b/i, merchant: 'Fast Food', accountCode: '420', confidence: 75, priority: 60, category: 'merchant' },
  { pattern: /\bpizza\b/i, merchant: 'Pizza', accountCode: '420', confidence: 70, priority: 55, category: 'merchant' },
  { pattern: /\bbakery\b/i, merchant: 'Bakery', accountCode: '420', confidence: 75, priority: 60, category: 'merchant' },
  { pattern: /\bdeli\b/i, merchant: 'Deli', accountCode: '420', confidence: 75, priority: 60, category: 'merchant' },
  { pattern: /\bfood\s*court\b/i, merchant: 'Food Court', accountCode: '420', confidence: 75, priority: 60, category: 'merchant' },
  { pattern: /\bbar\s*&\s*grill\b/i, merchant: 'Bar & Grill', accountCode: '420', confidence: 75, priority: 60, category: 'merchant' },
  { pattern: /\bpub\b/i, merchant: 'Pub', accountCode: '420', confidence: 75, priority: 60, category: 'merchant' },
  
  // Gas Stations & Automotive (Account Code: 449 - Motor Vehicle Expenses)
  { pattern: /shell(?:\s|$)/i, merchant: 'Shell', accountCode: '449', confidence: 96, priority: 80, category: 'merchant' },
  { pattern: /petro[\s-]?canada/i, merchant: 'Petro-Canada', accountCode: '449', confidence: 96, priority: 80, category: 'merchant' },
  { pattern: /petrocan/i, merchant: 'Petro-Canada', accountCode: '449', confidence: 90, priority: 75, category: 'merchant' },
  { pattern: /esso/i, merchant: 'Esso', accountCode: '449', confidence: 96, priority: 80, category: 'merchant' },
  { pattern: /husky/i, merchant: 'Husky', accountCode: '449', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /chevron/i, merchant: 'Chevron', accountCode: '449', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /jiffy\s*lube/i, merchant: 'Jiffy Lube', accountCode: '473', confidence: 94, priority: 80, category: 'merchant' },
  { pattern: /jiffylube/i, merchant: 'Jiffy Lube', accountCode: '473', confidence: 90, priority: 75, category: 'merchant' },
  { pattern: /canadian\s*tire/i, merchant: 'Canadian Tire', accountCode: '310', confidence: 85, priority: 75, category: 'merchant' },
  { pattern: /canadiantire/i, merchant: 'Canadian Tire', accountCode: '310', confidence: 80, priority: 70, category: 'merchant' },
  
  // Generic Gas Station Categories (Account Code: 449 - Motor Vehicle Expenses)
  { pattern: /\bgas\s*station\b/i, merchant: 'Gas Station', accountCode: '449', confidence: 80, priority: 65, category: 'merchant' },
  { pattern: /\bservice\s*station\b/i, merchant: 'Service Station', accountCode: '449', confidence: 80, priority: 65, category: 'merchant' },
  { pattern: /\bpetrol\b/i, merchant: 'Gas Station', accountCode: '449', confidence: 75, priority: 60, category: 'merchant' },
  { pattern: /\bfuel\b/i, merchant: 'Fuel', accountCode: '449', confidence: 75, priority: 60, category: 'merchant' },
  { pattern: /\bgasoline\b/i, merchant: 'Gas Station', accountCode: '449', confidence: 80, priority: 65, category: 'merchant' },
  { pattern: /\bauto\s*parts\b/i, merchant: 'Auto Parts', accountCode: '473', confidence: 85, priority: 70, category: 'merchant' },
  { pattern: /\bcar\s*wash\b/i, merchant: 'Car Wash', accountCode: '449', confidence: 85, priority: 70, category: 'merchant' },
  { pattern: /\boil\s*change\b/i, merchant: 'Oil Change', accountCode: '473', confidence: 85, priority: 70, category: 'merchant' },
  
  // Grocery & Retail (Account Code: 420 - Entertainment for food, 453 - Office Expenses for others)
  { pattern: /walmart/i, merchant: 'Walmart', accountCode: '420', confidence: 85, priority: 75, category: 'merchant' },
  { pattern: /loblaws/i, merchant: 'Loblaws', accountCode: '420', confidence: 88, priority: 75, category: 'merchant' },
  { pattern: /metro/i, merchant: 'Metro', accountCode: '420', confidence: 85, priority: 75, category: 'merchant' },
  { pattern: /sobeys/i, merchant: 'Sobeys', accountCode: '420', confidence: 88, priority: 75, category: 'merchant' },
  { pattern: /safeway/i, merchant: 'Safeway', accountCode: '420', confidence: 88, priority: 75, category: 'merchant' },
  { pattern: /no\s*frills/i, merchant: 'No Frills', accountCode: '420', confidence: 90, priority: 75, category: 'merchant' },
  { pattern: /nofrills/i, merchant: 'No Frills', accountCode: '420', confidence: 88, priority: 70, category: 'merchant' },
  { pattern: /independent/i, merchant: 'Independent', accountCode: '420', confidence: 85, priority: 70, category: 'merchant' },
  { pattern: /food\s*basics/i, merchant: 'Food Basics', accountCode: '420', confidence: 90, priority: 75, category: 'merchant' },
  { pattern: /foodbasics/i, merchant: 'Food Basics', accountCode: '420', confidence: 88, priority: 70, category: 'merchant' },
  { pattern: /superstore/i, merchant: 'Superstore', accountCode: '420', confidence: 85, priority: 75, category: 'merchant' },
  { pattern: /costco/i, merchant: 'Costco', accountCode: '420', confidence: 85, priority: 75, category: 'merchant' },
  { pattern: /\bsave\s*on\s*foods\b/i, merchant: 'Save-On-Foods', accountCode: '420', confidence: 90, priority: 75, category: 'merchant' },
  { pattern: /saveonfoods/i, merchant: 'Save-On-Foods', accountCode: '420', confidence: 88, priority: 70, category: 'merchant' },
  { pattern: /\bfarmboy\b/i, merchant: 'Farm Boy', accountCode: '420', confidence: 88, priority: 75, category: 'merchant' },
  { pattern: /\bgrocery\b/i, merchant: 'Grocery Store', accountCode: '420', confidence: 75, priority: 60, category: 'merchant' },
  { pattern: /\bsupermarket\b/i, merchant: 'Supermarket', accountCode: '420', confidence: 75, priority: 60, category: 'merchant' },
  
  // Pharmacy & Health (Account Code: 453 - Office Expenses for business supplies)
  { pattern: /shoppers\s*drug\s*mart/i, merchant: 'Shoppers Drug Mart', accountCode: '453', confidence: 85, priority: 75, category: 'merchant' },
  { pattern: /shoppersdrugmart/i, merchant: 'Shoppers Drug Mart', accountCode: '453', confidence: 80, priority: 70, category: 'merchant' },
  { pattern: /rexall/i, merchant: 'Rexall', accountCode: '453', confidence: 85, priority: 75, category: 'merchant' },
  { pattern: /\bpharmacy\b/i, merchant: 'Pharmacy', accountCode: '453', confidence: 80, priority: 65, category: 'merchant' },
  { pattern: /\bpharmaprix\b/i, merchant: 'Pharmaprix', accountCode: '453', confidence: 85, priority: 75, category: 'merchant' },
  
  // Hardware & Home Improvement (Account Code: 310 - Cost of Goods Sold)
  { pattern: /home\s*depot/i, merchant: 'Home Depot', accountCode: '310', confidence: 85, priority: 75, category: 'merchant' },
  { pattern: /homedepot/i, merchant: 'Home Depot', accountCode: '310', confidence: 80, priority: 70, category: 'merchant' },
  { pattern: /lowes/i, merchant: 'Lowes', accountCode: '310', confidence: 85, priority: 75, category: 'merchant' },
  { pattern: /rona/i, merchant: 'Rona', accountCode: '310', confidence: 85, priority: 75, category: 'merchant' },
  { pattern: /\bhardware\b/i, merchant: 'Hardware Store', accountCode: '310', confidence: 80, priority: 65, category: 'merchant' },
  { pattern: /\bhome\s*improvement\b/i, merchant: 'Home Improvement', accountCode: '310', confidence: 80, priority: 65, category: 'merchant' },
  
  // Office Supplies (Account Code: 453 - Office Expenses)
  { pattern: /staples/i, merchant: 'Staples', accountCode: '453', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /office\s*depot/i, merchant: 'Office Depot', accountCode: '453', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /officedepot/i, merchant: 'Office Depot', accountCode: '453', confidence: 90, priority: 75, category: 'merchant' },
  { pattern: /\boffice\s*supplies\b/i, merchant: 'Office Supplies', accountCode: '453', confidence: 90, priority: 75, category: 'merchant' },
  
  // Tech Services & Subscriptions (Account Code: 485 - Subscriptions)
  { pattern: /apple\.com\/bill/i, merchant: 'Apple Services', accountCode: '485', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /applecombill/i, merchant: 'Apple Services', accountCode: '485', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /apple\s*store/i, merchant: 'Apple Store', accountCode: '485', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /adobe.*creative\s*cloud/i, merchant: 'Adobe Creative Cloud', accountCode: '485', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /adobe.*stock/i, merchant: 'Adobe Stock', accountCode: '485', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /adobe.*acropro/i, merchant: 'Adobe Acrobat', accountCode: '485', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /adobe.*subs/i, merchant: 'Adobe Subscription', accountCode: '485', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /adobe/i, merchant: 'Adobe', accountCode: '485', confidence: 90, priority: 80, category: 'merchant' },
  { pattern: /facebk/i, merchant: 'Facebook Ads', accountCode: '400', confidence: 95, priority: 85, category: 'merchant' },
  { pattern: /pp\*facebook/i, merchant: 'Facebook Ads', accountCode: '400', confidence: 95, priority: 85, category: 'merchant' },
  { pattern: /google.*ads/i, merchant: 'Google Ads', accountCode: '400', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /microsoft.*365/i, merchant: 'Microsoft 365', accountCode: '485', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /microsoft.*office/i, merchant: 'Microsoft Office', accountCode: '485', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /dropbox/i, merchant: 'Dropbox', accountCode: '485', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /dropboxinccadcards/i, merchant: 'Dropbox', accountCode: '485', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /spotify/i, merchant: 'Spotify', accountCode: '485', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /netflix/i, merchant: 'Netflix', accountCode: '485', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /canva/i, merchant: 'Canva', accountCode: '485', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /wix\.com/i, merchant: 'Wix', accountCode: '485', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /mailchimp/i, merchant: 'MailChimp', accountCode: '485', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /hostgator/i, merchant: 'HostGator', accountCode: '485', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /godaddy/i, merchant: 'GoDaddy', accountCode: '485', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /unbounce/i, merchant: 'Unbounce', accountCode: '485', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /squarespace/i, merchant: 'Squarespace', accountCode: '485', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /amazon\s*downloads/i, merchant: 'Amazon Digital Services', accountCode: '485', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /google.*gsuite/i, merchant: 'Google Workspace', accountCode: '485', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /tresta/i, merchant: 'Tresta', accountCode: '485', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /envato/i, merchant: 'Envato', accountCode: '485', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /hayu\s*reality\s*tv/i, merchant: 'Hayu', accountCode: '485', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /noom/i, merchant: 'Noom', accountCode: '485', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /email\s*vault/i, merchant: 'Email Vault', accountCode: '485', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /crave/i, merchant: 'Crave', accountCode: '485', confidence: 95, priority: 80, category: 'merchant' },
  
  // Additional Subscriptions from DataTest
  { pattern: /disney\s*plus/i, merchant: 'Disney Plus', accountCode: '485', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /hulu/i, merchant: 'Hulu', accountCode: '485', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /prime\s*video/i, merchant: 'Prime Video', accountCode: '485', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /youtube\s*premium/i, merchant: 'YouTube Premium', accountCode: '485', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /apple\s*music/i, merchant: 'Apple Music', accountCode: '485', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /zoom/i, merchant: 'Zoom', accountCode: '485', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /slack/i, merchant: 'Slack', accountCode: '485', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /quickbooks/i, merchant: 'QuickBooks', accountCode: '485', confidence: 95, priority: 80, category: 'merchant' },
  
  // Retail Stores from DataTest (Account Code: 453)
  { pattern: /winners/i, merchant: 'Winners', accountCode: '453', confidence: 96, priority: 80, category: 'merchant' },
  { pattern: /best\s*buy/i, merchant: 'Best Buy', accountCode: '453', confidence: 96, priority: 80, category: 'merchant' },
  { pattern: /ikea/i, merchant: 'IKEA', accountCode: '453', confidence: 96, priority: 80, category: 'merchant' },
  { pattern: /lululemon/i, merchant: 'Lululemon', accountCode: '453', confidence: 96, priority: 80, category: 'merchant' },
  { pattern: /walgreens/i, merchant: 'Walgreens', accountCode: '453', confidence: 96, priority: 80, category: 'merchant' },
  { pattern: /shein/i, merchant: 'Shein', accountCode: '453', confidence: 96, priority: 80, category: 'merchant' },
  { pattern: /vistaprint/i, merchant: 'Vistaprint', accountCode: '453', confidence: 96, priority: 80, category: 'merchant' },
  { pattern: /paypal.*alipaycanaad/i, merchant: 'AliPay Canada', accountCode: '453', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /eddie\s*bauer/i, merchant: 'Eddie Bauer', accountCode: '453', confidence: 96, priority: 80, category: 'merchant' },
  { pattern: /clearly\s*contacts/i, merchant: 'Clearly Contacts', accountCode: '453', confidence: 96, priority: 80, category: 'merchant' },
  { pattern: /janie\s*and\s*jack/i, merchant: 'Janie and Jack', accountCode: '453', confidence: 96, priority: 80, category: 'merchant' },
  { pattern: /orlando.*prem.*outl/i, merchant: 'Premium Outlets', accountCode: '453', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /dollar\s*tree/i, merchant: 'Dollar Tree', accountCode: '453', confidence: 96, priority: 80, category: 'merchant' },
  { pattern: /pet\s*valu/i, merchant: 'Pet Valu', accountCode: '453', confidence: 96, priority: 80, category: 'merchant' },
  { pattern: /brooks\s*brothers/i, merchant: 'Brooks Brothers', accountCode: '453', confidence: 96, priority: 80, category: 'merchant' },
  { pattern: /crows\s*sports/i, merchant: 'Crows Sports', accountCode: '453', confidence: 96, priority: 80, category: 'merchant' },
  { pattern: /strobepro/i, merchant: 'StrobePro', accountCode: '453', confidence: 96, priority: 80, category: 'merchant' },
  
  // Gas Station Additional Patterns (Account Code: 455)
  { pattern: /blue\s*acres\s*esso/i, merchant: 'Blue Acres Esso', accountCode: '455', confidence: 96, priority: 80, category: 'merchant' },
  { pattern: /cdn\s*tire\s*gasbar/i, merchant: 'Canadian Tire Gas Bar', accountCode: '455', confidence: 96, priority: 80, category: 'merchant' },
  { pattern: /shell\s*ep/i, merchant: 'Shell', accountCode: '455', confidence: 96, priority: 80, category: 'merchant' },
  { pattern: /shell\s*\d+/i, merchant: 'Shell', accountCode: '455', confidence: 96, priority: 80, category: 'merchant' },
  
  // Professional Services from DataTest (Account Code: 441)
  { pattern: /tricor\s*lease/i, merchant: 'Tricor Lease', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /astley[\-\s]*gilbert/i, merchant: 'Astley-Gilbert Ltd', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /intuit\s*canada/i, merchant: 'Intuit Canada', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /bell\s*mobility/i, merchant: 'Bell Mobility', accountCode: '489', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /bell\s*canada.*ob/i, merchant: 'Bell Canada', accountCode: '489', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /cosmetology\s*association/i, merchant: 'Cosmetology Association', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /maritime\s*beauty/i, merchant: 'Maritime Beauty', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /switch\s*health/i, merchant: 'Switch Health', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /westin.*hotels/i, merchant: 'Westin Hotels', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /hilton\s*hotels/i, merchant: 'Hilton Hotels', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /doubletree\s*orlando/i, merchant: 'DoubleTree Orlando', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /sutton\s*place\s*hotel/i, merchant: 'Sutton Place Hotel', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /quality\s*inn/i, merchant: 'Quality Inn', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /avanti\s*palms\s*resort/i, merchant: 'Avanti Palms Resort', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /racing\s*electronics/i, merchant: 'Racing Electronics', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /phorest/i, merchant: 'Phorest', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /eventbrite/i, merchant: 'Eventbrite', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /armin\s*beauty\s*affair/i, merchant: 'Armin\'s Beauty Affair', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /uline/i, merchant: 'Uline', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /timely\s*limited/i, merchant: 'Timely Limited', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /viatortripadvisor/i, merchant: 'Viator TripAdvisor', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /gray\s*line/i, merchant: 'Gray Line Tours', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /air\s*can\*/i, merchant: 'Air Canada', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /ac\s*rouge/i, merchant: 'Air Canada Rouge', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /air\s*canada/i, merchant: 'Air Canada', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  
  // Fitness & Health (Account Code: 441)
  { pattern: /planet\s*fitness/i, merchant: 'Planet Fitness', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /qeii\s*parking/i, merchant: 'QEII Parking', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /impark/i, merchant: 'Impark', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  
  // Government & Tax Services (Account Code: 441)
  { pattern: /government\s*tax\s*payments/i, merchant: 'Government Tax Payments', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /business\s*pad.*emptx/i, merchant: 'Business Tax Payment', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /business\s*pad.*gst/i, merchant: 'GST Payment', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /business\s*pad.*txins/i, merchant: 'Tax Installment', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /federal\s*payment\s*canada/i, merchant: 'Federal Payment Canada', accountCode: '200', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /legislativeasse/i, merchant: 'Legislative Assembly', accountCode: '200', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /accounts\s*payable.*intuit/i, merchant: 'Intuit Accounts Payable', accountCode: '200', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /cfc\/fcc/i, merchant: 'CFC/FCC', accountCode: '200', confidence: 96, priority: 85, category: 'merchant' },
  
  // Ride Share & Transportation (Account Code: 441)
  { pattern: /uber.*trip/i, merchant: 'Uber', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /uber.*eats/i, merchant: 'Uber Eats', accountCode: '420', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /paypal.*uber/i, merchant: 'Uber', accountCode: '441', confidence: 95, priority: 80, category: 'merchant' },
  
  // Business Services & Other (Account Code: 441)
  { pattern: /browkingdom/i, merchant: 'Brow Kingdom', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /britnell\s*ventures/i, merchant: 'Britnell Ventures', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /canada\s*gloves/i, merchant: 'Canada Gloves', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /bully\s*bunches/i, merchant: 'Bully Bunches', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /neepsee\s*herbs/i, merchant: 'Neepsee Herbs', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /anasa\s*jewelry/i, merchant: 'Anasa Jewelry', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /hyve\s*beauty/i, merchant: 'Hyve Beauty', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /tat\s*tattoo/i, merchant: 'TAT Tattoo Supply', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /three\s*ships/i, merchant: 'Three Ships', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /hoitattoo/i, merchant: 'HOI Tattoo', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /successful\s*salons/i, merchant: 'Successful Salons', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /the\s*socit\s*bossbabe/i, merchant: 'The Society BossBabe', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /durham\s*pcpo/i, merchant: 'Durham PCPO', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /paypal.*mantalks/i, merchant: 'ManTalks', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /paypal.*wondershare/i, merchant: 'Wondershare', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /paypal.*wyoming/i, merchant: 'Wyoming Home', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /paypal.*huion/i, merchant: 'Huion', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /paypal.*paperlike/i, merchant: 'Paperlike', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /paypal.*augustderin/i, merchant: 'August Derin', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /paypal.*appliedlacq/i, merchant: 'Applied Lacquer', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /paypal.*weatherbyst/i, merchant: 'WeatherByst', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /paypal.*pro\s*edu/i, merchant: 'Pro EDU', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /paypal.*amandadiaz/i, merchant: 'Amanda Diaz', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /levyatdis/i, merchant: 'Levy Restaurant', accountCode: '420', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /sq.*levy/i, merchant: 'Levy Restaurant', accountCode: '420', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /zsk.*andrettis/i, merchant: 'Andretti\'s', accountCode: '420', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /avantipalmsresortrest/i, merchant: 'Avanti Palms Resort Restaurant', accountCode: '420', confidence: 96, priority: 85, category: 'merchant' },
  
  // Insurance & Financial Services (Account Code: 441)
  { pattern: /aviva\s*insurance/i, merchant: 'Aviva Insurance', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /triangle\s*mastercard/i, merchant: 'Triangle Mastercard', accountCode: '800', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /american\s*express\s*cards/i, merchant: 'American Express', accountCode: '800', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /capital\s*one\s*mastercard/i, merchant: 'Capital One Mastercard', accountCode: '800', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /central\s*mortgage/i, merchant: 'Central Mortgage', accountCode: '800', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /investment\s*purchase/i, merchant: 'Investment Purchase', accountCode: '877', confidence: 96, priority: 85, category: 'merchant' },
  
  // Point of Sale and General Transaction Types
  { pattern: /point\s*of\s*sale\s*purchase/i, merchant: 'Point of Sale Purchase', accountCode: '453', confidence: 70, priority: 50, category: 'merchant' },
  { pattern: /fpos/i, merchant: 'Point of Sale', accountCode: '453', confidence: 65, priority: 45, category: 'merchant' },
  { pattern: /abm\s*deposit/i, merchant: 'ABM Deposit', accountCode: '200', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /balance\s*forward/i, merchant: 'Balance Forward', accountCode: '877', confidence: 80, priority: 70, category: 'merchant' },
  { pattern: /rewards\s*redemption/i, merchant: 'Rewards Redemption', accountCode: '270', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /td\s*points\s*redemption/i, merchant: 'TD Points Redemption', accountCode: '270', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /credit\s*voucher/i, merchant: 'Credit Voucher', accountCode: '270', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /error\s*correction/i, merchant: 'Error Correction', accountCode: '877', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /overdraft\s*handling/i, merchant: 'Overdraft Handling', accountCode: '404', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /cross\s*origin\s*request/i, merchant: 'System Transaction', accountCode: '877', confidence: 96, priority: 85, category: 'merchant' },
  
  // Auto-related services (Account Code: 441)
  { pattern: /auto\s*lease/i, merchant: 'Auto Lease', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /rent\/leases/i, merchant: 'Rent/Leases', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /fees\/dues/i, merchant: 'Fees/Dues', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /expense\s*payment/i, merchant: 'Expense Payment', accountCode: '441', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /accounts\s*payable\s*deposit/i, merchant: 'Accounts Payable Deposit', accountCode: '200', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /accounts\s*payable\s*tran\s*fee/i, merchant: 'Accounts Payable Transaction Fee', accountCode: '404', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /bill\s*payment\s*txnfee/i, merchant: 'Bill Payment Transaction Fee', accountCode: '404', confidence: 96, priority: 85, category: 'merchant' },
  { pattern: /foreign\s*currency/i, merchant: 'Foreign Currency Transaction', accountCode: '404', confidence: 80, priority: 70, category: 'merchant' },
  
  // =============================================================================
  // END OF DATATEST ENHANCEMENT PATTERNS
  // =============================================================================
  
  // Telecommunications (Account Code: 489)
  { pattern: /rogers/i, merchant: 'Rogers', accountCode: '489', confidence: 96, priority: 75, category: 'merchant' },
  { pattern: /bell\s*canada/i, merchant: 'Bell Canada', accountCode: '489', confidence: 96, priority: 75, category: 'merchant' },
  { pattern: /telus/i, merchant: 'Telus', accountCode: '489', confidence: 96, priority: 75, category: 'merchant' },
  { pattern: /shaw/i, merchant: 'Shaw', accountCode: '489', confidence: 96, priority: 75, category: 'merchant' },
  { pattern: /fido/i, merchant: 'Fido', accountCode: '489', confidence: 96, priority: 75, category: 'merchant' },
  { pattern: /koodo/i, merchant: 'Koodo', accountCode: '489', confidence: 96, priority: 75, category: 'merchant' },
  
  // Utilities (Account Code: 442)
  { pattern: /hydro\s*one/i, merchant: 'Hydro One', accountCode: '442', confidence: 96, priority: 75, category: 'merchant' },
  { pattern: /bc\s*hydro/i, merchant: 'BC Hydro', accountCode: '442', confidence: 96, priority: 75, category: 'merchant' },
  { pattern: /enbridge/i, merchant: 'Enbridge', accountCode: '442', confidence: 96, priority: 75, category: 'merchant' },
  { pattern: /union\s*gas/i, merchant: 'Union Gas', accountCode: '442', confidence: 96, priority: 75, category: 'merchant' },
  { pattern: /atco\s*gas/i, merchant: 'ATCO Gas', accountCode: '442', confidence: 96, priority: 75, category: 'merchant' },
  { pattern: /epcor/i, merchant: 'EPCOR', accountCode: '442', confidence: 96, priority: 75, category: 'merchant' },
  
  // Office Supplies (Account Code: 455)
  { pattern: /staples/i, merchant: 'Staples', accountCode: '455', confidence: 92, priority: 75, category: 'merchant' },
  { pattern: /office\s*depot/i, merchant: 'Office Depot', accountCode: '455', confidence: 92, priority: 75, category: 'merchant' },
  { pattern: /home\s*depot/i, merchant: 'Home Depot', accountCode: '455', confidence: 95, priority: 75, category: 'merchant' },
  { pattern: /rona/i, merchant: 'Rona', accountCode: '455', confidence: 95, priority: 75, category: 'merchant' },
  { pattern: /lowe'?s/i, merchant: 'Lowes', accountCode: '455', confidence: 95, priority: 75, category: 'merchant' },
  { pattern: /ikea/i, merchant: 'IKEA', accountCode: '455', confidence: 96, priority: 75, category: 'merchant' },
  
  // Software & Technology (Account Code: 485 - Subscriptions)
  { pattern: /microsoft/i, merchant: 'Microsoft', accountCode: '485', confidence: 95, priority: 75, category: 'merchant' },
  { pattern: /google/i, merchant: 'Google', accountCode: '485', confidence: 95, priority: 75, category: 'merchant' },
  { pattern: /adobe/i, merchant: 'Adobe', accountCode: '485', confidence: 95, priority: 75, category: 'merchant' },
  { pattern: /quickbooks/i, merchant: 'QuickBooks', accountCode: '485', confidence: 95, priority: 75, category: 'merchant' },
  { pattern: /zoom/i, merchant: 'Zoom', accountCode: '485', confidence: 95, priority: 75, category: 'merchant' },
  { pattern: /slack/i, merchant: 'Slack', accountCode: '485', confidence: 95, priority: 75, category: 'merchant' },
  
  // Travel & Transportation (FIXED: Account Code: 453 - Office Expenses)
  { pattern: /air\s*canada/i, merchant: 'Air Canada', accountCode: '453', confidence: 96, priority: 75, category: 'merchant' },
  { pattern: /westjet/i, merchant: 'WestJet', accountCode: '453', confidence: 96, priority: 75, category: 'merchant' },
  { pattern: /uber/i, merchant: 'Uber', accountCode: '453', confidence: 95, priority: 75, category: 'merchant' },
  { pattern: /expedia/i, merchant: 'Expedia', accountCode: '453', confidence: 95, priority: 75, category: 'merchant' },
  { pattern: /booking\.com/i, merchant: 'Booking.com', accountCode: '453', confidence: 95, priority: 75, category: 'merchant' },
  
  // Insurance (FIXED: Account Code: 453 - Office Expenses)
  { pattern: /wawanesa/i, merchant: 'Wawanesa Insurance', accountCode: '453', confidence: 96, priority: 75, category: 'merchant' },
  { pattern: /intact/i, merchant: 'Intact Insurance', accountCode: '453', confidence: 96, priority: 75, category: 'merchant' },
  { pattern: /cooperators/i, merchant: 'Cooperators', accountCode: '453', confidence: 96, priority: 75, category: 'merchant' },
  { pattern: /manulife/i, merchant: 'Manulife', accountCode: '453', confidence: 96, priority: 75, category: 'merchant' },
  
  // Professional Services (Account Code: 441)
  { pattern: /lawyer/i, merchant: 'Legal Services', accountCode: '441', confidence: 95, priority: 70, category: 'merchant' },
  { pattern: /accountant/i, merchant: 'Accounting Services', accountCode: '441', confidence: 95, priority: 70, category: 'merchant' },
  { pattern: /consultant/i, merchant: 'Consulting Services', accountCode: '441', confidence: 90, priority: 65, category: 'merchant' },
  
  // Generic Professional Services (Account Code: 441)
  { pattern: /\blegal\s*services\b/i, merchant: 'Legal Services', accountCode: '441', confidence: 90, priority: 65, category: 'merchant' },
  { pattern: /\blaw\s*firm\b/i, merchant: 'Law Firm', accountCode: '441', confidence: 90, priority: 65, category: 'merchant' },
  { pattern: /\baccounting\s*services\b/i, merchant: 'Accounting Services', accountCode: '441', confidence: 90, priority: 65, category: 'merchant' },
  { pattern: /\bconsulting\s*services\b/i, merchant: 'Consulting Services', accountCode: '441', confidence: 85, priority: 60, category: 'merchant' },
  { pattern: /\bfinancial\s*advisor\b/i, merchant: 'Financial Advisor', accountCode: '441', confidence: 90, priority: 65, category: 'merchant' },
  { pattern: /\bnotary\s*public\b/i, merchant: 'Notary Public', accountCode: '441', confidence: 90, priority: 65, category: 'merchant' },
  { pattern: /\breal\s*estate\s*agent\b/i, merchant: 'Real Estate Agent', accountCode: '441', confidence: 90, priority: 65, category: 'merchant' },
  { pattern: /\barchitect\b/i, merchant: 'Architect', accountCode: '441', confidence: 85, priority: 60, category: 'merchant' },
  { pattern: /\bengineer\b/i, merchant: 'Engineer', accountCode: '441', confidence: 85, priority: 60, category: 'merchant' },
  { pattern: /\bdesigner\b/i, merchant: 'Designer', accountCode: '441', confidence: 80, priority: 55, category: 'merchant' },
  
  // Medical Services (Account Code: 453 - Office Expenses)
  { pattern: /\bdoctor\b/i, merchant: 'Doctor', accountCode: '453', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\bphysician\b/i, merchant: 'Physician', accountCode: '453', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\bdentist\b/i, merchant: 'Dentist', accountCode: '453', confidence: 90, priority: 70, category: 'merchant' },
  { pattern: /\bdental\s*clinic\b/i, merchant: 'Dental Clinic', accountCode: '453', confidence: 90, priority: 70, category: 'merchant' },
  { pattern: /\bveterinarian\b/i, merchant: 'Veterinarian', accountCode: '453', confidence: 90, priority: 70, category: 'merchant' },
  { pattern: /\bvet\s*clinic\b/i, merchant: 'Vet Clinic', accountCode: '453', confidence: 90, priority: 70, category: 'merchant' },
  { pattern: /\boptometrist\b/i, merchant: 'Optometrist', accountCode: '453', confidence: 90, priority: 70, category: 'merchant' },
  { pattern: /\bchiropractor\b/i, merchant: 'Chiropractor', accountCode: '453', confidence: 90, priority: 70, category: 'merchant' },
  { pattern: /\bphysiotherapy\b/i, merchant: 'Physiotherapy', accountCode: '453', confidence: 90, priority: 70, category: 'merchant' },
  { pattern: /\bmassage\s*therapy\b/i, merchant: 'Massage Therapy', accountCode: '453', confidence: 90, priority: 70, category: 'merchant' },
  { pattern: /\bmedical\s*clinic\b/i, merchant: 'Medical Clinic', accountCode: '453', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\bhospital\b/i, merchant: 'Hospital', accountCode: '453', confidence: 85, priority: 65, category: 'merchant' },
  
  // Personal Services (Account Code: 453)
  { pattern: /\bhair\s*salon\b/i, merchant: 'Hair Salon', accountCode: '453', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\bbarber\s*shop\b/i, merchant: 'Barber Shop', accountCode: '453', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\bnail\s*salon\b/i, merchant: 'Nail Salon', accountCode: '453', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\bspa\b/i, merchant: 'Spa', accountCode: '453', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\bbeauty\s*salon\b/i, merchant: 'Beauty Salon', accountCode: '453', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\bdry\s*clean\b/i, merchant: 'Dry Cleaning', accountCode: '453', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\blaundromat\b/i, merchant: 'Laundromat', accountCode: '453', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\balteration\b/i, merchant: 'Alterations', accountCode: '453', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\btailor\b/i, merchant: 'Tailor', accountCode: '453', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\bkey\s*cutting\b/i, merchant: 'Key Cutting', accountCode: '453', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\bshoe\s*repair\b/i, merchant: 'Shoe Repair', accountCode: '453', confidence: 85, priority: 65, category: 'merchant' },
  
  // Transportation & Travel (Account Code: 453)
  { pattern: /\btaxi\b/i, merchant: 'Taxi', accountCode: '453', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\bparking\b/i, merchant: 'Parking', accountCode: '453', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\bhotel\b/i, merchant: 'Hotel', accountCode: '453', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\bmotel\b/i, merchant: 'Motel', accountCode: '453', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\bairline\b/i, merchant: 'Airline', accountCode: '453', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\btravel\s*agency\b/i, merchant: 'Travel Agency', accountCode: '453', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\bcar\s*rental\b/i, merchant: 'Car Rental', accountCode: '453', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\btrain\b/i, merchant: 'Train', accountCode: '453', confidence: 80, priority: 60, category: 'merchant' },
  { pattern: /\bbus\b/i, merchant: 'Bus', accountCode: '453', confidence: 75, priority: 55, category: 'merchant' },
  
  // Entertainment & Recreation (Account Code: 420)
  { pattern: /\bmovie\s*theater\b/i, merchant: 'Movie Theater', accountCode: '420', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\bcinema\b/i, merchant: 'Cinema', accountCode: '420', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\bgym\b/i, merchant: 'Gym', accountCode: '420', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\bfitness\s*center\b/i, merchant: 'Fitness Center', accountCode: '420', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\bgolf\s*course\b/i, merchant: 'Golf Course', accountCode: '420', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\bbowling\b/i, merchant: 'Bowling', accountCode: '420', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\bsports\s*bar\b/i, merchant: 'Sports Bar', accountCode: '420', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\bnight\s*club\b/i, merchant: 'Night Club', accountCode: '420', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\bbar\b/i, merchant: 'Bar', accountCode: '420', confidence: 75, priority: 55, category: 'merchant' },
  
  // Home & Garden (Account Code: 455)
  { pattern: /\bhardware\s*store\b/i, merchant: 'Hardware Store', accountCode: '455', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\bgarden\s*center\b/i, merchant: 'Garden Center', accountCode: '455', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\bnursery\b/i, merchant: 'Nursery', accountCode: '455', confidence: 80, priority: 60, category: 'merchant' },
  { pattern: /\blandscaping\b/i, merchant: 'Landscaping', accountCode: '455', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\bcontractor\b/i, merchant: 'Contractor', accountCode: '455', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\bhandyman\b/i, merchant: 'Handyman', accountCode: '455', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\bplumber\b/i, merchant: 'Plumber', accountCode: '455', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\belectrician\b/i, merchant: 'Electrician', accountCode: '455', confidence: 85, priority: 65, category: 'merchant' },
  { pattern: /\bpainter\b/i, merchant: 'Painter', accountCode: '455', confidence: 80, priority: 60, category: 'merchant' },
  
  // Business Suffix Normalization (Lower priority to avoid false positives)
  { pattern: /\b\w+\s*inc\.?\s*$/i, merchant: 'Business', accountCode: '453', confidence: 60, priority: 40, category: 'merchant' },
  { pattern: /\b\w+\s*ltd\.?\s*$/i, merchant: 'Business', accountCode: '453', confidence: 60, priority: 40, category: 'merchant' },
  { pattern: /\b\w+\s*corp\.?\s*$/i, merchant: 'Business', accountCode: '453', confidence: 60, priority: 40, category: 'merchant' },
  { pattern: /\b\w+\s*llc\.?\s*$/i, merchant: 'Business', accountCode: '453', confidence: 60, priority: 40, category: 'merchant' },
  { pattern: /\b\w+\s*services\s*$/i, merchant: 'Services', accountCode: '453', confidence: 65, priority: 45, category: 'merchant' },
  { pattern: /\b\w+\s*company\s*$/i, merchant: 'Company', accountCode: '453', confidence: 65, priority: 45, category: 'merchant' },
  { pattern: /\b\w+\s*enterprises\s*$/i, merchant: 'Enterprises', accountCode: '453', confidence: 65, priority: 45, category: 'merchant' },
  
  // Government Services (FIXED: Account Code: 800 - Accounts Payable)
  { pattern: /cra/i, merchant: 'Canada Revenue Agency', accountCode: '800', confidence: 96, priority: 75, category: 'merchant' },
  { pattern: /service\s*canada/i, merchant: 'Service Canada', accountCode: '800', confidence: 96, priority: 75, category: 'merchant' },
  { pattern: /service\s*ontario/i, merchant: 'Service Ontario', accountCode: '800', confidence: 96, priority: 75, category: 'merchant' },
  
  // =============================================================================
  // PRIORITY 4: LOW CONFIDENCE FALLBACK PATTERNS
  // =============================================================================
  
  // Generic Deposits (Account Code: 200)
  { pattern: /^deposit$/i, merchant: 'Deposit', accountCode: '200', confidence: 80, priority: 50, category: 'financial' },
  { pattern: /^credit$/i, merchant: 'Credit', accountCode: '200', confidence: 80, priority: 50, category: 'financial' },
  { pattern: /direct\s*deposit/i, merchant: 'Direct Deposit', accountCode: '200', confidence: 97, priority: 55, category: 'financial' },
  { pattern: /payroll\s*deposit/i, merchant: 'Payroll Deposit', accountCode: '200', confidence: 97, priority: 55, category: 'financial' },
  
  // Generic Transfers (Account Code: 877)
  { pattern: /^transfer$/i, merchant: 'Transfer', accountCode: '877', confidence: 80, priority: 50, category: 'bank' },
  { pattern: /online\s*banking\s*transfer/i, merchant: 'Online Transfer', accountCode: '877', confidence: 85, priority: 55, category: 'bank' },
  { pattern: /electronic\s*transfer/i, merchant: 'Electronic Transfer', accountCode: '877', confidence: 85, priority: 55, category: 'bank' },
  { pattern: /internet\s*banking\s*transfer/i, merchant: 'Internet Banking Transfer', accountCode: '877', confidence: 85, priority: 55, category: 'bank' },
  
  // Generic Payments (Account Code: 800 for bill payments, 453 for general purchases)
  { pattern: /^payment$/i, merchant: 'Payment', accountCode: '800', confidence: 80, priority: 50, category: 'system' },
  { pattern: /bill\s*payment/i, merchant: 'Bill Payment', accountCode: '800', confidence: 80, priority: 50, category: 'system' },
  { pattern: /online\s*payment/i, merchant: 'Online Payment', accountCode: '800', confidence: 85, priority: 55, category: 'system' },
  
  // Generic Categories (Lower confidence for manual review)
  { pattern: /^withdrawal$/i, merchant: 'Withdrawal', accountCode: '610', confidence: 80, priority: 20, category: 'system' },
  { pattern: /^purchase$/i, merchant: 'Purchase', accountCode: '453', confidence: 80, priority: 20, category: 'system' },
  { pattern: /^debit$/i, merchant: 'Debit', accountCode: '453', confidence: 70, priority: 20, category: 'system' },
  { pattern: /^miscellaneous$/i, merchant: 'Miscellaneous', accountCode: '453', confidence: 70, priority: 20, category: 'system' },
  
  // =============================================================================
  // PRIORITY 1: USER TRAINING DATA PATTERNS (HIGHEST PRIORITY - SINGLE SOURCE OF TRUTH)
  // =============================================================================
  // These patterns are based on the user's actual transaction data and AI training results
  
  // Recent User Training Data - December 2024
  { pattern: /hydro\s*bill.*b\.?c\.?\s*hydro/i, merchant: 'BC Hydro', accountCode: '442', confidence: 100, priority: 125, category: 'training' },
  { pattern: /equipmt\.?\s*lease.*axiom\s*leasing/i, merchant: 'Axiom Leasing Equipment', accountCode: '468', confidence: 100, priority: 125, category: 'training' },
  { pattern: /dollar\s*tree\s*canada/i, merchant: 'Dollar Tree Canada', accountCode: '455', confidence: 100, priority: 125, category: 'training' },
  { pattern: /pedros?\s*mart/i, merchant: 'Pedros Mart', accountCode: '310', confidence: 100, priority: 125, category: 'training' },
  { pattern: /dhl\s*express/i, merchant: 'DHL Express', accountCode: '425', confidence: 100, priority: 125, category: 'training' },
  { pattern: /mezza\s*lebanese\s*kitchen/i, merchant: 'Mezza Lebanese Kitchen', accountCode: '420', confidence: 100, priority: 125, category: 'training' },
  { pattern: /haliburton\s*pharmachoice/i, merchant: 'Haliburton Pharmachoice', accountCode: '453', confidence: 100, priority: 125, category: 'training' },
  { pattern: /retail\s*interest/i, merchant: 'Retail Interest', accountCode: '437', confidence: 100, priority: 125, category: 'training' },
  { pattern: /overlimit\s*fee/i, merchant: 'Overlimit Fee', accountCode: '404', confidence: 100, priority: 125, category: 'training' },
  { pattern: /amazon.*(?:purchase|\.ca|\.com)/i, merchant: 'Amazon Purchase', accountCode: '455', confidence: 100, priority: 125, category: 'training' },
  
  // =============================================================================
  // ENHANCED E-TRANSFER PATTERNS - All Canadian Banking Variations
  // =============================================================================
  
  // E-Transfer FEES -> Bank Fees (404) - HIGHEST PRIORITY
  { pattern: /send\s*e[\-\s]*tfr\s*fee/i, merchant: 'E-Transfer Fee', accountCode: '404', confidence: 100, priority: 125, category: 'training' },
  { pattern: /rcv\s*e[\-\s]*tfr\s*fee/i, merchant: 'E-Transfer Receive Fee', accountCode: '404', confidence: 100, priority: 125, category: 'training' },
  { pattern: /e[\-\s]*tfr\s*fee/i, merchant: 'E-Transfer Fee', accountCode: '404', confidence: 100, priority: 124, category: 'training' },
  { pattern: /e[\-\s]*transfer\s*fee/i, merchant: 'E-Transfer Fee', accountCode: '404', confidence: 100, priority: 124, category: 'training' },
  { pattern: /interac\s*e[\-\s]*transfer\s*fee/i, merchant: 'E-Transfer Fee', accountCode: '404', confidence: 100, priority: 124, category: 'training' },
  { pattern: /etfr\s*fee/i, merchant: 'E-Transfer Fee', accountCode: '404', confidence: 100, priority: 124, category: 'training' },
  { pattern: /interac\s*etfr\s*fee/i, merchant: 'E-Transfer Fee', accountCode: '404', confidence: 100, priority: 124, category: 'training' },
  { pattern: /email\s*money\s*transfer\s*fee/i, merchant: 'E-Transfer Fee', accountCode: '404', confidence: 100, priority: 124, category: 'training' },
  { pattern: /emt\s*fee/i, merchant: 'E-Transfer Fee', accountCode: '404', confidence: 100, priority: 124, category: 'training' },
  { pattern: /send\s*money\s*fee/i, merchant: 'E-Transfer Fee', accountCode: '404', confidence: 100, priority: 124, category: 'training' },
  
  // Regular E-Transfers -> Tracking Transfers (877) - HIGH PRIORITY
  { pattern: /send\s*e[\-\s]*tfr(?!\s*fee)/i, merchant: 'Send E-Transfer', accountCode: '877', confidence: 100, priority: 123, category: 'training' },
  { pattern: /rcv\s*e[\-\s]*tfr(?!\s*fee)/i, merchant: 'Receive E-Transfer', accountCode: '877', confidence: 100, priority: 123, category: 'training' },
  { pattern: /receive\s*e[\-\s]*tfr/i, merchant: 'Receive E-Transfer', accountCode: '877', confidence: 100, priority: 123, category: 'training' },
  { pattern: /^e[\-\s]*tfr(?!\s*fee)/i, merchant: 'E-Transfer', accountCode: '877', confidence: 100, priority: 122, category: 'training' },
  { pattern: /^etfr(?!\s*fee)/i, merchant: 'E-Transfer', accountCode: '877', confidence: 100, priority: 122, category: 'training' },
  { pattern: /interac\s*etfr(?!\s*fee)/i, merchant: 'Interac E-Transfer', accountCode: '877', confidence: 100, priority: 122, category: 'training' },
  { pattern: /debit\s*memo.*send\s*e[\-\s]*tfr/i, merchant: 'Send E-Transfer', accountCode: '877', confidence: 100, priority: 123, category: 'training' },
  { pattern: /credit\s*memo.*rcv\s*e[\-\s]*tfr/i, merchant: 'Receive E-Transfer', accountCode: '877', confidence: 100, priority: 123, category: 'training' },
  { pattern: /email\s*money\s*transfer(?!\s*fee)/i, merchant: 'Email Money Transfer', accountCode: '877', confidence: 98, priority: 121, category: 'training' },
  { pattern: /emt(?!\s*fee)/i, merchant: 'Email Money Transfer', accountCode: '877', confidence: 98, priority: 121, category: 'training' },
  { pattern: /send\s*money(?!\s*fee)/i, merchant: 'Send Money', accountCode: '877', confidence: 98, priority: 121, category: 'training' },
  { pattern: /receive\s*money/i, merchant: 'Receive Money', accountCode: '877', confidence: 98, priority: 121, category: 'training' },
  
  // E-Transfer Special Cases
  { pattern: /e[\-\s]*tfr\s*reversal/i, merchant: 'E-Transfer Reversal', accountCode: '877', confidence: 100, priority: 123, category: 'training' },
  { pattern: /e[\-\s]*tfr\s*return/i, merchant: 'E-Transfer Return', accountCode: '877', confidence: 100, priority: 123, category: 'training' },
  { pattern: /e[\-\s]*tfr\s*cancelled/i, merchant: 'E-Transfer Cancelled', accountCode: '877', confidence: 100, priority: 123, category: 'training' },
  { pattern: /e[\-\s]*tfr\s*declined/i, merchant: 'E-Transfer Declined', accountCode: '877', confidence: 100, priority: 123, category: 'training' },
  { pattern: /send\s*e[\-\s]*tfr\s*reversal/i, merchant: 'Send E-Transfer Reversal', accountCode: '877', confidence: 100, priority: 123, category: 'training' },
  { pattern: /rcv\s*e[\-\s]*tfr\s*reversal/i, merchant: 'Receive E-Transfer Reversal', accountCode: '877', confidence: 100, priority: 123, category: 'training' },
];

// Pattern matching engine
export class UnifiedPatternEngine {
  private patterns: UnifiedPattern[];
  
  constructor() {
    // Sort patterns by priority (highest first)
    this.patterns = [...UNIFIED_PATTERNS].sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Find the best matching pattern for a transaction description
   */
  findBestMatch(description: string): {
    pattern: UnifiedPattern;
    confidence: number;
  } | null {
    if (!description || description.trim().length === 0) {
      return null;
    }
    
    const normalizedDesc = description.toLowerCase().trim();
    
    // Check patterns in priority order
    for (const pattern of this.patterns) {
      if (pattern.pattern.test(normalizedDesc)) {
        return {
          pattern,
          confidence: pattern.confidence
        };
      }
    }
    
    return null;
  }
  
  /**
   * Get all matching patterns for debugging
   */
  findAllMatches(description: string): Array<{
    pattern: UnifiedPattern;
    confidence: number;
  }> {
    if (!description || description.trim().length === 0) {
      return [];
    }
    
    const normalizedDesc = description.toLowerCase().trim();
    const matches: Array<{ pattern: UnifiedPattern; confidence: number }> = [];
    
    for (const pattern of this.patterns) {
      if (pattern.pattern.test(normalizedDesc)) {
        matches.push({
          pattern,
          confidence: pattern.confidence
        });
      }
    }
    
    return matches;
  }
  
  /**
   * Get patterns by category
   */
  getPatternsByCategory(category: string): UnifiedPattern[] {
    return this.patterns.filter(p => p.category === category);
  }
  
  /**
   * Categorize transaction using unified patterns with caching
   */
  categorize(transaction: Transaction): { 
    category: string; 
    accountCode: string; 
    confidence: number; 
    merchant?: string;
    inflowOutflow: 'inflow' | 'outflow';
  } {
    const stopTimer = performanceTracker.startTimer('unified_categorize');
    
    // Check cache first with context
    const cacheKey = CacheUtils.generateCacheKey(transaction, { province: 'default', userId: 'default' });
    const cached = categorizationCache.get(cacheKey);
    
    if (cached && CacheUtils.isCacheValid(cached.timestamp)) {
      stopTimer();
      const inflowOutflow = getInflowOutflow(transaction, cached.accountCode);
      return {
        category: cached.category,
        accountCode: cached.accountCode,
        confidence: cached.confidence,
        merchant: cached.category,
        inflowOutflow
      };
    }
    
    const match = this.findBestMatch(transaction.description);
    let result;
    
    if (match) {
      const { pattern } = match;
      const inflowOutflow = getInflowOutflow(transaction, pattern.accountCode);
      result = {
        category: pattern.merchant,
        accountCode: pattern.accountCode,
        confidence: pattern.confidence,
        merchant: pattern.merchant,
        inflowOutflow
      };
    } else {
      // Default fallback
      const defaultAccountCode = '453';
      const inflowOutflow = getInflowOutflow(transaction, defaultAccountCode);
      result = {
        category: 'Unknown',
        accountCode: defaultAccountCode,
        confidence: 0,
        inflowOutflow
      };
    }
    
    // Cache the result
    if (result.confidence > 0) {
      categorizationCache.set(cacheKey, {
        category: result.category,
        accountCode: result.accountCode,
        confidence: result.confidence,
        timestamp: Date.now()
      });
    }
    
    stopTimer();
    return result;
  }

  /**
   * Test merchant categorization for debugging
   */
  testMerchantCategorization(description: string): {
    matched: boolean;
    matches: Array<{
      pattern: string;
      merchant: string;
      accountCode: string;
      confidence: number;
      priority: number;
    }>;
  } {
    const normalizedDesc = description.toLowerCase().trim();
    const matches: Array<{
      pattern: string;
      merchant: string;
      accountCode: string;
      confidence: number;
      priority: number;
    }> = [];
    
    for (const pattern of this.patterns.filter(p => p.category === 'merchant')) {
      if (pattern.pattern.test(normalizedDesc)) {
        matches.push({
          pattern: pattern.pattern.toString(),
          merchant: pattern.merchant,
          accountCode: pattern.accountCode,
          confidence: pattern.confidence,
          priority: pattern.priority
        });
      }
    }
    
    return {
      matched: matches.length > 0,
      matches: matches.sort((a, b) => b.priority - a.priority)
    };
  }

  /**
   * Get stats about the pattern engine
   */
  getStats(): {
    totalPatterns: number;
    bankPatterns: number;
    merchantPatterns: number;
    financialPatterns: number;
    systemPatterns: number;
    averageConfidence: number;
  } {
    const stats = {
      totalPatterns: this.patterns.length,
      bankPatterns: this.patterns.filter(p => p.category === 'bank').length,
      merchantPatterns: this.patterns.filter(p => p.category === 'merchant').length,
      financialPatterns: this.patterns.filter(p => p.category === 'financial').length,
      systemPatterns: this.patterns.filter(p => p.category === 'system').length,
      averageConfidence: this.patterns.reduce((sum, p) => sum + p.confidence, 0) / this.patterns.length
    };
    
    return stats;
  }
}

// Export singleton instance
export const unifiedPatternEngine = new UnifiedPatternEngine(); 