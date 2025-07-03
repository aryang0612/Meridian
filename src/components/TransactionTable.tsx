'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Transaction } from '../lib/types';
import { getMerchantCategories } from '../data/merchants';
import { ChartOfAccounts } from '../lib/chartOfAccounts';
import { AIEngine } from '../lib/aiEngine';
import BulkCategorySelector from './BulkCategorySelector';

interface Props {
  transactions: Transaction[];
  onTransactionUpdate: (id: string, updates: Partial<Transaction>) => void;
  aiEngine?: AIEngine | null;
  province?: string;
}

type SortField = 'date' | 'description' | 'amount' | 'category' | 'account' | 'confidence' | 'status' | 'feedback' | 'taxRate';
type SortDirection = 'asc' | 'desc';

function TransactionTable({ transactions, onTransactionUpdate, aiEngine, province = 'ON' }: Props) {
  const [filter, setFilter] = useState<'all' | 'needs-review' | 'high-confidence'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'category' | 'account' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showSmartSelect, setShowSmartSelect] = useState(false);
  const [showBulkSelector, setShowBulkSelector] = useState(false);
  const [chartInitialized, setChartInitialized] = useState(false);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const chartOfAccounts = useMemo(() => new ChartOfAccounts(province), [province]);

  // Sorting function
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Sort arrow component
  const SortArrow = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <span className="inline-block w-3 h-3 ml-1 text-slate-300 hover:text-slate-400 transition-colors">
          ↕
        </span>
      );
    }
    return (
      <span className={`inline-block w-3 h-3 ml-1 transition-colors ${
        sortDirection === 'asc' ? 'text-purple-600' : 'text-purple-600'
      }`}>
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  // Sortable header component
  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-purple-600 transition-colors group"
    >
      {children}
      <SortArrow field={field} />
    </button>
  );

  useEffect(() => {
    let isMounted = true;
    setChartInitialized(false);
    const initializeChart = async () => {
      console.log('🔄 Initializing Chart of Accounts for province:', province);
      // Client-side fetch of CSV
      try {
        const response = await fetch(`/Chart-of-Accounts-2.0-${province}.csv`);
        if (response.ok) {
          const csvText = await response.text();
          console.log('✅ Successfully fetched CSV data, loading into Chart of Accounts');
          chartOfAccounts.loadFromCSV(province, csvText);
        } else {
          console.warn(`⚠️ Could not fetch Chart of Accounts CSV for province ${province}: ${response.status}`);
        }
      } catch (err) {
        console.warn('⚠️ Error fetching Chart of Accounts CSV:', err);
      }
      await chartOfAccounts.waitForInitialization();
      if (isMounted) {
        setChartInitialized(true);
        console.log('✅ Chart of Accounts initialized, accounts available:', chartOfAccounts.getAllAccounts().length);
      }
    };
    initializeChart();
    return () => { isMounted = false; };
  }, [chartOfAccounts, province]);
  
  // Get available categories and accounts
  const categories = useMemo(() => {
    const merchantCategories = getMerchantCategories();
    const additionalCategories = [
      'Revenue',
      'Bank Fees', 
      'Interest Income',
      'Investment Income',
      'Rent',
      'Travel & Accommodation',
      'Medical Expenses',
      'Insurance',
      'E-Transfer',
      'Payroll',
      'Cheques',
      'Uncategorized'
    ];
    return [...new Set([...merchantCategories, ...additionalCategories])].sort();
  }, []);

  const accounts = useMemo(() => {
    if (!chartInitialized) {
      console.log('⏳ Chart not initialized yet, returning empty accounts array');
      return [];
    }
    const expenseAccounts = chartOfAccounts.getAccountsByType('Expense');
    const revenueAccounts = chartOfAccounts.getAccountsByType('Revenue');
    const assetAccounts = chartOfAccounts.getAccountsByType('Asset');
    const allAccounts = expenseAccounts.concat(revenueAccounts).concat(assetAccounts).sort((a, b) => a.name.localeCompare(b.name));
    console.log('📊 Available accounts:', allAccounts.length, 'Expense:', expenseAccounts.length, 'Revenue:', revenueAccounts.length, 'Asset:', assetAccounts.length);
    return allAccounts;
  }, [chartOfAccounts, chartInitialized]);

  // Helper function to get account name
  const getAccountName = (accountCode: string | undefined): string => {
    if (!accountCode) return 'Loading...';
    const account = chartOfAccounts.getAccount(accountCode.trim());
    if (!account) {
      // Debug logging for code mismatches
      console.warn('Account code not found:', accountCode, 'Available codes:', Array.from(chartOfAccounts["accounts"].keys()));
      return 'Unknown';
    }
    return account.name || 'Unknown';
  };

  // Get tax rate based on province and transaction type
  const getTaxRate = (transaction: Transaction): number | undefined => {
    // If tax rate is already set, return it
    if (transaction.taxRate !== undefined) {
      return transaction.taxRate;
    }

    // Auto-assign tax rates based on province and transaction type
    const provinceTaxRates: { [key: string]: number } = {
      'ON': 13, // HST
      'BC': 12, // HST
      'AB': 5,  // GST only
      'SK': 11, // GST + PST
      'MB': 12, // GST + PST
      'QC': 14.975, // GST + QST
      'NB': 15, // HST
      'NL': 15, // HST
      'NS': 15, // HST
      'PE': 15, // HST
      'NT': 5,  // GST only
      'NU': 5,  // GST only
      'YT': 5   // GST only
    };

    const baseTaxRate = provinceTaxRates[province] || 0;

    // Zero-rated or exempt categories
    const zeroRatedCategories = [
      'E-Transfer',
      'Payroll',
      'Cheques',
      'Bank Fees',
      'Interest Income',
      'Investment Income',
      'Uncategorized'
    ];

    // Check if transaction should be zero-rated
    if (zeroRatedCategories.includes(transaction.category || '')) {
      return 0;
    }

    // For expenses, apply tax rate
    if (transaction.amount < 0) {
      return baseTaxRate;
    }

    // For income, usually no tax on the transaction itself (tax is on profit)
    return 0;
  };

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    
    // Apply confidence filter
    if (filter === 'needs-review') {
      filtered = filtered.filter(t => !t.category || (t.confidence ?? 0) < 80 || !t.accountCode);
    } else if (filter === 'high-confidence') {
      filtered = filtered.filter(t => (t.confidence ?? 0) >= 80 && t.category && t.accountCode);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.merchant?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'description':
          aValue = a.description.toLowerCase();
          bValue = b.description.toLowerCase();
          break;
        case 'amount':
          aValue = Math.abs(a.amount);
          bValue = Math.abs(b.amount);
          break;
        case 'category':
          aValue = (a.category || '').toLowerCase();
          bValue = (b.category || '').toLowerCase();
          break;
        case 'account':
          aValue = (a.accountCode || '').toLowerCase();
          bValue = (b.accountCode || '').toLowerCase();
          break;
        case 'confidence':
          aValue = a.confidence ?? 0;
          bValue = b.confidence ?? 0;
          break;
        case 'status':
          aValue = a.isApproved ? 1 : 0;
          bValue = b.isApproved ? 1 : 0;
          break;
        case 'feedback':
          aValue = a.feedback ? 1 : 0;
          bValue = b.feedback ? 1 : 0;
          break;
        case 'taxRate':
          aValue = a.taxRate ?? 0;
          bValue = b.taxRate ?? 0;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [transactions, filter, searchTerm, sortField, sortDirection]);

  // Smart selection functions
  const handleSmartSelect = (criteria: string) => {
    let transactionsToSelect: Transaction[] = [];
    
    switch (criteria) {
      case 'uncategorized':
        transactionsToSelect = filteredTransactions.filter(t => !t.category || t.category === 'Uncategorized');
        break;
      case 'low-confidence':
        transactionsToSelect = filteredTransactions.filter(t => (t.confidence ?? 0) < 70);
        break;
      case 'high-confidence':
        transactionsToSelect = filteredTransactions.filter(t => (t.confidence ?? 0) >= 90 && t.category && t.accountCode);
        break;
      case 'no-account':
        transactionsToSelect = filteredTransactions.filter(t => !t.accountCode);
        break;
      case 'unapproved':
        transactionsToSelect = filteredTransactions.filter(t => !t.isApproved);
          break;
      case 'large-amounts':
        transactionsToSelect = filteredTransactions.filter(t => Math.abs(t.amount) > 100);
          break;
      case 'small-amounts':
        transactionsToSelect = filteredTransactions.filter(t => Math.abs(t.amount) <= 50);
          break;
      case 'this-month':
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();
        transactionsToSelect = filteredTransactions.filter(t => {
          const transactionDate = new Date(t.date);
          return transactionDate.getMonth() === thisMonth && transactionDate.getFullYear() === thisYear;
        });
          break;
    }
    
    const newSelected = new Set(transactionsToSelect.map(t => t.id));
    setSelectedTransactions(newSelected);
    setShowBulkActions(newSelected.size > 0);
    setShowSmartSelect(false);
  };

  const handleApplyToSimilar = (sourceTransaction: Transaction, updates: Partial<Transaction>) => {
    // Find similar transactions based on description patterns
    const similarTransactions = filteredTransactions.filter(t => {
      if (t.id === sourceTransaction.id) return false;
      
      // Check for similar merchant/description patterns
      const sourceDesc = sourceTransaction.description.toLowerCase();
      const targetDesc = t.description.toLowerCase();
      
      // Simple similarity check - could be enhanced with fuzzy matching
      return (
        (sourceTransaction.merchant && t.merchant && sourceTransaction.merchant === t.merchant) ||
        (sourceDesc.includes(targetDesc.split(' ')[0]) || targetDesc.includes(sourceDesc.split(' ')[0])) ||
        (Math.abs(t.amount - sourceTransaction.amount) < 0.01) // Same amount
      );
    });
    
    if (similarTransactions.length > 0) {
      const shouldApply = confirm(
        `Found ${similarTransactions.length} similar transactions. Apply the same categorization to all of them?`
      );
      
      if (shouldApply) {
        // Apply updates to similar transactions
        similarTransactions.forEach(t => {
          onTransactionUpdate(t.id, updates);
        });

        // Learn from this action for future uploads
        if (aiEngine && updates.category) {
          const similarDescriptions = similarTransactions.map(t => t.description);
          aiEngine.learnFromSimilarAction(
            sourceTransaction.description,
            updates.category,
            similarDescriptions,
            updates.accountCode
          );
        }

        console.log(`🔄 Applied categorization to ${similarTransactions.length} similar transactions and learned for future uploads`);
      }
    }
  };

  const handleCategoryChange = (id: string, category: string, applyToSimilar: boolean = false) => {
    const transaction = transactions.find(t => t.id === id);
    
    // Auto-suggest account based on category
    const suggestedAccount = chartOfAccounts.findAccountByCategory(category);
    const updates: Partial<Transaction> = { 
      category, 
      isManuallyEdited: true,
      confidence: 95
    };
    
    if (suggestedAccount && !transaction?.accountCode) {
      updates.accountCode = suggestedAccount.code;
    }
    
    onTransactionUpdate(id, updates);

    // Train AI engine when user makes corrections (safe addition)
    if (aiEngine && transaction && transaction.category !== category) {
      console.log('🔄 Training AI with user correction:', {
        description: transaction.originalDescription || transaction.description,
        oldCategory: transaction.category || '',
        newCategory: category
      });
      aiEngine.recordUserCorrection(
        transaction.originalDescription || transaction.description,
        transaction.category || '',
        category
      );
    }

    // Apply to similar transactions if requested
    if (applyToSimilar && transaction) {
      handleApplyToSimilar(transaction, updates);
    }
    
    setEditingId(null);
    setEditingField(null);
  };

  const handleAccountChange = (id: string, accountCode: string) => {
    onTransactionUpdate(id, { 
      accountCode, 
      isManuallyEdited: true,
      confidence: 95
    });
    setEditingId(null);
    setEditingField(null);
  };

  const handleApprove = (id: string) => {
    onTransactionUpdate(id, { isApproved: true });
  };

  const handleFeedback = (id: string, isCorrect: boolean) => {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    console.log('🔄 Feedback received:', { 
      transactionId: id, 
      isCorrect, 
      category: transaction.category,
      description: transaction.description,
      aiEngineAvailable: !!aiEngine 
    });

    const feedback = {
      isCorrect,
      timestamp: Date.now(),
      correctedCategory: isCorrect ? undefined : transaction.category,
      correctedAccount: isCorrect ? undefined : transaction.accountCode
    };

    onTransactionUpdate(id, { feedback });

    // Train AI engine if available (safe addition)
    if (aiEngine && transaction.category) {
      if (isCorrect) {
        console.log('✅ Training AI with correct categorization:', {
          description: transaction.originalDescription || transaction.description,
          category: transaction.category
        });
        // Record that this categorization was correct
        aiEngine.recordUserCorrection(
          transaction.originalDescription || transaction.description,
          '',
          transaction.category
        );
      }
      // Note: For incorrect feedback, we'll train when user actually makes the correction
    } else {
      console.log('⚠️ AI training skipped:', { 
        aiEngine: !!aiEngine, 
        hasCategory: !!transaction.category 
      });
    }

    // If incorrect, allow user to make corrections
    if (!isCorrect) {
      setEditingId(id);
      setEditingField('category');
    }
  };

  const clearFeedback = (id: string) => {
    onTransactionUpdate(id, { feedback: undefined });
  };

  const handleSelectTransaction = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedTransactions);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedTransactions(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTransactions(new Set(filteredTransactions.map(t => t.id)));
      setShowBulkActions(true);
    } else {
      setSelectedTransactions(new Set());
      setShowBulkActions(false);
    }
  };

  const handleBulkApprove = () => {
    selectedTransactions.forEach(id => {
      onTransactionUpdate(id, { isApproved: true });
    });
    setSelectedTransactions(new Set());
    setShowBulkActions(false);
  };

  const handleBulkCategorize = (category: string, accountCode?: string) => {
    const updates: Partial<Transaction> = {
      category,
      isManuallyEdited: true,
      confidence: 95
    };
    
    if (accountCode) {
      updates.accountCode = accountCode;
    }
    
    selectedTransactions.forEach(id => {
      onTransactionUpdate(id, updates);
    });
    setSelectedTransactions(new Set());
    setShowBulkActions(false);
  };

  const handleBulkUpdate = (updates: { id: string; accountCode: string; category: string; subcategory: string }[]) => {
    updates.forEach(({ id, accountCode, category, subcategory }) => {
      onTransactionUpdate(id, {
        category,
        subcategory,
        accountCode,
        confidence: 95,
        isManuallyEdited: true
      });
    });
    setShowBulkSelector(false);
  };

  const handleAutoApproveHighConfidence = () => {
    const highConfidenceTransactions = filteredTransactions.filter(t => 
      (t.confidence ?? 0) >= 90 && t.category && t.accountCode && !t.isApproved
    );
    
    highConfidenceTransactions.forEach(t => {
      onTransactionUpdate(t.id, { isApproved: true });
    });
  };

  const getConfidenceDisplay = (confidence: number) => {
    if (confidence >= 90) return { label: 'High', color: 'text-slate-700' };
    if (confidence >= 70) return { label: 'Medium', color: 'text-slate-500' };
    return { label: 'Low', color: 'text-slate-400' };
  };

  const stats = useMemo(() => {
    const total = transactions.length;
    const needsReview = transactions.filter(t => !t.category || (t.confidence ?? 0) < 80 || !t.accountCode).length;
    const highConfidence = transactions.filter(t => (t.confidence ?? 0) >= 80 && t.category && t.accountCode).length;
    const approved = transactions.filter(t => t.isApproved).length;
    const readyToApprove = transactions.filter(t => (t.confidence ?? 0) >= 90 && t.category && t.accountCode && !t.isApproved).length;
    
    // Calculate inflow vs outflow
    const inflow = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const outflow = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    return { total, needsReview, highConfidence, approved, readyToApprove, inflow, outflow };
  }, [transactions]);

  // Auto-assign account codes to transactions with a category but no accountCode
  useEffect(() => {
    if (!chartInitialized) return;
    transactions.forEach((t) => {
      if (t.category && !t.accountCode) {
        const suggested = chartOfAccounts.findAccountByCategory(t.category);
        if (suggested) {
          onTransactionUpdate(t.id, { accountCode: suggested.code });
        }
      }
    });
    // eslint-disable-next-line
  }, [chartInitialized]);

  if (!chartInitialized) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-lg text-purple-600 font-semibold">
        Loading chart of accounts...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats and Filters */}
      <div className="bg-white rounded-xl p-8 border border-purple-100/50 shadow-lg shadow-purple-500/5">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <span className="text-purple-600 font-semibold">📊</span>
            </div>
            <h3 className="text-xl font-semibold text-slate-900">
              Transaction Review & Coding
          </h3>
        </div>
          <div className="flex items-center space-x-6 text-sm">
            <span className="text-slate-600">
              {stats.approved}/{stats.total} approved
            </span>
            <span className="text-slate-500">
              {stats.needsReview} need review
            </span>
            <span className="text-slate-700">
              {stats.highConfidence} ready
            </span>
            <div className="flex items-center space-x-4">
              <span className="text-green-600 font-medium">
                ↗ ${stats.inflow.toFixed(2)} inflow
              </span>
              <span className="text-red-600 font-medium">
                ↘ ${stats.outflow.toFixed(2)} outflow
              </span>
            </div>
            {stats.readyToApprove > 0 && (
              <button
                onClick={handleAutoApproveHighConfidence}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 hover:scale-105 transition-all duration-300 shadow-lg shadow-purple-500/25"
              >
                Auto-approve {stats.readyToApprove}
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-6 mb-6">
          <div className="flex space-x-3">
            {[
              { key: 'all', label: 'All Transactions' },
              { key: 'needs-review', label: 'Needs Review' },
              { key: 'high-confidence', label: 'Ready to Approve' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  filter === key
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                    : 'bg-slate-50 text-slate-600 hover:bg-purple-50 hover:text-purple-600 border border-transparent hover:border-purple-200'
                }`}
              >
                {label}
              </button>
            ))}
      </div>

          <div className="flex-1 max-w-sm">
              <input
                type="text"
                placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-white rounded-lg text-sm text-black border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
              />
            </div>
          </div>

        {/* Smart Selection */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowSmartSelect(!showSmartSelect)}
              className="px-4 py-2 bg-white text-slate-600 rounded-lg text-sm font-medium hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-all duration-300 border border-slate-200"
            >
              🎯 Smart Select
            </button>
            {showSmartSelect && (
              <div className="flex items-center space-x-2">
            <select
                  onChange={(e) => {
                    if (e.target.value) handleSmartSelect(e.target.value);
                  }}
                  className="px-3 py-2 bg-slate-50 rounded-lg text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
                  defaultValue=""
                >
                  <option value="">Choose criteria...</option>
                  <option value="uncategorized">🏷️ Uncategorized</option>
                  <option value="low-confidence">📉 Low Confidence (&lt;70%)</option>
                  <option value="high-confidence">📈 High Confidence (≥90%)</option>
                  <option value="no-account">🏦 Missing Account</option>
                  <option value="unapproved">⏳ Unapproved</option>
                  <option value="large-amounts">💰 Large Amounts (&gt;$100)</option>
                  <option value="small-amounts">🪙 Small Amounts (≤$50)</option>
                  <option value="this-month">📅 This Month</option>
            </select>
                <button
                  onClick={() => setShowSmartSelect(false)}
                  className="px-2 py-2 text-slate-400 hover:text-slate-600 text-sm"
                >
                  ×
                </button>
          </div>
            )}
        </div>
      </div>

        {/* Bulk Actions */}
      {showBulkActions && (
          <div className="bg-white rounded-xl p-6 mb-6 border-l-4 border-purple-500 shadow-lg shadow-purple-500/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <span className="text-lg">⚡</span>
                <div>
                  <span className="text-sm font-medium text-slate-900">
                    {selectedTransactions.size} transactions selected
            </span>
                  <div className="text-xs text-slate-500">
                    Bulk operations will apply to all selected transactions
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedTransactions(new Set());
                  setShowBulkActions(false);
                }}
                className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs hover:bg-slate-200 transition-colors"
              >
                Clear Selection
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Quick Category Actions */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Quick Categories
                </label>
                <div className="space-y-2">
                                      <select
                    onChange={(e) => {
                      const [category, accountCode] = e.target.value.split('|');
                      if (category) handleBulkCategorize(category, accountCode);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 rounded-lg text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
                    defaultValue=""
                  >
                    <option value="">Select category...</option>
                    <optgroup label="🍽️ Business Expenses">
                      <option value="Meals & Entertainment|5500">Meals & Entertainment → Office: Meals (5500)</option>
                      <option value="Motor Vehicle Expenses|5600">Gas/Auto → Motor Vehicle (5600)</option>
                      <option value="Office Supplies|5710">Office Supplies → Office Supplies (5710)</option>
                      <option value="Software & Technology|5720">Software → Software & Tech (5720)</option>
                      <option value="Travel & Accommodation|5800">Travel → Travel & Accommodation (5800)</option>
                    </optgroup>
                    <optgroup label="🏦 Banking & Fees">
                      <option value="Bank Fees|5200">Bank Fees → Bank Fees (5200)</option>
                      <option value="Interest Income|4100">Interest → Interest Income (4100)</option>
                    </optgroup>
                    <optgroup label="📋 Other">
                      <option value="Rent|5900">Rent → Rent Expense (5900)</option>
                      <option value="Insurance|5300">Insurance → Insurance (5300)</option>
                      <option value="Medical Expenses|5400">Medical → Medical Expenses (5400)</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Bulk Actions */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Actions
                </label>
                <div className="space-y-2">
                  <button
                    onClick={handleBulkApprove}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 hover:scale-105 transition-all duration-300 font-medium shadow-lg shadow-purple-500/25"
                  >
                    ✅ Approve All Selected
                  </button>
                  <button
                    onClick={() => {
                      const updates = { isManuallyEdited: true, confidence: 95 };
                      selectedTransactions.forEach(id => {
                        onTransactionUpdate(id, updates);
                      });
                      setSelectedTransactions(new Set());
                      setShowBulkActions(false);
                    }}
                    className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg text-sm hover:bg-slate-700 hover:scale-105 transition-all duration-300 font-medium shadow-lg shadow-slate-500/25"
                  >
                    📝 Mark as Manually Reviewed
                  </button>
                  <button
                    onClick={() => setShowBulkSelector(true)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 hover:scale-105 transition-all duration-300 font-medium shadow-lg shadow-blue-500/25"
                  >
                    🎯 Bulk Category Assignment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-xl overflow-hidden border border-purple-100/50 shadow-lg shadow-purple-500/5">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-purple-50/50">
              <tr>
                <th className="px-8 py-6 text-left">
                  <input
                    type="checkbox"
                    checked={selectedTransactions.size === filteredTransactions.length && filteredTransactions.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500 border-slate-300"
                  />
                </th>
                <th className="px-8 py-6 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <SortableHeader field="date">Date</SortableHeader>
                </th>
                <th className="px-8 py-6 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <SortableHeader field="description">Description</SortableHeader>
                </th>
                <th className="px-8 py-6 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <SortableHeader field="amount">
                    <div className="flex items-center space-x-1">
                      <span>Amount</span>
                      <div className="flex items-center space-x-1 text-xs">
                        <span className="text-green-600">●</span>
                        <span className="text-slate-400">in</span>
                        <span className="text-red-600">●</span>
                        <span className="text-slate-400">out</span>
                      </div>
                      <span className="text-xs text-slate-400" title="Green = Inflow/Income, Red = Outflow/Expense">
                        💡
                      </span>
                    </div>
                  </SortableHeader>
                </th>
                <th className="px-8 py-6 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <SortableHeader field="category">Category</SortableHeader>
                </th>
                <th className="px-8 py-6 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <SortableHeader field="account">Account</SortableHeader>
                </th>
                <th className="px-8 py-6 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <SortableHeader field="taxRate">Tax Rate</SortableHeader>
                </th>
                <th className="px-8 py-6 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <SortableHeader field="confidence">Confidence</SortableHeader>
                </th>
                <th className="px-8 py-6 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <SortableHeader field="status">Status</SortableHeader>
                </th>
                <th className="px-8 py-6 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <SortableHeader field="feedback">Feedback</SortableHeader>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {filteredTransactions.map((transaction, index) => {
                // Special styling for E-Transfer and Cheque transactions
                const isETransfer = transaction.category === 'E-Transfer';
                const isCheque = transaction.category === 'Cheques';
                const needsManualAssignment = isETransfer || isCheque;
                const rowClasses = `hover:bg-slate-50 transition-colors ${
                  index !== filteredTransactions.length - 1 ? 'border-b border-slate-100' : ''
                } ${needsManualAssignment ? 'bg-yellow-50 hover:bg-yellow-100' : ''}`;
                
                return (
                <tr key={transaction.id} className={rowClasses}>
                  <td className="px-8 py-6">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.has(transaction.id)}
                      onChange={(e) => handleSelectTransaction(transaction.id, e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500 border-slate-300"
                    />
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap text-sm font-medium text-slate-500">
                    {transaction.date}
                  </td>
                  <td className="px-8 py-6 text-sm text-slate-900 max-w-md">
                    <div className="font-medium leading-relaxed break-words group relative" title={transaction.description}>
                      {transaction.description}
                      {transaction.description.length > 100 && (
                        <div className="absolute left-0 top-full mt-2 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 max-w-sm break-words">
                          {transaction.description}
                          <div className="absolute top-0 left-4 transform -translate-y-1 w-2 h-2 bg-slate-900 rotate-45"></div>
                        </div>
                      )}
                    </div>
                    {transaction.merchant && (
                      <div className="text-xs text-slate-400 break-words mt-1">
                        {transaction.merchant}
                      </div>
                    )}
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap text-sm font-semibold">
                    <div className="flex items-center justify-center">
                      <span
                        className={`inline-flex items-center px-4 py-2 rounded-full shadow border transition-all duration-200 cursor-default select-none
                          ${transaction.amount >= 0
                            ? 'bg-green-100 border-green-300 text-green-700 hover:bg-green-200 hover:shadow-lg'
                            : 'bg-red-100 border-red-300 text-red-700 hover:bg-red-200 hover:shadow-lg'}
                        `}
                        style={{ fontWeight: 600, fontSize: '1.1rem', minWidth: '120px', justifyContent: 'center' }}
                        title={transaction.amount >= 0 ? 'Inflow' : 'Outflow'}
                      >
                        <span className={`mr-2 text-xl font-bold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}
                              style={{ fontSize: '1.4em', lineHeight: 1 }}>
                          {transaction.amount >= 0 ? '↗' : '↘'}
                        </span>
                        <span className="tabular-nums">
                          ${Math.abs(transaction.amount).toFixed(2)}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-sm">
                    {editingId === transaction.id && editingField === 'category' ? (
                      <div className="space-y-2">
                        <select
                          value={transaction.category || ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              // Check if there are similar transactions
                              const similarCount = filteredTransactions.filter(t => {
                                if (t.id === transaction.id) return false;
                                const sourceDesc = transaction.description.toLowerCase();
                                const targetDesc = t.description.toLowerCase();
                                return (
                                  (transaction.merchant && t.merchant && transaction.merchant === t.merchant) ||
                                  (sourceDesc.includes(targetDesc.split(' ')[0]) || targetDesc.includes(sourceDesc.split(' ')[0])) ||
                                  (Math.abs(t.amount - transaction.amount) < 0.01)
                                );
                              }).length;

                              if (similarCount > 0) {
                                const applyToSimilar = confirm(
                                  `Found ${similarCount} similar transactions. Apply "${e.target.value}" to all of them?`
                                );
                                handleCategoryChange(transaction.id, e.target.value, applyToSimilar);
                              } else {
                                handleCategoryChange(transaction.id, e.target.value);
                              }
                            }
                          }}
                          onBlur={() => {
                            setEditingId(null);
                            setEditingField(null);
                          }}
                          autoFocus
                          className="w-full px-3 py-2 bg-slate-50 rounded-lg text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
                        >
                          <option value="">Select category...</option>
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                        <div className="text-xs text-slate-500">
                          💡 If similar transactions exist, you'll be asked to apply the same category to them
                        </div>
        </div>
                    ) : (
                      <div className="flex items-center space-x-2">
              <button
                          onClick={() => {
                            setEditingId(transaction.id);
                            setEditingField('category');
                          }}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                            transaction.category
                              ? 'bg-slate-100 text-slate-900 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 border border-transparent'
                              : 'bg-slate-50 text-slate-500 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 border border-transparent'
                          }`}
                        >
                          {transaction.category || 'Uncategorized'}
              </button>
                        {transaction.category && (
              <button
                            onClick={() => {
                              const updates = { 
                                category: transaction.category, 
                                accountCode: transaction.accountCode,
                                isManuallyEdited: true,
                                confidence: 95
                              };
                              handleApplyToSimilar(transaction, updates);
                            }}
                            className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-all duration-300"
                            title="Apply this categorization to similar transactions"
                          >
                            🔄
              </button>
                        )}
            </div>
                    )}
                  </td>
                  <td className="px-8 py-6 text-sm">
                    {editingId === transaction.id && editingField === 'account' ? (
                      <select
                        value={transaction.accountCode || ''}
                        onChange={(e) => handleAccountChange(transaction.id, e.target.value)}
                        onBlur={() => {
                          setEditingId(null);
                          setEditingField(null);
                        }}
                        autoFocus
                        className={`w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 ${
                          needsManualAssignment ? 'bg-yellow-50 border border-yellow-200' : 'bg-slate-50'
                        }`}
                      >
                        <option value="">{needsManualAssignment ? `Select account for ${isETransfer ? 'E-Transfer' : 'Cheque'}...` : 'Select account...'}</option>
                        {accounts.map((acc) => (
                          <option key={acc.code} value={acc.code}>
                            {acc.code} - {acc.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                  <button
                        onClick={() => {
                          setEditingId(transaction.id);
                          setEditingField('account');
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          needsManualAssignment && !transaction.accountCode
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300'
                            : transaction.accountCode
                            ? 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {transaction.accountCode ? 
                          `${transaction.accountCode} - ${getAccountName(transaction.accountCode)}` :
                          needsManualAssignment ? `Set ${isETransfer ? 'E-Transfer' : 'Cheque'} Account` : 'No Account'
                        }
                        {needsManualAssignment && !transaction.accountCode && (
                          <div className="text-xs text-yellow-600 mt-1">
                            Manual assignment required
                          </div>
                        )}
                  </button>
                    )}
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap text-sm">
                    <div className="flex items-center space-x-2">
                      {(() => {
                        const taxRate = getTaxRate(transaction);
                        return (
                          <>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              taxRate !== undefined
                                ? taxRate > 0 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-gray-100 text-gray-600'
                                : 'bg-slate-50 text-slate-400'
                            }`}>
                              {taxRate !== undefined ? `${taxRate}%` : 'N/A'}
                            </span>
                            {taxRate && taxRate > 0 && (
                              <span className="text-xs text-slate-500">
                                ${((Math.abs(transaction.amount) * taxRate) / 100).toFixed(2)}
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <span className={`text-xs font-medium ${getConfidenceDisplay(transaction.confidence ?? 0).color}`}>
                      {getConfidenceDisplay(transaction.confidence ?? 0).label} ({transaction.confidence ?? 0}%)
                    </span>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap text-sm">
                    {!transaction.isApproved && (
                      <button
                        onClick={() => handleApprove(transaction.id)}
                        disabled={!transaction.category || !transaction.accountCode}
                        className={`font-medium transition-colors ${
                          transaction.category && transaction.accountCode
                            ? 'text-slate-900 hover:text-slate-700'
                            : 'text-slate-300 cursor-not-allowed'
                        }`}
                      >
                        {isETransfer && !transaction.accountCode ? 'Set Account First' : 'Approve'}
                      </button>
                    )}
                    {transaction.isApproved && (
                      <span className="text-slate-600 text-xs font-medium">✓ Approved</span>
                    )}
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap text-sm">
                    {transaction.category && transaction.accountCode && !transaction.feedback && (
                      <div className="flex items-center space-x-2">
                  <button
                          onClick={() => handleFeedback(transaction.id, true)}
                          className="text-green-600 hover:text-green-700 transition-colors p-1 rounded hover:bg-green-50"
                          title="Categorization is correct"
                        >
                          👍
                  </button>
          <button
                          onClick={() => handleFeedback(transaction.id, false)}
                          className="text-red-600 hover:text-red-700 transition-colors p-1 rounded hover:bg-red-50"
                          title="Categorization needs correction"
                        >
                          👎
          </button>
        </div>
      )}
                    {transaction.feedback && (
                      <div className="flex items-center space-x-1">
                        <span className={`text-xs font-medium ${
                          transaction.feedback.isCorrect ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.feedback.isCorrect ? '✓ Correct' : '✗ Corrected'}
          </span>
            <button
                          onClick={() => clearFeedback(transaction.id)}
                          className="text-slate-400 hover:text-slate-600 text-xs ml-1"
                          title="Clear feedback"
                        >
                          ×
            </button>
          </div>
                    )}
        </td>
      </tr>
    );
              })}
            </tbody>
          </table>
        </div>
        
        {filteredTransactions.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            No transactions match the current filter.
          </div>
        )}
      </div>

      {/* Pagination info */}
      <div className="text-sm text-slate-500 text-center">
        Showing {filteredTransactions.length} of {transactions.length} transactions
        {selectedTransactions.size > 0 && (
          <span className="ml-4 text-slate-700 font-medium">
            • {selectedTransactions.size} selected
          </span>
        )}
      </div>

      {/* Bulk Category Selector Modal */}
      {showBulkSelector && (
        <BulkCategorySelector
          transactions={transactions}
          onBulkUpdate={handleBulkUpdate}
          onClose={() => setShowBulkSelector(false)}
          province={province}
        />
      )}
    </div>
  );
} 

export default TransactionTable;