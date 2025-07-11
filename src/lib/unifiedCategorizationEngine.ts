import { Transaction } from './types';
import { ChartOfAccounts } from './chartOfAccounts';
import { DatabaseService } from './databaseService';
import { categorizationCache, patternCache, CacheUtils, performanceTracker } from './performanceOptimizer';
import { openAIClient } from './openaiClient';
import Fuse from 'fuse.js';

// =============================================================================
// UNIFIED CATEGORIZATION INTERFACES
// =============================================================================

export interface CategorizationResult {
  category: string;
  accountCode: string;
  confidence: number;
  reasoning: string;
  source: 'pattern' | 'learned' | 'keyword' | 'chatgpt' | 'fallback';
  merchant?: string;
  inflowOutflow: 'inflow' | 'outflow';
  suggestedKeyword?: string;
}

export interface CategorizationPattern {
  id: string;
  pattern: RegExp;
  merchant: string;
  accountCode: string;
  confidence: number;
  priority: number;
  category: 'bank' | 'merchant' | 'financial' | 'system' | 'training' | 'learned' | 'keyword';
  province?: string;
  description?: string;
  source: 'system' | 'user' | 'ai';
  active: boolean;
  created_at?: Date;
  last_used?: Date;
  usage_count?: number;
}

// =============================================================================
// UNIFIED CATEGORIZATION ENGINE - SINGLE SOURCE OF TRUTH
// =============================================================================

export class UnifiedCategorizationEngine {
  private static instance: UnifiedCategorizationEngine | null = null;
  private patterns: CategorizationPattern[] = [];
  private chartOfAccounts: ChartOfAccounts;
  private databaseService: DatabaseService;
  private fuse: Fuse<any> | null = null;
  private isInitialized = false;
  private province: string;
  private userId?: string;

  private constructor(province: string = 'ON', userId?: string) {
    this.province = province;
    this.userId = userId;
    this.chartOfAccounts = ChartOfAccounts.getInstance(province);
    this.databaseService = DatabaseService.getInstance();
  }

  static getInstance(province: string = 'ON', userId?: string): UnifiedCategorizationEngine {
    if (!UnifiedCategorizationEngine.instance) {
      UnifiedCategorizationEngine.instance = new UnifiedCategorizationEngine(province, userId);
    }
    return UnifiedCategorizationEngine.instance;
  }

  // =============================================================================
  // INITIALIZATION - LOAD ALL PATTERNS FROM ALL SOURCES
  // =============================================================================

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const stopTimer = performanceTracker.startTimer('unified_engine_init');
    
