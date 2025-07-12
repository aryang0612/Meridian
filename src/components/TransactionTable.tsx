'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Transaction } from '../lib/types';
import { ChartOfAccounts } from '../lib/chartOfAccounts';
import { AIEngine } from '../lib/aiEngine';
import { UnifiedCategorizationEngine } from '../lib/unifiedCategorizationEngine';
import BulkCategorySelector from './BulkCategorySelector';
import AICategorizationButton from './AICategorizationButton';
import SaveRulePopup from './SaveRulePopup';

import { AppIcons, CommonIcons, IconSizes } from '../lib/iconSystem';

interface Props {
  transactions: Transaction[];
  onTransactionUpdate: (id: string, updates: Partial<Transaction>) => void;
  aiEngine?: AIEngine | null;
  province?: string;
}

export default function TransactionTable({ transactions, onTransactionUpdate, aiEngine, province = 'ON' }: Props) {
  const [notification, setNotification] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'needs-review' | 'high-confidence'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showSmartSelect, setShowSmartSelect] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grouped'>('table');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [manualProgress, setManualProgress] = useState<{ recentlyUpdated: Set<string>; showProgress: boolean }>({ recentlyUpdated: new Set(), showProgress: false });
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; isProcessing: boolean }>({ current: 0, total: 0, isProcessing: false });
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [bulkCategorySuggestion, setBulkCategorySuggestion] = useState<{
    show: boolean;
    sourceTransaction: Transaction | null;
    similarTransactions: Transaction[];
    suggestedAccount: string;
  }>({ show: false, sourceTransaction: null, similarTransactions: [], suggestedAccount: '' });
  
  // State for tracking selected transactions in bulk modal
  const [bulkModalSelectedTransactions, setBulkModalSelectedTransactions] = useState<Set<string>>(new Set());
  
  // State for tracking which transaction is having its account changed in grouped view
  const [changingAccountId, setChangingAccountId] = useState<string | null>(null);

  // Force re-render when Chart of Accounts is updated
  const [chartUpdateTrigger, setChartUpdateTrigger] = useState(0);

  // State for Save Rule Popup
  const [saveRulePopup, setSaveRulePopup] = useState<{
    isOpen: boolean;
    transaction: { id: string; description: string; accountCode: string; } | null;
  }>({ isOpen: false, transaction: null });

  // Sorting state
  const [sortField, setSortField] = useState<'date' | 'description' | 'amount' | 'account' | 'confidence' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && bulkCategorySuggestion.show) {
        handleRejectBulkCategorization();
      }
      if (e.key === 'Escape' && changingAccountId) {
        setChangingAccountId(null);
      }
    };
    
    if (bulkCategorySuggestion.show) {
      console.log('🔍 Modal is showing, state:', bulkCategorySuggestion);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    } else {
      console.log('🔍 Modal is hidden');
    }
  }, [bulkCategorySuggestion.show, changingAccountId]);
  
  // Close account change dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (changingAccountId && !(event.target as Element).closest('.account-dropdown')) {
        setChangingAccountId(null);
      }
    };
    
    if (changingAccountId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [changingAccountId]);



  // Use singleton Chart of Accounts instance
  const chartOfAccounts = useMemo(() => ChartOfAccounts.getInstance(province), [province]);

  // Ensure chart of accounts is loaded for the current province
  useEffect(() => {
    console.log(`📊 TransactionTable: Province changed to ${province}, reinitializing Chart of Accounts...`);
    
    const initializeAccounts = async () => {
      setIsLoadingAccounts(true);
      try {
        await chartOfAccounts.setProvince(province);
        await chartOfAccounts.waitForInitialization();
        console.log(`✅ TransactionTable: Chart of Accounts ready for province ${province}`);
      } catch (error) {
        console.error('❌ TransactionTable: Failed to initialize chart of accounts:', error);
      } finally {
        setIsLoadingAccounts(false);
      }
    };
    
    initializeAccounts();
  }, [province, chartOfAccounts]);

  // Simple stats calculation
  const stats = useMemo(() => {
    const total = transactions.length;
    const needsReview = transactions.filter(t => !t.accountCode || (t.confidence || 0) < 70).length;
    const highConfidence = transactions.filter(t => (t.confidence || 0) >= 90 && t.accountCode).length;
    const approved = transactions.filter(t => t.isApproved).length;
    return { total, needsReview, highConfidence, approved };
  }, [transactions]);

  // Simple categorization progress
  const categorizationProgress = useMemo(() => {
    const total = transactions.length;
    const categorized = transactions.filter(t => t.accountCode && t.accountCode !== '').length;
    const approved = transactions.filter(t => t.isApproved).length;
    const needsReview = transactions.filter(t => !t.accountCode || (t.confidence || 0) < 70).length;
    const highConfidence = transactions.filter(t => (t.confidence || 0) >= 90 && t.accountCode).length;
    
    return {
      total,
      categorized,
      approved,
      needsReview,
      highConfidence,
      categorizedPercentage: total > 0 ? Math.round((categorized / total) * 100) : 0
    };
  }, [transactions]);

  // Get available account codes
  const accountCodes = useMemo(() => {
    if (isLoadingAccounts || !chartOfAccounts.isReady()) {
      return [];
    }
    const availableAccounts = chartOfAccounts.getAllAccounts();
    return availableAccounts.map(account => account.code).sort();
  }, [chartOfAccounts, isLoadingAccounts]);

  const accounts = useMemo(() => {
    if (isLoadingAccounts || !chartOfAccounts.isReady()) {
      return [];
    }
    return chartOfAccounts.getAllAccounts();
  }, [chartOfAccounts, isLoadingAccounts]);

  // Handle sorting function
  const handleSort = (field: 'date' | 'description' | 'amount' | 'account' | 'confidence') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Simple filtered and sorted transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(transaction => 
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (filter === 'needs-review') {
      filtered = filtered.filter(t => !t.accountCode || (t.confidence || 0) < 70);
    } else if (filter === 'high-confidence') {
      filtered = filtered.filter(t => (t.confidence || 0) >= 90 && t.accountCode);
    }

    // Apply sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any;
        let bValue: any;

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
            aValue = a.amount;
            bValue = b.amount;
            break;
          case 'account':
            aValue = getAccountName(a.accountCode).toLowerCase();
            bValue = getAccountName(b.accountCode).toLowerCase();
            break;
          case 'confidence':
            aValue = a.confidence || 0;
            bValue = b.confidence || 0;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [transactions, searchTerm, filter, sortField, sortDirection]);

  // Simple grouped transactions
  const groupedTransactions = useMemo(() => {
    const grouped: { [key: string]: Transaction[] } = {};
    filteredTransactions.forEach(transaction => {
      const key = transaction.accountCode || 'Uncategorized';
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(transaction);
    });
    return grouped;
  }, [filteredTransactions]);

  // Helper function to get account name
  const getAccountName = (accountCode: string | undefined): string => {
    if (!accountCode) return 'Uncategorized';
    const account = chartOfAccounts.getAccount(accountCode);
    return account?.name || 'Uncategorized';
  };

  // Memoized helper function to get tax rate from account
  const getTaxRate = useMemo(() => {
    const cache = new Map<string, number | undefined>();
    
    return (accountCode: string | undefined): number | undefined => {
      if (!accountCode) return undefined;
      
      // Return cached value if available
      if (cache.has(accountCode)) {
        return cache.get(accountCode);
      }
      
      // Only check if chart of accounts is ready
      if (!chartOfAccounts.isReady()) {
        return undefined;
      }
      
      const account = chartOfAccounts.getAccount(accountCode);
      if (!account || !account.taxCode) {
        cache.set(accountCode, undefined);
        return undefined;
      }
      
      // Extract percentage from tax code (e.g., "ON - HST on Sales (13%)" -> 13)
      const match = account.taxCode.match(/\((\d+(?:\.\d+)?)%\)/);
      const taxRate = match ? parseFloat(match[1]) : undefined;
      
      // Cache the result
      cache.set(accountCode, taxRate);
      return taxRate;
    };
  }, [chartOfAccounts, chartUpdateTrigger]);

  useEffect(() => {
    // Trigger re-render when Chart of Accounts is ready
    if (!isLoadingAccounts && chartOfAccounts.isReady()) {
      setChartUpdateTrigger(prev => prev + 1);
      console.log(`🔄 TransactionTable: Forcing re-render due to Chart of Accounts update`);
    }
  }, [isLoadingAccounts, chartOfAccounts, province]);

  // Helper function to extract core merchant name from transaction description
  const extractMerchantName = (description: string): string => {
    // Convert to uppercase for consistent comparison
    let cleaned = description.toUpperCase().trim();
    
    // Remove common transaction metadata patterns
    cleaned = cleaned
      // Remove trailing numbers/codes (like "13824", "98765")
      .replace(/\s+\d{3,}$/g, '')
      // Remove common location codes (CA, ON, AB, etc.)
      .replace(/\s+(CA|ON|AB|BC|QC|MB|SK|NS|NB|PE|NL|YT|NT|NU)$/g, '')
      // Remove phone numbers and reference codes
      .replace(/\s+\d{3}-\d{3}-\d{4}/g, '')
      .replace(/\s+\d{10,}/g, '')
      // Remove common payment indicators
      .replace(/\s+(PAYMENT|PAY|BILL|BILLING)$/g, '')
      // Remove location/address patterns
      .replace(/\s+#\d+/g, '') // Remove location numbers like "#34"
      .replace(/\s+\d+\s+[A-Z\s]+$/g, '') // Remove addresses like "4617 BEECH HILL"
      // Remove trailing single letters/numbers
      .replace(/\s+[A-Z]$/g, '')
      .replace(/\s+\d$/g, '')
      .trim();
    
    return cleaned;
  };

  // Helper function to find truly similar transactions (same merchant, different reference numbers)
  const findSimilarTransactions = (targetTransaction: Transaction): Transaction[] => {
    const targetMerchant = extractMerchantName(targetTransaction.description);
    
    // Don't suggest bulk categorization for very generic descriptions
    if (targetMerchant.length < 3 || 
        ['UNKNOWN', 'MISC', 'PAYMENT', 'TRANSFER', 'DEPOSIT', 'WITHDRAWAL'].includes(targetMerchant)) {
      return [];
    }
    
    console.log(`🔍 Extracted merchant name: "${targetMerchant}" from "${targetTransaction.description}"`);
    
    const similar = transactions.filter(transaction => {
      if (transaction.id === targetTransaction.id) {
        return false;
      }
      
      const transactionMerchant = extractMerchantName(transaction.description);
      
      // Exact merchant name match
      const exactMatch = transactionMerchant === targetMerchant;
      
      // Very close merchant name match (for slight variations)
      const veryCloseMatch = targetMerchant.length > 5 && transactionMerchant.length > 5 && 
        (transactionMerchant.includes(targetMerchant) || targetMerchant.includes(transactionMerchant));
      
      // For longer merchant names, allow minor variations
      const closeMatch = targetMerchant.length >= 8 && transactionMerchant.length >= 8 &&
        Math.abs(targetMerchant.length - transactionMerchant.length) <= 3 &&
        targetMerchant.substring(0, Math.min(6, targetMerchant.length)) === 
        transactionMerchant.substring(0, Math.min(6, transactionMerchant.length));
      
      return exactMatch || veryCloseMatch || closeMatch;
    });
    
    // Only include transactions that aren't already categorized with the same account
    const filteredSimilar = similar.filter(transaction => {
      return !transaction.accountCode || 
             transaction.accountCode === '453' || // Default fallback account
             (transaction.confidence && transaction.confidence < 70) || // Low confidence
             transaction.accountCode !== targetTransaction.accountCode; // Different category
    });
    
    console.log(`🔍 Found ${filteredSimilar.length} truly similar transactions for merchant "${targetMerchant}"`);
    if (filteredSimilar.length > 0) {
      console.log('📋 Similar merchant transactions:', filteredSimilar.map(t => `"${t.description}"`));
    }
    
    return filteredSimilar;
  };

  // Helper function to group similar transactions by exact description matches
  const groupSimilarTransactionsByExactMatch = (transactions: Transaction[]): { exactGroups: Transaction[][]; standaloneTransactions: Transaction[] } => {
    const exactGroups: Transaction[][] = [];
    const grouped = new Set<string>();
    const standaloneTransactions: Transaction[] = [];
    
    transactions.forEach(transaction => {
      if (grouped.has(transaction.id)) return;
      
      // Find transactions with exact description match
      const exactMatches = transactions.filter(t => 
        t.id !== transaction.id && 
        !grouped.has(t.id) && 
        t.description.trim() === transaction.description.trim()
      );
      
      if (exactMatches.length > 0) {
        // Create a group with the original transaction and its exact matches
        const group = [transaction, ...exactMatches];
        exactGroups.push(group);
        group.forEach(t => grouped.add(t.id));
      } else {
        // Standalone transaction
        standaloneTransactions.push(transaction);
        grouped.add(transaction.id);
      }
    });
    
    return { exactGroups, standaloneTransactions };
  };

  // Show save rule popup
  const showSaveRulePopup = (transaction: Transaction, accountCode: string) => {
    setSaveRulePopup({
      isOpen: true,
      transaction: {
        id: transaction.id,
        description: transaction.description,
        accountCode: accountCode
      }
    });
  };

  // Handle saving user categorization rule
  const handleSaveRule = async (keyword: string, accountCode: string, matchType: 'contains' | 'fuzzy' | 'regex' | 'exact') => {
    try {
      const unifiedEngine = UnifiedCategorizationEngine.getInstance(province);
      await unifiedEngine.saveUserRule(keyword, accountCode, matchType);
      setNotification(`✅ Rule saved! Future transactions containing "${keyword}" will be categorized to ${getAccountName(accountCode)}`);
      setSaveRulePopup({ isOpen: false, transaction: null });
    } catch (error) {
      console.error('Failed to save rule:', error);
      setNotification('❌ Failed to save rule. Please try again.');
    }
  };

  // Enhanced handlers for bulk changes in grouped view
  const handleAccountChange = (id: string, accountCode: string) => {
    try {
      // Check if we're in grouped view and have multiple transactions selected
      if (viewMode === 'grouped' && selectedTransactions.size > 1 && selectedTransactions.has(id)) {
        // Find which group this transaction belongs to
        const sourceTransaction = transactions.find(t => t.id === id);
        if (sourceTransaction) {
          const sourceGroupKey = sourceTransaction.accountCode || 'Uncategorized';
          
          // Find all selected transactions in the same group
          const selectedInSameGroup = Array.from(selectedTransactions).filter(selectedId => {
            const transaction = transactions.find(t => t.id === selectedId);
            if (!transaction) return false;
            const transactionGroupKey = transaction.accountCode || 'Uncategorized';
            return transactionGroupKey === sourceGroupKey;
          });
          
          if (selectedInSameGroup.length > 1) {
            // Apply account change to all selected transactions in this group
            selectedInSameGroup.forEach(transactionId => {
              onTransactionUpdate(transactionId, { accountCode });
            });
            
            setNotification(`Updated ${selectedInSameGroup.length} selected transactions to ${getAccountName(accountCode)}`);
            setManualProgress(prev => ({ 
              ...prev, 
              recentlyUpdated: new Set([...prev.recentlyUpdated, ...selectedInSameGroup]) 
            }));
            
            // Don't show bulk categorization modal for manual bulk changes
            return;
          }
        }
      }
      
      // Single transaction update (original behavior)
      onTransactionUpdate(id, { accountCode });
      setManualProgress(prev => ({ ...prev, recentlyUpdated: new Set([...prev.recentlyUpdated, id]) }));

      // Show save rule popup for manual categorizations (not when clearing)
      if (accountCode) {
        const sourceTransaction = transactions.find(t => t.id === id);
        if (sourceTransaction) {
          // Small delay to ensure the transaction update is processed first
          setTimeout(() => {
            showSaveRulePopup(sourceTransaction, accountCode);
          }, 100);
        }
      }
        
      // Show bulk categorization suggestion if account is being set (not cleared)
      if (accountCode) {
        const sourceTransaction = transactions.find(t => t.id === id);
        console.log(`🔍 Checking for similar transactions to "${sourceTransaction?.description}"`);
        
        if (sourceTransaction) {
          const similarTransactions = findSimilarTransactions(sourceTransaction);
          console.log(`🔍 Found ${similarTransactions.length} similar transactions`);
          
          if (similarTransactions.length > 0) {
            console.log(`✅ Showing bulk categorization modal for ${similarTransactions.length} similar transactions`);
            setBulkCategorySuggestion({
              show: true,
              sourceTransaction,
              similarTransactions,
              suggestedAccount: accountCode
            });
            // Initialize all transactions as selected by default
            setBulkModalSelectedTransactions(new Set(similarTransactions.map(t => t.id)));
          }
        }
      }
      
    } catch (error) {
      console.error('Error updating transaction:', error);
      setNotification('Error updating transaction');
    }
  };

  // Individual AI categorization handler
  const handleIndividualAICategorize = (transactionId: string, accountCode: string, confidence: number) => {
    onTransactionUpdate(transactionId, { accountCode, confidence });
    setNotification(`AI categorized transaction to ${getAccountName(accountCode)}`);
    
    // Show save rule popup for AI categorizations too
    const sourceTransaction = transactions.find(t => t.id === transactionId);
    if (sourceTransaction) {
      setTimeout(() => {
        showSaveRulePopup(sourceTransaction, accountCode);
      }, 100);
    }
    
    // Show bulk categorization suggestion for AI categorization as well
    if (sourceTransaction) {
      const similarTransactions = findSimilarTransactions(sourceTransaction);
      if (similarTransactions.length > 0) {
        console.log('🤖 AI categorization triggering bulk modal:', {
          sourceTransaction: sourceTransaction?.description,
          similarCount: similarTransactions.length,
          suggestedAccount: accountCode,
          accountName: getAccountName(accountCode)
        });
        setBulkCategorySuggestion({
          show: true,
          sourceTransaction,
          similarTransactions,
          suggestedAccount: accountCode
        });
        // Initialize all transactions as selected by default
        setBulkModalSelectedTransactions(new Set(similarTransactions.map(t => t.id)));
      }
    }
  };

  // Individual approve handler
  const handleIndividualApprove = (transactionId: string) => {
    onTransactionUpdate(transactionId, { isApproved: true });
    setNotification('Transaction approved');
  };

  // Individual unapprove handler
  const handleIndividualUnapprove = (transactionId: string) => {
    onTransactionUpdate(transactionId, { isApproved: false });
    setNotification('Transaction approval removed');
  };

  const handleSmartSelect = (criteria: string) => {
    let transactionsToSelect: Transaction[] = [];
    
    switch (criteria) {
      case 'uncategorized':
        transactionsToSelect = filteredTransactions.filter(t => !t.accountCode);
        break;
      case 'low-confidence':
        transactionsToSelect = filteredTransactions.filter(t => (t.confidence || 0) < 70);
        break;
      case 'high-confidence':
        transactionsToSelect = filteredTransactions.filter(t => (t.confidence || 0) >= 90);
        break;
      default:
        transactionsToSelect = [];
    }
    
    const newSelected = new Set(transactionsToSelect.map(t => t.id));
    setSelectedTransactions(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleBulkUpdate = (updates: { id: string; accountCode: string }[]) => {
    console.log('🔄 handleBulkUpdate called with:', updates);
    updates.forEach(update => {
      console.log(`🔄 Updating transaction ${update.id} with account code ${update.accountCode}`);
      onTransactionUpdate(update.id, { accountCode: update.accountCode });
    });
    setNotification(`Updated ${updates.length} transactions`);
  };

  // Bulk categorization handlers
  const handleAcceptBulkCategorization = () => {
    console.log('🎯 handleAcceptBulkCategorization called');
    console.log('🎯 bulkCategorySuggestion:', bulkCategorySuggestion);
    console.log('🎯 Selected transactions:', bulkModalSelectedTransactions);
    
    try {
      // Use selected transactions if any are selected, otherwise use all similar transactions
      const transactionsToUpdate = bulkModalSelectedTransactions.size > 0 
        ? bulkCategorySuggestion.similarTransactions.filter(t => bulkModalSelectedTransactions.has(t.id))
        : bulkCategorySuggestion.similarTransactions;
        
      if (transactionsToUpdate.length > 0) {
        const updates = transactionsToUpdate.map(t => ({
          id: t.id,
          accountCode: bulkCategorySuggestion.suggestedAccount
        }));
        console.log('🎯 Updates to be applied:', updates);
        handleBulkUpdate(updates);
        
        const updateCount = updates.length;
        const totalCount = bulkCategorySuggestion.similarTransactions.length;
        const message = updateCount === totalCount 
          ? `Applied ${getAccountName(bulkCategorySuggestion.suggestedAccount)} to ${updateCount} similar transactions`
          : `Applied ${getAccountName(bulkCategorySuggestion.suggestedAccount)} to ${updateCount} of ${totalCount} selected transactions`;
        setNotification(message);
      } else {
        console.log('🎯 No transactions selected to update');
        setNotification('No transactions selected to update');
        }
      } catch (error) {
      console.error('Error in bulk categorization:', error);
      setNotification('Error applying bulk categorization');
    } finally {
      // Always close the modal and clear selection
      setBulkCategorySuggestion({ show: false, sourceTransaction: null, similarTransactions: [], suggestedAccount: '' });
      setBulkModalSelectedTransactions(new Set());
      document.body.style.overflow = 'unset'; // Ensure scroll is restored
    }
  };

  const handleRejectBulkCategorization = () => {
    console.log('🔄 Closing bulk categorization modal');
    setBulkCategorySuggestion({ show: false, sourceTransaction: null, similarTransactions: [], suggestedAccount: '' });
    setBulkModalSelectedTransactions(new Set());
    document.body.style.overflow = 'unset'; // Ensure scroll is restored
  };

  const handleBulkApprove = () => {
    selectedTransactions.forEach(id => {
      onTransactionUpdate(id, { isApproved: true });
    });
    setSelectedTransactions(new Set());
    setShowBulkActions(false);
    setNotification(`Approved ${selectedTransactions.size} transactions`);
  };



  const toggleGroup = (accountCode: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(accountCode)) {
      newExpanded.delete(accountCode);
    } else {
      newExpanded.add(accountCode);
    }
    setExpandedGroups(newExpanded);
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

  // Handle select all for a specific group
  const handleGroupSelectAll = (accountCode: string, checked: boolean) => {
    const groupTransactions = groupedTransactions[accountCode] || [];
    const newSelected = new Set(selectedTransactions);
    
    if (checked) {
      groupTransactions.forEach(t => newSelected.add(t.id));
    } else {
      groupTransactions.forEach(t => newSelected.delete(t.id));
    }
    
    setSelectedTransactions(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  // Handle uncategorizing a transaction
  const handleUncategorize = (transactionId: string) => {
    onTransactionUpdate(transactionId, { accountCode: '', confidence: 0 });
    setNotification('Transaction uncategorized');
  };

  // Notification Toast Component
  const NotificationToast = ({ message, onClose }: { message: string; onClose: () => void }) => {
    useEffect(() => {
      const timer = setTimeout(() => onClose(), 3000);
      return () => clearTimeout(timer);
    }, [onClose]);

    return (
      <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
        <div className="flex items-center space-x-2">
          <span>{message}</span>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            ×
          </button>
        </div>
      </div>
    );
  };

  // Searchable Account Dropdown Component
  const SearchableAccountDropdown = ({ 
    currentValue, 
    onSelect, 
    placeholder = "Select account..." 
  }: { 
    currentValue: string; 
    onSelect: (accountCode: string) => void; 
    placeholder?: string; 
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Filter accounts based on search term
    const filteredAccounts = useMemo(() => {
      if (!searchTerm) return accounts;
      return accounts.filter(account => 
        account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }, [searchTerm, accounts]);

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          setSearchTerm('');
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle keyboard navigation
    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (!isOpen) return;

        switch (event.key) {
          case 'ArrowDown':
            event.preventDefault();
            setHighlightedIndex(prev => 
              prev < filteredAccounts.length - 1 ? prev + 1 : 0
            );
            break;
          case 'ArrowUp':
            event.preventDefault();
            setHighlightedIndex(prev => 
              prev > 0 ? prev - 1 : filteredAccounts.length - 1
            );
            break;
          case 'Enter':
            event.preventDefault();
            if (filteredAccounts[highlightedIndex]) {
              handleSelect(filteredAccounts[highlightedIndex].code);
            }
            break;
          case 'Escape':
            setIsOpen(false);
            setSearchTerm('');
            break;
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, highlightedIndex, filteredAccounts]);

    // Reset highlighted index when search changes
    useEffect(() => {
      setHighlightedIndex(0);
    }, [searchTerm]);

    const handleSelect = (accountCode: string) => {
      onSelect(accountCode);
      setIsOpen(false);
      setSearchTerm('');
      setHighlightedIndex(0);
    };

    const handleInputClick = () => {
      setIsOpen(true);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };

    const selectedAccount = accounts.find(acc => acc.code === currentValue);

    return (
      <div className="relative" ref={dropdownRef}>
        <div
          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus-within:ring-2 focus-within:ring-slate-500 focus-within:border-slate-500 cursor-pointer"
          onClick={handleInputClick}
        >
          {isOpen ? (
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search accounts..."
              className="w-full outline-none bg-transparent"
              autoFocus
            />
          ) : (
            <div className="flex items-center justify-between">
              <span className={selectedAccount ? "text-slate-900" : "text-slate-500"}>
                {selectedAccount ? `${selectedAccount.code} - ${selectedAccount.name}` : placeholder}
              </span>
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          )}
        </div>

        {isOpen && (
          <div 
            className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
            style={{ minWidth: '300px' }}
          >
            {filteredAccounts.length > 0 ? (
              filteredAccounts.map((account, index) => (
                <div
                  key={account.code}
                  className={`px-3 py-2 cursor-pointer text-sm transition-colors ${
                    index === highlightedIndex 
                      ? 'bg-slate-100 text-slate-900' 
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                  onClick={() => handleSelect(account.code)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <div className="font-medium">{account.code} - {account.name}</div>
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-slate-500">
                No accounts found for "{searchTerm}"
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!chartOfAccounts || isLoadingAccounts) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-lg text-purple-600 font-semibold">
        Loading chart of accounts for {province}...
      </div>
    );
  }

  if (filteredTransactions.length === 0) {
    return (
      <div className="w-full max-w-none space-y-6">
        {/* Statistics Dashboard - Show even when empty */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
            <div className="text-sm text-slate-500">Total Transactions</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{stats.needsReview}</div>
            <div className="text-sm text-slate-500">Needs Review</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="text-2xl font-bold text-green-600">{stats.highConfidence}</div>
            <div className="text-sm text-slate-500">High Confidence</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="text-2xl font-bold text-purple-600">{stats.approved}</div>
            <div className="text-sm text-slate-500">Approved</div>
          </div>
        </div>

        {/* Filter Controls - Show even when empty */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              >
                <option value="all">All Transactions</option>
                <option value="needs-review">Needs Review</option>
                <option value="high-confidence">High Confidence</option>
              </select>
              <button
                onClick={() => setShowSmartSelect(!showSmartSelect)}
                className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
              >
                Smart Select
              </button>
              
              {/* View Mode Toggle */}
              <div className="flex border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-4 py-3 text-sm font-medium transition-colors ${
                    viewMode === 'table' 
                      ? 'bg-slate-900 text-white' 
                      : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Table View
                </button>
                <button
                  onClick={() => setViewMode('grouped')}
                  className={`px-4 py-3 text-sm font-medium transition-colors ${
                    viewMode === 'grouped' 
                      ? 'bg-slate-900 text-white' 
                      : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Grouped View
                </button>
              </div>
            </div>
          </div>

          {/* Smart Select Options */}
          {showSmartSelect && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleSmartSelect('uncategorized')}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition-colors"
                >
                  Uncategorized
                </button>
                <button
                  onClick={() => handleSmartSelect('low-confidence')}
                  className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-sm hover:bg-yellow-200 transition-colors"
                >
                  Low Confidence
                </button>
                <button
                  onClick={() => handleSmartSelect('high-confidence')}
                  className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition-colors"
                >
                  High Confidence
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Empty State Message */}
        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center">
          <div className="text-slate-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-slate-700 mb-2">
            {searchTerm ? 'No matching transactions found' : 'No transactions to display'}
          </h3>
          <p className="text-slate-500 mb-4">
            {searchTerm ? (
              <>
                Try adjusting your search term "<strong>{searchTerm}</strong>" or changing your filter settings.
              </>
            ) : (
              'Upload a CSV file to get started with transaction categorization.'
            )}
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Clear Search
            </button>
          )}
        </div>
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

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          <div className="text-sm text-slate-500">Total Transactions</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="text-2xl font-bold text-blue-600">{stats.needsReview}</div>
          <div className="text-sm text-slate-500">Needs Review</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="text-2xl font-bold text-green-600">{stats.highConfidence}</div>
          <div className="text-sm text-slate-500">High Confidence</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="text-2xl font-bold text-purple-600">{stats.approved}</div>
          <div className="text-sm text-slate-500">Approved</div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            >
              <option value="all">All Transactions</option>
              <option value="needs-review">Needs Review</option>
              <option value="high-confidence">High Confidence</option>
            </select>
            <button
              onClick={() => setShowSmartSelect(!showSmartSelect)}
              className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
            >
              Smart Select
            </button>
            
            {/* View Mode Toggle */}
            <div className="flex border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  viewMode === 'table' 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Table View
              </button>
              <button
                onClick={() => setViewMode('grouped')}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  viewMode === 'grouped' 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Grouped View
              </button>
            </div>
          </div>
        </div>

        {/* Smart Select Options */}
        {showSmartSelect && (
          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleSmartSelect('uncategorized')}
                className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition-colors"
              >
                Uncategorized
              </button>
              <button
                onClick={() => handleSmartSelect('low-confidence')}
                className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-sm hover:bg-yellow-200 transition-colors"
              >
                Low Confidence
              </button>
              <button
                onClick={() => handleSmartSelect('high-confidence')}
                className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition-colors"
              >
                High Confidence
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {showBulkActions && (
        <div className="bg-purple-50 p-6 rounded-2xl border border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
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
            <div className="space-y-2">
              <button
                onClick={handleBulkApprove}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 hover:scale-105 transition-all duration-300 font-medium shadow-lg shadow-purple-500/25"
              >
                Approve All Selected
              </button>
            </div>
            
            <div>
              <SearchableAccountDropdown
                currentValue=""
                onSelect={(accountCode) => {
                  if (accountCode) {
                    const updates = Array.from(selectedTransactions).map(id => ({ id, accountCode }));
                    handleBulkUpdate(updates);
                    setSelectedTransactions(new Set());
                    setShowBulkActions(false);
                  }
                }}
                placeholder="Bulk Account Assignment..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Transaction Display */}
      {viewMode === 'table' ? (
        /* Table View */
        <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
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
                  <th className="px-6 py-5 text-left text-xs font-medium text-slate-600 tracking-wide uppercase">
                    <button
                      onClick={() => handleSort('date')}
                      className="flex items-center space-x-1 hover:text-slate-900 transition-colors"
                    >
                      <span>Date</span>
                      <div className="w-3 h-3 flex flex-col justify-center">
                        {sortField === 'date' && sortDirection === 'asc' && (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 12 12">
                            <path d="M6 3l3 3H3z"/>
                          </svg>
                        )}
                        {sortField === 'date' && sortDirection === 'desc' && (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 12 12">
                            <path d="M6 9L3 6h6z"/>
                          </svg>
                        )}
                        {sortField !== 'date' && (
                          <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 12 12">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M6 3l3 3H3z M6 9L3 6h6z"/>
                          </svg>
                        )}
                      </div>
                    </button>
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-medium text-slate-600 tracking-wide uppercase">
                    <button
                      onClick={() => handleSort('description')}
                      className="flex items-center space-x-1 hover:text-slate-900 transition-colors"
                    >
                      <span>Description</span>
                      <div className="w-3 h-3 flex flex-col justify-center">
                        {sortField === 'description' && sortDirection === 'asc' && (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 12 12">
                            <path d="M6 3l3 3H3z"/>
                          </svg>
                        )}
                        {sortField === 'description' && sortDirection === 'desc' && (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 12 12">
                            <path d="M6 9L3 6h6z"/>
                          </svg>
                        )}
                        {sortField !== 'description' && (
                          <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 12 12">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M6 3l3 3H3z M6 9L3 6h6z"/>
                          </svg>
                        )}
                      </div>
                    </button>
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-medium text-slate-600 tracking-wide uppercase">
                    <button
                      onClick={() => handleSort('amount')}
                      className="flex items-center space-x-1 hover:text-slate-900 transition-colors"
                    >
                      <span>Amount</span>
                      <div className="w-3 h-3 flex flex-col justify-center">
                        {sortField === 'amount' && sortDirection === 'asc' && (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 12 12">
                            <path d="M6 3l3 3H3z"/>
                          </svg>
                        )}
                        {sortField === 'amount' && sortDirection === 'desc' && (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 12 12">
                            <path d="M6 9L3 6h6z"/>
                          </svg>
                        )}
                        {sortField !== 'amount' && (
                          <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 12 12">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M6 3l3 3H3z M6 9L3 6h6z"/>
                          </svg>
                        )}
                      </div>
                    </button>
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-medium text-slate-600 tracking-wide uppercase">
                    <button
                      onClick={() => handleSort('account')}
                      className="flex items-center space-x-1 hover:text-slate-900 transition-colors"
                    >
                      <span>Account</span>
                      <div className="w-3 h-3 flex flex-col justify-center">
                        {sortField === 'account' && sortDirection === 'asc' && (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 12 12">
                            <path d="M6 3l3 3H3z"/>
                          </svg>
                        )}
                        {sortField === 'account' && sortDirection === 'desc' && (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 12 12">
                            <path d="M6 9L3 6h6z"/>
                          </svg>
                        )}
                        {sortField !== 'account' && (
                          <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 12 12">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M6 3l3 3H3z M6 9L3 6h6z"/>
                          </svg>
                        )}
                      </div>
                    </button>
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-medium text-slate-600 tracking-wide uppercase">
                    Tax Rate
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-medium text-slate-600 tracking-wide uppercase">
                    <button
                      onClick={() => handleSort('confidence')}
                      className="flex items-center space-x-1 hover:text-slate-900 transition-colors"
                    >
                      <span>AI Score</span>
                      <div className="w-3 h-3 flex flex-col justify-center">
                        {sortField === 'confidence' && sortDirection === 'asc' && (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 12 12">
                            <path d="M6 3l3 3H3z"/>
                          </svg>
                        )}
                        {sortField === 'confidence' && sortDirection === 'desc' && (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 12 12">
                            <path d="M6 9L3 6h6z"/>
                          </svg>
                        )}
                        {sortField !== 'confidence' && (
                          <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 12 12">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M6 3l3 3H3z M6 9L3 6h6z"/>
                          </svg>
                        )}
                      </div>
                    </button>
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-medium text-slate-600 tracking-wide uppercase">
                    Status
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-medium text-slate-600 tracking-wide uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredTransactions.map((transaction) => (
                  <tr 
                    key={transaction.id} 
                    className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${
                      selectedTransactions.has(transaction.id) ? 'bg-purple-50 border-purple-200' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedTransactions.has(transaction.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedTransactions);
                          if (e.target.checked) {
                            newSelected.add(transaction.id);
                          } else {
                            newSelected.delete(transaction.id);
                          }
                          setSelectedTransactions(newSelected);
                          setShowBulkActions(newSelected.size > 0);
                        }}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {new Date(transaction.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 max-w-xs">
                      <div className="truncate" title={transaction.description}>
                        {transaction.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-semibold ${
                        transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ${Math.abs(transaction.amount).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {!transaction.accountCode ? (
                        <SearchableAccountDropdown
                          currentValue=""
                          onSelect={(accountCode) => handleAccountChange(transaction.id, accountCode)}
                          placeholder="Select account..."
                        />
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                            {getAccountName(transaction.accountCode)}
                          </span>
                          <button
                            onClick={() => handleAccountChange(transaction.id, '')}
                            className="text-slate-400 hover:text-slate-600 transition-colors text-xs"
                            title="Clear account"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getTaxRate(transaction.accountCode) !== undefined ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {getTaxRate(transaction.accountCode)}%
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {transaction.confidence ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.confidence >= 90 ? 'bg-green-100 text-green-800' :
                          transaction.confidence >= 70 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {transaction.confidence}%
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {transaction.isApproved ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Approved
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        {/* Manual AI Button */}
                        <AICategorizationButton
                          transaction={transaction}
                          onCategorize={(accountCode, confidence) => 
                            handleIndividualAICategorize(transaction.id, accountCode, confidence)
                          }
                          province={province}
                          disabled={false}
                        />
                        
                        {/* Approve/Unapprove Button */}
                        {transaction.isApproved ? (
                          <button
                            onClick={() => handleIndividualUnapprove(transaction.id)}
                            className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                            title="Remove approval"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleIndividualApprove(transaction.id)}
                            className="p-1.5 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
                            title="Approve transaction"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grouped View */
        <div className="space-y-4">
          {Object.entries(groupedTransactions).map(([accountCode, groupTransactions]) => (
            <div key={accountCode} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-slate-50 to-slate-25 px-6 py-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Group Select All Checkbox */}
                    <input
                      type="checkbox"
                      checked={groupTransactions.every(t => selectedTransactions.has(t.id))}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleGroupSelectAll(accountCode, e.target.checked);
                      }}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      title="Select all transactions in this group"
                    />
                    <div 
                      className="cursor-pointer flex-1"
                      onClick={() => toggleGroup(accountCode)}
                    >
                      <h3 className="text-lg font-semibold text-slate-900">
                        {getAccountName(accountCode)} ({accountCode || 'None'})
                      </h3>
                      <p className="text-sm text-slate-600">
                        {groupTransactions.length} transactions • Total: $
                        {Math.abs(groupTransactions.reduce((sum, t) => sum + t.amount, 0)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div 
                    className="text-slate-600 cursor-pointer p-2"
                    onClick={() => toggleGroup(accountCode)}
                  >
                    {expandedGroups.has(accountCode) ? '▼' : '▶'}
                  </div>
                </div>
              </div>
              
              {expandedGroups.has(accountCode) && (
                <div className="p-6">
                  {/* Bulk Change UI for Selected Transactions */}
                  {(() => {
                    const selectedInGroup = groupTransactions.filter(t => selectedTransactions.has(t.id));
                    return selectedInGroup.length > 1 ? (
                      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-blue-900">
                              {selectedInGroup.length} transactions selected
                            </h4>
                            <p className="text-xs text-blue-700">
                              Change account for all selected transactions
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <SearchableAccountDropdown
                              currentValue=""
                              onSelect={(accountCode) => {
                                // Apply to all selected transactions in this group
                                selectedInGroup.forEach(transaction => {
                                  onTransactionUpdate(transaction.id, { accountCode });
                                });
                                setNotification(`Updated ${selectedInGroup.length} transactions to ${getAccountName(accountCode)}`);
                                // Clear selection after bulk update
                                setSelectedTransactions(new Set());
                                setShowBulkActions(false);
                              }}
                              placeholder="Bulk change account..."
                            />
                            <button
                              onClick={() => {
                                // Clear selection
                                const newSelected = new Set(selectedTransactions);
                                selectedInGroup.forEach(t => newSelected.delete(t.id));
                                setSelectedTransactions(newSelected);
                                setShowBulkActions(newSelected.size > 0);
                              }}
                              className="px-3 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}
                  
                  <div className="space-y-3">
                    {groupTransactions.map((transaction) => (
                      <div 
                        key={transaction.id}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                          selectedTransactions.has(transaction.id) 
                            ? (() => {
                                const selectedInGroup = groupTransactions.filter(t => selectedTransactions.has(t.id));
                                return selectedInGroup.length > 1 
                                  ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' 
                                  : 'bg-purple-50 border-purple-200';
                              })()
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <input
                            type="checkbox"
                            checked={selectedTransactions.has(transaction.id)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedTransactions);
                              if (e.target.checked) {
                                newSelected.add(transaction.id);
                              } else {
                                newSelected.delete(transaction.id);
                              }
                              setSelectedTransactions(newSelected);
                              setShowBulkActions(newSelected.size > 0);
                            }}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-slate-900 truncate">
                              {transaction.description}
                            </div>
                            <div className="text-xs text-slate-500">
                              {new Date(transaction.date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <span className={`font-semibold text-sm ${
                            transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            ${Math.abs(transaction.amount).toFixed(2)}
                          </span>
                          
                          {getTaxRate(transaction.accountCode) !== undefined && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {getTaxRate(transaction.accountCode)}%
                            </span>
                          )}
                          
                          {transaction.confidence && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              transaction.confidence >= 90 ? 'bg-green-100 text-green-800' :
                              transaction.confidence >= 70 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {transaction.confidence}%
                            </span>
                          )}
                          
                          {/* Account Dropdown for Grouped View */}
                          {!transaction.accountCode ? (
                            <SearchableAccountDropdown
                              currentValue=""
                              onSelect={(accountCode) => handleAccountChange(transaction.id, accountCode)}
                              placeholder="Select account..."
                            />
                          ) : changingAccountId === transaction.id ? (
                            <div className="account-dropdown">
                              <SearchableAccountDropdown
                                currentValue={transaction.accountCode}
                                onSelect={(accountCode) => {
                                  handleAccountChange(transaction.id, accountCode);
                                  setChangingAccountId(null);
                                }}
                                placeholder="Select account..."
                              />
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                                {getAccountName(transaction.accountCode)}
                              </span>
                              <button
                                onClick={() => setChangingAccountId(transaction.id)}
                                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors rounded"
                                title="Change account"
                              >
                                Change
                              </button>
                              <button
                                onClick={() => handleUncategorize(transaction.id)}
                                className="px-2 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 transition-colors rounded"
                                title="Uncategorize transaction"
                              >
                                ×
                              </button>
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-2">
                            <AICategorizationButton
                              transaction={transaction}
                              onCategorize={(accountCode, confidence) => 
                                handleIndividualAICategorize(transaction.id, accountCode, confidence)
                              }
                              province={province}
                              disabled={false}
                            />
                            
                            {transaction.isApproved ? (
                              <button
                                onClick={() => handleIndividualUnapprove(transaction.id)}
                                className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                                title="Remove approval"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleIndividualApprove(transaction.id)}
                                className="p-1.5 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
                                title="Approve transaction"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

             {/* Bulk Categorization Modal */}
       {bulkCategorySuggestion.show && (
         <div 
           className="modal-backdrop"
           style={{
             position: 'fixed',
             top: 0,
             left: 0,
             right: 0,
             bottom: 0,
             backgroundColor: 'rgba(0, 0, 0, 0)', // No overlay
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'center',
             zIndex: 9999,
             padding: '16px'
           }}
         >
           <div 
             className="modal-container"
             style={{
               backgroundColor: '#FFFFFF',
               borderRadius: '16px',
               boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
               maxWidth: '600px',
               width: '100%',
               maxHeight: '90vh',
               overflow: 'hidden',
               border: '1px solid #E2E8F0'
             }}
           >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Similar Transactions Found</h2>
                <p className="text-slate-600 mt-1">
                  Would you like to apply the same category to {bulkCategorySuggestion.similarTransactions.length} similar transactions?
                </p>
              </div>
              <button
                onClick={handleRejectBulkCategorization}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Source Transaction */}
            <div className="p-6 border-b border-slate-200">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-green-800 mb-2">Source Transaction</h3>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">{bulkCategorySuggestion.sourceTransaction?.description}</span>
                  <span className="text-sm font-semibold text-green-600">
                    ${Math.abs(bulkCategorySuggestion.sourceTransaction?.amount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Category: {getAccountName(bulkCategorySuggestion.suggestedAccount)}
                </div>
              </div>
            </div>

            {/* Enhanced Similar Transactions with Grouping */}
            <div className="p-6 max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-slate-800">Similar Transactions</h3>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setBulkModalSelectedTransactions(new Set(bulkCategorySuggestion.similarTransactions.map(t => t.id)))}
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setBulkModalSelectedTransactions(new Set())}
                    className="text-xs text-slate-500 hover:text-slate-600 font-medium"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              
              {(() => {
                const { exactGroups, standaloneTransactions } = groupSimilarTransactionsByExactMatch(bulkCategorySuggestion.similarTransactions);
                
                return (
                  <div className="space-y-3">
                    {/* Exact Match Groups */}
                    {exactGroups.map((group, groupIndex) => (
                      <div key={`group-${groupIndex}`} className="border border-slate-200 rounded-lg">
                        <div className="bg-blue-50 p-3 border-b border-slate-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={group.every(t => bulkModalSelectedTransactions.has(t.id))}
                                onChange={(e) => {
                                  const newSelected = new Set(bulkModalSelectedTransactions);
                                  if (e.target.checked) {
                                    group.forEach(t => newSelected.add(t.id));
                                  } else {
                                    group.forEach(t => newSelected.delete(t.id));
                                  }
                                  setBulkModalSelectedTransactions(newSelected);
                                }}
                                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                              />
                              <span className="text-sm font-medium text-blue-800">
                                Exact Match Group ({group.length} transactions)
                              </span>
                            </div>
                            <span className="text-xs text-blue-600 font-medium">
                              Total: ${Math.abs(group.reduce((sum, t) => sum + t.amount, 0)).toFixed(2)}
                            </span>
                          </div>
                          <div className="text-xs text-blue-700 mt-1 truncate">
                            {group[0].description}
                          </div>
                        </div>
                        <div className="p-3 space-y-2">
                          {group.map((transaction) => (
                            <div key={transaction.id} className="flex items-center space-x-3 p-2 bg-slate-50 rounded">
                              <input
                                type="checkbox"
                                checked={bulkModalSelectedTransactions.has(transaction.id)}
                                onChange={(e) => {
                                  const newSelected = new Set(bulkModalSelectedTransactions);
                                  if (e.target.checked) {
                                    newSelected.add(transaction.id);
                                  } else {
                                    newSelected.delete(transaction.id);
                                  }
                                  setBulkModalSelectedTransactions(newSelected);
                                }}
                                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-slate-500">
                                  {new Date(transaction.date).toLocaleDateString()}
                                </div>
                              </div>
                              <span className="text-sm font-semibold text-slate-600">
                                ${Math.abs(transaction.amount).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    {/* Standalone Transactions */}
                    {standaloneTransactions.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-slate-600 mb-2">
                          Similar Transactions
                        </div>
                        {standaloneTransactions.map((transaction) => (
                          <div key={transaction.id} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                            <input
                              type="checkbox"
                              checked={bulkModalSelectedTransactions.has(transaction.id)}
                              onChange={(e) => {
                                const newSelected = new Set(bulkModalSelectedTransactions);
                                if (e.target.checked) {
                                  newSelected.add(transaction.id);
                                } else {
                                  newSelected.delete(transaction.id);
                                }
                                setBulkModalSelectedTransactions(newSelected);
                              }}
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-slate-700 truncate">{transaction.description}</div>
                              <div className="text-xs text-slate-500">
                                {new Date(transaction.date).toLocaleDateString()}
                              </div>
                            </div>
                            <span className="text-sm font-semibold text-slate-600">
                              ${Math.abs(transaction.amount).toFixed(2)}
                            </span>
            </div>
          ))}
        </div>
      )}
                  </div>
                );
              })()}
            </div>

            {/* Enhanced Actions */}
            <div className="p-6 border-t border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-600">
                  {bulkModalSelectedTransactions.size} of {bulkCategorySuggestion.similarTransactions.length} selected
                </span>
                <span className="text-xs text-slate-500">
                  Category: {getAccountName(bulkCategorySuggestion.suggestedAccount)}
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleRejectBulkCategorization}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  No, Keep Individual
                </button>
                <button
                  onClick={handleAcceptBulkCategorization}
                  disabled={bulkModalSelectedTransactions.size === 0}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    bulkModalSelectedTransactions.size === 0
                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      : bulkModalSelectedTransactions.size === bulkCategorySuggestion.similarTransactions.length
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {bulkModalSelectedTransactions.size === 0
                    ? 'Select Transactions'
                    : bulkModalSelectedTransactions.size === bulkCategorySuggestion.similarTransactions.length
                    ? 'Yes, Apply to All'
                    : `Yes, Apply to Selected (${bulkModalSelectedTransactions.size})`
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Rule Popup */}
      {saveRulePopup.transaction && (
        <SaveRulePopup
          isOpen={saveRulePopup.isOpen}
          transaction={saveRulePopup.transaction}
          onSave={handleSaveRule}
          onCancel={() => setSaveRulePopup({ isOpen: false, transaction: null })}
          chartOfAccounts={chartOfAccounts}
        />
      )}

    </div>
  );
}