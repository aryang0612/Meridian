import { Transaction } from './types';
import { ChartOfAccounts } from './chartOfAccounts';
import { MERCHANT_PATTERNS, findMerchantPattern } from '../data/merchants';
import { CustomKeywordManager } from '../data/customKeywords';
import Fuse from 'fuse.js';
import { DatabaseService } from './databaseService';
import { unifiedPatternEngine } from './unifiedPatternEngine';

// Enhanced bank transaction patterns using account codes
const BANK_PATTERNS = [
  // ACTUAL Bank Fees (Account Code: 404) - Only real bank charges
  { pattern: /overdrawn\s*handling\s*charge/i, accountCode: '404', merchant: 'Bank Fee', confidence: 95 },
  { pattern: /service\s*charge/i, accountCode: '404', merchant: 'Bank Fee', confidence: 95 },
  { pattern: /monthly\s*account\s*fee/i, accountCode: '404', merchant: 'Bank Fee', confidence: 95 },
  { pattern: /monthly\s*plan\s*fee/i, accountCode: '404', merchant: 'Bank Fee', confidence: 95 },
  { pattern: /wire\s*transfer\s*fee/i, accountCode: '404', merchant: 'Wire Transfer Fee', confidence: 95 },
  { pattern: /atm\s*withdrawal\s*fee/i, accountCode: '404', merchant: 'ATM Fee', confidence: 95 },
  { pattern: /certified\s*cheque\s*fee/i, accountCode: '404', merchant: 'Bank Fee', confidence: 95 },
  { pattern: /stop\s*payment\s*fee/i, accountCode: '404', merchant: 'Bank Fee', confidence: 95 },
  { pattern: /draft\s*fee/i, accountCode: '404', merchant: 'Bank Fee', confidence: 95 },
  { pattern: /account\s*maintenance\s*fee/i, accountCode: '404', merchant: 'Bank Fee', confidence: 95 },
  { pattern: /atm\s*fee/i, accountCode: '404', merchant: 'ATM Fee', confidence: 95 },
  { pattern: /interac\s*fee/i, accountCode: '404', merchant: 'Interac Fee', confidence: 95 },
  { pattern: /send\s*e[\-\s]*tfr\s*fee(?!\s*free)/i, accountCode: '404', merchant: 'E-Transfer Fee', confidence: 95 },
  { pattern: /cheque\s*charge/i, accountCode: '404', merchant: 'Bank Fee', confidence: 95 },
  { pattern: /tdms\s*stmt.*bus/i, accountCode: '404', merchant: 'Bank Fee', confidence: 95 },
  { pattern: /td\s*bus\s*credit\s*ins/i, accountCode: '404', merchant: 'Bank Fee', confidence: 95 },
  { pattern: /cash\s*dep\s*fee/i, accountCode: '404', merchant: 'Bank Fee', confidence: 95 },
  { pattern: /foreign\s*exchange\s*fee/i, accountCode: '404', merchant: 'Foreign Exchange Fee', confidence: 95 },
  { pattern: /lc\/lg\s*fee/i, accountCode: '404', merchant: 'Bank Fee', confidence: 95 },
  { pattern: /nsf\s*cheque\s*returned/i, accountCode: '404', merchant: 'NSF Fee', confidence: 95 },
  { pattern: /nsf\s*handling\s*charge/i, accountCode: '404', merchant: 'NSF Fee', confidence: 95 },
  { pattern: /nsf\s*paid\s*fee/i, accountCode: '404', merchant: 'NSF Fee', confidence: 95 },
  { pattern: /overdraft\s*interest/i, accountCode: '404', merchant: 'Overdraft Interest', confidence: 95 },
  { pattern: /overdrawn\s*handling/i, accountCode: '404', merchant: 'Overdraft Fee', confidence: 95 },

  // Payment Processor Fees (Account Code: 888)
  { pattern: /stripe\s*fee|paypal\s*fee|square\s*fee|shopify\s*fee|payment\s*processing\s*fee/i, accountCode: '888', merchant: 'Processing Fee', confidence: 97 },
  
  // General Service Fees (Account Code: 887)
  { pattern: /service\s*fee|platform\s*fee|subscription\s*fee|membership\s*fee/i, accountCode: '887', merchant: 'Service Fee', confidence: 95 },

  // Interest and Investment Income (Account Code: 270)
  { pattern: /interest\s*paid/i, accountCode: '270', merchant: 'Interest Income', confidence: 95 },
  { pattern: /interest\s*earned/i, accountCode: '270', merchant: 'Interest Income', confidence: 95 },
  { pattern: /interest\s*credit/i, accountCode: '270', merchant: 'Interest Income', confidence: 95 },
  { pattern: /interest\s*on\s*deposit/i, accountCode: '270', merchant: 'Interest Income', confidence: 95 },
  { pattern: /investment\s*income/i, accountCode: '270', merchant: 'Investment Income', confidence: 95 },
  { pattern: /dividend/i, accountCode: '270', merchant: 'Dividend', confidence: 95 },

  // E-Transfers - REMOVED auto-categorization, now requires manual selection
  // This allows users to properly categorize e-transfers based on their actual purpose

  // Enhanced Deposits (Account Code: 200)
  { pattern: /government\s*canada/i, accountCode: '200', merchant: 'Government Deposit', confidence: 90 },
  { pattern: /gc\s*\d+[\-\s]*deposit/i, accountCode: '200', merchant: 'Government Deposit', confidence: 95 },
  { pattern: /cra\s*deposit/i, accountCode: '200', merchant: 'CRA Deposit', confidence: 95 },
  { pattern: /canada\s*revenue\s*agency/i, accountCode: '200', merchant: 'CRA Deposit', confidence: 95 },
  { pattern: /employment\s*insurance/i, accountCode: '200', merchant: 'EI Deposit', confidence: 95 },
  { pattern: /digital\s*deposit/i, accountCode: '200', merchant: 'Digital Deposit', confidence: 95 },
  { pattern: /mobile\s*deposit/i, accountCode: '200', merchant: 'Mobile Deposit', confidence: 95 },
  { pattern: /acct\s*bal\s*rebate/i, accountCode: '200', merchant: 'Account Rebate', confidence: 95 },
  { pattern: /gm\s*reject\s*item\s*rev/i, accountCode: '200', merchant: 'Reversal Credit', confidence: 95 },
  
  // Generic Deposits - Lower confidence for manual review
  { pattern: /^deposit$/i, accountCode: '200', merchant: 'Deposit', confidence: 80 },
  { pattern: /^credit$/i, accountCode: '200', merchant: 'Credit', confidence: 80 },

  // INTERNAL TRANSFERS (Account Code: 610 - Cash/Bank Account) - NOT Bank Fees
  { pattern: /internal\s*transfer/i, accountCode: '610', merchant: 'Internal Transfer', confidence: 95 },
  { pattern: /account\s*transfer/i, accountCode: '610', merchant: 'Account Transfer', confidence: 95 },
  { pattern: /transfer\s*between\s*accounts/i, accountCode: '610', merchant: 'Internal Transfer', confidence: 95 },
  { pattern: /savings\s*to\s*chequing/i, accountCode: '610', merchant: 'Internal Transfer', confidence: 95 },
  { pattern: /chequing\s*to\s*savings/i, accountCode: '610', merchant: 'Internal Transfer', confidence: 95 },
  { pattern: /[a-z]{2}\d{3}\s*to\s*[a-z]{2}\d{3}/i, accountCode: '610', merchant: 'Internal Transfer', confidence: 95 },
  { pattern: /mb[\-\s]*transfer/i, accountCode: '610', merchant: 'Bank Transfer', confidence: 95 },
  { pattern: /electronic\s*funds\s*transfer/i, accountCode: '610', merchant: 'Electronic Transfer', confidence: 95 },
  { pattern: /[a-z]{2}\d{3}\s*tfr[\-\s]*to/i, accountCode: '610', merchant: 'Transfer Out', confidence: 95 },
  { pattern: /[a-z]{2}\d{3}\s*tfr[\-\s]*fr/i, accountCode: '610', merchant: 'Transfer In', confidence: 95 },
  { pattern: /[a-z]{2}\d{3}\s*tfr[\-\s]*to\s*\d+/i, accountCode: '610', merchant: 'Transfer Out', confidence: 95 },
  { pattern: /[a-z]{2}\d{3}\s*tfr[\-\s]*to(?!\s*fee)/i, accountCode: '610', merchant: 'Transfer Out', confidence: 95 },

  // LOAN PAYMENTS (Account Code: 900 - Loan) - NOT Bank Fees
  { pattern: /term\s*loans/i, accountCode: '900', merchant: 'Loan Payment', confidence: 95 },
  { pattern: /santander\s*consumer/i, accountCode: '900', merchant: 'Loan Payment', confidence: 95 },
  { pattern: /res\.\s*mortgage/i, accountCode: '900', merchant: 'Mortgage Payment', confidence: 95 },
  { pattern: /mortgage\s*payment/i, accountCode: '900', merchant: 'Mortgage Payment', confidence: 95 },
  { pattern: /loan\s*payment/i, accountCode: '900', merchant: 'Loan Payment', confidence: 95 },

  // CREDIT CARD PAYMENTS (Account Code: 900 - Loan) - NOT Bank Fees
  { pattern: /mb[\-\s]*bill\s*payment.*(?:visa|mastercard|credit\s*card|amex)/i, accountCode: '900', merchant: 'Credit Card Payment', confidence: 95 },
  { pattern: /bill\s*payment.*(?:visa|mastercard|credit\s*card|amex)/i, accountCode: '900', merchant: 'Credit Card Payment', confidence: 95 },
  { pattern: /payment.*(?:visa|mastercard|credit\s*card|amex)/i, accountCode: '900', merchant: 'Credit Card Payment', confidence: 90 },
  { pattern: /td\s*visa\s*payment/i, accountCode: '900', merchant: 'TD Visa Payment', confidence: 95 },
  { pattern: /rbc\s*visa\s*payment/i, accountCode: '900', merchant: 'RBC Visa Payment', confidence: 95 },
  { pattern: /bmo\s*mastercard\s*payment/i, accountCode: '900', merchant: 'BMO Mastercard Payment', confidence: 95 },
  { pattern: /scotia\s*visa\s*payment/i, accountCode: '900', merchant: 'Scotia Visa Payment', confidence: 95 },
  { pattern: /cibc\s*visa\s*payment/i, accountCode: '900', merchant: 'CIBC Visa Payment', confidence: 95 },
  { pattern: /credit\s*card\s*payment/i, accountCode: '900', merchant: 'Credit Card Payment', confidence: 95 },
  { pattern: /td\s*visa\s*preauth\s*pymt/i, accountCode: '900', merchant: 'Credit Card Payment', confidence: 95 },
  { pattern: /td\s*mc\s*\d+/i, accountCode: '900', merchant: 'Credit Card Transaction', confidence: 95 },
  { pattern: /td\s*idp\s*\d+/i, accountCode: '900', merchant: 'Credit Card Transaction', confidence: 95 },
  { pattern: /td\s*visa\d+/i, accountCode: '900', merchant: 'Credit Card Transaction', confidence: 95 },

  // BILL PAYMENTS TO VENDORS (Specific account codes based on vendor type)
  { pattern: /dominion\s*prem\s*msp/i, accountCode: '433', merchant: 'Insurance Payment', confidence: 95 },
  { pattern: /wawanesa\s*ins/i, accountCode: '433', merchant: 'Insurance Payment', confidence: 95 },
  { pattern: /bell\s*canada\s*eft\s*bpy/i, accountCode: '489', merchant: 'Bell Payment', confidence: 95 },
  { pattern: /iol\s*pay\s*to:\s*cra/i, accountCode: '505', merchant: 'CRA Payment', confidence: 95 },
  { pattern: /iol\s*serviceontario/i, accountCode: '453', merchant: 'Government Service', confidence: 95 },
  
  // Generic Bill Payments - Lower confidence for manual review
  { pattern: /mb[\-\s]*bill\s*payment(?!.*(?:visa|mastercard|credit\s*card|amex))/i, accountCode: '453', merchant: 'Bill Payment', confidence: 80 },
  { pattern: /bill\s*payment(?!.*(?:visa|mastercard|credit\s*card|amex))/i, accountCode: '453', merchant: 'Bill Payment', confidence: 80 },

  // PAYROLL (Account Code: 477 for expenses, 200 for income)
  { pattern: /payroll\s*pay/i, accountCode: '477', merchant: 'Payroll Expense', confidence: 95 },
  { pattern: /payroll/i, accountCode: '477', merchant: 'Payroll', confidence: 90 },
  { pattern: /employee\s*wages/i, accountCode: '477', merchant: 'Employee Wages', confidence: 95 },
  { pattern: /salary/i, accountCode: '200', merchant: 'Salary', confidence: 90 },
  { pattern: /wages/i, accountCode: '200', merchant: 'Wages', confidence: 90 },

  // REVENUE TRANSACTIONS
  { pattern: /stripe\s*msp/i, accountCode: '200', merchant: 'Stripe Payment', confidence: 95 },
  { pattern: /balance\s*forward/i, accountCode: '200', merchant: 'Balance Forward', confidence: 95 },

  // BUSINESS EXPENSES (Specific categories)
  { pattern: /the\s*garage\s*part/i, accountCode: '449', merchant: 'Auto Parts', confidence: 90 },
  { pattern: /jiffy\s*lube/i, accountCode: '449', merchant: 'Jiffy Lube', confidence: 95 },
  { pattern: /tim\s*hortons/i, accountCode: '420', merchant: 'Tim Hortons', confidence: 95 },
  { pattern: /mcdonald/i, accountCode: '420', merchant: 'McDonalds', confidence: 95 },
  { pattern: /starbucks/i, accountCode: '420', merchant: 'Starbucks', confidence: 95 },
  { pattern: /dominos\s*pizza/i, accountCode: '420', merchant: 'Dominos Pizza', confidence: 95 },
  { pattern: /booster\s*juice/i, accountCode: '420', merchant: 'Booster Juice', confidence: 95 },
  { pattern: /doolys/i, accountCode: '420', merchant: 'Doolys', confidence: 95 },
  { pattern: /cineplex/i, accountCode: '420', merchant: 'Cineplex', confidence: 95 },
  { pattern: /dazn/i, accountCode: '420', merchant: 'DAZN', confidence: 95 },
  { pattern: /doordash/i, accountCode: '420', merchant: 'DoorDash', confidence: 95 },
  { pattern: /sobeys/i, accountCode: '453', merchant: 'Sobeys', confidence: 95 },
  { pattern: /walmart/i, accountCode: '453', merchant: 'Walmart', confidence: 90 },
  { pattern: /dollarama/i, accountCode: '453', merchant: 'Dollarama', confidence: 90 },
  { pattern: /atlantic\s*supers/i, accountCode: '453', merchant: 'Atlantic Superstore', confidence: 95 },
  { pattern: /hogan\s*court\s*ess/i, accountCode: '453', merchant: 'Hogan Court ESS', confidence: 90 },
  { pattern: /instacart/i, accountCode: '453', merchant: 'Instacart', confidence: 95 },
  { pattern: /pur\s*simple/i, accountCode: '453', merchant: 'Pur Simple', confidence: 90 },
  { pattern: /goodlife\s*clubs/i, accountCode: '453', merchant: 'GoodLife', confidence: 95 },
  { pattern: /apple\.com/i, accountCode: '455', merchant: 'Apple', confidence: 95 },
  { pattern: /microsoft/i, accountCode: '485', merchant: 'Microsoft', confidence: 95 },
  { pattern: /chegg/i, accountCode: '487', merchant: 'Chegg', confidence: 95 },
  { pattern: /uber\s*canada/i, accountCode: '493', merchant: 'Uber', confidence: 95 },
  { pattern: /shell/i, accountCode: '449', merchant: 'Shell', confidence: 95 },
  { pattern: /circle\s*k/i, accountCode: '449', merchant: 'Circle K', confidence: 90 },
  { pattern: /ford\s*credit/i, accountCode: '449', merchant: 'Ford Credit', confidence: 95 },

  // REJECTED/REVERSED TRANSACTIONS
  { pattern: /gm\s*reject\s*item/i, accountCode: '404', merchant: 'Rejected Transaction', confidence: 95 },
  { pattern: /rtd\s*partial\s*payment/i, accountCode: '453', merchant: 'Partial Payment', confidence: 95 },
  { pattern: /debit\s*memo/i, accountCode: '404', merchant: 'Debit Memo', confidence: 95 },

  // THIRD-PARTY SERVICES
  { pattern: /sezzle/i, accountCode: '453', merchant: 'Sezzle', confidence: 95 },
  { pattern: /afterpay/i, accountCode: '453', merchant: 'Afterpay', confidence: 95 },
  { pattern: /capital\s*one/i, accountCode: '900', merchant: 'Capital One', confidence: 95 },
  { pattern: /dacollect/i, accountCode: '453', merchant: 'DA Collect', confidence: 95 },

  // BANK-SPECIFIC TRANSACTIONS (Lower confidence for manual review)
  { pattern: /online\s*banking\s*transfer/i, accountCode: '610', merchant: 'Online Transfer', confidence: 85 },
  { pattern: /online\s*banking\s*payment/i, accountCode: '453', merchant: 'Online Payment', confidence: 85 },
  { pattern: /contactless\s*interac\s*purchase/i, accountCode: '453', merchant: 'Contactless Purchase', confidence: 85 },
  { pattern: /visa\s*debit\s*purchase/i, accountCode: '453', merchant: 'Visa Debit Purchase', confidence: 85 },
  { pattern: /visa\s*debit\s*auth\s*reversal/i, accountCode: '200', merchant: 'Auth Reversal', confidence: 95 },
  { pattern: /visa\s*debit\s*correction/i, accountCode: '200', merchant: 'Correction', confidence: 95 },
  { pattern: /visa\s*debit\s*authorization\s*expired/i, accountCode: '404', merchant: 'Auth Expired', confidence: 95 },

  // ATM TRANSACTIONS (Account Code: 610 - Cash/Bank Account)
  { pattern: /atm\s*withdrawal/i, accountCode: '610', merchant: 'ATM Withdrawal', confidence: 95 },
  { pattern: /atm\s*deposit/i, accountCode: '610', merchant: 'ATM Deposit', confidence: 95 },
  { pattern: /cash\s*withdrawal/i, accountCode: '610', merchant: 'Cash Withdrawal', confidence: 95 },

  // GENERIC PATTERNS (Lower confidence for manual review)
  { pattern: /misc\s*payment/i, accountCode: '453', merchant: 'Misc Payment', confidence: 80 },
  { pattern: /auto\s*payment/i, accountCode: '453', merchant: 'Auto Payment', confidence: 80 },
  { pattern: /^transfer$/i, accountCode: '610', merchant: 'Transfer', confidence: 80 },
  { pattern: /^payment$/i, accountCode: '453', merchant: 'Payment', confidence: 80 },
  { pattern: /^withdrawal$/i, accountCode: '610', merchant: 'Withdrawal', confidence: 80 },
  { pattern: /^atm$/i, accountCode: '610', merchant: 'ATM Transaction', confidence: 80 },
  { pattern: /^cash$/i, accountCode: '610', merchant: 'Cash Transaction', confidence: 80 },
  { pattern: /^debit card$/i, accountCode: '453', merchant: 'Debit Card', confidence: 80 },
  { pattern: /^purchase$/i, accountCode: '453', merchant: 'Purchase', confidence: 80 },
  { pattern: /^miscellaneous$/i, accountCode: '453', merchant: 'Miscellaneous', confidence: 70 },
  { pattern: /^debit$/i, accountCode: '453', merchant: 'Debit', confidence: 70 },
];

