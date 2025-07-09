'use client';

import React from 'react';
import { AppIcons } from '../lib/iconSystem';

interface TransactionBulkActionsProps {
  selectedCount: number;
  highConfidenceCount: number;
  onClearSelection: () => void;
  onBulkApprove: () => void;
  onBulkMarkReviewed: () => void;
  onBulkCategorize: () => void;
  onAcceptAllHighConfidence: () => void;
}

const TransactionBulkActions: React.FC<TransactionBulkActionsProps> = ({
  selectedCount,
  highConfidenceCount,
  onClearSelection,
  onBulkApprove,
  onBulkMarkReviewed,
  onBulkCategorize,
  onAcceptAllHighConfidence
}) => {
  return (
    <div className="bg-white rounded-xl p-6 mb-6 border-l-4 border-purple-500 shadow-lg shadow-purple-500/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <AppIcons.actions.ai className="w-5 h-5" />
          <div>
            <span className="text-sm font-medium text-slate-900">
              {selectedCount} transactions selected
            </span>
            <div className="text-xs text-slate-500">
              Bulk operations will apply to all selected transactions
            </div>
          </div>
        </div>
        <button
          onClick={onClearSelection}
          className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs hover:bg-slate-200 transition-colors"
        >
          Clear Selection
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Smart Selection
          </label>
          <div className="space-y-2">
            <button className="w-full px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100 transition-colors">
              Select Uncategorized
            </button>
            <button className="w-full px-3 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm hover:bg-amber-100 transition-colors">
              Select Low Confidence
            </button>
          </div>
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Categorization
          </label>
          <div className="space-y-2">
            <button
              onClick={onBulkCategorize}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 hover:scale-105 transition-all duration-300 font-medium shadow-lg shadow-indigo-500/25"
            >
              <AppIcons.actions.ai className="w-4 h-4 mr-1" />
              Bulk Categorize
            </button>
          </div>
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Actions
          </label>
          <div className="space-y-2">
            {highConfidenceCount > 0 && (
              <button
                onClick={onAcceptAllHighConfidence}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 hover:scale-105 transition-all duration-300 font-medium shadow-lg shadow-green-500/25"
              >
                <AppIcons.status.approved className="w-4 h-4 mr-1" />
                Accept All High Confidence ({highConfidenceCount})
              </button>
            )}
            <button
              onClick={onBulkApprove}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 hover:scale-105 transition-all duration-300 font-medium shadow-lg shadow-purple-500/25"
            >
              <AppIcons.status.approved className="w-4 h-4 mr-1" />
              Approve All Selected
            </button>
            <button
              onClick={onBulkMarkReviewed}
              className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg text-sm hover:bg-slate-700 hover:scale-105 transition-all duration-300 font-medium shadow-lg shadow-slate-500/25"
            >
              <AppIcons.actions.edit className="w-4 h-4 mr-1" />
              Mark as Manually Reviewed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionBulkActions; 