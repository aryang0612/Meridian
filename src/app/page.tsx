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
import Image from 'next/image';
import { PROVINCES } from '../data/provinces';
import { useFinancialData } from '../context/FinancialDataContext';

export default function Dashboard() {
  const { financialData, setDashboardData } = useFinancialData();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [processingResults, setProcessingResults] = useState<{
    validation: ValidationResult;
    bankFormat: BankFormat | 'Unknown';
    stats: any;
  } | null>(null);
  const [duplicateResult, setDuplicateResult] = useState<DuplicateDetectionResult | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'upload' | 'review' | 'export'>('upload');
  const [selectedProvince, setSelectedProvince] = useState('ON');

  // AI Engine instance for feedback training (safe addition)
  const aiEngineRef = useRef<AIEngine | null>(null);
  if (!aiEngineRef.current) {
    aiEngineRef.current = new AIEngine('ON');
  }

  // Sync with global context for persistence (only on mount or when financialData changes externally)
  useEffect(() => {
    if (financialData?.dashboard && !transactions.length) {
      const dashboard = financialData.dashboard;
      setTransactions(dashboard.transactions);
      if (dashboard.processingResults) {
        setProcessingResults(dashboard.processingResults);
      }
      if (dashboard.currentStep) {
        setCurrentStep(dashboard.currentStep);
      }
      if (dashboard.duplicateResult) {
        setDuplicateResult(dashboard.duplicateResult);
        setShowDuplicateWarning(dashboard.duplicateResult.duplicateCount > 0);
      }
    }
  }, [financialData, transactions.length]);

  // Save to global context whenever local state changes (debounced to prevent loops)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (transactions.length > 0 || processingResults) {
        setDashboardData({
          transactions,
          processingResults: processingResults || undefined,
          currentStep,
          duplicateResult: duplicateResult || undefined,
          selectedProvince
        });
      }
    }, 100); // Small delay to prevent rapid updates

    return () => clearTimeout(timeoutId);
  }, [transactions, processingResults, currentStep, duplicateResult, selectedProvince, setDashboardData]);

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
    setCurrentStep('review');
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setTransactions([]);
    setProcessingResults(null);
    setCurrentStep('upload');
  };

  const handleTransactionUpdate = (id: string, updates: Partial<Transaction>) => {
    setTransactions(prev => prev.map(t => 
      t.id === id ? { ...t, ...updates } : t
    ));
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
    setCurrentStep('upload');
    
    // Clear from global context as well
    setDashboardData({
      transactions: [],
      selectedProvince
    });
  };

  return (
    <div className="min-h-screen">
      {/* Professional Navigation Bar */}
      <NavigationBar 
        activeSection="dashboard" 
        showNewFileButton={currentStep !== 'upload'}
        onNewFile={handleNewFile}
      />

      {/* Enhanced Main Content Area */}
      <div className="relative min-h-screen bg-white">
        <div className="relative max-w-6xl mx-auto px-6 lg:px-8 py-20">
          <div className="space-y-20">
            {/* Enhanced Progress Indicator */}
            <div className="flex items-center justify-center">
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl shadow-slate-500/10 border border-slate-200/50">
                <div className="flex items-center space-x-12">
        {[
                    { id: 'upload', label: 'Upload', icon: '📤', desc: 'CSV file upload' },
                    { id: 'review', label: 'Review & Code', icon: '📊', desc: 'Categorize & verify' },
                    { id: 'export', label: 'Export', icon: '💾', desc: 'Download results' }
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
                {step.icon}
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

            {/* Modern CSV Format Guide */}
            {currentStep === 'upload' && (
              <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-xl shadow-slate-500/5">
                <div className="flex items-center space-x-4 mb-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                    <span className="text-white text-xl">📋</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">Supported CSV Formats</h3>
                    <p className="text-slate-600 mt-1">Compatible with all major Canadian banks</p>
                  </div>
      </div>
                
                <div className="grid md:grid-cols-2 gap-8 mb-8">
                  <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 shadow-lg shadow-slate-500/5">
                    <h4 className="font-bold text-slate-900 mb-6 flex items-center">
                      <span className="w-8 h-8 bg-green-100 rounded-xl text-green-600 text-sm flex items-center justify-center mr-3 font-bold">✓</span>
                      Major Canadian Banks
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl">
                        <span className="font-semibold text-slate-800">RBC:</span>
                        <span className="text-slate-600 text-sm">Transaction Date, Description, Amount</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl">
                        <span className="font-semibold text-slate-800">TD Bank:</span>
                        <span className="text-slate-600 text-sm">Date, Description, Amount</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl">
                        <span className="font-semibold text-slate-800">Scotia:</span>
                        <span className="text-slate-600 text-sm">Date, Transaction Details, Amount</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl">
                        <span className="font-semibold text-slate-800">BMO:</span>
                        <span className="text-slate-600 text-sm">Date, Description, Amount</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 shadow-lg shadow-slate-500/5">
                    <h4 className="font-bold text-slate-900 mb-6 flex items-center">
                      <span className="w-8 h-8 bg-purple-100 rounded-xl text-purple-600 text-sm flex items-center justify-center mr-3 font-bold">📄</span>
                      Generic Format
                    </h4>
                    <div className="space-y-6">
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-6 border border-slate-200/50">
                        <div className="font-bold text-slate-800 mb-4">Required Columns:</div>
                        <div className="space-y-3 text-slate-700">
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span><strong>DATE</strong> or <strong>Date</strong></span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span><strong>Description</strong></span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span><strong>Amount</strong></span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                            <span><strong>Balance</strong> (optional)</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-slate-500 bg-slate-50/50 rounded-xl p-4">
                        <span className="font-medium">Date formats supported:</span> DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 shadow-lg shadow-slate-500/5">
                  <h4 className="font-bold text-slate-900 mb-6 flex items-center">
                    <span className="w-8 h-8 bg-amber-100 rounded-xl text-amber-600 text-sm flex items-center justify-center mr-3 font-bold">💡</span>
                    Quick Tips
                  </h4>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="flex items-start space-x-4 p-4 bg-green-50/50 rounded-xl border border-green-100/50">
                      <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center mt-0.5">
                        <span className="text-green-600 font-bold text-sm">✓</span>
                      </div>
                      <span className="text-slate-700 font-medium">CSV files only (.csv extension)</span>
                    </div>
                    <div className="flex items-start space-x-4 p-4 bg-green-50/50 rounded-xl border border-green-100/50">
                      <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center mt-0.5">
                        <span className="text-green-600 font-bold text-sm">✓</span>
                      </div>
                      <span className="text-slate-700 font-medium">Headers must be in the first row</span>
                    </div>
                    <div className="flex items-start space-x-4 p-4 bg-green-50/50 rounded-xl border border-green-100/50">
                      <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center mt-0.5">
                        <span className="text-green-600 font-bold text-sm">✓</span>
                      </div>
                      <span className="text-slate-700 font-medium">Amounts can be positive or negative</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

      {/* Step 1: File Upload */}
      {currentStep === 'upload' && (
              <div className="bg-white rounded-2xl p-12">
                <div className="flex items-center space-x-4 mb-8">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                    <span className="text-slate-600 font-semibold">1</span>
                  </div>
                  <h2 className="text-2xl font-semibold text-slate-900">
                    Upload Bank Statement
          </h2>
                </div>
          <FileUpload 
            onFileProcessed={handleFileProcessed}
            onError={handleError}
            disabled={false}
          />
        </div>
      )}

      {/* Error Display */}
      {error && (
              <div className="bg-red-50 rounded-2xl p-8">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-red-100 rounded-lg flex items-center justify-center">
                    <span className="text-red-600 text-sm">⚠</span>
                  </div>
                  <span className="text-red-900 font-medium">Processing Error</span>
          </div>
                <p className="text-red-700 mt-3 leading-relaxed">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setCurrentStep('upload');
            }}
                  className="mt-4 text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
          >
            Try uploading again
          </button>
        </div>
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

                {/* Duplicate Warning */}
                {showDuplicateWarning && duplicateResult && (
                  <DuplicateWarning
                    duplicateResult={duplicateResult}
                    onResolveDuplicates={handleResolveDuplicates}
                    onDismiss={handleDismissDuplicateWarning}
                  />
                )}

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
      </div>
    </div>
  );
} 