// Utility to determine inflow/outflow
export function getInflowOutflow(transaction: Transaction, accountCode: string): 'inflow' | 'outflow' {
  // If amount is positive and account code is income-related, treat as inflow
  if (transaction.amount > 0) {
    if (['200', '220', '260', '270'].includes(accountCode)) {
      return 'inflow';
    }
    // ATM, Cash, Transfer, etc. with positive amount = inflow (deposit)
    if (["atm", "cash", "transfer", "debit card", "miscellaneous", "purchase"].includes((transaction.description || '').toLowerCase())) {
      return 'inflow';
    }
    // Default: positive is inflow
    return 'inflow';
  }
  
  // If amount is negative and account code is expense-related, treat as outflow
  if (transaction.amount < 0) {
    if (['310', '400', '404', '408', '412', '416', '420', '425', '433', '437', '442', '449', '453', '455', '469', '473', '477', '482', '485', '487', '489', '493', '505'].includes(accountCode)) {
      return 'outflow';
    }
    // Default: negative is outflow
    return 'outflow';
  }
  
  // Zero amount - determine based on account code
  if (['200', '220', '260', '270'].includes(accountCode)) {
    return 'inflow';
  } else if (['310', '400', '404', '408', '412', '416', '420', '425', '433', '437', '442', '449', '453', '455', '469', '473', '477', '482', '485', '487', '489', '493', '505'].includes(accountCode)) {
    return 'outflow';
  }
  
  // Default fallback
  return transaction.amount >= 0 ? 'inflow' : 'outflow';
}



