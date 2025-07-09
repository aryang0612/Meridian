import { Transaction } from './types';
import { AIEngine } from './aiEngine';
import { ChartOfAccounts } from './chartOfAccounts';

export interface AICategorizationResult {
  accountCode: string;
  confidence: number;
  reasoning: string;
  suggestedKeyword?: string;
}

export class AICategorizationService {
  private aiEngine: AIEngine | null = null;
  private chartOfAccounts: ChartOfAccounts | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    try {
      this.chartOfAccounts = new ChartOfAccounts('ON');
      this.aiEngine = new AIEngine('ON');
      this.isInitialized = true;
      console.log('✅ AI Categorization Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize AI Categorization Service:', error);
    }
  }

  isAvailable(): boolean {
    return this.isInitialized && this.aiEngine !== null;
  }

  async categorizeTransaction(params: {
    transaction: Transaction;
    province?: string;
  }): Promise<AICategorizationResult | null> {
    if (!this.isAvailable()) {
      console.warn('AI Categorization Service not available');
      return null;
    }

    const { transaction, province = 'ON' } = params;

    try {
      // Get AI categorization with reasoning (uses learned patterns first)
      const result = await this.getAICategorizationWithReasoning(transaction);
      
      if (result) {
        return result;
      }

      // Fallback to local AI engine
      return this.getLocalCategorization(transaction);
    } catch (error) {
      console.error('Error in AI categorization:', error);
      return null;
    }
  }

  /**
   * Force ChatGPT categorization (for AI button clicks)
   */
  async forceAICategorization(params: {
    transaction: Transaction;
    province?: string;
  }): Promise<AICategorizationResult | null> {
    if (!this.isAvailable()) {
      console.warn('AI Categorization Service not available');
      return null;
    }

    const { transaction, province = 'ON' } = params;

    try {
      // Force ChatGPT categorization (skip learned patterns)
      const result = await this.getForceAICategorization(transaction);
      
      if (result) {
        return result;
      }

      // Fallback to local AI engine
      return this.getLocalCategorization(transaction);
    } catch (error) {
      console.error('Error in forced AI categorization:', error);
      return null;
    }
  }

  private async getAICategorizationWithReasoning(transaction: Transaction): Promise<AICategorizationResult | null> {
    try {
      // Get learned patterns from the global AI engine if available
      let learnedPatterns = {};
      if (typeof window !== 'undefined' && (window as any).aiEngine) {
        const aiEngine = (window as any).aiEngine;
        const patterns = aiEngine.debugGetLearnedPatterns();
        learnedPatterns = patterns.reduce((acc: any, pattern: any) => {
          acc[pattern.pattern] = {
            category: pattern.category,
            confidence: pattern.confidence,
            usageCount: pattern.usageCount
          };
          return acc;
        }, {});
      }

      // Get user ID from global AI engine if available
      let userId: string | undefined;
      if (typeof window !== 'undefined' && (window as any).aiEngine) {
        const aiEngine = (window as any).aiEngine;
        userId = aiEngine.userId; // This will be set by the AIEngine constructor
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add user ID header if available
      if (userId) {
        headers['x-user-id'] = userId;
      }

      const response = await fetch('/api/ai-categorize', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          transaction: {
            description: transaction.description,
            amount: transaction.amount,
            date: transaction.date
          },
          learnedPatterns,
          forceAI: false // Only use ChatGPT when AI button is explicitly clicked
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle both nested and flat response formats
      const result = data.result || data;
      
      console.log('🔍 AI API Response:', result);
      
      return result;
    } catch (error) {
      console.warn('AI API failed, falling back to local categorization:', error);
      return null;
    }
  }

  private async getForceAICategorization(transaction: Transaction): Promise<AICategorizationResult | null> {
    try {
      // Get user ID from global AI engine if available
      let userId: string | undefined;
      if (typeof window !== 'undefined' && (window as any).aiEngine) {
        const aiEngine = (window as any).aiEngine;
        userId = aiEngine.userId; // This will be set by the AIEngine constructor
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add user ID header if available
      if (userId) {
        headers['x-user-id'] = userId;
      }

      const response = await fetch('/api/ai-categorize', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          transaction: {
            description: transaction.description,
            amount: transaction.amount,
            date: transaction.date
          },
          forceAI: true // Force ChatGPT categorization
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle both nested and flat response formats
      const result = data.result || data;
      
      console.log('🔍 AI API Response:', result);
      
      return result;
    } catch (error) {
      console.warn('AI API failed, falling back to local categorization:', error);
      return null;
    }
  }

  private getLocalCategorization(transaction: Transaction): AICategorizationResult | null {
    if (!this.aiEngine) return null;

    try {
      const result = this.aiEngine.categorizeTransaction(transaction);
      
      // Generate reasoning based on the categorization method
      const reasoning = this.generateReasoning(transaction, result);
      
      // Suggest keyword if it's a good candidate
      const suggestedKeyword = this.suggestKeyword(transaction, result);

      return {
        accountCode: result.accountCode,
        confidence: result.confidence,
        reasoning,
        suggestedKeyword
      };
    } catch (error) {
      console.error('Local categorization failed:', error);
      return null;
    }
  }

  private generateReasoning(transaction: Transaction, result: any): string {
    const { description, amount } = transaction;
    const { accountCode, confidence } = result;

    // Get account name
    const accountName = this.chartOfAccounts?.getAccount(accountCode)?.name || 'Unknown Account';

    // Generate specific reasoning based on transaction type
    const lowerDesc = description.toLowerCase();
    
    // Credit Card Payment reasoning
    if (lowerDesc.includes('visa') || lowerDesc.includes('mastercard') || lowerDesc.includes('credit card') || lowerDesc.includes('amex')) {
      return `Credit Card Payment (${confidence}%): This is a payment to settle existing credit card debt. The description "${description}" indicates payment to a credit card account, which is an internal transfer to pay off previously incurred expenses.`;
    }
    
    // Internal Transfer reasoning
    if (lowerDesc.includes('internal transfer') || lowerDesc.includes('account transfer') || lowerDesc.includes('savings to chequing') || lowerDesc.includes('chequing to savings')) {
      return `Internal Transfer (${confidence}%): This is a transfer between accounts at the same bank. The description "${description}" indicates movement of funds between your own accounts, not a payment to an external party.`;
    }
    
    // Bank Fee reasoning
    if (lowerDesc.includes('fee') || lowerDesc.includes('charge') || lowerDesc.includes('service charge') || lowerDesc.includes('monthly fee')) {
      return `Bank Fee (${confidence}%): This is a bank service charge. The description "${description}" indicates a fee charged by the bank for services, not a payment to an external vendor.`;
    }
    
    // E-Transfer reasoning
    if (lowerDesc.includes('e-transfer') || lowerDesc.includes('etransfer') || lowerDesc.includes('interac')) {
      return `E-Transfer (${confidence}%): This is an electronic money transfer. The description "${description}" indicates sending or receiving money electronically, which requires manual account assignment.`;
    }
    
    // Bill Payment reasoning
    if (lowerDesc.includes('bill payment') && !lowerDesc.includes('visa') && !lowerDesc.includes('mastercard')) {
      return `Bill Payment (${confidence}%): This is a payment to an external vendor. The description "${description}" indicates paying a bill to a service provider or vendor.`;
    }

    // Generate general reasoning based on confidence level
    if (confidence >= 90) {
      return `High confidence categorization (${confidence}%): This transaction matches known patterns for "${accountName}". The description "${description}" and amount $${amount.toFixed(2)} align with typical ${accountName.toLowerCase()} transactions.`;
    } else if (confidence >= 70) {
      return `Good confidence categorization (${confidence}%): Based on similar transaction patterns, this appears to be "${accountName}". The description "${description}" suggests this type of transaction.`;
    } else if (confidence >= 50) {
      return `Moderate confidence categorization (${confidence}%): This transaction may be "${accountName}" based on partial pattern matching. Please review the categorization.`;
    } else {
      return `Low confidence categorization (${confidence}%): Limited pattern matching for "${description}". Suggested as "${accountName}" but manual review recommended.`;
    }
  }

  private suggestKeyword(transaction: Transaction, result: any): string | undefined {
    const { description, amount } = transaction;
    const { confidence } = result;

    // Only suggest keywords for high-confidence categorizations
    if (confidence < 80) return undefined;

    // Extract potential merchant name from description
    const cleanDescription = description.toLowerCase()
      .replace(/^\d+\s*/, '') // Remove leading numbers
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();

    // Don't suggest keywords for generic descriptions
    const genericPatterns = [
      /^deposit$/,
      /^credit$/,
      /^debit$/,
      /^transfer$/,
      /^payment$/,
      /^withdrawal$/,
      /^atm/,
      /^e-transfer/,
      /^interac/,
      /^cheque/,
      /^check/
    ];

    if (genericPatterns.some(pattern => pattern.test(cleanDescription))) {
      return undefined;
    }

    // Extract merchant name (first few words, capitalized)
    const words = cleanDescription.split(' ').slice(0, 3);
    const merchantName = words
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return merchantName.length > 2 ? merchantName : undefined;
  }
}

// Export singleton instance
export const aiCategorizationService = new AICategorizationService(); 