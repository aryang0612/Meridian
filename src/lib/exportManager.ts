import { Transaction } from './types';
import { ChartOfAccounts } from './chartOfAccounts';
import { escapeCSVRow } from './formatUtils';

export interface ExportFormat {
  id: string;
  name: string;
  description: string;
  fileExtension: string;
  columns: ExportColumn[];
}

export interface ExportColumn {
  header: string;
  key: string;
  transform?: (transaction: Transaction, chartOfAccounts: ChartOfAccounts) => string;
  required?: boolean;
}

export interface ExportOptions {
  format: string;
  dateRange: {
    start: string;
    end: string;
  };
  includeUncategorized: boolean;
  includeConfidenceScores: boolean;
  includeAuditTrail: boolean;
  onlyApproved: boolean;
  province: string;
}

export interface ExportValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    total: number;
    categorized: number;
    approved: number;
    highConfidence: number;
    missingAccounts: number;
  };
}

export interface ExportResult {
  filename: string;
  content: string;
  validation: ExportValidation;
  summary: {
    totalTransactions: number;
    totalAmount: number;
    dateRange: string;
    exportFormat: string;
    generatedAt: string;
  };
}

export class ExportManager {
  private chartOfAccounts: ChartOfAccounts;

  constructor(province: string = 'ON') {
    this.chartOfAccounts = new ChartOfAccounts(province);
  }

  /**
   * Get available export formats
   */
  getAvailableFormats(): ExportFormat[] {
    return [
      {
        id: 'generic',
        name: 'Generic CSV',
        description: 'Standard CSV format with all transaction details',
        fileExtension: 'csv',
        columns: [
          { header: 'Date', key: 'date', required: true },
          { header: 'Description', key: 'description', required: true },
          { header: 'Merchant', key: 'merchant' },
          { header: 'Amount', key: 'amount', required: true },
          { header: 'Category', key: 'category' },
          { header: 'Account Code', key: 'accountCode' },
          { header: 'Confidence', key: 'confidence' },
          { header: 'Approved', key: 'isApproved', transform: (t) => t.isApproved ? 'Yes' : 'No' },
          { header: 'Manually Edited', key: 'isManuallyEdited', transform: (t) => t.isManuallyEdited ? 'Yes' : 'No' }
        ]
      },
      {
        id: 'xero-precoded',
        name: 'Xero Precoded Import',
        description: 'Ready-to-import Xero format with account codes and tax rates (RECOMMENDED)',
        fileExtension: 'csv',
        columns: [
          { header: 'Date', key: 'date', required: true, transform: (t) => new Date(t.date).toLocaleDateString('en-AU') },
          { header: 'Amount', key: 'amount', required: true, transform: (t) => t.amount.toFixed(2) },
          { header: 'Payee', key: 'merchant' },
          { header: 'Description', key: 'description' },
          { header: 'Reference', key: 'id' },
          { header: 'Cheque Number', key: 'checkNumber', transform: () => '' },
          { 
            header: 'Account Code', 
            key: 'accountCode',
            required: true,
            transform: (t, coa) => t.accountCode || this.getAccountForCategory(t.category, coa)
          },
          {
            header: 'Tax Rate',
            key: 'taxRate',
            required: true,
            transform: (t, coa) => this.getTaxRateForXeroPrecoded(t, coa)
          }
        ]
      },
      {
        id: 'xero-simple',
        name: 'Xero Simple Precoded',
        description: 'Simplified Xero format (use if full format times out)',
        fileExtension: 'csv',
        columns: [
          { header: 'Date', key: 'date', required: true, transform: (t) => new Date(t.date).toLocaleDateString('en-AU') },
          { header: 'Amount', key: 'amount', required: true, transform: (t) => t.amount.toFixed(2) },
          { header: 'Payee', key: 'merchant' },
          { header: 'Description', key: 'description' },
          { 
            header: 'Account Code', 
            key: 'accountCode',
            required: true,
            transform: (t, coa) => t.accountCode || this.getAccountForCategory(t.category, coa)
          },
          {
            header: 'Tax Rate',
            key: 'taxRate',
            required: true,
            transform: (t, coa) => this.getTaxRateForXeroPrecoded(t, coa)
          }
        ]
      }
    ];
  }

