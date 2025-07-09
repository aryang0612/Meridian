'use client';
import React, { useState, useEffect } from 'react';
import { CustomKeywordManager, CustomKeyword, CustomKeywordRule } from '../data/customKeywords';

interface KeywordManagerProps {
  onClose?: () => void;
}

export default function KeywordManager({ onClose }: KeywordManagerProps) {
  const [manager] = useState(() => CustomKeywordManager.getInstance());
  const [keywords, setKeywords] = useState<CustomKeyword[]>([]);
  const [rules, setRules] = useState<CustomKeywordRule[]>([]);
  const [stats, setStats] = useState({ totalKeywords: 0, totalRules: 0, accountCodes: [] as string[] });
  
  // Form states
  const [showAddKeyword, setShowAddKeyword] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<CustomKeyword | null>(null);
  const [editingRule, setEditingRule] = useState<CustomKeywordRule | null>(null);
  
  // New keyword form
  const [newKeyword, setNewKeyword] = useState({
    keyword: '',
    accountCode: '',
    confidence: 90,
    description: ''
  });
  
  // New rule form
  const [newRule, setNewRule] = useState({
    keywords: [''],
    accountCode: '',
    confidence: 90,
    description: ''
  });
  
  // Import/Export
  const [importData, setImportData] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setKeywords(manager.getKeywords());
    setRules(manager.getRules());
    setStats(manager.getStats());
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAddKeyword = () => {
    if (!newKeyword.keyword.trim() || !newKeyword.accountCode) {
      showMessage('error', 'Please fill in all required fields');
      return;
    }

    manager.addKeyword(
      newKeyword.keyword,
      newKeyword.accountCode,
      newKeyword.confidence,
      newKeyword.description || undefined
    );
    
    setNewKeyword({ keyword: '', accountCode: '', confidence: 90, description: '' });
    setShowAddKeyword(false);
    loadData();
    showMessage('success', 'Keyword added successfully');
  };

  const handleAddRule = () => {
    const validKeywords = newRule.keywords.filter(k => k.trim());
    if (validKeywords.length === 0 || !newRule.accountCode) {
      showMessage('error', 'Please add at least one keyword and select an account code');
      return;
    }

    manager.addRule(
      validKeywords,
      newRule.accountCode,
      newRule.confidence,
      newRule.description || undefined
    );
    
    setNewRule({ keywords: [''], accountCode: '', confidence: 90, description: '' });
    setShowAddRule(false);
    loadData();
    showMessage('success', 'Rule added successfully');
  };

  const handleUpdateKeyword = () => {
    if (!editingKeyword) return;
    
    const updated = manager.updateKeyword(editingKeyword.id, {
      keyword: editingKeyword.keyword,
      accountCode: editingKeyword.accountCode,
      confidence: editingKeyword.confidence,
      description: editingKeyword.description
    });
    
    if (updated) {
      setEditingKeyword(null);
      loadData();
      showMessage('success', 'Keyword updated successfully');
    }
  };

  const handleUpdateRule = () => {
    if (!editingRule) return;
    
    const updated = manager.updateRule(editingRule.id, {
      keywords: editingRule.keywords,
      accountCode: editingRule.accountCode,
      confidence: editingRule.confidence,
      description: editingRule.description
    });
    
    if (updated) {
      setEditingRule(null);
      loadData();
      showMessage('success', 'Rule updated successfully');
    }
  };

  const handleDeleteKeyword = (id: string) => {
    if (confirm('Are you sure you want to delete this keyword?')) {
      manager.removeKeyword(id);
      loadData();
      showMessage('success', 'Keyword deleted successfully');
    }
  };

  const handleDeleteRule = (id: string) => {
    if (confirm('Are you sure you want to delete this rule?')) {
      manager.removeRule(id);
      loadData();
      showMessage('success', 'Rule deleted successfully');
    }
  };

  const handleExport = () => {
    const data = manager.exportKeywords();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meridian-custom-keywords-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMessage('success', 'Keywords exported successfully');
  };

  const handleImport = () => {
    if (!importData.trim()) {
      showMessage('error', 'Please paste import data');
      return;
    }

    const result = manager.importKeywords(importData);
    if (result.success) {
      setImportData('');
      setShowImport(false);
      loadData();
      showMessage('success', result.message);
    } else {
      showMessage('error', result.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Custom Keywords Manager</h2>
            <p className="text-slate-600 mt-1">Manage your custom transaction categorization rules</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <span>Export</span>
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
            >
              <span>Import</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 mx-6 mt-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Stats */}
        <div className="p-6 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.totalKeywords}</div>
              <div className="text-sm text-slate-600">Total Keywords</div>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.totalRules}</div>
              <div className="text-sm text-slate-600">Total Rules</div>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats.accountCodes.length}</div>
              <div className="text-sm text-slate-600">Account Codes Used</div>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{stats.totalKeywords + stats.totalRules}</div>
              <div className="text-sm text-slate-600">Total Rules</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Keywords Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Single Keywords</h3>
                <button
                  onClick={() => setShowAddKeyword(true)}
                  className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <span>Add Keyword</span>
                </button>
              </div>

              <div className="space-y-3">
                {keywords.map((keyword) => (
                  <div key={keyword.id} className="bg-white border border-slate-200 rounded-lg p-4">
                    {editingKeyword?.id === keyword.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editingKeyword.keyword}
                          onChange={(e) => setEditingKeyword({ ...editingKeyword, keyword: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                          placeholder="Keyword"
                        />
                        <input
                          type="text"
                          value={editingKeyword.accountCode}
                          onChange={(e) => setEditingKeyword({ ...editingKeyword, accountCode: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                          placeholder="Account Code"
                        />
                        <div className="flex items-center space-x-2">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={editingKeyword.confidence}
                            onChange={(e) => setEditingKeyword({ ...editingKeyword, confidence: parseInt(e.target.value) })}
                            className="flex-1"
                          />
                          <span className="text-sm text-slate-600 w-12">{editingKeyword.confidence}%</span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={handleUpdateKeyword}
                            className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            <span>Save</span>
                          </button>
                          <button
                            onClick={() => setEditingKeyword(null)}
                            className="px-3 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-slate-900">{keyword.keyword}</div>
                          <div className="text-sm text-slate-600">{keyword.accountCode}</div>
                          <div className="text-xs text-slate-500">Confidence: {keyword.confidence}%</div>
                          {keyword.description && (
                            <div className="text-xs text-slate-500 mt-1">{keyword.description}</div>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingKeyword(keyword)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteKeyword(keyword.id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Rules Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Multi-Keyword Rules</h3>
                <button
                  onClick={() => setShowAddRule(true)}
                  className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <span>Add Rule</span>
                </button>
              </div>

              <div className="space-y-3">
                {rules.map((rule) => (
                  <div key={rule.id} className="bg-white border border-slate-200 rounded-lg p-4">
                    {editingRule?.id === rule.id ? (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          {editingRule.keywords.map((keyword, index) => (
                            <div key={index} className="flex space-x-2">
                              <input
                                type="text"
                                value={keyword}
                                onChange={(e) => {
                                  const newKeywords = [...editingRule.keywords];
                                  newKeywords[index] = e.target.value;
                                  setEditingRule({ ...editingRule, keywords: newKeywords });
                                }}
                                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
                                placeholder="Keyword"
                              />
                              {editingRule.keywords.length > 1 && (
                                <button
                                  onClick={() => {
                                    const newKeywords = editingRule.keywords.filter((_, i) => i !== index);
                                    setEditingRule({ ...editingRule, keywords: newKeywords });
                                  }}
                                  className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              setEditingRule({ ...editingRule, keywords: [...editingRule.keywords, ''] });
                            }}
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            + Add Keyword
                          </button>
                        </div>
                        <input
                          type="text"
                          value={editingRule.accountCode}
                          onChange={(e) => setEditingRule({ ...editingRule, accountCode: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                          placeholder="Account Code"
                        />
                        <div className="flex items-center space-x-2">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={editingRule.confidence}
                            onChange={(e) => setEditingRule({ ...editingRule, confidence: parseInt(e.target.value) })}
                            className="flex-1"
                          />
                          <span className="text-sm text-slate-600 w-12">{editingRule.confidence}%</span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={handleUpdateRule}
                            className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            <span>Save</span>
                          </button>
                          <button
                            onClick={() => setEditingRule(null)}
                            className="px-3 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-slate-900">{rule.keywords.join(', ')}</div>
                          <div className="text-sm text-slate-600">{rule.accountCode}</div>
                          <div className="text-xs text-slate-500">Confidence: {rule.confidence}%</div>
                          {rule.description && (
                            <div className="text-xs text-slate-500 mt-1">{rule.description}</div>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingRule(rule)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Add Keyword Modal */}
        {showAddKeyword && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Add New Keyword</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  value={newKeyword.keyword}
                  onChange={(e) => setNewKeyword({ ...newKeyword, keyword: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Enter keyword"
                />
                <input
                  type="text"
                  value={newKeyword.accountCode}
                  onChange={(e) => setNewKeyword({ ...newKeyword, accountCode: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Account Code"
                />
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-slate-600">Confidence:</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={newKeyword.confidence}
                    onChange={(e) => setNewKeyword({ ...newKeyword, confidence: parseInt(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="text-sm text-slate-600 w-12">{newKeyword.confidence}%</span>
                </div>
                <input
                  type="text"
                  value={newKeyword.description}
                  onChange={(e) => setNewKeyword({ ...newKeyword, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Description (optional)"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleAddKeyword}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Keyword
                  </button>
                  <button
                    onClick={() => setShowAddKeyword(false)}
                    className="px-4 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Rule Modal */}
        {showAddRule && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Add New Rule</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  {newRule.keywords.map((keyword, index) => (
                    <div key={index} className="flex space-x-2">
                      <input
                        type="text"
                        value={keyword}
                        onChange={(e) => {
                          const newKeywords = [...newRule.keywords];
                          newKeywords[index] = e.target.value;
                          setNewRule({ ...newRule, keywords: newKeywords });
                        }}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
                        placeholder="Enter keyword"
                      />
                      {newRule.keywords.length > 1 && (
                        <button
                          onClick={() => {
                            const newKeywords = newRule.keywords.filter((_, i) => i !== index);
                            setNewRule({ ...newRule, keywords: newKeywords });
                          }}
                          className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setNewRule({ ...newRule, keywords: [...newRule.keywords, ''] });
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Add Another Keyword
                  </button>
                </div>
                <input
                  type="text"
                  value={newRule.accountCode}
                  onChange={(e) => setNewRule({ ...newRule, accountCode: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Account Code"
                />
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-slate-600">Confidence:</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={newRule.confidence}
                    onChange={(e) => setNewRule({ ...newRule, confidence: parseInt(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="text-sm text-slate-600 w-12">{newRule.confidence}%</span>
                </div>
                <input
                  type="text"
                  value={newRule.description}
                  onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Description (optional)"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleAddRule}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Add Rule
                  </button>
                  <button
                    onClick={() => setShowAddRule(false)}
                    className="px-4 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Import Modal */}
        {showImport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Import Keywords</h3>
              <div className="space-y-4">
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  className="w-full h-32 px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Paste JSON data here..."
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleImport}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Import
                  </button>
                  <button
                    onClick={() => setShowImport(false)}
                    className="px-4 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400"
                  >
                    Cancel
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