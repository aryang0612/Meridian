import React from 'react';
import { AlertTriangle, FileText, Download, RefreshCw } from 'lucide-react';

interface FileFormatErrorProps {
  error: string;
  fileName?: string;
  onRetry?: () => void;
  onDownloadTemplate?: () => void;
}

export default function FileFormatError({ 
  error, 
  fileName, 
  onRetry, 
  onDownloadTemplate 
}: FileFormatErrorProps) {
  // Parse common error patterns to provide specific guidance
  const getErrorDetails = (errorMsg: string) => {
    const lowerError = errorMsg.toLowerCase();
    
    if (lowerError.includes('header') || lowerError.includes('column')) {
      return {
        title: 'File Headers Issue',
        description: 'The CSV file headers don\'t match expected formats.',
        suggestions: [
          'Check that your CSV has columns for Date, Description, and Amount',
          'Common header names: "Date", "Transaction Date", "Description", "Details", "Amount", "Debit", "Credit"',
          'Download our template to see the correct format'
        ]
      };
    }
    
    if (lowerError.includes('date') || lowerError.includes('format')) {
      return {
        title: 'Date Format Issue',
        description: 'The date format in your file isn\'t recognized.',
        suggestions: [
          'Use standard date formats: MM/DD/YYYY, YYYY-MM-DD, or DD/MM/YYYY',
          'Avoid text dates like "January 1st, 2024"',
          'Make sure all dates are in the same format'
        ]
      };
    }
    
    if (lowerError.includes('amount') || lowerError.includes('number')) {
      return {
        title: 'Amount Format Issue',
        description: 'The amount/currency format isn\'t recognized.',
        suggestions: [
          'Use numbers only (e.g., 1234.56, not $1,234.56)',
          'Use negative numbers for expenses, positive for income',
          'Avoid currency symbols and commas in numbers'
        ]
      };
    }
    
    if (lowerError.includes('empty') || lowerError.includes('no data')) {
      return {
        title: 'Empty File Issue',
        description: 'The file appears to be empty or has no transaction data.',
        suggestions: [
          'Make sure the file contains transaction data',
          'Check that the file isn\'t corrupted',
          'Try opening the file in a text editor to verify content'
        ]
      };
    }
    
    // Default case
    return {
      title: 'File Processing Error',
      description: 'There was an issue processing your file.',
      suggestions: [
        'Check that the file is a valid CSV format',
        'Ensure the file isn\'t corrupted or password-protected',
        'Try downloading our template and comparing formats'
      ]
    };
  };

  const errorDetails = getErrorDetails(error);

  return (
    <div className="bg-white rounded-3xl p-10 border border-red-200 shadow-xl shadow-red-500/5">
      {/* Error Header */}
      <div className="flex items-center space-x-4 mb-8">
        <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/25">
          <AlertTriangle className="w-7 h-7 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-slate-900">
            {errorDetails.title}
          </h3>
          {fileName && (
            <p className="text-red-600 mt-1 font-medium">
              File: {fileName}
            </p>
          )}
        </div>
      </div>

      {/* Error Description */}
      <div className="bg-red-50 rounded-2xl p-6 mb-8 border border-red-100">
        <p className="text-red-800 font-medium leading-relaxed">
          {errorDetails.description}
        </p>
        <p className="text-red-700 mt-2 text-sm">
          Error details: {error}
        </p>
      </div>

      {/* Suggestions */}
      <div className="space-y-6 mb-8">
        <h4 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
          <FileText className="w-5 h-5 text-purple-600" />
          <span>How to Fix This:</span>
        </h4>
        <ul className="space-y-3">
          {errorDetails.suggestions.map((suggestion, index) => (
            <li key={index} className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
              <span className="text-slate-700 leading-relaxed">{suggestion}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/25"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        )}
        
        {onDownloadTemplate && (
          <button
            onClick={onDownloadTemplate}
            className="flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-medium transition-all duration-200"
          >
            <Download className="w-4 h-4" />
            <span>Download Template</span>
          </button>
        )}
      </div>
    </div>
  );
} 