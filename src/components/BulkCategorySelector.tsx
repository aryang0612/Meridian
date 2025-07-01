'use client';
import { useState, useRef, useEffect } from 'react';
import { ChartOfAccounts } from '../lib/chartOfAccounts';
import { getCategoryNames } from '../data/categories';
import { Tag, ChevronDown } from 'lucide-react';

interface BulkCategorySelectorProps {
  onCategorize: (category: string) => void;
  chartOfAccounts: ChartOfAccounts;
}

export default function BulkCategorySelector({ onCategorize, chartOfAccounts }: BulkCategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const categories = getCategoryNames();
  const popularCategories = [
    'Meals & Entertainment',
    'Motor Vehicle Expenses',
    'Office Supplies',
    'Bank Fees'
  ].filter(cat => categories.includes(cat));

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (category: string) => {
    onCategorize(category);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
      >
        <Tag className="w-4 h-4 mr-1" />
        Categorize
        <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full mt-1 w-64 bg-white border border-gray-300 rounded-md shadow-lg">
          {/* Popular Categories */}
          <div className="p-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Quick Categories
            </div>
            <div className="space-y-1">
              {popularCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleSelect(category)}
                  className="w-full px-2 py-1.5 text-left text-sm hover:bg-blue-50 rounded"
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 p-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              All Categories
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleSelect(category)}
                  className="w-full px-2 py-1.5 text-left text-sm hover:bg-blue-50 rounded"
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 