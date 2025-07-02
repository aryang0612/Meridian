import Papa from 'papaparse';
import { Transaction, ValidationResult } from './types';
import { BANK_FORMATS, BankFormat } from '../data/bankFormats';
import { AIEngine } from './aiEngine';
import { detectDuplicates, DuplicateDetectionResult } from './duplicateDetector';

// Enhanced header formatting patterns
const HEADER_PATTERNS = {
  date: [
    'date', 'transaction date', 'posting date', 'value date', 'effective date',
    'date posted', 'date processed', 'transaction date', 'post date',
    'settlement date', 'clearing date', 'book date', 'entry date'
  ],
  description: [
    'description', 'transaction details', 'details', 'narration', 'memo',
    'note', 'reference', 'transaction description', 'transaction details',
    'payee', 'merchant', 'vendor', 'transaction type', 'activity',
    'transaction narrative', 'transaction memo', 'transaction note',
    'description of transaction', 'transaction description', 'details of transaction'
  ],
  amount: [
    'amount', 'transaction amount', 'value', 'balance', 'debit', 'credit',
    'withdrawal', 'deposit', 'transaction value', 'amount debited',
    'amount credited', 'debit amount', 'credit amount', 'transaction balance',
    'net amount', 'total amount', 'transaction total', 'amount in cad',
    'amount in usd', 'amount in foreign currency'
  ],
  balance: [
    'balance', 'running balance', 'account balance', 'closing balance',
    'ending balance', 'current balance', 'balance after transaction',
    'available balance', 'ledger balance', 'book balance'
  ],
  reference: [
    'reference', 'reference number', 'transaction id', 'transaction number',
    'check number', 'cheque number', 'reference code', 'transaction reference',
    'confirmation number', 'trace number', 'sequence number'
  ],
  category: [
    'category', 'transaction category', 'account category', 'type',
    'transaction type', 'activity type', 'category code', 'account type'
  ]
};

// Header normalization and formatting options
const HEADER_FORMATTING_OPTIONS = {
  // Remove common prefixes/suffixes
  removePrefixes: ['the ', 'transaction ', 'account ', 'bank ', 'statement '],
  removeSuffixes: [' column', ' field', ' info', ' data'],
  
  // Common abbreviations to expand
  abbreviations: {
    'desc': 'description',
    'amt': 'amount',
    'bal': 'balance',
    'ref': 'reference',
    'cat': 'category',
    'txn': 'transaction',
    'dt': 'date',
    'debit': 'amount',
    'credit': 'amount'
  },
  
  // Common misspellings and variations
  corrections: {
    'desciption': 'description',
    'desription': 'description',
    'ammount': 'amount',
    'balence': 'balance',
    'refrence': 'reference',
    'catagory': 'category',
    'tranaction': 'transaction',
    'tranasction': 'transaction',
    'transction': 'transaction',
    'transaciton': 'transaction',
    'transacton': 'transaction',
    'transactin': 'transaction',
    'transactio': 'transaction',
    'transacti': 'transaction',
    'transact': 'transaction',
    'transac': 'transaction',
    'transa': 'transaction',
    'trans': 'transaction',
    'tran': 'transaction',
    'tr': 'transaction'
  }
};

export class CSVProcessor {
  private aiEngine = new AIEngine();

