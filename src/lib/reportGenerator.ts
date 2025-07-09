import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ChartOfAccounts } from './chartOfAccounts';
import { formatCurrency, formatDate } from './formatUtils';

// Types for financial data
export interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  category: string;
  accountCode: string;
  type: 'income' | 'expense' | 'asset' | 'liability' | 'equity';
}

export interface FinancialData {
  transactions: Transaction[];
  startDate: Date;
  endDate: Date;
  companyName: string;
  reportDate: Date;
  province?: string; // Add province to financial data
}

export interface ProfitLossData {
  revenue: {
    total: number;
    categories: Array<{ name: string; amount: number; accountCode: string }>;
  };
  expenses: {
    total: number;
    categories: Array<{ name: string; amount: number; accountCode: string }>;
  };
  netIncome: number;
  grossProfit: number;
  operatingIncome: number;
}

export interface BalanceSheetData {
  assets: {
    current: Array<{ name: string; amount: number; accountCode: string }>;
    nonCurrent: Array<{ name: string; amount: number; accountCode: string }>;
    totalCurrent: number;
    totalNonCurrent: number;
    total: number;
  };
  liabilities: {
    current: Array<{ name: string; amount: number; accountCode: string }>;
    nonCurrent: Array<{ name: string; amount: number; accountCode: string }>;
    totalCurrent: number;
    totalNonCurrent: number;
    total: number;
  };
  equity: {
    items: Array<{ name: string; amount: number; accountCode: string }>;
    total: number;
  };
}

// Fallback account categorization mapping (used when Chart of Accounts is not available)
// Updated to match actual province-specific CSV account codes
const FALLBACK_ACCOUNT_CATEGORIES = {
  // Revenue accounts (200-299)
  revenue: {
    regex: /^2\d{2}$/,
    type: 'income' as const,
    balanceSheetCategory: null
  },
  // Cost of Goods Sold (310-319)
  cogs: {
    regex: /^31\d$/,
    type: 'expense' as const,
    balanceSheetCategory: null
  },
  // Operating Expenses (400-599)
  operatingExpenses: {
    regex: /^[4-5]\d{2}$/,
    type: 'expense' as const,
    balanceSheetCategory: null
  },
  // Current Assets (610-699)
  currentAssets: {
    regex: /^6[1-9]\d$/,
    type: 'asset' as const,
    balanceSheetCategory: 'currentAssets'
  },
  // Fixed Assets (710-799)
  fixedAssets: {
    regex: /^7\d{2}$/,
    type: 'asset' as const,
    balanceSheetCategory: 'nonCurrentAssets'
  },
  // Current Liabilities (800-899)
  currentLiabilities: {
    regex: /^8\d{2}$/,
    type: 'liability' as const,
    balanceSheetCategory: 'currentLiabilities'
  },
  // Non-Current Liabilities (900-999)
  nonCurrentLiabilities: {
    regex: /^9\d{2}$/,
    type: 'liability' as const,
    balanceSheetCategory: 'nonCurrentLiabilities'
  },
  // Equity (960-999)
  equity: {
    regex: /^9[6-9]\d$/,
    type: 'equity' as const,
    balanceSheetCategory: 'equity'
  }
};

export class ReportGenerator {
  private chartOfAccounts: ChartOfAccounts;

  constructor(chartOfAccounts: ChartOfAccounts) {
    this.chartOfAccounts = chartOfAccounts;
  }

  public setProvince(province: string): void {
    if (!this.chartOfAccounts) {
      console.error('❌ ChartOfAccounts is not initialized in ReportGenerator');
      return;
    }
    this.chartOfAccounts.setProvince(province);
    console.log(`📊 ReportGenerator switched to province: ${province}`);
  }