export class AIEngine {
  private province: string;
  private chartOfAccounts: ChartOfAccounts;
  private databaseService: DatabaseService;
  public userId?: string; // Make userId accessible for API calls
  
  // Keep local patterns for performance, but sync with database
  private learnedPatterns: Map<string, { category: string; confidence: number; usageCount: number; lastUsed: Date }> = new Map();
  private userCorrections: Map<string, string> = new Map();
  private similarTransactionRules: Map<string, { category: string; confidence: number; usageCount: number; lastUsed: Date }> = new Map();
  private categoryUsage: Map<string, number> = new Map(); // Track category usage
  private customKeywordManager: CustomKeywordManager;
  private fuse: Fuse<any> | null = null; // Fuse.js instance for fuzzy matching

  constructor(province: string = 'ON', userId?: string, organizationId?: string) {
    this.province = province;
    this.userId = userId; // Store userId for API calls
    // Use singleton Chart of Accounts instance to prevent multiple initializations
    this.chartOfAccounts = ChartOfAccounts.getInstance(province);
    this.databaseService = DatabaseService.getInstance();
    this.customKeywordManager = CustomKeywordManager.getInstance();
    // Always try to load learned data (the service will handle authentication internally)
    this.loadLearnedData();
    this.initializeFuse(); // Initialize Fuse.js
  }

  /**
   * Initialize the AI engine and wait for chart of accounts to load
   */
  async initialize(): Promise<void> {
    // ChartOfAccounts is always ready, just load learned data
    await this.loadLearnedData();
  }

  /**
   * Load learned data from database
   */
  private async loadLearnedData(): Promise<void> {
    try {
      // Skip if no user ID
      if (!this.userId) {
        // No user ID, skipping database load
        this.loadLearnedDataFromStorage();
        return;
      }

      const patterns = await this.databaseService.getLearnedPatterns();
      
      // Clear existing patterns
      this.learnedPatterns.clear();
      
      // Load patterns from database
      for (const pattern of patterns) {
        this.learnedPatterns.set(pattern.pattern, {
          category: pattern.category_code,
          confidence: pattern.confidence,
          usageCount: pattern.usage_count,
          lastUsed: new Date(pattern.last_used)
        });
      }
      
      console.log('✅ Loaded learned data from database:', patterns.length, 'patterns');
    } catch (error) {
      console.error('Failed to load learned data from database:', error);
      // Fallback to localStorage if database fails
      this.loadLearnedDataFromStorage();
    }
  }

  /**
   * Save learned data to database (called periodically)
   */
  private async saveLearnedData(): Promise<void> {
    try {
      // Skip if no user ID
      if (!this.userId) {
        console.log('⚠️ No user ID, skipping database save - using localStorage instead');
        this.saveLearnedDataToStorage();
        return;
      }

      // Save all learned patterns to database
      for (const [pattern, data] of this.learnedPatterns.entries()) {
        await this.databaseService.saveLearnedPattern(pattern, data.category, data.confidence);
      }
      
      console.log('✅ Saved learned data to database');
    } catch (error) {
      console.error('Failed to save learned data to database:', error);
      // Fallback to localStorage
      this.saveLearnedDataToStorage();
    }
  }

