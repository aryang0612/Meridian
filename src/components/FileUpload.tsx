'use client';
import React, { useState, useCallback } from 'react';
import { CSVProcessor } from '../lib/csvProcessor';
import { PDFProcessor } from '../lib/pdfProcessor';
import { ValidationResult, Transaction, BankFormat } from '../lib/types';
import { DuplicateDetectionResult } from '../lib/duplicateDetector';
import { CommonIcons, AppIcons } from '../lib/iconSystem';
import { useFinancialData } from '../context/FinancialDataContext';
import { categorizeAccountType } from '../lib/reportGenerator';
import { ProgressBar } from './ProgressBar';

interface FileUploadProps {
  onFileProcessed: (data: {
    transactions: Transaction[];
    validation: ValidationResult;
    bankFormat: BankFormat | 'Unknown';
    duplicateResult?: DuplicateDetectionResult;
    stats: any;
  }) => void;
  onError: (error: string, fileName?: string) => void;
  disabled: boolean;
  aiModeEnabled?: boolean; // NEW: AI mode toggle
}

export default function FileUpload({ onFileProcessed, onError, disabled, aiModeEnabled = false }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);

  const { setFinancialData, setIsSample } = useFinancialData();
  const csvProcessor = new CSVProcessor();
  const pdfProcessor = typeof window !== 'undefined' ? new PDFProcessor() : null;

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
    const fileExtension = file.name.toLowerCase().split('.').pop();
    
    // Enhanced file type detection with explicit CSV and PDF checks
    const isCSVFile = (file.type === 'text/csv' || file.name.endsWith('.csv') || fileExtension === 'csv');
    const isPDFFile = (file.type === 'application/pdf' || file.name.endsWith('.pdf') || fileExtension === 'pdf');
    
    console.log(`🔍 File type detection for "${file.name}":`, {
      fileName: file.name,
      mimeType: file.type,
      fileExtension,
      isCSVFile,
      isPDFFile
    });
    
    if (!isCSVFile && !isPDFFile) {
      onError('Please upload a CSV or PDF file only', file.name);
      return;
    }

    setIsProcessing(true);
    setUploadedFile(file);
    setProgress(0);
    
    try {
      let result;
      
      if (isPDFFile) {
        console.log('📄 Routing to PDF processor...');
        if (!pdfProcessor) {
          throw new Error('PDF processing is not available in this environment');
        }
        
        setProcessingStep('Extracting text from PDF...');
        const pdfResult = await pdfProcessor.convertPDFToCSV(file);
        
        if (!pdfResult.success) {
          throw new Error(pdfResult.error || 'Failed to process PDF');
        }
        
        setProcessingStep('Converting PDF to CSV format...');
        // Create a CSV file from the extracted text
        const csvBlob = new Blob([pdfResult.csvText], { type: 'text/csv' });
        const csvFile = new (window as any).File([csvBlob], file.name.replace('.pdf', '.csv'), { type: 'text/csv' });
        
        setProcessingStep('Processing transactions...');
        if (typeof csvProcessor.parseAndCategorizeCSV === 'function' && csvProcessor.parseAndCategorizeCSV.length > 1) {
          result = await csvProcessor.parseAndCategorizeCSV(csvFile, setProgress, aiModeEnabled);
        } else {
          result = await csvProcessor.parseAndCategorizeCSV(csvFile, undefined, aiModeEnabled);
        }
      } else if (isCSVFile) {
        console.log('📊 Routing to CSV processor...');
        setProcessingStep('Processing CSV file...');
        if (typeof csvProcessor.parseAndCategorizeCSV === 'function' && csvProcessor.parseAndCategorizeCSV.length > 1) {
          result = await csvProcessor.parseAndCategorizeCSV(file, setProgress, aiModeEnabled);
        } else {
          result = await csvProcessor.parseAndCategorizeCSV(file, undefined, aiModeEnabled);
        }
      } else {
        throw new Error('Unable to determine file type for processing');
      }
      
      // Map transactions for reports
      if (!result.transactions || result.transactions.length === 0) {
        onError('No transactions found in file. Please check your headers and data.', file.name);
        return;
      }
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
      // Ensure correct type for bankFormat
      const processedResult = { ...result, bankFormat: result.bankFormat as BankFormat | 'Unknown' };
      onFileProcessed(processedResult);
    } catch (error) {
      console.error('File processing error:', error);
      onError(error instanceof Error ? error.message : 'Failed to process file', file.name);
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
      setProgress(0);
    }
  }, [onFileProcessed, onError, csvProcessor, pdfProcessor, setFinancialData, setIsSample]);

  // Multi-file processing logic
  const processMultipleFiles = useCallback(async (files: File[]) => {
    if (files.length === 1) {
      // Single file - use the regular processFile function
      await processFile(files[0]);
    } else {
      // Multiple files - combine all transactions
      setIsProcessing(true);
      setUploadedFile(null);
      setProgress(0);
      
      // Arrays to accumulate results from all files
      const allTransactions: Transaction[] = [];
      const allValidations: ValidationResult[] = [];
      const allBankFormats: (BankFormat | 'Unknown')[] = [];
      const allStats: any[] = [];
      const processedFiles: string[] = [];
      
      let currentFileIndex = 0;
      const totalFiles = files.length;
      
      try {
        for (const file of files) {
          currentFileIndex++;
          const fileExtension = file.name.toLowerCase().split('.').pop();
          
          // Enhanced file type detection
          const isCSVFile = (file.type === 'text/csv' || file.name.endsWith('.csv') || fileExtension === 'csv');
          const isPDFFile = (file.type === 'application/pdf' || file.name.endsWith('.pdf') || fileExtension === 'pdf');
          
          if (!isCSVFile && !isPDFFile) {
            console.warn(`⚠️ Skipping unsupported file: ${file.name}`);
            continue;
          }
          
          setProcessingStep(`Processing file ${currentFileIndex} of ${totalFiles}: ${file.name}`);
          const fileProgress = ((currentFileIndex - 1) / totalFiles) * 100;
          setProgress(fileProgress);
          
          console.log(`🔄 Processing file ${currentFileIndex}/${totalFiles}: ${file.name}`);
          
          try {
            let result;
            
            if (isPDFFile) {
              console.log(`📄 Processing PDF: ${file.name}`);
              if (!pdfProcessor) {
                throw new Error('PDF processing is not available in this environment');
              }
              
              const pdfResult = await pdfProcessor.convertPDFToCSV(file);
              
              if (!pdfResult.success) {
                console.error(`❌ PDF processing failed for ${file.name}:`, pdfResult.error);
                continue; // Skip this file but continue with others
              }
              
              // Create a CSV file from the extracted text
              const csvBlob = new Blob([pdfResult.csvText], { type: 'text/csv' });
              const csvFile = new (window as any).File([csvBlob], file.name.replace('.pdf', '.csv'), { type: 'text/csv' });
              
              if (typeof csvProcessor.parseAndCategorizeCSV === 'function' && csvProcessor.parseAndCategorizeCSV.length > 1) {
                result = await csvProcessor.parseAndCategorizeCSV(csvFile, (progress) => {
                  const overallProgress = fileProgress + (progress / totalFiles);
                  setProgress(overallProgress);
                }, aiModeEnabled);
              } else {
                result = await csvProcessor.parseAndCategorizeCSV(csvFile, undefined, aiModeEnabled);
              }
            } else if (isCSVFile) {
              console.log(`📊 Processing CSV: ${file.name}`);
              if (typeof csvProcessor.parseAndCategorizeCSV === 'function' && csvProcessor.parseAndCategorizeCSV.length > 1) {
                result = await csvProcessor.parseAndCategorizeCSV(file, (progress) => {
                  const overallProgress = fileProgress + (progress / totalFiles);
                  setProgress(overallProgress);
                }, aiModeEnabled);
              } else {
                result = await csvProcessor.parseAndCategorizeCSV(file, undefined, aiModeEnabled);
              }
            }
            
            if (result && result.transactions && result.transactions.length > 0) {
              // Add file source information to each transaction
              const transactionsWithSource = result.transactions.map((tx: Transaction) => ({
                ...tx,
                id: `${file.name}-${tx.id}`, // Ensure unique IDs across files
                source: file.name, // Add source file info
                originalId: tx.id // Keep original ID for reference
              }));
              
              allTransactions.push(...transactionsWithSource);
              allValidations.push(result.validation);
                             allBankFormats.push(result.bankFormat as BankFormat | 'Unknown');
              allStats.push(result.stats);
              processedFiles.push(file.name);
              
              console.log(`✅ Successfully processed ${file.name}: ${result.transactions.length} transactions`);
            } else {
              console.warn(`⚠️ No transactions found in ${file.name}`);
            }
            
          } catch (fileError) {
            console.error(`❌ Error processing file ${file.name}:`, fileError);
            // Continue processing other files even if one fails
          }
        }
        
        setProgress(100);
        
        if (allTransactions.length === 0) {
          onError('No transactions found in any of the uploaded files. Please check your files and try again.');
          return;
        }
        
                 // Combine all results into a single result object
         const combinedValidation: ValidationResult = {
           isValid: allValidations.every(v => v.isValid),
           errors: allValidations.flatMap(v => v.errors),
           warnings: allValidations.flatMap(v => v.warnings)
         };
        
        // Determine the most common bank format
        const bankFormatCounts = allBankFormats.reduce((acc, format) => {
          acc[format] = (acc[format] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
                 
         const mostCommonBankFormat = (Object.entries(bankFormatCounts)
           .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown') as BankFormat | 'Unknown';
        
        // Combine stats
        const combinedStats = {
          totalFiles: processedFiles.length,
          totalTransactions: allTransactions.length,
          fileBreakdown: allStats.map((stat, index) => ({
            fileName: processedFiles[index],
            transactions: stat.total || stat.totalTransactions || 0,
            ...stat
          })),
          dateRange: {
            start: allTransactions.reduce((earliest, tx) => {
              const txDate = new Date(tx.date);
              return txDate < earliest ? txDate : earliest;
            }, new Date(allTransactions[0]?.date || new Date())),
            end: allTransactions.reduce((latest, tx) => {
              const txDate = new Date(tx.date);
              return txDate > latest ? txDate : latest;
            }, new Date(allTransactions[0]?.date || new Date()))
          }
        };
        
        // Map transactions for reports
        const reportTransactions = allTransactions.map(mapToReportTransaction);
        
        // Set context for reports
        const startDate = combinedStats.dateRange.start;
        const endDate = combinedStats.dateRange.end;
        const companyName = `Combined Files (${processedFiles.length} files)`;
        
        setFinancialData({
          transactions: reportTransactions,
          startDate,
          endDate,
          companyName,
          reportDate: new Date(),
        });
        setIsSample(false);
        
        // Call the callback with combined results
        const combinedResult = {
          transactions: allTransactions,
          validation: combinedValidation,
          bankFormat: mostCommonBankFormat,
          stats: combinedStats
        };
        
        console.log(`🎉 Successfully processed ${processedFiles.length} files with ${allTransactions.length} total transactions`);
        
        onFileProcessed(combinedResult);
        
      } catch (error) {
        console.error('Multi-file processing error:', error);
        onError(`Failed to process multiple files: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsProcessing(false);
        setProcessingStep('');
        setProgress(0);
      }
    }
  }, [processFile, csvProcessor, pdfProcessor, setFinancialData, setIsSample, onFileProcessed, onError, mapToReportTransaction, aiModeEnabled]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      processMultipleFiles(Array.from(files));
    }
    // Reset the input value to allow re-uploading the same file
    event.target.value = '';
  }, [processMultipleFiles]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      processMultipleFiles(Array.from(files));
    }
  }, [processMultipleFiles]);

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
      {/* Progress Bar */}
      {isProcessing && progress > 0 && progress < 100 && (
        <div className="mb-4">
          <ProgressBar progress={progress} />
        </div>
      )}
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
          accept=".csv,.pdf"
          multiple
          onChange={handleFileSelect}
          disabled={disabled || isProcessing}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        
        <div className="space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            {isProcessing ? (
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center">
                <CommonIcons.uploadProcessing.icon className={CommonIcons.uploadProcessing.className} />
              </div>
            ) : uploadedFile ? (
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
                <CommonIcons.uploadSuccess.icon className={CommonIcons.uploadSuccess.className} />
              </div>
            ) : (
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center group-hover:bg-purple-200 transition-colors duration-300">
                <CommonIcons.uploadIdle.icon className={CommonIcons.uploadIdle.className} />
              </div>
            )}
          </div>

          {/* Text */}
          <div className="space-y-3">
            {isProcessing ? (
              <>
                <p className="text-xl font-semibold text-slate-900">
                  {processingStep || 'Processing your bank statement...'}
                </p>
                <p className="text-slate-600 leading-relaxed">
                  Analyzing transactions and applying intelligent categorization
                </p>
              </>
            ) : uploadedFile ? (
              <>
                <p className="text-xl font-semibold text-slate-900">
                  ✅ File processed successfully
                </p>
                <p className="text-slate-600 leading-relaxed">
                  {uploadedFile.name} • {(uploadedFile.size / 1024).toFixed(1)} KB
                </p>
              </>
            ) : (
              <>
                <p className="text-xl font-semibold text-slate-900">
                  Drop your bank statements here
                </p>
                <p className="text-slate-600 leading-relaxed">
                  Or click to browse and select your CSV or PDF files
                </p>
                <p className="text-sm text-purple-600 font-medium">
                  ✨ Multiple files supported - combine all your statements into one table
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
                            <AppIcons.files.file className="w-6 h-6 text-slate-600" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900">
            Supported File Formats
          </h3>
        </div>
        
        {/* File Format Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                <AppIcons.files.file className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">CSV Files</h4>
                <p className="text-sm text-slate-500">Comma-separated values</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Direct export from your bank&apos;s online banking system. Most Canadian banks support CSV export.
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                <AppIcons.files.document className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">PDF Files</h4>
                <p className="text-sm text-slate-500">Bank statement PDFs</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Upload your bank statement PDF directly. Our AI will extract and process the transaction data.
            </p>
          </div>
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
                              <AppIcons.status.info className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">File Requirements</h4>
              <ul className="text-sm text-slate-600 space-y-2 leading-relaxed">
                <li>• CSV or PDF format with standard bank headers (Date, Description, Amount)</li>
                <li>• File size should be under 10MB for optimal performance</li>
                <li>• Transactions should include complete date and description information</li>
                <li>• Multiple date formats supported (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)</li>
                <li>• PDF files will be automatically converted to CSV format for processing</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 