  /**
   * Validate transactions before export
   */
  validateForExport(transactions: Transaction[], options: ExportOptions): ExportValidation {
    const validation: ExportValidation = {
      isValid: true,
      errors: [],
      warnings: [],
      stats: {
        total: transactions.length,
        categorized: 0,
        approved: 0,
        highConfidence: 0,
        missingAccounts: 0
      }
    };

    if (transactions.length === 0) {
      validation.isValid = false;
      validation.errors.push('No transactions to export');
      return validation;
    }

    // Calculate stats
    for (const transaction of transactions) {
      if (transaction.category) validation.stats.categorized++;
      if (transaction.isApproved) validation.stats.approved++;
      if ((transaction.confidence ?? 0) >= 80) validation.stats.highConfidence++;
      if (transaction.category && !transaction.accountCode) validation.stats.missingAccounts++;
    }

    // Validation rules
    const uncategorized = validation.stats.total - validation.stats.categorized;
    if (uncategorized > 0 && !options.includeUncategorized) {
      validation.warnings.push(`${uncategorized} uncategorized transactions will be excluded`);
    }

    if (validation.stats.missingAccounts > 0) {
      validation.warnings.push(`${validation.stats.missingAccounts} transactions missing account codes`);
    }

    const lowConfidence = validation.stats.total - validation.stats.highConfidence;
    if (lowConfidence > 0) {
      validation.warnings.push(`${lowConfidence} transactions have low confidence scores (<80%)`);
    }

    if (options.onlyApproved && validation.stats.approved < validation.stats.total) {
      const unapproved = validation.stats.total - validation.stats.approved;
      validation.warnings.push(`${unapproved} unapproved transactions will be excluded`);
    }

    // Date range validation
    const startDate = new Date(options.dateRange.start);
    const endDate = new Date(options.dateRange.end);
    if (startDate > endDate) {
      validation.isValid = false;
      validation.errors.push('Start date must be before end date');
    }

    // Format-specific validation
    const format = this.getAvailableFormats().find(f => f.id === options.format);
    if (!format) {
      validation.isValid = false;
      validation.errors.push('Invalid export format selected');
    }

    return validation;
  }

  /**
   * Export transactions to specified format
   */
  async exportTransactions(
    transactions: Transaction[], 
    options: ExportOptions
  ): Promise<ExportResult> {
    console.log(`📤 Starting export: ${options.format} format, ${transactions.length} transactions`);

    // Get export format
    const format = this.getAvailableFormats().find(f => f.id === options.format);
    if (!format) {
      throw new Error('Invalid export format');
    }



    // Validate first for transaction exports
    const validation = this.validateForExport(transactions, options);
    if (!validation.isValid) {
      throw new Error(`Export validation failed: ${validation.errors.join(', ')}`);
    }

    // Filter transactions based on options
    const filteredTransactions = this.filterTransactionsForExport(transactions, options);

    // Generate CSV content
    const content = await this.generateCSVContent(filteredTransactions, format, options);

    // Calculate summary
    const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    const dates = filteredTransactions.map(t => new Date(t.date)).sort((a, b) => a.getTime() - b.getTime());
    const startDate = dates[0]?.toLocaleDateString('en-CA') || 'N/A';
    const endDate = dates[dates.length - 1]?.toLocaleDateString('en-CA') || 'N/A';

    const result: ExportResult = {
      filename: this.generateFilename(options, format),
      content,
      validation,
      summary: {
        totalTransactions: filteredTransactions.length,
        totalAmount,
        dateRange: `${startDate} to ${endDate}`,
        exportFormat: format.name,
        generatedAt: new Date().toISOString()
      }
    };

    console.log(`✅ Export complete: ${result.filename}, ${result.summary.totalTransactions} transactions`);
    return result;
  }

