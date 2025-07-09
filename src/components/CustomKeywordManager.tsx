'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Download, Upload, Save, X, Search, Filter } from 'lucide-react';
import { CustomKeywordManager as KeywordManager, CustomKeyword, CustomKeywordRule } from '../data/customKeywords';
import { ChartOfAccounts } from '../lib/chartOfAccounts';

interface CustomKeywordManagerProps {
  onClose?: () => void;
  onKeywordsUpdated?: () => void;
}

export default function CustomKeywordManager({ onClose, onKeywordsUpdated }: CustomKeywordManagerProps) {
  const [manager] = useState(() => KeywordManager.getInstance());
  const [keywords, setKeywords] = useState<CustomKeyword[]>([]);
  const [rules, setRules] = useState<CustomKeywordRule[]>([]);
  const [accounts, setAccounts] = useState<Array<{ code: string; name: string }>>([]);
  const [activeTab, setActiveTab] = useState<'keywords' | 'rules'>('keywords');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<CustomKeyword | CustomKeywordRule | null>(null);
  const [formData, setFormData] = useState({
    keyword: '',
    keywords: [''],
    accountCode: '',
    confidence: 90,
    description: ''
  });

  useEffect(() => {
    loadData();
    loadAccounts();
  }, []);

  const loadData = () => {
    setKeywords(manager.getKeywords());
    setRules(manager.getRules());
  };

  const loadAccounts = async () => {
    try {
      const chart = new ChartOfAccounts('ON');
      // Chart of Accounts is always ready
      const accountList = chart.getAllAccounts().map((acc: any) => ({
        code: acc.code,
        name: `${acc.code} - ${acc.name}`
      }));
      setAccounts(accountList);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const filteredKeywords = keywords.filter(k => {
    const matchesSearch = k.keyword.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         k.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAccount = !filterAccount || k.accountCode === filterAccount;
    return matchesSearch && matchesAccount;
  });

  const filteredRules = rules.filter(r => {
    const matchesSearch = r.keywords.some(k => k.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         r.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAccount = !filterAccount || r.accountCode === filterAccount;
    return matchesSearch && matchesAccount;
  });

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      keyword: '',
      keywords: [''],
      accountCode: '',
      confidence: 90,
      description: ''
    });
    setShowAddForm(true);
  };

  const handleEdit = (item: CustomKeyword | CustomKeywordRule) => {
    setEditingItem(item);
    if ('keyword' in item) {
      // It's a keyword
      setFormData({
        keyword: item.keyword,
        keywords: [''],
        accountCode: item.accountCode,
        confidence: item.confidence,
        description: item.description || ''
      });
    } else {
      // It's a rule
      setFormData({
        keyword: '',
        keywords: [...item.keywords],
        accountCode: item.accountCode,
        confidence: item.confidence,
        description: item.description || ''
      });
    }
    setShowAddForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      if (activeTab === 'keywords') {
        manager.removeKeyword(id);
      } else {
        manager.removeRule(id);
      }
      loadData();
      onKeywordsUpdated?.();
    }
  };

  const handleSave = () => {
    if (!formData.accountCode) {
      alert('Please select an account code');
      return;
    }

    if (activeTab === 'keywords') {
      if (!formData.keyword.trim()) {
        alert('Please enter a keyword');
        return;
      }

      if (editingItem && 'keyword' in editingItem) {
        manager.updateKeyword(editingItem.id, {
          keyword: formData.keyword.trim(),
          accountCode: formData.accountCode,
          confidence: formData.confidence,
          description: formData.description.trim() || undefined
        });
      } else {
        manager.addKeyword(
          formData.keyword.trim(),
          formData.accountCode,
          formData.confidence,
          formData.description.trim() || undefined
        );
      }
    } else {
      const validKeywords = formData.keywords.filter(k => k.trim());
      if (validKeywords.length === 0) {
        alert('Please enter at least one keyword');
        return;
      }

      if (editingItem && !('keyword' in editingItem)) {
        manager.updateRule(editingItem.id, {
          keywords: validKeywords,
          accountCode: formData.accountCode,
          confidence: formData.confidence,
          description: formData.description.trim() || undefined
        });
      } else {
        manager.addRule(
          validKeywords,
          formData.accountCode,
          formData.confidence,
          formData.description.trim() || undefined
        );
      }
    }

    setShowAddForm(false);
    setEditingItem(null);
    loadData();
    onKeywordsUpdated?.();
  };

  const handleExport = () => {
    const data = {
      keywords: manager.getKeywords(),
      rules: manager.getRules(),
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meridian-keywords-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = manager.importKeywords(e.target?.result as string);
        if (result.success) {
          loadData();
          onKeywordsUpdated?.();
          alert('Keywords imported successfully!');
        } else {
          alert(`Import failed: ${result.message}`);
        }
      } catch (error) {
        alert('Failed to import keywords. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  const addKeywordField = () => {
    setFormData(prev => ({
      ...prev,
      keywords: [...prev.keywords, '']
    }));
  };

  const removeKeywordField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.filter((_, i) => i !== index)
    }));
  };

  const updateKeywordField = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.map((k, i) => i === index ? value : k)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Custom Keywords & Rules</h2>
            <p className="text-slate-600 mt-1">Manage your custom categorization rules</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <Download size={16} />
              <span>Export</span>
            </button>
            <label className="flex items-center space-x-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer">
              <Upload size={16} />
              <span>Import</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('keywords')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'keywords'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Keywords ({keywords.length})
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'rules'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Rules ({rules.length})
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search keywords or descriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div className="relative">
              <Filter size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <select
                value={filterAccount}
                onChange={(e) => setFilterAccount(e.target.value)}
                className="pl-10 pr-8 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 appearance-none bg-white"
              >
                <option value="">All Accounts</option>
                {accounts.map(acc => (
                  <option key={acc.code} value={acc.code}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAdd}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus size={16} />
              <span>Add {activeTab === 'keywords' ? 'Keyword' : 'Rule'}</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'keywords' ? (
            <div className="space-y-4">
              {filteredKeywords.map(keyword => (
                <div key={keyword.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium text-slate-800">{keyword.keyword}</span>
                      <span className="text-sm text-slate-500">→</span>
                      <span className="font-medium text-purple-600">{keyword.accountCode}</span>
                      <span className="text-sm text-slate-400">({keyword.confidence}% confidence)</span>
                    </div>
                    {keyword.description && (
                      <p className="text-sm text-slate-600 mt-1">{keyword.description}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      Created: {keyword.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(keyword)}
                      className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(keyword.id)}
                      className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {filteredKeywords.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <p>No keywords found. Add your first keyword to get started!</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRules.map(rule => (
                <div key={rule.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium text-slate-800">
                        {rule.keywords.join(' OR ')}
                      </span>
                      <span className="text-sm text-slate-500">→</span>
                      <span className="font-medium text-purple-600">{rule.accountCode}</span>
                      <span className="text-sm text-slate-400">({rule.confidence}% confidence)</span>
                    </div>
                    {rule.description && (
                      <p className="text-sm text-slate-600 mt-1">{rule.description}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      Created: {rule.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(rule)}
                      className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {filteredRules.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <p>No rules found. Add your first rule to get started!</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add/Edit Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800">
                  {editingItem ? 'Edit' : 'Add'} {activeTab === 'keywords' ? 'Keyword' : 'Rule'}
                </h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {activeTab === 'keywords' ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Keyword *
                    </label>
                    <input
                      type="text"
                      value={formData.keyword}
                      onChange={(e) => setFormData(prev => ({ ...prev, keyword: e.target.value }))}
                      placeholder="e.g., STARBUCKS, UBER EATS"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Keywords *
                    </label>
                    {formData.keywords.map((keyword, index) => (
                      <div key={index} className="flex items-center space-x-2 mb-2">
                        <input
                          type="text"
                          value={keyword}
                          onChange={(e) => updateKeywordField(index, e.target.value)}
                          placeholder={`Keyword ${index + 1}`}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                        {formData.keywords.length > 1 && (
                          <button
                            onClick={() => removeKeywordField(index)}
                            className="p-2 text-red-500 hover:text-red-700 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={addKeywordField}
                      className="text-sm text-purple-600 hover:text-purple-700 transition-colors"
                    >
                      + Add another keyword
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Account Code *
                  </label>
                  <select
                    value={formData.accountCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, accountCode: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Select an account...</option>
                    {accounts.map(acc => (
                      <option key={acc.code} value={acc.code}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Confidence ({formData.confidence}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.confidence}
                    onChange={(e) => setFormData(prev => ({ ...prev, confidence: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of this rule..."
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Save size={16} />
                    <span>Save</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 