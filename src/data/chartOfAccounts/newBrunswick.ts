export interface ChartAccount {
  code: string;
  name: string;
  type: string;
  taxCode: string;
  description: string;
}

export const NB_ACCOUNTS: ChartAccount[] = [
  { code: '200', name: 'Sales Revenue', type: 'Revenue', taxCode: 'NB - HST on Sales (15%)', description: 'Income from the sale of products.' },
  { code: '220', name: 'Service Revenue', type: 'Revenue', taxCode: 'NB - HST on Sales (15%)', description: 'Income from performing services.' },
  { code: '310', name: 'Cost of Goods Sold', type: 'Direct Costs', taxCode: 'NB - HST on Purchases (15%)', description: 'Cost of goods sold by the business' },
  { code: '400', name: 'Advertising', type: 'Expense', taxCode: 'NB - HST on Purchases (15%)', description: 'Expenses incurred for advertising while trying to increase sales' },
  { code: '442', name: 'Electricity', type: 'Expense', taxCode: 'NB - HST on Purchases (15%)', description: 'Expenses incurred for electricity use' },
  { code: '453', name: 'Office Expenses', type: 'Expense', taxCode: 'NB - HST on Purchases (15%)', description: 'General expenses related to the running of the business office.' },
  { code: '477', name: 'Wages and Salaries', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Payment to employees in exchange for their resources' },
  { code: '610', name: 'Accounts Receivable', type: 'Accounts Receivable', taxCode: 'Tax Exempt (0%)', description: 'Outstanding invoices the company has issued out to the client but has not yet received in cash at balance date.' },
  { code: '800', name: 'Accounts Payable', type: 'Accounts Payable', taxCode: 'Tax Exempt (0%)', description: 'Outstanding invoices the company has received from suppliers but has not yet paid at balance date' },
]; 