  /**
   * Categorize a transaction using AI patterns and heuristics
   */
  categorizeTransaction(transaction: Transaction): {
    category: string;
    confidence: number;
    accountCode: string;
    inflowOutflow: 'inflow' | 'outflow';
  } {
    const description = transaction.description || '';
    const amount = transaction.amount;
    const isPositive = amount > 0;

    console.log(`🔍 Categorizing: "${description}" (${amount})`);

    // Helper function to determine inflow/outflow
    const getInflowOutflow = (transaction: Transaction, accountCode: string): 'inflow' | 'outflow' => {
      if (isPositive) return 'inflow';
      if (['200', '220', '260', '270'].includes(accountCode)) {
        return 'inflow';
      }
      return 'outflow';
    };

    // 0. Use unified pattern engine FIRST (highest priority)
    const unifiedResult = unifiedPatternEngine.categorize(transaction);
    if (unifiedResult.confidence >= 85) {
      console.log(`✅ Unified pattern matched: ${unifiedResult.category} (${unifiedResult.confidence}%)`);
      return {
        category: unifiedResult.category,
        confidence: unifiedResult.confidence,
        accountCode: unifiedResult.accountCode,
        inflowOutflow: unifiedResult.inflowOutflow
      };
    }

    // 1. E-TRANSFER categorization - HIGHEST PRIORITY - intelligent context analysis
    if (/(?:e[\-\s]*transfer|e[\-\s]*tfr|etfr|send\s+e[\-\s]*tfr|rcv\s+e[\-\s]*tfr)(?!\s*fee)/i.test(description.toLowerCase())) {
      console.log(`🔍 E-TRANSFER detected: "${description}" - analyzing context...`);
      
      // Use intelligent context analysis instead of always marking as manual
      const contextResult = this.analyzeETransferContext(description, transaction.amount);
      if (contextResult) {
        console.log(`✅ E-Transfer context analysis successful: ${contextResult.category} (${contextResult.confidence}%)`);
        return {
          category: contextResult.category,
          confidence: contextResult.confidence,
          accountCode: contextResult.accountCode,
          inflowOutflow: transaction.amount > 0 ? 'inflow' : 'outflow'
        };
      } else {
        // Only fallback to manual if no context found
        console.log(`⚠️ E-Transfer context analysis failed - marking for manual review`);
        return {
          category: 'E-Transfer',
          confidence: 25, // Low confidence indicates manual categorization required
          accountCode: '883', // E-Transfer account code - user can change this
          inflowOutflow: transaction.amount > 0 ? 'inflow' : 'outflow'
        };
      }
    }

    // 2. Check custom keywords (highest priority after e-transfers)
    const customKeywordMatch = this.findKeywordMatch(description);
    if (customKeywordMatch) {
      console.log(`🔑 Custom keyword match: ${customKeywordMatch.accountCode} (${customKeywordMatch.confidence}%)`);
      return {
        category: customKeywordMatch.accountCode,
        confidence: customKeywordMatch.confidence,
        accountCode: customKeywordMatch.accountCode,
        inflowOutflow: getInflowOutflow(transaction, customKeywordMatch.accountCode)
      };
    }

    // 3. Check learned patterns (user corrections)
    const learnedPattern = this.findLearnedPattern(description);
    if (learnedPattern) {
      console.log(`🧠 Learned pattern: ${learnedPattern.category} (${learnedPattern.confidence}%)`);
      return {
        category: learnedPattern.category,
        confidence: learnedPattern.confidence,
        accountCode: learnedPattern.accountCode || this.getAccountCode(learnedPattern.category, amount),
        inflowOutflow: getInflowOutflow(transaction, learnedPattern.category)
      };
    }

    // 4. Check similar transaction rules
    const similarRule = this.findSimilarTransactionRule(description);
    if (similarRule) {
      console.log(`🔄 Similar transaction rule: ${similarRule.category} (${similarRule.confidence}%)`);
      return {
        category: similarRule.category,
        confidence: similarRule.confidence,
        accountCode: similarRule.accountCode || this.getAccountCode(similarRule.category, amount),
        inflowOutflow: getInflowOutflow(transaction, similarRule.category)
      };
    }

    // 5. Try bank transaction patterns (high priority for bank-related)
    const bankMatch = this.findBankPattern(description);
    if (bankMatch) {
      const inflowOutflow = getInflowOutflow(transaction, bankMatch.accountCode);
      console.log(`✅ Bank pattern match: ${bankMatch.merchant} (${bankMatch.confidence}%)`);
      return {
        category: bankMatch.merchant,
        confidence: bankMatch.confidence,
        accountCode: bankMatch.accountCode,
        inflowOutflow
      };
    }

    // 6. Try exact merchant pattern matching
    const exactMatch = this.findExactPattern(description);
    if (exactMatch) {
      console.log(`✅ Exact merchant match: ${exactMatch.merchant} -> ${exactMatch.accountCode}`);
      return {
        category: 'Uncategorized', // We're moving away from categories
        confidence: 95,
        accountCode: exactMatch.accountCode,
        inflowOutflow: getInflowOutflow(transaction, exactMatch.accountCode)
      };
    }

    // 7. Try fuzzy matching with merchant patterns (improved)
    const fuzzyMatch = this.findFuzzyPattern(description);
    if (fuzzyMatch && fuzzyMatch.score < 0.3) {
      console.log(`✅ Fuzzy merchant match: ${fuzzyMatch.merchant} (score: ${fuzzyMatch.score})`);
      return {
        category: fuzzyMatch.merchant,
        confidence: Math.max(70, 90 - (fuzzyMatch.score * 100)),
        accountCode: this.getAccountCode(fuzzyMatch.merchant, amount),
        inflowOutflow: getInflowOutflow(transaction, fuzzyMatch.merchant)
      };
    }

    // 8. Amount-based heuristics - COMPLETELY DISABLED
    // const amountMatch = this.findAmountBasedCategory(amount);
    // Amount-based categorization has been removed as it was too aggressive

    // 9. Use unified pattern engine result even if lower confidence
    if (unifiedResult.confidence > 0) {
      console.log(`✅ Using unified pattern with lower confidence: ${unifiedResult.category} (${unifiedResult.confidence}%)`);
      return {
        category: unifiedResult.category,
        confidence: unifiedResult.confidence,
        accountCode: unifiedResult.accountCode,
        inflowOutflow: unifiedResult.inflowOutflow
      };
    }

    // 10. Default fallback with low confidence
    const defaultCategory = isPositive ? 'Revenue' : 'Uncategorized';
    console.log(`❓ Default fallback: ${defaultCategory} (low confidence)`);
    return {
      category: defaultCategory,
      confidence: 30, // Low confidence for unknown transactions
      accountCode: this.getAccountCode(defaultCategory, amount),
      inflowOutflow: getInflowOutflow(transaction, defaultCategory)
    };
  }

  /**
   * Find bank transaction patterns (NEW - from training data)
   */
  private findBankPattern(description: string): { accountCode: string; merchant: string; confidence: number } | null {
    const normalizedDesc = description.toLowerCase();
    
    // Testing bank patterns
    
    // Special handling for E-TRANSFER - now requires manual entry
    if (/(?:e[\-\s]*transfer|e[\-\s]*tfr|etfr|send\s+e[\-\s]*tfr|rcv\s+e[\-\s]*tfr)(?!\s*fee)/i.test(normalizedDesc)) {
      console.log(`⚠️ E-TRANSFER detected, skipping bank patterns - requires manual entry`);
      return null;
    }
    
    for (const pattern of BANK_PATTERNS) {
      if (pattern.pattern.test(normalizedDesc)) {
        console.log(`✅ Bank pattern matched: ${pattern.pattern.source} -> ${pattern.merchant}`);
        this.incrementCategoryUsage(pattern.accountCode);
        return { 
          accountCode: pattern.accountCode, 
          merchant: pattern.merchant, 
          confidence: pattern.confidence 
        };
      }
    }
    
    console.log(`❌ No bank patterns matched`);
    return null;
  }

  /**
   * Categorize a batch of transactions
   */
  categorizeBatch(transactions: Transaction[]): Transaction[] {
    // Chart of accounts is always ready
    return transactions.map(t => {
      const result = this.categorizeTransaction(t);
      return {
        ...t,
        category: result.category,
        confidence: result.confidence,
        accountCode: result.accountCode,
        inflowOutflow: result.inflowOutflow
      };
    });
  }

  /**
   * Find exact pattern match in merchant database
   */
  private findExactPattern(description: string): { accountCode: string; merchant: string } | null {
    const normalizedDesc = description.toLowerCase();
    
    for (const pattern of MERCHANT_PATTERNS) {
      if (pattern.pattern.test(normalizedDesc)) {
        this.incrementCategoryUsage(pattern.accountCode);
        return { accountCode: pattern.accountCode, merchant: pattern.merchant };
      }
    }
    
    return null;
  }

