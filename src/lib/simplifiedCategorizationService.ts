import { Transaction } from './types';
import { unifiedPatternEngine } from './unifiedPatternEngine';
import { ChartOfAccounts } from './chartOfAccounts';
import { CustomKeywordManager } from '../data/customKeywords';

// Simplified categorization result
export interface CategorizationResult {
  category: string;
  confidence: number;
  accountCode: string;
  inflowOutflow: 'inflow' | 'outflow';
  source: 'pattern' | 'keyword' | 'fallback';
  merchant?: string;
}

// Simplified categorization service
export class SimplifiedCategorizationService {
  private chartOfAccounts: ChartOfAccounts;
  private customKeywordManager: CustomKeywordManager;
  private userCorrections: Map<string, string> = new Map();
  private province: string;

  constructor(province: string = 'ON') {
    this.province = province;
    this.chartOfAccounts = new ChartOfAccounts(province);
    this.customKeywordManager = CustomKeywordManager.getInstance();
  }

  /**
   * Main categorization method - simplified and clear
   */
  categorizeTransaction(transaction: Transaction): CategorizationResult {
    const description = transaction.description?.trim() || '';
    
    // Step 1: Check for user corrections first
    const userCorrection = this.userCorrections.get(description.toLowerCase());
    if (userCorrection) {
      return this.buildResult(userCorrection, 100, 'pattern', transaction.amount);
    }

    // Step 2: Check unified patterns
    const patternMatch = unifiedPatternEngine.findBestMatch(description);
    if (patternMatch) {
      return this.buildResult(
        patternMatch.pattern.accountCode,
        patternMatch.confidence,
        'pattern',
        transaction.amount,
        patternMatch.pattern.merchant
      );
    }

    // Step 3: Check custom keywords
    const keywordMatch = this.customKeywordManager.findMatchingKeyword(description);
    if (keywordMatch) {
      return this.buildResult(keywordMatch.keyword.accountCode, keywordMatch.confidence, 'keyword', transaction.amount);
    }

    // Step 4: Fallback categorization
    return this.getFallbackCategory(transaction);
  }

  /**
   * Batch categorization for multiple transactions
   */
  categorizeTransactions(transactions: Transaction[]): Transaction[] {
    return transactions.map(transaction => {
      const result = this.categorizeTransaction(transaction);
      
      return {
        ...transaction,
        category: result.category,
        accountCode: result.accountCode,
        confidence: result.confidence,
        inflowOutflow: result.inflowOutflow,
        merchant: result.merchant || transaction.merchant
      };
    });
  }

  /**
   * Build categorization result with proper inflow/outflow logic
   */
  private buildResult(
    accountCode: string,
    confidence: number,
    source: 'pattern' | 'keyword' | 'fallback',
    amount: number,
    merchant?: string
  ): CategorizationResult {
    const account = this.chartOfAccounts.getAccount(accountCode);
    const category = account?.name || 'Unknown';
    const inflowOutflow = this.determineInflowOutflow(accountCode, amount);

    return {
      category,
      confidence,
      accountCode,
      inflowOutflow,
      source,
      merchant
    };
  }

  /**
   * Clear inflow/outflow determination
   */
  private determineInflowOutflow(accountCode: string, amount: number): 'inflow' | 'outflow' {
    // Revenue accounts - positive amounts are inflows
    if (['200', '220', '260', '270'].includes(accountCode)) {
      return amount > 0 ? 'inflow' : 'outflow';
    }
    
    // Asset accounts (Cash, Bank) - positive amounts are inflows (deposits)
    if (['610', '620'].includes(accountCode)) {
      return amount > 0 ? 'inflow' : 'outflow';
    }
    
    // All other accounts - positive amounts are typically outflows (expenses)
    return amount > 0 ? 'outflow' : 'inflow';
  }

  /**
   * Fallback categorization for unmatched transactions
   */
  private getFallbackCategory(transaction: Transaction): CategorizationResult {
    const amount = transaction.amount;
    
    // Simple fallback logic based on amount
    if (amount > 0) {
      // Positive amount - likely an expense
      return this.buildResult('453', 70, 'fallback', amount); // General expenses
    } else {
      // Negative amount - likely income or refund
      return this.buildResult('200', 70, 'fallback', amount); // General income
    }
  }

  /**
   * Record user correction for future learning
   */
  recordUserCorrection(originalDescription: string, correctedAccountCode: string): void {
    this.userCorrections.set(originalDescription.toLowerCase(), correctedAccountCode);
  }

  /**
   * Get user corrections for persistence
   */
  getUserCorrections(): Map<string, string> {
    return new Map(this.userCorrections);
  }

  /**
   * Load user corrections from storage
   */
  loadUserCorrections(corrections: Record<string, string>): void {
    this.userCorrections.clear();
    Object.entries(corrections).forEach(([key, value]) => {
      this.userCorrections.set(key, value);
    });
  }

  /**
   * Get service statistics
   */
  getStats(): {
    totalPatterns: number;
    userCorrections: number;
    customKeywords: number;
    patternEngineStats: any;
  } {
    return {
      totalPatterns: unifiedPatternEngine.getStats().totalPatterns,
      userCorrections: this.userCorrections.size,
      customKeywords: this.customKeywordManager.getKeywords().length,
      patternEngineStats: unifiedPatternEngine.getStats()
    };
  }

  /**
   * Test categorization for debugging
   */
  testCategorization(description: string): {
    allMatches: Array<{
      pattern: any;
      confidence: number;
    }>;
    bestMatch: any;
    finalResult: CategorizationResult;
  } {
    const testTransaction: Transaction = {
      id: 'test',
      date: new Date().toISOString().split('T')[0],
      description,
      originalDescription: description,
      amount: 100,
      category: '',
      accountCode: '',
      confidence: 0
    };

    const allMatches = unifiedPatternEngine.findAllMatches(description);
    const bestMatch = unifiedPatternEngine.findBestMatch(description);
    const finalResult = this.categorizeTransaction(testTransaction);

    return {
      allMatches,
      bestMatch,
      finalResult
    };
  }
}

// Export singleton instance
export const simplifiedCategorizationService = new SimplifiedCategorizationService(); 