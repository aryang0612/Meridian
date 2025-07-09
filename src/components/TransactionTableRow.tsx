'use client';

import React from 'react';
import { Transaction } from '../lib/types';
import { ChartOfAccounts } from '../lib/chartOfAccounts';
import { AppIcons } from '../lib/iconSystem';

interface TransactionTableRowProps {
  transaction: Transaction;
  isSelected: boolean;
  isEditing: boolean;
  editingField: 'account' | null;
  accounts: Array<{ code: string; name: string }>;
  onSelect: (id: string, checked: boolean) => void;
  onEdit: (id: string, field: 'account' | null) => void;
  onAccountChange: (id: string, accountCode: string) => void;
  onApplyToSimilar: (transaction: Transaction, updates: Partial<Transaction>) => void;
  getAccountName: (accountCode: string) => string;
  getTaxRate: (transaction: Transaction) => number | undefined;
}

const TransactionTableRow: React.FC<TransactionTableRowProps> = ({
  transaction,
  isSelected,
  isEditing,
  editingField,
  accounts,
  onSelect,
  onEdit,
  onAccountChange,
  onApplyToSimilar,
  getAccountName,
  getTaxRate
}) => {
  // Special styling for E-Transfer and Bill Payment transactions
  const isETransfer = transaction.description.toLowerCase().includes('e-transfer') || 
                    transaction.description.toLowerCase().includes('e-tfr');
  const isBillPayment = transaction.description.toLowerCase().includes('bill payment') ||
                      transaction.description.toLowerCase().includes('bill pay');
  
  const rowClass = isBillPayment ? 'bg-green-50/40' : 'hover:bg-slate-50/50';

  const getConfidenceDisplay = (confidence: number) => {
    if (confidence >= 90) return { label: 'High', color: 'text-slate-700' };
    if (confidence >= 70) return { label: 'Medium', color: 'text-slate-500' };
    return { label: 'Low', color: 'text-slate-400' };
  };

  return (
    <tr className={`${rowClass} border-b border-slate-50 transition-all duration-200 hover:bg-slate-25`}>
      <td className="px-6 py-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(transaction.id, e.target.checked)}
          className="w-4 h-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500 focus:ring-offset-0"
        />
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
        {new Date(transaction.date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        })}
      </td>
      
      <td className="px-6 py-4 text-sm">
        <div className="flex items-center space-x-3">
          <div className="flex-1">
            <div className="font-medium text-slate-900 line-clamp-2">
              {transaction.description}
            </div>
            {transaction.merchant && (
              <div className="text-xs text-slate-500 mt-1">
                {transaction.merchant}
              </div>
            )}
          </div>
          {(isETransfer || isBillPayment) && (
            <div className="flex-shrink-0">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                isETransfer ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
              }`}>
                {isETransfer ? 'E-Transfer' : 'Bill Payment'}
              </span>
            </div>
          )}
        </div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <div className={`font-medium ${
          transaction.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'
        }`}>
          {transaction.amount >= 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
        </div>
      </td>
      
      <td className="px-6 py-4 text-sm">
        {isEditing && editingField === 'account' ? (
          <select
            autoFocus
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
            value={transaction.accountCode || ''}
            onChange={e => onAccountChange(transaction.id, e.target.value)}
            onBlur={() => onEdit(transaction.id, null)}
          >
            <option value="">Select account...</option>
            {accounts.map(account => (
              <option key={account.code} value={account.code}>
                {account.code} - {account.name}
              </option>
            ))}
          </select>
        ) : !transaction.accountCode ? (
          (isETransfer || transaction.description.toLowerCase().includes('cheque')) ? (
            <button
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
              onClick={() => onEdit(transaction.id, 'account')}
            >
              <AppIcons.status.warning className="w-3 h-3 mr-1" />
              Manual Entry
            </button>
          ) : (
            <button
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors"
              onClick={() => onEdit(transaction.id, 'account')}
            >
              Uncategorized
            </button>
          )
        ) : (
          <div className="flex items-center space-x-2">
            <div className="flex flex-col">
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                {getAccountName(transaction.accountCode)}
              </span>
              <span className="text-xs text-slate-400 mt-1">
                Code: {transaction.accountCode}
              </span>
            </div>
            <button
              onClick={() => onEdit(transaction.id, 'account')}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              title="Edit account"
            >
              <AppIcons.actions.edit className="w-3 h-3" />
            </button>
          </div>
        )}
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        {(() => {
          const taxRate = getTaxRate(transaction);
          return (
            <span className="text-xs text-slate-500">
              {taxRate !== undefined ? `${taxRate}%` : '—'}
            </span>
          );
        })()}
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        {transaction.confidence !== undefined && 
         transaction.accountCode && 
         transaction.accountCode !== '' && 
         transaction.accountCode !== 'uncategorized' &&
         getAccountName(transaction.accountCode) !== 'Uncategorized' && (
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              transaction.confidence >= 90 ? 'bg-green-400' :
              transaction.confidence >= 70 ? 'bg-yellow-400' : 'bg-red-400'
            }`}></div>
            <span className={getConfidenceDisplay(transaction.confidence).color}>
              {getConfidenceDisplay(transaction.confidence).label}
            </span>
          </div>
        )}
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <div className="flex items-center space-x-2">
          {transaction.isApproved ? (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <AppIcons.status.approved className="w-3 h-3 mr-1" />
              Approved
            </span>
          ) : (
            <button
              onClick={() => onApplyToSimilar(transaction, { isApproved: true })}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <AppIcons.status.pending className="w-3 h-3 mr-1" />
              Pending
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

export default TransactionTableRow; 