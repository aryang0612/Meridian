'use client';

import React, { useState } from 'react';
import { ChartOfAccounts } from '../lib/chartOfAccounts';

interface SaveRulePopupProps {
  isOpen: boolean;
  transaction: {
    id: string;
    description: string;
    accountCode: string;
  };
  onSave: (keyword: string, accountCode: string, matchType: 'contains' | 'fuzzy' | 'regex' | 'exact') => Promise<void>;
  onCancel: () => void;
  chartOfAccounts: ChartOfAccounts;
}

export default function SaveRulePopup({ 
  isOpen, 
  transaction, 
  onSave, 
  onCancel,
  chartOfAccounts 
}: SaveRulePopupProps) {
  const [keyword, setKeyword] = useState('');
  const [matchType, setMatchType] = useState<'contains' | 'fuzzy' | 'regex' | 'exact'>('contains');
  const [isSaving, setIsSaving] = useState(false);

  // Auto-suggest keyword from transaction description
  React.useEffect(() => {
    if (isOpen && transaction) {
      // Extract a sensible keyword from the description
      const cleanDescription = transaction.description
        .replace(/[0-9\-\*\#]+/g, '') // Remove numbers and special chars
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
      
      // Take the first few meaningful words
      const words = cleanDescription.split(' ').filter(word => word.length > 2);
      const suggestedKeyword = words.slice(0, 2).join(' ') || cleanDescription;
      
      setKeyword(suggestedKeyword);
    }
  }, [isOpen, transaction]);

  const handleSave = async () => {
    if (!keyword.trim()) return;
    
    setIsSaving(true);
    try {
      await onSave(keyword.trim(), transaction.accountCode, matchType);
      onCancel(); // Close popup on success
    } catch (error) {
      console.error('Failed to save rule:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getAccountName = (accountCode: string): string => {
    const account = chartOfAccounts.getAccount(accountCode);
    return account ? account.name : 'Unknown Account';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                💬 Save Categorization Rule?
              </h3>
              <p className="text-sm text-gray-600">
                Remember this for similar transactions in the future
              </p>
            </div>
          </div>

          <div className="mb-4">
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="text-xs text-gray-500 mb-1">Transaction</div>
              <div className="text-sm font-medium text-gray-900 truncate">
                {transaction.description}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                → {transaction.accountCode} - {getAccountName(transaction.accountCode)}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Keyword to match
                </label>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="e.g., 'freshslice pizza' or 'tim hortons'"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Future transactions containing this keyword will be automatically categorized
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Matching type
                </label>
                <select
                  value={matchType}
                  onChange={(e) => setMatchType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="contains">Contains (recommended)</option>
                  <option value="exact">Exact match</option>
                  <option value="fuzzy">Fuzzy match</option>
                  <option value="regex">Regular expression</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {matchType === 'contains' && 'Matches if the transaction description contains your keyword'}
                  {matchType === 'exact' && 'Matches only if the description is exactly your keyword'}
                  {matchType === 'fuzzy' && 'Matches similar descriptions (70% word match)'}
                  {matchType === 'regex' && 'Advanced: Use regular expression patterns'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              No, thanks
            </button>
            <button
              onClick={handleSave}
              disabled={!keyword.trim() || isSaving}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? 'Saving...' : 'Yes, save rule'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 