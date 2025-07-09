import { Transaction } from './types';
import { categorizationCache, patternCache, CacheUtils, performanceTracker } from './performanceOptimizer';

// Unified Pattern Interface
export interface UnifiedPattern {
  pattern: RegExp;
  merchant: string;
  accountCode: string;
  confidence: number;
  priority: number; // Higher priority = checked first
  category: 'bank' | 'merchant' | 'financial' | 'system';
  description?: string;
}

// Pattern Categories with Clear Priorities
export const UNIFIED_PATTERNS: UnifiedPattern[] = [
  // =============================================================================
  // PRIORITY 1: BANK SYSTEM PATTERNS (Highest Priority)
  // =============================================================================
  
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
  
  // Internal Transfers (Account Code: 610)
  { pattern: /internal\s*transfer/i, merchant: 'Internal Transfer', accountCode: '610', confidence: 95, priority: 90, category: 'bank' },
  { pattern: /account\s*transfer/i, merchant: 'Account Transfer', accountCode: '610', confidence: 95, priority: 90, category: 'bank' },
  { pattern: /atm\s*withdrawal/i, merchant: 'ATM Withdrawal', accountCode: '610', confidence: 95, priority: 90, category: 'bank' },
  { pattern: /atm\s*deposit/i, merchant: 'ATM Deposit', accountCode: '610', confidence: 95, priority: 90, category: 'bank' },
  
  // Credit Card & Loan Payments (Account Code: 900)
  { pattern: /credit\s*card\s*payment/i, merchant: 'Credit Card Payment', accountCode: '900', confidence: 95, priority: 85, category: 'financial' },
  { pattern: /loan\s*payment/i, merchant: 'Loan Payment', accountCode: '900', confidence: 95, priority: 85, category: 'financial' },
  { pattern: /mortgage\s*payment/i, merchant: 'Mortgage Payment', accountCode: '900', confidence: 95, priority: 85, category: 'financial' },
  { pattern: /visa\s*payment/i, merchant: 'Visa Payment', accountCode: '900', confidence: 95, priority: 85, category: 'financial' },
  { pattern: /mastercard\s*payment/i, merchant: 'Mastercard Payment', accountCode: '900', confidence: 95, priority: 85, category: 'financial' },
  
  // =============================================================================
  // PRIORITY 2: HIGH-CONFIDENCE MERCHANT PATTERNS
  // =============================================================================
  
  // Food & Restaurants (Account Code: 420)
  { pattern: /tim\s*hortons?/i, merchant: 'Tim Hortons', accountCode: '420', confidence: 96, priority: 80, category: 'merchant' },
  { pattern: /starbucks/i, merchant: 'Starbucks', accountCode: '420', confidence: 96, priority: 80, category: 'merchant' },
  { pattern: /mcdonald'?s/i, merchant: 'McDonalds', accountCode: '420', confidence: 96, priority: 80, category: 'merchant' },
  { pattern: /subway/i, merchant: 'Subway', accountCode: '420', confidence: 94, priority: 80, category: 'merchant' },
  { pattern: /pizza\s*pizza/i, merchant: 'Pizza Pizza', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /domino'?s/i, merchant: 'Dominos', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /a&w/i, merchant: 'A&W', accountCode: '420', confidence: 95, priority: 80, category: 'merchant' },
  
  // Gas Stations & Automotive (Account Code: 449)
  { pattern: /shell(?:\s|$)/i, merchant: 'Shell', accountCode: '449', confidence: 96, priority: 80, category: 'merchant' },
  { pattern: /petro[\s-]?canada/i, merchant: 'Petro-Canada', accountCode: '449', confidence: 96, priority: 80, category: 'merchant' },
  { pattern: /esso/i, merchant: 'Esso', accountCode: '449', confidence: 96, priority: 80, category: 'merchant' },
  { pattern: /husky/i, merchant: 'Husky', accountCode: '449', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /chevron/i, merchant: 'Chevron', accountCode: '449', confidence: 95, priority: 80, category: 'merchant' },
  { pattern: /jiffy\s*lube/i, merchant: 'Jiffy Lube', accountCode: '449', confidence: 94, priority: 80, category: 'merchant' },
  { pattern: /canadian\s*tire/i, merchant: 'Canadian Tire', accountCode: '449', confidence: 85, priority: 75, category: 'merchant' },
  
  // Grocery & Retail (Account Code: 453)
  { pattern: /walmart/i, merchant: 'Walmart', accountCode: '453', confidence: 96, priority: 75, category: 'merchant' },
  { pattern: /costco/i, merchant: 'Costco', accountCode: '453', confidence: 96, priority: 75, category: 'merchant' },
  { pattern: /sobeys/i, merchant: 'Sobeys', accountCode: '453', confidence: 96, priority: 75, category: 'merchant' },
  { pattern: /safeway/i, merchant: 'Safeway', accountCode: '453', confidence: 96, priority: 75, category: 'merchant' },
  { pattern: /superstore/i, merchant: 'Superstore', accountCode: '453', confidence: 96, priority: 75, category: 'merchant' },
  { pattern: /no\s*frills/i, merchant: 'No Frills', accountCode: '453', confidence: 96, priority: 75, category: 'merchant' },
  { pattern: /metro/i, merchant: 'Metro', accountCode: '453', confidence: 85, priority: 70, category: 'merchant' },
  { pattern: /shoppers\s*drug\s*mart/i, merchant: 'Shoppers Drug Mart', accountCode: '453', confidence: 96, priority: 75, category: 'merchant' },
  
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
  
  // Software & Technology (Account Code: 485)
  { pattern: /microsoft/i, merchant: 'Microsoft', accountCode: '485', confidence: 95, priority: 75, category: 'merchant' },
  { pattern: /google/i, merchant: 'Google', accountCode: '485', confidence: 95, priority: 75, category: 'merchant' },
  { pattern: /adobe/i, merchant: 'Adobe', accountCode: '485', confidence: 95, priority: 75, category: 'merchant' },
  { pattern: /quickbooks/i, merchant: 'QuickBooks', accountCode: '485', confidence: 95, priority: 75, category: 'merchant' },
  { pattern: /zoom/i, merchant: 'Zoom', accountCode: '485', confidence: 95, priority: 75, category: 'merchant' },
  { pattern: /slack/i, merchant: 'Slack', accountCode: '485', confidence: 95, priority: 75, category: 'merchant' },
  
  // Travel & Transportation (Account Code: 493)
  { pattern: /air\s*canada/i, merchant: 'Air Canada', accountCode: '493', confidence: 96, priority: 75, category: 'merchant' },
  { pattern: /westjet/i, merchant: 'WestJet', accountCode: '493', confidence: 96, priority: 75, category: 'merchant' },
  { pattern: /uber/i, merchant: 'Uber', accountCode: '493', confidence: 95, priority: 75, category: 'merchant' },
  { pattern: /expedia/i, merchant: 'Expedia', accountCode: '493', confidence: 95, priority: 75, category: 'merchant' },
  { pattern: /booking\.com/i, merchant: 'Booking.com', accountCode: '493', confidence: 95, priority: 75, category: 'merchant' },
  
  // Insurance (Account Code: 433)
  { pattern: /wawanesa/i, merchant: 'Wawanesa Insurance', accountCode: '433', confidence: 96, priority: 75, category: 'merchant' },
  { pattern: /intact/i, merchant: 'Intact Insurance', accountCode: '433', confidence: 96, priority: 75, category: 'merchant' },
  { pattern: /cooperators/i, merchant: 'Cooperators', accountCode: '433', confidence: 96, priority: 75, category: 'merchant' },
  { pattern: /manulife/i, merchant: 'Manulife', accountCode: '433', confidence: 96, priority: 75, category: 'merchant' },
  
  // Professional Services (Account Code: 412)
  { pattern: /lawyer/i, merchant: 'Legal Services', accountCode: '412', confidence: 95, priority: 70, category: 'merchant' },
  { pattern: /accountant/i, merchant: 'Accounting Services', accountCode: '412', confidence: 95, priority: 70, category: 'merchant' },
  { pattern: /consultant/i, merchant: 'Consulting Services', accountCode: '412', confidence: 90, priority: 65, category: 'merchant' },
  
  // Government Services (Account Code: 505)
  { pattern: /cra/i, merchant: 'Canada Revenue Agency', accountCode: '505', confidence: 96, priority: 75, category: 'merchant' },
  { pattern: /service\s*canada/i, merchant: 'Service Canada', accountCode: '505', confidence: 96, priority: 75, category: 'merchant' },
  { pattern: /service\s*ontario/i, merchant: 'Service Ontario', accountCode: '505', confidence: 96, priority: 75, category: 'merchant' },
  
  // =============================================================================
  // PRIORITY 3: MEDIUM CONFIDENCE PATTERNS
  // =============================================================================
  
  // Generic Deposits (Account Code: 200)
  { pattern: /^deposit$/i, merchant: 'Deposit', accountCode: '200', confidence: 80, priority: 50, category: 'financial' },
  { pattern: /^credit$/i, merchant: 'Credit', accountCode: '200', confidence: 80, priority: 50, category: 'financial' },
  { pattern: /direct\s*deposit/i, merchant: 'Direct Deposit', accountCode: '200', confidence: 97, priority: 55, category: 'financial' },
  { pattern: /payroll\s*deposit/i, merchant: 'Payroll Deposit', accountCode: '200', confidence: 97, priority: 55, category: 'financial' },
  
  // Generic Transfers (Account Code: 610)
  { pattern: /^transfer$/i, merchant: 'Transfer', accountCode: '610', confidence: 80, priority: 50, category: 'bank' },
  { pattern: /online\s*banking\s*transfer/i, merchant: 'Online Transfer', accountCode: '610', confidence: 85, priority: 55, category: 'bank' },
  
  // Generic Payments (Account Code: 453)
  { pattern: /^payment$/i, merchant: 'Payment', accountCode: '453', confidence: 80, priority: 50, category: 'system' },
  { pattern: /bill\s*payment/i, merchant: 'Bill Payment', accountCode: '453', confidence: 80, priority: 50, category: 'system' },
  { pattern: /online\s*payment/i, merchant: 'Online Payment', accountCode: '453', confidence: 85, priority: 55, category: 'system' },
  
  // =============================================================================
  // PRIORITY 4: LOW CONFIDENCE FALLBACK PATTERNS
  // =============================================================================
  
  // Generic Categories (Lower confidence for manual review)
  { pattern: /^withdrawal$/i, merchant: 'Withdrawal', accountCode: '610', confidence: 80, priority: 20, category: 'system' },
  { pattern: /^purchase$/i, merchant: 'Purchase', accountCode: '453', confidence: 80, priority: 20, category: 'system' },
  { pattern: /^debit$/i, merchant: 'Debit', accountCode: '453', confidence: 70, priority: 20, category: 'system' },
  { pattern: /^miscellaneous$/i, merchant: 'Miscellaneous', accountCode: '453', confidence: 70, priority: 20, category: 'system' },
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
    
    // Check cache first
    const cacheKey = CacheUtils.generateCacheKey(transaction);
    const cached = categorizationCache.get(cacheKey);
    
    if (cached && CacheUtils.isCacheValid(cached.timestamp)) {
      stopTimer();
      const inflowOutflow: 'inflow' | 'outflow' = transaction.amount < 0 ? 'outflow' : 'inflow';
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
    
    const inflowOutflow: 'inflow' | 'outflow' = transaction.amount < 0 ? 'outflow' : 'inflow';
    
    if (match) {
      const { pattern } = match;
      result = {
        category: pattern.merchant,
        accountCode: pattern.accountCode,
        confidence: pattern.confidence,
        merchant: pattern.merchant,
        inflowOutflow
      };
    } else {
      // Default fallback
      result = {
        category: 'Unknown',
        accountCode: '453',
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
   * Get pattern statistics
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