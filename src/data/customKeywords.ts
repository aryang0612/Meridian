export interface CustomKeyword {
  id: string;
  keyword: string;
  accountCode: string;
  confidence: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomKeywordRule {
  id: string;
  keywords: string[];
  accountCode: string;
  confidence: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class CustomKeywordManager {
  private static instance: CustomKeywordManager;
  private keywords: CustomKeyword[] = [];
  private rules: CustomKeywordRule[] = [];
  private storageKey = 'meridian_custom_keywords';
  private rulesStorageKey = 'meridian_custom_rules';

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): CustomKeywordManager {
    if (!CustomKeywordManager.instance) {
      CustomKeywordManager.instance = new CustomKeywordManager();
    }
    return CustomKeywordManager.instance;
  }

  // Add a single keyword
  public addKeyword(keyword: string, accountCode: string, confidence: number = 90, description?: string): CustomKeyword {
    const newKeyword: CustomKeyword = {
      id: this.generateId(),
      keyword: keyword.toLowerCase().trim(),
      accountCode,
      confidence: Math.min(100, Math.max(0, confidence)),
      description,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Check for duplicates
    const existingIndex = this.keywords.findIndex(k => 
      k.keyword === newKeyword.keyword && k.accountCode === newKeyword.accountCode
    );

    if (existingIndex >= 0) {
      // Update existing keyword
      this.keywords[existingIndex] = { ...newKeyword, id: this.keywords[existingIndex].id };
    } else {
      this.keywords.push(newKeyword);
    }

    this.saveToStorage();
    return newKeyword;
  }

  // Add a rule with multiple keywords
  public addRule(keywords: string[], accountCode: string, confidence: number = 90, description?: string): CustomKeywordRule {
    const newRule: CustomKeywordRule = {
      id: this.generateId(),
      keywords: keywords.map(k => k.toLowerCase().trim()),
      accountCode,
      confidence: Math.min(100, Math.max(0, confidence)),
      description,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Check for duplicates
    const existingIndex = this.rules.findIndex(r => 
      r.accountCode === newRule.accountCode && 
      JSON.stringify(r.keywords.sort()) === JSON.stringify(newRule.keywords.sort())
    );

    if (existingIndex >= 0) {
      // Update existing rule
      this.rules[existingIndex] = { ...newRule, id: this.rules[existingIndex].id };
    } else {
      this.rules.push(newRule);
    }

    this.saveToStorage();
    return newRule;
  }

  // Remove a keyword
  public removeKeyword(id: string): boolean {
    const initialLength = this.keywords.length;
    this.keywords = this.keywords.filter(k => k.id !== id);
    const removed = this.keywords.length < initialLength;
    if (removed) {
      this.saveToStorage();
    }
    return removed;
  }

  // Remove a rule
  public removeRule(id: string): boolean {
    const initialLength = this.rules.length;
    this.rules = this.rules.filter(r => r.id !== id);
    const removed = this.rules.length < initialLength;
    if (removed) {
      this.saveToStorage();
    }
    return removed;
  }

  // Update a keyword
  public updateKeyword(id: string, updates: Partial<CustomKeyword>): CustomKeyword | null {
    const index = this.keywords.findIndex(k => k.id === id);
    if (index === -1) return null;

    this.keywords[index] = {
      ...this.keywords[index],
      ...updates,
      updatedAt: new Date()
    };

    this.saveToStorage();
    return this.keywords[index];
  }

  // Update a rule
  public updateRule(id: string, updates: Partial<CustomKeywordRule>): CustomKeywordRule | null {
    const index = this.rules.findIndex(r => r.id === id);
    if (index === -1) return null;

    this.rules[index] = {
      ...this.rules[index],
      ...updates,
      updatedAt: new Date()
    };

    this.saveToStorage();
    return this.rules[index];
  }

  // Get all keywords
  public getKeywords(): CustomKeyword[] {
    return [...this.keywords].sort((a, b) => a.keyword.localeCompare(b.keyword));
  }

  // Get all rules
  public getRules(): CustomKeywordRule[] {
    return [...this.rules].sort((a, b) => a.accountCode.localeCompare(b.accountCode));
  }

  // Get keywords by account code
  public getKeywordsByAccountCode(accountCode: string): CustomKeyword[] {
    return this.keywords.filter(k => k.accountCode === accountCode);
  }

  // Get rules by account code
  public getRulesByAccountCode(accountCode: string): CustomKeywordRule[] {
    return this.rules.filter(r => r.accountCode === accountCode);
  }

  // Find matching keyword for a transaction description
  public findMatchingKeyword(description: string): { keyword: CustomKeyword; confidence: number } | null {
    const normalizedDesc = description.toLowerCase();
    
    // Check single keywords first (higher priority)
    for (const keyword of this.keywords) {
      if (normalizedDesc.includes(keyword.keyword)) {
        return { keyword, confidence: keyword.confidence };
      }
    }

    // Check rules (multiple keywords)
    for (const rule of this.rules) {
      const matchCount = rule.keywords.filter(k => normalizedDesc.includes(k)).length;
      if (matchCount > 0) {
        // Calculate confidence based on how many keywords match
        const matchRatio = matchCount / rule.keywords.length;
        const adjustedConfidence = rule.confidence * matchRatio;
        
        if (adjustedConfidence >= 50) { // Minimum threshold
          return { 
            keyword: {
              id: rule.id,
              keyword: rule.keywords.join(', '),
              accountCode: rule.accountCode,
              confidence: adjustedConfidence,
              description: rule.description,
              createdAt: rule.createdAt,
              updatedAt: rule.updatedAt
            }, 
            confidence: adjustedConfidence 
          };
        }
      }
    }

    return null;
  }

  // Export keywords to JSON
  public exportKeywords(): string {
    return JSON.stringify({
      keywords: this.keywords,
      rules: this.rules,
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  // Import keywords from JSON
  public importKeywords(jsonData: string): { success: boolean; message: string } {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.keywords && Array.isArray(data.keywords)) {
        this.keywords = data.keywords.map((k: any) => ({
          ...k,
          createdAt: new Date(k.createdAt),
          updatedAt: new Date(k.updatedAt)
        }));
      }
      
      if (data.rules && Array.isArray(data.rules)) {
        this.rules = data.rules.map((r: any) => ({
          ...r,
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt)
        }));
      }
      
      this.saveToStorage();
      return { success: true, message: 'Keywords imported successfully' };
    } catch (error) {
      return { success: false, message: 'Invalid import format' };
    }
  }

  // Clear all keywords
  public clearAll(): void {
    this.keywords = [];
    this.rules = [];
    this.saveToStorage();
  }

  // Get statistics
  public getStats(): { totalKeywords: number; totalRules: number; accountCodes: string[] } {
    const accountCodes = new Set([
      ...this.keywords.map(k => k.accountCode),
      ...this.rules.map(r => r.accountCode)
    ]);
    
    return {
      totalKeywords: this.keywords.length,
      totalRules: this.rules.length,
      accountCodes: Array.from(accountCodes).sort()
    };
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private loadFromStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        const keywordsData = localStorage.getItem(this.storageKey);
        const rulesData = localStorage.getItem(this.rulesStorageKey);
        
        if (keywordsData) {
          this.keywords = JSON.parse(keywordsData).map((k: any) => ({
            ...k,
            createdAt: new Date(k.createdAt),
            updatedAt: new Date(k.updatedAt)
          }));
        }
        
        if (rulesData) {
          this.rules = JSON.parse(rulesData).map((r: any) => ({
            ...r,
            createdAt: new Date(r.createdAt),
            updatedAt: new Date(r.updatedAt)
          }));
        }
      }
    } catch (error) {
      console.error('Error loading custom keywords from storage:', error);
      this.keywords = [];
      this.rules = [];
    }
  }

  private saveToStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.storageKey, JSON.stringify(this.keywords));
        localStorage.setItem(this.rulesStorageKey, JSON.stringify(this.rules));
      }
    } catch (error) {
      console.error('Error saving custom keywords to storage:', error);
    }
  }
} 