  private categorizeAccount(accountCode: string): {
    type: 'income' | 'expense' | 'asset' | 'liability' | 'equity';
    balanceSheetCategory: string | null;
  } {
    accountCode = String(accountCode);
    // Use Chart of Accounts
    const account = this.chartOfAccounts.getAccount(accountCode);
    if (account) {
      // Map Chart of Accounts types to our types
      let type: 'income' | 'expense' | 'asset' | 'liability' | 'equity';
      let balanceSheetCategory: string | null = null;

      switch (account.type) {
        case 'Revenue':
          type = 'income';
          break;
        case 'Expense':
          type = 'expense';
          break;
        case 'Asset':
          type = 'asset';
          // Determine if current or non-current asset based on account code
          if (account.code.match(/^6[1-9]\d$/)) {
            balanceSheetCategory = 'currentAssets';
          } else if (account.code.match(/^7\d{2}$/)) {
            balanceSheetCategory = 'nonCurrentAssets';
          }
          break;
        case 'Liability':
          type = 'liability';
          // Determine if current or non-current liability based on account code
          if (account.code.match(/^8\d{2}$/)) {
            balanceSheetCategory = 'currentLiabilities';
          } else if (account.code.match(/^9\d{2}$/)) {
            balanceSheetCategory = 'nonCurrentLiabilities';
          }
          break;
        case 'Equity':
          type = 'equity';
          balanceSheetCategory = 'equity';
          break;
        default:
          type = 'expense';
      }

      console.log(`📊 Chart of Accounts categorization: ${accountCode} (${account.name}) -> ${type} (${account.type})`);
      return { type, balanceSheetCategory };
    }

    // Fallback to regex-based categorization if Chart of Accounts is not available
    const fallbackCategories = {
      income: { regex: /^2\d{2}$/, type: 'income' as const, balanceSheetCategory: null },
      expense: { regex: /^[4-5]\d{2}$/, type: 'expense' as const, balanceSheetCategory: null },
      asset: { regex: /^[6-7]\d{2}$/, type: 'asset' as const, balanceSheetCategory: 'currentAssets' },
      liability: { regex: /^[8-9]\d{2}$/, type: 'liability' as const, balanceSheetCategory: 'currentLiabilities' },
      equity: { regex: /^96\d$/, type: 'equity' as const, balanceSheetCategory: null }
    };
    
    for (const [key, config] of Object.entries(fallbackCategories)) {
      if (config.regex.test(accountCode)) {
        console.log(`📊 Fallback categorization: ${accountCode} -> ${config.type}`);
        return {
          type: config.type,
          balanceSheetCategory: config.balanceSheetCategory
        };
      }
    }
    
    // Default to expense if unknown
    console.warn(`⚠️ Unknown account code: ${accountCode}, defaulting to expense`);
    return { type: 'expense', balanceSheetCategory: null };
  }