    try {
      // Initialize Chart of Accounts
      await this.chartOfAccounts.waitForInitialization();
      
      // Load all patterns from different sources
      await this.loadSystemPatterns();
      await this.loadLearnedPatterns();
      // Note: Custom keywords are now integrated into the training data patterns
      
      // Sort patterns by priority (highest first)
      this.patterns.sort((a, b) => b.priority - a.priority);
      
      // Initialize fuzzy search
      this.initializeFuzzySearch();
      
      this.isInitialized = true;
      console.log(`✅ Unified Categorization Engine initialized with ${this.patterns.length} patterns`);
      console.log(`🎯 Pattern Priority Order: Training Data (120) > System (105-115) > Learned (110)`);
      
    } catch (error) {
      console.error('Failed to initialize Unified Categorization Engine:', error);
      throw error;
    } finally {
      stopTimer();
    }
  }

  // =============================================================================
  // SINGLE CATEGORIZATION ENTRY POINT
  // =============================================================================

  async categorizeTransaction(transaction: Transaction): Promise<CategorizationResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const stopTimer = performanceTracker.startTimer('unified_categorization');
    
    try {
      // Check cache first
      const cacheKey = CacheUtils.generateCacheKey(transaction, { 
        province: this.province, 
        userId: this.userId || 'default' 
      });
      const cached = categorizationCache.get(cacheKey);
      
      if (cached && CacheUtils.isCacheValid(cached.timestamp)) {
        stopTimer();
        return this.buildResult(cached, 'cached');
      }

      // 1. Try pattern matching (all patterns sorted by priority)
      const patternResult = await this.tryPatternMatching(transaction);
      if (patternResult && patternResult.confidence >= 85) {
        this.cacheResult(cacheKey, patternResult);
        stopTimer();
        return patternResult;
      }

      // 2. Try ChatGPT as fallback for low confidence
      if (process.env.OPENAI_API_KEY) {
        const chatGptResult = await this.tryChatGPTCategorization(transaction);
        if (chatGptResult && chatGptResult.confidence >= 70) {
          this.cacheResult(cacheKey, chatGptResult);
          stopTimer();
          return chatGptResult;
        }
      }

      // 3. Use pattern result even if lower confidence
      if (patternResult && patternResult.confidence > 0) {
        this.cacheResult(cacheKey, patternResult);
        stopTimer();
        return patternResult;
      }

      // 4. Smart fallback
      const fallbackResult = this.getSmartFallback(transaction);
      this.cacheResult(cacheKey, fallbackResult);
      stopTimer();
      return fallbackResult;

    } catch (error) {
      console.error('Error in unified categorization:', error);
      stopTimer();
      return this.getErrorFallback(transaction);
    }
  }

  // =============================================================================
  // PATTERN MATCHING LOGIC
  // =============================================================================

  private async tryPatternMatching(transaction: Transaction): Promise<CategorizationResult | null> {
    const description = transaction.description?.toLowerCase() || '';
    
    // Try each pattern in priority order
    for (const pattern of this.patterns) {
      if (!pattern.active) continue;
      
      // Check if pattern matches
      if (pattern.pattern.test(description)) {
        // Update usage stats
        pattern.usage_count = (pattern.usage_count || 0) + 1;
        pattern.last_used = new Date();
        
        // Handle E-Transfer special case (user preference)
        if (this.isETransfer(description)) {
          return this.handleETransferSpecialCase(transaction, pattern);
        }
        
        const inflowOutflow = this.getInflowOutflow(transaction, pattern.accountCode);
        
        return {
          category: pattern.merchant,
          accountCode: pattern.accountCode,
          confidence: pattern.confidence,
          reasoning: pattern.category === 'keyword' ? 
            `Matched CUSTOM KEYWORD (EXACT): ${pattern.merchant}` : 
            `Matched ${pattern.category} pattern: ${pattern.merchant}`,
          source: pattern.category === 'keyword' ? 'keyword' : (pattern.source === 'user' ? 'learned' : 'pattern'),
          merchant: pattern.merchant,
          inflowOutflow,
          suggestedKeyword: pattern.merchant.toLowerCase()
        };
      }
    }
    
    return null;
  }

  // =============================================================================
  // CHATGPT INTEGRATION (PRESERVED)
  // =============================================================================

  private async tryChatGPTCategorization(transaction: Transaction): Promise<CategorizationResult | null> {
    try {
      const accounts = this.chartOfAccounts.getAllAccounts();
      const accountsList = accounts.map((acc: any) => `${acc.code} - ${acc.name}`).join('\n');

      const prompt = `You are an expert financial transaction categorization specialist for Canadian businesses. Analyze this transaction for a business in ${this.province}.

TRANSACTION DETAILS:
- Description: "${transaction.description}"
- Amount: $${transaction.amount}
- Province: ${this.province}
- Business Context: Canadian construction/manufacturing business
- Transaction Type: ${transaction.amount < 0 ? 'OUTFLOW (Money Going Out - Expense/Purchase)' : 'INFLOW (Money Coming In - Revenue/Deposit)'}

AVAILABLE ACCOUNT CODES FOR ${this.province}:
${accountsList}

CRITICAL CONSISTENCY RULES:
**USER PREFERENCE RULES:**
- **ANY TRANSFERS** (including e-transfers, account transfers, etc.) → ALWAYS 877 (Tracking Transfers)

**RESPONSE FORMAT:**
ACCOUNT_CODE: [code]
CONFIDENCE: [0-100]%
REASONING: [explanation]
KEYWORD: [suggested keyword]

ANALYZE THIS TRANSACTION NOW:`;

      const completion = await openAIClient.createChatCompletion([
        {
          role: 'system',
          content: 'You are an expert financial transaction categorization specialist. Analyze transactions and provide categorization suggestions with reasoning.'
        },
        {
          role: 'user',
          content: prompt
        }
      ], {
        model: 'gpt-4o-mini',
        maxTokens: 500,
        temperature: 0.1
      });

      if (completion.success && completion.response) {
        const lines = completion.response.split('\n');
        let accountCode = '';
        let confidence = 0;
        let reasoning = '';
        let suggestedKeyword = '';

        lines.forEach((line: string) => {
          if (line.startsWith('ACCOUNT_CODE:')) {
            accountCode = line.split(':')[1].trim();
          } else if (line.startsWith('CONFIDENCE:')) {
            confidence = parseInt(line.split(':')[1].replace('%', '').trim());
          } else if (line.startsWith('REASONING:')) {
            reasoning = line.split(':')[1].trim();
          } else if (line.startsWith('KEYWORD:')) {
            suggestedKeyword = line.split(':')[1].trim();
          }
        });

        // Validate account code exists
        const accountExists = this.chartOfAccounts.getAccount(accountCode);
        if (!accountExists) {
          return null;
        }

        const inflowOutflow = this.getInflowOutflow(transaction, accountCode);

        return {
          category: 'AI Categorized',
          accountCode,
          confidence: Math.min(confidence, 100),
          reasoning,
          source: 'chatgpt',
          merchant: this.extractMerchant(transaction.description),
          inflowOutflow,
          suggestedKeyword
        };
      }
    } catch (error) {
      console.error('ChatGPT categorization error:', error);
    }
    
    return null;
  }

  // =============================================================================
  // PATTERN LOADING FROM ALL SOURCES
  // =============================================================================

  private async loadSystemPatterns(): Promise<void> {
    // Load all system patterns from the original UnifiedPatternEngine
    const systemPatterns: CategorizationPattern[] = [
      // =============================================================================
      // PRIORITY 1: TRAINING DATA PATTERNS (HIGHEST PRIORITY - SINGLE SOURCE OF TRUTH)
      // =============================================================================
      
      // FEDERAL/GOVERNMENT PAYMENTS -> OTHER REVENUE (260)
      { 
        id: 'federal_payment_canada',
        pattern: /federal\s*payment\s*canada/i, 
        merchant: 'Federal Payment Canada', 
        accountCode: '260', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'federal_payment_interest',
        pattern: /federal\s*payment\s*canada\s*interest\s*credit/i, 
        merchant: 'Federal Payment Canada Interest Credit', 
        accountCode: '270', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'federal_payment_debit',
        pattern: /federal\s*payment\s*canada\s*debit\s*memo/i, 
        merchant: 'Federal Payment Canada Debit Memo', 
        accountCode: '260', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'federal_payment_general',
        pattern: /federal\s*payment$/i, 
        merchant: 'Federal Payment', 
        accountCode: '260', 
        confidence: 98, 
        priority: 119, 
        category: 'training',
        source: 'system',
        active: true
      },
      
      // GOVERNMENT TAX PAYMENTS -> OTHER REVENUE (260)
      { 
        id: 'government_tax_payments',
        pattern: /government\s*tax\s*payments/i, 
        merchant: 'Government Tax Payments', 
        accountCode: '260', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'business_pad_emptx',
        pattern: /business\s*pad\s*emptx/i, 
        merchant: 'Business PAD EMPTX', 
        accountCode: '260', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'business_pad_gst',
        pattern: /business\s*pad\s*gst/i, 
        merchant: 'Business PAD GST', 
        accountCode: '260', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'business_pad_txins',
        pattern: /business\s*pad\s*txins/i, 
        merchant: 'Business PAD TXINS', 
        accountCode: '260', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      
      // CUSTOMER PAYMENTS -> SERVICE REVENUE (220)
      { 
        id: 'deposit_hamilton',
        pattern: /deposit\s*hamilton/i, 
        merchant: 'Deposit Hamilton', 
        accountCode: '220', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'accounts_payable_intuit',
        pattern: /accounts\s*payable\s*.*intuit\s*canada/i, 
        merchant: 'Accounts Payable Intuit Canada', 
        accountCode: '220', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'mb_dep_deposit',
        pattern: /mb[\-\s]*dep/i, 
        merchant: 'MB-DEP Deposit', 
        accountCode: '220', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'abm_deposit',
        pattern: /abm\s*deposit/i, 
        merchant: 'ABM Deposit', 
        accountCode: '220', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'credit_card_loc_pay',
        pattern: /mb[\-\s]*credit\s*card\/loc\s*pay/i, 
        merchant: 'MB-Credit Card/LOC Pay', 
        accountCode: '220', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'usd_chq_deposit',
        pattern: /usdchq\s*deposit/i, 
        merchant: 'USD CHQ Deposit', 
        accountCode: '220', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      
      // FAST FOOD & RESTAURANTS -> MEALS (420)
      { 
        id: 'tim_hortons',
        pattern: /tim\s*hortons/i, 
        merchant: 'Tim Hortons', 
        accountCode: '420', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'mcdonalds',
        pattern: /mcdonald[\'s]*/i, 
        merchant: 'McDonald\'s', 
        accountCode: '420', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'subway',
        pattern: /subway/i, 
        merchant: 'Subway', 
        accountCode: '420', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'boston_pizza',
        pattern: /boston\s*pizza/i, 
        merchant: 'Boston Pizza', 
        accountCode: '420', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'aw_restaurant',
        pattern: /a&w\s*restaurant/i, 
        merchant: 'A&W Restaurant', 
        accountCode: '420', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'wendys',
        pattern: /wendy[\'s]*/i, 
        merchant: 'Wendy\'s', 
        accountCode: '420', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'starbucks',
        pattern: /starbucks/i, 
        merchant: 'Starbucks', 
        accountCode: '420', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'burger_king',
        pattern: /\bbk\s*#\d+|\bburger\s*king/i, 
        merchant: 'Burger King', 
        accountCode: '420', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'snappy_tomato_pizza',
        pattern: /snappy\s*tomato\s*pizza/i, 
        merchant: 'Snappy Tomato Pizza', 
        accountCode: '420', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'waffle_bus_stop',
        pattern: /waffle\s*bus\s*stop/i, 
        merchant: 'The Waffle Bus Stop', 
        accountCode: '420', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'big_smoke_burger',
        pattern: /big\s*smoke\s*burger/i, 
        merchant: 'Big Smoke Burger', 
        accountCode: '420', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'west_block_cafeteria',
        pattern: /west\s*block\s*cafeteria/i, 
        merchant: 'West Block Cafeteria', 
        accountCode: '420', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'wheel_pizza',
        pattern: /wheel\s*pizza/i, 
        merchant: 'Wheel Pizza', 
        accountCode: '420', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'pizza_delight',
        pattern: /pizza\s*delight/i, 
        merchant: 'Pizza Delight', 
        accountCode: '420', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'dominos_pizza',
        pattern: /domino[\'s]*\s*pizza/i, 
        merchant: 'Domino\'s Pizza', 
        accountCode: '420', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'freshii',
        pattern: /freshii/i, 
        merchant: 'Freshii', 
        accountCode: '420', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'seven_eleven',
        pattern: /7[\-\s]*eleven/i, 
        merchant: '7-Eleven', 
        accountCode: '420', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'doubletree_restaurant',
        pattern: /doubletree.*restaurant|doubletree.*f&b/i, 
        merchant: 'DoubleTree Restaurant', 
        accountCode: '420', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'millers_ale_house',
        pattern: /miller.*ale\s*house/i, 
        merchant: 'Miller\'s Ale House', 
        accountCode: '420', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'justamere_cafe',
        pattern: /justamere\s*cafe/i, 
        merchant: 'Justamere Cafe', 
        accountCode: '420', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'ac_rouge_cafe',
        pattern: /ac\s*rouge.*cafe/i, 
        merchant: 'AC Rouge Cafe', 
        accountCode: '420', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      
      // FOOD DISTRIBUTORS -> MEALS (420)
      { 
        id: 'top_food_distributors',
        pattern: /top\s*food\s*distributors/i, 
        merchant: 'Top Food Distributors', 
        accountCode: '420', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      
      // MEAL DELIVERY SERVICES -> MEALS (420)
      { 
        id: 'uber_eats',
        pattern: /uber\s*eats/i, 
        merchant: 'Uber Eats', 
        accountCode: '420', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'chefsplate',
        pattern: /chefsplate/i, 
        merchant: 'ChefsPlate', 
        accountCode: '420', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      
      // SUBSCRIPTIONS -> SUBSCRIPTIONS (485)
      { 
        id: 'netflix',
        pattern: /netflix/i, 
        merchant: 'Netflix', 
        accountCode: '485', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'spotify',
        pattern: /spotify/i, 
        merchant: 'Spotify', 
        accountCode: '485', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'microsoft_365',
        pattern: /microsoft.*365/i, 
        merchant: 'Microsoft 365', 
        accountCode: '485', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'adobe_acrobat',
        pattern: /adobe.*acro/i, 
        merchant: 'Adobe Acrobat', 
        accountCode: '485', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'dropbox',
        pattern: /dropbox/i, 
        merchant: 'Dropbox', 
        accountCode: '485', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'canva',
        pattern: /canva/i, 
        merchant: 'Canva', 
        accountCode: '485', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'wix_com',
        pattern: /wix\.com/i, 
        merchant: 'Wix.com', 
        accountCode: '485', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'hayu_reality_tv',
        pattern: /hayu\s*reality\s*tv/i, 
        merchant: 'Hayu Reality TV', 
        accountCode: '485', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'crave',
        pattern: /\bcrave\b/i, 
        merchant: 'Crave', 
        accountCode: '485', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'noom',
        pattern: /noom/i, 
        merchant: 'Noom', 
        accountCode: '485', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      
      // BUSINESS SERVICES -> SUPPLIES (455)
      { 
        id: 'vistaprint',
        pattern: /vistaprint/i, 
        merchant: 'Vistaprint', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'staples',
        pattern: /staples/i, 
        merchant: 'Staples', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'uline',
        pattern: /uline/i, 
        merchant: 'Uline', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      
      // RETAIL/GROCERY -> SUPPLIES (455)
      { 
        id: 'amazon_ca',
        pattern: /amzn.*mktp.*ca|amazon\.ca/i, 
        merchant: 'Amazon.ca', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'walmart',
        pattern: /wal[\-\s]*mart/i, 
        merchant: 'Walmart', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'dollarama',
        pattern: /dollarama/i, 
        merchant: 'Dollarama', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'sobeys',
        pattern: /sobeys/i, 
        merchant: 'Sobeys', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'atlantic_superstore',
        pattern: /atlantic\s*superstore/i, 
        merchant: 'Atlantic Superstore', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      
      // ADVERTISING -> ADVERTISING (400)
      { 
        id: 'facebook_ads',
        pattern: /pp\*facebook.*ads|facebook.*ads/i, 
        merchant: 'Facebook Ads', 
        accountCode: '400', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'google_ads',
        pattern: /google.*ads/i, 
        merchant: 'Google Ads', 
        accountCode: '400', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      
      // BANK FEES -> BANK FEES (404)
      { 
        id: 'service_charge',
        pattern: /service\s*charge/i, 
        merchant: 'Service Charge', 
        accountCode: '404', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'nsf_service_charge',
        pattern: /nsf\s*service\s*charge/i, 
        merchant: 'NSF Service Charge', 
        accountCode: '404', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'bill_payment_fee',
        pattern: /bill\s*payment\s*txnfee/i, 
        merchant: 'Bill Payment Fee', 
        accountCode: '404', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'transaction_fee',
        pattern: /tran\s*fee/i, 
        merchant: 'Transaction Fee', 
        accountCode: '404', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'overdraft_interest',
        pattern: /overdraft\s*interest/i, 
        merchant: 'Overdraft Interest', 
        accountCode: '404', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      
      // FITNESS/MEMBERSHIP -> OTHER EXPENSES (490)
      { 
        id: 'planet_fitness',
        pattern: /planet\s*fitness/i, 
        merchant: 'Planet Fitness', 
        accountCode: '490', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      
      // FUEL/TRANSPORTATION -> VEHICLE EXPENSES (471)
      { 
        id: 'shell_gas',
        pattern: /shell\s*ep|shell\s*\d+/i, 
        merchant: 'Shell Gas', 
        accountCode: '471', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'air_canada',
        pattern: /air\s*can\*|air\s*canada/i, 
        merchant: 'Air Canada', 
        accountCode: '471', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'uber_trip',
        pattern: /uber\s*\*trip/i, 
        merchant: 'Uber Trip', 
        accountCode: '471', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      
      // HOTEL/ACCOMMODATION -> TRAVEL EXPENSES (471)
      { 
        id: 'doubletree_orlando',
        pattern: /doubletree.*orlando/i, 
        merchant: 'DoubleTree Orlando', 
        accountCode: '471', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'hilton_hotels',
        pattern: /hilton\s*hotels/i, 
        merchant: 'Hilton Hotels', 
        accountCode: '471', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'sutton_place_hotel',
        pattern: /sutton\s*place\s*hotel/i, 
        merchant: 'Sutton Place Hotel', 
        accountCode: '471', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'quality_inn',
        pattern: /quality\s*inn/i, 
        merchant: 'Quality Inn', 
        accountCode: '471', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'avanti_palms_resort',
        pattern: /avanti\s*palms\s*resort/i, 
        merchant: 'Avanti Palms Resort', 
        accountCode: '471', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      
      // PROFESSIONAL SERVICES -> PROFESSIONAL FEES (421)
      { 
        id: 'switch_health',
        pattern: /switch\s*health/i, 
        merchant: 'Switch Health', 
        accountCode: '421', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'cosmetology_association',
        pattern: /cosmetology\s*association/i, 
        merchant: 'Cosmetology Association', 
        accountCode: '421', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'maritime_beauty',
        pattern: /maritime\s*beauty/i, 
        merchant: 'Maritime Beauty', 
        accountCode: '421', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'phorest',
        pattern: /phorest/i, 
        merchant: 'Phorest', 
        accountCode: '421', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      
      // ENTERTAINMENT -> ENTERTAINMENT (416)
      { 
        id: 'gray_line_orlando',
        pattern: /gray\s*line.*orlando/i, 
        merchant: 'Gray Line Orlando', 
        accountCode: '416', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'viatortripadvisor',
        pattern: /viatortripadvisor/i, 
        merchant: 'Viator TripAdvisor', 
        accountCode: '416', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'eventbrite',
        pattern: /eventbrite/i, 
        merchant: 'Eventbrite', 
        accountCode: '416', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'andretti_orlando',
        pattern: /zsk\*ce\s*andretti.*orl/i, 
        merchant: 'Andretti Orlando', 
        accountCode: '416', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'levy_daytona',
        pattern: /levy.*daytona/i, 
        merchant: 'Levy @ Daytona', 
        accountCode: '416', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      
      // PARKING -> VEHICLE EXPENSES (471)
      { 
        id: 'qeii_parking',
        pattern: /qeii\s*parking/i, 
        merchant: 'QEII Parking', 
        accountCode: '471', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      
      // RETAIL SHOPPING -> SUPPLIES (455)
      { 
        id: 'shein',
        pattern: /shein/i, 
        merchant: 'Shein', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'lululemon',
        pattern: /lululemon/i, 
        merchant: 'Lululemon', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'walgreens',
        pattern: /walgreens/i, 
        merchant: 'Walgreens', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'pet_valu',
        pattern: /pet\s*valu/i, 
        merchant: 'Pet Valu', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'janie_and_jack',
        pattern: /janie\s*and\s*jack/i, 
        merchant: 'Janie and Jack', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'hudson_store',
        pattern: /hudson\s*sto/i, 
        merchant: 'Hudson Store', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'orlando_outlet',
        pattern: /orlando.*outlet/i, 
        merchant: 'Orlando Outlet', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      
      // BUSINESS SPECIALTY SUPPLIES -> SUPPLIES (455)
      { 
        id: 'canada_gloves',
        pattern: /canada\s*gloves/i, 
        merchant: 'Canada Gloves', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'tat_tattoo_supply',
        pattern: /tat\s*tattoo\s*suppl/i, 
        merchant: 'TAT Tattoo Supply', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'three_ships',
        pattern: /three\s*ships/i, 
        merchant: 'Three Ships', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'hyve_beauty',
        pattern: /hyve\s*beauty/i, 
        merchant: 'Hyve Beauty', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'email_vault',
        pattern: /email\s*vault/i, 
        merchant: 'Email Vault', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'browkingdom',
        pattern: /browkingdom/i, 
        merchant: 'Browkingdom', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'racing_electronics',
        pattern: /racing\s*electronics/i, 
        merchant: 'Racing Electronics', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'applied_lacquer',
        pattern: /appliedlacq/i, 
        merchant: 'Applied Lacquer', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'anasa_jewelry',
        pattern: /anasa\s*jewelry/i, 
        merchant: 'Anasa Jewelry', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'britnell_ventures',
        pattern: /britnell\s*ventures/i, 
        merchant: 'Britnell Ventures', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'bully_bunches',
        pattern: /bully\s*bunches/i, 
        merchant: 'Bully Bunches', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'neepsee_herbs',
        pattern: /neepsee\s*herbs/i, 
        merchant: 'Neepsee Herbs', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'hoitattoo',
        pattern: /hoitattoo/i, 
        merchant: 'Hoi Tattoo', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'successful_salons',
        pattern: /successful\s*salons/i, 
        merchant: 'Successful Salons', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'armins_beauty',
        pattern: /armin.*beauty/i, 
        merchant: 'Armin\'s Beauty', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'timely_limited',
        pattern: /timely\s*limited/i, 
        merchant: 'Timely Limited', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'socit_bossbabe',
        pattern: /socit.*bossbabe/i, 
        merchant: 'Socit Bossbabe', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'alipay_canada',
        pattern: /alipaycanad/i, 
        merchant: 'Alipay Canada', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      
      // Government Tax Payments -> Other Revenue (260)
      { 
        id: 'gov_tax_emptx',
        pattern: /business\s*pad\s*emptx.*government\s*tax\s*payments/i, 
        merchant: 'Government Tax Payments EMPTX', 
        accountCode: '260', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'gov_tax_gst',
        pattern: /business\s*pad\s*gst34.*government\s*tax\s*payments/i, 
        merchant: 'Government Tax Payments GST', 
        accountCode: '260', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'gov_tax_txins',
        pattern: /business\s*pad\s*txins.*government\s*tax\s*payments/i, 
        merchant: 'Government Tax Payments TXINS', 
        accountCode: '260', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'gov_tax_general',
        pattern: /business\s*pad.*government\s*tax\s*payments/i, 
        merchant: 'Government Tax Payments', 
        accountCode: '260', 
        confidence: 100, 
        priority: 118, 
        category: 'training',
        source: 'system',
        active: true
      },
      
      // Service Charges -> Bank Fees (404)
      { 
        id: 'service_charge_main',
        pattern: /service\s*charge$/i, 
        merchant: 'Service Charge', 
        accountCode: '404', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'service_charge_etransfer',
        pattern: /service\s*charge\s*interac\s*e[\-\s]*transfer\s*fee/i, 
        merchant: 'E-Transfer Fee', 
        accountCode: '404', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'service_charge_overdraft',
        pattern: /service\s*charge.*overdraft\s*interest/i, 
        merchant: 'Overdraft Interest', 
        accountCode: '404', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      
      // Deposits -> Service Revenue (220)
      { 
        id: 'deposit_hamilton',
        pattern: /deposit\s*hamilton\s*on.*mb[\-\s]*dep/i, 
        merchant: 'Deposit Hamilton ON', 
        accountCode: '220', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'deposit_hamilton_general',
        pattern: /deposit\s*hamilton\s*on/i, 
        merchant: 'Deposit Hamilton ON', 
        accountCode: '220', 
        confidence: 100, 
        priority: 118, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'deposit_mb',
        pattern: /deposit.*mb[\-\s]*dep/i, 
        merchant: 'Deposit', 
        accountCode: '220', 
        confidence: 98, 
        priority: 117, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'abm_deposit',
        pattern: /abm\s*deposit/i, 
        merchant: 'ABM Deposit', 
        accountCode: '220', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'deposit_general',
        pattern: /^deposit$/i, 
        merchant: 'Deposit', 
        accountCode: '220', 
        confidence: 95, 
        priority: 116, 
        category: 'training',
        source: 'system',
        active: true
      },
      
      // Accounts Payable -> Service Revenue (220)
      { 
        id: 'ap_cfc_fcc',
        pattern: /accounts\s*payable\s*cfc\/fcc/i, 
        merchant: 'Accounts Payable CFC/FCC', 
        accountCode: '220', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'ap_intuit_deposit',
        pattern: /accounts\s*payable\s*deposit\s*intuit\s*canada/i, 
        merchant: 'Accounts Payable Intuit Canada', 
        accountCode: '220', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'ap_intuit_general',
        pattern: /accounts\s*payable\s*intuit.*intuit\s*canada/i, 
        merchant: 'Accounts Payable Intuit Canada', 
        accountCode: '220', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'intuit_ap',
        pattern: /intuit\s*canada.*accounts\s*payable/i, 
        merchant: 'Intuit Canada Accounts Payable', 
        accountCode: '220', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'intuit_credit_memo',
        pattern: /intuit\s*canada.*credit\s*memo/i, 
        merchant: 'Intuit Canada Credit Memo', 
        accountCode: '220', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      
      // Transaction Fees -> Bank Fees (404)
      { 
        id: 'intuit_tran_fee',
        pattern: /accounts\s*payable\s*tran\s*fee\s*intuit\s*canada/i, 
        merchant: 'Intuit Canada Transaction Fee', 
        accountCode: '404', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'intuit_tran_fee_general',
        pattern: /intuit\s*canada.*tran\s*fee/i, 
        merchant: 'Intuit Canada Transaction Fee', 
        accountCode: '404', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'gov_tax_payment_fee',
        pattern: /bill\s*payment\s*txnfee.*government\s*tax\s*payments/i, 
        merchant: 'Government Tax Payment Fee', 
        accountCode: '404', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'bill_payment_txnfee',
        pattern: /bill\s*payment\s*txnfee/i, 
        merchant: 'Bill Payment Transaction Fee', 
        accountCode: '404', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'pay_file_fees',
        pattern: /misc\s*payment\s*pay[\-\s]*file\s*fees/i, 
        merchant: 'Pay File Fees', 
        accountCode: '404', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'sec_reg_fee',
        pattern: /misc\s*payment\s*sec\s*reg\s*fee/i, 
        merchant: 'Securities Registration Fee', 
        accountCode: '404', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      
      // Fitness & Membership -> Bank Fees (404)
      { 
        id: 'planet_fitness',
        pattern: /fees\/dues\s*planet\s*fitness/i, 
        merchant: 'Planet Fitness', 
        accountCode: '404', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      
      // Annual/Monthly Fees -> Bank Fees (404)
      { 
        id: 'annual_fee',
        pattern: /annual\s*fee/i, 
        merchant: 'Annual Fee', 
        accountCode: '404', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'monthly_fee',
        pattern: /monthly\s*fee/i, 
        merchant: 'Monthly Fee', 
        accountCode: '404', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'mon_fee',
        pattern: /mon\s*fee\d+/i, 
        merchant: 'Monthly Fee', 
        accountCode: '404', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      
      // NSF and Other Fees -> Bank Fees (404)
      { 
        id: 'nsf_service_charge',
        pattern: /nsf\s*service\s*charge/i, 
        merchant: 'NSF Service Charge', 
        accountCode: '404', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'overlimit_fee',
        pattern: /overlimit\s*fee/i, 
        merchant: 'Overlimit Fee', 
        accountCode: '404', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'cross_border_fee',
        pattern: /cross[\-\s]*border\s*debit\s*fee/i, 
        merchant: 'Cross-Border Debit Fee', 
        accountCode: '404', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      
      // Interest Credit -> Interest Income (270)
      { 
        id: 'interest_credit_federal',
        pattern: /federal\s*payment\s*canada\s*interest\s*credit/i, 
        merchant: 'Federal Payment Canada Interest Credit', 
        accountCode: '270', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'interest_credit',
        pattern: /interest\s*credit/i, 
        merchant: 'Interest Credit', 
        accountCode: '270', 
        confidence: 100, 
        priority: 118, 
        category: 'training',
        source: 'system',
        active: true
      },
      
      // Credit Card/LOC Payments -> Service Revenue (220)
      { 
        id: 'cc_loc_payment',
        pattern: /mb[\-\s]*credit\s*card\/loc\s*pay.*deposit\s*hamilton\s*on/i, 
        merchant: 'Credit Card/LOC Payment', 
        accountCode: '220', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'cc_loc_payment_general',
        pattern: /mb[\-\s]*credit\s*card\/loc\s*pay/i, 
        merchant: 'Credit Card/LOC Payment', 
        accountCode: '220', 
        confidence: 98, 
        priority: 118, 
        category: 'training',
        source: 'system',
        active: true
      },
      
      // Interac Purchases -> Meals & Entertainment (420)
      { 
        id: 'interac_tim_hortons',
        pattern: /contactless\s*interac\s*purchase.*tim\s*hortons/i, 
        merchant: 'Tim Hortons', 
        accountCode: '420', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'interac_mcdonalds',
        pattern: /contactless\s*interac\s*purchase.*mcdonald/i, 
        merchant: 'McDonalds', 
        accountCode: '420', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'interac_boston_pizza',
        pattern: /contactless\s*interac\s*purchase.*boston\s*pizza/i, 
        merchant: 'Boston Pizza', 
        accountCode: '420', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'interac_aw',
        pattern: /contactless\s*interac\s*purchase.*a&w/i, 
        merchant: 'A&W Restaurant', 
        accountCode: '420', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'interac_wendys',
        pattern: /contactless\s*interac\s*purchase.*wendy/i, 
        merchant: 'Wendys', 
        accountCode: '420', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'interac_pizza_generic',
        pattern: /contactless\s*interac\s*purchase.*pizza/i, 
        merchant: 'Pizza Restaurant', 
        accountCode: '420', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'interac_pizza',
        pattern: /interac\s*purchase.*pizza/i, 
        merchant: 'Pizza Restaurant', 
        accountCode: '420', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      
      // Interac Purchases -> Supplies (455)
      { 
        id: 'interac_dollarama',
        pattern: /contactless\s*interac\s*purchase.*dollarama/i, 
        merchant: 'Dollarama', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'interac_dollarama_general',
        pattern: /interac\s*purchase.*dollarama/i, 
        merchant: 'Dollarama', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'interac_walmart',
        pattern: /contactless\s*interac\s*purchase.*walmart/i, 
        merchant: 'Walmart', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      { 
        id: 'interac_walmart_general',
        pattern: /interac\s*purchase.*walmart/i, 
        merchant: 'Walmart', 
        accountCode: '455', 
        confidence: 100, 
        priority: 120, 
        category: 'training',
        source: 'system',
        active: true
      },
      
      // =============================================================================
      // PRIORITY 2: SYSTEM PATTERNS (High Priority)
      // =============================================================================
      
      // =============================================================================
      // ENHANCED E-TRANSFER PATTERNS - All Canadian Banking Variations
      // =============================================================================
      
      // E-Transfer FEES -> Bank Fees (404) - HIGHEST PRIORITY
      { 
        id: 'send_etfr_fee',
        pattern: /send\s*e[\-\s]*tfr\s*fee/i, 
        merchant: 'E-Transfer Fee', 
        accountCode: '404', 
        confidence: 100, 
        priority: 125, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'rcv_etfr_fee',
        pattern: /rcv\s*e[\-\s]*tfr\s*fee/i, 
        merchant: 'E-Transfer Receive Fee', 
        accountCode: '404', 
        confidence: 100, 
        priority: 125, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'etfr_fee_general',
        pattern: /e[\-\s]*tfr\s*fee/i, 
        merchant: 'E-Transfer Fee', 
        accountCode: '404', 
        confidence: 100, 
        priority: 124, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'etransfer_fee_general',
        pattern: /e[\-\s]*transfer\s*fee/i, 
        merchant: 'E-Transfer Fee', 
        accountCode: '404', 
        confidence: 100, 
        priority: 124, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'interac_etransfer_fee',
        pattern: /interac\s*e[\-\s]*transfer\s*fee/i, 
        merchant: 'E-Transfer Fee', 
        accountCode: '404', 
        confidence: 100, 
        priority: 124, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'etfr_fee_short',
        pattern: /etfr\s*fee/i, 
        merchant: 'E-Transfer Fee', 
        accountCode: '404', 
        confidence: 100, 
        priority: 124, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'interac_etfr_fee',
        pattern: /interac\s*etfr\s*fee/i, 
        merchant: 'E-Transfer Fee', 
        accountCode: '404', 
        confidence: 100, 
        priority: 124, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'email_money_transfer_fee',
        pattern: /email\s*money\s*transfer\s*fee/i, 
        merchant: 'E-Transfer Fee', 
        accountCode: '404', 
        confidence: 100, 
        priority: 124, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'emt_fee',
        pattern: /emt\s*fee/i, 
        merchant: 'E-Transfer Fee', 
        accountCode: '404', 
        confidence: 100, 
        priority: 124, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'send_money_fee',
        pattern: /send\s*money\s*fee/i, 
        merchant: 'E-Transfer Fee', 
        accountCode: '404', 
        confidence: 100, 
        priority: 124, 
        category: 'bank',
        source: 'system',
        active: true
      },
      
      // Regular E-Transfers -> Tracking Transfers (877) - HIGH PRIORITY
      { 
        id: 'send_etfr',
        pattern: /send\s*e[\-\s]*tfr(?!\s*fee)/i, 
        merchant: 'Send E-Transfer', 
        accountCode: '877', 
        confidence: 100, 
        priority: 123, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'rcv_etfr',
        pattern: /rcv\s*e[\-\s]*tfr(?!\s*fee)/i, 
        merchant: 'Receive E-Transfer', 
        accountCode: '877', 
        confidence: 100, 
        priority: 123, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'receive_etfr',
        pattern: /receive\s*e[\-\s]*tfr/i, 
        merchant: 'Receive E-Transfer', 
        accountCode: '877', 
        confidence: 100, 
        priority: 123, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'etfr_start_no_fee',
        pattern: /^e[\-\s]*tfr(?!\s*fee)/i, 
        merchant: 'E-Transfer', 
        accountCode: '877', 
        confidence: 100, 
        priority: 122, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'etfr_short_no_fee',
        pattern: /^etfr(?!\s*fee)/i, 
        merchant: 'E-Transfer', 
        accountCode: '877', 
        confidence: 100, 
        priority: 122, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'interac_etfr_no_fee',
        pattern: /interac\s*etfr(?!\s*fee)/i, 
        merchant: 'Interac E-Transfer', 
        accountCode: '877', 
        confidence: 100, 
        priority: 122, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'debit_memo_send_etfr',
        pattern: /debit\s*memo.*send\s*e[\-\s]*tfr/i, 
        merchant: 'Send E-Transfer', 
        accountCode: '877', 
        confidence: 100, 
        priority: 123, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'credit_memo_rcv_etfr',
        pattern: /credit\s*memo.*rcv\s*e[\-\s]*tfr/i, 
        merchant: 'Receive E-Transfer', 
        accountCode: '877', 
        confidence: 100, 
        priority: 123, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'email_money_transfer',
        pattern: /email\s*money\s*transfer(?!\s*fee)/i, 
        merchant: 'Email Money Transfer', 
        accountCode: '877', 
        confidence: 98, 
        priority: 121, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'emt_no_fee',
        pattern: /emt(?!\s*fee)/i, 
        merchant: 'Email Money Transfer', 
        accountCode: '877', 
        confidence: 98, 
        priority: 121, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'send_money_no_fee',
        pattern: /send\s*money(?!\s*fee)/i, 
        merchant: 'Send Money', 
        accountCode: '877', 
        confidence: 98, 
        priority: 121, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'receive_money',
        pattern: /receive\s*money/i, 
        merchant: 'Receive Money', 
        accountCode: '877', 
        confidence: 98, 
        priority: 121, 
        category: 'bank',
        source: 'system',
        active: true
      },
      
      // E-Transfer Special Cases
      { 
        id: 'etfr_reversal',
        pattern: /e[\-\s]*tfr\s*reversal/i, 
        merchant: 'E-Transfer Reversal', 
        accountCode: '877', 
        confidence: 100, 
        priority: 123, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'etfr_return',
        pattern: /e[\-\s]*tfr\s*return/i, 
        merchant: 'E-Transfer Return', 
        accountCode: '877', 
        confidence: 100, 
        priority: 123, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'etfr_cancelled',
        pattern: /e[\-\s]*tfr\s*cancelled/i, 
        merchant: 'E-Transfer Cancelled', 
        accountCode: '877', 
        confidence: 100, 
        priority: 123, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'etfr_declined',
        pattern: /e[\-\s]*tfr\s*declined/i, 
        merchant: 'E-Transfer Declined', 
        accountCode: '877', 
        confidence: 100, 
        priority: 123, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'send_etfr_reversal',
        pattern: /send\s*e[\-\s]*tfr\s*reversal/i, 
        merchant: 'Send E-Transfer Reversal', 
        accountCode: '877', 
        confidence: 100, 
        priority: 123, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'rcv_etfr_reversal',
        pattern: /rcv\s*e[\-\s]*tfr\s*reversal/i, 
        merchant: 'Receive E-Transfer Reversal', 
        accountCode: '877', 
        confidence: 100, 
        priority: 123, 
        category: 'bank',
        source: 'system',
        active: true
      },
      
      // =============================================================================
      // END ENHANCED E-TRANSFER PATTERNS
      // =============================================================================

      // E-Transfer patterns (User wants these in Tracking Transfers per memory)
      { 
        id: 'balance_forward_etransfer',
        pattern: /balance\s*forward\s*debit\s*memo.*interac\s*e[\-\s]*transfer/i, 
        merchant: 'E-Transfer', 
        accountCode: '877', 
        confidence: 100, 
        priority: 105, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'debit_memo_etransfer',
        pattern: /debit\s*memo.*interac\s*e[\-\s]*transfer/i, 
        merchant: 'E-Transfer', 
        accountCode: '877', 
        confidence: 100, 
        priority: 105, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'credit_memo_etransfer',
        pattern: /credit\s*memo.*interac\s*e[\-\s]*transfer/i, 
        merchant: 'E-Transfer', 
        accountCode: '877', 
        confidence: 100, 
        priority: 105, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'interac_etransfer',
        pattern: /interac\s*e[\-\s]*transfer(?!.*fee)/i, 
        merchant: 'E-Transfer', 
        accountCode: '877', 
        confidence: 98, 
        priority: 104, 
        category: 'bank',
        source: 'system',
        active: true
      },
      
      // Transfer patterns -> Tracking Transfers (877)
      { 
        id: 'transfer_credit_card',
        pattern: /transfer\s*to\s*cr\.\s*card/i, 
        merchant: 'Credit Card Transfer', 
        accountCode: '877', 
        confidence: 100, 
        priority: 105, 
        category: 'bank',
        source: 'system',
        active: true
      },
      
      // Mobile Banking Bill Payments
      { 
        id: 'mb_bill_payment_cc',
        pattern: /mb[\-\s]*bill\s*payment.*(?:mastercard|visa|credit\s*card)/i, 
        merchant: 'Credit Card Payment', 
        accountCode: '800', 
        confidence: 98, 
        priority: 100, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'mb_bill_payment_walmart_cc',
        pattern: /mb[\-\s]*bill\s*payment.*walmart.*mastercard/i, 
        merchant: 'Walmart Mastercard Payment', 
        accountCode: '800', 
        confidence: 98, 
        priority: 100, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'mb_bill_payment_rogers_cc',
        pattern: /mb[\-\s]*bill\s*payment.*rogers.*mastercard/i, 
        merchant: 'Rogers Bank Mastercard Payment', 
        accountCode: '800', 
        confidence: 98, 
        priority: 100, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'mb_bill_payment_virgin',
        pattern: /mb[\-\s]*bill\s*payment.*virgin.*plus/i, 
        merchant: 'Virgin Plus', 
        accountCode: '489', 
        confidence: 98, 
        priority: 100, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'mb_bill_payment_rogers',
        pattern: /mb[\-\s]*bill\s*payment.*rogers(?!\s*mastercard)/i, 
        merchant: 'Rogers', 
        accountCode: '489', 
        confidence: 98, 
        priority: 100, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'mb_bill_payment_bell',
        pattern: /mb[\-\s]*bill\s*payment.*bell/i, 
        merchant: 'Bell Canada', 
        accountCode: '489', 
        confidence: 98, 
        priority: 100, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'mb_bill_payment_telus',
        pattern: /mb[\-\s]*bill\s*payment.*telus/i, 
        merchant: 'Telus', 
        accountCode: '489', 
        confidence: 98, 
        priority: 100, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'mb_bill_payment_hydro',
        pattern: /mb[\-\s]*bill\s*payment.*hydro/i, 
        merchant: 'Hydro Bill', 
        accountCode: '442', 
        confidence: 98, 
        priority: 100, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'mb_bill_payment_gas',
        pattern: /mb[\-\s]*bill\s*payment.*gas/i, 
        merchant: 'Gas Bill', 
        accountCode: '442', 
        confidence: 98, 
        priority: 100, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'mb_bill_payment_general',
        pattern: /mb[\-\s]*bill\s*payment/i, 
        merchant: 'Bill Payment', 
        accountCode: '800', 
        confidence: 85, 
        priority: 98, 
        category: 'bank',
        source: 'system',
        active: true
      },
      
      // Bank Fees (Account Code: 404)
      { 
        id: 'overdrawn_handling',
        pattern: /overdrawn\s*handling\s*charge/i, 
        merchant: 'Bank Fee', 
        accountCode: '404', 
        confidence: 98, 
        priority: 100, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'monthly_account_fee',
        pattern: /monthly\s*account\s*fee/i, 
        merchant: 'Bank Fee', 
        accountCode: '404', 
        confidence: 98, 
        priority: 100, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'nsf_fee_general',
        pattern: /nsf\s*fee/i, 
        merchant: 'NSF Fee', 
        accountCode: '404', 
        confidence: 98, 
        priority: 100, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'overdraft_interest_general',
        pattern: /overdraft\s*interest/i, 
        merchant: 'Overdraft Interest', 
        accountCode: '404', 
        confidence: 98, 
        priority: 100, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'atm_fee',
        pattern: /atm\s*fee/i, 
        merchant: 'ATM Fee', 
        accountCode: '404', 
        confidence: 97, 
        priority: 100, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'etransfer_fee_general',
        pattern: /e[\-\s]*transfer\s*fee(?!\s*free)/i, 
        merchant: 'E-Transfer Fee', 
        accountCode: '404', 
        confidence: 97, 
        priority: 100, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'foreign_exchange_fee',
        pattern: /foreign\s*exchange\s*fee/i, 
        merchant: 'Foreign Exchange Fee', 
        accountCode: '404', 
        confidence: 97, 
        priority: 100, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'wire_transfer_fee',
        pattern: /wire\s*transfer\s*fee/i, 
        merchant: 'Wire Transfer Fee', 
        accountCode: '404', 
        confidence: 97, 
        priority: 100, 
        category: 'bank',
        source: 'system',
        active: true
      },
      
      // Interest & Investment Income (Account Code: 270)
      { 
        id: 'interest_paid',
        pattern: /interest\s*paid/i, 
        merchant: 'Interest Income', 
        accountCode: '270', 
        confidence: 98, 
        priority: 95, 
        category: 'financial',
        source: 'system',
        active: true
      },
      { 
        id: 'interest_earned',
        pattern: /interest\s*earned/i, 
        merchant: 'Interest Income', 
        accountCode: '270', 
        confidence: 98, 
        priority: 95, 
        category: 'financial',
        source: 'system',
        active: true
      },
      { 
        id: 'interest_general',
        pattern: /\binterest\b/i, 
        merchant: 'Interest Income', 
        accountCode: '270', 
        confidence: 90, 
        priority: 85, 
        category: 'financial',
        source: 'system',
        active: true
      },
      { 
        id: 'interest_expense',
        pattern: /interest\s*(expense|charge|fee)/i, 
        merchant: 'Interest Expense', 
        accountCode: '500', 
        confidence: 95, 
        priority: 90, 
        category: 'financial',
        source: 'system',
        active: true
      },
      { 
        id: 'savings_interest',
        pattern: /savings\s*interest|interest\s*savings/i, 
        merchant: 'Savings Interest', 
        accountCode: '270', 
        confidence: 98, 
        priority: 95, 
        category: 'financial',
        source: 'system',
        active: true
      },
      { 
        id: 'dividend',
        pattern: /dividend/i, 
        merchant: 'Dividend', 
        accountCode: '270', 
        confidence: 95, 
        priority: 95, 
        category: 'financial',
        source: 'system',
        active: true
      },
      { 
        id: 'investment_income',
        pattern: /investment\s*income/i, 
        merchant: 'Investment Income', 
        accountCode: '270', 
        confidence: 95, 
        priority: 95, 
        category: 'financial',
        source: 'system',
        active: true
      },
      
      // Government Deposits (Account Code: 200)
      { 
        id: 'government_canada',
        pattern: /government\s*canada/i, 
        merchant: 'Government Deposit', 
        accountCode: '200', 
        confidence: 95, 
        priority: 90, 
        category: 'financial',
        source: 'system',
        active: true
      },
      { 
        id: 'cra_deposit',
        pattern: /cra\s*deposit/i, 
        merchant: 'CRA Deposit', 
        accountCode: '200', 
        confidence: 95, 
        priority: 90, 
        category: 'financial',
        source: 'system',
        active: true
      },
      { 
        id: 'employment_insurance',
        pattern: /employment\s*insurance/i, 
        merchant: 'EI Deposit', 
        accountCode: '200', 
        confidence: 95, 
        priority: 90, 
        category: 'financial',
        source: 'system',
        active: true
      },
      
      // Internal Transfers (Account Code: 877)
      { 
        id: 'mb_transfer',
        pattern: /mb[\-\s]*transfer/i, 
        merchant: 'MB Transfer', 
        accountCode: '877', 
        confidence: 98, 
        priority: 95, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'internal_transfer',
        pattern: /internal\s*transfer/i, 
        merchant: 'Internal Transfer', 
        accountCode: '877', 
        confidence: 95, 
        priority: 90, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'account_transfer',
        pattern: /account\s*transfer/i, 
        merchant: 'Account Transfer', 
        accountCode: '877', 
        confidence: 95, 
        priority: 90, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'transfer_to_savings',
        pattern: /transfer\s*to\s*savings/i, 
        merchant: 'Transfer to Savings', 
        accountCode: '877', 
        confidence: 95, 
        priority: 90, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'transfer_from_savings',
        pattern: /transfer\s*from\s*savings/i, 
        merchant: 'Transfer from Savings', 
        accountCode: '877', 
        confidence: 95, 
        priority: 90, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'transfer_to_chequing',
        pattern: /transfer\s*to\s*chequing/i, 
        merchant: 'Transfer to Chequing', 
        accountCode: '877', 
        confidence: 95, 
        priority: 90, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'transfer_from_chequing',
        pattern: /transfer\s*from\s*chequing/i, 
        merchant: 'Transfer from Chequing', 
        accountCode: '877', 
        confidence: 95, 
        priority: 90, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'atm_withdrawal',
        pattern: /atm\s*withdrawal/i, 
        merchant: 'ATM Withdrawal', 
        accountCode: '610', 
        confidence: 95, 
        priority: 90, 
        category: 'bank',
        source: 'system',
        active: true
      },
      { 
        id: 'atm_deposit',
        pattern: /atm\s*deposit/i, 
        merchant: 'ATM Deposit', 
        accountCode: '610', 
        confidence: 95, 
        priority: 90, 
        category: 'bank',
        source: 'system',
        active: true
      },
      
      // Credit Card & Loan Payments (Account Code: 800)
      { 
        id: 'credit_card_payment',
        pattern: /credit\s*card\s*payment/i, 
        merchant: 'Credit Card Payment', 
        accountCode: '800', 
        confidence: 95, 
        priority: 85, 
        category: 'financial',
        source: 'system',
        active: true
      },
      { 
        id: 'loan_payment',
        pattern: /loan\s*payment/i, 
        merchant: 'Loan Payment', 
        accountCode: '800', 
        confidence: 95, 
        priority: 85, 
        category: 'financial',
        source: 'system',
        active: true
      },
      { 
        id: 'mortgage_payment',
        pattern: /mortgage\s*payment/i, 
        merchant: 'Mortgage Payment', 
        accountCode: '800', 
        confidence: 95, 
        priority: 85, 
        category: 'financial',
        source: 'system',
        active: true
      },
      { 
        id: 'visa_payment',
        pattern: /visa\s*payment/i, 
        merchant: 'Visa Payment', 
        accountCode: '800', 
        confidence: 95, 
        priority: 85, 
        category: 'financial',
        source: 'system',
        active: true
      },
      { 
        id: 'mastercard_payment',
        pattern: /mastercard\s*payment/i, 
        merchant: 'Mastercard Payment', 
        accountCode: '800', 
        confidence: 95, 
        priority: 85, 
        category: 'financial',
        source: 'system',
        active: true
      },
      
      
      // =============================================================================
      // PRIORITY 3: MERCHANT PATTERNS (Medium Priority)
      // =============================================================================
      
      // Specific Bill Payment Patterns (Higher priority than generic patterns)
      { 
        id: 'virgin_plus',
        pattern: /virgin\s*plus/i, 
        merchant: 'Virgin Plus', 
        accountCode: '489', 
        confidence: 96, 
        priority: 85, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'walmart_mastercard',
        pattern: /walmart.*mastercard/i, 
        merchant: 'Walmart Mastercard Payment', 
        accountCode: '800', 
        confidence: 96, 
        priority: 85, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'rogers_bank_mastercard',
        pattern: /rogers.*bank.*mastercard/i, 
        merchant: 'Rogers Bank Mastercard Payment', 
        accountCode: '800', 
        confidence: 96, 
        priority: 85, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'rogers_mastercard',
        pattern: /rogers.*mastercard/i, 
        merchant: 'Rogers Mastercard Payment', 
        accountCode: '800', 
        confidence: 96, 
        priority: 85, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      
      // Food & Restaurants (Account Code: 420)
      { 
        id: 'tim_hortons_main',
        pattern: /tim\s*hortons?/i, 
        merchant: 'Tim Hortons', 
        accountCode: '420', 
        confidence: 96, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'tims',
        pattern: /tims/i, 
        merchant: 'Tim Hortons', 
        accountCode: '420', 
        confidence: 90, 
        priority: 75, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'starbucks',
        pattern: /starbucks/i, 
        merchant: 'Starbucks', 
        accountCode: '420', 
        confidence: 96, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'mcdonalds_main',
        pattern: /mcdonald'?s/i, 
        merchant: 'McDonalds', 
        accountCode: '420', 
        confidence: 96, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'mcdonald',
        pattern: /mcdonald/i, 
        merchant: 'McDonalds', 
        accountCode: '420', 
        confidence: 90, 
        priority: 75, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'macdonalds',
        pattern: /macdonalds/i, 
        merchant: 'McDonalds', 
        accountCode: '420', 
        confidence: 85, 
        priority: 70, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'burger_king',
        pattern: /burger\s*king/i, 
        merchant: 'Burger King', 
        accountCode: '420', 
        confidence: 95, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'burgerking',
        pattern: /burgerking/i, 
        merchant: 'Burger King', 
        accountCode: '420', 
        confidence: 90, 
        priority: 75, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'bk',
        pattern: /\bbk\b/i, 
        merchant: 'Burger King', 
        accountCode: '420', 
        confidence: 85, 
        priority: 70, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'subway',
        pattern: /subway/i, 
        merchant: 'Subway', 
        accountCode: '420', 
        confidence: 94, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'kfc',
        pattern: /kfc/i, 
        merchant: 'KFC', 
        accountCode: '420', 
        confidence: 95, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'taco_bell',
        pattern: /taco\s*bell/i, 
        merchant: 'Taco Bell', 
        accountCode: '420', 
        confidence: 95, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'tacobell',
        pattern: /tacobell/i, 
        merchant: 'Taco Bell', 
        accountCode: '420', 
        confidence: 90, 
        priority: 75, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'harveys',
        pattern: /harvey'?s/i, 
        merchant: 'Harveys', 
        accountCode: '420', 
        confidence: 95, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'wendys',
        pattern: /wendy'?s/i, 
        merchant: 'Wendys', 
        accountCode: '420', 
        confidence: 95, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'wendys_alt',
        pattern: /wendys/i, 
        merchant: 'Wendys', 
        accountCode: '420', 
        confidence: 90, 
        priority: 75, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'dairy_queen',
        pattern: /dairy\s*queen/i, 
        merchant: 'Dairy Queen', 
        accountCode: '420', 
        confidence: 95, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'dairyqueen',
        pattern: /dairyqueen/i, 
        merchant: 'Dairy Queen', 
        accountCode: '420', 
        confidence: 90, 
        priority: 75, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'dq',
        pattern: /\bdq\b/i, 
        merchant: 'Dairy Queen', 
        accountCode: '420', 
        confidence: 85, 
        priority: 70, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'pizza_pizza',
        pattern: /pizza\s*pizza/i, 
        merchant: 'Pizza Pizza', 
        accountCode: '420', 
        confidence: 95, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'pizza_hut',
        pattern: /pizza\s*hut/i, 
        merchant: 'Pizza Hut', 
        accountCode: '420', 
        confidence: 95, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'pizzahut',
        pattern: /pizzahut/i, 
        merchant: 'Pizza Hut', 
        accountCode: '420', 
        confidence: 90, 
        priority: 75, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'dominos',
        pattern: /domino'?s/i, 
        merchant: 'Dominos', 
        accountCode: '420', 
        confidence: 95, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'dominos_alt',
        pattern: /dominos/i, 
        merchant: 'Dominos', 
        accountCode: '420', 
        confidence: 90, 
        priority: 75, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'little_caesars',
        pattern: /little\s*caesars/i, 
        merchant: 'Little Caesars', 
        accountCode: '420', 
        confidence: 95, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'littlecaesars',
        pattern: /littlecaesars/i, 
        merchant: 'Little Caesars', 
        accountCode: '420', 
        confidence: 90, 
        priority: 75, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'aw_restaurant',
        pattern: /a&w/i, 
        merchant: 'A&W', 
        accountCode: '420', 
        confidence: 95, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'aw_alt',
        pattern: /a[\s&]*w/i, 
        merchant: 'A&W', 
        accountCode: '420', 
        confidence: 90, 
        priority: 75, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'swiss_chalet',
        pattern: /swiss\s*chalet/i, 
        merchant: 'Swiss Chalet', 
        accountCode: '420', 
        confidence: 96, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'swisschalet',
        pattern: /swisschalet/i, 
        merchant: 'Swiss Chalet', 
        accountCode: '420', 
        confidence: 90, 
        priority: 75, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'boston_pizza',
        pattern: /boston\s*pizza/i, 
        merchant: 'Boston Pizza', 
        accountCode: '420', 
        confidence: 95, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'bostonpizza',
        pattern: /bostonpizza/i, 
        merchant: 'Boston Pizza', 
        accountCode: '420', 
        confidence: 90, 
        priority: 75, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      
      // Additional Fast Food from DataTest
      { 
        id: 'snappy_tomato_pizza',
        pattern: /snappy\s*tomato\s*pizza/i, 
        merchant: 'Snappy Tomato Pizza', 
        accountCode: '420', 
        confidence: 95, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'waffle_bus_stop',
        pattern: /the\s*waffle\s*bus\s*stop/i, 
        merchant: 'The Waffle Bus Stop', 
        accountCode: '420', 
        confidence: 95, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'freshii',
        pattern: /freshii/i, 
        merchant: 'Freshii', 
        accountCode: '420', 
        confidence: 95, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'millers_ale_house',
        pattern: /miller\s*s\s*ale\s*house/i, 
        merchant: 'Miller\'s Ale House', 
        accountCode: '420', 
        confidence: 95, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'seven_eleven',
        pattern: /7[\-\s]*eleven/i, 
        merchant: '7-Eleven', 
        accountCode: '420', 
        confidence: 95, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'doubletree_restaurant',
        pattern: /doubletree.*f&b/i, 
        merchant: 'DoubleTree Restaurant', 
        accountCode: '420', 
        confidence: 95, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'hudson_store',
        pattern: /hudson\s*sto/i, 
        merchant: 'Hudson Store', 
        accountCode: '420', 
        confidence: 95, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      
      // Food Delivery & Meal Kits (Account Code: 420)
      { 
        id: 'uber_eats',
        pattern: /uber\s*eats/i, 
        merchant: 'Uber Eats', 
        accountCode: '420', 
        confidence: 95, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'skip_the_dishes',
        pattern: /skip\s*the\s*dishes/i, 
        merchant: 'Skip The Dishes', 
        accountCode: '420', 
        confidence: 95, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'doordash',
        pattern: /doordash/i, 
        merchant: 'DoorDash', 
        accountCode: '420', 
        confidence: 95, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'foodora',
        pattern: /foodora/i, 
        merchant: 'Foodora', 
        accountCode: '420', 
        confidence: 95, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'chefsplate',
        pattern: /chefsplate/i, 
        merchant: 'ChefsPlate', 
        accountCode: '420', 
        confidence: 95, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'hellofresh',
        pattern: /hellofresh/i, 
        merchant: 'HelloFresh', 
        accountCode: '420', 
        confidence: 95, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'good_food',
        pattern: /good\s*food/i, 
        merchant: 'Good Food', 
        accountCode: '420', 
        confidence: 95, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'fresh_prep',
        pattern: /fresh\s*prep/i, 
        merchant: 'Fresh Prep', 
        accountCode: '420', 
        confidence: 95, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      
      // Subscriptions (Account Code: 485)
      { 
        id: 'netflix',
        pattern: /netflix/i, 
        merchant: 'Netflix', 
        accountCode: '485', 
        confidence: 95, 
        priority: 85, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'spotify',
        pattern: /spotify/i, 
        merchant: 'Spotify', 
        accountCode: '485', 
        confidence: 95, 
        priority: 85, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'microsoft_365',
        pattern: /microsoft\s*365/i, 
        merchant: 'Microsoft 365', 
        accountCode: '485', 
        confidence: 95, 
        priority: 85, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'adobe_creative_cloud',
        pattern: /adobe.*creative\s*cloud/i, 
        merchant: 'Adobe Creative Cloud', 
        accountCode: '485', 
        confidence: 95, 
        priority: 85, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'adobe_acrobat',
        pattern: /adobe.*acrobat/i, 
        merchant: 'Adobe Acrobat', 
        accountCode: '485', 
        confidence: 95, 
        priority: 85, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'dropbox',
        pattern: /dropbox/i, 
        merchant: 'Dropbox', 
        accountCode: '485', 
        confidence: 95, 
        priority: 85, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'canva',
        pattern: /canva/i, 
        merchant: 'Canva', 
        accountCode: '485', 
        confidence: 95, 
        priority: 85, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'wix',
        pattern: /wix\.com/i, 
        merchant: 'Wix.com', 
        accountCode: '485', 
        confidence: 95, 
        priority: 85, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'hayu',
        pattern: /hayu\s*reality\s*tv/i, 
        merchant: 'Hayu Reality TV', 
        accountCode: '485', 
        confidence: 95, 
        priority: 85, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'crave',
        pattern: /crave/i, 
        merchant: 'Crave', 
        accountCode: '485', 
        confidence: 95, 
        priority: 85, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'noom',
        pattern: /noom/i, 
        merchant: 'Noom', 
        accountCode: '485', 
        confidence: 95, 
        priority: 85, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'disney_plus',
        pattern: /disney\s*plus/i, 
        merchant: 'Disney Plus', 
        accountCode: '485', 
        confidence: 95, 
        priority: 85, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'hulu',
        pattern: /hulu/i, 
        merchant: 'Hulu', 
        accountCode: '485', 
        confidence: 95, 
        priority: 85, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'prime_video',
        pattern: /prime\s*video/i, 
        merchant: 'Prime Video', 
        accountCode: '485', 
        confidence: 95, 
        priority: 85, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'youtube_premium',
        pattern: /youtube\s*premium/i, 
        merchant: 'YouTube Premium', 
        accountCode: '485', 
        confidence: 95, 
        priority: 85, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'apple_music',
        pattern: /apple\s*music/i, 
        merchant: 'Apple Music', 
        accountCode: '485', 
        confidence: 95, 
        priority: 85, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'zoom',
        pattern: /zoom/i, 
        merchant: 'Zoom', 
        accountCode: '485', 
        confidence: 95, 
        priority: 85, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'slack',
        pattern: /slack/i, 
        merchant: 'Slack', 
        accountCode: '485', 
        confidence: 95, 
        priority: 85, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'quickbooks',
        pattern: /quickbooks/i, 
        merchant: 'QuickBooks', 
        accountCode: '485', 
        confidence: 95, 
        priority: 85, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      
      // Apple Services (Account Code: 485)
      { 
        id: 'apple_services',
        pattern: /applecombill/i, 
        merchant: 'Apple Services', 
        accountCode: '485', 
        confidence: 95, 
        priority: 85, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'apple_bill',
        pattern: /apple\.com\/bill/i, 
        merchant: 'Apple Services', 
        accountCode: '485', 
        confidence: 95, 
        priority: 85, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      
      // Advertising (Account Code: 400)
      { 
        id: 'facebook_ads',
        pattern: /facebk/i, 
        merchant: 'Facebook Ads', 
        accountCode: '400', 
        confidence: 95, 
        priority: 85, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'facebook_pp',
        pattern: /pp\*facebook/i, 
        merchant: 'Facebook Ads', 
        accountCode: '400', 
        confidence: 95, 
        priority: 85, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'google_ads',
        pattern: /google.*ads/i, 
        merchant: 'Google Ads', 
        accountCode: '400', 
        confidence: 95, 
        priority: 85, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      
      // Utilities (Account Code: 489)
      { 
        id: 'rogers_util',
        pattern: /rogers/i, 
        merchant: 'Rogers', 
        accountCode: '489', 
        confidence: 95, 
        priority: 75, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'bell_canada',
        pattern: /bell\s*canada|bell\s*mobility/i, 
        merchant: 'Bell', 
        accountCode: '489', 
        confidence: 95, 
        priority: 75, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'hydro_utilities',
        pattern: /hydro\s*one|hydro\s*quebec|bc\s*hydro/i, 
        merchant: 'Hydro', 
        accountCode: '442', 
        confidence: 95, 
        priority: 75, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      
      // Gas Stations (Account Code: 449)
      { 
        id: 'shell_gas',
        pattern: /shell/i, 
        merchant: 'Shell', 
        accountCode: '449', 
        confidence: 92, 
        priority: 75, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'esso_gas',
        pattern: /esso/i, 
        merchant: 'Esso', 
        accountCode: '449', 
        confidence: 92, 
        priority: 75, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'petro_canada_gas',
        pattern: /petro[\-\s]*canada/i, 
        merchant: 'Petro-Canada', 
        accountCode: '449', 
        confidence: 92, 
        priority: 75, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      
      // Retail (Account Code: 455)
      { 
        id: 'walmart_retail',
        pattern: /walmart/i, 
        merchant: 'Walmart', 
        accountCode: '455', 
        confidence: 90, 
        priority: 70, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'costco_retail',
        pattern: /costco/i, 
        merchant: 'Costco', 
        accountCode: '455', 
        confidence: 90, 
        priority: 70, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'canadian_tire_retail',
        pattern: /canadian\s*tire/i, 
        merchant: 'Canadian Tire', 
        accountCode: '455', 
        confidence: 90, 
        priority: 70, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      
      // Construction Specific (Account Code: 310)
      { 
        id: 'home_depot_construction',
        pattern: /home\s*depot/i, 
        merchant: 'Home Depot', 
        accountCode: '310', 
        confidence: 92, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      },
      { 
        id: 'brock_white_construction',
        pattern: /brock\s*white/i, 
        merchant: 'Brock White', 
        accountCode: '310', 
        confidence: 95, 
        priority: 80, 
        category: 'merchant',
        source: 'system',
        active: true
      }
    ];

    // Add all system patterns
    this.patterns.push(...systemPatterns);
    console.log(`✅ Loaded ${systemPatterns.length} system patterns`);
  }

  private async loadLearnedPatterns(): Promise<void> {
    try {
      if (!this.userId) {
        console.log('No user ID, skipping learned patterns');
        return;
      }

      const learnedPatterns = await this.databaseService.getLearnedPatterns();
      
      for (const pattern of learnedPatterns) {
        this.patterns.push({
          id: `learned_${pattern.id}`,
          pattern: new RegExp(pattern.pattern, 'i'),
          merchant: pattern.category_code,
          accountCode: pattern.category_code,
          confidence: pattern.confidence,
          priority: 110, // High priority for learned patterns
          category: 'learned',
          source: 'user',
          active: true,
          created_at: new Date(pattern.created_at),
          last_used: new Date(pattern.last_used),
          usage_count: pattern.usage_count
        });
      }

      console.log(`✅ Loaded ${learnedPatterns.length} learned patterns`);
    } catch (error) {
      console.error('Failed to load learned patterns:', error);
    }
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private isETransfer(description: string): boolean {
    return /(?:e[\-\s]*transfer|e[\-\s]*tfr|etfr|send\s+e[\-\s]*tfr|rcv\s+e[\-\s]*tfr)(?!\s*fee)/i.test(description);
  }

  private handleETransferSpecialCase(transaction: Transaction, pattern: CategorizationPattern): CategorizationResult {
    // User preference: ALL transfers go to 877
    const inflowOutflow = this.getInflowOutflow(transaction, '877');
    
    return {
      category: 'E-Transfer',
      accountCode: '877',
      confidence: 98,
      reasoning: 'E-Transfer categorized to Tracking Transfers per user preference',
      source: 'pattern',
      merchant: 'E-Transfer',
      inflowOutflow,
      suggestedKeyword: 'e-transfer'
    };
  }

  private getInflowOutflow(transaction: Transaction, accountCode: string): 'inflow' | 'outflow' {
    const account = this.chartOfAccounts.getAccount(accountCode);
    if (!account) return transaction.amount > 0 ? 'inflow' : 'outflow';

    // Standard accounting logic
    if (account.type === 'Revenue') {
      return transaction.amount > 0 ? 'inflow' : 'outflow';
    } else if (account.type === 'Expense') {
      return transaction.amount < 0 ? 'outflow' : 'inflow';
    } else {
      return transaction.amount > 0 ? 'inflow' : 'outflow';
    }
  }

  private extractMerchant(description: string): string {
    // Simple merchant extraction logic
    const cleanDesc = description.replace(/[0-9\-\*\#]+/g, '').trim();
    const words = cleanDesc.split(' ').filter(w => w.length > 2);
    return words.slice(0, 2).join(' ');
  }

  private getSmartFallback(transaction: Transaction): CategorizationResult {
    const amount = Math.abs(transaction.amount);
    const description = transaction.description.toLowerCase();
    
    let fallbackAccountCode = '453'; // Office Expenses (default)
    let fallbackReasoning = 'No pattern match found, using office expenses as default';
    
    if (transaction.amount > 0) {
      fallbackAccountCode = '260'; // Other Revenue
      fallbackReasoning = 'Unidentified income, categorized as other revenue';
    } else if (amount > 1000) {
      fallbackAccountCode = '310'; // Cost of Goods Sold
      fallbackReasoning = 'Large expense, likely project-related cost';
    } else if (description.includes('transfer') || description.includes('memo')) {
      fallbackAccountCode = '877'; // Tracking Transfers
      fallbackReasoning = 'Appears to be a transfer transaction';
    }
    
    const inflowOutflow = this.getInflowOutflow(transaction, fallbackAccountCode);
    
    return {
      category: 'Uncategorized',
      accountCode: fallbackAccountCode,
      confidence: 25,
      reasoning: fallbackReasoning,
      source: 'fallback',
      merchant: this.extractMerchant(transaction.description),
      inflowOutflow
    };
  }

  private getErrorFallback(transaction: Transaction): CategorizationResult {
    const inflowOutflow = this.getInflowOutflow(transaction, '453');
    
    return {
      category: 'Error',
      accountCode: '453',
      confidence: 0,
      reasoning: 'Error occurred during categorization',
      source: 'fallback',
      merchant: this.extractMerchant(transaction.description),
      inflowOutflow
    };
  }

  private buildResult(cached: any, source: string): CategorizationResult {
    return {
      category: cached.category,
      accountCode: cached.accountCode,
      confidence: cached.confidence,
      reasoning: cached.reasoning || 'Cached result',
      source: source as any,
      merchant: cached.merchant || cached.category,
      inflowOutflow: cached.inflowOutflow || (cached.accountCode === '877' ? 'outflow' : 'inflow')
    };
  }

  private cacheResult(cacheKey: string, result: CategorizationResult): void {
    categorizationCache.set(cacheKey, {
      category: result.category,
      accountCode: result.accountCode,
      confidence: result.confidence,
      timestamp: Date.now()
    });
  }

  private initializeFuzzySearch(): void {
    // Initialize Fuse.js for fuzzy matching fallback
    this.fuse = new Fuse(this.patterns, {
      keys: ['merchant', 'description'],
      threshold: 0.3,
      includeScore: true
    });
  }

  // =============================================================================
  // LEARNING AND CORRECTION METHODS
  // =============================================================================

  async recordUserCorrection(originalDescription: string, correctedCategoryCode: string): Promise<void> {
    try {
      // Save to database
      await this.databaseService.recordUserCorrection(originalDescription, correctedCategoryCode);
      
      // Create learned pattern
      const pattern = this.createPattern(originalDescription);
      await this.databaseService.saveLearnedPattern(pattern, correctedCategoryCode, 90);
      
      // Add to local patterns with high priority
      this.patterns.push({
        id: `learned_${Date.now()}`,
        pattern: new RegExp(pattern, 'i'),
        merchant: correctedCategoryCode,
        accountCode: correctedCategoryCode,
        confidence: 90,
        priority: 110,
        category: 'learned',
        source: 'user',
        active: true,
        created_at: new Date(),
        usage_count: 1
      });
      
      // Re-sort patterns
      this.patterns.sort((a, b) => b.priority - a.priority);
      
      console.log('✅ User correction recorded and learned');
    } catch (error) {
      console.error('Failed to record user correction:', error);
    }
  }

  private createPattern(description: string): string {
    // Create a normalized pattern from description
    return description
      .toLowerCase()
      .replace(/[0-9\-\*\#]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // =============================================================================
  // BATCH PROCESSING
  // =============================================================================

  async categorizeBatch(transactions: Transaction[]): Promise<Transaction[]> {
    const results: Transaction[] = [];
    
    for (const transaction of transactions) {
      const result = await this.categorizeTransaction(transaction);
      
      results.push({
        ...transaction,
        category: result.category,
        accountCode: result.accountCode,
        confidence: result.confidence,
        merchant: result.merchant
      });
    }
    
    return results;
  }

  // =============================================================================
  // STATISTICS AND MONITORING
  // =============================================================================

  getPatternStats(): { total: number; byCategory: Record<string, number>; bySource: Record<string, number> } {
    const byCategory: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    
    this.patterns.forEach(pattern => {
      byCategory[pattern.category] = (byCategory[pattern.category] || 0) + 1;
      bySource[pattern.source] = (bySource[pattern.source] || 0) + 1;
    });
    
    return {
      total: this.patterns.length,
      byCategory,
      bySource
    };
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const unifiedCategorizationEngine = UnifiedCategorizationEngine.getInstance(); 