  /**
   * Filter transactions based on export options
   */
  private filterTransactionsForExport(transactions: Transaction[], options: ExportOptions): Transaction[] {
    let filtered = [...transactions];

    // Date range filter
    const startDate = new Date(options.dateRange.start);
    const endDate = new Date(options.dateRange.end);
    filtered = filtered.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= startDate && transactionDate <= endDate;
    });

    // Categorization filter
    if (!options.includeUncategorized) {
      filtered = filtered.filter(t => t.category);
    }

    // Approval filter
    if (options.onlyApproved) {
      filtered = filtered.filter(t => t.isApproved);
    }

    return filtered;
  }

  /**
   * Generate CSV content for export
   */
  private async generateCSVContent(
    transactions: Transaction[],
    format: ExportFormat,
    options: ExportOptions
  ): Promise<string> {
    const rows: string[] = [];

    // Add header row
    const headers = format.columns.map(col => col.header);
    rows.push(this.escapeCSVRow(headers));

    // Add data rows
    for (const transaction of transactions) {
      const row = format.columns.map(col => {
        let value: string;

        if (col.transform) {
          value = col.transform(transaction, this.chartOfAccounts);
        } else {
          const rawValue = transaction[col.key as keyof Transaction];
          value = rawValue?.toString() || '';
        }

        // Format specific values
        if (col.key === 'date') {
          // Use the transform function's date format if it exists, otherwise default
          if (!col.transform) {
            value = new Date(transaction.date).toLocaleDateString('en-AU'); // DD/MM/YYYY
          }
        } else if (col.key === 'amount') {
          value = transaction.amount.toFixed(2);
        } else if (col.key === 'confidence') {
          value = `${transaction.confidence}%`;
        }

        return value;
      });

      // Log the first few rows for debugging Xero formats
      if (format.id.startsWith('xero') && rows.length <= 3) {
        console.log(`🔍 Xero CSV Row ${rows.length}:`, row);
      }

      rows.push(this.escapeCSVRow(row));
    }

    // Add audit trail if requested (but not for Xero formats to avoid column mapping issues)
    if (options.includeAuditTrail && !format.id.startsWith('xero')) {
      rows.push(''); // Empty row
      rows.push(this.escapeCSVRow(['=== AUDIT TRAIL ===']));
      rows.push(this.escapeCSVRow(['Export Generated', new Date().toISOString()]));
      rows.push(this.escapeCSVRow(['Export Format', format.name]));
      rows.push(this.escapeCSVRow(['Province', options.province]));
      rows.push(this.escapeCSVRow(['Total Transactions', transactions.length.toString()]));
      rows.push(this.escapeCSVRow(['Include Uncategorized', options.includeUncategorized.toString()]));
      rows.push(this.escapeCSVRow(['Only Approved', options.onlyApproved.toString()]));
    }

    return rows.join('\n');
  }

  /**
   * Escape CSV row for safe export - now using centralized utility
   */
  private escapeCSVRow(row: string[]): string {
    return escapeCSVRow(row);
  }

  /**
   * Generate filename for export
   */
  private generateFilename(options: ExportOptions, format: ExportFormat): string {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const formatName = format.id.toLowerCase();
    const province = options.province.toLowerCase();
    
    return `meridian_export_${formatName}_${province}_${date}.${format.fileExtension}`;
  }

  /**
   * Get account code for category
   */
  private getAccountForCategory(category: string | undefined, chartOfAccounts: ChartOfAccounts): string {
    if (!category) return '453'; // Default to Office Expenses
    
    const account = chartOfAccounts.findAccountByCategory(category);
    return account?.code || '453'; // Default to Office Expenses if no mapping found
  }





  /**
   * Get tax rate for Xero precoded format (specific format for cash coding)
   */
  private getTaxRateForXeroPrecoded(transaction: Transaction, chartOfAccounts: ChartOfAccounts): string {
    if (!transaction.category) return 'Tax Exempt (0%)';
    
    const account = chartOfAccounts.findAccountByCategory(transaction.category);
    if (!account) return 'Tax Exempt (0%)';
    
    // Get the current province from chartOfAccounts
    const province = this.chartOfAccounts.getProvince();
    
    // Map to exact Xero tax rate names by province and tax type
    // These MUST match exactly what's in Xero or the coding won't persist
    if (account.taxRate === 0) {
      return 'Tax Exempt (0%)';
    }
    
    switch (province) {
      case 'AB':
        return 'AB - GST on Purchases (5%)';
      case 'BC':
        return 'BC - GST/PST on Purchases (12%)';
      case 'MB':
        return 'MB - GST/RST on Purchases (12%)';
      case 'NB':
        return 'NB - HST on Purchases (15%)';
      case 'NL':
        return 'NL - HST on Purchases (15%)';
      case 'NS':
        return 'NS - HST on Purchases (14%)';
      case 'NT':
        return 'NT - GST on Purchases (5%)';
      case 'NU':
        return 'NU - GST on Purchases (5%)';
      case 'ON':
        return 'ON - HST on Purchases (13%)';
      case 'PE':
        return 'PE - HST on Purchases (15%)';
      case 'QC':
        return 'QC - GST/QST on Purchases (14.975%)';
      case 'SK':
        return 'SK - GST/PST on Purchases (11%)';
      case 'YT':
        return 'YT - GST on Purchases (5%)';
      default:
        // Fallback for unknown provinces
        if (account.taxType === 'HST') return 'ON - HST on Purchases (13%)';
        return 'AB - GST on Purchases (5%)';
    }
  }



  setProvince(provinceCode: string): void {
    this.chartOfAccounts.setProvince(provinceCode);
  }

  getExportStats(transactions: Transaction[]): {
    totalTransactions: number;
    categorizedTransactions: number;
    approvedTransactions: number;
    highConfidenceTransactions: number;
    totalExpenses: number;
    totalIncome: number;
    categoriesUsed: string[];
    accountCodesUsed: string[];
  } {
    const stats = {
      totalTransactions: transactions.length,
      categorizedTransactions: transactions.filter(t => t.category).length,
      approvedTransactions: transactions.filter(t => t.isApproved).length,
      highConfidenceTransactions: transactions.filter(t => (t.confidence ?? 0) >= 80).length,
      totalExpenses: transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0),
      totalIncome: transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
      categoriesUsed: Array.from(new Set(transactions.map(t => t.category).filter((c): c is string => Boolean(c)))).sort(),
      accountCodesUsed: Array.from(new Set(transactions.map(t => t.accountCode).filter((c): c is string => Boolean(c)))).sort()
    };

    return stats;
  }
} 