'use client';
import React, { useState, useEffect, useRef } from 'react';
import NavigationBar from '../components/NavigationBar';
import { Transaction, ValidationResult, BankFormat } from '../lib/types';
import { DuplicateDetectionResult } from '../lib/duplicateDetector';
import { AIEngine } from '../lib/aiEngine';
import FileUpload from '../components/FileUpload';
import ProcessingResults from '../components/ProcessingResults';
import TransactionTable from '../components/TransactionTable';
import ExportManager from '../components/ExportManager';
import FileFormatError from '../components/FileFormatError';
import CustomKeywordManager from '../components/CustomKeywordManager';
import { useAuth } from '../context/AuthContext';
import { useFinancialData } from '../context/FinancialDataContext';
import { CommonIcons } from '../lib/iconSystem';
import { PROVINCES } from '../data/provinces';
import Preloader from '../components/Preloader';

interface ProcessingResultsData {
  validation: ValidationResult;
  bankFormat: BankFormat | 'Unknown';
  stats: any;
}

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const { financialData, setDashboardData } = useFinancialData();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [processingResults, setProcessingResults] = useState<ProcessingResultsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorFileName, setErrorFileName] = useState<string | undefined>(undefined);
  const [currentStep, setCurrentStep] = useState<'upload' | 'review' | 'export'>('upload');
  const [selectedProvince, setSelectedProvince] = useState('ON');
  const [showKeywordManager, setShowKeywordManager] = useState(false);


  // AI Engine instance for feedback training (client-side only)
  const aiEngineRef = useRef<AIEngine | null>(null);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      aiEngineRef.current = new AIEngine(selectedProvince, user?.id);
      (window as any).aiEngine = aiEngineRef.current;
    }
  }, [user?.id, selectedProvince]);

  // Enhanced state restoration - restore only once when dashboard data becomes available
  const [hasRestoredState, setHasRestoredState] = useState(false);
  
  useEffect(() => {
    if (financialData?.dashboard && !hasRestoredState && transactions.length === 0) {
      const { transactions: savedTrans, processingResults: savedResults, selectedProvince: savedProvince, currentStep: savedStep } = financialData.dashboard;
      
      // Restore transactions if they exist
      if (savedTrans && savedTrans.length > 0) {
        setTransactions(savedTrans);
        console.log(`✅ Restored ${savedTrans.length} transactions from localStorage`);
        
        // Restore processing results if they exist
        if (savedResults) {
          setProcessingResults({
            ...savedResults,
            bankFormat: savedResults.bankFormat as BankFormat | 'Unknown'
          });
          console.log('✅ Restored processing results from localStorage');
        }
        
        // Restore province if it was saved
        if (savedProvince && savedProvince !== selectedProvince) {
          setSelectedProvince(savedProvince);
          console.log(`✅ Restored province selection: ${savedProvince}`);
        }
        
        // Set appropriate step based on what data we have
        if (savedStep) {
          setCurrentStep(savedStep);
          console.log(`✅ Restored to step: ${savedStep}`);
        } else {
          setCurrentStep('review');
          console.log('✅ Restored to review step');
        }
        
        setHasRestoredState(true);
      }
    }
  }, [financialData?.dashboard, hasRestoredState, transactions.length, selectedProvince]);

  // Update dashboard data when state changes (but avoid infinite loops)
  useEffect(() => {
    if (transactions.length > 0 && hasRestoredState) {
      setDashboardData({
        transactions,
        processingResults: processingResults || undefined,
        currentStep,
        selectedProvince
      });
    }
  }, [transactions, processingResults, currentStep, selectedProvince, setDashboardData, hasRestoredState]);

  const handleFileProcessed = (data: {
    transactions: Transaction[];
    validation: ValidationResult;
    bankFormat: BankFormat | 'Unknown';
    duplicateResult?: DuplicateDetectionResult;
    stats: any;
  }) => {
    setTransactions(data.transactions);
    setProcessingResults({
      validation: data.validation,
      bankFormat: data.bankFormat as BankFormat | 'Unknown',
      stats: data.stats
    });
    
    setError(null);
    setErrorFileName(undefined);
    
    // Stay on upload step - let user manually proceed
  };

  const handleError = (errorMessage: string, fileName?: string) => {
    setError(errorMessage);
    setErrorFileName(fileName);
    setTransactions([]);
    setProcessingResults(null);
    setCurrentStep('upload');
  };

  const handleTransactionUpdate = (id: string, updates: Partial<Transaction>) => {
    console.log('🔄 handleTransactionUpdate called:', {
      transactionId: id,
      updates: updates,
      currentTransactionCount: transactions.length
    });
    
    setTransactions(prev => {
      const transactionBefore = prev.find(t => t.id === id);
      console.log('📋 Transaction before update:', {
        transactionId: id,
        accountCodeBefore: transactionBefore?.accountCode,
        confidenceBefore: transactionBefore?.confidence,
        description: transactionBefore?.description
      });
      
      const newTransactions = prev.map(t => 
        t.id === id ? { ...t, ...updates } : t
      );
      
      const transactionAfter = newTransactions.find(t => t.id === id);
      console.log('📋 Transaction after update:', {
        transactionId: id,
        accountCodeAfter: transactionAfter?.accountCode,
        confidenceAfter: transactionAfter?.confidence,
        updates: updates,
        success: transactionAfter?.accountCode === updates.accountCode
      });
      
      return newTransactions;
    });
  };

  const proceedToExport = () => {
    setCurrentStep('export');
  };

  const handleNewFile = () => {
    // Clear all data and go back to upload step
    setTransactions([]);
    setProcessingResults(null);
    setError(null);
    setErrorFileName(undefined);
    setCurrentStep('upload');
    
    // Clear from global context as well
    setDashboardData({
      transactions: [],
      selectedProvince
    });
  };

  // Initialize client-side state (removed conditional to fix hydration)
  // useEffect(() => {
  //   if (isClient) {
  //     setCurrentStep('upload');
  //   }
  // }, [isClient]);

  const handleDownloadTemplate = () => {
    // Create and download a sample CSV template
    const template = `Date,Description,Amount
2024-01-15,Grocery Store Purchase,-125.50
2024-01-16,Salary Deposit,2500.00
2024-01-17,Gas Station,-45.75
2024-01-18,Online Shopping,-89.99`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meridian-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleRetry = () => {
    setError(null);
    setErrorFileName(undefined);
  };



  // Show preloader with login overlay if not authenticated
  if (!loading && !user) {
    return <Preloader />;
  }

  // Only render title on client to prevent hydration mismatch


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Professional Navigation Bar */}
      <NavigationBar 
        activeSection="dashboard" 
        showNewFileButton={currentStep !== 'upload'}
        onNewFile={handleNewFile}
      />



      {/* Enhanced Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Enhanced Progress Indicator */}
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 leading-tight" style={{ fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, sans-serif' }}>
              Meridian AI Bookkeeping
            </h1>
            <p className="text-slate-600 text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed" style={{ fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, sans-serif' }}>
              Intelligent transaction categorization for Canadian businesses
            </p>
          </div>
          
          {/* Centered Progress Bar Container */}
          <div className="flex justify-center items-center w-full">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl shadow-slate-500/10 border border-slate-200/50">
              <div className="flex items-center space-x-12">
                {[
                  { id: 'upload', label: 'Upload', icon: CommonIcons.stepUpload, desc: 'CSV file upload' },
                  { id: 'review', label: 'Review & Code', icon: CommonIcons.stepReview, desc: 'Categorize & verify' },
                  { id: 'export', label: 'Export', icon: CommonIcons.stepExport, desc: 'Download results' }
                ].map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <div className={`flex items-center space-x-4 ${
                      currentStep === step.id ? 'text-purple-700' : 
                      index < ['upload', 'review', 'export'].indexOf(currentStep) ? 'text-slate-600' : 
                      'text-slate-400'
                    }`}>
                      <div className={`relative w-16 h-16 rounded-3xl flex items-center justify-center text-xl font-medium transition-all duration-500 ${
                        currentStep === step.id ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-2xl shadow-purple-500/30 scale-110' : 
                        index < ['upload', 'review', 'export'].indexOf(currentStep) ? 'bg-purple-50 text-purple-600 border-2 border-purple-200 shadow-lg' : 
                        'bg-slate-50 text-slate-400 border-2 border-slate-200 shadow-md'
                      }`}>
                        <step.icon.icon className={step.icon.className} />
                        {currentStep === step.id && (
                          <div className="absolute -inset-2 bg-gradient-to-br from-purple-600 to-purple-700 rounded-3xl blur-lg opacity-20 animate-pulse"></div>
                        )}
                      </div>
                      <div className="hidden sm:block text-center">
                        <div className="font-bold text-base">{step.label}</div>
                        <div className="text-sm text-slate-500 mt-1">{step.desc}</div>
                      </div>
                    </div>
                    {index < 2 && (
                      <div className={`w-24 h-1 mx-8 rounded-full transition-all duration-500 ${
                        index < ['upload', 'review', 'export'].indexOf(currentStep) ? 'bg-gradient-to-r from-purple-500 to-purple-600 shadow-lg shadow-purple-500/30' : 'bg-slate-200'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <FileFormatError
              error={error}
              fileName={errorFileName}
              onRetry={handleRetry}
              onDownloadTemplate={handleDownloadTemplate}
            />
          )}

          {/* Upload Step */}
          {currentStep === 'upload' && !error && (
            <>
              <div className="bg-white rounded-2xl p-12">
                <div className="flex items-center justify-center mb-10">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-lg">1</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, sans-serif' }}>
                      Upload Bank Statement
                    </h2>
                  </div>
                </div>

                {/* Show simple success message and processing results above supported formats section */}
                {transactions.length > 0 && (
                  <div className="space-y-6 mb-8">
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                            <span className="text-green-600 text-lg">✓</span>
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-green-900">
                              File Processed Successfully
                            </h3>
                            <p className="text-sm text-green-700">
                              {transactions.length} transactions ready for review
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setCurrentStep('review')}
                          className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 font-medium text-sm"
                        >
                          Review Transactions →
                        </button>
                      </div>
                    </div>

                    {/* Processing Results - Show right after upload for easier access */}
                    {processingResults && (
                      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-center space-x-4 mb-6">
                          <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center">
                            <span className="text-purple-600 text-sm font-semibold">📊</span>
                          </div>
                          <h3 className="text-xl font-semibold text-slate-900">
                            Processing Results
                          </h3>
                        </div>
                        <ProcessingResults {...processingResults} transactions={transactions} />
                      </div>
                    )}

                    {/* Quick Processing Summary - Always show when transactions exist */}
                    {!processingResults && (
                      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <span className="text-blue-600 text-lg">📊</span>
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-blue-900">
                              File Analysis Complete
                            </h3>
                            <p className="text-sm text-blue-700">
                              {transactions.length} transactions loaded • Ready for categorization
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <FileUpload 
                  onFileProcessed={handleFileProcessed} 
                  onError={handleError} 
                  disabled={false}
                  aiModeEnabled={false}
                />
              </div>
            </>
          )}

          {/* Step 2: Processing Results */}
          {currentStep === 'review' && processingResults && transactions.length > 0 && (
            <>
              <div className="bg-white rounded-2xl p-12">
                <div className="flex items-center justify-center space-x-4 mb-10">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">2</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, sans-serif' }}>
                    Processing Results
                  </h2>
                </div>
                <ProcessingResults {...processingResults} transactions={transactions} />
              </div>



              {/* Transaction Review */}
              <div className="bg-white rounded-2xl p-12">
                <div className="flex items-center justify-center mb-10">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-lg">3</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, sans-serif' }}>
                      Review & Code Transactions
                    </h2>
                  </div>
                </div>
                <div className="flex items-center justify-center mb-8">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setShowKeywordManager(true)}
                      className="px-6 py-3 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition-all duration-200 font-medium border border-purple-200"
                    >
                      🎯 Custom Keywords
                    </button>
                    <button
                      onClick={handleNewFile}
                      className="px-6 py-3 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition-all duration-200 font-medium border border-red-200"
                    >
                      Start Over
                    </button>
                    <button
                      onClick={proceedToExport}
                      className="px-8 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all duration-200 font-medium"
                    >
                      Proceed to Export
                    </button>
                  </div>
                </div>
                {/* Province Selector */}
                <div className="mb-8 flex items-center justify-center space-x-4">
                  <label className="text-sm font-semibold text-gray-700">Province:</label>
                  <select
                    value={selectedProvince}
                    onChange={e => setSelectedProvince(e.target.value)}
                    className="px-4 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-black transition-all duration-300 hover:border-purple-300"
                  >
                    {PROVINCES.map(prov => (
                      <option key={prov.code} value={prov.code}>{prov.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-center">
                  <div className="w-full max-w-none">
                    <TransactionTable 
                      transactions={transactions}
                      onTransactionUpdate={handleTransactionUpdate}
                      aiEngine={aiEngineRef.current}
                      province={selectedProvince}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Export Step */}
          {currentStep === 'export' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">4</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, sans-serif' }}>
                    Export for Accounting
                  </h2>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleNewFile}
                    className="px-6 py-3 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition-all duration-200 font-medium border border-red-200"
                  >
                    Start Over
                  </button>
                  <button
                    onClick={() => setCurrentStep('review')}
                    className="px-8 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all duration-200 font-medium"
                  >
                    ← Back to Review
                  </button>
                </div>
              </div>
              <ExportManager 
                transactions={transactions} 
                province={selectedProvince} 
                onTransactionsUpdate={setTransactions}
              />
            </div>
          )}
        </div>

        {/* Move Processing Results Information Above Q&A Section */}
        {currentStep === 'review' && processingResults && (
          <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
            <div className="bg-white rounded-3xl p-8 border border-slate-200/60 shadow-xl shadow-slate-500/5">
              <div className="text-center mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Transaction Processing Complete
                </h2>
                <p className="text-slate-600 text-lg">
                  Your file has been successfully processed and is ready for review
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-6 border border-green-200/50">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-green-900">Format Detected</h3>
                  </div>
                  <p className="text-green-800 font-medium">
                    {processingResults.bankFormat === 'Unknown' ? 'Standard CSV' : processingResults.bankFormat}
                  </p>
                  <p className="text-green-700 text-sm mt-1">
                    File format automatically recognized
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-6 border border-blue-200/50">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-blue-900">AI Analysis</h3>
                  </div>
                  <p className="text-blue-800 font-medium">
                    {transactions.length} transactions
                  </p>
                  <p className="text-blue-700 text-sm mt-1">
                    {processingResults?.stats?.totalFiles && processingResults.stats.totalFiles > 1 
                      ? `From ${processingResults.stats.totalFiles} files - Ready for categorization`
                      : 'Ready for categorization'
                    }
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-6 border border-purple-200/50">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-purple-900">Next Steps</h3>
                  </div>
                  <p className="text-purple-800 font-medium">
                    Review & Code
                  </p>
                  <p className="text-purple-700 text-sm mt-1">
                    Verify AI categorization
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Keyword Manager Modal */}
      {showKeywordManager && (
        <CustomKeywordManager
          onClose={() => setShowKeywordManager(false)}
          onKeywordsUpdated={() => {
            // Optionally refresh transactions or show a notification
            console.log('Custom keywords updated');
          }}
        />
      )}
    </div>
  );
} 
