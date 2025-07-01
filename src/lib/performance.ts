export class PerformanceUtils {
  /**
   * Check if file requires special handling for performance
   */
  static isLargeFile(file: File): boolean {
    return file.size > 5 * 1024 * 1024; // 5MB threshold
  }

  /**
   * Estimate processing time based on file size
   */
  static estimateProcessingTime(file: File): string {
    const sizeInMB = file.size / (1024 * 1024);
    
    if (sizeInMB < 1) return 'a few seconds';
    if (sizeInMB < 5) return '10-30 seconds';
    if (sizeInMB < 10) return '30-60 seconds';
    return 'several minutes';
  }

  /**
   * Create progress tracker for batch operations
   */
  static createProgressTracker(total: number) {
    let processed = 0;
    
    return {
      increment: (): number => {
        processed++;
        return Math.round((processed / total) * 100);
      },
      getProgress: (): number => Math.round((processed / total) * 100),
      isComplete: (): boolean => processed >= total,
      getStats: () => ({ processed, total, remaining: total - processed })
    };
  }

  /**
   * Batch process large arrays without blocking UI
   */
  static async batchProcess<T, R>(
    items: T[],
    processor: (item: T, index: number) => R,
    batchSize: number = 100,
    onProgress?: (progress: number) => void
  ): Promise<R[]> {
    const results: R[] = [];
    const tracker = this.createProgressTracker(items.length);
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      // Process batch
      const batchResults = batch.map((item, batchIndex) => 
        processor(item, i + batchIndex)
      );
      
      results.push(...batchResults);
      
      // Update progress
      const progress = tracker.increment();
      onProgress?.(progress);
      
      // Allow UI to update between batches
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    return results;
  }
} 