import { NextRequest, NextResponse } from 'next/server';
import { UnifiedCategorizationEngine } from '../../../lib/unifiedCategorizationEngine';
import { ChartOfAccounts } from '../../../lib/chartOfAccounts';
import { openAIClient } from '../../../lib/openaiClient';
import { getCurrentUser } from '../../../lib/supabase';
import fs from 'fs';
import path from 'path';

// Enhanced categorization cache
interface CachedCategorizationResult {
  result: {
    accountCode: string;
    confidence: number;
    reasoning: string;
    suggestedKeyword?: string;
    source: string;
  };
  timestamp: number;
}

const categorizationCache = new Map<string, CachedCategorizationResult>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes (shorter for testing)

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
    let description, amount, category, province;
    
    if (body.transaction) {
      // Nested format from frontend
      description = body.transaction.description;
      amount = body.transaction.amount;
      category = body.category;
      province = body.province || 'ON'; // Default to Ontario if not specified
    } else {
      // Flat format from direct API calls
      description = body.description;
      amount = body.amount;
      category = body.category;
      province = body.province || 'ON'; // Default to Ontario if not specified
    }

    // Initialize Chart of Accounts for the specified province
    const chartOfAccounts = ChartOfAccounts.getInstance(province);
    await chartOfAccounts.waitForInitialization();

    // Check if this is an AI button click (no category provided OR forceAI is true)
    if (!category || body.forceAI) {
      // Check cache first for performance (include province in cache key)
      const cacheKey = `${description}_${amount}_${province}`;
      const cachedResult = categorizationCache.get(cacheKey);
      
      // Skip cache if clearCache is requested
      if (cachedResult && (Date.now() - cachedResult.timestamp < CACHE_DURATION) && !body.clearCache) {
        console.log('🔄 Using cached result for:', description);
        return NextResponse.json({
          ...cachedResult.result,
          reasoning: cachedResult.result.reasoning || 'Previously categorized with AI', // Ensure reasoning is included
          source: cachedResult.result.source || 'cached'
        });
      }
      
      console.log('🤖 AI button clicked - calling ChatGPT for reasoning...');
      console.log(`📝 Transaction details: "${description}" (${amount})`);
      console.log(`🏛️ Province: ${province}`);
      
      // AI Button should ALWAYS go to ChatGPT for reasoning
      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey || openaiKey.length < 10) {
        console.warn('⚠️ No OpenAI API key found, falling back to unified engine');
        
        // Get current user for fallback unified engine
        const currentUser = await getCurrentUser();
        const userId = currentUser?.id;
        const unifiedEngine = UnifiedCategorizationEngine.getInstance(province, userId);
        await unifiedEngine.initialize();
        const transaction = {
          id: Date.now().toString(),
          description,
          originalDescription: description,
          amount,
          date: new Date().toISOString().split('T')[0]
        };
        const result = await unifiedEngine.categorizeTransaction(transaction);
        
        return NextResponse.json({
          accountCode: result.accountCode || '453',
          confidence: result.confidence || 30,
          reasoning: result.reasoning || 'No AI key available, using pattern matching',
          suggestedKeyword: result.suggestedKeyword,
          source: result.source || 'local'
        });
      }

      console.log('🤖 Calling ChatGPT for categorization...');
      
      try {
        // Import OpenAI client
        const { openAIClient } = await import('../../../lib/openaiClient');
        
        // Get all accounts for the specified province
        const accounts = chartOfAccounts.getAllAccounts();
        const accountsList = accounts.map((acc: any) => `${acc.code} - ${acc.name}`).join('\n');

        // Enhanced prompt with province-specific context
        const prompt = `You are an expert financial transaction categorization specialist for Canadian businesses. Analyze this transaction for a business in ${province}.

TRANSACTION DETAILS:
- Description: "${description}"
- Amount: $${amount}
- Province: ${province}
- Business Context: Canadian construction/manufacturing business - focus on distinguishing between direct customer project costs vs internal operations
- Business Model: Construction contractor - materials for customer projects = Cost of Goods Sold, internal supplies = Supplies
- Transaction Type: ${amount < 0 ? 'OUTFLOW (Money Going Out - Expense/Purchase)' : 'INFLOW (Money Coming In - Revenue/Deposit)'}

AVAILABLE ACCOUNT CODES FOR ${province}:
${accountsList}

IMPORTANT: You MUST use ONLY the account codes from the list above. Do not use any account codes that are not in this list.

## **🚨 CRITICAL VALIDATION RULES - FOLLOW EXACTLY OR RESPONSE WILL BE AUTO-CORRECTED 🚨**

### **LOGICAL AMOUNT vs ACCOUNT TYPE VALIDATION (HIGHEST PRIORITY)**
- **NEGATIVE AMOUNTS (Outflows)** can ONLY be categorized as:
  - Expense accounts (400s, 300s, 500s) 
  - Asset purchases (600s, 700s)
  - Liability payments (800s)
  - Transfers (877)
- **POSITIVE AMOUNTS (Inflows)** can ONLY be categorized as:
  - Revenue accounts (200, 220, 260, 270)
  - Asset sales (600s, 700s in special cases)
  - Liability increases (800s in special cases) 
  - Transfers (877)

### **FORBIDDEN COMBINATIONS - THESE WILL BE AUTO-CORRECTED:**
- ❌ Negative amount + Revenue account (200, 220, 260, 270) = ILLOGICAL
- ❌ Positive amount + Expense account (300s, 400s, 500s) = ILLOGICAL

### **EXAMPLES OF CORRECT LOGIC:**
- ✅ -$50 Shell Gas → 449 (Motor Vehicle Expenses) ✓ Negative expense = correct
- ✅ +$1000 Customer Payment → 200 (Sales Revenue) ✓ Positive revenue = correct
- ❌ -$50 Customer Payment → 200 (Sales Revenue) ✗ Negative revenue = IMPOSSIBLE
- ❌ +$50 Shell Gas → 449 (Motor Vehicle Expenses) ✗ Positive expense = IMPOSSIBLE

## **CRITICAL CONSISTENCY RULES - FOLLOW EXACTLY**

### **E-TRANSFER PATTERNS (Highest Priority)**
- **SEND E-TFR FEE** → ALWAYS 404 (Bank Fees) - E-Transfer sending fee
- **RCV E-TFR FEE** → ALWAYS 404 (Bank Fees) - E-Transfer receiving fee  
- **E-TFR FEE** → ALWAYS 404 (Bank Fees) - General E-Transfer fee
- **ETFR FEE** → ALWAYS 404 (Bank Fees) - Short form E-Transfer fee
- **EMAIL MONEY TRANSFER FEE** → ALWAYS 404 (Bank Fees) - EMT fee
- **EMT FEE** → ALWAYS 404 (Bank Fees) - Email Money Transfer fee
- **SEND MONEY FEE** → ALWAYS 404 (Bank Fees) - Send money fee
- **SEND E-TFR** (without fee) → ALWAYS 877 (Tracking Transfers) - Sending money
- **RCV E-TFR** (without fee) → ALWAYS 877 (Tracking Transfers) - Receiving money
- **RECEIVE E-TFR** → ALWAYS 877 (Tracking Transfers) - Receiving money
- **E-TFR** (without fee) → ALWAYS 877 (Tracking Transfers) - General E-Transfer
- **ETFR** (without fee) → ALWAYS 877 (Tracking Transfers) - Short form E-Transfer
- **EMAIL MONEY TRANSFER** (without fee) → ALWAYS 877 (Tracking Transfers) - EMT
- **EMT** (without fee) → ALWAYS 877 (Tracking Transfers) - Email Money Transfer
- **SEND MONEY** (without fee) → ALWAYS 877 (Tracking Transfers) - Send money
- **RECEIVE MONEY** → ALWAYS 877 (Tracking Transfers) - Receive money
- **E-TFR REVERSAL** → ALWAYS 877 (Tracking Transfers) - E-Transfer reversal
- **E-TFR RETURN** → ALWAYS 877 (Tracking Transfers) - E-Transfer return
- **E-TFR CANCELLED** → ALWAYS 877 (Tracking Transfers) - E-Transfer cancelled
- **E-TFR DECLINED** → ALWAYS 877 (Tracking Transfers) - E-Transfer declined
- **SEND E-TFR REVERSAL** → ALWAYS 877 (Tracking Transfers) - Send E-Transfer reversal
- **RCV E-TFR REVERSAL** → ALWAYS 877 (Tracking Transfers) - Receive E-Transfer reversal
- **INTERAC E-TRANSFER** (without fee) → ALWAYS 877 (Tracking Transfers) - Money transfers
- **SERVICE CHARGE INTERAC E-TRANSFER FEE** → ALWAYS 404 (Bank Fees) - Transfer fees
- **DEBIT MEMO** + **INTERAC E-TRANSFER** → ALWAYS 877 (Tracking Transfers) - Outgoing transfers
- **CREDIT MEMO** + **INTERAC E-TRANSFER** → ALWAYS 877 (Tracking Transfers) - Incoming transfers
- **DEBIT MEMO SEND E-TFR** → ALWAYS 877 (Tracking Transfers) - Outgoing transfers
- **CREDIT MEMO RCV E-TFR** → ALWAYS 877 (Tracking Transfers) - Incoming transfers

### **BANK TRANSACTION PATTERNS**
- **FEDERAL PAYMENT CANADA** → ALWAYS 200 (Sales Revenue) - Government payments/contracts
- **PROVINCIAL PAYMENT** → ALWAYS 200 (Sales Revenue) - Government payments/contracts  
- **DEPOSIT** (Hamilton ON, MB-DEP, etc.) → ALWAYS 200 (Sales Revenue) - Customer payments
- **INTEREST CREDIT** → ALWAYS 270 (Interest Income) - Bank interest earned
- **BALANCE FORWARD** → ALWAYS 877 (Tracking Transfers) - Carried forward balances
- **TRANSFER TO CR. CARD** → ALWAYS 877 (Tracking Transfers) - Credit card payments
- **TRANSFER TO** (with account numbers) → ALWAYS 877 (Tracking Transfers) - Account transfers
- **BUSINESS PAD** + **GOVERNMENT TAX PAYMENTS** → ALWAYS 820 (Sales Tax) - Tax payments
- **ACCOUNTS PAYABLE** → ALWAYS 800 (Accounts Payable) - Supplier payments
- **INVESTMENT PURCHASE** → ALWAYS 877 (Tracking Transfers) - Investment transactions
- **SERVICE CHARGE** (monthly) → ALWAYS 404 (Bank Fees) - Monthly bank fees

**USER PREFERENCE RULES:**
- **ANY TRANSFERS** (including e-transfers, account transfers, etc.) → ALWAYS 877 (Tracking Transfers) - User specifically prefers all transfers categorized to Transfers/Tracking account

**SPECIFIC BILL PAYMENT PATTERNS:**
- **MB-BILL PAYMENT** followed by credit card names → ALWAYS 800 (Accounts Payable) - Credit card payments
- **MB-BILL PAYMENT WALMART MASTERCARD** → ALWAYS 800 (Accounts Payable)
- **MB-BILL PAYMENT ROGERS BANK MASTERCARD** → ALWAYS 800 (Accounts Payable)
- **MB-BILL PAYMENT CAPITAL ONE MASTERCARD** → ALWAYS 800 (Accounts Payable)
- **MB-BILL PAYMENT VIRGIN PLUS** → ALWAYS 489 (Telephone & Internet) - Cell phone bill
- **MB-BILL PAYMENT ROGERS** (without mastercard) → ALWAYS 489 (Telephone & Internet)
- **MB-BILL PAYMENT BELL** → ALWAYS 489 (Telephone & Internet)
- **MB-BILL PAYMENT TELUS** → ALWAYS 489 (Telephone & Internet)
- **MB-BILL PAYMENT HYDRO** → ALWAYS 442 (Electricity) - Utility bill
- **MB-BILL PAYMENT AVIVA INSURANCE** → ALWAYS 433 (Insurance) - Insurance

**FOOD PURCHASES - NEVER COST OF GOODS SOLD:**
- **ALL food/meals/restaurants** → 420 (Entertainment), NEVER 310 (Cost of Goods Sold)
- **ALWAYS categorize the same merchant the same way** - be consistent across all transactions

**CONSTRUCTION/BUSINESS SPECIFIC:**
- **BROCK WHITE** = Construction materials supplier → ALWAYS 310 (Cost of Goods Sold)
- **AXIOM LEASING** = Equipment leasing company → ALWAYS 468 (Commercial Rent)
- **VALLEY VARIETY** = Local supplier → ALWAYS 455 (Supplies)
- **EQUIPMT LEASE** or **EQUIPMENT LEASE** → ALWAYS 468 (Commercial Rent)
- **MORTGAGE** payments → ALWAYS 469 (Rent) - Mortgage interest
- **SASKATOON COOP** = Retail supplier → ALWAYS 455 (Supplies)

MERCHANT CONSISTENCY DATABASE:
Use this exact mapping for known merchants to ensure 100% consistency:
- Federal Payment Canada → 200 (Sales Revenue)
- Provincial Payment → 200 (Sales Revenue)
- Deposit Hamilton ON → 200 (Sales Revenue)
- Interest Credit → 270 (Interest Income)
- Service Charge Interac E-Transfer Fee → 404 (Bank Fees)
- Business Pad Government Tax Payments → 820 (Sales Tax)
- Transfer to CR Card → 877 (Tracking Transfers)
- Debit Memo Interac E-Transfer → 877 (Tracking Transfers)
- Credit Memo Interac E-Transfer → 877 (Tracking Transfers)
- Balance Forward → 877 (Tracking Transfers)
- Accounts Payable → 800 (Accounts Payable)
- Investment Purchase → 877 (Tracking Transfers)
- Service Charge (monthly) → 404 (Bank Fees)
- MB-Bill payment Virgin Plus → 489 (Telephone & Internet)
- MB-Bill payment Walmart Mastercard → 800 (Accounts Payable)
- MB-Bill payment Rogers Bank Mastercard → 800 (Accounts Payable)
- MB-Bill payment Capital One Mastercard → 800 (Accounts Payable)
- MB-Bill payment Rogers → 489 (Telephone & Internet)
- MB-Bill payment Bell → 489 (Telephone & Internet)
- MB-Bill payment Telus → 489 (Telephone & Internet)
- MB-Bill payment Hydro → 442 (Electricity)
- MB-Bill payment Aviva Insurance → 433 (Insurance)
- Brock White Canada → 310 (Cost of Goods Sold)
- Axiom Leasing Inc → 468 (Commercial Rent)  
- Valley Variety → 455 (Supplies)
- Saskatoon Coop → 455 (Supplies)
- McDonald's → 420 (Entertainment)
- Tim Hortons → 420 (Entertainment)
- Burger King → 420 (Entertainment)
- KFC → 420 (Entertainment)
- Subway → 420 (Entertainment)
- Pizza Hut → 420 (Entertainment)
- Wendy's → 420 (Entertainment)
- Taco Bell → 420 (Entertainment)
- Dairy Queen → 420 (Entertainment)
- A&W → 420 (Entertainment)
- Harvey's → 420 (Entertainment)
- Swiss Chalet → 420 (Entertainment)
- Boston Pizza → 420 (Entertainment)
- Starbucks → 420 (Entertainment)
- Coffee Time → 420 (Entertainment)
- Country Style → 420 (Entertainment)
- Second Cup → 420 (Entertainment)
- Dollar Tree → 420 (Entertainment) if food/snacks, 455 (Supplies) if household items
- 7-Eleven → 420 (Entertainment)
- Circle K → 420 (Entertainment)
- Convenience stores → 420 (Entertainment) if food/snacks
- Restaurants (all types) → 420 (Entertainment)
- Cafes → 420 (Entertainment)
- Food courts → 420 (Entertainment)
- Delis → 420 (Entertainment)
- Bakeries → 420 (Entertainment)
- Home Depot → 310 (Cost of Goods Sold) or 455 (Supplies) based on context
- Canadian Tire → 455 (Supplies)

**SUPPLIES AND SMALL TOOLS (455) - USE SPARINGLY:**
Only use account 455 (Supplies and Small Tools) for:
- Small hand tools under $500
- Office supplies (paper, pens, etc.)
- Cleaning supplies 
- Minor hardware items
- Small consumable items

**DO NOT use 455 for:**
- Gas/fuel purchases → Use 449 (Motor Vehicle Expenses)
- Subscription services → Use 485 (Subscriptions)  
- Software purchases → Use 485 (Subscriptions)
- Equipment rental → Use 468 (Commercial Rent)
- Food/meals → Use 420 (Entertainment)
- Utilities → Use appropriate utility accounts (442, 445, 447)
- Insurance → Use 433 (Insurance)
- Professional services → Use 441 (Legal expenses) or appropriate service account

**ANALYSIS APPROACH:**
1. First, check if the transaction description matches ANY of the specific patterns above
2. If it matches a pattern, use the corresponding account code
3. If no pattern matches, analyze the business context and transaction type
4. Consider whether this is a revenue (inflow) or expense (outflow)
5. For expenses, determine if it's for customer projects (Cost of Goods Sold) or internal operations (other expense categories)
6. AVOID defaulting to 455 (Supplies) unless it's clearly small tools or office supplies
7. Consider more specific expense categories before using general supplies

**RESPONSE FORMAT:**
You must respond with EXACTLY this format:
ACCOUNT_CODE: [code]
CONFIDENCE: [0-100]%
REASONING: [explanation of why this account was chosen]
KEYWORD: [suggested keyword for future pattern matching]

Example response:
ACCOUNT_CODE: 877
CONFIDENCE: 95%
REASONING: This is a "DEBIT MEMO INTERAC E-TRANSFER" which represents money being transferred out of the account electronically. According to the Canadian banking transaction rules, all Interac E-Transfers without fees should be categorized as Tracking Transfers (877) since they represent money movement between accounts rather than business expenses.
KEYWORD: interac e-transfer

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
          console.log('🤖 ChatGPT response:', completion.response);

          // Parse the response
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

          // Validate that the account code exists in the province's chart of accounts
          const accountExists = chartOfAccounts.getAccount(accountCode);
          if (!accountExists) {
            console.warn(`⚠️ Account code ${accountCode} not found in ${province} chart of accounts. Using fallback.`);
            // Fall back to local categorization with correct province (using unified engine)
            const currentUser = await getCurrentUser();
            const userId = currentUser?.id;
            const unifiedEngine = UnifiedCategorizationEngine.getInstance(province, userId);
            await unifiedEngine.initialize();
            const transaction = {
              id: Date.now().toString(),
              description,
              originalDescription: description,
              amount,
              date: new Date().toISOString().split('T')[0]
            };
            const result = await unifiedEngine.categorizeTransaction(transaction);
            return NextResponse.json({
              accountCode: result.accountCode,
              confidence: result.confidence,
              reasoning: result.reasoning,
              suggestedKeyword: result.suggestedKeyword,
              source: result.source
            });
          }

          // CRITICAL VALIDATION: Ensure transaction amount and account type make logical sense
          const accountInfo = accountExists;
          const isNegativeAmount = amount < 0; // Outflow (money going out)
          const isPositiveAmount = amount > 0; // Inflow (money coming in)
          
          // Define account type validation rules
          const revenueAccounts = ['200', '220', '260', '270']; // Revenue accounts
          const expenseAccounts = ['300', '310', '312', '314', '315', '400', '404', '408', '412', '416', '420', '424', '429', '433', '437', '441', '442', '445', '447', '449', '453', '455', '461', '462', '465', '468', '469', '473', '485', '489', '493', '497', '501', '502', '505', '507', '508']; // Expense and cost accounts
          const transferAccounts = ['877']; // Special transfer accounts (can be either positive or negative)
          const assetLiabilityAccounts = ['610', '615', '620', '630', '640', '710', '711', '800', '820']; // Assets, liabilities, tax accounts

          let validationError = false;
          let correctedAccountCode = accountCode;
          let correctedReasoning = reasoning;

          // Check for logical inconsistencies
          if (isNegativeAmount && revenueAccounts.includes(accountCode)) {
            // Negative amount categorized as revenue - this is wrong!
            console.warn(`🚨 VALIDATION ERROR: Negative amount ($${amount}) categorized as Revenue account (${accountCode}). This is illogical!`);
            validationError = true;
            
            // Auto-correct to a more appropriate expense account
            if (description.toLowerCase().includes('fee') || description.toLowerCase().includes('charge')) {
              correctedAccountCode = '404'; // Bank Fees
              correctedReasoning = `Auto-corrected: Negative amount cannot be revenue. "${description}" appears to be a fee, categorized as Bank Fees (404).`;
            } else if (description.toLowerCase().includes('gas') || description.toLowerCase().includes('fuel')) {
              correctedAccountCode = '449'; // Motor Vehicle Expenses
              correctedReasoning = `Auto-corrected: Negative amount cannot be revenue. "${description}" appears to be fuel expense, categorized as Motor Vehicle Expenses (449).`;
            } else {
              correctedAccountCode = '455'; // General supplies as fallback
              correctedReasoning = `Auto-corrected: Negative amount cannot be revenue. "${description}" categorized as general expense under Supplies and Small Tools (455).`;
            }
          } else if (isPositiveAmount && expenseAccounts.includes(accountCode)) {
            // Positive amount categorized as expense - this is wrong!
            console.warn(`🚨 VALIDATION ERROR: Positive amount ($${amount}) categorized as Expense account (${accountCode}). This is illogical!`);
            validationError = true;
            
            // Auto-correct to revenue account
            correctedAccountCode = '200'; // Sales Revenue
            correctedReasoning = `Auto-corrected: Positive amount cannot be an expense. "${description}" appears to be income, categorized as Sales Revenue (200).`;
          }

          // Log validation results
          if (validationError) {
            console.log(`✅ VALIDATION CORRECTED: Original: ${accountCode} → Corrected: ${correctedAccountCode}`);
            confidence = Math.max(confidence - 20, 50); // Reduce confidence due to correction
          } else {
            console.log(`✅ VALIDATION PASSED: Amount $${amount} correctly categorized as ${accountInfo.type} account (${accountCode})`);
          }

          const result = {
            accountCode: correctedAccountCode,
            confidence: Math.min(confidence, 100),
            reasoning: correctedReasoning,
            suggestedKeyword,
            source: validationError ? 'chatgpt-corrected' : 'chatgpt'
          };

          // Cache the result (include province in cache key)
          categorizationCache.set(cacheKey, {
            result,
            timestamp: Date.now()
          });

          console.log('✅ ChatGPT categorization successful:', result);
          return NextResponse.json(result);
        }
      } catch (error) {
        console.error('❌ ChatGPT API error:', error);
        // Fall back to local categorization with correct province (using unified engine)
        const currentUser = await getCurrentUser();
        const userId = currentUser?.id;
        const unifiedEngine = UnifiedCategorizationEngine.getInstance(province, userId);
        await unifiedEngine.initialize();
        const transaction = {
          id: Date.now().toString(),
          description,
          originalDescription: description,
          amount,
          date: new Date().toISOString().split('T')[0]
        };
        const result = await unifiedEngine.categorizeTransaction(transaction);
        return NextResponse.json({
          accountCode: result.accountCode,
          confidence: result.confidence,
          reasoning: result.reasoning,
          suggestedKeyword: result.suggestedKeyword,
          source: result.source
        });
      }
    }

    // If we get here, something went wrong
    console.error('❌ No categorization result available');
    return NextResponse.json(
      { error: 'No categorization result available' },
      { status: 500 }
    );

  } catch (error) {
    console.error('❌ API route error:', error);
    return NextResponse.json(
      { error: 'Failed to process categorization request' },
      { status: 500 }
    );
  }
} 