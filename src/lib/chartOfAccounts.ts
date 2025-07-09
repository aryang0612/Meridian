import { Account } from './types';
import { PROVINCES, Province } from '../data/provinces';

export interface AccountWithTax extends Account {
  taxRate: number;
  taxType: 'HST' | 'GST+PST' | 'GST+QST' | 'Exempt';
  province: string;
  description?: string;
}

export interface AccountSearchResult {
  account: AccountWithTax;
  score: number;
  reason: string;
}

// Hardcoded account lists for ON, BC, AB
const HARDCODED_ACCOUNTS: Record<string, Array<{ code: string; name: string; type: string; taxCode: string; description: string }>> = {
  ON: [
    { code: '200', name: 'Sales Revenue', type: 'Revenue', taxCode: 'ON - HST on Sales (13%)', description: 'Income from the sale of products.' },
    { code: '220', name: 'Service Revenue', type: 'Revenue', taxCode: 'ON - HST on Sales (13%)', description: 'Income from performing services.' },
    { code: '260', name: 'Other Revenue', type: 'Revenue', taxCode: 'Tax Exempt (0%)', description: 'Any other income that does not relate to normal business activities and is not recurring' },
    { code: '270', name: 'Interest Income', type: 'Revenue', taxCode: 'Tax Exempt (0%)', description: 'Interest income' },
    { code: '310', name: 'Cost of Goods Sold', type: 'Direct Costs', taxCode: 'ON - HST on Purchases (13%)', description: 'Cost of goods sold by the business' },
    { code: '314', name: 'Cost of Goods Sold (Tax Exempt)', type: 'Direct Costs', taxCode: 'Tax Exempt (0%)', description: 'Cost of goods sold by the business that are tax exempt (overseas purchases)' },
    { code: '315', name: 'Subcontractors', type: 'Direct Costs', taxCode: 'ON - HST on Purchases (13%)', description: 'Payments to subcontractors' },
    { code: '400', name: 'Advertising', type: 'Expense', taxCode: 'ON - HST on Purchases (13%)', description: 'Expenses incurred for advertising while trying to increase sales' },
    { code: '404', name: 'Bank Fees', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Fees charged by your bank for transactions regarding your bank account(s).' },
    { code: '408', name: 'Cleaning', type: 'Expense', taxCode: 'ON - HST on Purchases (13%)', description: 'Expenses incurred for cleaning  business property.' },
    { code: '412', name: 'Consulting & Accounting', type: 'Expense', taxCode: 'ON - HST on Purchases (13%)', description: 'Expenses related to paying consultants' },
    { code: '416', name: 'Depreciation', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'The amount of the asset\'s cost (based on the useful life) that was consumed during the period' },
    { code: '420', name: 'Entertainment', type: 'Expense', taxCode: 'ON - HST on Purchases (13%)', description: 'Business-related entertainment expenses that are 50% deductible for income tax purposes.' },
    { code: '421', name: 'Entertainment - Alcohol Purchases', type: 'Expense', taxCode: 'ON - HST on Purchases (13%)', description: 'Record business-related alcohol purchases; 50% tax deductible.' },
    { code: '425', name: 'Freight & Courier', type: 'Expense', taxCode: 'ON - HST on Purchases (13%)', description: 'Expenses incurred on courier & freight costs' },
    { code: '433', name: 'Insurance', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Expenses incurred for insuring the business\' assets' },
    { code: '437', name: 'Interest Expense', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Any interest expenses paid to your tax authority, business bank accounts or credit card accounts.' },
    { code: '441', name: 'Legal expenses', type: 'Expense', taxCode: 'ON - HST on Purchases (13%)', description: 'Expenses incurred on any legal matters' },
    { code: '442', name: 'Electricity', type: 'Expense', taxCode: 'ON - HST on Purchases (13%)', description: 'Expenses incurred for electricity use' },
    { code: '445', name: 'Natural Gas Expense', type: 'Expense', taxCode: 'ON - HST on Purchases (13%)', description: 'Expenses incurred for heating provided by natural gas' },
    { code: '447', name: 'Water Expense', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Expenses incurred for delivery of fresh water to the business' },
    { code: '449', name: 'Motor Vehicle Expenses', type: 'Expense', taxCode: 'ON - HST on Purchases (13%)', description: 'Expenses incurred on the running of company motor vehicles' },
    { code: '450', name: 'Motor Vehicle Expenses - PST Exempt', type: 'Expense', taxCode: 'ON - HST on Purchases (13%)', description: 'Expenses incurred on the running of company motor vehicles that are PST exempt' },
    { code: '453', name: 'Office Expenses', type: 'Expense', taxCode: 'ON - HST on Purchases (13%)', description: 'General expenses related to the running of the business office.' },
    { code: '455', name: 'Supplies and Small Tools', type: 'Expense', taxCode: 'ON - HST on Purchases (13%)', description: 'Supplies and small tools purchases (less than $500 per item) for running the business' },
    { code: '461', name: 'Printing & Stationery', type: 'Expense', taxCode: 'ON - HST on Purchases (13%)', description: 'Expenses incurred by the entity as a result of printing and stationery' },
    { code: '468', name: 'Commercial Rent', type: 'Expense', taxCode: 'ON - HST on Purchases (13%)', description: 'The payment to lease commercial space' },
    { code: '469', name: 'Rent', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'The payment to lease a building or area.' },
    { code: '470', name: 'Research and Development', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Expenses incurred performing research and development to bring a new product or service to market' },
    { code: '473', name: 'Repairs and Maintenance', type: 'Expense', taxCode: 'ON - HST on Purchases (13%)', description: 'Expenses incurred on a damaged or run down asset that will bring the asset back to its original condition.' },
    { code: '477', name: 'Wages and Salaries', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Payment to employees in exchange for their resources' },
    { code: '478', name: 'Employee Benefits Expense', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Payment for employee benefits' },
    { code: '479', name: 'Uniforms', type: 'Expense', taxCode: 'ON - HST on Purchases (13%)', description: 'Purchase and maintenance of uniforms' },
    { code: '482', name: 'Business Licenses, Taxes, and Memberships', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Business licenses, municipal business taxes, and memberships to professional bodies (CPA , Law Society, etc.)' },
    { code: '485', name: 'Subscriptions', type: 'Expense', taxCode: 'ON - HST on Purchases (13%)', description: 'E.g. Magazines, professional bodies' },
    { code: '487', name: 'Training and Continuing Education', type: 'Expense', taxCode: 'ON - HST on Purchases (13%)', description: 'Training seminars and other professional continuing education programs' },
    { code: '489', name: 'Telephone & Internet', type: 'Expense', taxCode: 'ON - HST on Purchases (13%)', description: 'Expenditure incurred from any business-related phone calls, phone lines, or internet connections' },
    { code: '493', name: 'Travel - National', type: 'Expense', taxCode: 'ON - HST on Purchases (13%)', description: 'Expenses incurred from domestic travel which has a business purpose' },
    { code: '494', name: 'Travel - International', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Expenses incurred from international travel which has a business purpose' },
    { code: '495', name: 'Warranty Expense', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Expenses incurred through fulfilling warranty coverage' },
    { code: '497', name: 'Bank Revaluations', type: 'Bank Revaluations', taxCode: 'Tax Exempt (0%)', description: 'Bank account revaluations due for foreign exchange rate changes' },
    { code: '498', name: 'Unrealised Currency Gains', type: 'Unrealized Currency Gains', taxCode: 'Tax Exempt (0%)', description: 'Unrealised currency gains on outstanding items' },
    { code: '499', name: 'Realised Currency Gains', type: 'Realized Currency Gains', taxCode: 'Tax Exempt (0%)', description: 'Gains or losses made due to currency exchange rate changes' },
    { code: '502', name: 'Donations', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Charitable Donations' },
    { code: '505', name: 'Income Tax Expense', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'A percentage of total earnings paid to the government.' },
    { code: '507', name: 'Property Tax Expense', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Payment for Property Taxes on property owned by the business' },
    { code: '508', name: 'Bad Debts Expense', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Amount deemed uncollectible from invoices delivered goes here' },
    { code: '610', name: 'Accounts Receivable', type: 'Accounts Receivable', taxCode: 'Tax Exempt (0%)', description: 'Outstanding invoices the company has issued out to the client but has not yet received in cash at balance date.' },
    { code: '615', name: 'Allowance for Doubtful Accounts', type: 'Non-current Asset', taxCode: 'Tax Exempt (0%)', description: 'Amount deemed uncollectible from invoices delivered goes here (normal credit balance)' },
    { code: '620', name: 'Prepayments', type: 'Current Asset', taxCode: 'Tax Exempt (0%)', description: 'An expenditure that has been paid for in advance.' },
    { code: '630', name: 'Inventory', type: 'Inventory', taxCode: 'Tax Exempt (0%)', description: 'Value of tracked items for resale.' },
    { code: '640', name: 'Notes Receivable', type: 'Current Asset', taxCode: 'Tax Exempt (0%)', description: 'Loans issued by the business that are receivable go here' },
    { code: '710', name: 'Equipment', type: 'Fixed Asset', taxCode: 'ON - HST on Purchases (13%)', description: 'Office equipment that is owned and controlled by the business' },
    { code: '711', name: 'Less Accumulated Depreciation on Office Equipment', type: 'Fixed Asset', taxCode: 'Tax Exempt (0%)', description: 'The total amount of office equipment cost that has been consumed by the entity (based on the useful life)' },
    { code: '714', name: 'Vehicles', type: 'Fixed Asset', taxCode: 'ON - HST on Purchases (13%)', description: 'Vehicles that are owned and controlled by the business' },
    { code: '715', name: 'Less Accumulated Depreciation on Vehicles', type: 'Fixed Asset', taxCode: 'Tax Exempt (0%)', description: 'The total amount of vehicle cost that has been consumed by the business (based on the useful life)' },
    { code: '720', name: 'Computer Equipment', type: 'Fixed Asset', taxCode: 'ON - HST on Purchases (13%)', description: 'Computer equipment that is owned and controlled by the business' },
    { code: '721', name: 'Less Accumulated Depreciation on Computer Equipment', type: 'Fixed Asset', taxCode: 'Tax Exempt (0%)', description: 'The total amount of computer equipment cost that has been consumed by the business (based on the useful life)' },
    { code: '800', name: 'Accounts Payable', type: 'Accounts Payable', taxCode: 'Tax Exempt (0%)', description: 'Outstanding invoices the company has received from suppliers but has not yet paid at balance date' },
    { code: '802', name: 'Notes Payable', type: 'Current Liability', taxCode: 'Tax Exempt (0%)', description: 'Short-term notes payable go here' },
    { code: '803', name: 'Wages Payable', type: 'Wages Payable', taxCode: 'Tax Exempt (0%)', description: 'Xero automatically updates this account for payroll entries created using Payroll and will store the payroll amount to be paid to the employee for the pay run. This account enables you to maintain separate accounts for employee Wages Payable amounts and Accounts Payable amounts' },
    { code: '820', name: 'Sales Tax', type: 'Sales Tax', taxCode: 'Tax Exempt (0%)', description: 'The balance in this account represents Sales Tax owing to or from your tax authority. At the end of the tax period, it is this account that should be used to code against either the \'refunds from\' or \'payments to\' your tax authority that will appear on the bank statement. Xero has been designed to use only one sales tax account to track sales taxes on income and expenses, so there is no need to add any new sales tax accounts to Xero.' },
    { code: '825', name: 'Employee Tax Payable', type: 'Current Liability', taxCode: 'Tax Exempt (0%)', description: 'The amount of tax that has been deducted from wages or salaries paid to employes and is due to be paid' },
    { code: '830', name: 'Income Tax Payable', type: 'Current Liability', taxCode: 'Tax Exempt (0%)', description: 'The amount of income tax that is due to be paid, also resident withholding tax paid on interest received.' },
    { code: '840', name: 'Historical Adjustment', type: 'Historical Adjustment', taxCode: 'Tax Exempt (0%)', description: 'For accountant adjustments' },
    { code: '860', name: 'Rounding', type: 'Rounding', taxCode: 'Tax Exempt (0%)', description: 'An adjustment entry to allow for rounding' },
    { code: '877', name: 'Tracking Transfers', type: 'Tracking', taxCode: 'Tax Exempt (0%)', description: 'Transfers between tracking categories' },
    { code: '880', name: 'Due To/From Shareholders', type: 'Current Liability', taxCode: 'Tax Exempt (0%)', description: 'Withdrawals and contributions from the owners go here. For tax purposes, if the amount at the end of the period in question is positive, record a "Due To Shareholders" Liability and, if the amount at the end of the period is negative, record a "Due From Shareholders" asset.' },
    { code: '881', name: 'Owner\'s Draw', type: 'Equity', taxCode: 'Tax Exempt (0%)', description: 'Withdrawals by the owner from the business for personal use' },
    { code: '882', name: 'Owner\'s Contribution', type: 'Equity', taxCode: 'Tax Exempt (0%)', description: 'Contributions by the owner to the business' },
    { code: '883', name: 'E-Transfer', type: 'Bank Transfer', taxCode: 'Tax Exempt (0%)', description: 'Electronic money transfers between accounts' },
    { code: '884', name: 'Cheque', type: 'Bank Transfer', taxCode: 'Tax Exempt (0%)', description: 'Cheque transactions requiring manual categorization' },
    { code: '885', name: 'Bank Transfer', type: 'Bank Transfer', taxCode: 'Tax Exempt (0%)', description: 'Transfers between bank accounts' },
    { code: '886', name: 'Credit Card Payment', type: 'Bank Transfer', taxCode: 'Tax Exempt (0%)', description: 'Payments to credit card accounts' },
    { code: '887', name: 'Service Fees', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'General service fees (not bank fees)' },
    { code: '888', name: 'Processing Fees', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Payment processing fees' },
    { code: '900', name: 'Loan', type: 'Non-current Liability', taxCode: 'Tax Exempt (0%)', description: 'Money that has been borrowed from a creditor' },
    { code: '960', name: 'Retained Earnings', type: 'Retained Earnings', taxCode: 'Tax Exempt (0%)', description: 'Do not Use' },
    { code: '970', name: 'Owner A Share Capital', type: 'Equity', taxCode: 'Tax Exempt (0%)', description: 'The value of shares purchased by the shareholders' },
  ],
  BC: [
    { code: '200', name: 'Sales Revenue', type: 'Revenue', taxCode: 'BC - HST on Sales (12%)', description: 'Income from the sale of products.' },
    { code: '220', name: 'Service Revenue', type: 'Revenue', taxCode: 'BC - HST on Sales (12%)', description: 'Income from performing services.' },
    { code: '260', name: 'Other Revenue', type: 'Revenue', taxCode: 'Tax Exempt (0%)', description: 'Any other income that does not relate to normal business activities and is not recurring' },
    { code: '270', name: 'Interest Income', type: 'Revenue', taxCode: 'Tax Exempt (0%)', description: 'Interest income' },
    { code: '310', name: 'Cost of Goods Sold', type: 'Direct Costs', taxCode: 'BC - HST on Purchases (12%)', description: 'Cost of goods sold by the business' },
    { code: '314', name: 'Cost of Goods Sold (Tax Exempt)', type: 'Direct Costs', taxCode: 'Tax Exempt (0%)', description: 'Cost of goods sold by the business that are tax exempt (overseas purchases)' },
    { code: '315', name: 'Subcontractors', type: 'Direct Costs', taxCode: 'BC - HST on Purchases (12%)', description: 'Payments to subcontractors' },
    { code: '400', name: 'Advertising', type: 'Expense', taxCode: 'BC - HST on Purchases (12%)', description: 'Expenses incurred for advertising while trying to increase sales' },
    { code: '404', name: 'Bank Fees', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Fees charged by your bank for transactions regarding your bank account(s).' },
    { code: '408', name: 'Cleaning', type: 'Expense', taxCode: 'BC - HST on Purchases (12%)', description: 'Expenses incurred for cleaning  business property.' },
    { code: '412', name: 'Consulting & Accounting', type: 'Expense', taxCode: 'BC - HST on Purchases (12%)', description: 'Expenses related to paying consultants' },
    { code: '416', name: 'Depreciation', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'The amount of the asset\'s cost (based on the useful life) that was consumed during the period' },
    { code: '420', name: 'Entertainment', type: 'Expense', taxCode: 'BC - HST on Purchases (12%)', description: 'Business-related entertainment expenses that are 50% deductible for income tax purposes.' },
    { code: '421', name: 'Entertainment - Alcohol Purchases', type: 'Expense', taxCode: 'BC - HST on Purchases (12%)', description: 'Record business-related alcohol purchases; 50% tax deductible.' },
    { code: '425', name: 'Freight & Courier', type: 'Expense', taxCode: 'BC - HST on Purchases (12%)', description: 'Expenses incurred on courier & freight costs' },
    { code: '433', name: 'Insurance', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Expenses incurred for insuring the business\' assets' },
    { code: '437', name: 'Interest Expense', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Any interest expenses paid to your tax authority, business bank accounts or credit card accounts.' },
    { code: '441', name: 'Legal expenses', type: 'Expense', taxCode: 'BC - HST on Purchases (12%)', description: 'Expenses incurred on any legal matters' },
    { code: '442', name: 'Electricity', type: 'Expense', taxCode: 'BC - HST on Purchases (12%)', description: 'Expenses incurred for electricity use' },
    { code: '445', name: 'Natural Gas Expense', type: 'Expense', taxCode: 'BC - HST on Purchases (12%)', description: 'Expenses incurred for heating provided by natural gas' },
    { code: '447', name: 'Water Expense', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Expenses incurred for delivery of fresh water to the business' },
    { code: '449', name: 'Motor Vehicle Expenses', type: 'Expense', taxCode: 'BC - HST on Purchases (12%)', description: 'Expenses incurred on the running of company motor vehicles' },
    { code: '450', name: 'Motor Vehicle Expenses - PST Exempt', type: 'Expense', taxCode: 'BC - HST on Purchases (12%)', description: 'Expenses incurred on the running of company motor vehicles that are PST exempt' },
    { code: '453', name: 'Office Expenses', type: 'Expense', taxCode: 'BC - HST on Purchases (12%)', description: 'General expenses related to the running of the business office.' },
    { code: '455', name: 'Supplies and Small Tools', type: 'Expense', taxCode: 'BC - HST on Purchases (12%)', description: 'Supplies and small tools purchases (less than $500 per item) for running the business' },
    { code: '461', name: 'Printing & Stationery', type: 'Expense', taxCode: 'BC - HST on Purchases (12%)', description: 'Expenses incurred by the entity as a result of printing and stationery' },
    { code: '468', name: 'Commercial Rent', type: 'Expense', taxCode: 'BC - HST on Purchases (12%)', description: 'The payment to lease commercial space' },
    { code: '469', name: 'Rent', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'The payment to lease a building or area.' },
    { code: '470', name: 'Research and Development', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Expenses incurred performing research and development to bring a new product or service to market' },
    { code: '473', name: 'Repairs and Maintenance', type: 'Expense', taxCode: 'BC - HST on Purchases (12%)', description: 'Expenses incurred on a damaged or run down asset that will bring the asset back to its original condition.' },
    { code: '477', name: 'Wages and Salaries', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Payment to employees in exchange for their resources' },
    { code: '478', name: 'Employee Benefits Expense', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Payment for employee benefits' },
    { code: '479', name: 'Uniforms', type: 'Expense', taxCode: 'BC - HST on Purchases (12%)', description: 'Purchase and maintenance of uniforms' },
    { code: '482', name: 'Business Licenses, Taxes, and Memberships', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Business licenses, municipal business taxes, and memberships to professional bodies (CPA , Law Society, etc.)' },
    { code: '485', name: 'Subscriptions', type: 'Expense', taxCode: 'BC - HST on Purchases (12%)', description: 'E.g. Magazines, professional bodies' },
    { code: '487', name: 'Training and Continuing Education', type: 'Expense', taxCode: 'BC - HST on Purchases (12%)', description: 'Training seminars and other professional continuing education programs' },
    { code: '489', name: 'Telephone & Internet', type: 'Expense', taxCode: 'BC - HST on Purchases (12%)', description: 'Expenditure incurred from any business-related phone calls, phone lines, or internet connections' },
    { code: '493', name: 'Travel - National', type: 'Expense', taxCode: 'BC - HST on Purchases (12%)', description: 'Expenses incurred from domestic travel which has a business purpose' },
    { code: '494', name: 'Travel - International', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Expenses incurred from international travel which has a business purpose' },
    { code: '495', name: 'Warranty Expense', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Expenses incurred through fulfilling warranty coverage' },
    { code: '497', name: 'Bank Revaluations', type: 'Bank Revaluations', taxCode: 'Tax Exempt (0%)', description: 'Bank account revaluations due for foreign exchange rate changes' },
    { code: '498', name: 'Unrealised Currency Gains', type: 'Unrealized Currency Gains', taxCode: 'Tax Exempt (0%)', description: 'Unrealised currency gains on outstanding items' },
    { code: '499', name: 'Realised Currency Gains', type: 'Realized Currency Gains', taxCode: 'Tax Exempt (0%)', description: 'Gains or losses made due to currency exchange rate changes' },
    { code: '502', name: 'Donations', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Charitable Donations' },
    { code: '505', name: 'Income Tax Expense', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'A percentage of total earnings paid to the government.' },
    { code: '507', name: 'Property Tax Expense', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Payment for Property Taxes on property owned by the business' },
    { code: '508', name: 'Bad Debts Expense', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Amount deemed uncollectible from invoices delivered goes here' },
    { code: '610', name: 'Accounts Receivable', type: 'Accounts Receivable', taxCode: 'Tax Exempt (0%)', description: 'Outstanding invoices the company has issued out to the client but has not yet received in cash at balance date.' },
    { code: '615', name: 'Allowance for Doubtful Accounts', type: 'Non-current Asset', taxCode: 'Tax Exempt (0%)', description: 'Amount deemed uncollectible from invoices delivered goes here (normal credit balance)' },
    { code: '620', name: 'Prepayments', type: 'Current Asset', taxCode: 'Tax Exempt (0%)', description: 'An expenditure that has been paid for in advance.' },
    { code: '630', name: 'Inventory', type: 'Inventory', taxCode: 'Tax Exempt (0%)', description: 'Value of tracked items for resale.' },
    { code: '640', name: 'Notes Receivable', type: 'Current Asset', taxCode: 'Tax Exempt (0%)', description: 'Loans issued by the business that are receivable go here' },
    { code: '710', name: 'Equipment', type: 'Fixed Asset', taxCode: 'BC - HST on Purchases (12%)', description: 'Office equipment that is owned and controlled by the business' },
    { code: '711', name: 'Less Accumulated Depreciation on Office Equipment', type: 'Fixed Asset', taxCode: 'Tax Exempt (0%)', description: 'The total amount of office equipment cost that has been consumed by the entity (based on the useful life)' },
    { code: '714', name: 'Vehicles', type: 'Fixed Asset', taxCode: 'BC - HST on Purchases (12%)', description: 'Vehicles that are owned and controlled by the business' },
    { code: '715', name: 'Less Accumulated Depreciation on Vehicles', type: 'Fixed Asset', taxCode: 'Tax Exempt (0%)', description: 'The total amount of vehicle cost that has been consumed by the business (based on the useful life)' },
    { code: '720', name: 'Computer Equipment', type: 'Fixed Asset', taxCode: 'BC - HST on Purchases (12%)', description: 'Computer equipment that is owned and controlled by the business' },
    { code: '721', name: 'Less Accumulated Depreciation on Computer Equipment', type: 'Fixed Asset', taxCode: 'Tax Exempt (0%)', description: 'The total amount of computer equipment cost that has been consumed by the business (based on the useful life)' },
    { code: '800', name: 'Accounts Payable', type: 'Accounts Payable', taxCode: 'Tax Exempt (0%)', description: 'Outstanding invoices the company has received from suppliers but has not yet paid at balance date' },
    { code: '802', name: 'Notes Payable', type: 'Current Liability', taxCode: 'Tax Exempt (0%)', description: 'Short-term notes payable go here' },
    { code: '803', name: 'Wages Payable', type: 'Wages Payable', taxCode: 'Tax Exempt (0%)', description: 'Xero automatically updates this account for payroll entries created using Payroll and will store the payroll amount to be paid to the employee for the pay run. This account enables you to maintain separate accounts for employee Wages Payable amounts and Accounts Payable amounts' },
    { code: '820', name: 'Sales Tax', type: 'Sales Tax', taxCode: 'Tax Exempt (0%)', description: 'The balance in this account represents Sales Tax owing to or from your tax authority. At the end of the tax period, it is this account that should be used to code against either the \'refunds from\' or \'payments to\' your tax authority that will appear on the bank statement. Xero has been designed to use only one sales tax account to track sales taxes on income and expenses, so there is no need to add any new sales tax accounts to Xero.' },
    { code: '825', name: 'Employee Tax Payable', type: 'Current Liability', taxCode: 'Tax Exempt (0%)', description: 'The amount of tax that has been deducted from wages or salaries paid to employes and is due to be paid' },
    { code: '830', name: 'Income Tax Payable', type: 'Current Liability', taxCode: 'Tax Exempt (0%)', description: 'The amount of income tax that is due to be paid, also resident withholding tax paid on interest received.' },
    { code: '840', name: 'Historical Adjustment', type: 'Historical Adjustment', taxCode: 'Tax Exempt (0%)', description: 'For accountant adjustments' },
    { code: '860', name: 'Rounding', type: 'Rounding', taxCode: 'Tax Exempt (0%)', description: 'An adjustment entry to allow for rounding' },
    { code: '877', name: 'Tracking Transfers', type: 'Tracking', taxCode: 'Tax Exempt (0%)', description: 'Transfers between tracking categories' },
    { code: '880', name: 'Due To/From Shareholders', type: 'Current Liability', taxCode: 'Tax Exempt (0%)', description: 'Withdrawals and contributions from the owners go here. For tax purposes, if the amount at the end of the period in question is positive, record a "Due To Shareholders" Liability and, if the amount at the end of the period is negative, record a "Due From Shareholders" asset.' },
    { code: '881', name: 'Owner\'s Draw', type: 'Equity', taxCode: 'Tax Exempt (0%)', description: 'Withdrawals by the owner from the business for personal use' },
    { code: '882', name: 'Owner\'s Contribution', type: 'Equity', taxCode: 'Tax Exempt (0%)', description: 'Contributions by the owner to the business' },
    { code: '883', name: 'E-Transfer', type: 'Bank Transfer', taxCode: 'Tax Exempt (0%)', description: 'Electronic money transfers between accounts' },
    { code: '884', name: 'Cheque', type: 'Bank Transfer', taxCode: 'Tax Exempt (0%)', description: 'Cheque transactions requiring manual categorization' },
    { code: '885', name: 'Bank Transfer', type: 'Bank Transfer', taxCode: 'Tax Exempt (0%)', description: 'Transfers between bank accounts' },
    { code: '886', name: 'Credit Card Payment', type: 'Bank Transfer', taxCode: 'Tax Exempt (0%)', description: 'Payments to credit card accounts' },
    { code: '887', name: 'Service Fees', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'General service fees (not bank fees)' },
    { code: '888', name: 'Processing Fees', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Payment processing fees' },
    { code: '900', name: 'Loan', type: 'Non-current Liability', taxCode: 'Tax Exempt (0%)', description: 'Money that has been borrowed from a creditor' },
    { code: '960', name: 'Retained Earnings', type: 'Retained Earnings', taxCode: 'Tax Exempt (0%)', description: 'Do not Use' },
    { code: '970', name: 'Owner A Share Capital', type: 'Equity', taxCode: 'Tax Exempt (0%)', description: 'The value of shares purchased by the shareholders' },
  ],
  AB: [
    { code: '200', name: 'Sales Revenue', type: 'Revenue', taxCode: 'AB - HST on Sales (5%)', description: 'Income from the sale of products.' },
    { code: '220', name: 'Service Revenue', type: 'Revenue', taxCode: 'AB - HST on Sales (5%)', description: 'Income from performing services.' },
    { code: '260', name: 'Other Revenue', type: 'Revenue', taxCode: 'Tax Exempt (0%)', description: 'Any other income that does not relate to normal business activities and is not recurring' },
    { code: '270', name: 'Interest Income', type: 'Revenue', taxCode: 'Tax Exempt (0%)', description: 'Interest income' },
    { code: '310', name: 'Cost of Goods Sold', type: 'Direct Costs', taxCode: 'AB - HST on Purchases (5%)', description: 'Cost of goods sold by the business' },
    { code: '314', name: 'Cost of Goods Sold (Tax Exempt)', type: 'Direct Costs', taxCode: 'Tax Exempt (0%)', description: 'Cost of goods sold by the business that are tax exempt (overseas purchases)' },
    { code: '315', name: 'Subcontractors', type: 'Direct Costs', taxCode: 'AB - HST on Purchases (5%)', description: 'Payments to subcontractors' },
    { code: '400', name: 'Advertising', type: 'Expense', taxCode: 'AB - HST on Purchases (5%)', description: 'Expenses incurred for advertising while trying to increase sales' },
    { code: '404', name: 'Bank Fees', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Fees charged by your bank for transactions regarding your bank account(s).' },
    { code: '408', name: 'Cleaning', type: 'Expense', taxCode: 'AB - HST on Purchases (5%)', description: 'Expenses incurred for cleaning  business property.' },
    { code: '412', name: 'Consulting & Accounting', type: 'Expense', taxCode: 'AB - HST on Purchases (5%)', description: 'Expenses related to paying consultants' },
    { code: '416', name: 'Depreciation', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'The amount of the asset\'s cost (based on the useful life) that was consumed during the period' },
    { code: '420', name: 'Entertainment', type: 'Expense', taxCode: 'AB - HST on Purchases (5%)', description: 'Business-related entertainment expenses that are 50% deductible for income tax purposes.' },
    { code: '421', name: 'Entertainment - Alcohol Purchases', type: 'Expense', taxCode: 'AB - HST on Purchases (5%)', description: 'Record business-related alcohol purchases; 50% tax deductible.' },
    { code: '425', name: 'Freight & Courier', type: 'Expense', taxCode: 'AB - HST on Purchases (5%)', description: 'Expenses incurred on courier & freight costs' },
    { code: '433', name: 'Insurance', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Expenses incurred for insuring the business\' assets' },
    { code: '437', name: 'Interest Expense', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Any interest expenses paid to your tax authority, business bank accounts or credit card accounts.' },
    { code: '441', name: 'Legal expenses', type: 'Expense', taxCode: 'AB - HST on Purchases (5%)', description: 'Expenses incurred on any legal matters' },
    { code: '442', name: 'Electricity', type: 'Expense', taxCode: 'AB - HST on Purchases (5%)', description: 'Expenses incurred for electricity use' },
    { code: '445', name: 'Natural Gas Expense', type: 'Expense', taxCode: 'AB - HST on Purchases (5%)', description: 'Expenses incurred for heating provided by natural gas' },
    { code: '447', name: 'Water Expense', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Expenses incurred for delivery of fresh water to the business' },
    { code: '449', name: 'Motor Vehicle Expenses', type: 'Expense', taxCode: 'AB - HST on Purchases (5%)', description: 'Expenses incurred on the running of company motor vehicles' },
    { code: '450', name: 'Motor Vehicle Expenses - PST Exempt', type: 'Expense', taxCode: 'AB - HST on Purchases (5%)', description: 'Expenses incurred on the running of company motor vehicles that are PST exempt' },
    { code: '453', name: 'Office Expenses', type: 'Expense', taxCode: 'AB - HST on Purchases (5%)', description: 'General expenses related to the running of the business office.' },
    { code: '455', name: 'Supplies and Small Tools', type: 'Expense', taxCode: 'AB - HST on Purchases (5%)', description: 'Supplies and small tools purchases (less than $500 per item) for running the business' },
    { code: '461', name: 'Printing & Stationery', type: 'Expense', taxCode: 'AB - HST on Purchases (5%)', description: 'Expenses incurred by the entity as a result of printing and stationery' },
    { code: '468', name: 'Commercial Rent', type: 'Expense', taxCode: 'AB - HST on Purchases (5%)', description: 'The payment to lease commercial space' },
    { code: '469', name: 'Rent', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'The payment to lease a building or area.' },
    { code: '470', name: 'Research and Development', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Expenses incurred performing research and development to bring a new product or service to market' },
    { code: '473', name: 'Repairs and Maintenance', type: 'Expense', taxCode: 'AB - HST on Purchases (5%)', description: 'Expenses incurred on a damaged or run down asset that will bring the asset back to its original condition.' },
    { code: '477', name: 'Wages and Salaries', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Payment to employees in exchange for their resources' },
    { code: '478', name: 'Employee Benefits Expense', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Payment for employee benefits' },
    { code: '479', name: 'Uniforms', type: 'Expense', taxCode: 'AB - HST on Purchases (5%)', description: 'Purchase and maintenance of uniforms' },
    { code: '482', name: 'Business Licenses, Taxes, and Memberships', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Business licenses, municipal business taxes, and memberships to professional bodies (CPA , Law Society, etc.)' },
    { code: '485', name: 'Subscriptions', type: 'Expense', taxCode: 'AB - HST on Purchases (5%)', description: 'E.g. Magazines, professional bodies' },
    { code: '487', name: 'Training and Continuing Education', type: 'Expense', taxCode: 'AB - HST on Purchases (5%)', description: 'Training seminars and other professional continuing education programs' },
    { code: '489', name: 'Telephone & Internet', type: 'Expense', taxCode: 'AB - HST on Purchases (5%)', description: 'Expenditure incurred from any business-related phone calls, phone lines, or internet connections' },
    { code: '493', name: 'Travel - National', type: 'Expense', taxCode: 'AB - HST on Purchases (5%)', description: 'Expenses incurred from domestic travel which has a business purpose' },
    { code: '494', name: 'Travel - International', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Expenses incurred from international travel which has a business purpose' },
    { code: '495', name: 'Warranty Expense', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Expenses incurred through fulfilling warranty coverage' },
    { code: '497', name: 'Bank Revaluations', type: 'Bank Revaluations', taxCode: 'Tax Exempt (0%)', description: 'Bank account revaluations due for foreign exchange rate changes' },
    { code: '498', name: 'Unrealised Currency Gains', type: 'Unrealized Currency Gains', taxCode: 'Tax Exempt (0%)', description: 'Unrealised currency gains on outstanding items' },
    { code: '499', name: 'Realised Currency Gains', type: 'Realized Currency Gains', taxCode: 'Tax Exempt (0%)', description: 'Gains or losses made due to currency exchange rate changes' },
    { code: '502', name: 'Donations', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Charitable Donations' },
    { code: '505', name: 'Income Tax Expense', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'A percentage of total earnings paid to the government.' },
    { code: '507', name: 'Property Tax Expense', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Payment for Property Taxes on property owned by the business' },
    { code: '508', name: 'Bad Debts Expense', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Amount deemed uncollectible from invoices delivered goes here' },
    { code: '610', name: 'Accounts Receivable', type: 'Accounts Receivable', taxCode: 'Tax Exempt (0%)', description: 'Outstanding invoices the company has issued out to the client but has not yet received in cash at balance date.' },
    { code: '615', name: 'Allowance for Doubtful Accounts', type: 'Non-current Asset', taxCode: 'Tax Exempt (0%)', description: 'Amount deemed uncollectible from invoices delivered goes here (normal credit balance)' },
    { code: '620', name: 'Prepayments', type: 'Current Asset', taxCode: 'Tax Exempt (0%)', description: 'An expenditure that has been paid for in advance.' },
    { code: '630', name: 'Inventory', type: 'Inventory', taxCode: 'Tax Exempt (0%)', description: 'Value of tracked items for resale.' },
    { code: '640', name: 'Notes Receivable', type: 'Current Asset', taxCode: 'Tax Exempt (0%)', description: 'Loans issued by the business that are receivable go here' },
    { code: '710', name: 'Equipment', type: 'Fixed Asset', taxCode: 'AB - HST on Purchases (5%)', description: 'Office equipment that is owned and controlled by the business' },
    { code: '711', name: 'Less Accumulated Depreciation on Office Equipment', type: 'Fixed Asset', taxCode: 'Tax Exempt (0%)', description: 'The total amount of office equipment cost that has been consumed by the entity (based on the useful life)' },
    { code: '714', name: 'Vehicles', type: 'Fixed Asset', taxCode: 'AB - HST on Purchases (5%)', description: 'Vehicles that are owned and controlled by the business' },
    { code: '715', name: 'Less Accumulated Depreciation on Vehicles', type: 'Fixed Asset', taxCode: 'Tax Exempt (0%)', description: 'The total amount of vehicle cost that has been consumed by the business (based on the useful life)' },
    { code: '720', name: 'Computer Equipment', type: 'Fixed Asset', taxCode: 'AB - HST on Purchases (5%)', description: 'Computer equipment that is owned and controlled by the business' },
    { code: '721', name: 'Less Accumulated Depreciation on Computer Equipment', type: 'Fixed Asset', taxCode: 'Tax Exempt (0%)', description: 'The total amount of computer equipment cost that has been consumed by the business (based on the useful life)' },
    { code: '800', name: 'Accounts Payable', type: 'Accounts Payable', taxCode: 'Tax Exempt (0%)', description: 'Outstanding invoices the company has received from suppliers but has not yet paid at balance date' },
    { code: '802', name: 'Notes Payable', type: 'Current Liability', taxCode: 'Tax Exempt (0%)', description: 'Short-term notes payable go here' },
    { code: '803', name: 'Wages Payable', type: 'Wages Payable', taxCode: 'Tax Exempt (0%)', description: 'Xero automatically updates this account for payroll entries created using Payroll and will store the payroll amount to be paid to the employee for the pay run. This account enables you to maintain separate accounts for employee Wages Payable amounts and Accounts Payable amounts' },
    { code: '820', name: 'Sales Tax', type: 'Sales Tax', taxCode: 'Tax Exempt (0%)', description: 'The balance in this account represents Sales Tax owing to or from your tax authority. At the end of the tax period, it is this account that should be used to code against either the \'refunds from\' or \'payments to\' your tax authority that will appear on the bank statement. Xero has been designed to use only one sales tax account to track sales taxes on income and expenses, so there is no need to add any new sales tax accounts to Xero.' },
    { code: '825', name: 'Employee Tax Payable', type: 'Current Liability', taxCode: 'Tax Exempt (0%)', description: 'The amount of tax that has been deducted from wages or salaries paid to employes and is due to be paid' },
    { code: '830', name: 'Income Tax Payable', type: 'Current Liability', taxCode: 'Tax Exempt (0%)', description: 'The amount of income tax that is due to be paid, also resident withholding tax paid on interest received.' },
    { code: '840', name: 'Historical Adjustment', type: 'Historical Adjustment', taxCode: 'Tax Exempt (0%)', description: 'For accountant adjustments' },
    { code: '860', name: 'Rounding', type: 'Rounding', taxCode: 'Tax Exempt (0%)', description: 'An adjustment entry to allow for rounding' },
    { code: '877', name: 'Tracking Transfers', type: 'Tracking', taxCode: 'Tax Exempt (0%)', description: 'Transfers between tracking categories' },
    { code: '880', name: 'Due To/From Shareholders', type: 'Current Liability', taxCode: 'Tax Exempt (0%)', description: 'Withdrawals and contributions from the owners go here. For tax purposes, if the amount at the end of the period in question is positive, record a "Due To Shareholders" Liability and, if the amount at the end of the period is negative, record a "Due From Shareholders" asset.' },
    { code: '881', name: 'Owner\'s Draw', type: 'Equity', taxCode: 'Tax Exempt (0%)', description: 'Withdrawals by the owner from the business for personal use' },
    { code: '882', name: 'Owner\'s Contribution', type: 'Equity', taxCode: 'Tax Exempt (0%)', description: 'Contributions by the owner to the business' },
    { code: '883', name: 'E-Transfer', type: 'Bank Transfer', taxCode: 'Tax Exempt (0%)', description: 'Electronic money transfers between accounts' },
    { code: '884', name: 'Cheque', type: 'Bank Transfer', taxCode: 'Tax Exempt (0%)', description: 'Cheque transactions requiring manual categorization' },
    { code: '885', name: 'Bank Transfer', type: 'Bank Transfer', taxCode: 'Tax Exempt (0%)', description: 'Transfers between bank accounts' },
    { code: '886', name: 'Credit Card Payment', type: 'Bank Transfer', taxCode: 'Tax Exempt (0%)', description: 'Payments to credit card accounts' },
    { code: '887', name: 'Service Fees', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'General service fees (not bank fees)' },
    { code: '888', name: 'Processing Fees', type: 'Expense', taxCode: 'Tax Exempt (0%)', description: 'Payment processing fees' },
    { code: '900', name: 'Loan', type: 'Non-current Liability', taxCode: 'Tax Exempt (0%)', description: 'Money that has been borrowed from a creditor' },
    { code: '960', name: 'Retained Earnings', type: 'Retained Earnings', taxCode: 'Tax Exempt (0%)', description: 'Do not Use' },
    { code: '970', name: 'Owner A Share Capital', type: 'Equity', taxCode: 'Tax Exempt (0%)', description: 'The value of shares purchased by the shareholders' },
  ]
};

// Global singleton instance
let globalChartOfAccounts: ChartOfAccounts | null = null;

export class ChartOfAccounts {
  private accounts: Map<string, Account> = new Map();
  private currentProvince: string = 'ON';
  private popularAccounts: Map<string, number> = new Map();
  private static instances: Map<string, ChartOfAccounts> = new Map();

  constructor(province: string = 'ON') {
    this.currentProvince = province;
    this.initializeHardcodedAccounts();
    // Chart of Accounts initialized silently for better performance
  }

  // Singleton pattern to prevent multiple instances
  static getInstance(province: string = 'ON'): ChartOfAccounts {
    if (!ChartOfAccounts.instances.has(province)) {
      ChartOfAccounts.instances.set(province, new ChartOfAccounts(province));
    }
    return ChartOfAccounts.instances.get(province)!;
  }

  private initializeHardcodedAccounts(): void {
    this.accounts.clear();
    const provinceAccounts = HARDCODED_ACCOUNTS[this.currentProvince] || [];
    for (const acc of provinceAccounts) {
      this.accounts.set(acc.code, {
        code: acc.code,
        name: acc.name,
        type: acc.type as any,
        taxCode: acc.taxCode,
        isPopular: false,
        description: acc.description
      });
    }
  }

  setProvince(province: string): void {
    if (this.currentProvince !== province) {
      this.currentProvince = province;
      this.initializeHardcodedAccounts();
    }
  }

  getProvince(): string {
    return this.currentProvince;
  }

  getAllAccounts(): AccountWithTax[] {
    return Array.from(this.accounts.values()).map(account => this.addTaxInfo(account));
  }

  getAccount(code: string): AccountWithTax | undefined {
    const account = this.accounts.get(code);
    return account ? this.addTaxInfo(account) : undefined;
  }

  private sortAccountsByPopularity(accounts: AccountWithTax[]): AccountWithTax[] {
    return accounts.sort((a, b) => {
      // First sort by popularity
      if (a.isPopular && !b.isPopular) return -1;
      if (!a.isPopular && b.isPopular) return 1;
      
      // Then by usage count
      const aCount = this.popularAccounts.get(a.code) || 0;
      const bCount = this.popularAccounts.get(b.code) || 0;
      if (aCount !== bCount) return bCount - aCount;
      
      // Finally by account code
      return a.code.localeCompare(b.code);
    });
  }

  getAccountsByType(type: Account['type']): AccountWithTax[] {
    const accounts = Array.from(this.accounts.values())
      .filter(account => account.type === type)
      .map(account => this.addTaxInfo(account));

    return this.sortAccountsByPopularity(accounts);
  }

  getPopularAccounts(limit: number = 10): AccountSearchResult[] {
    const popularCodes = Array.from(this.accounts.keys())
      .filter(code => this.accounts.get(code)?.isPopular)
      .sort((a, b) => {
        const aCount = this.popularAccounts.get(a) || 0;
        const bCount = this.popularAccounts.get(b) || 0;
        return bCount - aCount;
      });

    return popularCodes.slice(0, limit).map(code => {
      const account = this.accounts.get(code)!;
      return {
        account: this.addTaxInfo(account),
        score: 100,
        reason: 'Popular account'
      };
    });
  }

  getSuggestedAccountsForCategory(category: string): AccountWithTax[] {
    const suggestions: AccountWithTax[] = [];
    
    // Enhanced category mappings based on CSV data
    const categoryMappings: Record<string, string[]> = {
      'Meals & Entertainment': ['420', '421'], // Entertainment, Entertainment - Alcohol
      'Motor Vehicle Expenses': ['449', '450'], // Motor Vehicle, Motor Vehicle - PST Exempt
      'Office Supplies': ['455', '453'], // Supplies and Small Tools, Office Expenses
      'Bank Fees': ['404'], // Bank Fees
      'Telecommunications': ['489'], // Telephone & Internet
      'Utilities': ['442', '445', '447'], // Electricity, Natural Gas, Water
      'Professional Services': ['412', '441'], // Consulting & Accounting, Legal expenses
      'Insurance': ['433'], // Insurance
      'Software': ['455'], // Supplies and Small Tools (software falls under this)
      'General Expenses': ['453'], // Office Expenses
      'Interest Income': ['270'], // Interest Income
      'Advertising': ['400'], // Advertising
      'Travel': ['493', '494'], // Travel - National, Travel - International
      'Rent': ['469', '468'], // Rent, Commercial Rent
      'Training': ['487'], // Training and Continuing Education
      'Subscriptions': ['485'], // Subscriptions
      'Cleaning': ['408'], // Cleaning
      'Repairs': ['473'], // Repairs and Maintenance
      'Freight': ['425'] // Freight & Courier
    };

    const accountCodes = categoryMappings[category] || [];
    for (const code of accountCodes) {
      const account = this.getAccount(code);
      if (account) {
        suggestions.push(account);
      }
    }
    return suggestions;
  }

  findAccountByCategory(category: string): AccountWithTax | null {
    const suggestions = this.getSuggestedAccountsForCategory(category);
    return suggestions.length > 0 ? suggestions[0] : null;
  }

  recordAccountUsage(accountCode: string): void {
    const currentCount = this.popularAccounts.get(accountCode) || 0;
    this.popularAccounts.set(accountCode, currentCount + 1);
  }

  private getCurrentProvinceTaxInfo(): Province {
    return PROVINCES.find(p => p.code === this.currentProvince) || PROVINCES[0];
  }

  private addTaxInfo(account: Account): AccountWithTax {
    const province = this.getCurrentProvinceTaxInfo();
    let taxRate = 0;
    let taxType: AccountWithTax['taxType'] = 'Exempt';

    // Parse tax information from the Tax Code field in CSV
    const taxCode = account.taxCode.toLowerCase();
    
    if (taxCode.includes('hst')) {
      // HST provinces (ON, NB, NL, NS, PE)
      const hstMatch = taxCode.match(/(\d+)%/);
      if (hstMatch) {
        taxRate = parseInt(hstMatch[1]);
        taxType = 'HST';
      } else if (province.taxRate.hst) {
        taxRate = province.taxRate.hst;
        taxType = 'HST';
      }
    } else if (taxCode.includes('gst/pst') || (taxCode.includes('gst') && taxCode.includes('pst'))) {
      // GST+PST provinces (BC, SK, MB) - handles "GST/PST" format
      const gstPstMatch = taxCode.match(/(\d+)%/);
      if (gstPstMatch) {
        taxRate = parseInt(gstPstMatch[1]);
        taxType = 'GST+PST';
      } else {
        taxRate = province.taxRate.gst + province.taxRate.pst;
        taxType = 'GST+PST';
      }
    } else if (taxCode.includes('gst')) {
      // GST only - could be GST-only items or GST-only provinces
      const gstMatch = taxCode.match(/(\d+)%/);
      if (gstMatch) {
        taxRate = parseInt(gstMatch[1]);
      } else {
        taxRate = province.taxRate.gst;
      }
      
      // Determine tax type based on province
      if (this.currentProvince === 'QC') {
        taxRate = province.taxRate.gst + province.taxRate.pst; // PST is QST in Quebec
        taxType = 'GST+QST';
      } else if (this.currentProvince === 'AB') {
        taxType = 'GST+PST'; // Alberta is GST-only, but we use this type for consistency
      } else if (['BC', 'SK', 'MB'].includes(this.currentProvince)) {
        // For GST-only items in GST+PST provinces, keep as GST rate but mark as GST+PST province
        taxType = 'GST+PST';
      } else {
        taxType = 'GST+PST';
      }
    } else if (taxCode.includes('exempt') || taxCode.includes('0%')) {
      // Tax exempt items
      taxRate = 0;
      taxType = 'Exempt';
    }

    // Use hardcoded description only
    const description = account.description;

    return {
      ...account,
      taxRate,
      taxType,
      province: province.code,
      description
    };
  }

  getStats(): {
    totalAccounts: number;
    accountsByType: Record<string, number>;
    popularAccounts: number;
    currentProvince: string;
  } {
    const accountsByType: Record<string, number> = {};
    
    for (const account of this.accounts.values()) {
      accountsByType[account.type] = (accountsByType[account.type] || 0) + 1;
    }

    return {
      totalAccounts: this.accounts.size,
      accountsByType,
      popularAccounts: Array.from(this.accounts.values()).filter(a => a.isPopular).length,
      currentProvince: this.currentProvince
    };
  }

  /**
   * Wait for the chart of accounts to be fully initialized
   */
  // Removed: async waitForInitialization(): Promise<void> {
  //   ...
  // }
}

// Export default instance for easy access
export const getChartOfAccounts = (province: string = 'ON') => ChartOfAccounts.getInstance(province);
