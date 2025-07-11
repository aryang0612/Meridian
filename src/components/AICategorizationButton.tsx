'use client';

import React, { useState, useEffect } from 'react';
import { Transaction } from '../lib/types';
import { aiCategorizationService, AICategorizationResult } from '../lib/aiCategorizationService';

interface Props {
  transaction: Transaction;
  onCategorize: (accountCode: string, confidence: number) => void;
  province: string;
  disabled?: boolean;
  onKeywordAdded?: (keyword: string, accountCode: string) => void;
}

export default function AICategorizationButton({ 
  transaction, 
  onCategorize, 
  province, 
  disabled = false,
  onKeywordAdded
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showKeywordPrompt, setShowKeywordPrompt] = useState(false);
  const [result, setResult] = useState<AICategorizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize the AI service
    const checkAndInitializeService = async () => {
      try {
        // Ensure the service exists and has the methods we need
        if (!aiCategorizationService || typeof aiCategorizationService.isAvailable !== 'function') {
          console.warn('AI categorization service not available yet');
          return;
        }

        // Initialize the service if not already initialized
        if (!aiCategorizationService.isAvailable()) {
          await aiCategorizationService.initialize();
        }
        
        setIsAvailable(aiCategorizationService.isAvailable());
      } catch (error) {
        console.error('Failed to initialize AI categorization service:', error);
        setIsAvailable(false);
      }
    };

    checkAndInitializeService();
  }, []);

  const performAICategorization = async (retryCount = 0) => {
    if (disabled || isLoading || !isAvailable) return;

    // Double-check the service is ready
    if (!aiCategorizationService || typeof aiCategorizationService.forceAICategorization !== 'function') {
      console.error('AI categorization service not available');
      setError('AI categorization service not available');
      setShowResult(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setShowResult(false);
    setShowKeywordPrompt(false);

    try {
      console.log('🤖 AI button clicked - calling ChatGPT directly...');
      
      // Call ChatGPT API directly with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch('/api/ai-categorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction,
          province,
          forceAI: true,
          clearCache: true // Always get fresh results
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const aiResult = await response.json();
      console.log('🎯 ChatGPT API response:', aiResult);

      if (aiResult && aiResult.accountCode) {
        setResult({
          accountCode: aiResult.accountCode,
          confidence: aiResult.confidence || 75,
          reasoning: aiResult.reasoning || 'AI categorization',
          suggestedKeyword: aiResult.suggestedKeyword,
          source: 'chatgpt'
        });
        
        // Always show popup for manual review
        console.log('✅ Showing AI result popup');
        setShowResult(true);
      } else {
        console.error('Invalid AI response:', aiResult);
        setError('AI categorization failed. Please try again.');
        setShowResult(true);
      }
    } catch (err) {
      console.error('AI categorization error:', err);
      
      // Retry logic for transient network errors
      if (retryCount < 2 && err instanceof Error && 
          (err.message.includes('Failed to fetch') || err.name === 'AbortError')) {
        console.log(`🔄 Retrying request (attempt ${retryCount + 1}/2)...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        return performAICategorization(retryCount + 1);
      }
      
      // Provide more specific error messages
      let errorMessage = 'Failed to categorize transaction. Please try manually.';
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = 'Request timed out. Please try again.';
        } else if (err.message.includes('Failed to fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (err.message.includes('HTTP error')) {
          errorMessage = 'Server error. Please try again in a moment.';
        }
      }
      
      setError(errorMessage);
      setShowResult(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAICategorize = () => {
    performAICategorization();
  };

  const handleApplyResult = () => {
    if (result) {
      console.log('🎯 Applying AI categorization:', {
        accountCode: result.accountCode,
        confidence: result.confidence,
        transactionId: transaction.id,
        description: transaction.description
      });
      
      onCategorize(result.accountCode, result.confidence);
      setShowResult(false);
      
      // Show keyword prompt if a keyword was suggested
      if (result.suggestedKeyword) {
        console.log('💡 Showing keyword prompt for:', result.suggestedKeyword);
        setShowKeywordPrompt(true);
      } else {
        console.log('✅ No keyword suggested, clearing states');
        // Clear all states if no keyword
        setResult(null);
        setError(null);
      }
    }
  };

  const handleAddKeyword = async () => {
    if (result && result.suggestedKeyword) {
      try {
        // Note: We could add this to the unified pattern engine in the future
        console.log('💡 Suggested keyword:', result.suggestedKeyword, 'for account:', result.accountCode);
        
        // Clear all states immediately
        setShowKeywordPrompt(false);
        setShowResult(false);
        setResult(null);
        setError(null);
        
        // Notify parent component
        if (onKeywordAdded) {
          onKeywordAdded(result.suggestedKeyword, result.accountCode);
        }
      } catch (error) {
        console.error('Failed to add keyword:', error);
      }
    }
  };

  const handleSkipKeyword = () => {
    // Clear all states immediately
    setShowKeywordPrompt(false);
    setShowResult(false);
    setResult(null);
    setError(null);
  };

  const handleDismiss = () => {
    // Clear all states immediately
    setShowResult(false);
    setShowKeywordPrompt(false);
    setResult(null);
    setError(null);
  };

  // Don't show button if AI is not available
  if (!isAvailable) {
    return null;
  }

  return (
    <div className="relative">
      {/* AI Categorization Button */}
      <button
        onClick={handleAICategorize}
        disabled={disabled || isLoading}
        className={`p-1.5 rounded-lg transition-all duration-200 ${
          isLoading
            ? 'bg-blue-100 text-blue-600 cursor-not-allowed'
            : disabled
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
            : 'bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700'
        }`}
        title="Use AI to categorize this transaction"
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        )}
      </button>

      {/* AI Reasoning Popup */}
      {showResult && result && (
        <div className="absolute top-8 right-0 z-50 w-[420px] bg-white border border-slate-200 rounded-lg shadow-lg p-4">
          {/* Validation Correction Notice */}
          {result.source === 'chatgpt-corrected' && (
            <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800">
                <span className="text-sm">⚠️</span>
                <span className="text-xs font-medium">Auto-Corrected</span>
              </div>
              <p className="text-xs text-amber-700 mt-1">
                The AI suggested an illogical categorization and was automatically corrected for accuracy.
              </p>
            </div>
          )}
          
          <div className="flex items-start justify-between mb-3">
            <h4 className="font-semibold text-slate-900">AI Categorization</h4>
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Account:</span>
              <span className="font-medium text-slate-900">{result.accountCode}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Confidence:</span>
              <span className={`font-medium ${
                result.confidence >= 80 ? 'text-green-600' :
                result.confidence >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {result.confidence}%
              </span>
            </div>
            
            <div className="text-sm text-slate-700 mt-3 p-3 bg-slate-50 rounded-lg">
              <div className="font-medium text-slate-800 mb-1">AI Reasoning:</div>
              <div className="text-slate-600 leading-relaxed text-xs max-h-24 overflow-y-auto">
                {result.reasoning}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleApplyResult}
              className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              Apply Categorization
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2 text-slate-600 text-sm rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Keyword Suggestion Popup - Simple positioned popup instead of modal */}
      {showKeywordPrompt && result && result.suggestedKeyword && (
        <div className="absolute top-8 right-0 z-[9999] w-[380px] bg-white border border-blue-200 rounded-lg shadow-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <h4 className="font-semibold text-blue-900 flex items-center gap-2">
              <span className="text-lg">💡</span>
              Add Custom Keyword?
            </h4>
            <button
              onClick={handleSkipKeyword}
              className="text-slate-400 hover:text-slate-600 text-xl leading-none"
            >
              ×
            </button>
          </div>
          
          <div className="mb-4">
            <p className="text-slate-600 text-sm mb-2">
              Add <span className="font-medium text-blue-600">&quot;{result.suggestedKeyword}&quot;</span> as a keyword?
            </p>
            <p className="text-xs text-slate-500">
              Future transactions from this merchant will be automatically categorized as &quot;{result.accountCode}&quot;.
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleAddKeyword}
              className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Add Keyword
            </button>
            <button
              onClick={handleSkipKeyword}
              className="flex-1 px-3 py-2 text-slate-600 border border-slate-300 text-sm rounded-lg hover:bg-slate-50 transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Error Popup */}
      {showResult && error && (
        <div className="absolute top-8 right-0 z-50 w-80 bg-white border border-red-200 rounded-lg shadow-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <h4 className="font-semibold text-red-900">AI Categorization Error</h4>
            <button
              onClick={handleDismiss}
              className="text-red-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
          
          <p className="text-sm text-red-700 mb-4">{error}</p>
          
          <button
            onClick={handleDismiss}
            className="w-full px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
} 