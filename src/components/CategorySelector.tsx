'use client';
import { useState, useRef, useEffect } from 'react';
import { ChartOfAccounts } from '../lib/chartOfAccounts';
import { getCategoryNames } from '../data/categories';
import { Search, Check, ChevronDown } from 'lucide-react';

interface CategorySelectorProps {
  value: string;
  onChange: (category: string) => void;
  chartOfAccounts: ChartOfAccounts;
  placeholder?: string;
}

export default function CategorySelector({ 
  value, 
  onChange, 
  chartOfAccounts,
  placeholder = "Select category..."
}: CategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Get all accounts from Chart of Accounts, grouped by type
  const allAccounts = chartOfAccounts.getAllAccounts();
  const groupedAccounts: Record<string, typeof allAccounts> = {};
  allAccounts.forEach(account => {
    if (!groupedAccounts[account.type]) groupedAccounts[account.type] = [];
    groupedAccounts[account.type].push(account);
  });

  // Flattened list for search
  const allAccountNames = allAccounts.map(acc => acc.name);
  const filteredAccounts = searchQuery
    ? allAccounts.filter(acc => acc.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : allAccounts;

  // Handle selection
  const handleSelect = (accountName: string) => {
    onChange(accountName);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus search input when opened
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 hover:bg-purple-50/50 hover:border-purple-300 transition-all duration-300 shadow-sm hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <span className={value ? 'text-gray-900 font-medium' : 'text-gray-500'}>
            {value || placeholder}
          </span>
          <ChevronDown className={`w-5 h-5 text-purple-400 transition-all duration-300 ${isOpen ? 'rotate-180 text-purple-600' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-purple-200 rounded-xl shadow-xl max-h-80 overflow-hidden animate-in slide-in-from-top-2 duration-200">
          {/* Search Header */}
          <div className="p-4 border-b border-purple-100 bg-purple-50/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/80 backdrop-blur-sm text-black transition-all duration-300 placeholder-purple-400"
              />
            </div>
          </div>

          {/* Categories List */}
          <div className="max-h-64 overflow-y-auto">
            {/* Clear Selection */}
            {value && (
              <button
                onClick={() => handleSelect('')}
                className="w-full px-4 py-3 text-left hover:bg-purple-50 flex items-center justify-between border-b border-purple-100/50 transition-colors duration-300"
              >
                <span className="text-gray-500 italic">Clear selection</span>
                <span className="text-red-500 text-lg font-medium hover:text-red-600 transition-colors duration-300">×</span>
              </button>
            )}

            {/* Grouped by Account Type */}
            {Object.entries(groupedAccounts).map(([type, accounts]) => (
              <div key={type}>
                <div className="px-4 py-3 text-xs font-semibold text-purple-600 uppercase tracking-wider bg-purple-50/30">
                  {type}
                </div>
                {accounts
                  .filter(acc => !searchQuery || acc.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(acc => (
                    <CategoryOption
                      key={acc.code}
                      category={acc.name}
                      isSelected={value === acc.name}
                      onClick={() => handleSelect(acc.name)}
                    />
                  ))}
              </div>
            ))}
            {/* No results */}
            {filteredAccounts.length === 0 && (
              <div className="px-4 py-6 text-sm text-gray-500 text-center">
                <div className="text-purple-300 text-2xl mb-2">🔍</div>
                No categories found matching &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Category Option Component
interface CategoryOptionProps {
  category: string;
  isSelected: boolean;
  onClick: () => void;
}

function CategoryOption({ category, isSelected, onClick }: CategoryOptionProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3 text-left hover:bg-purple-50 flex items-center justify-between transition-all duration-300 hover:pl-6 ${
        isSelected ? 'bg-purple-100 text-purple-900 border-l-4 border-purple-500 pl-4' : 'text-gray-900 hover:text-purple-900'
      }`}
    >
      <div className="flex items-center space-x-3">
        <span className="font-medium">{category}</span>
      </div>
      {isSelected && <Check className="w-5 h-5 text-purple-600" />}
    </button>
  );
} 