  public generateProfitLossData(data: FinancialData): ProfitLossData {
    // Ensure Chart of Accounts is initialized with the correct province
    const province = data.province || 'ON';
    if (this.chartOfAccounts && this.chartOfAccounts.getProvince() !== province) {
      this.setProvince(province);
    }

    const revenue = { total: 0, categories: [] as Array<{ name: string; amount: number; accountCode: string }> };
    const expenses = { total: 0, categories: [] as Array<{ name: string; amount: number; accountCode: string }> };
    
    // Track validation issues
    const validationIssues: string[] = [];
    const uncategorizedTransactions: Transaction[] = [];
    const skippedCodes: Set<string> = new Set();
    
    // Group transactions by category and account code
    const categoryTotals = new Map<string, { amount: number; type: string; accountCode: string; transactionCount: number; accountName?: string }>();
    
    data.transactions.forEach(transaction => {
      // Skip E-Transfers as they need manual assignment
      if (transaction.category === 'E-Transfer') {
        console.log(`⏭️ Skipping E-Transfer transaction: ${transaction.description} - requires manual account assignment`);
        return;
      }

      // Validate account code exists
      if (!transaction.accountCode) {
        validationIssues.push(`Transaction "${transaction.description}" has no account code assigned`);
        uncategorizedTransactions.push(transaction);
        return;
      }

      // Strictly require account code to exist in the loaded Chart of Accounts
      let accountName = transaction.category;
      let codeToUse = transaction.accountCode;
      let accountFound = false;
      if (this.chartOfAccounts) {
        const account = this.chartOfAccounts.getAccount(String(transaction.accountCode));
        if (account) {
          accountName = account.name;
          codeToUse = account.code;
          accountFound = true;
          console.log(`✅ Found account: ${transaction.accountCode} -> ${account.name} (${account.type})`);
        } else {
          console.log(`❌ Account not found: ${transaction.accountCode} for transaction: ${transaction.description}`);
        }
      }
      if (!accountFound) {
        skippedCodes.add(transaction.accountCode);
        return; // Skip this transaction in the report
      }

      const { type } = this.categorizeAccount(codeToUse);
      const key = `${accountName}-${codeToUse}`;
      
      if (!categoryTotals.has(key)) {
        categoryTotals.set(key, { 
          amount: 0, 
          type, 
          accountCode: codeToUse,
          transactionCount: 0,
          accountName
        });
      }
      
      const current = categoryTotals.get(key)!;
      
      // Improved amount handling - consider transaction type and amount sign
      let processedAmount = transaction.amount;
      if (type === 'income') {
        processedAmount = Math.abs(transaction.amount);
      } else if (type === 'expense') {
        processedAmount = Math.abs(transaction.amount);
      }
      current.amount += processedAmount;
      current.transactionCount++;
      console.log(`📊 Categorized: "${transaction.description}" (${transaction.amount}) -> ${type} account ${codeToUse} (${accountName})`);
    });

    // Log validation issues
    if (validationIssues.length > 0) {
      console.warn(`⚠️ PnL Validation Issues:`, validationIssues);
    }
    if (uncategorizedTransactions.length > 0) {
      console.warn(`⚠️ ${uncategorizedTransactions.length} transactions without account codes - excluded from PnL`);
    }
    if (skippedCodes.size > 0) {
      console.warn(`⚠️ Skipped transactions with codes not found in Chart of Accounts for province ${province}:`, Array.from(skippedCodes));
    }

    // Separate revenue and expenses
    categoryTotals.forEach((data, key) => {
      const categoryName = data.accountName || key.split('-')[0];
      const item = {
        name: categoryName,
        amount: data.amount,
        accountCode: data.accountCode
      };
      if (data.type === 'income') {
        revenue.categories.push(item);
        revenue.total += data.amount;
        console.log(`💰 Revenue: ${categoryName} (${data.accountCode}) = ${formatCurrency(data.amount)} (${data.transactionCount} transactions)`);
      } else if (data.type === 'expense') {
        expenses.categories.push(item);
        expenses.total += data.amount;
        console.log(`💸 Expense: ${categoryName} (${data.accountCode}) = ${formatCurrency(data.amount)} (${data.transactionCount} transactions)`);
      } else {
        console.warn(`⚠️ Unknown account type for ${categoryName} (${data.accountCode}) - excluded from PnL`);
      }
    });

    revenue.categories.sort((a, b) => b.amount - a.amount);
    expenses.categories.sort((a, b) => b.amount - a.amount);

    // Calculate gross profit (Revenue - Cost of Goods Sold)
    const costOfGoodsSold = expenses.categories
      .filter(cat => cat.accountCode.match(/^31\d$/))
      .reduce((sum, cat) => sum + cat.amount, 0);
    const grossProfit = revenue.total - costOfGoodsSold;
    const operatingExpenses = expenses.categories
      .filter(cat => cat.accountCode.match(/^[4-5]\d{2}$/) && !cat.accountCode.match(/^31\d$/))
      .reduce((sum, cat) => sum + cat.amount, 0);
    const operatingIncome = grossProfit - operatingExpenses;
    const netIncome = revenue.total - expenses.total;

    // Log final calculations
    console.log(`📈 PnL Summary (Province: ${province}):`);
    console.log(`   Revenue: ${formatCurrency(revenue.total)}`);
    console.log(`   Expenses: ${formatCurrency(expenses.total)}`);
    console.log(`   Cost of Goods Sold: ${formatCurrency(costOfGoodsSold)}`);
    console.log(`   Gross Profit: ${formatCurrency(grossProfit)}`);
    console.log(`   Operating Expenses: ${formatCurrency(operatingExpenses)}`);
    console.log(`   Operating Income: ${formatCurrency(operatingIncome)}`);
    console.log(`   Net Income: ${formatCurrency(netIncome)}`);
    
    // Log account code ranges being used
    console.log(`📊 Account Code Ranges (Province: ${province}):`);
    console.log(`   Revenue accounts: 200-299`);
    console.log(`   Cost of Goods Sold: 310-319`);
    console.log(`   Operating Expenses: 400-599 (excluding COGS)`);
    console.log(`   Current Assets: 610-699`);
    console.log(`   Fixed Assets: 710-799`);
    console.log(`   Current Liabilities: 800-899`);
    console.log(`   Non-Current Liabilities: 900-999`);
    console.log(`   Equity: 960-999`);

    if (netIncome !== (revenue.total - expenses.total)) {
      console.error(`❌ PnL calculation error: Net income mismatch`);
    }
    if (grossProfit !== (revenue.total - costOfGoodsSold)) {
      console.error(`❌ PnL calculation error: Gross profit mismatch`);
    }

    return {
      revenue,
      expenses,
      netIncome,
      grossProfit,
      operatingIncome
    };
  }

