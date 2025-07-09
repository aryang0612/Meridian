'use client';

import React, { useState } from 'react';
import { AlertTriangle, X, Eye, EyeOff } from 'lucide-react';
import { DuplicateDetectionResult, DuplicateGroup } from '../lib/duplicateDetector';
import { Transaction } from '../lib/types';
import { formatCurrency } from '../lib/formatUtils';

interface DuplicateWarningProps {
  duplicateResult: DuplicateDetectionResult;
  onResolveDuplicates: (cleanTransactions: Transaction[]) => void;
  onDismiss: () => void;
}

const DuplicateWarning: React.FC<DuplicateWarningProps> = ({
  duplicateResult,
  onResolveDuplicates,
  onDismiss
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [showDetails, setShowDetails] = useState(false);

  if (duplicateResult.duplicateCount === 0) {
    return null;
  }

  const toggleGroupExpansion = (groupIndex: number) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupIndex)) {
      newExpanded.delete(groupIndex);
    } else {
      newExpanded.add(groupIndex);
    }
    setExpandedGroups(newExpanded);
  };

  const handleRemoveDuplicates = () => {
    onResolveDuplicates(duplicateResult.cleanTransactions);
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-amber-800">
              Duplicate Transactions Detected
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              Found {duplicateResult.duplicateCount} duplicate transaction{duplicateResult.duplicateCount > 1 ? 's' : ''} 
              {' '}in {duplicateResult.duplicateGroups.length} group{duplicateResult.duplicateGroups.length > 1 ? 's' : ''}.
              {' '}Review and remove duplicates before processing.
            </p>
            
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="inline-flex items-center px-3 py-1 text-xs font-medium text-amber-800 bg-amber-100 rounded-md hover:bg-amber-200 transition-colors"
              >
                {showDetails ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                {showDetails ? 'Hide Details' : 'Show Details'}
              </button>
              
              <button
                onClick={handleRemoveDuplicates}
                className="inline-flex items-center px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                Remove Duplicates
              </button>
            </div>
          </div>
        </div>
        
        <button
          onClick={onDismiss}
          className="text-amber-400 hover:text-amber-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {showDetails && (
        <div className="mt-4 border-t border-amber-200 pt-4">
          <div className="space-y-3">
            {duplicateResult.duplicateGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="bg-white rounded-md border border-amber-200">
                <button
                  onClick={() => toggleGroupExpansion(groupIndex)}
                  className="w-full px-3 py-2 text-left text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors flex items-center justify-between"
                >
                  <span>
                    Duplicate Group {groupIndex + 1} ({group.duplicateIndexes.length + 1} transactions)
                  </span>
                  <span className="text-gray-400">
                    {expandedGroups.has(groupIndex) ? '−' : '+'}
                  </span>
                </button>
                
                {expandedGroups.has(groupIndex) && (
                  <div className="px-3 pb-3 border-t border-gray-200">
                    <div className="space-y-2 mt-2">
                      {/* Original transaction */}
                      <div className="p-2 bg-green-50 border border-green-200 rounded text-xs">
                        <div className="font-medium text-green-800 mb-1">✓ Original (will be kept)</div>
                        <div className="text-gray-700">
                          <div><strong>Date:</strong> {new Date(group.transaction.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}</div>
                          <div><strong>Amount:</strong> {formatCurrency(group.transaction.amount)}</div>
                          <div><strong>Description:</strong> {group.transaction.description}</div>
                        </div>
                      </div>
                      
                      {/* Duplicate transactions */}
                      {group.duplicateIndexes.map((dupIndex, idx) => {
                        // Note: In a real implementation, you'd need access to the original transactions array
                        // For now, we'll show placeholder data
                        return (
                          <div key={idx} className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                            <div className="font-medium text-red-800 mb-1">✗ Duplicate {idx + 1} (will be removed)</div>
                            <div className="text-gray-700">
                              <div><strong>Index:</strong> {dupIndex}</div>
                              <div className="text-red-600">Similar to original transaction</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DuplicateWarning; 