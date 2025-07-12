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
    this.chartOfAccounts = ChartOfAccounts.getInstance(province);
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
          { header: 'Date', key: 'date', required: true, transform: (t) => this.formatDateForExport(t.date, 'DD/MM/YYYY') },
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
          { header: 'Date', key: 'date', required: true, transform: (t) => this.formatDateForExport(t.date, 'DD/MM/YYYY') },
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
      },
      {
        id: 'quickbooks',
        name: 'QuickBooks Online',
        description: 'Compatible with QuickBooks Online bank import format',
        fileExtension: 'csv',
        columns: [
          { header: 'Date', key: 'date', required: true, transform: (t) => this.formatDateForExport(t.date, 'MM/DD/YYYY') },
          { header: 'Description', key: 'description', required: true },
          { header: 'Amount', key: 'amount', required: true, transform: (t) => t.amount.toFixed(2) },
          { header: 'Account', key: 'accountCode', transform: (t, coa) => this.getAccountNameForQuickBooks(t, coa) },
          { header: 'Memo', key: 'merchant' },
          { header: 'Name', key: 'merchant' },
          { header: 'Class', key: 'class', transform: () => '' },
          { header: 'Location', key: 'location', transform: () => '' }
        ]
      },
      {
        id: 'sage',
        name: 'Sage 50 Accounting',
        description: 'Compatible with Sage 50 (Simply Accounting) import format',
        fileExtension: 'csv',
        columns: [
          { header: 'Date', key: 'date', required: true, transform: (t) => this.formatDateForExport(t.date, 'DD/MM/YYYY') },
          { header: 'Journal', key: 'journal', transform: () => 'General Journal' },
          { header: 'Account', key: 'accountCode', required: true },
          { header: 'Debits', key: 'debit', transform: (t) => t.amount < 0 ? Math.abs(t.amount).toFixed(2) : '0.00' },
          { header: 'Credits', key: 'credit', transform: (t) => t.amount > 0 ? t.amount.toFixed(2) : '0.00' },
          { header: 'Comment', key: 'description' },
          { header: 'Name', key: 'merchant' },
          { header: 'Allocated', key: 'allocated', transform: () => 'No' }
        ]
      },
      {
        id: 'basic-accounting',
        name: 'Basic Accounting CSV',
        description: 'Simple format for most accounting software (universal)',
        fileExtension: 'csv',
        columns: [
          { header: 'Date', key: 'date', required: true, transform: (t) => this.formatDateForExport(t.date, 'DD/MM/YYYY') },
          { header: 'Description', key: 'description', required: true },
          { header: 'Amount', key: 'amount', required: true, transform: (t) => t.amount.toFixed(2) },
          { header: 'Category', key: 'category' },
          { header: 'Account Code', key: 'accountCode' },
          { header: 'Account Name', key: 'accountName', transform: (t, coa) => this.getAccountName(t.accountCode, coa) },
          { header: 'Merchant', key: 'merchant' },
          { header: 'Tax Amount', key: 'taxAmount', transform: (t, coa) => this.calculateTaxAmount(t, coa) },
          { header: 'Net Amount', key: 'netAmount', transform: (t, coa) => this.calculateNetAmount(t, coa) },
          { header: 'Reference', key: 'id' }
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

    // Ensure chart of accounts is initialized
    await this.chartOfAccounts.waitForInitialization();
    console.log(`📊 Chart of Accounts ready for province: ${this.chartOfAccounts.getProvince()}`);

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
   * Format date for export without timezone issues
   */
  private formatDateForExport(dateString: string, format: string): string {
    try {
      // Parse YYYY-MM-DD format without timezone issues
      const parts = dateString.split('-');
      if (parts.length !== 3) {
        throw new Error('Invalid date format');
      }
      
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const day = parseInt(parts[2]);
      
      // Validate date components
      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        throw new Error('Invalid date components');
      }
      
      // Format according to specified format
      switch (format) {
        case 'DD/MM/YYYY':
          return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
        case 'MM/DD/YYYY':
          return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
        case 'YYYY-MM-DD':
          return dateString; // Already in correct format
        default:
          // Default to DD/MM/YYYY
          return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
      }
    } catch (error) {
      console.error('Date formatting error:', error, 'for date:', dateString);
      // Fallback to original string if parsing fails
      return dateString;
    }
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
    let account = null;
    
    // First try to get account by account code, then by category
    if (transaction.accountCode) {
      account = chartOfAccounts.getAccount(transaction.accountCode);
    } else if (transaction.category) {
      account = chartOfAccounts.findAccountByCategory(transaction.category);
    }
    
    if (!account) {
      console.log(`💰 No account found for transaction: ${transaction.description} (code: ${transaction.accountCode}, category: ${transaction.category})`);
      return 'Tax Exempt (0%)';
    }
    
    // Get the current province from chartOfAccounts
    const province = this.chartOfAccounts.getProvince();
    
    // Enhanced debug logging
    console.log(`💰 Tax rate calculation: "${transaction.description}"`);
    console.log(`   ├── Account: ${account.name} (${account.code})`);
    console.log(`   ├── Tax Rate: ${account.taxRate}%`);
    console.log(`   ├── Province: ${province}`);
    console.log(`   └── Tax Code: ${account.taxCode || 'N/A'}`);
    
    // Map to exact Xero tax rate names by province and tax type
    // These MUST match exactly what's in Xero or the coding won't persist
    if (account.taxRate === 0) {
      const result = 'Tax Exempt (0%)';
      console.log(`   🏷️  Final Tax Rate: ${result}`);
      return result;
    }
    
    let result: string;
    switch (province) {
      case 'AB':
        result = 'AB - GST on Purchases (5%)';
        break;
      case 'BC':
        result = 'BC - GST/PST on Purchases (12%)';
        break;
      case 'MB':
        result = 'MB - GST/RST on Purchases (12%)';
        break;
      case 'NB':
        result = 'NB - HST on Purchases (15%)';
        break;
      case 'NL':
        result = 'NL - HST on Purchases (15%)';
        break;
      case 'NS':
        result = 'NS - HST on Purchases (14%)';
        break;
      case 'NT':
        result = 'NT - GST on Purchases (5%)';
        break;
      case 'NU':
        result = 'NU - GST on Purchases (5%)';
        break;
      case 'ON':
        result = 'ON - HST on Purchases (13%)';
        break;
      case 'PE':
        result = 'PE - HST on Purchases (15%)';
        break;
      case 'QC':
        result = 'QC - GST/QST on Purchases (14.975%)';
        break;
      case 'SK':
        result = 'SK - GST/PST on Purchases (11%)';
        break;
      case 'YT':
        result = 'YT - GST on Purchases (5%)';
        break;
      default:
        // Fallback for unknown provinces
        if (account.taxType === 'HST') {
          result = 'ON - HST on Purchases (13%)';
        } else {
          result = 'AB - GST on Purchases (5%)';
        }
        console.log(`   ⚠️  Unknown province "${province}", using fallback`);
    }
    
    console.log(`   🏷️  Final Tax Rate: ${result}`);
    return result;
  }



  async setProvince(provinceCode: string): Promise<void> {
    await this.chartOfAccounts.setProvince(provinceCode);
  }

  /**
   * Get account name for QuickBooks format
   */
  private getAccountNameForQuickBooks(transaction: Transaction, chartOfAccounts: ChartOfAccounts): string {
    if (!transaction.accountCode) return 'Uncategorized';
    
    const account = chartOfAccounts.getAccount(transaction.accountCode);
    return account ? account.name : 'Uncategorized';
  }

  /**
   * Get account name by account code
   */
  private getAccountName(accountCode: string | undefined, chartOfAccounts: ChartOfAccounts): string {
    if (!accountCode) return '';
    
    const account = chartOfAccounts.getAccount(accountCode);
    return account ? account.name : '';
  }

  /**
   * Calculate tax amount for transaction
   */
  private calculateTaxAmount(transaction: Transaction, chartOfAccounts: ChartOfAccounts): string {
    if (!transaction.accountCode) return '0.00';
    
    const account = chartOfAccounts.getAccount(transaction.accountCode);
    if (!account || account.taxRate === 0) return '0.00';
    
    const taxAmount = Math.abs(transaction.amount) * (account.taxRate / 100);
    return taxAmount.toFixed(2);
  }

  /**
   * Calculate net amount (amount excluding tax)
   */
  private calculateNetAmount(transaction: Transaction, chartOfAccounts: ChartOfAccounts): string {
    if (!transaction.accountCode) return Math.abs(transaction.amount).toFixed(2);
    
    const account = chartOfAccounts.getAccount(transaction.accountCode);
    if (!account || account.taxRate === 0) return Math.abs(transaction.amount).toFixed(2);
    
    const netAmount = Math.abs(transaction.amount) / (1 + account.taxRate / 100);
    return netAmount.toFixed(2);
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