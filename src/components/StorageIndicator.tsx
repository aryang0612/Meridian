'use client';

import React, { useState, useEffect } from 'react';
import { useFinancialData } from '../context/FinancialDataContext';

export default function StorageIndicator() {
  const { financialData } = useFinancialData();
  const [showSaved, setShowSaved] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !financialData) return; // Only run after client-side mount
    
      // Show "Saved" indicator briefly
      setShowSaved(true);
      setLastSaved(new Date().toLocaleTimeString());
      
      // Hide after 2 seconds
      const timer = setTimeout(() => {
        setShowSaved(false);
      }, 2000);

      return () => clearTimeout(timer);
  }, [financialData, mounted]);

  // Don't show anything if not mounted or no data
  if (!mounted || !financialData) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {showSaved && (
        <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 animate-fade-in">
          <span className="text-sm">💾</span>
          <span className="text-sm font-medium">Saved</span>
          <span className="text-xs opacity-75">{lastSaved}</span>
        </div>
      )}
      
      {/* Always show a subtle indicator when data exists */}
      {!showSaved && financialData && (
        <div className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg shadow-sm flex items-center space-x-1 opacity-75 hover:opacity-100 transition-opacity">
          <span className="text-xs">💾</span>
          <span className="text-xs">Auto-save enabled</span>
        </div>
      )}
    </div>
  );
} 