  /**
   * Enhanced header normalization with comprehensive formatting
   */
  private normalizeHeader(header: string): string {
    if (!header) return '';
    
    let normalized = header
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s]/g, ' ') // Remove special characters except spaces
      .trim();
    
    // Apply corrections for common misspellings
    for (const [incorrect, correct] of Object.entries(HEADER_FORMATTING_OPTIONS.corrections)) {
      normalized = normalized.replace(new RegExp(incorrect, 'gi'), correct);
    }
    
    // Expand abbreviations
    for (const [abbr, full] of Object.entries(HEADER_FORMATTING_OPTIONS.abbreviations)) {
      normalized = normalized.replace(new RegExp(`\\b${abbr}\\b`, 'gi'), full);
    }
    
    // Remove common prefixes
    for (const prefix of HEADER_FORMATTING_OPTIONS.removePrefixes) {
      if (normalized.startsWith(prefix)) {
        normalized = normalized.substring(prefix.length).trim();
      }
    }
    
    // Remove common suffixes
    for (const suffix of HEADER_FORMATTING_OPTIONS.removeSuffixes) {
      if (normalized.endsWith(suffix)) {
        normalized = normalized.substring(0, normalized.length - suffix.length).trim();
      }
    }
    
    return normalized;
  }

  /**
   * Enhanced header classification with pattern matching
   */
  private classifyHeader(header: string): { type: string; confidence: number; alternatives: string[] } {
    const normalized = this.normalizeHeader(header);
    let bestMatch = { type: 'unknown', confidence: 0, alternatives: [] as string[] };
    
    // Check each pattern type
    for (const [type, patterns] of Object.entries(HEADER_PATTERNS)) {
      for (const pattern of patterns) {
        const similarity = this.calculateSimilarity(normalized, pattern);
        if (similarity > bestMatch.confidence) {
          bestMatch = {
            type,
            confidence: similarity,
            alternatives: patterns.filter(p => p !== pattern)
          };
        }
      }
    }
    
    return bestMatch;
  }

  /**
   * Calculate similarity between two strings (simple implementation)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (str1.includes(str2) || str2.includes(str1)) return 0.9;
    
    // Simple word-based similarity
    const words1 = str1.split(' ');
    const words2 = str2.split(' ');
    const commonWords = words1.filter(w1 => words2.some(w2 => w1 === w2 || w1.includes(w2) || w2.includes(w1)));
    
    if (commonWords.length === 0) return 0;
    
    return commonWords.length / Math.max(words1.length, words2.length);
  }

  /**
   * Enhanced header mapping with suggestions
   */
  private mapHeadersToColumns(headers: string[]): {
    dateColumn?: string;
    descriptionColumn?: string;
    amountColumn?: string;
    balanceColumn?: string;
    referenceColumn?: string;
    categoryColumn?: string;
    suggestions: { [key: string]: string[] };
    confidence: { [key: string]: number };
  } {
    const mapping: any = {};
    const suggestions: { [key: string]: string[] } = {};
    const confidence: { [key: string]: number } = {};
    
    // Analyze each header
    for (const header of headers) {
      const classification = this.classifyHeader(header);
      
      if (classification.confidence > 0.5) {
        mapping[`${classification.type}Column`] = header;
        confidence[classification.type] = classification.confidence;
        suggestions[classification.type] = classification.alternatives;
      }
    }
    
    return { ...mapping, suggestions, confidence };
  }

  /**
   * Detect bank format from headers with enhanced flexibility
   */
  detectBankFormat(headers: string[]): BankFormat | 'Unknown' {
    if (!headers || headers.length === 0) {
      return 'Unknown';
    }

    const normalizedHeaders = headers.map(h => this.normalizeHeader(h));
    console.log('🔍 Analyzing headers:', normalizedHeaders);
    
    // Enhanced header mapping
    const headerMapping = this.mapHeadersToColumns(headers);
    console.log('📋 Header mapping:', headerMapping);

    // Enhanced format detection with multiple fallback strategies
    for (const [bankName, format] of Object.entries(BANK_FORMATS)) {
      const formatIdentifiers = format.identifier.map(id => this.normalizeHeader(id));
      
      // Check if all required columns are present
      const hasAllRequiredColumns = formatIdentifiers.every(id => 
        normalizedHeaders.some(header => header.includes(id) || id.includes(header))
      );
      
      if (hasAllRequiredColumns) {
        console.log(`✅ Detected ${bankName} format`);
        return bankName as BankFormat;
      }
    }

    // Enhanced generic format detection with flexible column matching
    const hasDate = normalizedHeaders.some(h => 
      HEADER_PATTERNS.date.some(pattern => h.includes(pattern) || pattern.includes(h))
    );
    const hasDescription = normalizedHeaders.some(h => 
      HEADER_PATTERNS.description.some(pattern => h.includes(pattern) || pattern.includes(h))
    );
    const hasAmount = normalizedHeaders.some(h => 
      HEADER_PATTERNS.amount.some(pattern => h.includes(pattern) || pattern.includes(h))
    );

    if (hasDate && hasDescription && hasAmount) {
      console.log('✅ Detected Generic CSV format with flexible matching');
      return 'Generic';
    }

    // Additional fallback: try to find any columns that could work
    const potentialDateColumns = normalizedHeaders.filter(h => 
      HEADER_PATTERNS.date.some(pattern => h.includes(pattern) || pattern.includes(h))
    );
    const potentialDescColumns = normalizedHeaders.filter(h => 
      HEADER_PATTERNS.description.some(pattern => h.includes(pattern) || pattern.includes(h))
    );
    const potentialAmountColumns = normalizedHeaders.filter(h => 
      HEADER_PATTERNS.amount.some(pattern => h.includes(pattern) || pattern.includes(h))
    );

    if (potentialDateColumns.length > 0 && potentialDescColumns.length > 0 && potentialAmountColumns.length > 0) {
      console.log('✅ Detected potential CSV format with available columns');
      console.log('📋 Available columns:', {
        date: potentialDateColumns,
        description: potentialDescColumns,
        amount: potentialAmountColumns
      });
      return 'Generic';
    }

    console.log('❌ No compatible format detected');
    return 'Unknown';
  }

  /**
   * Detect bank format using headers and sample data with enhanced formatting
   */
  detectBankFormatWithData(headers: string[], sampleData: any[], filename?: string): BankFormat | 'Unknown' {
    const normalizedHeaders = headers.map(h => this.normalizeHeader(h));
    
    // Enhanced header mapping for better analysis
    const headerMapping = this.mapHeadersToColumns(headers);
    console.log('📋 Enhanced header analysis:', headerMapping);
    
    // Check for BT Records format based on filename first
    if (filename && filename.toLowerCase().includes('bt records')) {
      console.log(`✅ Detected BT Records format from filename: ${filename}`);
      return 'BT_Records';
    }
    
    // Enhanced sample date detection using header mapping
    let sampleDate = null;
    if (sampleData.length > 0) {
      const dateColumn = headerMapping.dateColumn || 'Date';
      sampleDate = sampleData[0][dateColumn] || 
                   sampleData[0]['Date'] || 
                   sampleData[0]['Transaction Date'] || 
                   sampleData[0]['DATE'] || 
                   sampleData[0]['date'];
    }
    console.log(`📅 Sample date for format detection: "${sampleDate}"`);
    
    // Check for most specific formats first - prioritize exact matches
    const formatPriority = ['Generic', 'Generic_DADB', 'RBC', 'Scotia', 'Scotia_DayToDay', 'BMO', 'TD', 'BT_Records'];
    
    for (const bank of formatPriority) {
      const format = BANK_FORMATS[bank as BankFormat];
      if (!format) continue;
      
      // Enhanced header matching with normalized headers
      const formatIdentifiers = format.identifier.map(id => this.normalizeHeader(id));
      
      // Check for exact header matches first
      const exactMatches = formatIdentifiers.filter(col => 
        normalizedHeaders.includes(col)
      );
      
      // If we have exact matches for all required columns, use this format
      if (exactMatches.length === formatIdentifiers.length) {
        console.log(`✅ Detected bank format: ${bank} (exact match)`);
        return bank as BankFormat;
      }
      
      // Enhanced partial matching with pattern-based approach
      const hasAllColumns = formatIdentifiers.every(col => 
        normalizedHeaders.some(header => {
          // Direct match
          if (header === col) return true;
          
          // Pattern-based matching
          const colType = this.classifyHeader(col).type;
          const headerType = this.classifyHeader(header).type;
          
          return colType === headerType && this.calculateSimilarity(header, col) > 0.7;
        })
      );
      
      if (!hasAllColumns) continue;
      
      // If headers match, test date format compatibility
      if (sampleDate) {
        // Try multiple date formats for Generic format to be more flexible
        if (bank === 'Generic') {
          const dateFormats = ['YYYY-MM-DD', 'DD-MM-YYYY', 'MM/DD/YYYY', 'DD/MM/YYYY'];
          let dateFormatFound = false;
          
          for (const dateFormat of dateFormats) {
            const testDate = this.parseDateFlexible(sampleDate);
            if (testDate) {
              console.log(`✅ Detected bank format: ${bank} with date format ${dateFormat}`);
              // Update the format's date format for this detection
              (format as any).dateFormat = dateFormat;
              dateFormatFound = true;
              break;
            }
          }
          
          if (dateFormatFound) {
            return bank as BankFormat;
          }
        } else {
          const testDate = this.parseDateFlexible(sampleDate);
          if (testDate) {
            console.log(`✅ Detected bank format: ${bank} (date format validated)`);
            return bank as BankFormat;
          } else {
            console.log(`❌ ${bank} format rejected: date "${sampleDate}" doesn't match format "${format.dateFormat}"`);
          }
        }
      } else {
        // No sample date, fall back to header-only detection
        console.log(`✅ Detected bank format: ${bank} (header-only match)`);
        return bank as BankFormat;
      }
    }
    
    // Enhanced fallback: try to create a custom format based on detected columns
    if (headerMapping.dateColumn && headerMapping.descriptionColumn && headerMapping.amountColumn) {
      console.log('✅ Creating custom format based on detected columns');
      console.log('📋 Detected columns:', {
        date: headerMapping.dateColumn,
        description: headerMapping.descriptionColumn,
        amount: headerMapping.amountColumn,
        balance: headerMapping.balanceColumn,
        reference: headerMapping.referenceColumn
      });
      return 'Generic';
    }
    
    console.warn('❌ Unknown bank format detected');
    console.log('Available headers:', normalizedHeaders);
    console.log('Header mapping:', headerMapping);
    console.log('Sample date:', sampleDate);
    return 'Unknown';
  }

  /**
   * Parse CSV file and return normalized transactions
   */
  async parseCSV(file: File): Promise<{
    transactions: Transaction[];
    validation: ValidationResult;
    bankFormat: BankFormat | 'Unknown';
  }> {
    return new Promise((resolve, reject) => {
      console.log(`📄 Processing CSV file: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);
      
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false, // Keep as strings for custom parsing
        encoding: 'UTF-8',
        complete: (results) => {
          try {
            console.log(`📊 Raw CSV data: ${results.data.length} rows`);
            
            // Validate headers first
            const headers = results.meta.fields || [];
            const headerValidation = this.validateHeaders(headers);
            
            if (!headerValidation.isValid) {
              throw new Error(`Invalid CSV format: ${headerValidation.errors.join(', ')}`);
            }

            // Detect bank format with data sample
            const bankFormat = this.detectBankFormatWithData(headers, results.data, file.name);
            if (bankFormat === 'Unknown') {
              throw new Error(
                `Unsupported bank format. Expected headers like: Date, Description, Amount. ` +
                `Found: ${headers.join(', ')}`
              );
            }
            
            // Process transactions
            const transactions = this.processTransactions(results.data, bankFormat);
            
            // Validate final data
            const validation = this.validateTransactions(transactions);
            
            console.log(`✅ Processed ${transactions.length} transactions`);
            console.log(`📈 Validation: ${validation.errors.length} errors, ${validation.warnings.length} warnings`);
            
            resolve({ transactions, validation, bankFormat });
            
          } catch (error) {
            console.error('❌ CSV Processing Error:', error);
            reject(error);
          }
        },
        error: (error) => {
          console.error('❌ Papa Parse Error:', error);
          reject(new Error(`CSV parsing failed: ${error.message}`));
        }
      });
    });
  }

  /**
   * Parse CSV and auto-categorize transactions
   */
  async parseAndCategorizeCSV(file: File): Promise<{
    transactions: Transaction[];
    validation: ValidationResult;
    bankFormat: BankFormat | 'Unknown';
    duplicateResult?: DuplicateDetectionResult;
    stats: {
      total: number;
      categorized: number;
      highConfidence: number;
      needsReview: number;
    };
  }> {
    // First parse the CSV
    const { transactions, validation, bankFormat } = await this.parseCSV(file);
    
    if (transactions.length === 0) {
      return {
        transactions,
        validation,
        bankFormat,
        duplicateResult: { duplicateGroups: [], cleanTransactions: [], duplicateCount: 0 },
        stats: { total: 0, categorized: 0, highConfidence: 0, needsReview: 0 }
      };
    }

    // Check for duplicates before categorization
    console.log(`🔍 Checking for duplicates in ${transactions.length} transactions...`);
    const duplicateResult = detectDuplicates(transactions);
    
    if (duplicateResult.duplicateCount > 0) {
      console.log(`⚠️ Found ${duplicateResult.duplicateCount} duplicate transactions in ${duplicateResult.duplicateGroups.length} groups`);
    } else {
      console.log(`✅ No duplicates detected`);
    }

    console.log(`🤖 Starting AI categorization for ${transactions.length} transactions...`);
    
    // Initialize AI engine and ensure chart of accounts is loaded
    await this.aiEngine.initialize();
    
    // Categorize with AI and ensure account codes are set
    const categorizedTransactions = await this.aiEngine.categorizeBatch(transactions);
    
    // Double-check that account codes are properly assigned
    const finalTransactions = categorizedTransactions.map(transaction => {
      if (transaction.category && !transaction.accountCode) {
        // If category exists but no account code, try to get it again
        const result = this.aiEngine.categorizeTransaction(transaction);
        return {
          ...transaction,
          accountCode: result.accountCode
        };
      }
      return transaction;
    });
    
    // Calculate stats
    const categorizationStats = this.calculateCategorizationStats(finalTransactions);
    console.log("✅ AI Categorization Complete:", categorizationStats);
    console.log(`📊 Account codes assigned: ${finalTransactions.filter((t)=>t.accountCode).length}/${finalTransactions.length}`);
    
    return {
      transactions: finalTransactions,
      validation,
      bankFormat,
      duplicateResult,
      stats: categorizationStats
    };
  }

  /**
   * Process raw CSV data into normalized transactions
   */
  private processTransactions(rawData: any[], bankFormat: BankFormat): Transaction[] {
    const format = BANK_FORMATS[bankFormat];
    const transactions: Transaction[] = [];
    
    console.log(`🔄 Processing ${rawData.length} rows with ${bankFormat} format...`);
    
    rawData.forEach((row, index) => {
      try {
        const transaction = this.normalizeTransaction(row, format, index);
        if (transaction) {
          transactions.push(transaction);
        }
      } catch (error) {
        console.warn(`⚠️ Skipping row ${index + 1}:`, error);
      }
    });
    
    return transactions;
  }

  /**
   * Normalize a single transaction row with enhanced flexibility
   */
  private normalizeTransaction(
    row: any, 
    format: typeof BANK_FORMATS[BankFormat], 
    index: number
  ): Transaction | null {
    try {
      // Enhanced field extraction with fallback strategies
      let dateString = row[format.dateColumn]?.toString().trim();
      let description = row[format.descriptionColumn]?.toString().trim();
      let amountString = row[format.amountColumn]?.toString().trim();
      
      // Fallback: try alternative column names if primary columns are empty
      if (!dateString) {
        const dateAlternatives = ['Transaction Date', 'Date', 'Txn Date', 'Posting Date'];
        for (const alt of dateAlternatives) {
          if (row[alt]) {
            dateString = row[alt].toString().trim();
            break;
          }
        }
      }
      
      if (!description) {
        const descAlternatives = ['Transaction Details', 'Memo', 'Note', 'Narration', 'Details'];
        for (const alt of descAlternatives) {
          if (row[alt]) {
            description = row[alt].toString().trim();
            break;
          }
        }
      }
      
      if (!amountString) {
        const amountAlternatives = ['Debit', 'Credit', 'Value', 'Balance'];
        for (const alt of amountAlternatives) {
          if (row[alt]) {
            amountString = row[alt].toString().trim();
            break;
          }
        }
      }
      
      // Validate required fields
      if (!dateString || !description || !amountString) {
        throw new Error(`Missing required fields: date=${!!dateString}, desc=${!!description}, amount=${!!amountString}`);
      }
      
      // Parse and validate date
      const date = this.parseDateFlexible(dateString);
      if (!date) {
        throw new Error(`Invalid date format: ${dateString}`);
      }
      
      // Parse and validate amount
      const amount = this.parseAmountFlexible(amountString);
      if (amount === null) {
        throw new Error(`Invalid amount format: ${amountString}`);
      }
      
      // Create normalized transaction
      const transaction: Transaction = {
        id: `txn_${Date.now()}_${index}`,
        date: date.toISOString().split('T')[0], // YYYY-MM-DD format
        description: this.sanitizeText(description),
        originalDescription: description,
        amount,
        confidence: 0, // Will be set by AI engine
        isApproved: false,
        isManuallyEdited: false
      };
      
      return transaction;
      
    } catch (error) {
      console.warn(`Row ${index + 1} normalization failed:`, error);
      return null;
    }
  }

  /**
   * Enhanced date parsing with multiple format support
   */
  private parseDateFlexible(dateString: string): Date | null {
    if (!dateString) return null;
    
    const cleanDate = dateString.trim();
    let date: Date;
    
    try {
      // Try multiple date formats
      const formats = [
        'MM/DD/YYYY',
        'YYYY-MM-DD', 
        'DD/MM/YYYY',
        'DD-MM-YYYY',
        'MM-DD-YYYY',
        'YYYY/MM/DD',
        'DD.MM.YYYY',
        'MM.DD.YYYY'
      ];
      
      for (const format of formats) {
        try {
          switch (format) {
            case 'MM/DD/YYYY': {
              const [month, day, year] = cleanDate.split('/');
              if (month && day && year) {
                date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                if (!isNaN(date.getTime())) return date;
              }
              break;
            }
            case 'YYYY-MM-DD': {
              date = new Date(cleanDate);
              if (!isNaN(date.getTime())) return date;
              break;
            }
            case 'DD/MM/YYYY': {
              const [day, month, year] = cleanDate.split('/');
              if (day && month && year) {
                date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                if (!isNaN(date.getTime())) return date;
              }
              break;
            }
            case 'DD-MM-YYYY': {
              const [day, month, year] = cleanDate.split('-');
              if (day && month && year) {
                date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                if (!isNaN(date.getTime())) return date;
              }
              break;
            }
            case 'MM-DD-YYYY': {
              const [month, day, year] = cleanDate.split('-');
              if (month && day && year) {
                date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                if (!isNaN(date.getTime())) return date;
              }
              break;
            }
            case 'YYYY/MM/DD': {
              const [year, month, day] = cleanDate.split('/');
              if (year && month && day) {
                date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                if (!isNaN(date.getTime())) return date;
              }
              break;
            }
            case 'DD.MM.YYYY': {
              const [day, month, year] = cleanDate.split('.');
              if (day && month && year) {
                date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                if (!isNaN(date.getTime())) return date;
              }
              break;
            }
            case 'MM.DD.YYYY': {
              const [month, day, year] = cleanDate.split('.');
              if (month && day && year) {
                date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                if (!isNaN(date.getTime())) return date;
              }
              break;
            }
          }
        } catch (e) {
          continue; // Try next format
        }
      }
      
      // Final fallback: try native Date parsing
      date = new Date(cleanDate);
      if (!isNaN(date.getTime())) {
        return date;
      }
      
      return null;
      
    } catch (error) {
      return null;
    }
  }

  /**
   * Enhanced amount parsing with better format support
   */
  private parseAmountFlexible(amountString: string): number | null {
    if (!amountString) return null;
    
    try {
      // Handle various formats: $123.45, 123.45, (123.45), -123.45, $1,234.56, "3,276.00"
      let cleanAmount = amountString
        .replace(/["']/g, '') // Remove quotes
        .replace(/[$,\s]/g, '') // Remove $, commas, spaces
        .replace(/[()]/g, match => match === '(' ? '-' : ''); // Convert (123.45) to -123.45
      
      // Handle special cases like "DR" (debit) and "CR" (credit)
      if (cleanAmount.toUpperCase().includes('DR')) {
        cleanAmount = cleanAmount.replace(/DR/i, '').trim();
      } else if (cleanAmount.toUpperCase().includes('CR')) {
        cleanAmount = '-' + cleanAmount.replace(/CR/i, '').trim();
      }
      
      const amount = parseFloat(cleanAmount);
      
      // Validate reasonable amount range (increased limit for business accounts)
      if (isNaN(amount) || Math.abs(amount) > 10000000) {
        return null;
      }
      
      return amount;
      
    } catch (error) {
      return null;
    }
  }

  /**
   * Sanitize text fields
   */
  private sanitizeText(text: string): string {
    if (!text) return '';
    
    return text
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s\-&'.,#]/g, '') // Remove special chars except common ones
      .substring(0, 200); // Limit length
  }

  /**
   * Validate CSV headers with enhanced formatting support
   */
  private validateHeaders(headers: string[]): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [] };
    
    if (!headers || headers.length === 0) {
      result.isValid = false;
      result.errors.push('No headers found in CSV file');
      return result;
    }
    
    // Enhanced header analysis
    const headerMapping = this.mapHeadersToColumns(headers);
    const normalizedHeaders = headers.map(h => this.normalizeHeader(h));
    
    console.log('🔍 Enhanced header validation:', {
      original: headers,
      normalized: normalizedHeaders,
      mapping: headerMapping
    });
    
    let formatFound = false;
    
    // Check against all known bank formats with enhanced matching
    for (const [bankName, format] of Object.entries(BANK_FORMATS)) {
      const formatIdentifiers = format.identifier.map(id => this.normalizeHeader(id));
      const hasAllRequiredColumns = formatIdentifiers.every(id => 
        normalizedHeaders.some(header => {
          // Exact match
          if (header === id) return true;
          
          // Pattern-based matching
          const idType = this.classifyHeader(id).type;
          const headerType = this.classifyHeader(header).type;
          
          return idType === headerType && this.calculateSimilarity(header, id) > 0.7;
        })
      );
      
      if (hasAllRequiredColumns) {
        formatFound = true;
        console.log(`✅ Headers match ${bankName} format`);
        break;
      }
    }
    
    // Enhanced generic format detection with pattern matching
    if (!formatFound) {
      const hasDate = normalizedHeaders.some(h => 
        HEADER_PATTERNS.date.some(pattern => h.includes(pattern) || pattern.includes(h))
      );
      const hasDescription = normalizedHeaders.some(h => 
        HEADER_PATTERNS.description.some(pattern => h.includes(pattern) || pattern.includes(h))
      );
      const hasAmount = normalizedHeaders.some(h => 
        HEADER_PATTERNS.amount.some(pattern => h.includes(pattern) || pattern.includes(h))
      );
      
      if (hasDate && hasDescription && hasAmount) {
        formatFound = true;
        console.log(`✅ Headers match generic CSV format with pattern matching`);
        
        // Add helpful suggestions for better formatting
        if (headerMapping.suggestions.date?.length > 0) {
          result.warnings.push(`Consider using standard header 'Date' instead of '${headerMapping.dateColumn}'`);
        }
        if (headerMapping.suggestions.description?.length > 0) {
          result.warnings.push(`Consider using standard header 'Description' instead of '${headerMapping.descriptionColumn}'`);
        }
        if (headerMapping.suggestions.amount?.length > 0) {
          result.warnings.push(`Consider using standard header 'Amount' instead of '${headerMapping.amountColumn}'`);
        }
      } else {
        // Enhanced error messages with suggestions
        if (!hasDate) {
          const potentialDateHeaders = headers.filter(h => 
            HEADER_PATTERNS.date.some(pattern => 
              this.normalizeHeader(h).includes(pattern) || pattern.includes(this.normalizeHeader(h))
            )
          );
          if (potentialDateHeaders.length > 0) {
            result.errors.push(`No clear date column found. Potential matches: ${potentialDateHeaders.join(', ')}`);
          } else {
            result.errors.push('No date column found. Expected headers like: Date, Transaction Date, Posting Date');
          }
        }
        if (!hasDescription) {
          const potentialDescHeaders = headers.filter(h => 
            HEADER_PATTERNS.description.some(pattern => 
              this.normalizeHeader(h).includes(pattern) || pattern.includes(this.normalizeHeader(h))
            )
          );
          if (potentialDescHeaders.length > 0) {
            result.errors.push(`No clear description column found. Potential matches: ${potentialDescHeaders.join(', ')}`);
          } else {
            result.errors.push('No description column found. Expected headers like: Description, Transaction Details, Memo');
          }
        }
        if (!hasAmount) {
          const potentialAmountHeaders = headers.filter(h => 
            HEADER_PATTERNS.amount.some(pattern => 
              this.normalizeHeader(h).includes(pattern) || pattern.includes(this.normalizeHeader(h))
            )
          );
          if (potentialAmountHeaders.length > 0) {
            result.errors.push(`No clear amount column found. Potential matches: ${potentialAmountHeaders.join(', ')}`);
          } else {
            result.errors.push('No amount column found. Expected headers like: Amount, Transaction Amount, Value');
          }
        }
      }
    }
    
    // Enhanced warnings for non-standard headers
    if (formatFound) {
      const nonStandardHeaders = headers.filter(h => {
        const normalized = this.normalizeHeader(h);
        return !HEADER_PATTERNS.date.some(p => normalized.includes(p)) &&
               !HEADER_PATTERNS.description.some(p => normalized.includes(p)) &&
               !HEADER_PATTERNS.amount.some(p => normalized.includes(p)) &&
               !HEADER_PATTERNS.balance.some(p => normalized.includes(p)) &&
               !HEADER_PATTERNS.reference.some(p => normalized.includes(p)) &&
               !HEADER_PATTERNS.category.some(p => normalized.includes(p));
      });
      
      if (nonStandardHeaders.length > 0) {
        result.warnings.push(`Non-standard headers detected: ${nonStandardHeaders.join(', ')}. These will be ignored.`);
      }
    }
    
    if (!formatFound) {
      result.isValid = false;
      console.log(`❌ Headers don't match any known format:`, headers);
      console.log(`Available formats:`, Object.keys(BANK_FORMATS));
      
      // Provide helpful suggestions
      result.errors.push('CSV format not recognized. Please ensure your file has columns for Date, Description, and Amount.');
      result.errors.push('Common header variations are supported (e.g., "Transaction Date", "Transaction Details", "Transaction Amount").');
    }
    
    return result;
  }

  /**
   * Validate processed transactions
   */
  private validateTransactions(transactions: Transaction[]): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [] };
    
    if (transactions.length === 0) {
      result.isValid = false;
      result.errors.push('No valid transactions found in CSV');
      return result;
    }
    
    // Check for common issues
    const invalidDates = transactions.filter(t => !t.date || t.date === 'Invalid Date');
    const missingDescriptions = transactions.filter(t => !t.description || t.description.trim() === '');
    const zeroAmounts = transactions.filter(t => t.amount === 0);
    const duplicates = this.findDuplicateTransactions(transactions);
    
    if (invalidDates.length > 0) {
      result.warnings.push(`${invalidDates.length} transactions have invalid dates`);
    }
    
    if (missingDescriptions.length > 0) {
      result.warnings.push(`${missingDescriptions.length} transactions have missing descriptions`);
    }
    
    if (zeroAmounts.length > 0) {
      result.warnings.push(`${zeroAmounts.length} transactions have zero amounts`);
    }
    
    if (duplicates.length > 0) {
      result.warnings.push(`${duplicates.length} potential duplicate transactions found`);
    }
    
    // Performance warning for large datasets
    if (transactions.length > 1000) {
      result.warnings.push(`Large dataset (${transactions.length} transactions) may impact performance`);
    }
    
    return result;
  }

  /**
   * Find potential duplicate transactions
   */
  private findDuplicateTransactions(transactions: Transaction[]): Transaction[] {
    const seen = new Map<string, Transaction>();
    const duplicates: Transaction[] = [];
    
    for (const transaction of transactions) {
      // Create a key that identifies potential duplicates
      const key = `${transaction.date}_${transaction.amount}_${transaction.description.substring(0, 20)}`;
      
      if (seen.has(key)) {
        duplicates.push(transaction);
      } else {
        seen.set(key, transaction);
      }
    }
    
    return duplicates;
  }

  /**
   * Calculate categorization statistics
   */
  private calculateCategorizationStats(transactions: Transaction[]) {
    const total = transactions.length;
    const categorized = transactions.filter(t => t.category).length;
    const highConfidence = transactions.filter(t => (t.confidence || 0) >= 80).length;
    const needsReview = transactions.filter(t => !t.category || (t.confidence || 0) < 70).length;

    return {
      total,
      categorized,
      highConfidence,
      needsReview,
      categorizedPercent: Math.round((categorized / total) * 100),
      highConfidencePercent: Math.round((highConfidence / total) * 100),
      needsReviewPercent: Math.round((needsReview / total) * 100)
    };
  }

  /**
   * Get header formatting suggestions for better CSV compatibility
   */
  getHeaderFormattingSuggestions(headers: string[]): {
    suggestions: string[];
    warnings: string[];
    recommendedHeaders: string[];
  } {
    const suggestions: string[] = [];
    const warnings: string[] = [];
    const recommendedHeaders = ['Date', 'Description', 'Amount'];
    
    const headerMapping = this.mapHeadersToColumns(headers);
    const normalizedHeaders = headers.map(h => this.normalizeHeader(h));
    
    // Check for missing required columns
    if (!headerMapping.dateColumn) {
      suggestions.push('Add a "Date" column for transaction dates');
      warnings.push('Date column is required for proper transaction processing');
    }
    
    if (!headerMapping.descriptionColumn) {
      suggestions.push('Add a "Description" column for transaction details');
      warnings.push('Description column is required for AI categorization');
    }
    
    if (!headerMapping.amountColumn) {
      suggestions.push('Add an "Amount" column for transaction values');
      warnings.push('Amount column is required for financial calculations');
    }
    
    // Suggest standard headers for non-standard ones
    if (headerMapping.dateColumn && headerMapping.dateColumn !== 'Date') {
      suggestions.push(`Consider renaming "${headerMapping.dateColumn}" to "Date" for better compatibility`);
    }
    
    if (headerMapping.descriptionColumn && headerMapping.descriptionColumn !== 'Description') {
      suggestions.push(`Consider renaming "${headerMapping.descriptionColumn}" to "Description" for better compatibility`);
    }
    
    if (headerMapping.amountColumn && headerMapping.amountColumn !== 'Amount') {
      suggestions.push(`Consider renaming "${headerMapping.amountColumn}" to "Amount" for better compatibility`);
    }
    
    // Check for common formatting issues
    headers.forEach(header => {
      const normalized = this.normalizeHeader(header);
      
      // Check for excessive capitalization
      if (header !== header.toLowerCase() && header !== header.toUpperCase() && 
          header !== header.charAt(0).toUpperCase() + header.slice(1).toLowerCase()) {
        suggestions.push(`Consider using proper case for "${header}" (e.g., "Date" instead of "DATE" or "date")`);
      }
      
      // Check for special characters
      if (/[^\w\s]/.test(header)) {
        suggestions.push(`Remove special characters from "${header}" for better compatibility`);
      }
      
      // Check for excessive length
      if (header.length > 30) {
        suggestions.push(`Consider shortening "${header}" (currently ${header.length} characters)`);
      }
    });
    
    // Add optional but recommended columns
    if (!headerMapping.balanceColumn) {
      suggestions.push('Consider adding a "Balance" column for running balance information');
    }
    
    if (!headerMapping.referenceColumn) {
      suggestions.push('Consider adding a "Reference" column for transaction IDs or check numbers');
    }
    
    return { suggestions, warnings, recommendedHeaders };
  }

  /**
   * Generate a CSV template with proper headers
   */
  generateCSVTemplate(): string {
    const headers = ['Date', 'Description', 'Amount', 'Balance', 'Reference'];
    const sampleData = [
      ['2024-01-15', 'Coffee Shop Purchase', '5.50', '1234.56', 'TXN001'],
      ['2024-01-16', 'Gas Station', '45.00', '1189.56', 'TXN002'],
      ['2024-01-17', 'Grocery Store', '125.75', '1063.81', 'TXN003']
    ];
    
    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.join(','))
    ].join('\n');
    
    return csvContent;
  }
} 