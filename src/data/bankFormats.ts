export const BANK_FORMATS = {
  Generic: {
    dateColumn: 'Date',
    descriptionColumn: 'Description',
    amountColumn: 'Amount',
    dateFormat: 'YYYY-MM-DD',
    identifier: ['Date', 'Description', 'Amount']
  },
  Generic_DADB: {
    dateColumn: 'Date',
    descriptionColumn: 'Description',
    amountColumn: 'Amount',
    dateFormat: 'YYYY-MM-DD',
    identifier: ['Date', 'Description', 'Amount']
  },
  RBC: {
    dateColumn: 'Transaction Date',
    descriptionColumn: 'Description',
    amountColumn: 'Amount',
    dateFormat: 'MM/DD/YYYY',
    identifier: ['Transaction Date', 'Description', 'Amount']
  },
  TD: {
    dateColumn: 'Date',
    descriptionColumn: 'Description', 
    amountColumn: 'Amount',
    dateFormat: 'YYYY-MM-DD',
    identifier: ['Date', 'Description', 'Amount']
  },
  Scotia: {
    dateColumn: 'Date',
    descriptionColumn: 'Transaction Details',
    amountColumn: 'Amount',
    dateFormat: 'DD/MM/YYYY',
    identifier: ['Date', 'Transaction Details', 'Amount']
  },
  Scotia_DayToDay: {
    dateColumn: 'Date',
    descriptionColumn: 'Description',
    amountColumn: 'Amount',
    dateFormat: 'YYYY-MM-DD',
    identifier: ['Date', 'Description', 'Amount']
  },
  BMO: {
    dateColumn: 'Date',
    descriptionColumn: 'Description',
    amountColumn: 'Amount',
    dateFormat: 'MM/DD/YYYY',
    identifier: ['Date', 'Description', 'Amount']
  },
  CIBC: {
    dateColumn: 'Date',
    descriptionColumn: 'Description',
    amountColumn: 'Amount',
    dateFormat: 'YYYY-MM-DD',
    identifier: ['Date', 'Description', 'Amount']
  },
  // BT Records format - supports files like "5000 BT Records.csv"
  BT_Records: {
    dateColumn: 'Date',
    descriptionColumn: 'Description',
    amountColumn: 'Amount',
    dateFormat: 'DD/MM/YYYY',
    identifier: ['Date', 'Description', 'Amount']
  },
  // Enhanced patterns from training data
  ElectronicTransfer: {
    dateColumn: 'Date',
    descriptionColumn: 'Description',
    amountColumn: 'Amount',
    dateFormat: 'YYYY-MM-DD',
    identifier: ['Date', 'Description', 'Amount'],
    patterns: [
      /Electronic\s*Funds\s*Transfer/i,
      /MISC\s*PAYMENT/i,
      /LOAN\s*PAYMENT/i,
      /PRE-AUTH\s*DEBIT/i,
      /Internet\s*Banking\s*E-TRANSFER/i,
      /GOVERNMENT\s*CANADA/i
    ]
  }
} as const;

export type BankFormat = keyof typeof BANK_FORMATS;

// Helper function to get format details
export const getBankFormatInfo = (format: BankFormat) => {
  return BANK_FORMATS[format];
};

// Bank format validation
export const validateBankFormat = (format: string): format is BankFormat => {
  return format in BANK_FORMATS;
}; 