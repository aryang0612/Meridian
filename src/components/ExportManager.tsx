'use client';
import { useState, useMemo, useEffect } from 'react';
import { Transaction } from '../lib/types';
import { ExportManager, ExportOptions, ExportFormat, ExportResult } from '../lib/exportManager';
import { PROVINCES } from '../data/provinces';
import { 
  Download, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Calendar,
  Settings,
  BarChart3,
  Shield,
  Clock,
  Info
} from 'lucide-react';

interface ExportManagerProps {
  transactions: Transaction[];
  province?: string;
  onTransactionsUpdate?: (transactions: Transaction[]) => void;
}

export default function ExportManagerComponent({ transactions, province = 'ON', onTransactionsUpdate }: ExportManagerProps) {
  const [exportManager] = useState(() => new ExportManager(province));
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'xero-simple',
    dateRange: {
      start: '',
      end: ''
    },
    includeUncategorized: true,
    includeConfidenceScores: true,
    includeAuditTrail: true,
    onlyApproved: false,
    province
  });

  // Sync province prop with internal state
  useEffect(() => {
    if (province !== exportOptions.province) {
      setExportOptions(prev => ({
        ...prev,
        province
      }));
    }
  }, [province, exportOptions.province]);

  // Available export formats
  const availableFormats = useMemo(() => exportManager.getAvailableFormats(), [exportManager]);

  // Calculate date range from transactions
  const transactionDateRange = useMemo(() => {
    if (transactions.length === 0) return { start: '', end: '' };
    
    const dates = transactions.map(t => t.date).sort();
    return {
      start: dates[0],
      end: dates[dates.length - 1]
    };
  }, [transactions]);

  // Set default date range
  useState(() => {
    if (transactionDateRange.start && transactionDateRange.end) {
      setExportOptions(prev => ({
        ...prev,
        dateRange: transactionDateRange
      }));
    }
  });

  // Validation
  const validation = useMemo(() => {
    if (transactions.length === 0) {
      return {
        isValid: false,
        errors: ['No transactions available for export'],
        warnings: [],
        stats: { total: 0, categorized: 0, approved: 0, highConfidence: 0, missingAccounts: 0 }
      };
    }
    
    return exportManager.validateForExport(transactions, exportOptions);
  }, [transactions, exportOptions, exportManager]);

  // Export statistics
  const exportStats = useMemo(() => 
    exportManager.getExportStats(transactions), 
    [transactions, exportManager]
  );

  // Handle export
  const handleExport = async () => {
    if (!validation.isValid || transactions.length === 0) return;

    setIsExporting(true);
    try {
      const result = await exportManager.exportTransactions(transactions, exportOptions);
      setExportResult(result);
      
      // Download file
      downloadFile(result.content, result.filename);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  // Download file helper
  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Auto-approve all transactions
  const handleAutoApproveAll = () => {
    if (!onTransactionsUpdate) return;
    
    const updatedTransactions = transactions.map(transaction => ({
      ...transaction,
      isApproved: true
    }));
    
    onTransactionsUpdate(updatedTransactions);
    console.log(`✅ Auto-approved all ${transactions.length} transactions`);
  };

  useEffect(() => {
    const updateProvince = async () => {
      console.log(`🔄 ExportManager: Changing province to ${exportOptions.province}`);
      try {
        await exportManager.setProvince(exportOptions.province);
        console.log(`✅ ExportManager: Province changed to ${exportOptions.province} and Chart of Accounts reloaded`);
      } catch (error) {
        console.error('❌ Error updating province in ExportManager:', error);
      }
    };

    updateProvince();
  }, [exportOptions.province, exportManager]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-purple-100/50 rounded-xl p-6 border border-purple-200">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Export for Accounting</h3>
          <p className="text-sm text-gray-600">
            Generate accounting software ready files with tax compliance
          </p>
        </div>
        <div className="flex items-center space-x-3 bg-white rounded-lg px-4 py-3 shadow-sm border border-purple-200">
          <Shield className="w-5 h-5 text-purple-600" />
          <span className="text-sm text-purple-700 font-semibold">CRA Compliant</span>
        </div>
      </div>

      {/* Export Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-purple-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:border-purple-200">
          <div className="flex items-center space-x-3 mb-3">
            <div className="bg-blue-100 p-2 rounded-lg">
            <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-semibold text-gray-700">Ready to Export</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">
            {exportStats.categorizedTransactions}
          </p>
          <p className="text-sm text-gray-500">
            of {exportStats.totalTransactions} transactions
          </p>
        </div>

        <div className="bg-white border border-purple-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:border-purple-200">
          <div className="flex items-center space-x-3 mb-3">
            <div className="bg-green-100 p-2 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm font-semibold text-gray-700">Approved</span>
          </div>
          <p className="text-3xl font-bold text-green-600 mb-1">
            {exportStats.approvedTransactions}
          </p>
          <p className="text-sm text-gray-500">
            {Math.round((exportStats.approvedTransactions / exportStats.totalTransactions) * 100)}% approved
          </p>
          {onTransactionsUpdate && exportStats.approvedTransactions < exportStats.totalTransactions && (
            <button
              onClick={handleAutoApproveAll}
              className="mt-3 w-full text-xs bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-3 rounded-lg transition-colors duration-200"
            >
              Auto-Approve All
            </button>
          )}
        </div>

        <div className="bg-white border border-purple-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:border-purple-200">
          <div className="flex items-center space-x-3 mb-3">
            <div className="bg-purple-100 p-2 rounded-lg">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm font-semibold text-gray-700">High Confidence</span>
          </div>
          <p className="text-3xl font-bold text-purple-600 mb-1">
            {exportStats.highConfidenceTransactions}
          </p>
          <p className="text-sm text-gray-500">
            {Math.round((exportStats.highConfidenceTransactions / exportStats.totalTransactions) * 100)}% confident
          </p>
        </div>

        <div className="bg-white border border-purple-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:border-purple-200">
          <div className="flex items-center space-x-3 mb-3">
            <div className="bg-orange-100 p-2 rounded-lg">
            <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-sm font-semibold text-gray-700">Date Range</span>
          </div>
          <p className="text-sm font-bold text-gray-900 mb-1">
            {transactionDateRange.start ? 
              `${new Date(transactionDateRange.start).toLocaleDateString('en-CA')} - ${new Date(transactionDateRange.end).toLocaleDateString('en-CA')}` :
              'No dates'
            }
          </p>
          <p className="text-sm text-gray-500">
            {Math.ceil((new Date(transactionDateRange.end).getTime() - new Date(transactionDateRange.start).getTime()) / (1000 * 60 * 60 * 24))} days
          </p>
        </div>
      </div>

      {/* Export Configuration */}
      <div className="bg-white border border-purple-200 rounded-xl p-8 shadow-sm">
        <h4 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
          <div className="bg-purple-100 p-2 rounded-lg mr-3">
            <Settings className="w-5 h-5 text-purple-600" />
          </div>
          Export Configuration
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Export Format */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Export Format
            </label>
            <select
              value={exportOptions.format}
              onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value }))}
              className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-black transition-all duration-300 hover:border-purple-300"
            >
              {availableFormats.map(format => (
                <option key={format.id} value={format.id}>
                  {format.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">
              {availableFormats.find(f => f.id === exportOptions.format)?.description}
            </p>
            {(exportOptions.format === 'xero-precoded' || exportOptions.format === 'xero-simple') && (
              <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-700">
                <strong>✨ Xero Format:</strong> {exportOptions.format === 'xero-simple' ? 'Simple format for easy import' : 'Includes account codes and tax calculations for direct import'}
              </div>
            )}
            {exportOptions.format === 'xero-chart-of-accounts' && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
                <strong>📋 Chart of Accounts:</strong> Export account codes to set up Xero before importing transactions
              </div>
            )}
          </div>

          {/* Province */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Province/Territory
            </label>
            <select
              value={exportOptions.province}
              onChange={(e) => setExportOptions(prev => ({ ...prev, province: e.target.value }))}
              className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-black transition-all duration-300 hover:border-purple-300"
            >
              {PROVINCES.map(province => (
                <option key={province.code} value={province.code}>
                  {province.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">
              For proper tax code assignment
            </p>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Date Range
            </label>
            {exportOptions.format === 'xero-chart-of-accounts' ? (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                Not applicable for Chart of Accounts export
              </div>
            ) : (
              <div className="space-y-3">
              <input
                type="date"
                value={exportOptions.dateRange.start}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, start: e.target.value }
                }))}
                  className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-black transition-all duration-300 hover:border-purple-300"
              />
              <input
                type="date"
                value={exportOptions.dateRange.end}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, end: e.target.value }
                }))}
                  className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-black transition-all duration-300 hover:border-purple-300"
              />
            </div>
            )}
          </div>
        </div>

        {/* Advanced Options */}
        <div className="mt-8">
          {exportOptions.format !== 'xero-chart-of-accounts' && (
            <>
          <button
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="flex items-center space-x-2 text-sm text-purple-600 hover:text-purple-800 font-medium transition-colors duration-300"
          >
            <Settings className="w-4 h-4" />
            <span>Advanced Options</span>
          </button>

          {showAdvancedOptions && (
                <div className="mt-6 p-6 bg-purple-50/50 border border-purple-200 rounded-xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeUncategorized}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, includeUncategorized: e.target.checked }))}
                        className="rounded border-purple-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
                  />
                      <span className="text-sm text-gray-700 font-medium">Include uncategorized transactions</span>
                </label>

                    <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.onlyApproved}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, onlyApproved: e.target.checked }))}
                        className="rounded border-purple-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
                  />
                      <span className="text-sm text-gray-700 font-medium">Only export approved transactions</span>
                </label>

                    <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeConfidenceScores}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, includeConfidenceScores: e.target.checked }))}
                        className="rounded border-purple-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
                  />
                      <span className="text-sm text-gray-700 font-medium">Include AI confidence scores</span>
                </label>

                    <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeAuditTrail}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, includeAuditTrail: e.target.checked }))}
                        className="rounded border-purple-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
                  />
                      <span className="text-sm text-gray-700 font-medium">Include audit trail</span>
                </label>
              </div>
            </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Xero-specific validation */}
      {exportOptions.format === 'xero-precoded' && validation.stats.missingAccounts > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-orange-100 p-2 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <h4 className="text-sm font-bold text-orange-800">Xero Precoded Requirements</h4>
          </div>
          <div className="text-sm text-orange-700 space-y-3">
            <p><strong>{validation.stats.missingAccounts} transactions</strong> are missing account codes for precoded import.</p>
            <p>Please ensure all transactions have both:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Category assigned</li>
              <li>Account code assigned</li>
            </ul>
            <p className="text-xs text-orange-600 mt-3 bg-orange-100 p-2 rounded">
              💡 Use the transaction table above to assign account codes to categorized transactions
            </p>
          </div>
        </div>
      )}

      {/* Xero Chart of Accounts guidance */}
      {exportOptions.format === 'xero-chart-of-accounts' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-green-100 p-2 rounded-lg">
              <Info className="w-5 h-5 text-green-600" />
            </div>
            <h4 className="text-sm font-bold text-green-800">Xero Chart of Accounts Export</h4>
          </div>
          <div className="text-sm text-green-700 space-y-3">
            <p><strong>📋 Setup Guide:</strong> This exports your chart of accounts for Xero setup</p>
            <div className="bg-green-100 border border-green-200 rounded-lg p-4 mt-3">
              <p className="font-semibold mb-3">Import Steps:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Export this chart of accounts file first</li>
                <li>Go to Accounting → Chart of Accounts in Xero</li>
                <li>Import this file to set up your account codes</li>
                <li>Then export and import your transaction files</li>
              </ol>
            </div>
            <p className="text-xs text-green-600 mt-3 bg-green-100 p-2 rounded">
              💡 This ensures smooth transaction imports with proper account code mapping
            </p>
          </div>
        </div>
      )}

      {/* Xero format guidance */}
      {(exportOptions.format === 'xero-simple' || exportOptions.format === 'xero-precoded') && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Info className="w-5 h-5 text-purple-600" />
            </div>
            <h4 className="text-sm font-bold text-purple-800">Xero Format Selected</h4>
          </div>
          <div className="text-sm text-purple-700 space-y-2">
            {exportOptions.format === 'xero-simple' && (
              <>
                <p><strong>Simple Xero:</strong> Streamlined format for easy import</p>
                <p>• Includes account codes and tax calculations</p>
                <p>• Faster processing for large files</p>
              </>
            )}
            {exportOptions.format === 'xero-precoded' && (
              <>
                <p><strong>Precoded Xero:</strong> Full format with all fields</p>
                <p>• Includes complete transaction details</p>
                <p>• Requires all transactions to have account codes assigned</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Validation Results */}
      {validation.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-red-100 p-2 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h4 className="text-sm font-bold text-red-800">Export Errors</h4>
          </div>
          <ul className="text-sm text-red-700 space-y-2">
            {validation.errors.map((error, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-yellow-100 p-2 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <h4 className="text-sm font-bold text-yellow-800">Export Warnings</h4>
          </div>
          <ul className="text-sm text-yellow-700 space-y-2">
            {validation.warnings.map((warning, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-yellow-500 mt-0.5">•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Export Success */}
      {exportResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-green-100 p-2 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <h4 className="text-sm font-bold text-green-800">Export Successful!</h4>
          </div>
          <div className="text-sm text-green-700 space-y-2">
            <p><strong>File:</strong> {exportResult.filename}</p>
            <p><strong>Transactions:</strong> {exportResult.summary.totalTransactions}</p>
            <p><strong>Total Amount:</strong> ${exportResult.summary.totalAmount.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</p>
            <p><strong>Date Range:</strong> {exportResult.summary.dateRange}</p>
            <p><strong>Generated:</strong> {new Date(exportResult.summary.generatedAt).toLocaleString()}</p>
            {(exportOptions.format === 'xero-simple' || exportOptions.format === 'xero-precoded') && (
              <div className="mt-4 p-4 bg-green-100 border border-green-200 rounded-lg">
                <p className="text-xs font-bold text-green-800">🎉 Ready for Xero!</p>
                <p className="text-xs text-green-700 mt-1">
                  {exportOptions.format === 'xero-simple' 
                    ? 'Your CSV is ready for import. Simple format for faster processing.'
                    : 'Your CSV includes account codes for automatic categorization. Import directly into Xero Banking.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Export Button */}
      <div className="flex items-center justify-between bg-white border border-purple-200 rounded-xl p-6">
        <div className="text-sm text-gray-600">
          {validation.isValid ? (
            <span className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Ready to export {validation.stats.total} transactions</span>
            </span>
          ) : (
            <span className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Please fix errors before exporting</span>
            </span>
          )}
        </div>

        <button
          onClick={handleExport}
          disabled={!validation.isValid || isExporting || transactions.length === 0}
          className="inline-flex items-center px-8 py-4 border border-transparent text-base font-semibold rounded-xl text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg hover:scale-105"
        >
          {isExporting ? (
            <>
              <Clock className="w-5 h-5 mr-3 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-5 h-5 mr-3" />
              Export for Accounting
            </>
          )}
        </button>
      </div>

      {/* Export Preview */}
      {validation.isValid && !isExporting && (
        <div className="bg-white border border-purple-200 rounded-xl p-8 shadow-sm">
          <h4 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <div className="bg-purple-100 p-2 rounded-lg mr-3">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            Export Preview
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Categories Breakdown */}
            <div>
              <h5 className="text-sm font-bold text-gray-700 mb-4">Categories ({exportStats.categoriesUsed.length})</h5>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {exportStats.categoriesUsed.slice(0, 8).map(category => (
                  <div key={category} className="text-sm text-gray-600 flex items-center justify-between p-2 bg-purple-50/50 rounded-lg">
                    <span className="truncate font-medium">{category}</span>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold">
                      {transactions.filter(t => t.category === category).length}
                    </span>
                  </div>
                ))}
                {exportStats.categoriesUsed.length > 8 && (
                  <div className="text-xs text-gray-500 text-center p-2">
                    +{exportStats.categoriesUsed.length - 8} more categories
                  </div>
                )}
              </div>
            </div>

            {/* Account Codes Breakdown */}
            <div>
              <h5 className="text-sm font-bold text-gray-700 mb-4">Account Codes ({exportStats.accountCodesUsed.length})</h5>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {exportStats.accountCodesUsed.slice(0, 8).map(accountCode => (
                  <div key={accountCode} className="text-sm text-gray-600 flex items-center justify-between p-2 bg-purple-50/50 rounded-lg">
                    <span className="truncate font-medium">{accountCode}</span>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold">
                      {transactions.filter(t => t.accountCode === accountCode).length}
                    </span>
                  </div>
                ))}
                {exportStats.accountCodesUsed.length > 8 && (
                  <div className="text-xs text-gray-500 text-center p-2">
                    +{exportStats.accountCodesUsed.length - 8} more accounts
                  </div>
                )}
              </div>
            </div>

            {/* Financial Summary */}
            <div>
              <h5 className="text-sm font-bold text-gray-700 mb-4">Financial Summary</h5>
              <div className="space-y-4">
                <div className="flex justify-between text-sm p-3 bg-red-50 rounded-lg">
                  <span className="text-gray-600 font-medium">Total Expenses:</span>
                  <span className="font-bold text-red-600">
                    ${exportStats.totalExpenses.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm p-3 bg-green-50 rounded-lg">
                  <span className="text-gray-600 font-medium">Total Income:</span>
                  <span className="font-bold text-green-600">
                    ${exportStats.totalIncome.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm p-3 bg-purple-50 rounded-lg border-t-2 border-purple-200">
                  <span className="text-gray-600 font-bold">Net Amount:</span>
                  <span className={`font-bold ${(exportStats.totalIncome - exportStats.totalExpenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${(exportStats.totalIncome - exportStats.totalExpenses).toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Information */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
        <h4 className="text-sm font-bold text-purple-800 mb-4 flex items-center">
          <Info className="w-4 h-4 mr-2" />
          📋 Import Instructions:
        </h4>
        <div className="text-sm text-purple-700 space-y-4">
          {exportOptions.format === 'xero' && (
            <div className="bg-purple-100 border border-purple-200 rounded-lg p-4">
              <p className="font-bold mb-2">Xero Precoded Import:</p>
              <ol className="list-decimal list-inside ml-2 space-y-1 text-xs">
                <li>Go to Banking → Bank Accounts in Xero</li>
                <li>Select your bank account</li>
                <li>Click &quot;Import a Statement&quot;</li>
                <li>Choose &quot;Upload a file&quot; and select your CSV</li>
                <li>Select &quot;Bank statement&quot; format</li>
                <li>Map columns if needed (should auto-detect)</li>
                <li>Review and import - transactions will be precoded!</li>
              </ol>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-white rounded-lg border border-purple-200">
              <p className="font-semibold text-purple-800">Xero:</p>
              <p className="text-xs">Banking → Bank Accounts → Import a Statement</p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-purple-200">
              <p className="font-semibold text-purple-800">QuickBooks:</p>
              <p className="text-xs">Banking → Banking → File Upload</p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-purple-200">
              <p className="font-semibold text-purple-800">Sage 50:</p>
              <p className="text-xs">File → Import/Export → Import</p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-purple-200">
              <p className="font-semibold text-purple-800">Other:</p>
              <p className="text-xs">Look for CSV import or bank statement import options</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 