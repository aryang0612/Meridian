'use client';
import React, { useState, useCallback } from 'react';
import { CSVProcessor } from '../lib/csvProcessor';
import { ValidationResult, Transaction, BankFormat, DuplicateDetectionResult } from '../lib/types';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useFinancialData } from '../context/FinancialDataContext';
import { categorizeAccountType } from '../lib/reportGenerator';

interface FileUploadProps {
  onFileProcessed: (data: {
    transactions: Transaction[];
    validation: ValidationResult;
    bankFormat: BankFormat | 'Unknown';
    duplicateResult?: DuplicateDetectionResult;
    stats: any;
  }) => void;
  onError: (error: string) => void;
  disabled: boolean;
}

export default function FileUpload({ onFileProcessed, onError, disabled }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const { setFinancialData, setIsSample } = useFinancialData();
  const csvProcessor = new CSVProcessor();

  // Helper to map uploaded transactions to report Transaction type
  function mapToReportTransaction(tx: any): import('../lib/reportGenerator').Transaction {
    // Infer type from accountCode or category
    let type: 'income' | 'expense' | 'asset' | 'liability' | 'equity' = 'expense';
    if (tx.accountCode) {
      type = categorizeAccountType(tx.accountCode);
    } else if (tx.category) {
      const cat = tx.category.toLowerCase();
      if (cat.includes('revenue') || cat.includes('income')) type = 'income';
      else if (cat.includes('asset')) type = 'asset';
      else if (cat.includes('liability')) type = 'liability';
      else if (cat.includes('equity')) type = 'equity';
      else type = 'expense';
    }
    return {
      id: tx.id,
      date: new Date(tx.date),
      description: tx.description,
      amount: tx.amount,
      category: tx.category || '',
      accountCode: tx.accountCode || '',
      type,
    };
  }

  const processFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      onError('Please upload a CSV file only');
      return;
    }

    setIsProcessing(true);
    setUploadedFile(file);
    
    try {
      const result = await csvProcessor.parseAndCategorizeCSV(file);
      // Map transactions for reports
      const reportTransactions = result.transactions.map(mapToReportTransaction);
      // Set context for reports
      let startDate = new Date();
      let endDate = new Date();
      if (reportTransactions.length > 0) {
        startDate = new Date(Math.min(...reportTransactions.map(tx => tx.date.getTime())));
        endDate = new Date(Math.max(...reportTransactions.map(tx => tx.date.getTime())));
      }
      const companyName = 'Uploaded File';
      setFinancialData({
        transactions: reportTransactions,
        startDate,
        endDate,
        companyName,
        reportDate: new Date(),
      });
      setIsSample(false);
      onFileProcessed(result);
    } catch (error) {
      console.error('File processing error:', error);
      onError(error instanceof Error ? error.message : 'Failed to process file');
    } finally {
      setIsProcessing(false);
    }
  }, [onFileProcessed, onError, csvProcessor, setFinancialData, setIsSample]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  return (
    <div className="space-y-8">
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`group relative border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-300 ${
          isDragOver
            ? 'border-purple-400 bg-purple-50/50 scale-[1.02]'
            : isProcessing
            ? 'border-purple-200 bg-purple-50/30'
            : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/20 hover:scale-[1.01]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          disabled={disabled || isProcessing}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        
        <div className="space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            {isProcessing ? (
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
              </div>
            ) : uploadedFile ? (
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center group-hover:bg-purple-200 transition-colors duration-300">
                <Upload className="w-8 h-8 text-purple-600" />
              </div>
            )}
          </div>

          {/* Text */}
          <div className="space-y-3">
            {isProcessing ? (
              <>
                <p className="text-xl font-semibold text-slate-900">
                  Processing your bank statement...
                </p>
                <p className="text-slate-600 leading-relaxed">
                  Analyzing transactions and applying intelligent categorization
                </p>
              </>
            ) : uploadedFile ? (
              <>
                <p className="text-xl font-semibold text-slate-900">
                  File uploaded successfully
                </p>
                <p className="text-slate-600 leading-relaxed">
                  {uploadedFile.name} • {(uploadedFile.size / 1024).toFixed(1)} KB
                </p>
              </>
            ) : (
              <>
                <p className="text-xl font-semibold text-slate-900">
                  Drop your CSV file here
                </p>
                <p className="text-slate-600 leading-relaxed">
                  Or click to browse and select your bank statement
                </p>
              </>
            )}
          </div>

          {/* Button */}
          {!isProcessing && !uploadedFile && (
            <div className="pt-4">
              <button
                type="button"
                disabled={disabled}
                className="px-8 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 hover:scale-105 transition-all duration-300 font-medium shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                Choose File
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Supported Formats */}
      <div className="bg-slate-50 rounded-xl p-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-slate-600" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900">
            Supported Bank Formats
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { name: 'RBC', desc: 'Royal Bank of Canada' },
            { name: 'TD', desc: 'TD Canada Trust' },
            { name: 'Scotia', desc: 'Bank of Nova Scotia' },
            { name: 'BMO', desc: 'Bank of Montreal' },
            { name: 'BT Records', desc: 'BT Records Format' }
          ].map((bank) => (
            <div key={bank.name} className="bg-white rounded-xl p-6 text-center hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 border border-transparent hover:border-purple-100">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-100 transition-colors duration-300">
                <span className="text-purple-600 font-semibold text-sm">{bank.name}</span>
              </div>
              <h4 className="font-semibold text-slate-900 mb-2">{bank.name}</h4>
              <p className="text-sm text-slate-500 leading-relaxed">{bank.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 p-6 bg-white rounded-xl border border-purple-100/50">
          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
              <AlertCircle className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">File Requirements</h4>
              <ul className="text-sm text-slate-600 space-y-2 leading-relaxed">
                <li>• CSV format with standard bank headers (Date, Description, Amount)</li>
                <li>• File size should be under 10MB for optimal performance</li>
                <li>• Transactions should include complete date and description information</li>
                <li>• Multiple date formats supported (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 