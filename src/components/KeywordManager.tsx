'use client';
import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../lib/databaseService';
import { UserCategorizationRule } from '../lib/types';
import { ChartOfAccounts } from '../lib/chartOfAccounts';

interface KeywordManagerProps {
  onClose?: () => void;
}

export default function KeywordManager({ onClose }: KeywordManagerProps) {
  const [rules, setRules] = useState<UserCategorizationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newKeyword, setNewKeyword] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newMatchType, setNewMatchType] = useState<'contains' | 'fuzzy' | 'regex' | 'exact'>('contains');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRule, setEditingRule] = useState<UserCategorizationRule | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);

  const databaseService = DatabaseService.getInstance();

  useEffect(() => {
    loadRules();
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const chartOfAccounts = ChartOfAccounts.getInstance();
      await chartOfAccounts.waitForInitialization();
      const accountList = chartOfAccounts.getAllAccounts();
      setAccounts(accountList);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const loadRules = async () => {
    try {
      setLoading(true);
      const userRules = await databaseService.getUserCategorizationRules();
      setRules(userRules);
    } catch (error) {
      console.error('Failed to load rules:', error);
      setError('Failed to load custom keywords. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = async () => {
    if (!newKeyword.trim() || !newCategory.trim()) {
      setError('Please enter both keyword and category');
      return;
    }

    try {
      await databaseService.saveUserCategorizationRule(newKeyword.trim(), newCategory, newMatchType);
      setNewKeyword('');
      setNewCategory('');
      setNewMatchType('contains');
      setShowAddForm(false);
      setError(null);
      await loadRules();
    } catch (error) {
      console.error('Failed to add rule:', error);
      setError('Failed to add keyword. Please try again.');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await databaseService.deleteCategorizationRule(ruleId);
      await loadRules();
    } catch (error) {
      console.error('Failed to delete rule:', error);
      setError('Failed to delete keyword. Please try again.');
    }
  };

  const handleUpdateRule = async (rule: UserCategorizationRule) => {
    try {
      await databaseService.updateUserCategorizationRule(rule.id, {
        keyword: rule.keyword,
        category_code: rule.category_code,
        match_type: rule.match_type,
        is_active: rule.is_active
      });
      setEditingRule(null);
      await loadRules();
    } catch (error) {
      console.error('Failed to update rule:', error);
      setError('Failed to update keyword. Please try again.');
    }
  };

  const getAccountName = (accountCode: string) => {
    const account = accounts.find(acc => acc.code === accountCode);
    return account ? account.name : `Account ${accountCode}`;
  };

  const getMatchTypeDescription = (matchType: string) => {
    switch (matchType) {
      case 'contains': return 'Contains text';
      case 'exact': return 'Exact match';
      case 'fuzzy': return 'Fuzzy match';
      case 'regex': return 'Regular expression';
      default: return matchType;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Custom Keywords</h2>
            <p className="text-slate-600 mt-1">Manage your custom transaction categorization rules</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl font-light"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Add New Rule Button */}
          <div className="mb-6">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add New Keyword</span>
            </button>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h3 className="text-lg font-semibold mb-4">Add New Keyword Rule</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Keyword
                  </label>
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. starbucks, uber, gas station"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Account Code
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select account...</option>
                    {accounts.map(account => (
                      <option key={account.code} value={account.code}>
                        {account.code} - {account.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Match Type
                  </label>
                  <select
                    value={newMatchType}
                    onChange={(e) => setNewMatchType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="contains">Contains text</option>
                    <option value="exact">Exact match</option>
                    <option value="fuzzy">Fuzzy match</option>
                    <option value="regex">Regular expression</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex space-x-2">
                <button
                  onClick={handleAddRule}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Add Rule
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-slate-300 text-slate-700 rounded-md hover:bg-slate-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Rules List */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-slate-600">Loading keywords...</p>
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No Keywords Yet</h3>
              <p className="text-slate-600 mb-4">Add your first custom keyword to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Your Custom Keywords ({rules.length})</h3>
              {rules.map((rule) => (
                <div key={rule.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                  {editingRule?.id === rule.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Keyword</label>
                          <input
                            type="text"
                            value={editingRule.keyword}
                            onChange={(e) => setEditingRule({...editingRule, keyword: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Account</label>
                          <select
                            value={editingRule.category_code}
                            onChange={(e) => setEditingRule({...editingRule, category_code: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {accounts.map(account => (
                              <option key={account.code} value={account.code}>
                                {account.code} - {account.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleUpdateRule(editingRule)}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingRule(null)}
                          className="px-3 py-1 bg-slate-300 text-slate-700 rounded text-sm hover:bg-slate-400 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-slate-900">"{rule.keyword}"</span>
                              <span className="text-slate-500">→</span>
                              <span className="text-slate-700">{rule.category_code} - {getAccountName(rule.category_code)}</span>
                            </div>
                            <div className="flex items-center space-x-4 mt-1 text-sm text-slate-500">
                              <span>{getMatchTypeDescription(rule.match_type)}</span>
                              <span>•</span>
                              <span>Used {rule.usage_count} times</span>
                              <span>•</span>
                              <span className={rule.is_active ? 'text-green-600' : 'text-red-600'}>
                                {rule.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingRule(rule)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Help Section */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">How Custom Keywords Work</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Contains:</strong> Matches if the keyword appears anywhere in the transaction description</li>
              <li>• <strong>Exact:</strong> Matches only if the description exactly matches the keyword</li>
              <li>• <strong>Fuzzy:</strong> Matches similar text (handles typos and variations)</li>
              <li>• <strong>Regex:</strong> Uses regular expressions for advanced pattern matching</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 