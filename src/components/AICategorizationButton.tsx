'use client';

import { useState } from 'react';
import { Transaction } from '../lib/types';
import { DatabaseService } from '../lib/databaseService';

interface AICategorizationButtonProps {
  transaction: Transaction;
  onCategorized: (transaction: Transaction) => void;
}

interface AISuggestion {
  accountCode: string;
  confidence: number;
  reasoning: string;
  suggestedKeyword: string;
}

export default function AICategorizationButton({ transaction, onCategorized }: AICategorizationButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCategorize = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai-categorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: transaction.description,
          amount: transaction.amount,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to categorize transaction');
      }

      const result = await response.json();
      
      // Update the transaction with AI categorization
      const updatedTransaction = {
        ...transaction,
        accountCode: result.accountCode,
        confidence: result.confidence,
      };

      // Show the suggestion with keyword
      setSuggestion({
        accountCode: result.accountCode,
        confidence: result.confidence,
        reasoning: result.reasoning,
        suggestedKeyword: result.suggestedKeyword || ''
      });
      
      setShowSuggestion(true);
      onCategorized(updatedTransaction);

    } catch (error) {
      console.error('Error categorizing transaction:', error);
      setError('Failed to categorize transaction. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveKeyword = async () => {
    if (!suggestion?.suggestedKeyword) return;

    try {
      const databaseService = DatabaseService.getInstance();
      await databaseService.saveUserCategorizationRule(
        suggestion.suggestedKeyword,
        suggestion.accountCode,
        'contains'
      );
      
      setShowSuggestion(false);
      setSuggestion(null);
      // Show success message briefly
      setError(null);
    } catch (error) {
      console.error('Error saving keyword:', error);
      setError('Failed to save keyword. Please try again.');
    }
  };

  const handleDismiss = () => {
    setShowSuggestion(false);
    setSuggestion(null);
    setError(null);
  };

  return (
    <div className="relative">
      <button
        onClick={handleCategorize}
        disabled={isLoading}
        className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors text-sm flex items-center space-x-2"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
            <span>Categorizing...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>AI Categorize</span>
          </>
        )}
      </button>

      {error && (
        <div className="absolute top-full mt-2 left-0 bg-red-50 border border-red-200 rounded-md p-3 z-10 w-80 shadow-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {showSuggestion && suggestion && (
        <div className="absolute top-full mt-2 left-0 bg-white border border-slate-200 rounded-lg p-4 z-10 w-96 shadow-lg">
          <div className="mb-3">
            <h4 className="font-medium text-slate-900 mb-1">AI Suggestion</h4>
            <p className="text-sm text-slate-600">
              Categorized as <span className="font-medium">{suggestion.accountCode}</span> with {suggestion.confidence}% confidence
            </p>
          </div>
          
          {suggestion.reasoning && (
            <div className="mb-3">
              <p className="text-sm text-slate-700">{suggestion.reasoning}</p>
            </div>
          )}

          {suggestion.suggestedKeyword && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">Suggested Keyword:</p>
                  <p className="text-sm text-blue-700">"{suggestion.suggestedKeyword}"</p>
                </div>
                <button
                  onClick={handleSaveKeyword}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                This keyword will automatically categorize similar transactions in the future.
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleDismiss}
              className="px-3 py-1 bg-slate-200 text-slate-700 rounded text-sm hover:bg-slate-300 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 