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