'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { FinancialData } from '../lib/reportGenerator';

type FinancialDataContextType = {
  financialData: FinancialData | null;
  setFinancialData: (data: FinancialData | null) => void;
  isSample: boolean;
  setIsSample: (isSample: boolean) => void;
  // New persistent storage functions
  saveToStorage: () => void;
  loadFromStorage: () => void;
  clearStorage: () => void;
};

const FinancialDataContext = createContext<FinancialDataContextType | undefined>(undefined);

// Safe storage utilities with error handling
const safeStorage = {
  set: (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
      return false;
    }
  },
  get: (key: string) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.warn('Failed to load from localStorage:', error);
      return null;
    }
  },
  remove: (key: string) => {
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
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [isSample, setIsSample] = useState<boolean>(false);

  // Load data from storage on mount (safe)
  useEffect(() => {
    try {
      const savedData = safeStorage.get(STORAGE_KEYS.FINANCIAL_DATA);
      const savedIsSample = safeStorage.get(STORAGE_KEYS.IS_SAMPLE);
      
      if (savedData) {
        setFinancialData(savedData);
        console.log('✅ Loaded financial data from storage');
      }
      
      if (savedIsSample !== null) {
        setIsSample(savedIsSample);
      }
    } catch (error) {
      console.warn('Failed to load from storage:', error);
      // Continue with default state - no breaking
    }
  }, []);

  // Auto-save when data changes (safe)
  useEffect(() => {
    if (financialData) {
      safeStorage.set(STORAGE_KEYS.FINANCIAL_DATA, financialData);
      safeStorage.set(STORAGE_KEYS.LAST_UPDATED, new Date().toISOString());
    }
  }, [financialData]);

  useEffect(() => {
    safeStorage.set(STORAGE_KEYS.IS_SAMPLE, isSample);
  }, [isSample]);

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
  if (!context) throw new Error('useFinancialData must be used within a FinancialDataProvider');
  return context;
}; 