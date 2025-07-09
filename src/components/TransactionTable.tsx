'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Transaction } from '../lib/types';
import { ChartOfAccounts } from '../lib/chartOfAccounts';
import { AIEngine } from '../lib/aiEngine';
import BulkCategorySelector from './BulkCategorySelector';
import AICategorizationButton from './AICategorizationButton';
import { AppIcons, CommonIcons, IconSizes } from '../lib/iconSystem';

interface Props {
  transactions: Transaction[];
  onTransactionUpdate: (id: string, updates: Partial<Transaction>) => void;
  aiEngine?: AIEngine | null;
  province?: string;
}

type SortField = 'date' | 'description' | 'amount' | 'account' | 'confidence' | 'status' | 'feedback' | 'taxRate';
type SortDirection = 'asc' | 'desc';

// Notification Popup Component
function NotificationToast({ message, onClose }: { message: string; onClose: () => void }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      setVisible(false);
      onClose();
    }, 8000); // 8 seconds (increased from 5)
    return () => clearTimeout(timer);
  }, [visible, onClose]);
  if (!visible) return null;
  return (
    <div style={{
      position: 'fixed',
      top: 32,
      right: 32,
      background: 'rgba(60, 60, 80, 0.98)',
      color: 'white',
      padding: '20px 28px',
      borderRadius: 16,
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      zIndex: 9999,
      minWidth: 280,
      maxWidth: 380,
      fontSize: 16,
      display: 'flex',
      alignItems: 'center',
      border: '1px solid rgba(255,255,255,0.1)',
      backdropFilter: 'blur(10px)',
    }}>
      <span style={{ flex: 1, lineHeight: '1.4' }}>{message}</span>
      <button 
        onClick={() => { setVisible(false); onClose(); }} 
        style={{ 
          marginLeft: 20, 
          background: 'transparent', 
          border: 'none', 
          color: '#fff', 
          fontWeight: 'bold', 
          fontSize: 20, 
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: '4px',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        &times;
      </button>
    </div>
  );
}

function TransactionTable({ transactions, onTransactionUpdate, aiEngine, province = 'ON' }: Props) {
  const [filter, setFilter] = useState<'all' | 'needs-review' | 'high-confidence'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'account' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showSmartSelect, setShowSmartSelect] = useState(false);
  const [showBulkSelector, setShowBulkSelector] = useState(false);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [notification, setNotification] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; isProcessing: boolean }>({ current: 0, total: 0, isProcessing: false });
  const [viewMode, setViewMode] = useState<'table' | 'grouped'>('table');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Use singleton Chart of Accounts instance
  const chartOfAccounts = useMemo(() => ChartOfAccounts.getInstance(province), [province]);

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

  // Chart of Accounts is always ready with hardcoded data
  useEffect(() => {
    console.log('✅ Chart of Accounts ready, accounts available:', chartOfAccounts.getAllAccounts().length);
  }, [chartOfAccounts, province]);
  
  // Get available account codes (no longer using categories)
  const accountCodes = useMemo(() => {
    const availableAccounts = chartOfAccounts.getAllAccounts();
    const codes = availableAccounts.map(account => account.code).sort();
    return codes;
  }, [chartOfAccounts]);

  // Helper function to get account by code
  const getAccountByCode = (code: string) => {
    return chartOfAccounts.getAccount(code);
  };

  const accounts = useMemo(() => {
    const expenseAccounts = chartOfAccounts.getAccountsByType('Expense');
    const revenueAccounts = chartOfAccounts.getAccountsByType('Revenue');
    const assetAccounts = chartOfAccounts.getAccountsByType('Asset');
    const combinedAccounts = expenseAccounts.concat(revenueAccounts).concat(assetAccounts).sort((a, b) => a.name.localeCompare(b.name));
    console.log('📊 Available accounts:', combinedAccounts.length, 'Expense:', expenseAccounts.length, 'Revenue:', revenueAccounts.length, 'Asset:', assetAccounts.length);
    return combinedAccounts;
  }, [chartOfAccounts]);

  // Helper function to get account name
  const getAccountName = (accountCode: string | undefined): string => {
    if (!accountCode) return 'Uncategorized';
    const account = chartOfAccounts.getAccount(accountCode.trim());
    if (!account) {
      // Debug logging for code mismatches
      const availableCodes = chartOfAccounts.getAllAccounts().map(a => a.code);
      console.warn('Account code not found:', accountCode, 'Available codes:', availableCodes.slice(0, 10), '... (total:', availableCodes.length, ')');
      return `Unknown Account (${accountCode})`;
    }
    return account.name || 'Uncategorized';
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
      'Uncategorized',
      'Sales Revenue',
      'Service Revenue',
      'Other Revenue',
      'Accounts Receivable',
      'Prepayments',
      'Inventory',
      'Notes Receivable',
      'Equipment',
      'Vehicles',
      'Computer Equipment',
      'Accounts Payable',
      'Notes Payable',
      'Wages Payable',
      'Sales Tax',
      'Employee Tax Payable',
      'Income Tax Payable',
      'Due To/From Shareholders',
      'Loan',
      'Owner A Share Capital',
      'Depreciation',
      'Donations',
      'Income Tax Expense',
      'Property Tax',
      'Bad Debts'
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
      filtered = filtered.filter(t => (t.confidence ?? 0) < 80 || !t.accountCode);
    } else if (filter === 'high-confidence') {
      filtered = filtered.filter(t => (t.confidence ?? 0) >= 80 && t.accountCode);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        // Category search removed - using account codes only
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
              // Category sorting removed - using account codes only
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
        transactionsToSelect = filteredTransactions.filter(t => !t.accountCode);
        break;
      case 'low-confidence':
        transactionsToSelect = filteredTransactions.filter(t => (t.confidence ?? 0) < 70);
        break;
      case 'high-confidence':
        transactionsToSelect = filteredTransactions.filter(t => (t.confidence ?? 0) >= 90 && t.accountCode);
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

  // Similar transaction logic moved to utility function
  const findSimilarTransactions = (sourceTransaction: Transaction): Transaction[] => {
    return filteredTransactions.filter(t => {
      if (t.id === sourceTransaction.id) return false;
      return (
        (sourceTransaction.merchant && t.merchant && sourceTransaction.merchant === t.merchant) ||
        (Math.abs(t.amount - sourceTransaction.amount) < 0.01)
      );
    });
  };

  // Category change function removed - using account codes only

  const handleAccountChange = (id: string, accountCode: string) => {
    onTransactionUpdate(id, { 
      accountCode, 
      isManuallyEdited: true,
      confidence: 95
    });
    setEditingId(null);
    setEditingField(null);

    // Find similar transactions and offer bulk update
    const sourceTransaction = transactions.find(t => t.id === id);
    if (sourceTransaction) {
      const similarTransactions = findSimilarTransactions(sourceTransaction);
      
      if (similarTransactions.length > 0) {
        const shouldApply = confirm(
          `Apply same account to ${similarTransactions.length} similar transactions?`
        );
        if (shouldApply) {
          similarTransactions.forEach(t => {
            onTransactionUpdate(t.id, { accountCode, isManuallyEdited: true, confidence: 95 });
          });
        }
      }
    }
  };

  const invalidAccountCodeWarned: Record<string, boolean> = {};

  const handleAICategorize = (id: string, accountCode: string, confidence: number) => {
    const transaction = transactions.find(t => t.id === id);
    console.log('🎯 handleAICategorize called with:', {
      transactionId: id,
      accountCode: accountCode,
      confidence: confidence,
      transactionDescription: transaction?.description,
      currentAccountCode: transaction?.accountCode,
      totalAvailableCodes: accountCodes.length
    });
    
    // Extract just the numeric code from formats like "420 - Entertainment" or "420"
    const extractedCode = accountCode.split(' - ')[0].split(' ')[0].trim();
    
    console.log('🔍 Account code validation:', {
      original: accountCode,
      extracted: extractedCode,
      isExtractedValid: accountCodes.includes(extractedCode),
      isOriginalValid: accountCodes.includes(accountCode),
      availableCodesFirst10: accountCodes.slice(0, 10),
      availableCodesTotal: accountCodes.length
    });
    
    // Defensive: Only allow valid account codes
    const safeAccountCode = accountCodes.includes(extractedCode) ? extractedCode : 
                           accountCodes.includes(accountCode) ? accountCode : undefined;
    
    if (!safeAccountCode) {
      console.warn('🚨 Invalid account code suggested:', { 
        original: accountCode, 
        extracted: extractedCode,
        availableCodes: accountCodes.slice(0, 10) // Show first 10 for debugging
      });
      setNotification(`AI suggested an invalid account code (${accountCode}). Please review.`);
    }
    
    const updates: Partial<Transaction> = {
      accountCode: safeAccountCode,
      confidence,
      aiCategorized: true
    };
    
    console.log('🎯 Applying AI categorization:', {
      transactionId: id,
      originalAccountCode: accountCode,
      extractedCode: extractedCode,
      safeAccountCode: safeAccountCode,
      confidence: confidence,
      updates: updates
    });
    
    onTransactionUpdate(id, updates);
    
    if (safeAccountCode) {
      setNotification(`✅ AI assigned account ${safeAccountCode} - ${getAccountName(safeAccountCode)} (${confidence}% confidence)`);
    }
  };

  const handleApprove = (id: string) => {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;
    if (!transaction.accountCode || !accountCodes.includes(transaction.accountCode)) {
      setNotification('Cannot approve: Transaction does not have a valid account code.');
      return;
    }
    onTransactionUpdate(id, { isApproved: true });
  };

  const handleFeedback = (id: string, isCorrect: boolean) => {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    console.log('🔄 Feedback received:', { 
      transactionId: id, 
      isCorrect, 
      accountCode: transaction.accountCode,
      description: transaction.description,
      aiEngineAvailable: !!aiEngine 
    });

    const feedback = {
      isCorrect,
      timestamp: Date.now(),
      correctedAccount: isCorrect ? undefined : transaction.accountCode
    };

    onTransactionUpdate(id, { feedback });

    // Train AI engine if available (safe addition)
    if (aiEngine && transaction.accountCode) {
      if (isCorrect) {
        console.log('✅ Training AI with correct account assignment:', {
          description: transaction.originalDescription || transaction.description,
          accountCode: transaction.accountCode
        });
        // Record that this account assignment was correct
        aiEngine.recordUserCorrection(
          transaction.originalDescription || transaction.description,
          transaction.accountCode
        );
      }
      // Note: For incorrect feedback, we'll train when user actually makes the correction
    } else {
      console.log('⚠️ AI training skipped:', { 
        aiEngine: !!aiEngine, 
        hasAccountCode: !!transaction.accountCode 
      });
    }

    // If incorrect, allow user to make corrections
    if (!isCorrect) {
      setEditingId(id);
                                  setEditingField('account');
    }
  };

  const clearFeedback = (id: string) => {
    onTransactionUpdate(id, { feedback: undefined });
  };

  // Group transactions by account code
  const groupedTransactions = useMemo(() => {
    const groups: { [accountCode: string]: Transaction[] } = {};
    
    filteredTransactions.forEach(transaction => {
      const accountCode = transaction.accountCode || 'Uncategorized';
      if (!groups[accountCode]) {
        groups[accountCode] = [];
      }
      groups[accountCode].push(transaction);
    });

    return groups;
  }, [filteredTransactions]);

  // Toggle group expansion
  const toggleGroup = (accountCode: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(accountCode)) {
      newExpanded.delete(accountCode);
    } else {
      newExpanded.add(accountCode);
    }
    setExpandedGroups(newExpanded);
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

  const handleBulkAICategorize = async () => {
    if (selectedTransactions.size === 0) return;
    
    const selectedTransactionsList = Array.from(selectedTransactions)
      .map(id => transactions.find(t => t.id === id))
      .filter(t => t && !t.accountCode); // Only uncategorized transactions
    
    if (selectedTransactionsList.length === 0) {
      setNotification('No uncategorized transactions selected');
      return;
    }

    setBatchProgress({ current: 0, total: selectedTransactionsList.length, isProcessing: true });
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process transactions in batches of 3 to avoid overwhelming the API
    for (let i = 0; i < selectedTransactionsList.length; i += 3) {
      const batch = selectedTransactionsList.slice(i, i + 3);
      
      const batchPromises = batch.map(async (transaction) => {
        if (!transaction) return;
        
        try {
          const response = await fetch('/api/ai-categorize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transaction: {
                description: transaction.description,
                amount: transaction.amount
              },
              forceAI: true
            })
          });
          
          const result = await response.json();
          
          if (response.ok && result.accountCode) {
            onTransactionUpdate(transaction.id, {
              accountCode: result.accountCode,
              confidence: result.confidence
            });
            successCount++;
          } else {
            errorCount++;
          }
          
          setBatchProgress(prev => ({ ...prev, current: prev.current + 1 }));
        } catch (error) {
          console.error('Batch AI categorization error:', error);
          errorCount++;
          setBatchProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }
      });
      
      await Promise.all(batchPromises);
      
      // Small delay between batches to avoid rate limiting
      if (i + 3 < selectedTransactionsList.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    setBatchProgress({ current: 0, total: 0, isProcessing: false });
    setNotification(
      `AI categorization complete: ${successCount} successful, ${errorCount} failed`
    );
    setSelectedTransactions(new Set());
    setShowBulkActions(false);
  };

  const handleBulkUpdate = (updates: { id: string; accountCode: string }[]) => {
    updates.forEach(({ id, accountCode }) => {
      onTransactionUpdate(id, {
        accountCode,
        confidence: 95,
        isManuallyEdited: true
      });
    });
    setShowBulkSelector(false);
  };

  const handleAutoApproveHighConfidence = () => {
    const highConfidenceTransactions = filteredTransactions.filter(t => 
      (t.confidence ?? 0) >= 90 && t.accountCode && !t.isApproved
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
    const needsReview = transactions.filter(t => (t.confidence ?? 0) < 80 || !t.accountCode).length;
    const highConfidence = transactions.filter(t => (t.confidence ?? 0) >= 80 && t.accountCode).length;
    const approved = transactions.filter(t => t.isApproved).length;
    const readyToApprove = transactions.filter(t => (t.confidence ?? 0) >= 90 && t.accountCode && !t.isApproved).length;
    
    // AI Performance Stats
    const aiCategorized = transactions.filter(t => t.confidence !== undefined && t.confidence > 0).length;
    const aiSuccessRate = total > 0 ? Math.round((aiCategorized / total) * 100) : 0;
    const avgConfidence = aiCategorized > 0 ? 
      Math.round(transactions.filter(t => t.confidence !== undefined && t.confidence > 0)
        .reduce((sum, t) => sum + (t.confidence || 0), 0) / aiCategorized) : 0;
    
    // Calculate inflow vs outflow
    const inflow = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const outflow = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    return { total, needsReview, highConfidence, approved, readyToApprove, inflow, outflow, aiCategorized, aiSuccessRate, avgConfidence };
  }, [transactions]);

  // Auto-assignment logic removed - using account codes only

  // Auto-trigger AI categorization for low confidence transactions
  useEffect(() => {
    if (!aiEngine || !chartOfAccounts) return;
    
    const lowConfidenceTransactions = transactions.filter(t => 
      (t.confidence ?? 0) < 50 && !t.accountCode && !t.isApproved
    );
    
    if (lowConfidenceTransactions.length > 0) {
      console.log(`🤖 Auto-triggering AI categorization for ${lowConfidenceTransactions.length} low confidence transactions`);
      
      // Process them in batches to avoid overwhelming the API
      const processBatch = async (batch: Transaction[]) => {
        for (const transaction of batch) {
          try {
            const result = aiEngine.categorizeTransaction(transaction);
            if (result && result.confidence > 50) {
              handleAICategorize(transaction.id, result.accountCode, result.confidence);
              // Small delay between requests
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } catch (error) {
            console.error(`❌ Auto-categorization failed for transaction ${transaction.id}:`, error);
          }
        }
      };
      
      // Process in batches of 5
      const batchSize = 5;
      for (let i = 0; i < lowConfidenceTransactions.length; i += batchSize) {
        const batch = lowConfidenceTransactions.slice(i, i + batchSize);
        processBatch(batch);
      }
    }
  }, [transactions, aiEngine, chartOfAccounts]);

  // Defensive: Ensure all transactions have valid account codes
  useEffect(() => {
    if (!Array.isArray(transactions) || !accountCodes) return;
    let foundInvalid = false;
    transactions.forEach((txn) => {
      if (txn.accountCode && !accountCodes.includes(txn.accountCode)) {
        foundInvalid = true;
        // Auto-fix: set to blank
        onTransactionUpdate(txn.id, { accountCode: '' });
      }
    });
    if (foundInvalid) {
      setNotification('Some transactions had invalid account codes and were reset. Please review.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, accountCodes]);

  // Component mounted successfully

  useEffect(() => {
    // TransactionTable updated
  }, [filteredTransactions]);

  if (!chartOfAccounts) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-lg text-purple-600 font-semibold">
        Loading chart of accounts...
      </div>
    );
  }

  if (filteredTransactions.length === 0) {
    return (
      <div className="p-8 text-center text-lg text-red-500 bg-red-50 border border-red-200 rounded-lg">
        [DEBUG] No transactions to display. Table not rendered.
      </div>
    );
  }

  return (
    <div className="w-full max-w-none space-y-6">
      {/* Notification Toast */}
      {notification && (
        <NotificationToast message={notification} onClose={() => setNotification(null)} />
      )}
      
      {/* Batch Progress Indicator */}
      {batchProgress.isProcessing && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">
              AI Categorizing Transactions
            </span>
            <span className="text-sm text-blue-700">
              {batchProgress.current} / {batchProgress.total}
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}
      {/* Stats and Filters */}
      <div className="bg-white rounded-xl p-8 border border-purple-100/50 shadow-lg shadow-purple-500/5">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                              <AppIcons.financial.chart className="w-4 h-4 text-purple-600" />
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
            {/* AI Performance Indicator */}
            {stats.aiCategorized > 0 && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-blue-700 font-medium">
                  AI: {stats.aiSuccessRate}% ({stats.avgConfidence}% avg)
                </span>
              </div>
            )}
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
                              <AppIcons.actions.target className="w-4 h-4 mr-1" />
                Smart Select
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
                  <option value="uncategorized">Uncategorized</option>
                  <option value="low-confidence">Low Confidence (&lt;70%)</option>
                  <option value="high-confidence">High Confidence (≥90%)</option>
                  <option value="no-account">Missing Account</option>
                  <option value="unapproved">Unapproved</option>
                  <option value="large-amounts">Large Amounts (&gt;$100)</option>
                  <option value="small-amounts">Small Amounts (≤$50)</option>
                  <option value="this-month">This Month</option>
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
                <AppIcons.actions.ai className="w-5 h-5" />
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
                      const [accountCode] = e.target.value.split('|');
                      if (accountCode) handleBulkUpdate([{ id: '', accountCode }]);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 rounded-lg text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
                    defaultValue=""
                  >
                    <option value="">Select account...</option>
                    {accounts.map(account => (
                      <option key={account.code} value={`${account.code}|${account.name}`}>
                        {account.code} - {account.name}
                      </option>
                    ))}
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
                    onClick={handleBulkAICategorize}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 hover:scale-105 transition-all duration-300 font-medium shadow-lg shadow-blue-500/25"
                  >
                    <AppIcons.actions.ai className="w-4 h-4 mr-1" />
                    AI Categorize Selected
                  </button>
                  <button
                    onClick={handleBulkApprove}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 hover:scale-105 transition-all duration-300 font-medium shadow-lg shadow-purple-500/25"
                  >
                    <AppIcons.status.approved className="w-4 h-4 mr-1" />
                Approve All Selected
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
                    <AppIcons.actions.edit className="w-4 h-4 mr-1" />
                Mark as Manually Reviewed
                  </button>
                  <select
                    onChange={(e) => {
                      const [accountCode] = e.target.value.split('|');
                      if (accountCode) {
                        const updates = Array.from(selectedTransactions).map(id => ({ id, accountCode }));
                        handleBulkUpdate(updates);
                        setNotification(`Assigned ${accountCode} to ${updates.length} transactions`);
                        setSelectedTransactions(new Set());
                        setShowBulkActions(false);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 rounded-lg text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
                    defaultValue=""
                  >
                    <option value="">Bulk Account Assignment...</option>
                    {accounts.map(account => (
                      <option key={account.code} value={`${account.code}|${account.name}`}>
                        {account.code} - {account.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-slate-700">View:</span>
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                viewMode === 'table'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AppIcons.financial.chart className="w-4 h-4 mr-1" />
              Table View
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                viewMode === 'grouped'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AppIcons.categories.folder className="w-4 h-4 mr-1" />
              Grouped by Account
            </button>
          </div>
        </div>
        {viewMode === 'grouped' && (
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <button
              onClick={() => setExpandedGroups(new Set(Object.keys(groupedTransactions)))}
              className="px-2 py-1 text-xs bg-slate-100 rounded hover:bg-slate-200 transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={() => setExpandedGroups(new Set())}
              className="px-2 py-1 text-xs bg-slate-100 rounded hover:bg-slate-200 transition-colors"
            >
              Collapse All
            </button>
          </div>
        )}
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
        {viewMode === 'table' ? (
          <div className="overflow-x-auto min-w-full">
          <table className="w-full min-w-[1400px] divide-y divide-slate-100">
            <thead className="bg-gradient-to-r from-slate-25 to-slate-50">
              <tr>
                <th className="w-12 px-6 py-5 text-left">
                  <input
                    type="checkbox"
                    checked={selectedTransactions.size === filteredTransactions.length && filteredTransactions.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500 focus:ring-offset-0"
                  />
                </th>
                <th className="w-24 px-6 py-5 text-left text-xs font-medium text-slate-600 tracking-wide">
                  <SortableHeader field="date">Date</SortableHeader>
                </th>
                <th className="w-80 px-6 py-5 text-left text-xs font-medium text-slate-600 tracking-wide">
                  <SortableHeader field="description">Description</SortableHeader>
                </th>
                <th className="w-32 px-6 py-5 text-left text-xs font-medium text-slate-600 tracking-wide">
                  <SortableHeader field="amount">
                    <div className="flex items-center space-x-2">
                      <span>Amount</span>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                      </div>
                    </div>
                  </SortableHeader>
                </th>
                
                <th className="w-64 px-6 py-5 text-left text-xs font-medium text-slate-600 tracking-wide">
                  <SortableHeader field="account">Account</SortableHeader>
                </th>
                <th className="w-24 px-6 py-5 text-left text-xs font-medium text-slate-600 tracking-wide">
                  <SortableHeader field="taxRate">Tax</SortableHeader>
                </th>
                <th className="w-28 px-6 py-5 text-left text-xs font-medium text-slate-600 tracking-wide">
                  <SortableHeader field="confidence">AI Score</SortableHeader>
                </th>
                <th className="w-32 px-6 py-5 text-left text-xs font-medium text-slate-600 tracking-wide">
                  <SortableHeader field="status">Status</SortableHeader>
                </th>
                <th className="w-32 px-6 py-5 text-left text-xs font-medium text-slate-600 tracking-wide">
                  <SortableHeader field="feedback">Feedback</SortableHeader>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {/* DEBUG: Table Rendered */}
              <tr>
                <td colSpan={8} className="px-6 py-2 text-center text-xs text-blue-400 bg-blue-50">
                  Transaction Table loaded with {filteredTransactions.length} transactions
                </td>
              </tr>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    No transactions found matching the current filters.
                  </td>
                </tr>
              ) : (
                <>
                  {filteredTransactions.map((transaction, index) => {
                    // Defensive: skip rows with missing required fields
                    if (!transaction || !transaction.id || transaction.amount === undefined || transaction.description === undefined) {
                      console.warn('Skipping transaction with missing required fields:', transaction);
                      return null;
                    }
                    try {
                      // Special styling for E-Transfer and Bill Payment transactions
                      const isETransfer = transaction.description.toLowerCase().includes('e-transfer') || 
                                        transaction.description.toLowerCase().includes('e-tfr');
                      const isBillPayment = transaction.description.toLowerCase().includes('bill payment') ||
                                          transaction.description.toLowerCase().includes('bill pay');
                      
                      const rowClass = isBillPayment ? 'bg-green-50/40' : 
                                      'hover:bg-slate-50/50';
                      
                      return (
                        <tr key={transaction.id} className={`${rowClass} border-b border-slate-50 transition-all duration-200 hover:bg-slate-25`}>
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedTransactions.has(transaction.id)}
                          onChange={(e) => handleSelectTransaction(transaction.id, e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500 focus:ring-offset-0"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                        {new Date(transaction.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                        <div className="font-medium text-slate-900 truncate" title={transaction.description}>
                          {transaction.description}
                        </div>
                        {transaction.merchant && (
                          <div className="text-xs text-slate-500 truncate mt-0.5">
                            {transaction.merchant}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="text-right">
                          <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${
                            transaction.amount >= 0 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {transaction.amount >= 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm"> 
  {editingId === transaction.id && editingField === 'account' ? (
    <select
      autoFocus
      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
      value={transaction.accountCode || ''}
      onChange={e => handleAccountChange(transaction.id, e.target.value)}
      onBlur={() => { setEditingId(null); setEditingField(null); }}
    >
      <option value="">Select account...</option>
      {accounts.map(account => (
        <option key={account.code} value={account.code}>
          {account.code} - {account.name}
        </option>
      ))}
    </select>
  ) : (transaction.description.toLowerCase().includes('e-transfer') || transaction.description.toLowerCase().includes('cheque')) && (!transaction.accountCode || getAccountName(transaction.accountCode) === 'Uncategorized') ? (
    <button
      className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
      onClick={() => { setEditingId(transaction.id); setEditingField('account'); }}
    >
      <AppIcons.status.warning className="w-3 h-3 mr-1" />
      Manual Entry
    </button>
  ) : getAccountName(transaction.accountCode) === 'Uncategorized' ? (
    <button
      className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors"
      onClick={() => { setEditingId(transaction.id); setEditingField('account'); }}
    >
      Uncategorized
    </button>
  ) : (
    <div className="flex items-center space-x-2">
      <div className="flex flex-col">
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
          {getAccountName(transaction.accountCode)}
        </span>
        <span className="text-xs text-slate-400 mt-1">
          Code: {transaction.accountCode}
        </span>
      </div>
      <button
        onClick={() => { setEditingId(transaction.id); setEditingField('account'); }}
        className="text-slate-400 hover:text-slate-600 transition-colors"
        title="Edit account"
      >
        <AppIcons.actions.edit className="w-3 h-3" />
      </button>
    </div>
  )}
</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {(() => {
                          const taxRate = getTaxRate(transaction);
                          return (
                            <span className="text-xs text-slate-500">
                              {taxRate !== undefined ? `${taxRate}%` : '—'}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {transaction.confidence !== undefined && 
                         transaction.accountCode && 
                         transaction.accountCode !== '' && 
                         transaction.accountCode !== 'uncategorized' &&
                         getAccountName(transaction.accountCode) !== 'Uncategorized' && (
                          <div className="flex items-center space-x-1">
                            <div className={`w-2 h-2 rounded-full ${
                              (transaction.confidence ?? 0) >= 90 
                                ? 'bg-emerald-500' 
                                : (transaction.confidence ?? 0) >= 70 
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}></div>
                            <span className="text-xs text-slate-500">
                              {transaction.confidence ?? 0}%
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          {/* AI Categorization Button */}
                          {!transaction.isApproved && (
                            <AICategorizationButton
                              transaction={transaction}
                              onCategorize={(accountCode, confidence) => handleAICategorize(transaction.id, accountCode, confidence)}
                              province={province}
                              onKeywordAdded={(keyword, accountCode) => {
                                setNotification(`Added keyword "${keyword}" for account ${accountCode}`);
                              }}
                            />
                          )}
                          
                          {/* Approval Button */}
                          {!transaction.isApproved && (
                            <button
                              onClick={() => handleApprove(transaction.id)}
                              disabled={!transaction.accountCode}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                transaction.accountCode
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed'
                              }`}
                              title={transaction.accountCode ? 'Approve this transaction' : 'Set account first'}
                            >
                              {!transaction.accountCode ? 'Set Account' : 'Approve'}
                            </button>
                          )}
                          {transaction.isApproved && (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-700">
                              <AppIcons.status.approved className="w-3 h-3 mr-1" />
                              Approved
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {transaction.accountCode && !transaction.feedback && (
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleFeedback(transaction.id, true)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              title="Correct"
                            >
                              <AppIcons.feedback.thumbsUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleFeedback(transaction.id, false)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Incorrect"
                            >
                              <AppIcons.feedback.thumbsDown className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        {transaction.feedback && (
                          <div className="flex items-center space-x-1">
                            <div className={`w-2 h-2 rounded-full ${
                              transaction.feedback.isCorrect ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}></div>
                            <span className="text-xs text-slate-500">
                              {transaction.feedback.isCorrect ? 'Correct' : 'Fixed'}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                } catch (error) {
                  console.error('Error rendering transaction row:', error, transaction);
                  return (
                    <tr key={`error-${index}`} className="bg-red-50 border-b">
                      <td colSpan={8} className="px-6 py-4 text-center text-red-600">
                        Error rendering transaction: {transaction?.description || 'Unknown'}
                      </td>
                    </tr>
                  );
                }
              })}
                  {/* Fallback message if no rows were rendered */}
                  {filteredTransactions.length > 0 && filteredTransactions.every(t => 
                    !t || !t.id || t.amount === undefined || t.description === undefined
                  ) && (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 text-center text-red-600 bg-red-50">
                        ⚠️ All transactions have missing required fields. Check console for details.
                      </td>
                    </tr>
                  )}
                  {/* FINAL FORCED FALLBACK ROW */}
                  <tr>
                    <td colSpan={8} className="px-6 py-2 text-center text-xs text-purple-400 bg-purple-50">
                      [DEBUG] End of TransactionTable body. If you see only this row, no transactions were rendered.
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
        ) : (
          /* Grouped View */
          <div className="p-6">
            {Object.keys(groupedTransactions).length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                No transactions match the current filter.
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedTransactions)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([accountCode, groupTransactions]) => {
                    const isExpanded = expandedGroups.has(accountCode);
                    const groupTotal = groupTransactions.reduce((sum, t) => sum + t.amount, 0);
                    const accountName = getAccountName(accountCode);
                    
                    return (
                      <div key={accountCode} className="border border-slate-200 rounded-lg overflow-hidden">
                        {/* Group Header */}
                        <div 
                          className="flex items-center justify-between p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                          onClick={() => toggleGroup(accountCode)}
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-slate-400 transition-transform duration-200" style={{
                              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
                            }}>
                              ▶
                            </span>
                            <div className="flex items-center space-x-3">
                              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 text-white text-lg font-bold rounded-xl shadow-lg">
                                {accountCode}
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-900 text-lg">
                                  Account {accountCode}
                                </h3>
                                <p className="text-sm text-slate-600 font-medium">
                                  {accountName}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {groupTransactions.length} transaction{groupTransactions.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                              groupTotal >= 0 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {groupTotal >= 0 ? '+' : ''}${groupTotal.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        
                        {/* Group Content */}
                        {isExpanded && (
                          <div className="p-4 bg-white">
                            <div className="grid gap-3">
                              {groupTransactions.map((transaction) => {
                                const isETransfer = transaction.description.toLowerCase().includes('e-transfer') || 
                                                  transaction.description.toLowerCase().includes('e-tfr');
                                const isBillPayment = transaction.description.toLowerCase().includes('bill payment') ||
                                                    transaction.description.toLowerCase().includes('bill pay');
                                
                                return (
                                  <div 
                                    key={transaction.id} 
                                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                                  >
                                    <div className="flex items-center space-x-3 flex-1">
                                      <input
                                        type="checkbox"
                                        checked={selectedTransactions.has(transaction.id)}
                                        onChange={(e) => handleSelectTransaction(transaction.id, e.target.checked)}
                                        className="rounded text-purple-600 focus:ring-purple-500 border-slate-300"
                                      />
                                      <div className="flex-1">
                                        <div className="font-medium text-slate-900 text-sm">
                                          {transaction.description}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                          {transaction.date}
                                          {transaction.merchant && ` • ${transaction.merchant}`}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-3">
                                      {/* Account Section */}
                                      <div className="w-64 px-3 py-2">
                                        {editingId === transaction.id && editingField === 'account' ? (
                                          <select
                                            value={transaction.accountCode || ''}
                                            onChange={(e) => {
                                              handleAccountChange(transaction.id, e.target.value);
                                              setEditingId(null);
                                              setEditingField(null);
                                            }}
                                            onBlur={() => {
                                              setEditingId(null);
                                              setEditingField(null);
                                            }}
                                            className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            autoFocus
                                          >
                                            <option value="">Select Account</option>
                                            {accounts.map(account => (
                                              <option key={account.code} value={account.code}>
                                                {account.code} - {account.name}
                                              </option>
                                            ))}
                                          </select>
                                        ) : (
                                          <div className="flex items-center space-x-2">
                                            <div className="flex-1">
                                              {transaction.accountCode ? (
                                                <div className="space-y-1">
                                                  <div className="text-sm font-medium text-slate-800">
                                                    {getAccountName(transaction.accountCode)}
                                                  </div>
                                                  <div className="text-xs text-slate-500">
                                                    Code: {transaction.accountCode}
                                                  </div>
                                                </div>
                                              ) : (
                                                <div className="text-sm text-slate-400 italic">
                                                  No account assigned
                                                </div>
                                              )}
                                            </div>
                                            <button
                                              onClick={() => {
                                                setEditingId(transaction.id);
                                                setEditingField('account');
                                              }}
                                              className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                                              title="Edit account"
                                            >
                                              <CommonIcons.edit.icon className="w-3 h-3" />
                                            </button>
                                          </div>
                                        )}
                                      </div>

                                      {/* Amount Pill */}
                                      <div className="relative px-3 py-1.5 rounded-lg font-bold text-sm backdrop-blur-xl border border-white/30 bg-white/10 shadow-sm">
                                        <div className={`relative z-10 font-semibold ${
                                          transaction.amount >= 0 
                                            ? 'text-green-700' 
                                            : 'text-red-700'
                                        }`}>
                                          {transaction.amount >= 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                                        </div>
                                      </div>
                                      
                                      {/* Confidence Badge */}
                                      {transaction.confidence !== undefined && 
                                       transaction.accountCode && 
                                       transaction.accountCode !== '' && 
                                       transaction.accountCode !== 'uncategorized' &&
                                       getAccountName(transaction.accountCode) !== 'Uncategorized' && (
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                          (transaction.confidence ?? 0) >= 90 
                                            ? 'bg-green-100 text-green-800' 
                                            : (transaction.confidence ?? 0) >= 70 
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-red-100 text-red-800'
                                        }`}>
                                          {transaction.confidence ?? 0}%
                                        </span>
                                      )}
                                      
                                      {/* AI Categorization Button */}
                                      {!transaction.isApproved && (
                                        <AICategorizationButton
                                          transaction={transaction}
                                          onCategorize={(accountCode, confidence) => handleAICategorize(transaction.id, accountCode, confidence)}
                                          province={province}
                                          onKeywordAdded={(keyword, accountCode) => {
                                            setNotification(`Added keyword "${keyword}" for account ${accountCode}`);
                                          }}
                                        />
                                      )}
                                      
                                      {/* Actions */}
                                      <div className="flex items-center space-x-1">
                                        {!transaction.isApproved && (
                                          <button
                                            onClick={() => handleApprove(transaction.id)}
                                            disabled={!transaction.accountCode}
                                            className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
                                              transaction.accountCode
                                                ? 'bg-green-500 text-white hover:bg-green-600'
                                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                            }`}
                                            title={transaction.accountCode ? 'Approve this transaction' : 'Set account first'}
                                          >
                                            <AppIcons.status.approved className="w-3 h-3" />
                                          </button>
                                        )}
                                        {transaction.isApproved && (
                                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                            ✓
                                          </span>
                                        )}
                                      </div>
                                      
                                      {/* Feedback Section */}
                                      {transaction.accountCode && !transaction.feedback && (
                                        <div className="flex items-center space-x-1">
                                          <button
                                            onClick={() => handleFeedback(transaction.id, true)}
                                            className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors text-xs"
                                            title="Categorization is correct"
                                          >
                                            <AppIcons.feedback.thumbsUp className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={() => handleFeedback(transaction.id, false)}
                                            className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors text-xs"
                                            title="Categorization needs correction"
                                          >
                                            <AppIcons.feedback.thumbsDown className="w-3 h-3" />
                                          </button>
                                        </div>
                                      )}
                                      {transaction.feedback && (
                                        <div className="flex items-center space-x-1">
                                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            transaction.feedback.isCorrect 
                                              ? 'bg-green-100 text-green-800' 
                                              : 'bg-red-100 text-red-800'
                                          }`}>
                                            {transaction.feedback.isCorrect ? (
                                              <AppIcons.feedback.correct className="w-3 h-3" />
                                            ) : (
                                              <AppIcons.feedback.incorrect className="w-3 h-3" />
                                            )}
                                          </span>
                                          <button
                                            onClick={() => clearFeedback(transaction.id)}
                                            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors text-xs"
                                            title="Clear feedback"
                                          >
                                            ×
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
        
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