'use client';

import React from 'react';

interface TransactionTableHeaderProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: (checked: boolean) => void;
  onSort: (field: SortField) => void;
  sortField: SortField;
  sortDirection: 'asc' | 'desc';
}

type SortField = 'date' | 'description' | 'amount' | 'account' | 'confidence';

const TransactionTableHeader: React.FC<TransactionTableHeaderProps> = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onSort,
  sortField,
  sortDirection
}) => {
  const SortArrow = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <span className="inline-block w-3 h-3 ml-1 text-slate-300 hover:text-slate-400 transition-colors">
          ↕
        </span>
      );
    }
    return (
      <span className={`inline-block w-3 h-3 ml-1 transition-colors ${
        sortDirection === 'asc' ? 'text-purple-600' : 'text-purple-600'
      }`}>
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => onSort(field)}
      className="flex items-center text-left hover:text-purple-600 transition-colors"
    >
      {children}
      <SortArrow field={field} />
    </button>
  );

  return (
    <thead className="bg-gradient-to-r from-slate-25 to-slate-50">
      <tr>
        <th className="w-12 px-6 py-5 text-left">
          <input
            type="checkbox"
            checked={selectedCount === totalCount && totalCount > 0}
            onChange={(e) => onSelectAll(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500 focus:ring-offset-0"
          />
        </th>
        <th className="w-24 px-6 py-5 text-left text-xs font-medium text-slate-600 tracking-wide">
          <SortableHeader field="date">Date</SortableHeader>
        </th>
        <th className="w-80 px-6 py-5 text-left text-xs font-medium text-slate-600 tracking-wide">
          <SortableHeader field="description">Description</SortableHeader>
        </th>
        <th className="w-32 px-6 py-5 text-left text-xs font-medium text-slate-600 tracking-wide">
          <SortableHeader field="amount">
            <div className="flex items-center space-x-2">
              <span>Amount</span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <div className="w-2 h-2 rounded-full bg-rose-500"></div>
              </div>
            </div>
          </SortableHeader>
        </th>
        <th className="w-48 px-6 py-5 text-left text-xs font-medium text-slate-600 tracking-wide">
          <SortableHeader field="account">Account</SortableHeader>
        </th>
        <th className="w-20 px-6 py-5 text-left text-xs font-medium text-slate-600 tracking-wide">
          Tax Rate
        </th>
        <th className="w-24 px-6 py-5 text-left text-xs font-medium text-slate-600 tracking-wide">
          <SortableHeader field="confidence">Confidence</SortableHeader>
        </th>
        <th className="w-28 px-6 py-5 text-left text-xs font-medium text-slate-600 tracking-wide">
          Status
        </th>
      </tr>
    </thead>
  );
};

export default TransactionTableHeader; 