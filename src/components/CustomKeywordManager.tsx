'use client';

import React from 'react';
import { Info, Brain, Zap } from 'lucide-react';

interface CustomKeywordManagerProps {
  onClose?: () => void;
  onKeywordsUpdated?: () => void;
}

export default function CustomKeywordManager({ onClose, onKeywordsUpdated }: CustomKeywordManagerProps) {
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Enhanced AI Categorization</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  System Upgrade Complete
                </h3>
                <p className="text-slate-700 leading-relaxed">
                  We've upgraded to a <strong>unified AI categorization system</strong> that automatically learns from your transaction patterns. 
                  Custom keywords are now integrated directly into the AI engine for better accuracy and consistency.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-green-50 rounded-xl p-6 border border-green-200">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <Info className="w-4 h-4 text-white" />
                </div>
                <h4 className="font-semibold text-green-900">What's New</h4>
              </div>
              <ul className="space-y-2 text-sm text-green-800">
                <li>• 100+ trained business patterns</li>
                <li>• Automatic merchant recognition</li>
                <li>• Smart bulk categorization</li>
                <li>• Consistent cross-transaction logic</li>
              </ul>
            </div>

            <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <h4 className="font-semibold text-purple-900">How It Works</h4>
              </div>
              <ul className="space-y-2 text-sm text-purple-800">
                <li>• Upload your transactions</li>
                <li>• AI automatically categorizes</li>
                <li>• Review and approve results</li>
                <li>• System learns from your choices</li>
              </ul>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
            <h4 className="font-semibold text-slate-900 mb-3">Training Data Active</h4>
            <p className="text-slate-700 text-sm leading-relaxed">
              The system now includes comprehensive training data covering:
              <span className="font-medium"> Tim Hortons, Netflix, Federal Payments, Amazon, Shell Gas, Facebook Ads, </span>
              and many more business patterns for accurate categorization.
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClose}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              Got It, Thanks!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 