  /**
   * Find fuzzy pattern match using improved algorithms
   */
  private findFuzzyPattern(description: string): { merchant: string; score: number } | null {
    if (!this.fuse) return null;
    
    const results = this.fuse.search(description);
    if (results.length === 0) return null;
    
    const bestMatch = results[0];
    const score = bestMatch.score || 1;
    
    // Only return if score is good enough
    if (score < 0.3) {
      this.incrementCategoryUsage(bestMatch.item.merchant);
      return {
        merchant: bestMatch.item.merchant,
        score: score
      };
    }
    
    return null;
  }

  /**
   * Calculate similarity between two strings using multiple algorithms
   */
  private calculateSimilarity(str1: string, str2: string): number {
    // Jaro-Winkler similarity
    const jaroWinkler = this.jaroWinklerSimilarity(str1, str2);
    
    // Levenshtein distance
    const levenshtein = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    const levenshteinSimilarity = maxLength > 0 ? 1 - (levenshtein / maxLength) : 0;
    
    // Combine both algorithms
    return (jaroWinkler + levenshteinSimilarity) / 2;
  }

  /**
   * Jaro-Winkler similarity algorithm
   */
  private jaroWinklerSimilarity(s1: string, s2: string): number {
    if (s1 === s2) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;
    
    const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
    if (matchWindow < 0) return 0.0;
    
    const s1Matches = new Array(s1.length).fill(false);
    const s2Matches = new Array(s2.length).fill(false);
    
    let matches = 0;
    let transpositions = 0;
    
    // Find matches
    for (let i = 0; i < s1.length; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, s2.length);
      
      for (let j = start; j < end; j++) {
        if (s2Matches[j] || s1[i] !== s2[j]) continue;
        s1Matches[i] = true;
        s2Matches[j] = true;
        matches++;
        break;
      }
    }
    
    if (matches === 0) return 0.0;
    
    // Find transpositions
    let k = 0;
    for (let i = 0; i < s1.length; i++) {
      if (!s1Matches[i]) continue;
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }
    
    const jaro = (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3;
    
    // Winkler modification
    let prefix = 0;
    for (let i = 0; i < Math.min(4, Math.min(s1.length, s2.length)); i++) {
      if (s1[i] === s2[i]) prefix++;
      else break;
    }
    
    return jaro + (prefix * 0.1 * (1 - jaro));
  }

