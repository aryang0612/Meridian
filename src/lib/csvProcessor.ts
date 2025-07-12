import Papa from 'papaparse';
import { Transaction, ValidationResult } from './types';
import { BANK_FORMATS, BankFormat } from '../data/bankFormats';
import { unifiedCategorizationEngine } from './unifiedCategorizationEngine';
import { parallelProcessor, performanceTracker } from './performanceOptimizer';
// import { detectDuplicates, DuplicateDetectionResult } from './duplicateDetector'; // DISABLED
import { DuplicateDetectionResult } from './duplicateDetector';
import { looksLikeAmount, parseAmountFlexible, normalizeAmount, generateId, calculateStringSimilarity } from './formatUtils';

// Enhanced header formatting patterns
const HEADER_PATTERNS: {
  date: string[];
  description: string[];
  amount: string[];
  balance: string[];
  reference: string[];
  category: string[];
  debit?: string[];
  credit?: string[];
} = {
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

// Add new header patterns for more banks and international formats
const ADDITIONAL_HEADER_PATTERNS = {
  date: [
    'transaction date', 'date of transaction', 'operation date', 'booking date', 'datum', 'fecha', 'data', 'transaktionsdatum', 'valuta', 'trans date', 'fecha de operacion'
  ],
  description: [
    'transaction text', 'concept', 'particulars', 'operation', 'operation details', 'concepto', 'causale', 'bezeichnung', 'omschrijving', 'beskrivelse', 'keterangan', 'detalles', 'particular', 'transaktionsbeschreibung'
  ],
  debit: [
    'debit', 'withdrawal', 'debit amount', 'amount debited', 'debit value', 'debit column', 'debit (out)', 'debit side', 'debitos', 'addebito', 'abbuchung', 'debito', 'debito (uscita)'
  ],
  credit: [
    'credit', 'deposit', 'credit amount', 'amount credited', 'credit value', 'credit column', 'credit (in)', 'credit side', 'creditos', 'accredito', 'gutschrift', 'credito', 'credito (entrata)'
  ]
};

// Merge with existing HEADER_PATTERNS
Object.keys(ADDITIONAL_HEADER_PATTERNS).forEach(type => {
  if ((HEADER_PATTERNS as any)[type]) {
    (HEADER_PATTERNS as any)[type].push(...(ADDITIONAL_HEADER_PATTERNS as any)[type]);
  } else {
    (HEADER_PATTERNS as any)[type] = [...(ADDITIONAL_HEADER_PATTERNS as any)[type]];
  }
});

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
        const similarity = calculateStringSimilarity(normalized, pattern);
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

  // Using centralized similarity calculation from formatUtils

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
    const formatPriority = ['InternetBanking', 'Headerless', 'BT_Records', 'RBC', 'Scotia', 'Scotia_DayToDay', 'BMO', 'TD', 'Generic', 'Generic_DADB'];
    
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
    
    // Special handling for simple 3-column format (Date, Description, Amount)
    if (normalizedHeaders.length === 3 && 
        normalizedHeaders.includes('date') && 
        normalizedHeaders.includes('description') && 
        normalizedHeaders.includes('amount')) {
      console.log(`✅ Detected bank format: ${bank} (simple 3-column match)`);
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
          
          return colType === headerType && calculateStringSimilarity(header, col) > 0.7;
        })
      );
      
      // Check for pattern-based format detection (for formats with patterns)
      if ('patterns' in format && format.patterns && format.patterns.length > 0) {
        const sampleText = sampleData.slice(0, 3).map(row => 
          Object.values(row).join(' ').toLowerCase()
        ).join(' ');
        
        const hasPatternMatch = format.patterns.some((pattern: RegExp) => pattern.test(sampleText));
        if (hasPatternMatch) {
          console.log(`✅ Detected bank format: ${bank} (pattern match)`);
          return bank as BankFormat;
        }
      }
      
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
            
            // Check if we have headers or if this is a headerless CSV
            const headers = results.meta.fields || [];
            console.log(`📋 Detected headers:`, headers);
            
            // If no headers or headers look like data, try to infer format
            if (headers.length === 0 || this.looksLikeDataRow(headers)) {
              console.log(`⚠️ No proper headers detected, attempting to infer format from data...`);
              const inferredFormat = this.inferFormatFromData(results.data, file.name);
              if (inferredFormat) {
                // Re-parse with inferred headers
                this.parseWithInferredHeaders(file, inferredFormat, resolve, reject);
                return;
              }
            }
            
            // Validate headers first
            const headerValidation = this.validateHeaders(headers);
            
            if (!headerValidation.isValid) {
              console.log(`⚠️ Header validation failed, attempting format inference...`);
              const inferredFormat = this.inferFormatFromData(results.data, file.name);
              if (inferredFormat) {
                // Re-parse with inferred headers
                this.parseWithInferredHeaders(file, inferredFormat, resolve, reject);
                return;
              }
              throw new Error(`Invalid CSV format: ${headerValidation.errors.join(', ')}`);
            }

            // Detect bank format with data sample
            const bankFormat = this.detectBankFormatWithData(headers, results.data, file.name);
            if (bankFormat === 'Unknown') {
              console.log(`⚠️ Bank format detection failed, attempting format inference...`);
              const inferredFormat = this.inferFormatFromData(results.data, file.name);
              if (inferredFormat) {
                // Re-parse with inferred headers
                this.parseWithInferredHeaders(file, inferredFormat, resolve, reject);
                return;
              }
              // Try to proceed with Generic format as fallback
              console.log(`⚠️ No specific format detected, trying Generic format...`);
              const genericFormat = this.tryGenericFormat(headers, results.data);
              if (genericFormat) {
                console.log(`✅ Using Generic format with columns:`, genericFormat);
                const transactions = this.processTransactions(results.data, 'Generic');
                const validation = this.validateTransactions(transactions);
                resolve({ transactions, validation, bankFormat: 'Generic' });
                return;
              }
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
   * Check if a row looks like data instead of headers
   */
  private looksLikeDataRow(row: string[]): boolean {
    if (row.length < 3) return false;
    
    // Check if first column looks like a date
    const firstCol = row[0]?.toString().trim();
    if (!firstCol) return false;
    
    // Common date patterns
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY or DD/MM/YYYY
      /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY or DD-MM-YYYY
      /^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/, // DD MMM YYYY
    ];
    
    return datePatterns.some(pattern => pattern.test(firstCol));
  }

  /**
   * Infer format from data when headers are missing or invalid
   */
  private inferFormatFromData(data: any[], filename?: string): { headers: string[]; format: BankFormat } | null {
    if (data.length === 0) return null;
    
    const firstRow = data[0];
    const keys = Object.keys(firstRow);
    
    console.log(`🔍 Inferring format from data with ${keys.length} columns:`, keys);
    
    // Try to identify columns based on content
    const dateCol = this.findDateColumn(firstRow, keys);
    const descCol = this.findDescriptionColumn(firstRow, keys);
    const amountCol = this.findAmountColumn(firstRow, keys);
    
    if (dateCol && descCol && amountCol) {
      const inferredHeaders = [dateCol, descCol, amountCol];
      console.log(`✅ Inferred headers:`, inferredHeaders);
      
      // Determine format based on filename or content patterns
      let format: BankFormat = 'Generic';
      
      // Check content for internet banking patterns
      const sampleText = data.slice(0, 3).map(row => 
        Object.values(row).join(' ').toLowerCase()
      ).join(' ');
      
      if (sampleText.includes('internet banking') || 
          sampleText.includes('internet transfer') || 
          sampleText.includes('e-transfer') ||
          sampleText.includes('electronic transfer')) {
        format = 'InternetBanking';
        console.log(`✅ Detected Internet Banking format from content`);
      } else if (filename) {
        const lowerFilename = filename.toLowerCase();
        if (lowerFilename.includes('rbc') || lowerFilename.includes('royal bank')) format = 'RBC';
        else if (lowerFilename.includes('td') || lowerFilename.includes('toronto dominion')) format = 'TD';
        else if (lowerFilename.includes('scotia') || lowerFilename.includes('scotiabank')) format = 'Scotia';
        else if (lowerFilename.includes('bmo') || lowerFilename.includes('bank of montreal')) format = 'BMO';
        else if (lowerFilename.includes('cibc')) format = 'CIBC';
        else if (lowerFilename.includes('bt') || lowerFilename.includes('records')) format = 'BT_Records';
      }
      
      return { headers: inferredHeaders, format };
    }
    
    return null;
  }

  /**
   * Find date column in a row
   */
  private findDateColumn(row: any, keys: string[]): string | null {
    for (const key of keys) {
      const value = row[key]?.toString().trim();
      if (!value) continue;
      
      // Check if value looks like a date
      const datePatterns = [
        /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
        /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY or DD/MM/YYYY
        /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY or DD-MM-YYYY
        /^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/, // DD MMM YYYY
      ];
      
      if (datePatterns.some(pattern => pattern.test(value))) {
        return key;
      }
    }
    return null;
  }

  /**
   * Find description column in a row
   */
  private findDescriptionColumn(row: any, keys: string[]): string | null {
    for (const key of keys) {
      const value = row[key]?.toString().trim();
      if (!value) continue;
      
      // Skip if it looks like a date or amount
      if (this.looksLikeDate(value) || this.looksLikeAmount(value)) continue;
      
      // If it's a longer text string, it's likely the description
      if (value.length > 10) {
        return key;
      }
    }
    
    // If no long text found, look for any non-date, non-amount column
    for (const key of keys) {
      const value = row[key]?.toString().trim();
      if (!value) continue;
      
      if (!this.looksLikeDate(value) && !this.looksLikeAmount(value)) {
        return key;
      }
    }
    
    return null;
  }

  /**
   * Find amount column in a row
   */
  private findAmountColumn(row: any, keys: string[]): string | null {
    for (const key of keys) {
      const value = row[key]?.toString().trim();
      if (!value) continue;
      
      if (this.looksLikeAmount(value)) {
        return key;
      }
    }
    return null;
  }

  /**
   * Check if a value looks like a date
   */
  private looksLikeDate(value: string): boolean {
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY or DD/MM/YYYY
      /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY or DD-MM-YYYY
      /^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/, // DD MMM YYYY
    ];
    
    return datePatterns.some(pattern => pattern.test(value));
  }

  /**
   * Check if a value looks like an amount - now using centralized utility
   */
  private looksLikeAmount(value: string): boolean {
    return looksLikeAmount(value);
  }

  /**
   * Detect columns for Generic format
   */
  private detectGenericColumns(availableColumns: string[], sampleRow: any): {
    dateColumn?: string;
    descriptionColumn?: string;
    amountColumn?: string;
  } {
    let dateColumn: string | undefined;
    let descriptionColumn: string | undefined;
    let amountColumn: string | undefined;
    
    // Try to detect date column
    for (const col of availableColumns) {
      const lowerCol = col.toLowerCase();
      const sampleValue = sampleRow[col]?.toString().trim();
      
      if (lowerCol.includes('date') || lowerCol.includes('time')) {
        dateColumn = col;
        break;
      } else if (sampleValue && this.looksLikeDate(sampleValue)) {
        dateColumn = col;
        break;
      }
    }
    
    // Try to detect amount column
    for (const col of availableColumns) {
      const lowerCol = col.toLowerCase();
      const sampleValue = sampleRow[col]?.toString().trim();
      
      if (lowerCol.includes('amount') || lowerCol.includes('value') || lowerCol.includes('balance')) {
        amountColumn = col;
        break;
      } else if (sampleValue && this.looksLikeAmount(sampleValue)) {
        amountColumn = col;
        break;
      }
    }
    
    // Try to detect description column
    for (const col of availableColumns) {
      const lowerCol = col.toLowerCase();
      
      if (lowerCol.includes('description') || lowerCol.includes('detail') || lowerCol.includes('memo') || lowerCol.includes('narration')) {
        descriptionColumn = col;
        break;
      }
    }
    
    // If no description column found, use first column that's not date or amount
    if (!descriptionColumn) {
      for (const col of availableColumns) {
        if (col !== dateColumn && col !== amountColumn) {
          descriptionColumn = col;
          break;
        }
      }
    }
    
    return { dateColumn, descriptionColumn, amountColumn };
  }

  /**
   * Try to use Generic format as fallback
   */
  private tryGenericFormat(headers: string[], sampleData: any[]): boolean {
    console.log(`🔍 Trying Generic format with headers:`, headers);
    
    // Check if we have at least 3 columns
    if (headers.length < 3) {
      console.log(`❌ Not enough columns for Generic format: ${headers.length}`);
      return false;
    }
    
    // Check if we have some data
    if (!sampleData || sampleData.length === 0) {
      console.log(`❌ No sample data available for Generic format`);
      return false;
    }
    
    // Try to identify potential date, description, and amount columns
    let hasDate = false;
    let hasDescription = false;
    let hasAmount = false;
    
    for (const header of headers) {
      const lowerHeader = header.toLowerCase();
      if (lowerHeader.includes('date') || lowerHeader.includes('time')) {
        hasDate = true;
      } else if (lowerHeader.includes('description') || lowerHeader.includes('detail') || lowerHeader.includes('memo')) {
        hasDescription = true;
      } else if (lowerHeader.includes('amount') || lowerHeader.includes('value') || lowerHeader.includes('balance')) {
        hasAmount = true;
      }
    }
    
    console.log(`📋 Generic format check:`, { hasDate, hasDescription, hasAmount });
    
    // If we have at least one of each type, try to use Generic format
    if (hasDate && hasDescription && hasAmount) {
      console.log(`✅ Generic format looks viable`);
      return true;
    }
    
    // Even if we don't have perfect matches, try anyway if we have 3+ columns
    if (headers.length >= 3) {
      console.log(`⚠️ Generic format fallback - will try with available columns`);
      return true;
    }
    
    return false;
  }

  /**
   * Parse CSV with inferred headers
   */
  private parseWithInferredHeaders(
    file: File, 
    inferredFormat: { headers: string[]; format: BankFormat },
    resolve: (value: any) => void,
    reject: (error: any) => void
  ) {
    Papa.parse(file, {
      header: false, // Don't use first row as headers
      skipEmptyLines: true,
      dynamicTyping: false,
      encoding: 'UTF-8',
      complete: (results) => {
        try {
          console.log(`📊 Re-parsing with inferred headers: ${inferredFormat.headers.join(', ')}`);
          
          // Transform data to use inferred headers
          const transformedData = results.data.map((row: unknown, index: number) => {
            const rowArray = row as any[];
            const obj: any = {};
            inferredFormat.headers.forEach((header, i) => {
              obj[header] = rowArray[i] || '';
            });
            return obj;
          });
          
          // Process transactions
          const transactions = this.processTransactions(transformedData, inferredFormat.format);
          
          // Validate final data
          const validation = this.validateTransactions(transactions);
          
          console.log(`✅ Processed ${transactions.length} transactions with inferred format`);
          console.log(`📈 Validation: ${validation.errors.length} errors, ${validation.warnings.length} warnings`);
          
          resolve({ transactions, validation, bankFormat: inferredFormat.format });
          
        } catch (error) {
          console.error('❌ Inferred format processing error:', error);
          reject(error);
        }
      },
      error: (error) => {
        console.error('❌ Papa Parse Error (inferred):', error);
        reject(new Error(`CSV parsing failed: ${error.message}`));
      }
    });
  }

  /**
   * Parse CSV and auto-categorize transactions
   */
  async parseAndCategorizeCSV(
    file: File, 
    onProgress?: (progress: number) => void,
    aiModeEnabled: boolean = false
  ): Promise<{
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
    console.log(`🚀 Starting CSV categorization for file: ${file.name}`);
    
    // Phase 1: CSV parsing (0-50%)
    onProgress?.(5);
    const { transactions, validation, bankFormat } = await this.parseCSV(file);
    console.log(`📊 CSV parsing complete: ${transactions.length} transactions, format: ${bankFormat}`);
    onProgress?.(40);
    
    if (transactions.length === 0) {
      onProgress?.(100);
      return {
        transactions,
        validation,
        bankFormat,
        duplicateResult: { duplicateGroups: [], cleanTransactions: [], duplicateCount: 0 },
        stats: { total: 0, categorized: 0, highConfidence: 0, needsReview: 0 }
      };
    }
    
    // DISABLED - Check for duplicates before categorization (user requested duplicate warning removal)
    // const duplicateResult = detectDuplicates(transactions);
    const duplicateResult = { duplicateGroups: [], cleanTransactions: transactions, duplicateCount: 0 };
    onProgress?.(45);
    
    // Initialize unified categorization engine with user context
    console.log(`🔧 Initializing unified categorization engine...`);
    try {
      // Get current user for user-specific keyword loading
      const { getCurrentUser } = await import('./supabase');
      const currentUser = await getCurrentUser();
      const userId = currentUser?.id;
      
      if (userId) {
        console.log(`🔑 Found user ID during CSV upload: ${userId} - will load saved keywords`);
      } else {
        console.log('⚠️ No user ID found during CSV upload - will use system patterns only');
      }
      
      // Get unified engine with user context
      const { UnifiedCategorizationEngine } = await import('./unifiedCategorizationEngine');
      const unifiedEngine = UnifiedCategorizationEngine.getInstance('ON', userId);
      await unifiedEngine.initialize();
      console.log(`✅ Unified categorization engine initialized successfully with user context`);
      
      // Update the global reference to use the user-specific engine
      (global as any).userSpecificEngine = unifiedEngine;
    } catch (error) {
      console.error(`❌ Failed to initialize unified categorization engine:`, error);
      throw new Error(`Categorization engine initialization failed: ${error}`);
    }
    onProgress?.(50);
    
    // Phase 2: AI categorization (50-100%)
    console.log(`🤖 Starting categorization of ${transactions.length} transactions...`);
    const batchSize = Math.max(10, Math.min(100, Math.ceil(transactions.length / 20))); // Adaptive batch size
    const categorizedTransactions: Transaction[] = [];
    
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      
      // Process each transaction using unified categorization engine
      for (const transaction of batch) {
        console.log(`🔍 Categorizing transaction ${categorizedTransactions.length + 1}/${transactions.length}: "${transaction.description}"`);
        try {
          // Use user-specific engine if available, otherwise fall back to default
          const engine = (global as any).userSpecificEngine || unifiedCategorizationEngine;
          const result = await engine.categorizeTransaction(transaction);
          console.log(`✅ Categorization result: accountCode=${result.accountCode}, confidence=${result.confidence}, category=${result.category}, source=${result.source}`);
          
          transaction.accountCode = result.accountCode;
          transaction.confidence = result.confidence;
          transaction.category = result.category;
          
          // Ensure we have valid values
          if (!transaction.accountCode || transaction.accountCode === '') {
            console.warn(`⚠️ No account code returned for "${transaction.description}", using fallback`);
            transaction.accountCode = '453';
            transaction.confidence = 30;
            transaction.category = 'Uncategorized';
          }
        } catch (error) {
          console.error('Error categorizing transaction:', error);
          
          // Basic fallback categorization logic
          const description = transaction.description?.toLowerCase() || '';
          let fallbackAccountCode = '453';
          let fallbackConfidence = 30;
          let fallbackCategory = 'Uncategorized';
          
          // Simple pattern matching for common cases
          if (description.includes('e-tfr') || description.includes('e-transfer') || description.includes('etfr')) {
            fallbackAccountCode = '877'; // Transfers
            fallbackConfidence = 60;
            fallbackCategory = 'E-Transfer';
          } else if (description.includes('deposit') && transaction.amount > 0) {
            fallbackAccountCode = '200'; // Sales Revenue
            fallbackConfidence = 50;
            fallbackCategory = 'Revenue';
          } else if (description.includes('fee') || description.includes('charge')) {
            fallbackAccountCode = '404'; // Bank Fees
            fallbackConfidence = 50;
            fallbackCategory = 'Bank Fees';
          } else if (transaction.amount > 0) {
            fallbackAccountCode = '200'; // Sales Revenue for positive amounts
            fallbackConfidence = 40;
            fallbackCategory = 'Revenue';
          }
          
          transaction.accountCode = fallbackAccountCode;
          transaction.confidence = fallbackConfidence;
          transaction.category = fallbackCategory;
          
          console.log(`🔧 Fallback categorization: "${transaction.description}" -> ${fallbackAccountCode} (${fallbackConfidence}%)`);
        }
      }
      
      categorizedTransactions.push(...batch);
      
      if (onProgress) {
        const categorizationProgress = (categorizedTransactions.length / transactions.length) * 50; // 50% for categorization
        onProgress(Math.min(100, Math.round(50 + categorizationProgress)));
      }
      
      // Allow UI to update for large files
      if (transactions.length > 1000) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    console.log(`🎯 Categorization complete: ${categorizedTransactions.length} transactions processed`);
    
    // Log categorization summary
    const categorizedCount = categorizedTransactions.filter(t => t.accountCode && t.accountCode !== '453').length;
    const highConfidenceCount = categorizedTransactions.filter(t => (t.confidence || 0) >= 80).length;
    console.log(`📊 Categorization summary: ${categorizedCount}/${categorizedTransactions.length} categorized, ${highConfidenceCount} high confidence`);
    
    onProgress?.(95);
    
    // Double-check that account codes are properly assigned
    const finalTransactions = categorizedTransactions.map(transaction => {
      if (transaction.category && !transaction.accountCode) {
        transaction.accountCode = '453'; // Default fallback
      }
      return transaction;
    });
    
    // Phase 3: Auto-ChatGPT for uncategorized transactions (if AI mode enabled)
    let processedTransactions = finalTransactions;
    if (aiModeEnabled) {
      console.log('🤖 AI Mode enabled - processing uncategorized transactions with ChatGPT...');
      const uncategorizedTransactions = finalTransactions.filter(t => 
        !t.accountCode || 
        t.accountCode === '453' && (t.confidence || 0) < 70
      );
      
      if (uncategorizedTransactions.length > 0) {
        console.log(`🤖 Found ${uncategorizedTransactions.length} uncategorized transactions for auto-ChatGPT processing`);
        onProgress?.(96);
        
        processedTransactions = await this.processUncategorizedWithChatGPT(
          finalTransactions, 
          uncategorizedTransactions,
          (current, total) => {
            // Update progress for ChatGPT processing (96-99%)
            const chatGptProgress = (current / total) * 3; // 3% for ChatGPT phase
            onProgress?.(Math.min(99, Math.round(96 + chatGptProgress)));
          }
        );
      }
    }
    
    // Calculate final stats
    const categorizationStats = this.calculateCategorizationStats(processedTransactions);
    onProgress?.(100);
    
    return {
      transactions: processedTransactions,
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
    let format = BANK_FORMATS[bankFormat];
    const transactions: Transaction[] = [];
    const skippedRows: { index: number; reason: string; row: any }[] = [];
    
    console.log(`🔄 Processing ${rawData.length} rows with ${bankFormat} format...`);
    console.log(`📋 Format config:`, format);
    console.log(`📋 First row sample:`, rawData[0]);
    console.log(`📋 Available columns in data:`, rawData[0] ? Object.keys(rawData[0]) : 'No data');
    
    // For Generic format, try to intelligently detect columns
    if (bankFormat === 'Generic' && rawData.length > 0) {
      const availableColumns = Object.keys(rawData[0]);
      const detectedColumns = this.detectGenericColumns(availableColumns, rawData[0]);
      
      if (detectedColumns.dateColumn && detectedColumns.descriptionColumn && detectedColumns.amountColumn) {
        console.log(`🔍 Detected columns for Generic format:`, detectedColumns);
        format = {
          ...format,
          dateColumn: detectedColumns.dateColumn,
          descriptionColumn: detectedColumns.descriptionColumn,
          amountColumn: detectedColumns.amountColumn
        };
      }
    }
    
    rawData.forEach((row, index) => {
      try {
        const transaction = this.normalizeTransaction(row, format, index);
        if (transaction) {
          transactions.push(transaction);
        } else {
          skippedRows.push({ index: index + 1, reason: 'normalizeTransaction returned null', row });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        skippedRows.push({ index: index + 1, reason: errorMessage, row });
        console.warn(`⚠️ Skipping row ${index + 1}:`, errorMessage);
      }
    });
    
    console.log(`✅ Successfully processed ${transactions.length} out of ${rawData.length} rows`);
    
    if (skippedRows.length > 0) {
      console.log(`⚠️ Skipped ${skippedRows.length} rows:`);
      skippedRows.slice(0, 5).forEach(({ index, reason, row }) => {
        console.log(`  - Row ${index}: ${reason}`);
        console.log(`    Data:`, row);
      });
      if (skippedRows.length > 5) {
        console.log(`  ... and ${skippedRows.length - 5} more rows`);
      }
    }
    
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
      // Debug: Log the actual row data and available columns (only for first 3 rows)
      const availableColumns = Object.keys(row);
      if (index < 3) {
        console.log(`🔍 Row ${index + 1} - Available columns:`, availableColumns);
        console.log(`🔍 Row ${index + 1} - Expected columns:`, {
          date: format.dateColumn,
          description: format.descriptionColumn,
          amount: format.amountColumn
        });
        console.log(`🔍 Row ${index + 1} - Raw row data:`, row);
        console.log(`🔍 Row ${index + 1} - Looking for: Date="${format.dateColumn}", Description="${format.descriptionColumn}", Amount="${format.amountColumn}"`);
      }
      
      // Enhanced field extraction with fallback strategies
      let dateString = row[format.dateColumn]?.toString().trim();
      let description = row[format.descriptionColumn]?.toString().trim();
      let amountString = row[format.amountColumn]?.toString().trim();
      
      // Special handling for RBC format with separate withdrawal/deposit columns
      if (Array.isArray(format.identifier) && format.identifier.includes('Withdrawals ($)') && format.identifier.includes('Deposits ($)')) {
        const rowAny = row as any;
        const withdrawalString = rowAny['Withdrawals ($)']?.toString().trim();
        const depositString = rowAny['Deposits ($)']?.toString().trim();
        
        // Determine amount based on which column has a value
        if (withdrawalString && withdrawalString !== '') {
          amountString = `-${withdrawalString}`; // Negative for withdrawals
        } else if (depositString && depositString !== '') {
          amountString = depositString; // Positive for deposits
        } else {
          // If neither has a value, skip this row (like "Opening Balance")
          return null;
        }
      }
      
      // Enhanced fallback: try alternative column names if primary columns are empty
      if (!dateString) {
        const dateAlternatives = ['Transaction Date', 'Date', 'Txn Date', 'Posting Date', 'date', 'DATE'];
        for (const alt of dateAlternatives) {
          if (row[alt]) {
            dateString = row[alt].toString().trim();
            if (index < 3) {
              console.log(`🔍 Found date in alternative column: ${alt} = ${dateString}`);
            }
            break;
          }
        }
      }
      
      if (!description) {
        const descAlternatives = ['Transaction Details', 'Memo', 'Note', 'Narration', 'Details', 'description', 'DESCRIPTION'];
        for (const alt of descAlternatives) {
          if (row[alt]) {
            description = row[alt].toString().trim();
            if (index < 3) {
              console.log(`🔍 Found description in alternative column: ${alt} = ${description}`);
            }
            break;
          }
        }
      }
      
      if (!amountString) {
        const amountAlternatives = ['Debit', 'Credit', 'Value', 'Balance', 'amount', 'AMOUNT'];
        for (const alt of amountAlternatives) {
          if (row[alt]) {
            amountString = row[alt].toString().trim();
            if (index < 3) {
              console.log(`🔍 Found amount in alternative column: ${alt} = ${amountString}`);
            }
            break;
          }
        }
      }
      
      // If still no fields found, try to auto-detect from available columns
      if (!dateString || !description || !amountString) {
        if (index < 3) {
          console.log('🔍 Attempting auto-detection from available columns...');
        }
        
        // Try to find date column by checking for date-like values
        if (!dateString) {
          for (const col of availableColumns) {
            const value = row[col]?.toString().trim();
            if (value && this.looksLikeDate(value)) {
              dateString = value;
              if (index < 3) {
                console.log(`🔍 Auto-detected date column: ${col} = ${dateString}`);
              }
              break;
            }
          }
        }
        
        // Try to find amount column by checking for amount-like values
        if (!amountString) {
          for (const col of availableColumns) {
            const value = row[col]?.toString().trim();
            if (value && this.looksLikeAmount(value)) {
              amountString = value;
              if (index < 3) {
                console.log(`🔍 Auto-detected amount column: ${col} = ${amountString}`);
              }
              break;
            }
          }
        }
        
        // Use first non-empty column as description if not found
        if (!description) {
          for (const col of availableColumns) {
            const value = row[col]?.toString().trim();
            if (value && !this.looksLikeDate(value) && !this.looksLikeAmount(value)) {
              description = value;
              if (index < 3) {
                console.log(`🔍 Auto-detected description column: ${col} = ${description}`);
              }
              break;
            }
          }
        }
      }
      
      // Validate required fields
      if (!dateString || !description || !amountString) {
        if (index < 3) {
          console.log(`❌ Row ${index + 1} - Missing fields after all attempts:`, {
            date: !!dateString,
            description: !!description,
            amount: !!amountString
          });
        }
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
        id: generateId(),
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
      if (index < 3) {
        console.warn(`Row ${index + 1} normalization failed:`, error);
      }
      return null;
    }
  }

  /**
   * Enhanced date parsing with multiple format support and future date validation
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
        'MM.DD.YYYY',
        'DD MMM' // RBC format like "11 Dec"
      ];
      
      for (const format of formats) {
        try {
          switch (format) {
            case 'MM/DD/YYYY': {
              const [month, day, year] = cleanDate.split('/');
              if (month && day && year) {
                date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                if (!isNaN(date.getTime())) {
                  // Validate date before returning
                  if (this.validateDateRange(date, cleanDate)) {
                    return date;
                  }
                }
              }
              break;
            }
            case 'YYYY-MM-DD': {
              date = new Date(cleanDate);
              if (!isNaN(date.getTime())) {
                // Validate date before returning
                if (this.validateDateRange(date, cleanDate)) {
                  return date;
                }
              }
              break;
            }
            case 'DD/MM/YYYY': {
              const [day, month, year] = cleanDate.split('/');
              if (day && month && year) {
                date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                if (!isNaN(date.getTime())) {
                  // Validate date before returning
                  if (this.validateDateRange(date, cleanDate)) {
                    return date;
                  }
                }
              }
              break;
            }
            case 'DD-MM-YYYY': {
              const [day, month, year] = cleanDate.split('-');
              if (day && month && year) {
                date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                if (!isNaN(date.getTime())) {
                  // Validate date before returning
                  if (this.validateDateRange(date, cleanDate)) {
                    return date;
                  }
                }
              }
              break;
            }
            case 'MM-DD-YYYY': {
              const [month, day, year] = cleanDate.split('-');
              if (month && day && year) {
                date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                if (!isNaN(date.getTime())) {
                  // Validate date before returning
                  if (this.validateDateRange(date, cleanDate)) {
                    return date;
                  }
                }
              }
              break;
            }
            case 'YYYY/MM/DD': {
              const [year, month, day] = cleanDate.split('/');
              if (year && month && day) {
                date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                if (!isNaN(date.getTime())) {
                  // Validate date before returning
                  if (this.validateDateRange(date, cleanDate)) {
                    return date;
                  }
                }
              }
              break;
            }
            case 'DD.MM.YYYY': {
              const [day, month, year] = cleanDate.split('.');
              if (day && month && year) {
                date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                if (!isNaN(date.getTime())) {
                  // Validate date before returning
                  if (this.validateDateRange(date, cleanDate)) {
                    return date;
                  }
                }
              }
              break;
            }
            case 'MM.DD.YYYY': {
              const [month, day, year] = cleanDate.split('.');
              if (month && day && year) {
                date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                if (!isNaN(date.getTime())) {
                  // Validate date before returning
                  if (this.validateDateRange(date, cleanDate)) {
                    return date;
                  }
                }
              }
              break;
            }
            case 'DD MMM': {
              // Handle RBC format like "11 Dec" - assume current year
              const [day, month] = cleanDate.split(' ');
              if (day && month) {
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const monthIndex = monthNames.findIndex(m => 
                  m.toLowerCase() === month.toLowerCase()
                );
                if (monthIndex !== -1) {
                  const currentYear = new Date().getFullYear();
                  date = new Date(currentYear, monthIndex, parseInt(day));
                  if (!isNaN(date.getTime())) {
                    // Validate date before returning
                    if (this.validateDateRange(date, cleanDate)) {
                      return date;
                    }
                  }
                }
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
        // Validate date before returning
        if (this.validateDateRange(date, cleanDate)) {
          return date;
        }
      }
      
      return null;
      
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate that a date is within acceptable range (not in future, not too far in past)
   */
  private validateDateRange(date: Date, originalDateString: string): boolean {
    try {
      // Validate date is not in the future
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (date > today) {
        console.warn(`⚠️ Future date detected and rejected: ${originalDateString} -> ${date.toISOString().split('T')[0]}`);
        return false;
      }

      // Validate date is not too far in the past (more than 20 years)
      const twentyYearsAgo = new Date();
      twentyYearsAgo.setFullYear(twentyYearsAgo.getFullYear() - 20);
      
      if (date < twentyYearsAgo) {
        console.warn(`⚠️ Date too far in the past and rejected: ${originalDateString} -> ${date.toISOString().split('T')[0]}`);
        return false;
      }

      return true;
    } catch (error) {
      console.warn(`⚠️ Date validation error for ${originalDateString}:`, error);
      return false;
    }
  }

  /**
   * Enhanced amount parsing with better format support - now using centralized utility
   */
  private parseAmountFlexible(amountString: string): number | null {
    return parseAmountFlexible(amountString);
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
          
          return idType === headerType && calculateStringSimilarity(header, id) > 0.7;
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
    
    // Check for future dates
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    const futureDates = transactions.filter(t => t.date > todayStr);
    
    if (invalidDates.length > 0) {
      result.warnings.push(`${invalidDates.length} transactions have invalid dates`);
    }
    
    if (futureDates.length > 0) {
      result.warnings.push(`${futureDates.length} transactions have future dates and were filtered out`);
      // Remove future dated transactions from the main array
      transactions.splice(0, transactions.length, ...transactions.filter(t => t.date <= todayStr));
    }
    
    if (missingDescriptions.length > 0) {
      result.warnings.push(`${missingDescriptions.length} transactions have missing descriptions`);
    }
    
    if (zeroAmounts.length > 0) {
      result.warnings.push(`${zeroAmounts.length} transactions have zero amounts`);
    }
    
    // Performance warning for large datasets
    if (transactions.length > 1000) {
      result.warnings.push(`Large dataset (${transactions.length} transactions) may impact performance`);
    }
    
    return result;
  }



  /**
   * Calculate categorization statistics
   */
  private calculateCategorizationStats(transactions: Transaction[]) {
    const total = transactions.length;
    
    console.log(`📊 Calculating stats for ${total} transactions...`);
    
    // Count transactions that have account codes (any valid account code)
    const categorized = transactions.filter(t => {
      const hasAccountCode = t.accountCode && t.accountCode !== '' && t.accountCode !== 'uncategorized';
      return hasAccountCode;
    }).length;
    
    // Count high confidence transactions (80%+ confidence)
    const highConfidence = transactions.filter(t => {
      const isHighConfidence = (t.confidence || 0) >= 80 && t.accountCode && t.accountCode !== '' && t.accountCode !== 'uncategorized';
      return isHighConfidence;
    }).length;
    
    // Count transactions that need review (no account code OR low confidence)
    const needsReview = transactions.filter(t => {
      const needsReview = !t.accountCode || t.accountCode === '' || t.accountCode === 'uncategorized' || (t.confidence || 0) < 70;
      return needsReview;
    }).length;

    const stats = {
      total,
      categorized,
      highConfidence,
      needsReview,
      categorizedPercent: total > 0 ? Math.round((categorized / total) * 100) : 0,
      highConfidencePercent: total > 0 ? Math.round((highConfidence / total) * 100) : 0,
      needsReviewPercent: total > 0 ? Math.round((needsReview / total) * 100) : 0
    };

    console.log(`📈 Final stats calculated:`, stats);
    console.log(`📈 Stats breakdown:`, {
      total,
      categorized,
      highConfidence,
      needsReview,
      categorizedPercent: stats.categorizedPercent,
      highConfidencePercent: stats.highConfidencePercent,
      needsReviewPercent: stats.needsReviewPercent
    });
    return stats;
  }

  /**
   * Process uncategorized transactions with ChatGPT (AI mode)
   */
  private async processUncategorizedWithChatGPT(
    allTransactions: Transaction[],
    uncategorizedTransactions: Transaction[],
    onProgress?: (current: number, total: number) => void
  ): Promise<Transaction[]> {
    const processedTransactions = [...allTransactions];
    let successCount = 0;
    let errorCount = 0;
    
    console.log(`🤖 Auto-ChatGPT processing ${uncategorizedTransactions.length} uncategorized transactions...`);
    
    // Process in batches of 3 to avoid overwhelming the API
    for (let i = 0; i < uncategorizedTransactions.length; i += 3) {
      const batch = uncategorizedTransactions.slice(i, i + 3);
      
      const batchPromises = batch.map(async (transaction) => {
        try {
          console.log(`🤖 Auto-ChatGPT: Processing "${transaction.description}"...`);
          
          const response = await fetch('/api/ai-categorize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transaction: {
                description: transaction.description,
                amount: transaction.amount
              },
              forceAI: true
            })
          });
          
          const result = await response.json();
          
          if (response.ok && result.accountCode) {
            // Find and update the transaction in processedTransactions
            const transactionIndex = processedTransactions.findIndex(t => t.id === transaction.id);
            if (transactionIndex !== -1) {
                             processedTransactions[transactionIndex] = {
                 ...processedTransactions[transactionIndex],
                 accountCode: result.accountCode,
                 category: result.category || result.accountCode,
                 confidence: result.confidence || 95,
                 aiCategorized: true
               };
              console.log(`✅ Auto-ChatGPT success: ${transaction.description} -> ${result.accountCode} (${result.confidence}%)`);
              successCount++;
            }
          } else {
            console.log(`❌ Auto-ChatGPT failed: ${transaction.description} - ${result.error || 'Unknown error'}`);
            errorCount++;
          }
        } catch (error) {
          console.error(`❌ Auto-ChatGPT error for "${transaction.description}":`, error);
          errorCount++;
        }
      });
      
      await Promise.all(batchPromises);
      
      // Update progress
      const currentProgress = Math.min(i + 3, uncategorizedTransactions.length);
      onProgress?.(currentProgress, uncategorizedTransactions.length);
      
      // Small delay between batches to avoid rate limiting
      if (i + 3 < uncategorizedTransactions.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`🤖 Auto-ChatGPT completed: ${successCount} successes, ${errorCount} failures`);
    return processedTransactions;
  }

  /**
   * Categorize all transactions using unified categorization with parallel processing
   */
  async categorizeAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
    const stopTimer = performanceTracker.startTimer('categorize_all_transactions');
    
    const categorizedTransactions = await parallelProcessor.processTransactions(
      transactions,
      async (transaction) => {
        try {
          // Use user-specific engine if available, otherwise fall back to default
          const engine = (global as any).userSpecificEngine || unifiedCategorizationEngine;
          const result = await engine.categorizeTransaction(transaction);
          
          return {
            ...transaction,
            category: result.category,
            accountCode: result.accountCode,
            confidence: result.confidence,
            merchant: result.merchant || this.extractMerchant(transaction.description),
            inflowOutflow: result.inflowOutflow
          };
        } catch (error) {
          console.error('Error categorizing transaction:', error);
          return {
            ...transaction,
            accountCode: '453',
            confidence: 0,
            merchant: this.extractMerchant(transaction.description)
          };
        }
      },
      (completed, total) => {
        // Optional progress callback - can be used for UI progress updates
        if (completed % 50 === 0) {
          console.log(`Categorized ${completed}/${total} transactions`);
        }
      }
    );
    
    stopTimer();
    return categorizedTransactions;
  }

  /**
   * Extract merchant from transaction description
   */
  private extractMerchant(description: string): string {
    // Simple merchant extraction - can be enhanced
    const cleaned = description.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
    const words = cleaned.split(/\s+/);
    
    // Take first 3 words as merchant
    return words.slice(0, 3).join(' ');
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

  /**
   * Validate and parse date with enhanced error handling
   */
  private parseDate(dateStr: string, rowIndex: number): Date {
    try {
      // Remove any extra whitespace
      const cleanDateStr = dateStr.trim();
      
      if (!cleanDateStr) {
        throw new Error('Empty date string');
      }

      // Try multiple date formats
      const dateFormats = [
        'yyyy-MM-dd',
        'MM/dd/yyyy',
        'dd/MM/yyyy',
        'yyyy/MM/dd',
        'MM-dd-yyyy',
        'dd-MM-yyyy',
        'MMM dd, yyyy',
        'dd MMM yyyy',
        'yyyy-MM-dd HH:mm:ss',
        'MM/dd/yyyy HH:mm:ss'
      ];

      let parsedDate: Date | null = null;

      for (const format of dateFormats) {
        try {
          parsedDate = this.parseDateWithFormat(cleanDateStr, format);
          if (parsedDate && !isNaN(parsedDate.getTime())) {
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!parsedDate || isNaN(parsedDate.getTime())) {
        throw new Error(`Unable to parse date: ${cleanDateStr}`);
      }

      // Validate date is not in the future
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (parsedDate > today) {
        throw new Error(`Future date not allowed: ${parsedDate.toISOString().split('T')[0]}`);
      }

      // Validate date is not too far in the past (more than 10 years)
      const tenYearsAgo = new Date();
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
      
      if (parsedDate < tenYearsAgo) {
        throw new Error(`Date too far in the past: ${parsedDate.toISOString().split('T')[0]}`);
      }

      return parsedDate;

    } catch (error) {
      console.error(`❌ Date parsing error at row ${rowIndex + 1}:`, error);
      throw new Error(`Invalid date at row ${rowIndex + 1}: ${dateStr} - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse date with specific format
   */
  private parseDateWithFormat(dateStr: string, format: string): Date | null {
    try {
      // Handle common date formats
      if (format === 'yyyy-MM-dd') {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
      }
      
      if (format === 'MM/dd/yyyy') {
        const [month, day, year] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day);
      }
      
      if (format === 'dd/MM/yyyy') {
        const [day, month, year] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day);
      }
      
      if (format === 'yyyy/MM/dd') {
        const [year, month, day] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day);
      }
      
      if (format === 'MM-dd-yyyy') {
        const [month, day, year] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
      }
      
      if (format === 'dd-MM-yyyy') {
        const [day, month, year] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
      }
      
      // Handle text formats
      if (format === 'MMM dd, yyyy' || format === 'dd MMM yyyy') {
        return new Date(dateStr);
      }
      
      // Handle datetime formats
      if (format.includes('HH:mm:ss')) {
        return new Date(dateStr);
      }
      
      // Fallback to native Date parsing
      const parsed = new Date(dateStr);
      return isNaN(parsed.getTime()) ? null : parsed;
      
    } catch (error) {
      return null;
    }
  }
} 