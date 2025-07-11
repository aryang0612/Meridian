import { Transaction } from './types';

// LRU Cache implementation for categorization results
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Categorization cache
export const categorizationCache = new LRUCache<string, {
  category: string;
  accountCode: string;
  confidence: number;
  timestamp: number;
}>(2000);

// Pattern matching cache
export const patternCache = new LRUCache<string, {
  matched: boolean;
  pattern?: any;
  confidence: number;
}>(5000);

// Memoization decorator
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  cacheSize: number = 100
): T {
  const cache = new LRUCache<string, ReturnType<T>>(cacheSize);
  
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);
    
    if (cached !== undefined) {
      return cached;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// Parallel processing for transaction batches
export class ParallelProcessor {
  private batchSize: number;
  private maxConcurrency: number;

  constructor(batchSize: number = 50, maxConcurrency: number = 4) {
    this.batchSize = batchSize;
    this.maxConcurrency = maxConcurrency;
  }

  async processTransactions<T>(
    transactions: Transaction[],
    processor: (transaction: Transaction) => Promise<T> | T,
    onProgress?: (completed: number, total: number) => void
  ): Promise<T[]> {
    const results: T[] = [];
    const batches = this.createBatches(transactions);
    let completed = 0;

    // Process batches with controlled concurrency
    for (let i = 0; i < batches.length; i += this.maxConcurrency) {
      const currentBatches = batches.slice(i, i + this.maxConcurrency);
      
      const batchPromises = currentBatches.map(async (batch) => {
        const batchResults: T[] = [];
        
        for (const transaction of batch) {
          const result = await processor(transaction);
          batchResults.push(result);
          completed++;
          onProgress?.(completed, transactions.length);
        }
        
        return batchResults;
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.flat());
    }

    return results;
  }

  private createBatches<T>(items: T[]): T[][] {
    const batches: T[][] = [];
    
    for (let i = 0; i < items.length; i += this.batchSize) {
      batches.push(items.slice(i, i + this.batchSize));
    }
    
    return batches;
  }
}

// Performance metrics tracking
export class PerformanceTracker {
  private metrics = new Map<string, {
    totalTime: number;
    callCount: number;
    averageTime: number;
    lastCall: number;
  }>();

  startTimer(operation: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      this.recordMetric(operation, duration);
    };
  }

  private recordMetric(operation: string, duration: number): void {
    const existing = this.metrics.get(operation) || {
      totalTime: 0,
      callCount: 0,
      averageTime: 0,
      lastCall: 0
    };

    existing.totalTime += duration;
    existing.callCount += 1;
    existing.averageTime = existing.totalTime / existing.callCount;
    existing.lastCall = Date.now();

    this.metrics.set(operation, existing);
  }

  getMetrics(operation?: string) {
    if (operation) {
      return this.metrics.get(operation);
    }
    return Object.fromEntries(this.metrics);
  }

  clearMetrics(): void {
    this.metrics.clear();
  }
}

// Global performance instances
export const parallelProcessor = new ParallelProcessor();
export const performanceTracker = new PerformanceTracker();

// Cache utilities
export const CacheUtils = {
  // Generate comprehensive cache key for transaction to prevent collisions
  generateCacheKey(transaction: Transaction, context?: { province?: string; userId?: string }): string {
    // Create a more robust key that includes context and prevents collisions
    const parts = [
      transaction.description?.toLowerCase().trim() || 'no_desc',
      transaction.amount?.toString() || '0',
      transaction.date?.toString() || 'no_date',
      context?.province || 'default_province',
      context?.userId || 'default_user'
    ];
    
    // Use a separator that's unlikely to appear in transaction descriptions
    const key = parts.join('||');
    
    // Generate hash for consistent key length and prevent collisions
    return this.hashString(key);
  },

  // Simple hash function for cache keys
  hashString(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return `cache_${Math.abs(hash).toString(36)}`;
  },

  // Check if cache entry is still valid (reduced TTL for better accuracy)
  isCacheValid(timestamp: number, ttlMs: number = 1800000): boolean { // 30 minutes instead of 1 hour
    return Date.now() - timestamp < ttlMs;
  },

  // Invalidate cache when patterns or user corrections change
  invalidateCache(reason: string = 'manual'): void {
    console.log(`🗑️ Invalidating caches due to: ${reason}`);
    categorizationCache.clear();
    patternCache.clear();
  },

  // Clean expired cache entries
  cleanExpiredEntries(): void {
    const now = Date.now();
    const ttl = 1800000; // 30 minutes

    // Clean categorization cache
    for (const [key, value] of (categorizationCache as any).cache) {
      if (now - value.timestamp > ttl) {
        (categorizationCache as any).cache.delete(key);
      }
    }
  }
};

// Debounced function utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttled function utility
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
} 