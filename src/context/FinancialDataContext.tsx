'use client';

import React, { createContext, useContext, useState } from 'react';
import type { FinancialData } from '../lib/reportGenerator';

type FinancialDataContextType = {
  financialData: FinancialData | null;
  setFinancialData: (data: FinancialData | null) => void;
  isSample: boolean;
  setIsSample: (isSample: boolean) => void;
};

const FinancialDataContext = createContext<FinancialDataContextType | undefined>(undefined);

export const FinancialDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [isSample, setIsSample] = useState<boolean>(false);
  return (
    <FinancialDataContext.Provider value={{ financialData, setFinancialData, isSample, setIsSample }}>
      {children}
    </FinancialDataContext.Provider>
  );
};

export const useFinancialData = () => {
  const context = useContext(FinancialDataContext);
  if (!context) throw new Error('useFinancialData must be used within a FinancialDataProvider');
  return context;
}; 