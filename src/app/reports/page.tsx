'use client';

import { useState, useEffect } from 'react';
import NavigationBar from '../../components/NavigationBar';
import { ReportGenerator, FinancialData, ProfitLossData, BalanceSheetData } from '../../lib/reportGenerator';
import { ChartOfAccounts } from '../../lib/chartOfAccounts';
import { useFinancialData } from '../../context/FinancialDataContext';

// Sample transaction data - in a real app, this would come from your database
const generateSampleData = (): FinancialData => {
  const today = new Date();
  const startDate = new Date(today.getFullYear(), 0, 1); // Start of year
  const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate()); // Today

  return {
    transactions: [
      // Revenue transactions - using correct CSV account codes (as strings)
      { id: '1', date: new Date('2024-01-15'), description: 'Service Revenue', amount: 5000, category: 'Service Revenue', accountCode: '220', type: 'income' },
      { id: '2', date: new Date('2024-02-20'), description: 'Product Sales', amount: 8500, category: 'Sales Revenue', accountCode: '200', type: 'income' },
      { id: '3', date: new Date('2024-03-10'), description: 'Interest Income', amount: 3200, category: 'Interest Income', accountCode: '270', type: 'income' },
      
      // Expense transactions - using correct CSV account codes (as strings)
      { id: '4', date: new Date('2024-01-05'), description: 'Office Rent', amount: -1200, category: 'Rent', accountCode: '469', type: 'expense' },
      { id: '5', date: new Date('2024-01-10'), description: 'Internet & Phone', amount: -150, category: 'Telephone & Internet', accountCode: '489', type: 'expense' },
      { id: '6', date: new Date('2024-02-01'), description: 'Marketing Campaign', amount: -800, category: 'Advertising', accountCode: '400', type: 'expense' },
      { id: '7', date: new Date('2024-02-15'), description: 'Office Supplies', amount: -250, category: 'Supplies and Small Tools', accountCode: '455', type: 'expense' },
      
      // Asset transactions - using correct CSV account codes (as strings)
      { id: '8', date: new Date('2024-01-01'), description: 'Cash in Bank', amount: 15000, category: 'Cash', accountCode: '610', type: 'asset' },
      { id: '9', date: new Date('2024-01-20'), description: 'Accounts Receivable', amount: 4500, category: 'Accounts Receivable', accountCode: '610', type: 'asset' },
      { id: '10', date: new Date('2024-02-01'), description: 'Office Equipment', amount: 5000, category: 'Equipment', accountCode: '710', type: 'asset' },
      
      // Liability transactions - using correct CSV account codes (as strings)
      { id: '11', date: new Date('2024-01-01'), description: 'Accounts Payable', amount: -2500, category: 'Accounts Payable', accountCode: '800', type: 'liability' },
      { id: '12', date: new Date('2024-01-15'), description: 'Sales Tax Payable', amount: -1000, category: 'Sales Tax', accountCode: '820', type: 'liability' },
      
      // Equity transactions - using correct CSV account codes (as strings)
      { id: '13', date: new Date('2024-01-01'), description: 'Owner Investment', amount: 25000, category: 'Owner A Share Capital', accountCode: '970', type: 'equity' },
    ],
    startDate,
    endDate,
    companyName: 'Sample Business Ltd.',
    reportDate: today
  };
};

// Convert dashboard data to FinancialData format
const convertDashboardToFinancialData = (contextData: any): FinancialData | null => {
  // Check if we have uploaded transaction data in the dashboard
  if (!contextData?.dashboard?.transactions || contextData.dashboard.transactions.length === 0) {
    console.log('📊 No uploaded transaction data found in context');
    return null;
  }

  const transactions = contextData.dashboard.transactions;
  console.log('📊 Found uploaded transactions:', transactions.length);
  
  // Get date range from transactions
  const dates = transactions.map((t: any) => new Date(t.date)).sort((a: Date, b: Date) => a.getTime() - b.getTime());
  
  return {
    transactions: transactions.map((t: any) => ({
      id: t.id,
      date: new Date(t.date),
      description: t.description,
      amount: t.amount,
      category: t.category,
      accountCode: t.accountCode || '',
      type: t.amount >= 0 ? 'income' : 'expense' // Determine type based on amount
    })),
    startDate: dates[0] || new Date(),
    endDate: dates[dates.length - 1] || new Date(),
    companyName: contextData.companyName || 'Your Business',
    reportDate: new Date(),
    province: contextData.dashboard.selectedProvince || 'ON'
  };
};

