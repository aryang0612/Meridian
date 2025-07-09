'use client';
import { useState, useRef, useEffect } from 'react';
import { Transaction, ValidationResult } from '../lib/types';
import { BankFormat } from '../data/bankFormats';
import { DuplicateDetectionResult } from '../lib/duplicateDetector';
import { AIEngine } from '../lib/aiEngine';
import FileUpload from '../components/FileUpload';
import ProcessingResults from '../components/ProcessingResults';
import TransactionTable from '../components/TransactionTable';
import ExportManager from '../components/ExportManager';
import DuplicateWarning from '../components/DuplicateWarning';
import NavigationBar from '../components/NavigationBar';
import FileFormatError from '../components/FileFormatError';
import CustomKeywordManager from '../components/CustomKeywordManager';
import Image from 'next/image';
import { PROVINCES } from '../data/provinces';
import { useFinancialData } from '../context/FinancialDataContext';
import { useAuth } from '../context/AuthContext';
import { CommonIcons } from '../lib/iconSystem';

export default function Dashboard() {
  const { financialData, setDashboardData } = useFinancialData();
  const { user, loading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [processingResults, setProcessingResults] = useState<{
    validation: ValidationResult;
    bankFormat: BankFormat | 'Unknown';
    stats: any;
  } | null>(null);
  const [duplicateResult, setDuplicateResult] = useState<DuplicateDetectionResult | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorFileName, setErrorFileName] = useState<string | undefined>(undefined);
  const [currentStep, setCurrentStep] = useState<'upload' | 'review' | 'export'>('upload');
  const [selectedProvince, setSelectedProvince] = useState('ON');
  const [showKeywordManager, setShowKeywordManager] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // AI Engine instance for feedback training (client-side only)
  const aiEngineRef = useRef<AIEngine | null>(null);
  
  // Initialize client-side rendering
  useEffect(() => {
    setIsClient(true);
  }, []);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      aiEngineRef.current = new AIEngine('ON', user?.id);
      (window as any).aiEngine = aiEngineRef.current;
    }
  }, [user?.id]);

  // Simplified context sync - only restore on mount
  useEffect(() => {
    if (financialData?.dashboard && !transactions.length) {
      const { transactions: savedTrans, processingResults: savedResults } = financialData.dashboard;
      if (savedTrans.length > 0) {
        setTransactions(savedTrans);
        if (savedResults) setProcessingResults(savedResults);
      }
    }
  }, [financialData]);

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
      bankFormat: data.bankFormat,
      stats: data.stats
    });
    
    // Handle duplicate detection results
    if (data.duplicateResult) {
      setDuplicateResult(data.duplicateResult);
      setShowDuplicateWarning(data.duplicateResult.duplicateCount > 0);
    }
    
    setError(null);
    setErrorFileName(undefined);
    
    // Stay on upload step - let user manually proceed
    // setCurrentStep('review'); // REMOVED - no auto step transition
  };

  const handleError = (errorMessage: string, fileName?: string) => {
    setError(errorMessage);
    setErrorFileName(fileName);
    setTransactions([]);
    setProcessingResults(null);
    setCurrentStep('upload');
  };

  const handleTransactionUpdate = (id: string, updates: Partial<Transaction>) => {
    setTransactions(prev => {
      const newTransactions = prev.map(t => 
        t.id === id ? { ...t, ...updates } : t
      );
      return newTransactions;
    });
  };

  const handleResolveDuplicates = (cleanTransactions: Transaction[]) => {
    setTransactions(cleanTransactions);
    setShowDuplicateWarning(false);
    setDuplicateResult(null);
  };

  const handleDismissDuplicateWarning = () => {
    setShowDuplicateWarning(false);
  };

  const proceedToExport = () => {
    setCurrentStep('export');
  };

  const handleNewFile = () => {
    // Clear all data and go back to upload step
    setTransactions([]);
    setProcessingResults(null);
    setDuplicateResult(null);
    setShowDuplicateWarning(false);
    setError(null);
    setErrorFileName(undefined);
    setCurrentStep('upload');
    
    // Clear from global context as well
    setDashboardData({
      transactions: [],
      selectedProvince
    });
  };

  // Initialize client-side state
  useEffect(() => {
    if (isClient) {
      setCurrentStep('upload');
    }
  }, [isClient]);

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



  // Redirect to login if not authenticated (only after component is mounted)
  // Temporarily disabled for testing - uncomment when Supabase is properly configured
  /*
  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-900 mb-4">Authentication Required</div>
          <div className="text-slate-600 mb-8">Please log in to access the dashboard.</div>
          <a 
            href="/login" 
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }
  */

  return (
    <div className="min-h-screen bg-white">
      {/* Professional Navigation Bar */}
      <NavigationBar 
        activeSection="dashboard" 
        showNewFileButton={isClient && currentStep !== 'upload'}
        onNewFile={handleNewFile}
      />

      {/* Enhanced Main Content Area */}
      <div className="relative max-w-screen-xl mx-auto px-2 py-20">
        <div className="space-y-20">
          {/* Enhanced Progress Indicator */}
          <div className="flex items-center justify-center">
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
                <div className="flex items-center space-x-4 mb-8">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                    <span className="text-slate-600 font-semibold">1</span>
                  </div>
                  <h2 className="text-2xl font-semibold text-slate-900">
                    Upload Bank Statement
                  </h2>
                </div>
                <FileUpload onFileProcessed={handleFileProcessed} onError={handleError} disabled={false} />
              </div>

              {/* Show duplicate warning in upload step */}
              {showDuplicateWarning && duplicateResult && (
                <div className="bg-white rounded-2xl p-12">
                  <DuplicateWarning
                    duplicateResult={duplicateResult}
                    onResolveDuplicates={handleResolveDuplicates}
                    onDismiss={handleDismissDuplicateWarning}
                  />
                </div>
              )}

              {/* Show simple success message and next step button if we have processed data */}
              {transactions.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                        <span className="text-green-600 text-xl">✓</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-green-900">
                          File Processed Successfully
                        </h3>
                        <p className="text-green-700">
                          {transactions.length} transactions ready for review
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setCurrentStep('review')}
                      className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200 font-medium"
                    >
                      Review Transactions →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step 2: Processing Results */}
          {currentStep === 'review' && processingResults && transactions.length > 0 && (
            <>
              <div className="bg-white rounded-2xl p-12">
                <div className="flex items-center space-x-4 mb-8">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                    <span className="text-slate-600 font-semibold">2</span>
                  </div>
                  <h2 className="text-2xl font-semibold text-slate-900">
                    Processing Results
                  </h2>
                </div>
                <ProcessingResults {...processingResults} transactions={transactions} />
              </div>



              {/* Transaction Review */}
              <div className="bg-white rounded-2xl p-12">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                      <span className="text-slate-600 font-semibold">3</span>
                    </div>
                    <h2 className="text-2xl font-semibold text-slate-900">
                      Review & Code Transactions
                    </h2>
                  </div>
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
                <div className="mb-8 flex items-center space-x-4">
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
                <TransactionTable 
                  transactions={transactions}
                  onTransactionUpdate={handleTransactionUpdate}
                  aiEngine={aiEngineRef.current}
                  province={selectedProvince}
                />
              </div>
            </>
          )}

          {/* Export Step */}
          {currentStep === 'export' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <span className="text-slate-600 font-semibold">4</span>
                  </div>
                  <h2 className="text-2xl font-semibold text-slate-900">
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
              <ExportManager transactions={transactions} province={selectedProvince} />
            </div>
          )}
        </div>

        {/* Q&A Section - Helpful Tips and Usage Guide */}
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-20">
          <div className="bg-white rounded-3xl p-12 border border-slate-200/60 shadow-xl shadow-slate-500/5">
            <div className="text-center mb-16">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/25">
                <span className="text-white text-2xl">💡</span>
              </div>
              <h2 className="text-4xl font-bold text-slate-900 mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-slate-600 text-lg max-w-2xl mx-auto leading-relaxed">
                Get the most out of Meridian Bookkeeping with these helpful tips and answers to common questions.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12">
              {/* Left Column */}
              <div className="space-y-8">
                <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl p-8 border border-purple-200/50">
                  <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                    <span className="w-8 h-8 bg-purple-500 rounded-xl text-white text-sm flex items-center justify-center mr-3 font-bold">Q</span>
                    What file formats are supported?
                  </h3>
                  <p className="text-slate-700 leading-relaxed mb-4">
                    <strong>CSV files only</strong> with headers in the first row. We support all major Canadian banks including:
                  </p>
                  <ul className="text-slate-700 space-y-2 ml-4">
                    <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> RBC, TD, BMO, Scotiabank</li>
                    <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> CIBC, National Bank</li>
                    <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Credit unions and online banks</li>
                  </ul>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-8 border border-blue-200/50">
                  <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                    <span className="w-8 h-8 bg-blue-500 rounded-xl text-white text-sm flex items-center justify-center mr-3 font-bold">Q</span>
                    How accurate is the AI categorization?
                  </h3>
                  <p className="text-slate-700 leading-relaxed mb-4">
                    Our AI achieves <strong>85%+ accuracy</strong> on first pass, learning from:
                  </p>
                  <ul className="text-slate-700 space-y-2 ml-4">
                    <li className="flex items-center"><span className="text-blue-500 mr-2">•</span> Merchant names and patterns</li>
                    <li className="flex items-center"><span className="text-blue-500 mr-2">•</span> Transaction descriptions</li>
                    <li className="flex items-center"><span className="text-blue-500 mr-2">•</span> Amount ranges and frequency</li>
                    <li className="flex items-center"><span className="text-blue-500 mr-2">•</span> Your feedback and corrections</li>
                  </ul>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-2xl p-8 border border-green-200/50">
                  <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                    <span className="w-8 h-8 bg-green-500 rounded-xl text-white text-sm flex items-center justify-center mr-3 font-bold">Q</span>
                    Which provinces are supported?
                  </h3>
                  <p className="text-slate-700 leading-relaxed">
                    <strong>All Canadian provinces</strong> with proper tax codes and chart of accounts for ON, BC, AB, and more. 
                    Each province has specific tax categories and compliance requirements built-in.
                  </p>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-8">
                <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-2xl p-8 border border-amber-200/50">
                  <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                    <span className="w-8 h-8 bg-amber-500 rounded-xl text-white text-sm flex items-center justify-center mr-3 font-bold">💡</span>
                    Pro Tips for Best Results
                  </h3>
                  <ul className="text-slate-700 space-y-3">
                    <li className="flex items-start">
                      <span className="text-amber-500 mr-3 mt-1 font-bold">1.</span>
                      <div>
                        <strong>Clean your CSV:</strong> Remove any summary rows or extra headers before uploading
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-amber-500 mr-3 mt-1 font-bold">2.</span>
                      <div>
                        <strong>Review AI suggestions:</strong> Check and correct categories to improve future accuracy
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-amber-500 mr-3 mt-1 font-bold">3.</span>
                      <div>
                        <strong>Use bulk actions:</strong> Select similar transactions and categorize them all at once
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-amber-500 mr-3 mt-1 font-bold">4.</span>
                      <div>
                        <strong>Export regularly:</strong> Process statements monthly for best cash flow tracking
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-2xl p-8 border border-red-200/50">
                  <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                    <span className="w-8 h-8 bg-red-500 rounded-xl text-white text-sm flex items-center justify-center mr-3 font-bold">Q</span>
                    What if I encounter errors?
                  </h3>
                  <p className="text-slate-700 leading-relaxed mb-4">
                    Common issues and solutions:
                  </p>
                  <ul className="text-slate-700 space-y-2 ml-4">
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2 mt-1">•</span>
                      <div><strong>File format error:</strong> Ensure your file is saved as .csv, not .xlsx</div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2 mt-1">•</span>
                      <div><strong>Missing columns:</strong> Check that Date, Description, and Amount columns exist</div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2 mt-1">•</span>
                      <div><strong>Date format issues:</strong> We support DD/MM/YYYY, MM/DD/YYYY, and YYYY-MM-DD</div>
                    </li>
                  </ul>
                </div>

                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-2xl p-8 border border-indigo-200/50">
                  <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                    <span className="w-8 h-8 bg-indigo-500 rounded-xl text-white text-sm flex items-center justify-center mr-3 font-bold">Q</span>
                    Export formats available?
                  </h3>
                  <p className="text-slate-700 leading-relaxed mb-3">
                    Multiple formats for seamless integration:
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg p-3 border border-indigo-200/50">
                      <div className="font-semibold text-indigo-600">Xero CSV</div>
                      <div className="text-sm text-slate-600">Direct import ready</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-indigo-200/50">
                      <div className="font-semibold text-indigo-600">QuickBooks</div>
                      <div className="text-sm text-slate-600">IIF format</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-indigo-200/50">
                      <div className="font-semibold text-indigo-600">Sage 50</div>
                      <div className="text-sm text-slate-600">Compatible CSV</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-indigo-200/50">
                      <div className="font-semibold text-indigo-600">Generic CSV</div>
                      <div className="text-sm text-slate-600">Universal format</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="mt-16 text-center">
              <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-8 border border-slate-200/50">
                <h3 className="text-2xl font-bold text-slate-900 mb-4">
                  Ready to streamline your bookkeeping?
                </h3>
                <p className="text-slate-600 mb-6 max-w-2xl mx-auto leading-relaxed">
                  Upload your first bank statement and experience the power of AI-driven categorization 
                  with full Canadian tax compliance.
                </p>
                <button
                  onClick={() => {
                    setCurrentStep('upload');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-300 font-semibold shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transform hover:scale-[1.02]"
                >
                  Get Started Now →
                </button>
              </div>
            </div>
          </div>
        </div>
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
