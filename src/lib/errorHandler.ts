import { ValidationResult } from './types';

export class ErrorHandler {
  /**
   * Convert technical errors to user-friendly messages with enhanced header formatting support
   */
  static handleCSVError(error: any): string {
    const message = error?.message || error?.toString() || 'Unknown error';
    
    // Enhanced header formatting errors
    if (message.includes('No date column found')) {
      return 'Date column not found. Your CSV needs a column with dates. Common headers: "Date", "Transaction Date", "Posting Date", "Value Date". Please check your file headers and try again.';
    }
    
    if (message.includes('No description column found')) {
      return 'Description column not found. Your CSV needs a column with transaction details. Common headers: "Description", "Transaction Details", "Memo", "Narration", "Payee". Please check your file headers and try again.';
    }
    
    if (message.includes('No amount column found')) {
      return 'Amount column not found. Your CSV needs a column with transaction amounts. Common headers: "Amount", "Transaction Amount", "Value", "Debit", "Credit". Please check your file headers and try again.';
    }
    
    if (message.includes('No clear date column found')) {
      return 'Date column is unclear. Please ensure your CSV has a clear date column. Recommended header: "Date". Other accepted formats: "Transaction Date", "Posting Date", "Value Date".';
    }
    
    if (message.includes('No clear description column found')) {
      return 'Description column is unclear. Please ensure your CSV has a clear description column. Recommended header: "Description". Other accepted formats: "Transaction Details", "Memo", "Narration".';
    }
    
    if (message.includes('No clear amount column found')) {
      return 'Amount column is unclear. Please ensure your CSV has a clear amount column. Recommended header: "Amount". Other accepted formats: "Transaction Amount", "Value", "Debit/Credit".';
    }
    
    if (message.includes('Future date not allowed') || message.includes('future dates')) {
      return 'Future dates detected in your file. Transaction dates must be today or in the past. Please check your file for incorrect dates and try again.';
    }
    
    // File format errors
    if (message.includes('Unsupported bank format')) {
      return 'Your bank format is not yet supported. Please ensure your CSV has Date, Description, and Amount columns, or contact support for your bank format.';
    }
    
    if (message.includes('Invalid CSV format')) {
      return 'CSV format error. Please check that your file has proper headers (Date, Description, Amount) and try again.';
    }
    
    if (message.includes('No valid transactions found')) {
      return 'No valid transactions found in your file. Please check the CSV format and ensure it contains transaction data.';
    }
    
    if (message.includes('CSV format not recognized')) {
      return 'CSV format not recognized. Please ensure your file has columns for Date, Description, and Amount. Common variations like "Transaction Date", "Transaction Details", "Transaction Amount" are supported.';
    }
    
    // Papa Parse specific errors
    if (error?.type === 'Delimiter') {
      return 'CSV delimiter error. Please ensure your file uses commas (,) to separate columns.';
    }
    
    if (error?.type === 'Quotes') {
      return 'CSV quote error. Please check for unmatched quotation marks in your file.';
    }
    
    // File size/content errors
    if (message.includes('File too large')) {
      return 'File is too large. Please upload a CSV file smaller than 10MB.';
    }
    
    if (message.includes('Empty file')) {
      return 'The uploaded file appears to be empty. Please check your CSV file and try again.';
    }
    
    // Generic fallback with enhanced suggestions
    return `Processing error: ${message}. Please check your CSV format and ensure it has proper headers (Date, Description, Amount).`;
  }

  /**
   * Handle AI categorization errors with recovery suggestions
   */
  static handleAIError(error: any, context: string = 'AI categorization'): string {
    const message = error?.message || error?.toString() || 'Unknown AI error';
    
    // OpenAI API errors
    if (message.includes('OpenAI API key')) {
      return 'AI categorization unavailable: API key issue. The system will use local categorization instead.';
    }
    
    if (message.includes('rate limit')) {
      return 'AI categorization temporarily unavailable: Rate limit exceeded. Please try again in a few minutes.';
    }
    
    if (message.includes('timeout')) {
      return 'AI categorization timed out. This may happen with large files. Try breaking your file into smaller chunks.';
    }
    
    if (message.includes('invalid request')) {
      return 'AI categorization error: Invalid request format. The system will use local categorization instead.';
    }
    
    // Network errors
    if (message.includes('fetch failed') || message.includes('network')) {
      return 'Network error during AI categorization. Please check your internet connection and try again.';
    }
    
    // Batch processing errors
    if (message.includes('batch processing')) {
      return 'Error during batch AI categorization. Try reducing the number of transactions or categorizing them individually.';
    }
    
    // Generic AI fallback
    return `AI categorization error: ${message}. Manual categorization is still available.`;
  }