export default function ReportsPage() {
  const { financialData: contextData, isSample, setIsSample } = useFinancialData();
  const [reportGenerator, setReportGenerator] = useState<ReportGenerator | null>(null);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [profitLossData, setProfitLossData] = useState<ProfitLossData | null>(null);
  const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheetData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('ytd'); // ytd, q4, q3, q2, q1, custom
  const [isReportGeneratorReady, setIsReportGeneratorReady] = useState(false);

  // Initialize ReportGenerator on client-side only
  useEffect(() => {
    if (typeof window !== 'undefined' && !reportGenerator) {
      const initReportGenerator = async () => {
        try {
          // Use ChartOfAccounts singleton instance
          const chartOfAccounts = ChartOfAccounts.getInstance('ON');
          await chartOfAccounts.waitForInitialization();
          
          // Create ReportGenerator with ChartOfAccounts
          const generator = new ReportGenerator(chartOfAccounts);
          
          setReportGenerator(generator);
          setIsReportGeneratorReady(true);
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ ReportGenerator initialized successfully');
          }
        } catch (error) {
          console.error('❌ Failed to initialize ReportGenerator:', error);
          // Create a fallback generator even if Chart of Accounts fails
          try {
            const fallbackChartOfAccounts = ChartOfAccounts.getInstance('ON');
            const fallbackGenerator = new ReportGenerator(fallbackChartOfAccounts);
            setReportGenerator(fallbackGenerator);
            setIsReportGeneratorReady(true);
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ Fallback ReportGenerator initialized');
            }
          } catch (fallbackError) {
            console.error('❌ Fallback ReportGenerator also failed:', fallbackError);
            setIsReportGeneratorReady(true); // Still set to true to avoid blocking
          }
        }
      };
      initReportGenerator();
    }
  }, [reportGenerator]);

  // Handle data processing and report generation
  useEffect(() => {
    let data: FinancialData;
    
    // Try to convert uploaded data first
    const uploadedData = convertDashboardToFinancialData(contextData);
    if (uploadedData) {
      data = uploadedData;
      setIsSample(false);
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Using uploaded transaction data for reports:', data.transactions.length, 'transactions');
      }
    } else {
      data = generateSampleData();
      setIsSample(true);
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Using sample data for reports demonstration');
      }
    }
    
    setFinancialData(data);
    
    // Generate report data only when ReportGenerator is ready
    if (isReportGeneratorReady && reportGenerator) {
      try {
        const plData = reportGenerator.generateProfitLossData(data);
        const bsData = reportGenerator.generateBalanceSheetData(data);
        setProfitLossData(plData);
        setBalanceSheetData(bsData);
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Reports generated successfully');
        }
      } catch (error) {
        console.error('❌ Error generating reports:', error);
        // Fallback: generate basic report data manually
        try {
          const fallbackPlData = generateFallbackProfitLossData(data);
          const fallbackBsData = generateFallbackBalanceSheetData(data);
          setProfitLossData(fallbackPlData);
          setBalanceSheetData(fallbackBsData);
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Fallback reports generated successfully');
          }
        } catch (fallbackError) {
          console.error('❌ Fallback report generation also failed:', fallbackError);
        }
      }
    }
  }, [contextData, isReportGeneratorReady, reportGenerator, setIsSample]);

  // Fallback functions for when ReportGenerator fails
  const generateFallbackProfitLossData = (data: FinancialData): ProfitLossData => {
    const revenue = data.transactions.filter(t => t.amount > 0);
    const expenses = data.transactions.filter(t => t.amount < 0);
    
    const revenueTotal = revenue.reduce((sum, t) => sum + t.amount, 0);
    const expensesTotal = Math.abs(expenses.reduce((sum, t) => sum + t.amount, 0));
    
    return {
      revenue: {
        total: revenueTotal,
        categories: revenue.map(t => ({ name: t.category, amount: t.amount, accountCode: t.accountCode }))
      },
      expenses: {
        total: expensesTotal,
        categories: expenses.map(t => ({ name: t.category, amount: Math.abs(t.amount), accountCode: t.accountCode }))
      },
      netIncome: revenueTotal - expensesTotal,
      grossProfit: revenueTotal,
      operatingIncome: revenueTotal - expensesTotal
    };
  };

  const generateFallbackBalanceSheetData = (data: FinancialData): BalanceSheetData => {
    const assets = data.transactions.filter(t => t.type === 'asset');
    const liabilities = data.transactions.filter(t => t.type === 'liability');
    const equity = data.transactions.filter(t => t.type === 'equity');
    
    const assetsTotal = assets.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const liabilitiesTotal = liabilities.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const equityTotal = equity.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    return {
      assets: {
        current: assets.filter(t => t.accountCode.match(/^6[1-9]\d$/)).map(t => ({ name: t.category, amount: Math.abs(t.amount), accountCode: t.accountCode })),
        nonCurrent: assets.filter(t => t.accountCode.match(/^7\d{2}$/)).map(t => ({ name: t.category, amount: Math.abs(t.amount), accountCode: t.accountCode })),
        totalCurrent: assets.filter(t => t.accountCode.match(/^6[1-9]\d$/)).reduce((sum, t) => sum + Math.abs(t.amount), 0),
        totalNonCurrent: assets.filter(t => t.accountCode.match(/^7\d{2}$/)).reduce((sum, t) => sum + Math.abs(t.amount), 0),
        total: assetsTotal
      },
      liabilities: {
        current: liabilities.filter(t => t.accountCode.match(/^8\d{2}$/)).map(t => ({ name: t.category, amount: Math.abs(t.amount), accountCode: t.accountCode })),
        nonCurrent: liabilities.filter(t => t.accountCode.match(/^9\d{2}$/)).map(t => ({ name: t.category, amount: Math.abs(t.amount), accountCode: t.accountCode })),
        totalCurrent: liabilities.filter(t => t.accountCode.match(/^8\d{2}$/)).reduce((sum, t) => sum + Math.abs(t.amount), 0),
        totalNonCurrent: liabilities.filter(t => t.accountCode.match(/^9\d{2}$/)).reduce((sum, t) => sum + Math.abs(t.amount), 0),
        total: liabilitiesTotal
      },
      equity: {
        items: equity.map(t => ({ name: t.category, amount: Math.abs(t.amount), accountCode: t.accountCode })),
        total: equityTotal
      }
    };
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 2
    }).format(Math.abs(amount));
  };

  const handleGeneratePDF = async (reportType: 'profit-loss' | 'balance-sheet') => {
    if (!financialData || !reportGenerator) return;
    
    setIsGenerating(true);
    
    try {
      let pdf;
      let filename;
      
      if (reportType === 'profit-loss') {
        pdf = reportGenerator.generateProfitLossPDF(financialData);
        filename = `Profit_Loss_Statement_${financialData.endDate.getFullYear()}.pdf`;
      } else {
        pdf = reportGenerator.generateBalanceSheetPDF(financialData);
        filename = `Balance_Sheet_${financialData.endDate.getFullYear()}.pdf`;
      }
      
      // Download the PDF
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'ytd': return 'Year to Date';
      case 'q4': return 'Q4 2024';
      case 'q3': return 'Q3 2024';
      case 'q2': return 'Q2 2024';
      case 'q1': return 'Q1 2024';
      default: return 'Custom Period';
    }
  };

  // Show reports if we have data (either sample or real) and reports are generated
  const hasReportData = financialData && financialData.transactions && financialData.transactions.length > 0;
  const canShowReports = hasReportData && profitLossData && balanceSheetData;
  const isRealData = !isSample && hasReportData;

  return (
    <div className="min-h-screen">
      <NavigationBar activeSection="reports" />
      
      <div className="relative min-h-screen bg-white">
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-12">
          {/* Show a banner if using sample data */}
          {isSample && (
            <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 rounded">
              <strong>Sample Data:</strong> No real file uploaded. Reports below are for demonstration only.
            </div>
          )}
          

          {/* Page Header */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Financial Reports</h1>
                  <p className="text-slate-600 mt-1">Professional-grade financial statements with PDF export</p>
                </div>
              </div>
              
              {/* Period Selector */}
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-slate-700">Report Period:</label>
                <select 
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="ytd">Year to Date</option>
                  <option value="q4">Q4 2024</option>
                  <option value="q3">Q3 2024</option>
                  <option value="q2">Q2 2024</option>
                  <option value="q1">Q1 2024</option>
                  <option value="custom">Custom Period</option>
                </select>
              </div>
            </div>
          </div>

          {/* Report Cards */}
          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            
            {/* Profit & Loss Report */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
              <div className="p-8 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Profit & Loss Statement</h2>
                      <p className="text-slate-600 text-sm">{getPeriodLabel()}</p>
                    </div>
                  </div>
                  {isRealData && (
                    <button
                      onClick={() => handleGeneratePDF('profit-loss')}
                      disabled={isGenerating || !profitLossData}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>{isGenerating ? 'Generating...' : 'Download PDF'}</span>
                    </button>
                  )}
                </div>
              </div>
              
              {canShowReports ? (
                profitLossData && (
                  <div className="p-8">
                    <div className="space-y-6">
                      {/* Revenue Summary */}
                      <div className="bg-green-50 rounded-xl p-6">
                        <h3 className="font-semibold text-green-800 mb-4">Revenue Summary</h3>
                        <div className="space-y-3">
                          {profitLossData.revenue.categories.slice(0, 3).map((category, index) => (
                            <div key={index} className="flex justify-between items-center">
                              <span className="text-green-700 text-sm">{category.name}</span>
                              <span className="font-medium text-green-800">{formatCurrency(category.amount)}</span>
                            </div>
                          ))}
                          {profitLossData.revenue.categories.length > 3 && (
                            <div className="text-green-600 text-sm">
                              +{profitLossData.revenue.categories.length - 3} more categories
                            </div>
                          )}
                        </div>
                        <div className="border-t border-green-200 mt-4 pt-4">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-green-800">Total Revenue</span>
                            <span className="font-bold text-green-800 text-lg">{formatCurrency(profitLossData.revenue.total)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Expenses Summary */}
                      <div className="bg-red-50 rounded-xl p-6">
                        <h3 className="font-semibold text-red-800 mb-4">Expenses Summary</h3>
                        <div className="space-y-3">
                          {profitLossData.expenses.categories.slice(0, 3).map((category, index) => (
                            <div key={index} className="flex justify-between items-center">
                              <span className="text-red-700 text-sm">{category.name}</span>
                              <span className="font-medium text-red-800">{formatCurrency(category.amount)}</span>
                            </div>
                          ))}
                          {profitLossData.expenses.categories.length > 3 && (
                            <div className="text-red-600 text-sm">
                              +{profitLossData.expenses.categories.length - 3} more categories
                            </div>
                          )}
                        </div>
                        <div className="border-t border-red-200 mt-4 pt-4">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-red-800">Total Expenses</span>
                            <span className="font-bold text-red-800 text-lg">{formatCurrency(profitLossData.expenses.total)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Net Income */}
                      <div className={`rounded-xl p-6 ${profitLossData.netIncome >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                        <div className="flex justify-between items-center">
                          <span className={`font-bold text-lg ${profitLossData.netIncome >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
                            Net Income
                          </span>
                          <span className={`font-bold text-xl ${profitLossData.netIncome >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
                            {profitLossData.netIncome >= 0 ? '+' : ''}{formatCurrency(profitLossData.netIncome)}
                          </span>
                        </div>
                        <p className={`text-sm mt-2 ${profitLossData.netIncome >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                          {profitLossData.netIncome >= 0 ? 'Profitable period' : 'Loss period'}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              ) : hasReportData ? (
                <div className="p-8 text-center text-slate-500 text-lg">
                  <div className="flex items-center justify-center space-x-2 mb-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                    <span>Generating reports...</span>
                  </div>
                  <p className="text-sm">Please wait while we process your financial data.</p>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 text-lg">
                  Please select or upload a file to view the Profit & Loss report.
                </div>
              )}
            </div>

            {/* Balance Sheet Report */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
              <div className="p-8 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h2a2 2 0 012 2v6a2 2 0 01-2 2H3a2 2 0 01-2-2v-6a2 2 0 012-2zm0 0V6a2 2 0 012-2h2a2 2 0 012 2v4m0 0h6m0 0V6a2 2 0 012-2h2a2 2 0 012 2v4m0 0h2a2 2 0 012 2v6a2 2 0 01-2 2h-2a2 2 0 01-2-2v-6" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Balance Sheet</h2>
                      <p className="text-slate-600 text-sm">{getPeriodLabel()}</p>
                    </div>
                  </div>
                </div>
              </div>
              {canShowReports ? (
                balanceSheetData && (
                  <div className="p-8">
                    <div className="space-y-6">
                      {/* Assets Summary */}
                      <div className="bg-purple-50 rounded-xl p-6">
                        <h3 className="font-semibold text-purple-800 mb-4">Assets</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-purple-700 text-sm">Current Assets</span>
                            <span className="font-medium text-purple-800">{formatCurrency(balanceSheetData.assets.totalCurrent)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-purple-700 text-sm">Non-Current Assets</span>
                            <span className="font-medium text-purple-800">{formatCurrency(balanceSheetData.assets.totalNonCurrent)}</span>
                          </div>
                        </div>
                        <div className="border-t border-purple-200 mt-4 pt-4">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-purple-800">Total Assets</span>
                            <span className="font-bold text-purple-800 text-lg">{formatCurrency(balanceSheetData.assets.total)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Liabilities Summary */}
                      <div className="bg-orange-50 rounded-xl p-6">
                        <h3 className="font-semibold text-orange-800 mb-4">Liabilities</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-orange-700 text-sm">Current Liabilities</span>
                            <span className="font-medium text-orange-800">{formatCurrency(balanceSheetData.liabilities.totalCurrent)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-orange-700 text-sm">Non-Current Liabilities</span>
                            <span className="font-medium text-orange-800">{formatCurrency(balanceSheetData.liabilities.totalNonCurrent)}</span>
                          </div>
                        </div>
                        <div className="border-t border-orange-200 mt-4 pt-4">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-orange-800">Total Liabilities</span>
                            <span className="font-bold text-orange-800 text-lg">{formatCurrency(balanceSheetData.liabilities.total)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Equity Summary */}
                      <div className="bg-teal-50 rounded-xl p-6">
                        <h3 className="font-semibold text-teal-800 mb-4">Equity</h3>
                        <div className="space-y-3">
                          {balanceSheetData.equity.items.slice(0, 2).map((item, index) => (
                            <div key={index} className="flex justify-between items-center">
                              <span className="text-teal-700 text-sm">{item.name}</span>
                              <span className="font-medium text-teal-800">{formatCurrency(item.amount)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-teal-200 mt-4 pt-4">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-teal-800">Total Equity</span>
                            <span className="font-bold text-teal-800 text-lg">{formatCurrency(balanceSheetData.equity.total)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Balance Check */}
                      <div className="bg-slate-50 rounded-xl p-6">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-800">Balance Check</span>
                          <span className={`font-bold text-lg ${
                            Math.abs(balanceSheetData.assets.total - (balanceSheetData.liabilities.total + balanceSheetData.equity.total)) < 0.01 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {Math.abs(balanceSheetData.assets.total - (balanceSheetData.liabilities.total + balanceSheetData.equity.total)) < 0.01 
                              ? '✓ Balanced' 
                              : '⚠ Unbalanced'
                            }
                          </span>
                        </div>
                        <p className="text-slate-600 text-sm mt-2">
                          Assets = Liabilities + Equity
                        </p>
                      </div>
                    </div>
                  </div>
                )
              ) : hasReportData ? (
                <div className="p-8 text-center text-slate-500 text-lg">
                  <div className="flex items-center justify-center space-x-2 mb-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                    <span>Generating reports...</span>
                  </div>
                  <p className="text-sm">Please wait while we process your financial data.</p>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 text-lg">
                  Please select or upload a file to view the Balance Sheet report.
                </div>
              )}
            </div>
          </div>

          {/* Features Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Professional Features</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">CRA Compliant</h4>
                  <p className="text-slate-600 text-sm">All reports follow Canadian Revenue Agency standards and requirements.</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">PDF Export</h4>
                  <p className="text-slate-600 text-sm">Professional PDF reports ready for accountants, banks, and stakeholders.</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Real-time Data</h4>
                  <p className="text-slate-600 text-sm">Reports generated from your latest transaction data with automatic categorization.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 