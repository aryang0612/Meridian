import { Transaction } from './types';

export interface DuplicateGroup {
  originalIndex: number;
  duplicateIndexes: number[];
  transaction: Transaction;
  confidence: number;
}

export interface DuplicateDetectionResult {
  duplicateGroups: DuplicateGroup[];
  cleanTransactions: Transaction[];
  duplicateCount: number;
}

/**
 * Normalizes a string for comparison by removing extra spaces, converting to lowercase,
 * and removing common variations
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
}

/**
 * Normalizes an amount for comparison by rounding to 2 decimal places
 */
function normalizeAmount(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Calculates similarity score between two transactions
 * Returns a score from 0 (no match) to 1 (perfect match)
 */
function calculateSimilarity(t1: Transaction, t2: Transaction): number {
  let score = 0;
  let factors = 0;

  // Date comparison (exact match = 0.4 points)
  if (t1.date === t2.date) {
    score += 0.4;
  }
  factors += 0.4;

  // Amount comparison (exact match = 0.4 points)
  if (normalizeAmount(t1.amount) === normalizeAmount(t2.amount)) {
    score += 0.4;
  }
  factors += 0.4;

  // Description comparison (exact match = 0.2 points)
  const desc1 = normalizeString(t1.description);
  const desc2 = normalizeString(t2.description);
  
  if (desc1 === desc2) {
    score += 0.2;
  } else if (desc1.includes(desc2) || desc2.includes(desc1)) {
    score += 0.1; // Partial match
  }
  factors += 0.2;

  return factors > 0 ? score / factors : 0;
}

/**
 * Detects duplicate transactions in an array
 * @param transactions Array of transactions to check
 * @param threshold Similarity threshold (0-1, default 0.9)
 * @returns Detection result with duplicates grouped
 */
export function detectDuplicates(
  transactions: Transaction[],
  threshold: number = 0.9
): DuplicateDetectionResult {
  const duplicateGroups: DuplicateGroup[] = [];
  const processedIndexes = new Set<number>();
  
  for (let i = 0; i < transactions.length; i++) {
    if (processedIndexes.has(i)) continue;
    
    const duplicateIndexes: number[] = [];
    const currentTransaction = transactions[i];
    
    // Compare with all subsequent transactions
    for (let j = i + 1; j < transactions.length; j++) {
      if (processedIndexes.has(j)) continue;
      
      const similarity = calculateSimilarity(currentTransaction, transactions[j]);
      
      if (similarity >= threshold) {
        duplicateIndexes.push(j);
        processedIndexes.add(j);
      }
    }
    
    // If duplicates found, create a group
    if (duplicateIndexes.length > 0) {
      duplicateGroups.push({
        originalIndex: i,
        duplicateIndexes,
        transaction: currentTransaction,
        confidence: 1.0 // Could be refined based on similarity scores
      });
      processedIndexes.add(i);
    }
  }
  
  // Create clean transactions array (removing duplicates)
  const cleanTransactions = transactions.filter((_, index) => !processedIndexes.has(index));
  
  return {
    duplicateGroups,
    cleanTransactions,
    duplicateCount: duplicateGroups.reduce((sum, group) => sum + group.duplicateIndexes.length, 0)
  };
}

/**
 * Checks if a new transaction is a duplicate of existing ones
 * @param newTransaction Transaction to check
 * @param existingTransactions Array of existing transactions
 * @param threshold Similarity threshold (0-1, default 0.9)
 * @returns Array of matching transaction indexes
 */
export function findDuplicatesOfTransaction(
  newTransaction: Transaction,
  existingTransactions: Transaction[],
  threshold: number = 0.9
): number[] {
  const duplicates: number[] = [];
  
  for (let i = 0; i < existingTransactions.length; i++) {
    const similarity = calculateSimilarity(newTransaction, existingTransactions[i]);
    if (similarity >= threshold) {
      duplicates.push(i);
    }
  }
  
  return duplicates;
}

/**
 * Formats duplicate detection results for display
 */
export function formatDuplicateReport(result: DuplicateDetectionResult): string {
  if (result.duplicateCount === 0) {
    return 'No duplicates detected.';
  }
  
  const groupCount = result.duplicateGroups.length;
  const duplicateCount = result.duplicateCount;
  
  return `Found ${duplicateCount} duplicate transaction${duplicateCount > 1 ? 's' : ''} in ${groupCount} group${groupCount > 1 ? 's' : ''}.`;
} 