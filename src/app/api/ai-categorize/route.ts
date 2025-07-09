import { NextRequest, NextResponse } from 'next/server';
import { AIEngine } from '../../../lib/aiEngine';
import { ChartOfAccounts } from '../../../lib/chartOfAccounts';
import fs from 'fs';
import path from 'path';

// Simple in-memory cache for AI categorization results
const categorizationCache = new Map<string, any>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Manual environment loading function
function loadEnvManually() {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split('\n');
      lines.forEach((line: string) => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim();
            // Only set if not already in process.env
            if (!process.env[key.trim()]) {
              process.env[key.trim()] = value;
            }
          }
        }
      });
    }
  } catch (error) {
    console.error('❌ Error manually loading environment:', error);
  }
}

export async function POST(request: NextRequest) {
  // Environment check
  if (!process.env.OPENAI_API_KEY) {
    loadEnvManually();
  }

  try {
    const body = await request.json();
    
    // Validate that we have a proper request body
    if (!body || typeof body !== 'object') {
      console.error('❌ Invalid request body:', body);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    // Handle both flat and nested transaction formats
    let description, amount, category;
    
    if (body.transaction) {
      // Nested format from frontend
      description = body.transaction.description;
      amount = body.transaction.amount;
      category = body.category;
    } else {
      // Flat format from direct API calls
      description = body.description;
      amount = body.amount;
      category = body.category;
    }

    // Initialize Chart of Accounts
    const chartOfAccounts = new ChartOfAccounts('ON');

    // Check if this is an AI button click (no category provided OR forceAI is true)
    if (!category || body.forceAI) {
      // Check cache first for performance
      const cacheKey = `${description}_${amount}`;
      const cachedResult = categorizationCache.get(cacheKey);
      if (cachedResult && (Date.now() - cachedResult.timestamp < CACHE_DURATION)) {
        return NextResponse.json({
          ...cachedResult.result,
          source: 'chatgpt-cached'
        });
      }
      
      // Check OpenAI API key one more time before calling
      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey || openaiKey.length < 10) {
        // Fall back to local categorization
        
        // Fall back to local categorization
        const aiEngine = new AIEngine('ON');
        await aiEngine.initialize();
        const transaction = {
          id: Date.now().toString(),
          description,
          originalDescription: description,
          amount,
          date: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
        };
        const result = aiEngine.categorizeTransaction(transaction);
        return NextResponse.json(result);
      }

      // Calling ChatGPT for categorization
      
      try {
        // Import OpenAI client
        const { openAIClient } = await import('../../../lib/openaiClient');
        
        // Get all accounts for context
        const accounts = chartOfAccounts.getAllAccounts();
        const accountsList = accounts.map((acc: any) => `${acc.code} - ${acc.name}`).join('\n');

        // Enhanced prompt with web research and merchant intelligence
        const prompt = `You are an expert financial transaction categorization specialist with access to real-time web search and business intelligence databases. Analyze this transaction with comprehensive merchant research.

TRANSACTION DETAILS:
- Description: "${description}"
- Amount: $${amount}
- Business Context: Canadian construction/manufacturing business - focus on distinguishing between direct customer project costs vs internal operations
- Business Model: Construction contractor - materials for customer projects = Cost of Goods Sold, internal supplies = Supplies
- Transaction Type: ${amount < 0 ? 'OUTFLOW (Money Going Out - Expense/Purchase)' : 'INFLOW (Money Coming In - Revenue/Deposit)'}

CRITICAL CONSISTENCY RULES - NEVER DEVIATE FROM THESE:
- **ALWAYS categorize the same merchant the same way** - be consistent across all transactions
- **BROCK WHITE** = Construction materials supplier → ALWAYS 310 (Cost of Goods Sold) - materials for customer projects
- **AXIOM LEASING** = Equipment leasing company → ALWAYS 468 (Commercial Rent) - equipment lease payments
- **VALLEY VARIETY** = Local supplier → ALWAYS 455 (Supplies) for small tools/supplies
- **MORTGAGE** payments → ALWAYS 437 (Interest Expense) - never categorize as supplies
- **SASKATOON COOP** = Retail supplier → ALWAYS 455 (Supplies) - not advertising or revenue
- **EQUIPMT LEASE** or **EQUIPMENT LEASE** → ALWAYS 468 (Commercial Rent) - operating lease expense
- **WIRE TRANSFER** → ALWAYS 404 (Bank Fees) - transfer fees
- **E-TRANSFER FEE** → ALWAYS 404 (Bank Fees) - electronic transfer fees

MERCHANT CONSISTENCY DATABASE:
Use this exact mapping for known merchants to ensure 100% consistency:
- Brock White Canada → 310 (Cost of Goods Sold)
- Axiom Leasing Inc → 468 (Commercial Rent)  
- Valley Variety → 455 (Supplies)
- Saskatoon Coop → 455 (Supplies)
- McDonald's → 420 (Entertainment)
- Tim Hortons → 420 (Entertainment)
- Home Depot → 310 (Cost of Goods Sold) or 455 (Supplies) based on context
- Canadian Tire → 455 (Supplies)
- Rona → 310 (Cost of Goods Sold) or 455 (Supplies) based on context

CRITICAL ACCOUNTING RULES:
- NEGATIVE amounts (-$) = MONEY GOING OUT = Expenses, Purchases, Payments (accounts 400-799)  
- POSITIVE amounts (+$) = MONEY COMING IN = Revenue, Deposits, Receipts (accounts 100-399)

MERCHANT RESEARCH PROTOCOL:
For each transaction, conduct thorough research using your knowledge base:
1. **Identify the specific merchant** - exact business name, location, industry
2. **Research merchant type** - What do they sell? What services do they provide?
3. **Verify business category** - Restaurant, supplier, utility, service provider, etc.
4. **Check location context** - Canadian business practices, regional suppliers
5. **Analyze transaction patterns** - Typical purchase amounts, frequency, business purpose

ENHANCED BUSINESS INTELLIGENCE:
- Use real merchant data to understand their actual products/services
- Consider the specific location and business practices in that area
- Factor in typical business relationships between merchants and construction/manufacturing companies
- Analyze the transaction amount in context of what this merchant typically sells
- Consider seasonal factors and industry-specific purchasing patterns

SPECIFIC CATEGORIZATION GUIDELINES:

**CRITICAL DECISION TREE FOR MATERIALS:**
- **Materials for customer projects/resale** → 310 (Cost of Goods Sold)
- **Materials for internal business use** → 455 (Supplies and Small Tools)
- **Office supplies, cleaning supplies** → 453 (Office Expenses)

**EQUIPMENT CLASSIFICATION:**
- **Equipment purchases (ownership)** → 710 (Equipment)
- **Equipment lease payments (operating leases)** → 468 (Commercial Rent)
- **Equipment rental (short-term)** → 455 (Supplies and Small Tools)

**OTHER CATEGORIES:**
- **Business Meals** (restaurants, cafes) → 420 (Entertainment) - 50% deductible
- **Utilities** (hydro, gas, water, internet) → 442 (Electricity), 445 (Natural Gas), 447 (Water), 489 (Telephone & Internet)
- **Vehicle Related** (fuel, maintenance, parts) → 449 (Motor Vehicle Expenses)
- **Financial Services** (bank fees, credit processing) → 404 (Bank Fees), 888 (Processing Fees)
- **Professional Services** (accounting, legal, consulting) → 412 (Consulting & Accounting), 441 (Legal expenses)
- **Property Costs** (mortgage, rent, insurance) → 468 (Commercial Rent), 437 (Interest Expense), 433 (Insurance)

Available Account Codes:
${accountsList}

ENHANCED CATEGORIZATION PROCESS:
1. **Research the merchant** - Use knowledge base to identify exact business type and services
2. **Determine business purpose** - Is this for customer projects (Cost of Goods) or internal operations (Supplies)?
3. **Verify transaction logic** - Does the amount make sense for this merchant's typical products?
4. **Apply accounting rules** - Correct inflow/outflow categorization
5. **Choose most specific account** - Use decision tree above for materials and equipment
6. **Generate merchant-specific keyword** - Use actual merchant name/location for future recognition

KEYWORD GENERATION RULES:
- ALWAYS use the specific merchant name and location, NOT generic categories
- Example: "Valley Variety Vienna" NOT "Supplies"
- Example: "McDonald's Aylmer" NOT "Restaurant"  
- Example: "Brock White Construction" NOT "Construction Materials"
- Extract the key identifying information from the transaction description
- Include location if available to distinguish between multiple locations

Respond in this EXACT format:
ACCOUNT_CODE: [code]
CONFIDENCE: [percentage]%
REASONING: [Include detailed merchant research, business logic, and amount analysis]
KEYWORD: [specific merchant name/location - NO generic terms]`;

        const completion = await openAIClient.createChatCompletion([
          { role: 'user', content: prompt }
        ], {
          model: 'gpt-3.5-turbo',
          maxTokens: 300,
          temperature: 0.3,
        });

        if (completion.success && completion.response) {
          // ChatGPT response received

          // Parse the response
          const lines = completion.response.split('\n');
          const accountCodeMatch = lines.find((line: string) => line.startsWith('ACCOUNT_CODE:'))?.split(':')[1]?.trim();
          const confidenceMatch = lines.find((line: string) => line.startsWith('CONFIDENCE:'))?.split(':')[1]?.trim().replace('%', '');
          const reasoningMatch = lines.find((line: string) => line.startsWith('REASONING:'))?.split(':')[1]?.trim();
          const keywordMatch = lines.find((line: string) => line.startsWith('KEYWORD:'))?.split(':')[1]?.trim();

          if (accountCodeMatch && confidenceMatch) {
            const result = {
              accountCode: accountCodeMatch,
              confidence: parseInt(confidenceMatch),
              reasoning: reasoningMatch || 'ChatGPT categorization',
              suggestedKeyword: keywordMatch && keywordMatch !== 'None' ? keywordMatch : undefined,
              source: 'chatgpt'
            };

            // ChatGPT categorization successful
            
            // Cache the result for future requests
            categorizationCache.set(cacheKey, {
              result,
              timestamp: Date.now()
            });
            
            return NextResponse.json(result);
          }
        }

        throw new Error('Invalid ChatGPT response format');

      } catch (openaiError) {
        console.error('❌ OpenAI API error:', openaiError);
        // Falling back to local categorization
        
        // Fall back to local categorization
        const aiEngine = new AIEngine('ON');
        await aiEngine.initialize();
        const transaction = {
          id: Date.now().toString(),
          description,
          originalDescription: description,
          amount,
          date: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
        };
        const result = aiEngine.categorizeTransaction(transaction);
        return NextResponse.json(result);
      }
    }

    // If category is provided, use local categorization
    const aiEngine = new AIEngine('ON');
    await aiEngine.initialize();
    const transaction = {
      id: Date.now().toString(),
      description,
      originalDescription: description,
      amount,
      date: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    };
    const result = aiEngine.categorizeTransaction(transaction);
    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ API error:', error);
    return NextResponse.json(
      { error: 'Failed to categorize transaction' },
      { status: 500 }
    );
  }
} 