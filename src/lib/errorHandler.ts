import { ValidationResult } from './types';

export class ErrorHandler {
  /**
   * Convert technical errors to user-friendly messages
   */
  static handleCSVError(error: any): string {
    const message = error?.message || error?.toString() || 'Unknown error';
    
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
    
    // Generic fallback
    return `Processing error: ${message}. Please check your CSV format and try again.`;
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
} 