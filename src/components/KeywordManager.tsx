'use client';
import React from 'react';

interface KeywordManagerProps {
  onClose?: () => void;
}

export default function KeywordManager({ onClose }: KeywordManagerProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">System Upgrade Notice</h2>
            <p className="text-slate-600 mt-1">Keyword management has been enhanced</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-2xl font-light"
            >
              ×
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900">Unified AI Categorization System</h3>
            </div>
            
            <div className="space-y-4 text-slate-700">
              <p>
                The keyword management system has been upgraded to a more powerful unified AI categorization engine that:
              </p>
              
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Learns from your data:</strong> Automatically improves based on your transaction history</li>
                <li><strong>Handles complex patterns:</strong> Recognizes merchant variations and transaction types</li>
                <li><strong>Maintains consistency:</strong> Ensures similar transactions are categorized the same way</li>
                <li><strong>Provides intelligent suggestions:</strong> Offers categorization options with confidence levels</li>
              </ul>
              
              <div className="bg-white p-4 rounded-lg border border-blue-200 mt-4">
                <h4 className="font-medium text-slate-900 mb-2">How it works now:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Upload your CSV file as usual</li>
                  <li>Use the AI categorization button for instant suggestions</li>
                  <li>Review and approve the AI's recommendations</li>
                  <li>The system learns and improves over time</li>
                </ol>
              </div>
              
              <p className="text-sm text-slate-600 mt-4">
                Your previous keyword patterns have been preserved and integrated into the new system for seamless operation.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 