  /**
   * Levenshtein distance algorithm
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Enhanced keyword-based matches (IMPROVED with training data)
   */
  private findKeywordMatch(description: string): { accountCode: string; confidence: number } | null {
    const normalizedDesc = description.toLowerCase();
    
    // Check single keywords first (higher priority)
    const keywords = this.customKeywordManager.getKeywords();
    for (const keyword of keywords) {
      if (normalizedDesc.includes(keyword.keyword.toLowerCase())) {
        console.log(`✅ Keyword match: "${keyword.keyword}" -> ${keyword.accountCode}`);
        this.incrementCategoryUsage(keyword.accountCode);
        return { 
          accountCode: keyword.accountCode, 
          confidence: keyword.confidence || 85 
        };
      }
    }
    
    // Check multi-keyword rules
    const rules = this.customKeywordManager.getRules();
    for (const rule of rules) {
      const matchCount = rule.keywords.filter((k: string) => normalizedDesc.includes(k.toLowerCase())).length;
      if (matchCount > 0) {
        // Calculate confidence based on how many keywords match
        const matchRatio = matchCount / rule.keywords.length;
        const adjustedConfidence = rule.confidence * matchRatio;
        
        if (adjustedConfidence >= 50) { // Minimum threshold
          console.log(`✅ Rule match: "${rule.keywords.join(', ')}" -> ${rule.accountCode} (${adjustedConfidence.toFixed(1)}% confidence)`);
          this.incrementCategoryUsage(rule.accountCode);
          return { 
            accountCode: rule.accountCode, 
            confidence: adjustedConfidence 
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Enhanced amount-based categorization (IMPROVED)
   */
  private findAmountBasedCategory(amount: number): { category: string; confidence: number } | null {
    // Much more conservative amount-based heuristics
    // Only apply when amount strongly suggests a specific category AND no other patterns matched
    
    // Completely remove amount-based categorization as it's too aggressive
    // All transactions should go through proper pattern matching or be marked as uncategorized
    return null;
  }

  /**
   * Get account code for a category with improved mapping
   */
  private getAccountCode(category: string, amount: number): string {
    try {
      // Check if chart of accounts is available
      const accounts = this.chartOfAccounts.getAllAccounts();
      if (accounts.length === 0) {
        console.warn('⚠️ Chart of accounts not initialized, using fallback account codes');
        return this.getFallbackAccountCode(category, amount);
      }

      // Try to find account by category name first
      const account = this.chartOfAccounts.findAccountByCategory(category);
      if (account) {
        console.log(`✅ Found account code ${account.code} for category: ${category}`);
        return account.code;
      }

      // Enhanced category to account mapping
      const categoryMapping: { [key: string]: string } = {
        // Revenue accounts
        'Revenue': '200',
        'Sales Revenue': '200',
        'Service Revenue': '220',
        'Interest Income': '270',
        'Investment Income': '270',
        'Other Revenue': '260',
        
        // Expense accounts
        'Office Supplies': '455',
        'Software & Technology': '485',
        'Telecommunications': '489',
        'Insurance': '433',
        'Motor Vehicle Expenses': '449',
        'Meals & Entertainment': '420',
        'Travel & Accommodation': '493',
        'Bank Fees': '404',
        'Rent': '469',
        'Medical Expenses': '453',
        'General Expenses': '453',
        
        // Asset accounts
        'Cash': '610',
        'Accounts Receivable': '620',
        'Inventory': '630',
        'Equipment': '640',
        'Vehicles': '650',
        
        // Liability accounts
        'Accounts Payable': '800',
        'Sales Tax': '803',
        'Income Tax Payable': '803',
        
        // Special categories
        'E-Transfer': '610', // Cash account
        'Cheques': '610', // Cash account
        'Payroll': '477', // Payroll expense
        'Tax Payments': '505', // Tax Payments
        'Uncategorized': '' // Suspense account
      };

      // Check enhanced mapping
      if (categoryMapping[category]) {
        console.log(`✅ Using enhanced mapping: ${category} → ${categoryMapping[category]}`);
        return categoryMapping[category];
      }

      // Try partial category matching
      for (const [mappedCategory, accountCode] of Object.entries(categoryMapping)) {
        if (category.toLowerCase().includes(mappedCategory.toLowerCase()) || 
            mappedCategory.toLowerCase().includes(category.toLowerCase())) {
          console.log(`✅ Partial match: ${category} → ${accountCode} (via ${mappedCategory})`);
          return accountCode;
        }
      }

      // Fallback based on amount and category type
      return this.getFallbackAccountCode(category, amount);

    } catch (error) {
      console.error('❌ Error getting account code:', error);
      return this.getFallbackAccountCode(category, amount);
    }
  }

  /**
   * Get fallback account code when chart is not available
   */
  private getFallbackAccountCode(category: string, amount: number): string {
    const isPositive = amount > 0;
    
    if (isPositive) {
      // Income/Revenue accounts
      if (category.toLowerCase().includes('revenue') || category.toLowerCase().includes('income')) {
        return '200'; // Sales Revenue
      }
      if (category.toLowerCase().includes('interest')) {
        return '270'; // Interest Income
      }
      if (category.toLowerCase().includes('transfer') || category.toLowerCase().includes('deposit')) {
        return '610'; // Cash
      }
      return '200'; // Default to Sales Revenue
    } else {
      // Expense accounts
      if (category.toLowerCase().includes('office') || category.toLowerCase().includes('supplies')) {
        return '455'; // Office Supplies
      }
      if (category.toLowerCase().includes('software') || category.toLowerCase().includes('tech')) {
        return '485'; // Software & Technology
      }
      if (category.toLowerCase().includes('phone') || category.toLowerCase().includes('internet')) {
        return '489'; // Telecommunications
      }
      if (category.toLowerCase().includes('insurance')) {
        return '433'; // Insurance
      }
      if (category.toLowerCase().includes('vehicle') || category.toLowerCase().includes('gas') || category.toLowerCase().includes('fuel')) {
        return '449'; // Motor Vehicle Expenses
      }
      if (category.toLowerCase().includes('meal') || category.toLowerCase().includes('food') || category.toLowerCase().includes('entertainment')) {
        return '420'; // Meals & Entertainment
      }
      if (category.toLowerCase().includes('travel')) {
        return '493'; // Travel & Accommodation
      }
      if (category.toLowerCase().includes('bank') || category.toLowerCase().includes('fee')) {
        return '404'; // Bank Fees
      }
      if (category.toLowerCase().includes('rent')) {
        return '469'; // Rent
      }
      if (category.toLowerCase().includes('medical')) {
        return '453'; // Medical Expenses
      }
      return '453'; // Default to General Expenses
    }
  }

  /**
   * Record user correction and save to database
   */
  async recordUserCorrection(originalDescription: string, correctedCategoryCode: string): Promise<void> {
    try {
      // Save to database (the service will handle authentication internally)
      await this.databaseService.recordUserCorrection(originalDescription, correctedCategoryCode);
      
      // Create learned pattern
      const pattern = this.createPattern(originalDescription);
      await this.databaseService.saveLearnedPattern(pattern, correctedCategoryCode, 90);
      
      // Update local cache
      this.userCorrections.set(originalDescription, correctedCategoryCode);
      this.learnedPatterns.set(pattern, {
        category: correctedCategoryCode,
        confidence: 90,
        usageCount: 1,
        lastUsed: new Date()
      });
      
      console.log('📝 Recorded user correction:', originalDescription, '->', correctedCategoryCode);
      console.log('📝 Added to learned patterns:', pattern, '->', correctedCategoryCode);
    } catch (error) {
      console.error('Failed to record user correction:', error);
      // Fallback to localStorage
      this.recordUserCorrectionToStorage(originalDescription, correctedCategoryCode);
    }
  }

  /**
   * Learn from cycle emoji action (apply to similar transactions)
   */
  learnFromSimilarAction(sourceDescription: string, category: string, similarTransactions: string[], accountCode?: string) {
    // Create a pattern from the source description
    const pattern = this.createPatternFromDescription(sourceDescription);
    
    // Store the rule
    const ruleKey = pattern;
    const existingRule = this.similarTransactionRules.get(ruleKey);
    
    if (existingRule) {
      // Update existing rule
      existingRule.usageCount += similarTransactions.length;
      existingRule.confidence = Math.min(95, existingRule.confidence + 5);
    } else {
      // Create new rule
      this.similarTransactionRules.set(ruleKey, {
        category,
        confidence: 85,
        usageCount: similarTransactions.length,
        lastUsed: new Date()
      });
    }

    // Also learn individual patterns for each similar transaction
    similarTransactions.forEach(desc => {
      const individualPattern = this.createPatternFromDescription(desc);
      this.learnedPatterns.set(individualPattern, {
        category,
        confidence: 90,
        usageCount: 1,
        lastUsed: new Date()
      });
    });

    console.log(`🔄 Learned from similar action: ${similarTransactions.length} transactions -> ${category}`);
    this.saveLearnedData();
  }

  /**
   * Find learned pattern match
   */
  private findLearnedPattern(description: string): { category: string; confidence: number; accountCode?: string } | null {
    const normalizedDesc = this.createPatternFromDescription(description);
    
    console.log(`🧠 Checking learned patterns for: "${normalizedDesc}"`);
    console.log(`🧠 Available patterns: ${this.learnedPatterns.size}`);
    
    // Check for exact matches first
    for (const [pattern, data] of this.learnedPatterns) {
      console.log(`🧠 Checking pattern: "${pattern}" vs "${normalizedDesc}"`);
      if (pattern === normalizedDesc) {
        console.log(`🧠 EXACT MATCH FOUND: ${data.category} (${data.confidence}%)`);
        return {
          category: data.category,
          confidence: data.confidence,
          accountCode: undefined
        };
      }
    }

    // Check for partial matches
    for (const [pattern, data] of this.learnedPatterns) {
      if (normalizedDesc.includes(pattern) || pattern.includes(normalizedDesc)) {
        console.log(`🧠 PARTIAL MATCH FOUND: ${data.category} (${data.confidence}%)`);
        return {
          category: data.category,
          confidence: Math.max(70, data.confidence - 10),
          accountCode: undefined
        };
      }
    }

    console.log(`🧠 No learned pattern found`);
    return null;
  }

  /**
   * Find similar transaction rule match
   */
  private findSimilarTransactionRule(description: string): { category: string; confidence: number; accountCode?: string } | null {
    const normalizedDesc = this.createPatternFromDescription(description);
    
    for (const [pattern, rule] of this.similarTransactionRules) {
      if (normalizedDesc.includes(pattern) || pattern.includes(normalizedDesc)) {
        return {
          category: rule.category,
          confidence: rule.confidence
        };
      }
    }

    return null;
  }

  /**
   * Increment category usage counter
   */
  private incrementCategoryUsage(accountCode: string) {
    const current = this.categoryUsage.get(accountCode) || 0;
    this.categoryUsage.set(accountCode, current + 1);
  }

  /**
   * Get most used categories
   */
  getPopularCategories(): string[] {
    return Array.from(this.categoryUsage.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([accountCode]) => accountCode);
  }

  /**
   * Get user corrections
   */
  getUserCorrections(): Map<string, string> {
    return this.userCorrections;
  }

  /**
   * Get bank pattern statistics (NEW)
   */
  getBankPatternStats(): { totalPatterns: number; categories: string[] } {
    const categories = [...new Set(BANK_PATTERNS.map(p => p.merchant))];
    return {
      totalPatterns: BANK_PATTERNS.length,
      categories
    };
  }

  /**
   * Get learning statistics
   */
  getLearningStats(): {
    userCorrections: number;
    learnedPatterns: number;
    similarRules: number;
    totalUsage: number;
  } {
    const totalUsage = Array.from(this.similarTransactionRules.values())
      .reduce((sum, rule) => sum + rule.usageCount, 0);

    return {
      userCorrections: this.userCorrections.size,
      learnedPatterns: this.learnedPatterns.size,
      similarRules: this.similarTransactionRules.size,
      totalUsage
    };
  }

  /**
   * Debug method to get all learned patterns (for testing)
   */
  debugGetLearnedPatterns(): Array<{ pattern: string; category: string; confidence: number; usageCount: number }> {
    return Array.from(this.learnedPatterns.entries()).map(([pattern, data]) => ({
      pattern,
      category: data.category,
      confidence: data.confidence,
      usageCount: data.usageCount
    }));
  }

  /**
   * Debug method to test pattern matching for a specific description
   */
  debugTestPattern(description: string): {
    normalizedDescription: string;
    learnedPatterns: Array<{ pattern: string; category: string; confidence: number }>;
    matches: Array<{ pattern: string; category: string; confidence: number; matchType: string }>;
  } {
    const normalizedDesc = this.createPatternFromDescription(description);
    const allPatterns = this.debugGetLearnedPatterns();
    const matches: Array<{ pattern: string; category: string; confidence: number; matchType: string }> = [];

    for (const patternData of allPatterns) {
      if (patternData.pattern === normalizedDesc) {
        matches.push({ ...patternData, matchType: 'EXACT' });
      } else if (normalizedDesc.includes(patternData.pattern) || patternData.pattern.includes(normalizedDesc)) {
        matches.push({ ...patternData, matchType: 'PARTIAL' });
      }
    }

    return {
      normalizedDescription: normalizedDesc,
      learnedPatterns: allPatterns,
      matches
    };
  }

  /**
   * Test if a description matches bank patterns (NEW - for debugging)
   */
  testBankPattern(description: string): { matches: any[]; bestMatch: any | null } {
    const matches = BANK_PATTERNS.filter(p => p.pattern.test(description.toLowerCase()));
    const bestMatch = matches.length > 0 ? matches[0] : null;
    return { matches, bestMatch };
  }

  /**
   * Initialize Fuse.js for fuzzy matching
   */
  private initializeFuse(): void {
    this.fuse = new Fuse(MERCHANT_PATTERNS, {
      keys: ['merchant'],
      threshold: 0.3, // Lower threshold for more precise matches
      includeScore: true,
      minMatchCharLength: 3,
      distance: 100, // Allow for more distance
      ignoreLocation: true, // Ignore location for better matching
      useExtendedSearch: true
    });
  }

  /**
   * Enhanced account code suggestions based on transaction amount patterns
   */
  private getAmountBasedAccountCode(amount: number): string | null {
    const absAmount = Math.abs(amount);
    
    // Very small amounts (likely fees)
    if (absAmount <= 5) {
      return '404'; // Bank fees, service charges
    }
    
    // Common subscription amounts (exact matches)
    const subscriptionAmounts = [9.99, 12.99, 14.99, 19.99, 24.99, 29.99, 39.99, 49.99, 59.99, 79.99, 99.99];
    if (subscriptionAmounts.includes(absAmount)) {
      return '485'; // Subscriptions
    }
    
    // Common gas amounts (usually between $20-$150, often round numbers or .99)
    if (absAmount >= 20 && absAmount <= 150) {
      // Check if it's a typical gas amount (often ends in .99 or is a round number)
      const isRoundNumber = absAmount % 1 === 0;
      const endsIn99 = absAmount % 1 === 0.99;
      if (isRoundNumber || endsIn99) {
        return '449'; // Motor Vehicle Expenses (gas)
      }
    }
    
    // Common grocery amounts (usually between $30-$200)
    if (absAmount >= 30 && absAmount <= 200) {
      // Grocery amounts are often not round numbers
      if (absAmount % 1 !== 0) {
        return '453'; // Office Expenses (general purchases)
      }
    }
    
    // Common restaurant amounts (usually between $15-$100)
    if (absAmount >= 15 && absAmount <= 100) {
      // Restaurant amounts often end in .00, .50, or .99
      const lastTwoDigits = Math.round((absAmount % 1) * 100);
      if (lastTwoDigits === 0 || lastTwoDigits === 50 || lastTwoDigits === 99) {
        return '420'; // Entertainment (restaurants)
      }
    }
    
    // Large amounts (likely transfers, payments, or deposits)
    if (absAmount >= 1000) {
      // Round numbers in large amounts are likely transfers
      if (absAmount % 100 === 0) {
        return '404'; // Bank fees (transfers)
      }
      // Non-round large amounts might be payments
      return '404'; // Bank fees (payments)
    }
    
    // Medium amounts (likely regular purchases)
    if (absAmount >= 50 && absAmount < 1000) {
      return '453'; // Office Expenses (general purchases)
    }
    
    return null;
  }

  /**
   * Enhanced pattern matching for Canadian banks
   */
  private findCanadianBankPattern(description: string): { accountCode: string; merchant: string; confidence: number } | null {
    const normalizedDesc = description.toLowerCase();
    
    // Canadian bank patterns
    const bankPatterns = [
      { pattern: /td\s*canada\s*trust/i, accountCode: '404', merchant: 'TD Canada Trust', confidence: 95 },
      { pattern: /royal\s*bank\s*of\s*canada/i, accountCode: '404', merchant: 'RBC', confidence: 95 },
      { pattern: /rbc/i, accountCode: '404', merchant: 'RBC', confidence: 95 },
      { pattern: /bank\s*of\s*montreal/i, accountCode: '404', merchant: 'BMO', confidence: 95 },
      { pattern: /bmo/i, accountCode: '404', merchant: 'BMO', confidence: 95 },
      { pattern: /scotiabank/i, accountCode: '404', merchant: 'Scotiabank', confidence: 95 },
      { pattern: /cibc/i, accountCode: '404', merchant: 'CIBC', confidence: 95 },
      { pattern: /canadian\s*imperial\s*bank/i, accountCode: '404', merchant: 'CIBC', confidence: 95 },
      { pattern: /national\s*bank/i, accountCode: '404', merchant: 'National Bank', confidence: 95 },
      { pattern: /hsbc\s*canada/i, accountCode: '404', merchant: 'HSBC Canada', confidence: 95 },
      { pattern: /hsbc/i, accountCode: '404', merchant: 'HSBC', confidence: 95 },
      { pattern: /tangerine/i, accountCode: '404', merchant: 'Tangerine', confidence: 95 },
      { pattern: /pc\s*financial/i, accountCode: '404', merchant: 'PC Financial', confidence: 95 },
      { pattern: /simplii\s*financial/i, accountCode: '404', merchant: 'Simplii Financial', confidence: 95 },
      { pattern: /eq\s*bank/i, accountCode: '404', merchant: 'EQ Bank', confidence: 95 },
      { pattern: /alterna\s*bank/i, accountCode: '404', merchant: 'Alterna Bank', confidence: 95 },
      { pattern: /motive\s*financial/i, accountCode: '404', merchant: 'Motive Financial', confidence: 95 },
      { pattern: /outlook\s*financial/i, accountCode: '404', merchant: 'Outlook Financial', confidence: 95 },
      { pattern: /duca\s*credit\s*union/i, accountCode: '404', merchant: 'DUCA Credit Union', confidence: 95 },
      { pattern: /vancity/i, accountCode: '404', merchant: 'Vancity', confidence: 95 },
      { pattern: /coast\s*capital/i, accountCode: '404', merchant: 'Coast Capital', confidence: 95 },
      { pattern: /servus\s*credit\s*union/i, accountCode: '404', merchant: 'Servus Credit Union', confidence: 95 },
      { pattern: /affinity\s*credit\s*union/i, accountCode: '404', merchant: 'Affinity Credit Union', confidence: 95 },
      { pattern: /assiniboine\s*credit\s*union/i, accountCode: '404', merchant: 'Assiniboine Credit Union', confidence: 95 },
      { pattern: /cambrian\s*credit\s*union/i, accountCode: '404', merchant: 'Cambrian Credit Union', confidence: 95 },
      { pattern: /crosstown\s*credit\s*union/i, accountCode: '404', merchant: 'Crosstown Credit Union', confidence: 95 },
      { pattern: /crystal\s*credit\s*union/i, accountCode: '404', merchant: 'Crystal Credit Union', confidence: 95 },
      { pattern: /east\s*kootenay\s*community\s*credit\s*union/i, accountCode: '404', merchant: 'East Kootenay Community Credit Union', confidence: 95 },
      { pattern: /first\s*ontario\s*credit\s*union/i, accountCode: '404', merchant: 'First Ontario Credit Union', confidence: 95 },
      { pattern: /g&f\s*financial\s*group/i, accountCode: '404', merchant: 'G&F Financial Group', confidence: 95 },
      { pattern: /gulf\s*islands\s*credit\s*union/i, accountCode: '404', merchant: 'Gulf Islands Credit Union', confidence: 95 },
      { pattern: /innovation\s*credit\s*union/i, accountCode: '404', merchant: 'Innovation Credit Union', confidence: 95 },
      { pattern: /libro\s*credit\s*union/i, accountCode: '404', merchant: 'Libro Credit Union', confidence: 95 },
      { pattern: /northern\s*savings\s*credit\s*union/i, accountCode: '404', merchant: 'Northern Savings Credit Union', confidence: 95 },
      { pattern: /north\s*peace\s*savings\s*and\s*credit\s*union/i, accountCode: '404', merchant: 'North Peace Savings and Credit Union', confidence: 95 },
      { pattern: /omista\s*credit\s*union/i, accountCode: '404', merchant: 'Omista Credit Union', confidence: 95 },
      { pattern: /pacific\s*coast\s*savings\s*credit\s*union/i, accountCode: '404', merchant: 'Pacific Coast Savings Credit Union', confidence: 95 },
      { pattern: /peace\s*hills\s*trust/i, accountCode: '404', merchant: 'Peace Hills Trust', confidence: 95 },
      { pattern: /prospera\s*credit\s*union/i, accountCode: '404', merchant: 'Prospera Credit Union', confidence: 95 },
      { pattern: /saskatchewan\s*credit\s*unions/i, accountCode: '404', merchant: 'Saskatchewan Credit Unions', confidence: 95 },
      { pattern: /steinbach\s*credit\s*union/i, accountCode: '404', merchant: 'Steinbach Credit Union', confidence: 95 },
      { pattern: /sunova\s*credit\s*union/i, accountCode: '404', merchant: 'Sunova Credit Union', confidence: 95 },
      { pattern: /valley\s*first\s*credit\s*union/i, accountCode: '404', merchant: 'Valley First Credit Union', confidence: 95 },
      { pattern: /westoba\s*credit\s*union/i, accountCode: '404', merchant: 'Westoba Credit Union', confidence: 95 },
      { pattern: /windsor\s*family\s*credit\s*union/i, accountCode: '404', merchant: 'Windsor Family Credit Union', confidence: 95 },
    ];
    
    for (const pattern of bankPatterns) {
      if (pattern.pattern.test(normalizedDesc)) {
        console.log(`🏦 Canadian bank pattern matched: ${pattern.merchant}`);
        return pattern;
      }
    }
    
    return null;
  }

  /**
   * Load learned patterns from frontend for backend processing
   */
  loadLearnedPatternsFromFrontend(patterns: Record<string, any>): void {
    console.log('🧠 Loading learned patterns from frontend:', Object.keys(patterns).length, 'patterns');
    
    for (const [pattern, data] of Object.entries(patterns)) {
      if (data && typeof data === 'object' && data.category && data.confidence) {
        this.learnedPatterns.set(pattern, {
          category: data.category,
          confidence: data.confidence,
          usageCount: data.usageCount || 1,
          lastUsed: new Date()
        });
        console.log(`🧠 Loaded pattern: "${pattern}" -> ${data.category} (${data.confidence}%)`);
      }
    }
  }

  /**
   * Load learned data from localStorage (fallback)
   */
  private loadLearnedDataFromStorage(): void {
    try {
      // Only run on client side
      if (typeof window === 'undefined') {
        return;
      }

      // Load user corrections
      const savedCorrections = localStorage.getItem('meridian_user_corrections');
      if (savedCorrections) {
        const corrections = JSON.parse(savedCorrections);
        this.userCorrections = new Map(Object.entries(corrections));
      }

      // Load learned patterns
      const savedPatterns = localStorage.getItem('meridian_learned_patterns');
      if (savedPatterns) {
        const patterns = JSON.parse(savedPatterns);
        this.learnedPatterns = new Map(Object.entries(patterns));
      }

      console.log('🧠 Loaded learned data from localStorage (fallback)');
    } catch (error) {
      console.warn('⚠️ Error loading learned data from localStorage:', error);
    }
  }

  /**
   * Save learned data to localStorage (fallback)
   */
  private saveLearnedDataToStorage(): void {
    try {
      // Only run on client side
      if (typeof window === 'undefined') {
        return;
      }

      // Save user corrections
      const correctionsObj = Object.fromEntries(this.userCorrections);
      localStorage.setItem('meridian_user_corrections', JSON.stringify(correctionsObj));

      // Save learned patterns
      const patternsObj = Object.fromEntries(this.learnedPatterns);
      localStorage.setItem('meridian_learned_patterns', JSON.stringify(patternsObj));

      console.log('💾 Saved learned data to localStorage (fallback)');
    } catch (error) {
      console.warn('⚠️ Error saving learned data to localStorage:', error);
    }
  }

  /**
   * Record user correction to localStorage (fallback)
   */
  private recordUserCorrectionToStorage(originalDescription: string, correctedCategoryCode: string): void {
    const key = originalDescription.toLowerCase();
    this.userCorrections.set(key, correctedCategoryCode);
    
    // Create learned pattern
    const pattern = this.createPatternFromDescription(originalDescription);
    this.learnedPatterns.set(pattern, {
      category: correctedCategoryCode,
      confidence: 90,
      usageCount: 1,
      lastUsed: new Date()
    });
    
    console.log('📝 Recorded user correction to localStorage:', originalDescription, '->', correctedCategoryCode);
    this.saveLearnedDataToStorage();
  }

  /**
   * Create a pattern from a description for learning
   */
  private createPatternFromDescription(description: string): string {
    // Normalize the description for pattern matching
    return description
      .toLowerCase()
      .replace(/\d+/g, '#') // Replace numbers with #
      .replace(/[^\w\s#]/g, '') // Remove special characters
      .trim();
  }

  /**
   * Create pattern from description (alias for compatibility)
   */
  private createPattern(description: string): string {
    return this.createPatternFromDescription(description);
  }

  /**
   * Analyze E-Transfer context to intelligently categorize based on purpose
   */
  private analyzeETransferContext(description: string, amount: number): { category: string; confidence: number; accountCode: string } | null {
    const normalizedDesc = description.toLowerCase();
    
    // Context patterns for intelligent categorization
    const contextPatterns = [
      // Business/Professional Services
      { patterns: [/repair/i, /service/i, /maintenance/i, /fix/i], category: 'Professional Services', accountCode: '463', confidence: 85 },
      { patterns: [/contractor/i, /plumber/i, /electrician/i, /handyman/i], category: 'Professional Services', accountCode: '463', confidence: 90 },
      
      // Rent and Property
      { patterns: [/rent/i, /rental/i, /lease/i], category: 'Rent', accountCode: '620', confidence: 90 },
      { patterns: [/property/i, /apartment/i, /condo/i], category: 'Rent', accountCode: '620', confidence: 80 },
      
      // Utilities
      { patterns: [/hydro/i, /electric/i, /gas/i, /water/i, /utility/i], category: 'Utilities', accountCode: '621', confidence: 85 },
      { patterns: [/internet/i, /phone/i, /cable/i, /wifi/i], category: 'Utilities', accountCode: '621', confidence: 80 },
      
      // Personal/Family
      { patterns: [/family/i, /friend/i, /personal/i, /gift/i], category: 'Personal', accountCode: '883', confidence: 75 },
      { patterns: [/birthday/i, /wedding/i, /christmas/i, /holiday/i], category: 'Personal', accountCode: '883', confidence: 80 },
      
      // Business Expenses
      { patterns: [/supplies/i, /equipment/i, /materials/i, /tools/i], category: 'Office Supplies', accountCode: '455', confidence: 80 },
      { patterns: [/meeting/i, /conference/i, /training/i, /seminar/i], category: 'Professional Development', accountCode: '464', confidence: 85 },
      
      // Food/Entertainment
      { patterns: [/restaurant/i, /food/i, /dinner/i, /lunch/i], category: 'Entertainment', accountCode: '420', confidence: 75 },
      { patterns: [/coffee/i, /drink/i, /bar/i, /pub/i], category: 'Entertainment', accountCode: '420', confidence: 70 },
      
      // Loan/Investment
      { patterns: [/loan/i, /payment/i, /debt/i, /owe/i], category: 'Loan Payment', accountCode: '900', confidence: 85 },
      { patterns: [/invest/i, /savings/i, /deposit/i], category: 'Investment', accountCode: '610', confidence: 80 }
    ];
    
    // Check for context patterns
    for (const contextPattern of contextPatterns) {
      const matchCount = contextPattern.patterns.filter(pattern => pattern.test(normalizedDesc)).length;
      if (matchCount > 0) {
        const confidence = Math.min(95, contextPattern.confidence + (matchCount - 1) * 5);
        console.log(`🎯 E-Transfer context match: ${contextPattern.category} (${confidence}%)`);
        return {
          category: contextPattern.category,
          confidence,
          accountCode: contextPattern.accountCode
        };
      }
    }
    
    // Check for recipient names/codes that might indicate purpose
    const recipientPatterns = [
      { pattern: /\b[A-Z]{2,3}\b/, category: 'Personal', accountCode: '883', confidence: 60 }, // Initials
      { pattern: /\b\d{3,6}\b/, category: 'Business', accountCode: '404', confidence: 65 }, // Account numbers
    ];
    
    for (const recipientPattern of recipientPatterns) {
      if (recipientPattern.pattern.test(description)) {
        console.log(`📋 E-Transfer recipient pattern: ${recipientPattern.category} (${recipientPattern.confidence}%)`);
        return {
          category: recipientPattern.category,
          confidence: recipientPattern.confidence,
          accountCode: recipientPattern.accountCode
        };
      }
    }
    
    // Amount-based heuristics for e-transfers
    if (amount > 1000) {
      return { category: 'Business Payment', accountCode: '404', confidence: 70 };
    } else if (amount > 500) {
      return { category: 'Professional Services', accountCode: '463', confidence: 65 };
    } else if (amount > 100) {
      return { category: 'Personal', accountCode: '883', confidence: 60 };
    } else {
      return { category: 'Personal', accountCode: '883', confidence: 55 };
    }
  }
} 