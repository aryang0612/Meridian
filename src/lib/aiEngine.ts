import { Transaction } from './types';
import { ChartOfAccounts } from './chartOfAccounts';
// REMOVED: import { MERCHANT_PATTERNS, findMerchantPattern } from '../data/merchants'; // Now using unified pattern engine
import Fuse from 'fuse.js';
import { DatabaseService } from './databaseService';
import { UnifiedCategorizationEngine } from './unifiedCategorizationEngine';
import { unifiedPatternEngine } from './unifiedPatternEngine';
import { CacheUtils } from './performanceOptimizer';

// Utility to determine inflow/outflow - STANDARDIZED LOGIC
export function getInflowOutflow(transaction: Transaction, accountCode: string): 'inflow' | 'outflow' {
  // Standardized inflow/outflow logic to fix inconsistencies
  const amount = transaction.amount;
  
  // Revenue accounts (200-299) - positive amounts are inflows (money coming in)
  if (['200', '220', '260', '270'].includes(accountCode)) {
    return amount > 0 ? 'inflow' : 'outflow';
  }
  
  // Asset accounts (Cash, Bank) - positive amounts are inflows (deposits)
  if (['610', '620'].includes(accountCode)) {
    return amount > 0 ? 'inflow' : 'outflow';
  }
  
  // All expense accounts (400-799) - negative amounts are outflows (money going out)
  // Positive amounts for expenses are unusual but still outflows
  const accountCodeNum = parseInt(accountCode);
  if (accountCodeNum >= 400 && accountCodeNum <= 799) {
    return 'outflow';
  }
  
  // Default: negative amounts = outflow, positive = inflow
  return amount < 0 ? 'outflow' : 'inflow';
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
  private fuse: Fuse<any> | null = null; // Fuse.js instance for fuzzy matching
  private unifiedCategorizationEngine: UnifiedCategorizationEngine;

  constructor(province: string = 'ON', userId?: string, organizationId?: string) {
    this.province = province;
    this.userId = userId; // Store userId for API calls
    // Use singleton Chart of Accounts instance to prevent multiple initializations
    this.chartOfAccounts = ChartOfAccounts.getInstance(province);
    this.databaseService = DatabaseService.getInstance();
    this.unifiedCategorizationEngine = UnifiedCategorizationEngine.getInstance(province, userId);
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
  async categorizeTransaction(transaction: Transaction): Promise<{
    category: string;
    confidence: number;
    accountCode: string;
    inflowOutflow: 'inflow' | 'outflow';
  }> {
    const description = transaction.description || '';
    const amount = transaction.amount;
    const isPositive = amount > 0;

    console.log(`🔍 Categorizing: "${description}" (${amount})`);

    // Use standardized inflow/outflow logic from the exported function

    // 0. Use unified categorization engine FIRST (highest priority)
    let unifiedResult: any = null;
    try {
      unifiedResult = await this.unifiedCategorizationEngine.categorizeTransaction(transaction);
      if (unifiedResult.confidence >= 85) {
        console.log(`✅ Unified categorization matched: ${unifiedResult.category} (${unifiedResult.confidence}%)`);
        return {
          category: unifiedResult.category,
          confidence: unifiedResult.confidence,
          accountCode: unifiedResult.accountCode,
          inflowOutflow: unifiedResult.inflowOutflow
        };
      }
    } catch (error) {
      console.warn('Unified categorization engine error:', error);
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
                      accountCode: '877', // Tracking Transfers account code
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
    
    // Use unifiedPatternEngine for consistent pattern matching
    const result = unifiedPatternEngine.findBestMatch(description);
    if (result) {
      console.log(`✅ Unified pattern matched: ${result.pattern.pattern.source} -> ${result.pattern.merchant}`);
      this.incrementCategoryUsage(result.pattern.accountCode);
      return { 
        accountCode: result.pattern.accountCode, 
        merchant: result.pattern.merchant, 
        confidence: result.confidence 
      };
    }
    
    console.log(`❌ No bank patterns matched`);
    return null;
  }

  /**
   * Categorize a batch of transactions
   */
  async categorizeBatch(transactions: Transaction[]): Promise<Transaction[]> {
    // Chart of accounts is always ready
    const results = await Promise.all(transactions.map(async t => {
      const result = await this.categorizeTransaction(t);
      return {
        ...t,
        category: result.category,
        confidence: result.confidence,
        accountCode: result.accountCode,
        inflowOutflow: result.inflowOutflow
      };
    }));
    return results;
  }

  /**
   * Find exact pattern match using unified pattern engine
   */
  private findExactPattern(description: string): { accountCode: string; merchant: string } | null {
    const result = unifiedPatternEngine.findBestMatch(description);
    if (result) {
      this.incrementCategoryUsage(result.pattern.accountCode);
      return { 
        accountCode: result.pattern.accountCode, 
        merchant: result.pattern.merchant 
      };
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
   * Note: This functionality is now handled by the unified categorization engine
   */
  private findKeywordMatch(description: string): { accountCode: string; confidence: number } | null {
    // Keywords are now handled by the unified categorization engine
    // This method is kept for backward compatibility but returns null
    // The unified categorization engine includes all keyword functionality
    console.log('ℹ️ Keyword matching is now handled by the unified categorization engine');
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
        'E-Transfer': '877', // Tracking Transfers account
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
      
      // Invalidate cache since patterns changed
      CacheUtils.invalidateCache('user_correction');
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
    
    // Invalidate cache since patterns changed
    CacheUtils.invalidateCache('similar_action_learning');
    
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
    const stats = unifiedPatternEngine.getStats();
    const categories = unifiedPatternEngine.getPatternsByCategory('bank').map(p => p.merchant);
    return {
      totalPatterns: stats.totalPatterns,
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
    const allMatches = unifiedPatternEngine.findAllMatches(description);
    const matches = allMatches.map(m => m.pattern);
    const bestMatch = unifiedPatternEngine.findBestMatch(description);
    return { matches, bestMatch: bestMatch?.pattern || null };
  }

  /**
   * Initialize Fuse.js for fuzzy matching using unified patterns
   */
  private initializeFuse(): void {
    // Get all merchant patterns from unified engine
    const merchantPatterns = unifiedPatternEngine.getPatternsByCategory('merchant');
    
    this.fuse = new Fuse(merchantPatterns, {
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
    
        // Context patterns for intelligent categorization (FIXED: Updated to use only valid Ontario account codes)
    const contextPatterns = [
      // Business/Professional Services
      { patterns: [/repair/i, /service/i, /maintenance/i, /fix/i], category: 'Professional Services', accountCode: '441', confidence: 85 },
      { patterns: [/contractor/i, /plumber/i, /electrician/i, /handyman/i], category: 'Professional Services', accountCode: '441', confidence: 90 },
      
      // Rent and Property
      { patterns: [/rent/i, /rental/i, /lease/i], category: 'Rent', accountCode: '469', confidence: 90 },
      { patterns: [/property/i, /apartment/i, /condo/i], category: 'Rent', accountCode: '469', confidence: 80 },
      
      // Utilities
      { patterns: [/hydro/i, /electric/i, /gas/i, /water/i, /utility/i], category: 'Utilities', accountCode: '442', confidence: 85 },
      { patterns: [/internet/i, /phone/i, /cable/i, /wifi/i], category: 'Utilities', accountCode: '489', confidence: 80 },
      
      // Personal/Family
      { patterns: [/family/i, /friend/i, /personal/i, /gift/i], category: 'Personal', accountCode: '877', confidence: 75 },
      { patterns: [/birthday/i, /wedding/i, /christmas/i, /holiday/i], category: 'Personal', accountCode: '877', confidence: 80 },
      
      // Business Expenses
      { patterns: [/supplies/i, /equipment/i, /materials/i, /tools/i], category: 'Office Supplies', accountCode: '455', confidence: 80 },
      { patterns: [/meeting/i, /conference/i, /training/i, /seminar/i], category: 'Professional Development', accountCode: '453', confidence: 85 },
      
      // Food/Entertainment
      { patterns: [/restaurant/i, /food/i, /dinner/i, /lunch/i], category: 'Entertainment', accountCode: '420', confidence: 75 },
      { patterns: [/coffee/i, /drink/i, /bar/i, /pub/i], category: 'Entertainment', accountCode: '420', confidence: 70 },
      
      // Loan/Investment
      { patterns: [/loan/i, /payment/i, /debt/i, /owe/i], category: 'Loan Payment', accountCode: '800', confidence: 85 },
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
      { pattern: /\b[A-Z]{2,3}\b/, category: 'Personal', accountCode: '877', confidence: 60 }, // Initials
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
    
    // Amount-based heuristics for e-transfers (FIXED: Updated to use only valid Ontario account codes)
    if (amount > 1000) {
      return { category: 'Business Payment', accountCode: '404', confidence: 70 };
    } else if (amount > 500) {
      return { category: 'Professional Services', accountCode: '441', confidence: 65 };
    } else if (amount > 100) {
      return { category: 'Personal', accountCode: '877', confidence: 60 };
    } else {
      return { category: 'Personal', accountCode: '877', confidence: 55 };
    }
  }
} 