  /**
   * Handle API errors with specific recovery actions
   */
  static handleAPIError(error: any, endpoint: string = 'API'): { message: string; canRetry: boolean; suggestedAction?: string } {
    const message = error?.message || error?.toString() || 'Unknown API error';
    
    // Network errors
    if (message.includes('fetch failed') || message.includes('network')) {
      return {
        message: 'Network connection error. Please check your internet connection.',
        canRetry: true,
        suggestedAction: 'Try again in a few seconds'
      };
    }
    
    // Server errors
    if (message.includes('500') || message.includes('internal server')) {
      return {
        message: 'Server error. The system is temporarily unavailable.',
        canRetry: true,
        suggestedAction: 'Try again in a few minutes'
      };
    }
    
    // Authentication errors
    if (message.includes('401') || message.includes('unauthorized')) {
      return {
        message: 'Authentication error. Please refresh the page and try again.',
        canRetry: false,
        suggestedAction: 'Refresh the page'
      };
    }
    
    // Rate limiting
    if (message.includes('429') || message.includes('rate limit')) {
      return {
        message: 'Too many requests. Please wait a moment before trying again.',
        canRetry: true,
        suggestedAction: 'Wait 30 seconds and try again'
      };
    }
    
    // Validation errors
    if (message.includes('400') || message.includes('bad request')) {
      return {
        message: 'Invalid request. Please check your input and try again.',
        canRetry: false,
        suggestedAction: 'Check your data format'
      };
    }
    
    return {
      message: `${endpoint} error: ${message}`,
      canRetry: true,
      suggestedAction: 'Try again'
    };
  }

  /**
   * Generate user-friendly validation messages
   */
  static formatValidationResult(validation: ValidationResult): string {
    if (validation.errors.length > 0) {
      return `❌ ${validation.errors.join('. ')}.`;
    }
    
    if (validation.warnings.length > 0) {
      return `⚠️ ${validation.warnings.join('. ')}.`;
    }
    
    return '✅ All validations passed.';
  }

  /**
   * Log technical details for debugging
   */
  static logTechnicalDetails(error: any, context: string): void {
    console.group(`🔧 Technical Error Details (${context})`);
    console.log('Error object:', error);
    console.log('Error type:', typeof error);
    console.log('Error message:', error?.message);
    console.log('Error stack:', error?.stack);
    console.groupEnd();
  }

  /**
   * Get recovery suggestions for common errors
   */
  static getRecoverySuggestions(errorType: string): string[] {
    const suggestions: { [key: string]: string[] } = {
      'csv_parsing': [
        'Check that your CSV has proper headers (Date, Description, Amount)',
        'Ensure the file uses comma separators',
        'Verify dates are in a recognizable format (YYYY-MM-DD, MM/DD/YYYY)',
        'Make sure amounts are numeric (remove currency symbols)',
        'Try opening the file in Excel/Google Sheets to verify formatting'
      ],
      'ai_categorization': [
        'Individual transactions can still be categorized manually',
        'Try batch categorization with smaller groups',
        'Check your internet connection',
        'Manual categorization is available as a fallback'
      ],
      'file_upload': [
        'Ensure file size is under 10MB',
        'Use CSV format only (not Excel .xlsx)',
        'Try refreshing the page if upload fails',
        'Check that the file is not corrupted'
      ],
      'network': [
        'Check your internet connection',
        'Try refreshing the page',
        'Wait a few minutes and try again',
        'Contact support if the issue persists'
      ]
    };
    
    return suggestions[errorType] || ['Try refreshing the page', 'Contact support if the issue persists'];
  }

  /**
   * Get header formatting suggestions for better CSV compatibility
   */
  static getHeaderFormattingTips(): string[] {
    return [
      'Use standard headers: "Date", "Description", "Amount"',
      'Avoid special characters in headers (except spaces)',
      'Use proper case: "Date" not "DATE" or "date"',
      'Keep headers under 30 characters',
      'Optional but recommended: "Balance", "Reference"',
      'Common variations are supported (e.g., "Transaction Date", "Transaction Details")',
      'Remove extra spaces and formatting from headers'
    ];
  }

  /**
   * Get example CSV format
   */
  static getExampleCSVFormat(): string {
    return `Date,Description,Amount,Balance,Reference
2024-01-15,Coffee Shop Purchase,5.50,1234.56,TXN001
2024-01-16,Gas Station,45.00,1189.56,TXN002
2024-01-17,Grocery Store,125.75,1063.81,TXN003`;
  }
} 