import Papa from 'papaparse';
import { Transaction, ValidationResult } from './types';
import { BANK_FORMATS, BankFormat } from '../data/bankFormats';
import { AIEngine } from './aiEngine';
import { detectDuplicates, DuplicateDetectionResult } from './duplicateDetector';

export class CSVProcessor {
  private aiEngine = new AIEngine();

  /**
   * Detect bank format from headers with enhanced flexibility
   */
  detectBankFormat(headers: string[]): BankFormat | 'Unknown' {
    if (!headers || headers.length === 0) {
      return 'Unknown';
    }

    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    console.log('🔍 Analyzing headers:', normalizedHeaders);

    // Enhanced format detection with multiple fallback strategies
    for (const [bankName, format] of Object.entries(BANK_FORMATS)) {
      const formatIdentifiers = format.identifier.map(id => id.toLowerCase().trim());
      
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
      h.includes('date') || h.includes('time') || h === 'date' || h === 'transaction date'
    );
    const hasDescription = normalizedHeaders.some(h => 
      h.includes('description') || h.includes('detail') || h.includes('transaction') || 
      h.includes('memo') || h.includes('note') || h.includes('narration')
    );
    const hasAmount = normalizedHeaders.some(h => 
      h.includes('amount') || h.includes('value') || h.includes('balance') || 
      h.includes('debit') || h.includes('credit') || h === 'amount'
    );

    if (hasDate && hasDescription && hasAmount) {
      console.log('✅ Detected Generic CSV format with flexible matching');
      return 'Generic';
    }

    // Additional fallback: try to find any columns that could work
    const potentialDateColumns = normalizedHeaders.filter(h => 
      h.includes('date') || h.includes('time')
    );
    const potentialDescColumns = normalizedHeaders.filter(h => 
      h.includes('description') || h.includes('detail') || h.includes('transaction') ||
      h.includes('memo') || h.includes('note') || h.includes('narration')
    );
    const potentialAmountColumns = normalizedHeaders.filter(h => 
      h.includes('amount') || h.includes('value') || h.includes('balance') ||
      h.includes('debit') || h.includes('credit')
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
   * Detect bank format using headers and sample data
   */
  detectBankFormatWithData(headers: string[], sampleData: any[], filename?: string): BankFormat | 'Unknown' {
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    
    // Check for BT Records format based on filename first
    if (filename && filename.toLowerCase().includes('bt records')) {
      console.log(`✅ Detected BT Records format from filename: ${filename}`);
      return 'BT_Records';
    }
    
    // Get a sample date from the first few rows - check multiple possible date columns
    const sampleDate = sampleData.length > 0 ? 
      sampleData[0]['Date'] || 
      sampleData[0]['Transaction Date'] || 
      sampleData[0]['DATE'] : null;
    console.log(`📅 Sample date for format detection: "${sampleDate}"`);
    
    // Check for most specific formats first - prioritize exact matches
    const formatPriority = ['Generic', 'Generic_DADB', 'RBC', 'Scotia', 'Scotia_DayToDay', 'BMO', 'TD', 'BT_Records'];
    
    for (const bank of formatPriority) {
      const format = BANK_FORMATS[bank as BankFormat];
      if (!format) continue;
      
      // Check for exact header matches first
      const exactMatches = format.identifier.filter(col => 
        normalizedHeaders.includes(col.toLowerCase())
      );
      
      // If we have exact matches for all required columns, use this format
      if (exactMatches.length === format.identifier.length) {
        console.log(`✅ Detected bank format: ${bank} (exact match)`);
        return bank as BankFormat;
      }
      
      // Otherwise, check for partial matches (contains/includes)
      const hasAllColumns = format.identifier.every(col => 
        normalizedHeaders.some(header => 
          header.includes(col.toLowerCase()) || 
          col.toLowerCase().includes(header)
        )
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
    
    console.warn('❌ Unknown bank format detected');
    console.log('Available headers:', normalizedHeaders);
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
   * Validate CSV headers
   */
  private validateHeaders(headers: string[]): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [] };
    
    if (!headers || headers.length === 0) {
      result.isValid = false;
      result.errors.push('No headers found in CSV file');
      return result;
    }
    
    // Check if headers match any known bank format
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    let formatFound = false;
    
    // Check against all known bank formats
    for (const [bankName, format] of Object.entries(BANK_FORMATS)) {
      const formatIdentifiers = format.identifier.map(id => id.toLowerCase().trim());
      const hasAllRequiredColumns = formatIdentifiers.every(id => 
        normalizedHeaders.includes(id)
      );
      
      if (hasAllRequiredColumns) {
        formatFound = true;
        console.log(`✅ Headers match ${bankName} format`);
        break;
      }
    }
    
    // If no exact format match, check for generic required columns
    if (!formatFound) {
      const hasDate = normalizedHeaders.some(h => 
        h.includes('date') || h.includes('time') || h === 'date'
      );
      const hasDescription = normalizedHeaders.some(h => 
        h.includes('description') || h.includes('detail') || h.includes('transaction') || h === 'description'
      );
      const hasAmount = normalizedHeaders.some(h => 
        h.includes('amount') || h.includes('value') || h.includes('balance') || h === 'amount'
      );
      
      if (hasDate && hasDescription && hasAmount) {
        formatFound = true;
        console.log(`✅ Headers match generic CSV format`);
      } else {
        if (!hasDate) {
          result.errors.push('No date column found');
        }
        if (!hasDescription) {
          result.errors.push('No description column found');
        }
        if (!hasAmount) {
          result.errors.push('No amount column found');
        }
      }
    }
    
    if (!formatFound) {
      result.isValid = false;
      console.log(`❌ Headers don't match any known format:`, headers);
      console.log(`Available formats:`, Object.keys(BANK_FORMATS));
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
} 