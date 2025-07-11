import { Transaction } from './types';
import { ChartOfAccounts } from './chartOfAccounts';
import { unifiedCategorizationEngine } from './unifiedCategorizationEngine';
import { performanceTracker } from './performanceOptimizer';

export interface AICategorizationResult {
  accountCode: string;
  confidence: number;
  reasoning?: string;
  suggestedKeyword?: string;
  source: 'training' | 'pattern' | 'chatgpt' | 'chatgpt-corrected' | 'local';
}

export class AICategorizationService {
  private chartOfAccounts: ChartOfAccounts;
  private province: string;
  private initialized: boolean = false;

  constructor(province: string = 'ON') {
    this.province = province;
    this.chartOfAccounts = ChartOfAccounts.getInstance();
  }

  async initialize() {
    await this.chartOfAccounts.setProvince(this.province);
    await this.chartOfAccounts.waitForInitialization();
    this.initialized = true;
  }

  isAvailable(): boolean {
    return this.initialized && this.chartOfAccounts.isReady();
  }

  async forceAICategorization({ transaction, province }: { transaction: Transaction, province: string }): Promise<AICategorizationResult | null> {
    // Update province if different
    if (province !== this.province) {
      this.province = province;
      await this.chartOfAccounts.setProvince(province);
      await this.chartOfAccounts.waitForInitialization();
    }

    // Force AI categorization (skip pattern matching)
    return this.callAICategorization(transaction);
  }

  async categorizeTransaction(transaction: Transaction): Promise<AICategorizationResult> {
    const stopTimer = performanceTracker.startTimer('ai_categorization');
    
    try {
      // Call the API directly for AI categorization (bypassing unified engine for now)
      const result = await this.callAICategorization(transaction);
      
      stopTimer();
      
      if (result) {
        console.log('✅ AI categorization service result:', result);
        return result;
      }
      
      // Fallback to error state
      return {
        accountCode: '453',
        confidence: 0,
        reasoning: 'AI categorization failed',
        source: 'local'
      };

    } catch (error) {
      console.error('Error in AI categorization service:', error);
      stopTimer();
      return {
        accountCode: '453',
        confidence: 0,
        reasoning: 'Error occurred during categorization',
        source: 'local'
      };
    }
  }

  private async callAICategorization(transaction: Transaction): Promise<AICategorizationResult | null> {
    try {
      const response = await fetch('/api/ai-categorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction,
          province: this.province,
          forceAI: true,
          clearCache: true // Always get fresh results for AI button
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      return {
        accountCode: result.accountCode,
        confidence: result.confidence || 75,
        reasoning: result.reasoning || 'AI categorization',
        suggestedKeyword: result.suggestedKeyword,
        source: 'chatgpt'
      };

    } catch (error) {
      console.error('AI categorization API call failed:', error);
      return null;
    }
  }

  // Test method for debugging
  async testCategorization(description: string, amount: number): Promise<AICategorizationResult> {
    const transaction: Transaction = {
      id: Date.now().toString(),
      description,
      originalDescription: description,
      amount,
      date: new Date().toISOString().split('T')[0],
      category: '',
      accountCode: ''
    };

    return this.categorizeTransaction(transaction);
  }
}

// Export singleton instance that auto-initializes
export const aiCategorizationService = new AICategorizationService();

// Auto-initialize the singleton
aiCategorizationService.initialize().catch(error => {
  console.error('Failed to initialize AI categorization service:', error);
}); 