  public generateBalanceSheetData(data: FinancialData): BalanceSheetData {
    // Ensure Chart of Accounts is initialized with the correct province
    const province = data.province || 'ON';
    if (this.chartOfAccounts?.getProvince() !== province) {
      this.setProvince(province);
    }

    const assets = {
      current: [] as Array<{ name: string; amount: number; accountCode: string }>,
      nonCurrent: [] as Array<{ name: string; amount: number; accountCode: string }>,
      totalCurrent: 0,
      totalNonCurrent: 0,
      total: 0
    };

    const liabilities = {
      current: [] as Array<{ name: string; amount: number; accountCode: string }>,
      nonCurrent: [] as Array<{ name: string; amount: number; accountCode: string }>,
      totalCurrent: 0,
      totalNonCurrent: 0,
      total: 0
    };

    const equity = {
      items: [] as Array<{ name: string; amount: number; accountCode: string }>,
      total: 0
    };

    // Track validation issues
    const validationIssues: string[] = [];
    const uncategorizedTransactions: Transaction[] = [];
    const skippedCodes: Set<string> = new Set();

    // Group transactions by category and account code
    const accountTotals = new Map<string, { amount: number; category: string; accountCode: string; transactionCount: number; accountName?: string }>();
    
    data.transactions.forEach(transaction => {
      // Skip E-Transfers as they need manual assignment
      if (transaction.category === 'E-Transfer') {
        console.log(`⏭️ Skipping E-Transfer transaction: ${transaction.description} - requires manual account assignment`);
        return;
      }

      // Validate account code exists
      if (!transaction.accountCode) {
        validationIssues.push(`Transaction "${transaction.description}" has no account code assigned`);
        uncategorizedTransactions.push(transaction);
        return;
      }

      // Strictly require account code to exist in the loaded Chart of Accounts
      let accountName = transaction.category;
      let codeToUse = transaction.accountCode;
      let accountFound = false;
      if (this.chartOfAccounts) {
        const account = this.chartOfAccounts.getAccount(String(transaction.accountCode));
        if (account) {
          accountName = account.name;
          codeToUse = account.code;
          accountFound = true;
        }
      }
      if (!accountFound) {
        skippedCodes.add(transaction.accountCode);
        return; // Skip this transaction in the report
      }

      const key = `${accountName}-${codeToUse}`;
      if (!accountTotals.has(key)) {
        accountTotals.set(key, { 
          amount: 0, 
          category: transaction.category,
          accountCode: codeToUse,
          transactionCount: 0,
          accountName
        });
      }
      const current = accountTotals.get(key)!;
      // For balance sheet, we need to consider the nature of the account
      const { balanceSheetCategory } = this.categorizeAccount(codeToUse);
      let processedAmount = Math.abs(transaction.amount);
      if (balanceSheetCategory === 'currentAssets' || balanceSheetCategory === 'nonCurrentAssets') {
        processedAmount = Math.abs(transaction.amount);
      } else if (balanceSheetCategory === 'currentLiabilities' || balanceSheetCategory === 'nonCurrentLiabilities' || balanceSheetCategory === 'equity') {
        processedAmount = Math.abs(transaction.amount);
      }
      current.amount += processedAmount;
      current.transactionCount++;
      console.log(`📊 Balance Sheet: "${transaction.description}" (${transaction.amount}) -> ${balanceSheetCategory} account ${codeToUse} (${accountName})`);
    });

    // Log validation issues
    if (validationIssues.length > 0) {
      console.warn(`⚠️ Balance Sheet Validation Issues:`, validationIssues);
    }
    if (uncategorizedTransactions.length > 0) {
      console.warn(`⚠️ ${uncategorizedTransactions.length} transactions without account codes - excluded from Balance Sheet`);
    }
    if (skippedCodes.size > 0) {
      console.warn(`⚠️ Skipped transactions with codes not found in Chart of Accounts for province ${province}:`, Array.from(skippedCodes));
    }

    // Categorize accounts for balance sheet
    accountTotals.forEach((data, key) => {
      const { balanceSheetCategory } = this.categorizeAccount(data.accountCode);
      if (!balanceSheetCategory) {
        console.warn(`⚠️ No balance sheet category for account ${data.accountCode} - excluded`);
        return;
      }
      const item = {
        name: data.accountName || data.category,
        amount: data.amount,
        accountCode: data.accountCode
      };
      switch (balanceSheetCategory) {
        case 'currentAssets':
          assets.current.push(item);
          assets.totalCurrent += data.amount;
          console.log(`💼 Current Asset: ${item.name} (${data.accountCode}) = ${formatCurrency(data.amount)} (${data.transactionCount} transactions)`);
          break;
        case 'nonCurrentAssets':
          assets.nonCurrent.push(item);
          assets.totalNonCurrent += data.amount;
          console.log(`🏢 Non-Current Asset: ${item.name} (${data.accountCode}) = ${formatCurrency(data.amount)} (${data.transactionCount} transactions)`);
          break;
        case 'currentLiabilities':
          liabilities.current.push(item);
          liabilities.totalCurrent += data.amount;
          console.log(`💳 Current Liability: ${item.name} (${data.accountCode}) = ${formatCurrency(data.amount)} (${data.transactionCount} transactions)`);
          break;
        case 'nonCurrentLiabilities':
          liabilities.nonCurrent.push(item);
          liabilities.totalNonCurrent += data.amount;
          console.log(`🏦 Non-Current Liability: ${item.name} (${data.accountCode}) = ${formatCurrency(data.amount)} (${data.transactionCount} transactions)`);
          break;
        case 'equity':
          equity.items.push(item);
          equity.total += data.amount;
          console.log(`👤 Equity: ${item.name} (${data.accountCode}) = ${formatCurrency(data.amount)} (${data.transactionCount} transactions)`);
          break;
      }
    });

    assets.total = assets.totalCurrent + assets.totalNonCurrent;
    liabilities.total = liabilities.totalCurrent + liabilities.totalNonCurrent;
    assets.current.sort((a, b) => b.amount - a.amount);
    assets.nonCurrent.sort((a, b) => b.amount - a.amount);
    liabilities.current.sort((a, b) => b.amount - a.amount);
    liabilities.nonCurrent.sort((a, b) => b.amount - a.amount);
    equity.items.sort((a, b) => b.amount - a.amount);

    // Log final calculations
    console.log(`📊 Balance Sheet Summary (Province: ${province}):`);
    console.log(`   Total Assets: ${formatCurrency(assets.total)}`);
    console.log(`   Total Liabilities: ${formatCurrency(liabilities.total)}`);
    console.log(`   Total Equity: ${formatCurrency(equity.total)}`);
    const calculatedEquity = assets.total - liabilities.total;
    const equityDifference = Math.abs(equity.total - calculatedEquity);
    if (equityDifference > 0.01) {
      console.warn(`⚠️ Balance Sheet equation check: Assets (${formatCurrency(assets.total)}) - Liabilities (${formatCurrency(liabilities.total)}) = ${formatCurrency(calculatedEquity)}, but Equity shows ${formatCurrency(equity.total)}`);
    } else {
      console.log(`✅ Balance Sheet equation balanced: Assets - Liabilities = Equity`);
    }
    return { assets, liabilities, equity };
  }

