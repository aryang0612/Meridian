import { Transaction } from './types';
import { normalizeAmount, normalizeString, formatDuplicateReport as formatDuplicateReportUtil } from './formatUtils';

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

// Use centralized utilities from formatUtils

/**
 * Detects duplicate transactions in an array
 * Only flags as duplicate if date, amount, and description are all identical (after normalization)
 * @param transactions Array of transactions to check
 * @returns Detection result with duplicates grouped
 */
export function detectDuplicates(
  transactions: Transaction[]
): DuplicateDetectionResult {
  const duplicateGroups: DuplicateGroup[] = [];
  const processedIndexes = new Set<number>();

  function makeKey(tx: Transaction) {
    const key = [
      tx.date,
      normalizeAmount(tx.amount),
      normalizeString(tx.description)
    ].join('|');
    return key;
  }

  const seen = new Map<string, number>();

  for (let i = 0; i < transactions.length; i++) {
    if (processedIndexes.has(i)) continue;
    const key = makeKey(transactions[i]);
    if (seen.has(key)) {
      // Already seen, add to group
      const groupIdx = duplicateGroups.findIndex(g => g.originalIndex === seen.get(key));
      if (groupIdx !== -1) {
        duplicateGroups[groupIdx].duplicateIndexes.push(i);
        processedIndexes.add(i);
      }
    } else {
      // Look for future duplicates
      const duplicateIndexes: number[] = [];
      for (let j = i + 1; j < transactions.length; j++) {
        if (processedIndexes.has(j)) continue;
        const keyJ = makeKey(transactions[j]);
        if (keyJ === key) {
          duplicateIndexes.push(j);
          processedIndexes.add(j);
        }
      }
      if (duplicateIndexes.length > 0) {
        duplicateGroups.push({
          originalIndex: i,
          duplicateIndexes,
          transaction: transactions[i],
          confidence: 1.0
        });
        processedIndexes.add(i);
        seen.set(key, i);
      } else {
        seen.set(key, i);
      }
    }
  }

  // Create clean transactions array (removing duplicates)
  const cleanTransactions = transactions.filter((_, index) => !processedIndexes.has(index));

  const duplicateCount = duplicateGroups.reduce((sum, group) => sum + group.duplicateIndexes.length, 0);
  
  return {
    duplicateGroups,
    cleanTransactions,
    duplicateCount
  };
}

/**
 * Checks if a new transaction is a duplicate of existing ones (exact match only)
 * @param newTransaction Transaction to check
 * @param existingTransactions Array of existing transactions
 * @returns Array of matching transaction indexes
 */
export function findDuplicatesOfTransaction(
  newTransaction: Transaction,
  existingTransactions: Transaction[]
): number[] {
  const duplicates: number[] = [];
  const newKey = [
    newTransaction.date,
    normalizeAmount(newTransaction.amount),
    normalizeString(newTransaction.description)
  ].join('|');
  
  for (let i = 0; i < existingTransactions.length; i++) {
    const existingKey = [
      existingTransactions[i].date,
      normalizeAmount(existingTransactions[i].amount),
      normalizeString(existingTransactions[i].description)
    ].join('|');
    
    if (newKey === existingKey) {
      duplicates.push(i);
    }
  }
  
  return duplicates;
}

/**
 * Formats duplicate detection results - using centralized utility
 */
export function formatDuplicateReport(result: DuplicateDetectionResult): string {
  return formatDuplicateReportUtil(result.duplicateCount, result.duplicateGroups.length);
} 