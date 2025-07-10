export interface ChartAccount {
  code: string;
  name: string;
  type: string;
  taxCode: string;
  description: string;
}

export const BC_ACCOUNTS: ChartAccount[] = [
  { code: '200', name: 'Sales Revenue', type: 'Revenue', taxCode: 'BC - GST/PST on Sales (12%)', description: 'Income from the sale of products.' },
  { code: '220', name: 'Service Revenue', type: 'Revenue', taxCode: 'BC - GST/PST on Sales (12%)', description: 'Income from performing services.' },
  { code: '260', name: 'Other Revenue', type: 'Revenue', taxCode: 'Tax Exempt (0%)', description: 'Any other income that does not relate to normal business activities and is not recurring' },
  { code: '270', name: 'Interest Income', type: 'Revenue', taxCode: 'Tax Exempt (0%)', description: 'Interest income' },
  { code: '310', name: 'Cost of Goods Sold', type: 'Direct Costs', taxCode: 'BC - GST/PST on Purchases (12%)', description: 'Cost of goods sold by the business' },
  { code: '315', name: 'Subcontractors', type: 'Direct Costs', taxCode: 'BC - GST/PST on Purchases (12%)', description: 'Payments to subcontractors' },
  { code: '400', name: 'Advertising', type: 'Expense', taxCode: 'BC - GST/PST on Purchases (12%)', description: 'Expenses incurred for advertising while trying to increase sales' },
  { code: '404', name: 'Bank Fees', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Fees charged by your bank for transactions regarding your bank account(s).' },
  { code: '412', name: 'Consulting & Accounting', type: 'Expense', taxCode: 'BC - GST/PST on Purchases (12%)', description: 'Expenses related to paying consultants' },
  { code: '416', name: 'Depreciation', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'The amount of the asset\'s cost (based on the useful life) that was consumed during the period' },
  { code: '442', name: 'Electricity', type: 'Expense', taxCode: 'BC - GST/PST on Purchases (12%)', description: 'Expenses incurred for electricity use' },
  { code: '453', name: 'Office Expenses', type: 'Expense', taxCode: 'BC - GST/PST on Purchases (12%)', description: 'General expenses related to the running of the business office.' },
  { code: '455', name: 'Supplies and Small Tools', type: 'Expense', taxCode: 'BC - GST/PST on Purchases (12%)', description: 'Supplies and small tools purchases (less than $500 per item) for running the business' },
  { code: '468', name: 'Commercial Rent', type: 'Expense', taxCode: 'BC - GST/PST on Purchases (12%)', description: 'The payment to lease commercial space' },
  { code: '477', name: 'Wages and Salaries', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Payment to employees in exchange for their resources' },
  { code: '489', name: 'Telephone & Internet', type: 'Expense', taxCode: 'BC - GST/PST on Purchases (12%)', description: 'Expenditure incurred from any business-related phone calls, phone lines, or internet connections' },
  { code: '610', name: 'Accounts Receivable', type: 'Accounts Receivable', taxCode: 'Tax Exempt (0%)', description: 'Outstanding invoices the company has issued out to the client but has not yet received in cash at balance date.' },
  { code: '800', name: 'Accounts Payable', type: 'Accounts Payable', taxCode: 'Tax Exempt (0%)', description: 'Outstanding invoices the company has received from suppliers but has not yet paid at balance date' },
  { code: '820', name: 'Sales Tax', type: 'Sales Tax', taxCode: 'Tax Exempt (0%)', description: 'The balance in this account represents Sales Tax owing to or from your tax authority.' },
  { code: '960', name: 'Retained Earnings', type: 'Retained Earnings', taxCode: 'Tax Exempt (0%)', description: 'Do not Use' },
  { code: '970', name: 'Owner A Share Capital', type: 'Equity', taxCode: 'Tax Exempt (0%)', description: 'The value of shares purchased by the shareholders' },
]; 