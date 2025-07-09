/**
 * Centralized formatting utilities to eliminate code duplication
 */

/**
 * Format currency values consistently across the application
 */
export const formatCurrency = (amount: number, options: {
  currency?: string;
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  useAbsoluteValue?: boolean;
} = {}): string => {
  const {
    currency = 'CAD',
    locale = 'en-CA',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    useAbsoluteValue = false
  } = options;

  const value = useAbsoluteValue ? Math.abs(amount) : amount;
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits
  }).format(value);
};

/**
 * Format date values consistently across the application
 */
export const formatDate = (date: Date | string, options: {
  locale?: string;
  format?: 'short' | 'medium' | 'long' | 'full';
  dateStyle?: 'short' | 'medium' | 'long' | 'full';
  timeStyle?: 'short' | 'medium' | 'long' | 'full';
} = {}): string => {
  const {
    locale = 'en-CA',
    format = 'medium',
    dateStyle,
    timeStyle
  } = options;

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (dateStyle || timeStyle) {
    return new Intl.DateTimeFormat(locale, {
      dateStyle,
      timeStyle
    }).format(dateObj);
  }

  // Default format options based on format type
  const formatOptions = {
    short: { year: 'numeric', month: 'short', day: 'numeric' },
    medium: { year: 'numeric', month: 'long', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
    full: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour: 'numeric', minute: 'numeric' }
  };

  return new Intl.DateTimeFormat(locale, formatOptions[format] as any).format(dateObj);
};

/**
 * Format percentage values consistently
 */
export const formatPercentage = (value: number, options: {
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
} = {}): string => {
  const {
    locale = 'en-CA',
    minimumFractionDigits = 0,
    maximumFractionDigits = 1
  } = options;

  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits,
    maximumFractionDigits
  }).format(value / 100);
};

/**
 * Format numbers consistently (for amounts, quantities, etc.)
 */
export const formatNumber = (value: number, options: {
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  useGrouping?: boolean;
} = {}): string => {
  const {
    locale = 'en-CA',
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    useGrouping = true
  } = options;

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
    useGrouping
  }).format(value);
};

/**
 * Format file size consistently
 */
export const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

/**
 * Normalize amount for comparison (round to 2 decimal places)
 */
export const normalizeAmount = (amount: number): number => {
  return Math.round(amount * 100) / 100;
};

/**
 * Check if a value looks like an amount
 */
export const looksLikeAmount = (value: string): boolean => {
  // Remove common currency symbols and commas
  const cleanValue = value.replace(/[$,]/g, '');
  
  // Check if it's a number (possibly with decimal)
  return /^-?\d+(\.\d{1,2})?$/.test(cleanValue);
};

/**
 * Parse amount from string with flexible formatting
 */
export const parseAmountFlexible = (amountString: string): number | null => {
  if (!amountString) return null;
  
  try {
    // Handle various formats: $123.45, 123.45, (123.45), -123.45, $1,234.56, "3,276.00"
    let cleanAmount = amountString
      .replace(/["']/g, '') // Remove quotes
      .replace(/[$,\s]/g, '') // Remove $, commas, spaces
      .replace(/[()]/g, match => match === '(' ? '-' : ''); // Convert (123.45) to -123.45
    
    // Handle special cases like "DR" (debit) and "CR" (credit)
    if (cleanAmount.toUpperCase().includes('DR')) {
      cleanAmount = cleanAmount.replace(/DR/i, '').trim();
    } else if (cleanAmount.toUpperCase().includes('CR')) {
      cleanAmount = '-' + cleanAmount.replace(/CR/i, '').trim();
    }
    
    const amount = parseFloat(cleanAmount);
    
    // Validate reasonable amount range (increased limit for business accounts)
    if (isNaN(amount) || Math.abs(amount) > 10000000) {
      return null;
    }
    
    return amount;
    
  } catch (error) {
    return null;
  }
};

/**
 * Escape CSV row for safe export
 */
export const escapeCSVRow = (row: string[]): string => {
  return row.map(field => {
    // If field contains comma, quote, or newline, wrap in quotes and escape quotes
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }).join(',');
};

/**
 * Generate a unique ID for transactions or other entities
 */
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Normalize string for comparison (centralized utility)
 */
export const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
};

/**
 * Calculate similarity between two strings (centralized utility)
 */
export const calculateStringSimilarity = (str1: string, str2: string): number => {
  const norm1 = normalizeString(str1);
  const norm2 = normalizeString(str2);
  
  if (norm1 === norm2) return 1;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.7;
  
  // Simple character overlap
  const overlap = norm1.split('').filter(char => norm2.includes(char)).length;
  return overlap / Math.max(norm1.length, norm2.length);
};

/**
 * Format duplicate detection results for display
 */
export const formatDuplicateReport = (duplicateCount: number, groupCount: number): string => {
  if (duplicateCount === 0) {
    return 'No duplicates detected.';
  }
  
  return `Found ${duplicateCount} duplicate transaction${duplicateCount > 1 ? 's' : ''} in ${groupCount} group${groupCount > 1 ? 's' : ''}.`;
}; 