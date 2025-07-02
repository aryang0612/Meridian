import { Transaction } from './types';
import { ChartOfAccounts } from './chartOfAccounts';
import { MERCHANT_PATTERNS } from '../data/merchants';
import { CATEGORY_MAPPINGS } from '../data/categoryMappings';
import Fuse from 'fuse.js';

// Bank transaction patterns from training data
const BANK_PATTERNS = [
  // Bank Fees
  { pattern: /overdrawn\s*handling\s*charge/i, category: 'Bank Fees', subcategory: 'Bank Fees', confidence: 95 },
  { pattern: /service\s*charge/i, category: 'Bank Fees', subcategory: 'Bank Fees', confidence: 95 },
  { pattern: /monthly\s*account\s*fee/i, category: 'Bank Fees', subcategory: 'Bank Fees', confidence: 95 },
  { pattern: /monthly\s*plan\s*fee/i, category: 'Bank Fees', subcategory: 'Bank Fees', confidence: 95 },
  { pattern: /wire\s*transfer\s*fee/i, category: 'Bank Fees', subcategory: 'Bank Fees', confidence: 95 },
  { pattern: /atm\s*withdrawal\s*fee/i, category: 'Bank Fees', subcategory: 'Bank Fees', confidence: 95 },
  { pattern: /certified\s*cheque\s*fee/i, category: 'Bank Fees', subcategory: 'Bank Fees', confidence: 95 },
  { pattern: /stop\s*payment\s*fee/i, category: 'Bank Fees', subcategory: 'Bank Fees', confidence: 95 },
  { pattern: /draft\s*fee/i, category: 'Bank Fees', subcategory: 'Bank Fees', confidence: 95 },
  { pattern: /account\s*maintenance\s*fee/i, category: 'Bank Fees', subcategory: 'Bank Fees', confidence: 95 },
  { pattern: /tdms\s*stmt.*bus/i, category: 'Bank Fees', subcategory: 'Bank Fees', confidence: 95 },
  { pattern: /td\s*bus\s*credit\s*ins/i, category: 'Bank Fees', subcategory: 'Bank Fees', confidence: 95 },
  { pattern: /cash\s*dep\s*fee/i, category: 'Bank Fees', subcategory: 'Bank Fees', confidence: 95 },
  { pattern: /send\s*e[\-\s]*tfr\s*fee/i, category: 'Bank Fees', subcategory: 'Bank Fees', confidence: 95 },
  { pattern: /cheque\s*charge/i, category: 'Bank Fees', subcategory: 'Bank Fees', confidence: 95 },

  // Interest and Investment Income
  { pattern: /interest\s*paid/i, category: 'Interest Income', subcategory: 'Interest Income', confidence: 95 },
  { pattern: /interest\s*earned/i, category: 'Interest Income', subcategory: 'Interest Income', confidence: 95 },
  { pattern: /interest\s*credit/i, category: 'Interest Income', subcategory: 'Interest Income', confidence: 95 },
  { pattern: /interest\s*on\s*deposit/i, category: 'Interest Income', subcategory: 'Interest Income', confidence: 95 },
  { pattern: /investment\s*income/i, category: 'Interest Income', subcategory: 'Investment Income', confidence: 95 },
  { pattern: /dividend/i, category: 'Interest Income', subcategory: 'Dividends', confidence: 95 },

  // E-Transfers (Special handling - no account code assigned)
  { pattern: /send\s*e[\-\s]*tfr(?!\s*fee)/i, category: 'E-Transfer', subcategory: 'E-Transfer', confidence: 95 },
  { pattern: /e[\-\s]*transfer(?!\s*fee)/i, category: 'E-Transfer', subcategory: 'E-Transfer', confidence: 90 },
  { pattern: /interac\s*e[\-\s]*transfer/i, category: 'E-Transfer', subcategory: 'E-Transfer', confidence: 95 },
  { pattern: /etransfer/i, category: 'E-Transfer', subcategory: 'E-Transfer', confidence: 90 },

  // Other Transfers
  { pattern: /mb[\-\s]*transfer/i, category: 'Bank Related', subcategory: 'Transfers', confidence: 95 },
  { pattern: /electronic\s*funds\s*transfer/i, category: 'Bank Related', subcategory: 'Transfers', confidence: 95 },
  { pattern: /[a-z]{2}\d{3}\s*tfr[\-\s]*to/i, category: 'Bank Related', subcategory: 'Transfers', confidence: 95 },
  { pattern: /[a-z]{2}\d{3}\s*tfr[\-\s]*fr/i, category: 'Bank Related', subcategory: 'Transfers', confidence: 95 },

  // NSF Fees
  { pattern: /nsf\s*cheque\s*returned/i, category: 'Bank Fees', subcategory: 'NSF Fees', confidence: 95 },
  { pattern: /nsf\s*handling\s*charge/i, category: 'Bank Fees', subcategory: 'NSF Fees', confidence: 95 },
  { pattern: /nsf\s*paid\s*fee/i, category: 'Bank Fees', subcategory: 'NSF Fees', confidence: 95 },

  // Overdraft
  { pattern: /overdraft\s*interest/i, category: 'Bank Fees', subcategory: 'Overdraft', confidence: 95 },
  { pattern: /overdrawn\s*handling/i, category: 'Bank Fees', subcategory: 'Overdraft', confidence: 95 },

  // Bill Payments
  { pattern: /mb[\-\s]*bill\s*payment/i, category: 'Bank Related', subcategory: 'Bill Payments', confidence: 95 },
  { pattern: /dominion\s*prem\s*msp/i, category: 'Bank Related', subcategory: 'Bill Payments', confidence: 95 },
  { pattern: /bell\s*canada\s*eft\s*bpy/i, category: 'Bank Related', subcategory: 'Bill Payments', confidence: 95 },
  { pattern: /wawanesa\s*ins/i, category: 'Bank Related', subcategory: 'Bill Payments', confidence: 95 },
  { pattern: /iol\s*pay\s*to:\s*cra/i, category: 'Bank Related', subcategory: 'Bill Payments', confidence: 95 },
  { pattern: /stripe\s*msp/i, category: 'Bank Related', subcategory: 'Bill Payments', confidence: 95 },

  // Loan Payments
  { pattern: /term\s*loans/i, category: 'Bank Related', subcategory: 'Loan Payments', confidence: 95 },
  { pattern: /santander\s*consumer/i, category: 'Bank Related', subcategory: 'Loan Payments', confidence: 95 },

  // Payroll
  { pattern: /payroll\s*pay/i, category: 'Bank Related', subcategory: 'Payroll', confidence: 95 },
  { pattern: /payroll\s*deposit/i, category: 'Bank Related', subcategory: 'Payroll', confidence: 95 },

  // Special Fees
  { pattern: /foreign\s*exchange\s*fee/i, category: 'Bank Fees', subcategory: 'Special Fees', confidence: 95 },
  { pattern: /lc\/lg\s*fee/i, category: 'Bank Fees', subcategory: 'Special Fees', confidence: 95 },

  // Card Transactions
  { pattern: /td\s*visa\s*preauth\s*pymt/i, category: 'Bank Related', subcategory: 'Card Transactions', confidence: 95 },
  { pattern: /td\s*mc\s*\d+/i, category: 'Bank Related', subcategory: 'Card Transactions', confidence: 95 },
  { pattern: /td\s*idp\s*\d+/i, category: 'Bank Related', subcategory: 'Card Transactions', confidence: 95 },
  { pattern: /td\s*visa\d+/i, category: 'Bank Related', subcategory: 'Card Transactions', confidence: 95 },

  // Credits
  { pattern: /acct\s*bal\s*rebate/i, category: 'Bank Related', subcategory: 'Credits', confidence: 95 },

  // Deposits
  { pattern: /deposit.*free\s*interac\s*e[\-\s]*transfer/i, category: 'Bank Related', subcategory: 'Deposits', confidence: 95 },
  { pattern: /government\s*canada/i, category: 'Bank Related', subcategory: 'Deposits', confidence: 90 },
  { pattern: /gc\s*\d+[\-\s]*deposit/i, category: 'Bank Related', subcategory: 'Deposits', confidence: 95 },
  { pattern: /td\s*atm\s*dep/i, category: 'Bank Related', subcategory: 'Deposits', confidence: 95 },

  // Enhanced Transfer Patterns (from training data)
  { pattern: /[a-z]{2}\d{3}\s*tfr[\-\s]*to\s*\d+/i, category: 'Bank Related', subcategory: 'Transfers', confidence: 95 },
  { pattern: /[a-z]{2}\d{3}\s*tfr[\-\s]*to(?!\s*fee)/i, category: 'Bank Related', subcategory: 'Transfers', confidence: 95 },

  // Enhanced Monthly Fees
  { pattern: /monthly\s*plan\s*fee/i, category: 'Bank Fees', subcategory: 'Bank Fees', confidence: 95 },

  // Rejected/Reversed Transactions
  { pattern: /gm\s*reject\s*item/i, category: 'Bank Related', subcategory: 'Other Bank', confidence: 95 },
  { pattern: /gm\s*reject\s*item\s*rev/i, category: 'Bank Related', subcategory: 'Credits', confidence: 95 },
  { pattern: /rtd\s*partial\s*payment/i, category: 'Bank Related', subcategory: 'Other Bank', confidence: 95 },

  // Account Management
  { pattern: /open\s*account/i, category: 'Bank Related', subcategory: 'Other Bank', confidence: 95 },

  // Other Bank
  { pattern: /debit\s*memo/i, category: 'Bank Related', subcategory: 'Other Bank', confidence: 95 },

  // BT Records Specific Patterns (NEW)
  { pattern: /chq#\d+/i, category: 'General Expenses', subcategory: 'Cheques', confidence: 95 },
  { pattern: /iol\s*serviceontario/i, category: 'General Expenses', subcategory: 'Government Services', confidence: 95 },
  { pattern: /iol\s*pay\s*to:\s*cra/i, category: 'Tax Payments', subcategory: 'CRA Payments', confidence: 95 },
  { pattern: /stripe\s*msp/i, category: 'Revenue', subcategory: 'Payment Processing', confidence: 95 },
  { pattern: /mobile\s*deposit/i, category: 'Revenue', subcategory: 'Deposits', confidence: 95 },
  { pattern: /balance\s*forward/i, category: 'Bank Related', subcategory: 'Account Balance', confidence: 95 },
  { pattern: /the\s*garage\s*part/i, category: 'Motor Vehicle Expenses', subcategory: 'Auto Parts', confidence: 90 },
  { pattern: /wawanesa\s*ins/i, category: 'Insurance', subcategory: 'Business Insurance', confidence: 95 },
  { pattern: /dominion\s*prem\s*msp/i, category: 'General Expenses', subcategory: 'Premiums', confidence: 95 },
  { pattern: /bell\s*canada\s*eft\s*bpy/i, category: 'Telecommunications', subcategory: 'Phone/Internet', confidence: 95 },
  { pattern: /payroll\s*pay/i, category: 'Payroll', subcategory: 'Employee Wages', confidence: 95 },

  // ATM, Cash, Debit Card, Transfer, Purchase, Miscellaneous (Ambiguous, handle both inflow/outflow)
  { pattern: /^atm$/i, category: 'Cash', subcategory: 'ATM Withdrawal', confidence: 90 },
  { pattern: /^cash$/i, category: 'Cash', subcategory: 'Cash Transaction', confidence: 90 },
  { pattern: /^debit card$/i, category: 'Bank Related', subcategory: 'Debit Card', confidence: 90 },
  { pattern: /^transfer$/i, category: 'Bank Related', subcategory: 'Transfer', confidence: 90 },
  { pattern: /^purchase$/i, category: 'General Expenses', subcategory: 'Purchase', confidence: 90 },
  { pattern: /^miscellaneous$/i, category: 'Other', subcategory: 'Miscellaneous', confidence: 80 },
];

// Utility to determine inflow/outflow
export function getInflowOutflow(transaction: Transaction, category: string): 'inflow' | 'outflow' {
  // If amount is positive and category is income, treat as inflow
  if (transaction.amount > 0) {
    if (category.toLowerCase().includes('income') || category.toLowerCase().includes('revenue') || category.toLowerCase().includes('deposit') || category.toLowerCase().includes('refund') || category.toLowerCase().includes('credit')) {
      return 'inflow';
    }
    // ATM, Cash, Transfer, etc. with positive amount = inflow (deposit)
    if (["atm", "cash", "transfer", "debit card", "miscellaneous", "purchase"].includes((transaction.description || '').toLowerCase())) {
      return 'inflow';
    }
    // Default: positive is inflow
    return 'inflow';
  } else {
    // Negative amount
    if (category.toLowerCase().includes('expense') || category.toLowerCase().includes('fee') || category.toLowerCase().includes('withdrawal') || category.toLowerCase().includes('purchase') || category.toLowerCase().includes('payment')) {
      return 'outflow';
    }
    // ATM, Cash, Transfer, etc. with negative amount = outflow (withdrawal)
    if (["atm", "cash", "transfer", "debit card", "miscellaneous", "purchase"].includes((transaction.description || '').toLowerCase())) {
      return 'outflow';
    }
    // Default: negative is outflow
    return 'outflow';
  }
}

export class AIEngine {
  private chartOfAccounts: ChartOfAccounts;
  private userCorrections: Map<string, string> = new Map();
  private categoryUsage: Map<string, number> = new Map();
  private learnedPatterns: Map<string, { category: string; confidence: number; usageCount: number; lastUsed: Date }> = new Map();
  private similarTransactionRules: Map<string, { pattern: string; category: string; accountCode?: string; confidence: number; usageCount: number }> = new Map();

  constructor(province: string = 'ON') {
    this.chartOfAccounts = new ChartOfAccounts(province);
    this.loadLearnedData();
  }

  /**
   * Initialize the AI engine and wait for chart of accounts to load
   */
  async initialize(): Promise<void> {
    await this.chartOfAccounts.waitForInitialization();
  }

  /**
   * Load learned data from localStorage
   */
  private loadLearnedData(): void {
    try {
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

      // Load similar transaction rules (from cycle emoji actions)
      const savedRules = localStorage.getItem('meridian_similar_rules');
      if (savedRules) {
        const rules = JSON.parse(savedRules);
        this.similarTransactionRules = new Map(Object.entries(rules));
      }

      console.log('🧠 Loaded learned data:', {
        corrections: this.userCorrections.size,
        patterns: this.learnedPatterns.size,
        rules: this.similarTransactionRules.size
      });
    } catch (error) {
      console.warn('⚠️ Error loading learned data:', error);
    }
  }

  /**
   * Save learned data to localStorage
   */
  private saveLearnedData(): void {
    try {
      // Save user corrections
      const correctionsObj = Object.fromEntries(this.userCorrections);
      localStorage.setItem('meridian_user_corrections', JSON.stringify(correctionsObj));

      // Save learned patterns
      const patternsObj = Object.fromEntries(this.learnedPatterns);
      localStorage.setItem('meridian_learned_patterns', JSON.stringify(patternsObj));

      // Save similar transaction rules
      const rulesObj = Object.fromEntries(this.similarTransactionRules);
      localStorage.setItem('meridian_similar_rules', JSON.stringify(rulesObj));

      console.log('💾 Saved learned data');
    } catch (error) {
      console.warn('⚠️ Error saving learned data:', error);
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
    const description = transaction.originalDescription || transaction.description;
    const amount = Math.abs(transaction.amount);
    const isPositive = transaction.amount > 0;

    console.log(`🔍 Categorizing: "${description}" (${transaction.amount})`);

    // 1. Check learned patterns first (highest priority)
    const learnedMatch = this.findLearnedPattern(description);
    if (learnedMatch) {
      console.log(`🧠 Learned pattern match: ${learnedMatch.category} (${learnedMatch.confidence}%)`);
      return {
        category: learnedMatch.category,
        confidence: learnedMatch.confidence,
        accountCode: learnedMatch.accountCode || this.getAccountCode(learnedMatch.category, amount),
        inflowOutflow: getInflowOutflow(transaction, learnedMatch.category)
      };
    }

    // 2. Check user corrections
    const userCorrection = this.userCorrections.get(description.toLowerCase());
    if (userCorrection) {
      console.log(`👤 User correction applied: ${userCorrection}`);
      return {
        category: userCorrection,
        confidence: 95,
        accountCode: this.getAccountCode(userCorrection, amount),
        inflowOutflow: getInflowOutflow(transaction, userCorrection)
      };
    }

    // 3. Check similar transaction rules (from cycle emoji actions)
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

    // Special handling for E-TRANSFER based on amount
    if (/e[\-\s]*transfer(?!\s*fee)/i.test(description.toLowerCase())) {
      const category = isPositive ? 'Revenue' : 'Bank Related';
      const subcategory = isPositive ? 'E-Transfer Income' : 'E-Transfer Out';
      console.log(`✅ E-TRANSFER amount-based: ${category} (${subcategory})`);
      return {
        category,
        confidence: 90,
        accountCode: this.getAccountCode(category, amount),
        inflowOutflow: getInflowOutflow(transaction, category)
      };
    }

    // 1. Try bank transaction patterns first (highest priority)
    const bankMatch = this.findBankPattern(description);
    if (bankMatch) {
      const inflowOutflow = getInflowOutflow(transaction, bankMatch.category);
      console.log(`✅ Bank pattern match: ${bankMatch.category} (${bankMatch.confidence}%)`);
      return {
        category: bankMatch.category,
        confidence: bankMatch.confidence,
        accountCode: this.getAccountCode(bankMatch.category, amount),
        inflowOutflow
      };
    }

    // 2. Try exact merchant pattern matching
    const exactMatch = this.findExactPattern(description);
    if (exactMatch) {
      console.log(`✅ Exact merchant match: ${exactMatch.category}`);
      return {
        category: exactMatch.category,
        confidence: 95,
        accountCode: this.getAccountCode(exactMatch.category, amount),
        inflowOutflow: getInflowOutflow(transaction, exactMatch.category)
      };
    }

    // 3. Try fuzzy matching with merchant patterns
    const fuzzyMatch = this.findFuzzyPattern(description);
    if (fuzzyMatch && fuzzyMatch.score < 0.3) {
      console.log(`✅ Fuzzy merchant match: ${fuzzyMatch.category} (score: ${fuzzyMatch.score})`);
      return {
        category: fuzzyMatch.category,
        confidence: Math.max(70, 90 - (fuzzyMatch.score * 100)),
        accountCode: this.getAccountCode(fuzzyMatch.category, amount),
        inflowOutflow: getInflowOutflow(transaction, fuzzyMatch.category)
      };
    }

    // 4. Try enhanced keyword-based categorization
    const keywordMatch = this.findKeywordMatch(description);
    if (keywordMatch) {
      const inflowOutflow = getInflowOutflow(transaction, keywordMatch.category);
      console.log(`✅ Keyword match: ${keywordMatch.category} (${keywordMatch.confidence}%)`);
      return {
        category: keywordMatch.category,
        confidence: keywordMatch.confidence,
        accountCode: this.getAccountCode(keywordMatch.category, amount),
        inflowOutflow
      };
    }

    // 5. Try amount-based heuristics
    const amountMatch = this.findAmountBasedCategory(amount);
    if (amountMatch) {
      const inflowOutflow = getInflowOutflow(transaction, amountMatch.category);
      console.log(`⚠️ Amount-based fallback: ${amountMatch.category} (${amountMatch.confidence}%)`);
      return {
        category: amountMatch.category,
        confidence: amountMatch.confidence,
        accountCode: this.getAccountCode(amountMatch.category, amount),
        inflowOutflow
      };
    }

    // 6. Check user corrections
    const correction = this.userCorrections.get(description.toLowerCase());
    if (correction) {
      console.log(`✅ User correction: ${correction}`);
      return {
        category: correction,
        confidence: 85,
        accountCode: this.getAccountCode(correction, amount),
        inflowOutflow: getInflowOutflow(transaction, correction)
      };
    }

    // Default to Suspense/Uncategorized for ambiguous cases
    const inflowOutflow = transaction.amount > 0 ? 'inflow' : 'outflow';
    return {
      category: 'Suspense/Uncategorized',
      confidence: 0,
      accountCode: '',
      inflowOutflow
    };
  }

  /**
   * Find bank transaction patterns (NEW - from training data)
   */
  private findBankPattern(description: string): { category: string; confidence: number } | null {
    const normalizedDesc = description.toLowerCase();
    
    console.log(`🔍 Testing bank patterns for: "${normalizedDesc}"`);
    
    // Special handling for E-TRANSFER based on amount
    if (/e[\-\s]*transfer(?!\s*fee)/i.test(normalizedDesc)) {
      // This will be handled in categorizeTransaction based on amount
      console.log(`⚠️ E-TRANSFER detected, skipping bank patterns`);
      return null;
    }
    
    for (const pattern of BANK_PATTERNS) {
      if (pattern.pattern.test(normalizedDesc)) {
        console.log(`✅ Bank pattern matched: ${pattern.pattern.source} -> ${pattern.category}`);
        this.incrementCategoryUsage(pattern.category);
        return { 
          category: pattern.category, 
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
  async categorizeBatch(transactions: Transaction[]): Promise<Transaction[]> {
    // Ensure chart of accounts is initialized before categorizing
    await this.chartOfAccounts.waitForInitialization();
    
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
  private findExactPattern(description: string): { category: string } | null {
    const normalizedDesc = description.toLowerCase();
    
    for (const pattern of MERCHANT_PATTERNS) {
      if (pattern.pattern.test(normalizedDesc)) {
        this.incrementCategoryUsage(pattern.category);
        return { category: pattern.category };
      }
    }
    
    return null;
  }

  /**
   * Find fuzzy pattern match using Fuse.js
   */
  private findFuzzyPattern(description: string): { category: string; score: number } | null {
    const fuse = new Fuse(MERCHANT_PATTERNS, {
      keys: ['patterns'],
      threshold: 0.4,
      includeScore: true
    });

    const results = fuse.search(description);
    if (results.length > 0) {
      const bestMatch = results[0];
      this.incrementCategoryUsage(bestMatch.item.category);
      return {
        category: bestMatch.item.category,
        score: bestMatch.score || 1
      };
    }
    
    return null;
  }

  /**
   * Enhanced keyword-based matches (IMPROVED with training data)
   */
  private findKeywordMatch(description: string): { category: string; confidence: number } | null {
    const normalizedDesc = description.toLowerCase();
    
    // Enhanced keyword patterns with training data insights
    const keywordPatterns = [
      // Interest and Investment Income
      { keywords: ['interest', 'dividend', 'investment income'], category: 'Interest Income', confidence: 90 },
      
      // Bank Fees and Charges
      { keywords: ['fee', 'charge', 'service charge', 'monthly fee', 'plan fee'], category: 'Bank Fees', confidence: 85 },
      
      // Gas stations and fuel
      { keywords: ['gas', 'fuel', 'petro', 'shell', 'esso', 'mobil', 'canadian tire gas'], category: 'Motor Vehicle Expenses', confidence: 85 },
      
      // Coffee and quick food
      { keywords: ['coffee', 'starbucks', 'tim hortons', 'dunkin', 'subway'], category: 'Meals & Entertainment', confidence: 90 },
      
      // Restaurants and food
      { keywords: ['restaurant', 'pizza', 'burger', 'swiss chalet', 'pizza hut', 'mcdonald'], category: 'Meals & Entertainment', confidence: 90 },
      
      // Retail and shopping
      { keywords: ['walmart', 'costco', 'canadian tire', 'home depot', 'loblaws', 'metro', 'zehrs'], category: 'Office Supplies', confidence: 75 },
      
      // Pharmacy and health
      { keywords: ['shoppers drug mart', 'pharmacy', 'medical'], category: 'Office Supplies', confidence: 80 },
      
      // Alcohol and liquor
      { keywords: ['lcbo', 'liquor', 'beer', 'wine'], category: 'Meals & Entertainment', confidence: 85 },
      
      // Transportation
      { keywords: ['uber', 'lyft', 'taxi', 'cab'], category: 'Motor Vehicle Expenses', confidence: 90 },
      
      // Technology and subscriptions
      { keywords: ['netflix', 'spotify', 'apple', 'google'], category: 'Telecommunications', confidence: 85 },
      
      // Bank-related (general catch-all)
      { keywords: ['bank', 'td', 'rbc', 'bmo', 'scotiabank'], category: 'Bank Fees', confidence: 80 },
      
      // Office supplies
      { keywords: ['staples', 'office depot', 'best buy'], category: 'Office Supplies', confidence: 85 },
      
      // Point of sale patterns (from training data)
      { keywords: ['point of sale purchase'], category: 'Meals & Entertainment', confidence: 70 },

      // BT Records specific keywords (NEW)
      { keywords: ['chq#', 'cheque'], category: 'General Expenses', confidence: 85 },
      { keywords: ['iol', 'serviceontario'], category: 'General Expenses', confidence: 85 },
      { keywords: ['stripe'], category: 'Revenue', confidence: 85 },
      { keywords: ['mobile deposit'], category: 'Revenue', confidence: 85 },
      { keywords: ['balance forward'], category: 'Bank Related', confidence: 85 },
      { keywords: ['garage', 'auto parts'], category: 'Motor Vehicle Expenses', confidence: 85 },
      { keywords: ['wawanesa'], category: 'Insurance', confidence: 85 },
      { keywords: ['dominion'], category: 'General Expenses', confidence: 85 },
      { keywords: ['bell canada'], category: 'Telecommunications', confidence: 85 },
      { keywords: ['payroll'], category: 'Payroll', confidence: 85 },
      { keywords: ['cra', 'tax'], category: 'Tax Payments', confidence: 85 }
    ];

    for (const pattern of keywordPatterns) {
      if (pattern.keywords.some(keyword => normalizedDesc.includes(keyword))) {
        this.incrementCategoryUsage(pattern.category);
        return {
          category: pattern.category,
          confidence: pattern.confidence
        };
      }
    }
    
    return null;
  }

  /**
   * Enhanced amount-based categorization (IMPROVED)
   */
  private findAmountBasedCategory(amount: number): { category: string; confidence: number } | null {
    // Enhanced amount-based heuristics from training data analysis
    if (amount < 5) {
      return { category: 'Bank Fees', confidence: 60 }; // Small amounts often bank fees
    } else if (amount >= 5 && amount < 20) {
      return { category: 'Meals & Entertainment', confidence: 55 }; // Coffee, fast food
    } else if (amount >= 20 && amount < 100) {
      return { category: 'Meals & Entertainment', confidence: 50 }; // Restaurant meals
    } else if (amount >= 100 && amount < 500) {
      return { category: 'Office Supplies', confidence: 45 }; // Shopping, supplies
    } else if (amount >= 500 && amount < 2000) {
      return { category: 'General Expenses', confidence: 30 }; // Services, equipment - lower confidence
    } else if (amount >= 2000) {
      return { category: 'General Expenses', confidence: 25 }; // Large expenses - much lower confidence
    }
    
    return null;
  }

  /**
   * Get account code for a category
   */
  private getAccountCode(category: string, amount: number): string {
    // Special handling for E-Transfers - no account code assigned
    if (category === 'E-Transfer') {
      return '';
    }
    
    const account = this.chartOfAccounts.findAccountByCategory(category);
    return account ? account.code : '';
  }

  /**
   * Record user correction for learning
   */
  recordUserCorrection(originalDescription: string, originalCategory: string, correctedCategory: string) {
    const key = originalDescription.toLowerCase();
    this.userCorrections.set(key, correctedCategory);
    this.incrementCategoryUsage(correctedCategory);
    console.log(`📝 Recorded user correction: "${originalDescription}" -> "${correctedCategory}"`);
    this.saveLearnedData();
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
        pattern,
        category,
        accountCode,
        confidence: 85,
        usageCount: similarTransactions.length
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
   * Find learned pattern match
   */
  private findLearnedPattern(description: string): { category: string; confidence: number; accountCode?: string } | null {
    const normalizedDesc = this.createPatternFromDescription(description);
    
    // Check for exact matches first
    for (const [pattern, data] of this.learnedPatterns) {
      if (pattern === normalizedDesc) {
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
        return {
          category: data.category,
          confidence: Math.max(70, data.confidence - 10),
          accountCode: undefined
        };
      }
    }

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
          confidence: rule.confidence,
          accountCode: rule.accountCode
        };
      }
    }

    return null;
  }

  /**
   * Increment category usage counter
   */
  private incrementCategoryUsage(category: string) {
    const current = this.categoryUsage.get(category) || 0;
    this.categoryUsage.set(category, current + 1);
  }

  /**
   * Get most used categories
   */
  getPopularCategories(): string[] {
    return Array.from(this.categoryUsage.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([category]) => category);
  }

  /**
   * Get user corrections
   */
  getUserCorrections(): Map<string, string> {
    return new Map(this.userCorrections);
  }

  /**
   * Get bank pattern statistics (NEW)
   */
  getBankPatternStats(): { totalPatterns: number; categories: string[] } {
    const categories = [...new Set(BANK_PATTERNS.map(p => p.category))];
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
   * Test if a description matches bank patterns (NEW - for debugging)
   */
  testBankPattern(description: string): { matches: any[]; bestMatch: any | null } {
    const matches = BANK_PATTERNS.filter(p => p.pattern.test(description.toLowerCase()));
    const bestMatch = matches.length > 0 ? matches[0] : null;
    return { matches, bestMatch };
  }
} 