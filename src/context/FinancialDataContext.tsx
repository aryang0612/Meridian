'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { FinancialData } from '../lib/reportGenerator';
import type { Transaction, ValidationResult } from '../lib/types';
import type { BankFormat } from '../data/bankFormats';
import type { DuplicateDetectionResult } from '../lib/duplicateDetector';

// Extended interface for dashboard state
interface DashboardData {
  transactions: Transaction[];
  processingResults?: {
    validation: ValidationResult;
    bankFormat: BankFormat | 'Unknown';
    stats: any;
  };
  currentStep?: 'upload' | 'review' | 'export';
  duplicateResult?: DuplicateDetectionResult;
  selectedProvince?: string;
}

// Combined interface for both report data and dashboard state
interface ExtendedFinancialData extends FinancialData {
  dashboard?: DashboardData;
}

type FinancialDataContextType = {
  financialData: ExtendedFinancialData | null;
  setFinancialData: (data: ExtendedFinancialData | null) => void;
  setDashboardData: (data: DashboardData) => void;
  isSample: boolean;
  setIsSample: (isSample: boolean) => void;
  // New persistent storage functions
  saveToStorage: () => void;
  loadFromStorage: () => void;
  clearStorage: () => void;
};

const FinancialDataContext = createContext<FinancialDataContextType | undefined>(undefined);

// Safe storage utilities with error handling and client-side check
const safeStorage = {
  set: (key: string, data: any) => {
    if (typeof window === 'undefined') return false; // Server-side check
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
      return false;
    }
  },
  get: (key: string) => {
    if (typeof window === 'undefined') return null; // Server-side check
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      
      const parsed = JSON.parse(item);
      return parsed;
    } catch (error) {
      console.warn(`Failed to parse localStorage key "${key}":`, error);
      // Clear corrupted data
      try {
        localStorage.removeItem(key);
        console.log(`Cleared corrupted data for key: ${key}`);
      } catch (clearError) {
        console.warn('Failed to clear corrupted data:', clearError);
      }
      return null;
    }
  },
  remove: (key: string) => {
    if (typeof window === 'undefined') return false; // Server-side check
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
      return false;
    }
  }
};

const STORAGE_KEYS = {
  FINANCIAL_DATA: 'meridian_financial_data',
  IS_SAMPLE: 'meridian_is_sample',
  LAST_UPDATED: 'meridian_last_updated'
};

export const FinancialDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [financialData, setFinancialData] = useState<ExtendedFinancialData | null>(null);
  const [isSample, setIsSample] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  // Client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  const setDashboardData = useCallback((dashboardData: DashboardData) => {
    setFinancialData(prev => {
      if (!prev) {
        return {
          transactions: [],
          startDate: new Date(),
          endDate: new Date(),
          companyName: '',
          reportDate: new Date(),
          dashboard: dashboardData
        };
      }
      return {
        ...prev,
        dashboard: dashboardData
      };
    });
  }, []);

  // Load data from storage on mount (client-side only)
  useEffect(() => {
    if (!mounted) return; // Only run after client-side mount
    
    try {
      // Load existing data instead of clearing it
      const savedData = safeStorage.get(STORAGE_KEYS.FINANCIAL_DATA);
      const savedIsSample = safeStorage.get(STORAGE_KEYS.IS_SAMPLE);
      
      if (savedData) {
        setFinancialData(savedData);
        console.log('✅ Loaded financial data from storage');
      }
      
      if (savedIsSample !== null) {
        setIsSample(savedIsSample);
      }
      
      console.log('✅ App initialized with existing data');
    } catch (error) {
      console.warn('Failed to load from localStorage:', error);
      // Continue with default state - no breaking
    }
  }, [mounted]);

  // Auto-save when data changes (client-side only)
  useEffect(() => {
    if (!mounted || !financialData) return; // Only run after client-side mount
    
      safeStorage.set(STORAGE_KEYS.FINANCIAL_DATA, financialData);
      safeStorage.set(STORAGE_KEYS.LAST_UPDATED, new Date().toISOString());
  }, [financialData, mounted]);

  useEffect(() => {
    if (!mounted) return; // Only run after client-side mount
    
    safeStorage.set(STORAGE_KEYS.IS_SAMPLE, isSample);
  }, [isSample, mounted]);

  // Manual storage functions
  const saveToStorage = () => {
    if (financialData) {
      const success = safeStorage.set(STORAGE_KEYS.FINANCIAL_DATA, financialData);
      if (success) {
        console.log('✅ Data saved to storage');
      }
    }
  };

  const loadFromStorage = () => {
    const savedData = safeStorage.get(STORAGE_KEYS.FINANCIAL_DATA);
    if (savedData) {
      setFinancialData(savedData);
      console.log('✅ Data loaded from storage');
    }
  };

  const clearStorage = () => {
    safeStorage.remove(STORAGE_KEYS.FINANCIAL_DATA);
    safeStorage.remove(STORAGE_KEYS.IS_SAMPLE);
    safeStorage.remove(STORAGE_KEYS.LAST_UPDATED);
    setFinancialData(null);
    setIsSample(false);
    console.log('✅ Storage cleared');
  };

  return (
    <FinancialDataContext.Provider value={{ 
      financialData, 
      setFinancialData, 
      setDashboardData,
      isSample, 
      setIsSample,
      saveToStorage,
      loadFromStorage,
      clearStorage
    }}>
      {children}
    </FinancialDataContext.Provider>
  );
};

export const useFinancialData = () => {
  const context = useContext(FinancialDataContext);
  if (!context) {
    // During server-side rendering, context might not be available
    // Return a safe default instead of throwing
    if (typeof window === 'undefined') {
      return {
        financialData: null,
        setFinancialData: () => {},
        setDashboardData: () => {},
        isSample: false,
        setIsSample: () => {},
        saveToStorage: () => {},
        loadFromStorage: () => {},
        clearStorage: () => {}
      };
    }
    throw new Error('useFinancialData must be used within a FinancialDataProvider');
  }
  return context;
}; 