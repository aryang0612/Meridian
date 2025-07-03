'use client';
import React, { useState, useMemo } from 'react';
import { CheckCircle, X, Filter, Users, DollarSign, Building2, CreditCard, Car, Home, ShoppingCart, Wifi, Shield, FileText } from 'lucide-react';
import { ChartOfAccounts } from '../lib/chartOfAccounts';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category?: string;
  subcategory?: string;
  accountCode?: string;
}

interface BulkCategorySelectorProps {
  transactions: Transaction[];
  onBulkUpdate: (updates: { id: string; accountCode: string; category: string; subcategory: string }[]) => void;
  onClose: () => void;
  province: string;
}

const BulkCategorySelector: React.FC<BulkCategorySelectorProps> = ({
  transactions,
  onBulkUpdate,
  onClose,
  province
}) => {
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [selectedAccountCode, setSelectedAccountCode] = useState<string>('');
  const [filterText, setFilterText] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'unassigned' | 'e-transfer' | 'cheques' | 'payroll'>('unassigned');

  // Create ChartOfAccounts instance for the province
  const chartOfAccounts = useMemo(() => new ChartOfAccounts(province), [province]);

  // Get available accounts for the province
  const accounts = useMemo(() => {
    const allAccounts = chartOfAccounts.getAllAccounts();
    return allAccounts.map(account => ({
      code: account.code,
      name: account.name
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [chartOfAccounts]);

  // Filter transactions based on current filter
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    
    if (filterType === 'unassigned') {
      filtered = filtered.filter(t => !t.accountCode);
    } else if (filterType === 'e-transfer') {
      filtered = filtered.filter(t => t.category === 'E-Transfer');
    } else if (filterType === 'cheques') {
      filtered = filtered.filter(t => t.category === 'Cheques');
    } else if (filterType === 'payroll') {
      filtered = filtered.filter(t => t.category === 'Payroll');
    }

    if (filterText) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(filterText.toLowerCase()) ||
        (t.category && t.category.toLowerCase().includes(filterText.toLowerCase()))
      );
    }

    return filtered;
  }, [transactions, filterType, filterText]);

  // Quick assignment presets
  const quickAssignments = [
    { name: 'Payroll', icon: Users, accountCode: '500', category: 'Payroll', subcategory: 'Employee Wages' },
    { name: 'E-Transfer', icon: DollarSign, accountCode: '100', category: 'E-Transfer', subcategory: 'E-Transfer' },
    { name: 'Cheques', icon: FileText, accountCode: '101', category: 'Cheques', subcategory: 'Cheques' },
    { name: 'Utilities', icon: Wifi, accountCode: '400', category: 'Utilities', subcategory: 'Phone & Internet' },
    { name: 'Insurance', icon: Shield, accountCode: '450', category: 'Insurance', subcategory: 'General Insurance' },
    { name: 'Credit Card', icon: CreditCard, accountCode: '300', category: 'Credit Card Payments', subcategory: 'Credit Card Payments' },
    { name: 'Vehicle', icon: Car, accountCode: '470', category: 'Vehicle Expenses', subcategory: 'Vehicle Expenses' },
    { name: 'Office', icon: Building2, accountCode: '420', category: 'Office Expenses', subcategory: 'Office Expenses' },
    { name: 'Revenue', icon: DollarSign, accountCode: '200', category: 'Revenue', subcategory: 'Sales Revenue' },
  ];

  const handleSelectAll = () => {
    if (selectedTransactions.size === filteredTransactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(filteredTransactions.map(t => t.id)));
    }
  };

  const handleQuickAssign = (preset: typeof quickAssignments[0]) => {
    if (selectedTransactions.size === 0) return;
    
    const updates = Array.from(selectedTransactions).map(id => ({
      id,
      accountCode: preset.accountCode,
      category: preset.category,
      subcategory: preset.subcategory
    }));
    
    onBulkUpdate(updates);
    setSelectedTransactions(new Set());
  };

  const handleManualAssign = () => {
    if (selectedTransactions.size === 0 || !selectedAccountCode) return;
    
    const account = chartOfAccounts.getAccount(selectedAccountCode);
    const accountName = account?.name || 'Uncategorized';
    const updates = Array.from(selectedTransactions).map(id => ({
      id,
      accountCode: selectedAccountCode,
      category: accountName.split(' - ')[0] || 'Uncategorized',
      subcategory: accountName.split(' - ')[1] || 'Uncategorized'
    }));
    
    onBulkUpdate(updates);
    setSelectedTransactions(new Set());
    setSelectedAccountCode('');
  };

  const isAllSelected = filteredTransactions.length > 0 && selectedTransactions.size === filteredTransactions.length;
  const isIndeterminate = selectedTransactions.size > 0 && selectedTransactions.size < filteredTransactions.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Bulk Category Assignment</h2>
            <p className="text-slate-600 mt-1">
              {selectedTransactions.size > 0 
                ? `${selectedTransactions.size} transaction${selectedTransactions.size !== 1 ? 's' : ''} selected`
                : `${filteredTransactions.length} transaction${filteredTransactions.length !== 1 ? 's' : ''} available`
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-slate-600" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Left Panel - Transaction List */}
          <div className="flex-1 border-r border-slate-200 flex flex-col">
            {/* Filters */}
            <div className="p-4 border-b border-slate-200">
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    filterType === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterType('unassigned')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    filterType === 'unassigned' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Unassigned
                </button>
                <button
                  onClick={() => setFilterType('e-transfer')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    filterType === 'e-transfer' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  E-Transfers
                </button>
                <button
                  onClick={() => setFilterType('cheques')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    filterType === 'cheques' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Cheques
                </button>
                <button
                  onClick={() => setFilterType('payroll')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    filterType === 'payroll' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Payroll
                </button>
              </div>
              
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter transactions..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>
                
                <button
                  onClick={handleSelectAll}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isAllSelected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {isAllSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>

            {/* Transaction List */}
            <div className="flex-1 overflow-y-auto">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className={`flex items-center p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${
                    selectedTransactions.has(transaction.id) ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  onClick={() => {
                    const newSelected = new Set(selectedTransactions);
                    if (newSelected.has(transaction.id)) {
                      newSelected.delete(transaction.id);
                    } else {
                      newSelected.add(transaction.id);
                    }
                    setSelectedTransactions(newSelected);
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedTransactions.has(transaction.id)}
                    onChange={() => {}} // Handled by onClick
                    className="mr-3 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {transaction.description}
                      </p>
                      <span className={`text-sm font-semibold ${
                        transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.amount >= 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-slate-500">
                        {new Date(transaction.date).toLocaleDateString()}
                      </p>
                      <div className="flex items-center gap-2">
                        {transaction.accountCode ? (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            {transaction.accountCode} - {chartOfAccounts.getAccount(transaction.accountCode)?.name || 'Unknown'}
                          </span>
                        ) : (
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                            No Account
                          </span>
                        )}
                        {transaction.category === 'E-Transfer' && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                            E-Transfer
                          </span>
                        )}
                        {transaction.category === 'Cheques' && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                            Cheque
                          </span>
                        )}
                        {transaction.category === 'Payroll' && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Payroll
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredTransactions.length === 0 && (
                <div className="flex items-center justify-center h-32 text-slate-500">
                  <p>No transactions found matching the current filters.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Assignment Options */}
          <div className="w-96 p-6 bg-slate-50">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Assignment Options</h3>
            
            {selectedTransactions.size > 0 ? (
              <>
                {/* Quick Assignments */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-slate-700 mb-3">Quick Assignments</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {quickAssignments.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => handleQuickAssign(preset)}
                        className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all text-left"
                      >
                        <preset.icon className="w-5 h-5 text-slate-600" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{preset.name}</p>
                                                     <p className="text-xs text-slate-500">{preset.accountCode} - {chartOfAccounts.getAccount(preset.accountCode)?.name || 'Unknown'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Manual Assignment */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-slate-700 mb-3">Manual Assignment</h4>
                  <select
                    value={selectedAccountCode}
                    onChange={(e) => setSelectedAccountCode(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent mb-3"
                  >
                    <option value="">Select an account...</option>
                    {accounts.map((account) => (
                      <option key={account.code} value={account.code}>
                        {account.code} - {account.name}
                      </option>
                    ))}
                  </select>
                  
                  <button
                    onClick={handleManualAssign}
                    disabled={!selectedAccountCode}
                    className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                  >
                    Assign to {selectedTransactions.size} Transaction{selectedTransactions.size !== 1 ? 's' : ''}
                  </button>
                </div>

                <div className="text-center">
                  <button
                    onClick={() => setSelectedTransactions(new Set())}
                    className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    Clear Selection
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center text-slate-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>Select transactions from the list to assign categories</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkCategorySelector; 