  public generateProfitLossPDF(data: FinancialData): jsPDF {
    const doc = new jsPDF();
    const plData = this.generateProfitLossData(data);
    
    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(data.companyName, 20, 25);
    
    doc.setFontSize(16);
    doc.text('Profit & Loss Statement', 20, 35);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${formatDate(data.startDate)} to ${formatDate(data.endDate)}`, 20, 45);
    doc.text(`Generated: ${formatDate(data.reportDate)}`, 20, 52);

    let yPosition = 70;

    // Revenue Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('REVENUE', 20, yPosition);
    yPosition += 10;

    const revenueData = plData.revenue.categories.map(cat => [
      `${cat.accountCode} - ${cat.name}`,
      formatCurrency(cat.amount)
    ]);

    if (revenueData.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: [['Account', 'Amount']],
        body: revenueData,
        theme: 'plain',
        styles: { fontSize: 10 },
        columnStyles: { 1: { halign: 'right' } },
        margin: { left: 20, right: 20 }
      });
      yPosition = (doc as any).lastAutoTable.finalY + 5;
    }

    // Total Revenue
    doc.setFont('helvetica', 'bold');
    doc.text('Total Revenue:', 20, yPosition);
    doc.text(formatCurrency(plData.revenue.total), 150, yPosition);
    yPosition += 20;

    // Expenses Section
    doc.setFontSize(14);
    doc.text('EXPENSES', 20, yPosition);
    yPosition += 10;

    const expenseData = plData.expenses.categories.map(cat => [
      `${cat.accountCode} - ${cat.name}`,
      formatCurrency(cat.amount)
    ]);

    if (expenseData.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: [['Account', 'Amount']],
        body: expenseData,
        theme: 'plain',
        styles: { fontSize: 10 },
        columnStyles: { 1: { halign: 'right' } },
        margin: { left: 20, right: 20 }
      });
      yPosition = (doc as any).lastAutoTable.finalY + 5;
    }

    // Total Expenses
    doc.text('Total Expenses:', 20, yPosition);
    doc.text(formatCurrency(plData.expenses.total), 150, yPosition);
    yPosition += 15;

    // Net Income
    doc.setFontSize(16);
    doc.setDrawColor(0, 0, 0);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 10;
    
    const netIncomeColor = plData.netIncome >= 0 ? [0, 128, 0] : [255, 0, 0];
    doc.setTextColor(...(netIncomeColor as [number, number, number]));
    doc.text('NET INCOME:', 20, yPosition);
    doc.text(formatCurrency(plData.netIncome), 150, yPosition);

    // Footer
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Generated by Meridian AI Bookkeeping - CRA Compliant', 20, 280);

    return doc;
  }

  public generateBalanceSheetPDF(data: FinancialData): jsPDF {
    const doc = new jsPDF();
    const bsData = this.generateBalanceSheetData(data);
    
    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(data.companyName, 20, 25);
    
    doc.setFontSize(16);
    doc.text('Balance Sheet', 20, 35);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`As of ${formatDate(data.endDate)}`, 20, 45);
    doc.text(`Generated: ${formatDate(data.reportDate)}`, 20, 52);

    let yPosition = 70;

    // ASSETS Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('ASSETS', 20, yPosition);
    yPosition += 10;

    // Current Assets
    doc.setFontSize(12);
    doc.text('Current Assets:', 25, yPosition);
    yPosition += 8;

    if (bsData.assets.current.length > 0) {
      const currentAssetsData = bsData.assets.current.map(item => [
        `${item.accountCode} - ${item.name}`,
        formatCurrency(item.amount)
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Account', 'Amount']],
        body: currentAssetsData,
        theme: 'plain',
        styles: { fontSize: 10 },
        columnStyles: { 1: { halign: 'right' } },
        margin: { left: 30, right: 20 }
      });
      yPosition = (doc as any).lastAutoTable.finalY + 5;
    }

    doc.setFont('helvetica', 'bold');
    doc.text('Total Current Assets:', 30, yPosition);
    doc.text(formatCurrency(bsData.assets.totalCurrent), 150, yPosition);
    yPosition += 15;

    // Non-Current Assets
    doc.setFont('helvetica', 'normal');
    doc.text('Non-Current Assets:', 25, yPosition);
    yPosition += 8;

    if (bsData.assets.nonCurrent.length > 0) {
      const nonCurrentAssetsData = bsData.assets.nonCurrent.map(item => [
        `${item.accountCode} - ${item.name}`,
        formatCurrency(item.amount)
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Account', 'Amount']],
        body: nonCurrentAssetsData,
        theme: 'plain',
        styles: { fontSize: 10 },
        columnStyles: { 1: { halign: 'right' } },
        margin: { left: 30, right: 20 }
      });
      yPosition = (doc as any).lastAutoTable.finalY + 5;
    }

    doc.setFont('helvetica', 'bold');
    doc.text('Total Non-Current Assets:', 30, yPosition);
    doc.text(formatCurrency(bsData.assets.totalNonCurrent), 150, yPosition);
    yPosition += 10;

    // Total Assets
    doc.setFontSize(14);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 8;
    doc.text('TOTAL ASSETS:', 20, yPosition);
    doc.text(formatCurrency(bsData.assets.total), 150, yPosition);
    yPosition += 20;

    // LIABILITIES Section
    doc.text('LIABILITIES & EQUITY', 20, yPosition);
    yPosition += 15;

    // Current Liabilities
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Current Liabilities:', 25, yPosition);
    yPosition += 8;

    if (bsData.liabilities.current.length > 0) {
      const currentLiabilitiesData = bsData.liabilities.current.map(item => [
        `${item.accountCode} - ${item.name}`,
        formatCurrency(item.amount)
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Account', 'Amount']],
        body: currentLiabilitiesData,
        theme: 'plain',
        styles: { fontSize: 10 },
        columnStyles: { 1: { halign: 'right' } },
        margin: { left: 30, right: 20 }
      });
      yPosition = (doc as any).lastAutoTable.finalY + 5;
    }

    doc.setFont('helvetica', 'bold');
    doc.text('Total Current Liabilities:', 30, yPosition);
    doc.text(formatCurrency(bsData.liabilities.totalCurrent), 150, yPosition);
    yPosition += 15;

    // Equity
    doc.setFont('helvetica', 'normal');
    doc.text('Equity:', 25, yPosition);
    yPosition += 8;

    if (bsData.equity.items.length > 0) {
      const equityData = bsData.equity.items.map(item => [
        `${item.accountCode} - ${item.name}`,
        formatCurrency(item.amount)
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Account', 'Amount']],
        body: equityData,
        theme: 'plain',
        styles: { fontSize: 10 },
        columnStyles: { 1: { halign: 'right' } },
        margin: { left: 30, right: 20 }
      });
      yPosition = (doc as any).lastAutoTable.finalY + 5;
    }

    doc.setFont('helvetica', 'bold');
    doc.text('Total Equity:', 30, yPosition);
    doc.text(formatCurrency(bsData.equity.total), 150, yPosition);
    yPosition += 10;

    // Total Liabilities & Equity
    const totalLiabilitiesEquity = bsData.liabilities.total + bsData.equity.total;
    doc.setFontSize(14);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 8;
    doc.text('TOTAL LIABILITIES & EQUITY:', 20, yPosition);
    doc.text(formatCurrency(totalLiabilitiesEquity), 150, yPosition);

    // Footer
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Generated by Meridian AI Bookkeeping - CRA Compliant', 20, 280);

    return doc;
  }
}

// Helper to infer type from account code
export function categorizeAccountType(accountCode: string): 'income' | 'expense' | 'asset' | 'liability' | 'equity' {
  if (!accountCode) return 'expense';
  if (/^2\d{2}$/.test(accountCode)) return 'income'; // Revenue (200-299)
  if (/^31\d$/.test(accountCode)) return 'expense'; // COGS (310-319)
  if (/^[4-5]\d{2}$/.test(accountCode)) return 'expense'; // Operating Expenses (400-599)
  if (/^6[1-9]\d$/.test(accountCode)) return 'asset'; // Current Assets (610-699)
  if (/^7\d{2}$/.test(accountCode)) return 'asset'; // Fixed Assets (710-799)
  if (/^8\d{2}$/.test(accountCode)) return 'liability'; // Current Liabilities (800-899)
  if (/^9\d{2}$/.test(accountCode)) return 'liability'; // Non-Current Liabilities (900-999)
  if (/^9[6-9]\d$/.test(accountCode)) return 'equity'; // Equity (960-999)
  return 'expense';
}