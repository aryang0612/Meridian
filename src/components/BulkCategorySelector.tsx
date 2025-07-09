'use client';
import React, { useState, useMemo } from 'react';
import { AppIcons, CommonIcons } from '../lib/iconSystem';
import { ChartOfAccounts } from '../lib/chartOfAccounts';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  accountCode?: string;
}

interface BulkCategorySelectorProps {
  transactions: Transaction[];
  onBulkUpdate: (updates: { id: string; accountCode: string }[]) => void;
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
  const [filterType, setFilterType] = useState<'all' | 'unassigned'>('unassigned');

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
    }
    if (filterText) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(filterText.toLowerCase())
      );
    }
    return filtered;
  }, [transactions, filterType, filterText]);

  const handleSelectAll = () => {
    if (selectedTransactions.size === filteredTransactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(filteredTransactions.map(t => t.id)));
    }
  };

  const handleManualAssign = () => {
    if (selectedTransactions.size === 0 || !selectedAccountCode) return;
    const updates = Array.from(selectedTransactions).map(id => ({
      id,
      accountCode: selectedAccountCode
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
            <h2 className="text-2xl font-bold text-slate-900">Bulk Account Assignment</h2>
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
            <AppIcons.navigation.close className="w-6 h-6 text-slate-600" />
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
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <AppIcons.actions.filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
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
                      <div className="text-xs text-slate-500">
                        {new Date(transaction.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </div>
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
                <AppIcons.status.success className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>Select transactions from the list to assign accounts</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkCategorySelector; 