'use client';
import React from 'react';
import { Transaction, ValidationResult } from '../lib/types';
import { BankFormat } from '../data/bankFormats';
import { CheckCircle, AlertTriangle, TrendingUp, FileText, Calendar, DollarSign } from 'lucide-react';

interface ProcessingResultsProps {
  transactions: Transaction[];
  validation: ValidationResult;
  bankFormat: BankFormat | 'Unknown';
  stats: {
    total: number;
    categorized: number;
    highConfidence: number;
    needsReview: number;
    categorizedPercent: number;
    highConfidencePercent: number;
    needsReviewPercent: number;
    // Multi-file support
    totalFiles?: number;
    fileBreakdown?: Array<{
      fileName: string;
      transactions: number;
      [key: string]: any;
    }>;
  };
}

export default function ProcessingResults({ 
  transactions, 
  validation, 
  bankFormat, 
  stats 
}: ProcessingResultsProps) {
  // Debug: Log the stats to see what's being passed
  console.log('📊 ProcessingResults - Stats received:', stats);
  console.log('📊 ProcessingResults - Categorized percent:', stats.categorizedPercent);
  console.log('📊 ProcessingResults - High confidence percent:', stats.highConfidencePercent);
  console.log('📊 ProcessingResults - Needs review percent:', stats.needsReviewPercent);
  
  // Calculate date range
  const dates = transactions.map(t => new Date(t.date)).sort((a, b) => a.getTime() - b.getTime());
  const startDate = dates[0]?.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
  const endDate = dates[dates.length - 1]?.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });

  // Calculate total amounts
  const totalExpenses = transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  const totalIncome = transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl p-8 border border-purple-100/50 shadow-lg shadow-purple-500/5">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25">
            <CheckCircle className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">
              Processing Complete
          </h3>
            <p className="text-purple-700 mt-1 leading-relaxed font-medium">
              {stats.totalFiles && stats.totalFiles > 1 
                ? `Your ${stats.totalFiles} bank statements have been successfully processed and combined into one table.`
                : 'Your bank statement has been successfully processed and categorized using intelligent pattern matching.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Total Transactions */}
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg shadow-slate-500/5 hover:shadow-xl hover:shadow-purple-500/10 hover:border-purple-200 transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="text-center">
            <span className="text-xs font-bold text-purple-600 uppercase tracking-wide block mb-2">Total Transactions</span>
            <p className="text-3xl font-bold text-slate-900 mb-2">{stats.total}</p>
            <p className="text-sm text-slate-500 font-medium">
            {bankFormat !== 'Unknown' ? `${bankFormat} format` : 'Unknown format'}
          </p>
          </div>
        </div>

        {/* Date Range */}
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg shadow-slate-500/5 hover:shadow-xl hover:shadow-purple-500/10 hover:border-purple-200 transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="text-center">
            <span className="text-xs font-bold text-purple-600 uppercase tracking-wide block mb-2">Date Range</span>
            <p className="text-lg font-bold text-slate-900 leading-tight">
              {startDate}
            </p>
            <p className="text-lg font-bold text-slate-900 leading-tight mb-2">
              {endDate}
          </p>
            <p className="text-sm text-slate-500 font-medium">
            {Math.ceil((dates[dates.length - 1]?.getTime() - dates[0]?.getTime()) / (1000 * 60 * 60 * 24))} days
          </p>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg shadow-slate-500/5 hover:shadow-xl hover:shadow-purple-500/10 hover:border-purple-200 transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="text-center">
            <span className="text-xs font-bold text-red-600 uppercase tracking-wide block mb-2">Total Expenses</span>
            <p className="text-xl font-bold text-slate-900 leading-tight mb-2">
            ${totalExpenses.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
          </p>
            <p className="text-sm text-slate-500 font-medium">
            {transactions.filter(t => t.amount < 0).length} transactions
          </p>
          </div>
        </div>

        {/* Total Income */}
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg shadow-slate-500/5 hover:shadow-xl hover:shadow-purple-500/10 hover:border-purple-200 transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="text-center">
            <span className="text-xs font-bold text-green-600 uppercase tracking-wide block mb-2">Total Income</span>
            <p className="text-xl font-bold text-slate-900 leading-tight mb-2">
            ${totalIncome.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
          </p>
            <p className="text-sm text-slate-500 font-medium">
            {transactions.filter(t => t.amount > 0).length} transactions
          </p>
          </div>
        </div>
      </div>

      {/* File Breakdown (for multiple files) */}
      {stats.totalFiles && stats.totalFiles > 1 && stats.fileBreakdown && (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg shadow-slate-500/5">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <span className="text-white text-xl">📁</span>
            </div>
            <h4 className="text-xl font-bold text-slate-900">
              File Breakdown
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.fileBreakdown.map((file, index) => (
              <div key={index} className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 text-sm font-bold">
                      {file.fileName.split('.').pop()?.toUpperCase() || 'FILE'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate" title={file.fileName}>
                      {file.fileName}
                    </div>
                    <div className="text-sm text-slate-500">
                      {file.transactions} transactions
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categorization Results */}
      <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-lg shadow-slate-500/5">
        <div className="flex items-center space-x-4 mb-12">
          <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25">
            <span className="text-white text-2xl">📊</span>
          </div>
          <h4 className="text-2xl font-bold text-slate-900">
            Categorization Results
        </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
          {/* Categorized */}
          <div className="text-center">
            <div className="relative inline-flex">
              <div className="w-28 h-28 bg-gradient-to-br from-purple-100 to-purple-200 rounded-3xl flex items-center justify-center shadow-lg shadow-purple-500/10 border border-purple-200">
                <span className="text-4xl font-bold text-purple-700">{stats.categorizedPercent || 0}%</span>
              </div>
            </div>
            <h5 className="font-bold text-slate-900 mt-6 text-lg">Categorized</h5>
            <p className="text-purple-600 leading-relaxed font-medium">
              {stats.categorized || 0} of {stats.total || 0} transactions
            </p>
          </div>

          {/* High Confidence */}
          <div className="text-center">
            <div className="relative inline-flex">
              <div className="w-28 h-28 bg-gradient-to-br from-green-100 to-green-200 rounded-3xl flex items-center justify-center shadow-lg shadow-green-500/10 border border-green-200">
                <span className="text-4xl font-bold text-green-700">{stats.highConfidencePercent || 0}%</span>
              </div>
            </div>
            <h5 className="font-bold text-slate-900 mt-6 text-lg">High Confidence</h5>
            <p className="text-green-600 leading-relaxed font-medium">
              {stats.highConfidence || 0} transactions (80%+ confidence)
            </p>
          </div>

          {/* Needs Review */}
          <div className="text-center">
            <div className="relative inline-flex">
              <div className="w-28 h-28 bg-gradient-to-br from-amber-100 to-amber-200 rounded-3xl flex items-center justify-center shadow-lg shadow-amber-500/10 border border-amber-200">
                <span className="text-4xl font-bold text-amber-700">{stats.needsReviewPercent || 0}%</span>
              </div>
            </div>
            <h5 className="font-bold text-slate-900 mt-6 text-lg">Needs Review</h5>
            <p className="text-amber-600 leading-relaxed font-medium">
              {stats.needsReview || 0} transactions require attention
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-16">
          <div className="flex justify-between text-purple-700 mb-6">
            <span className="font-bold text-lg">Categorization Progress</span>
            <span className="font-bold text-lg">{stats.categorizedPercent || 0}% complete</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-4 shadow-inner">
            <div className="flex h-4 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-600 to-purple-700 transition-all duration-500 ease-out"
                style={{ width: `${stats.highConfidencePercent || 0}%` }}
                title="High confidence categorizations"
              />
              <div 
                className="bg-gradient-to-r from-purple-400 to-purple-500 transition-all duration-500 ease-out"
                style={{ width: `${Math.max(0, (stats.categorizedPercent || 0) - (stats.highConfidencePercent || 0))}%` }}
                title="Medium confidence categorizations"
              />
            </div>
          </div>
          <div className="flex justify-between text-sm text-slate-600 mt-4 font-medium">
            <span>High Confidence</span>
            <span>Needs Review</span>
          </div>
        </div>
      </div>

      {/* Validation Warnings */}
      {validation.warnings.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-2xl p-8 border border-amber-200/50 shadow-lg shadow-amber-500/5">
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/25">
              <AlertTriangle className="w-7 h-7 text-white" />
            </div>
            <div>
              <h4 className="text-2xl font-bold text-slate-900">
              Data Quality Warnings
            </h4>
              <p className="text-amber-700 leading-relaxed font-medium">Please review these items before proceeding</p>
            </div>
          </div>
          <ul className="text-slate-700 space-y-4">
            {validation.warnings.map((warning, index) => (
              <li key={index} className="flex items-start space-x-4 p-4 bg-white/50 rounded-xl border border-amber-200/30">
                <span className="text-amber-600 font-bold mt-1 text-lg">•</span>
                <span className="leading-relaxed font-medium">{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next Steps */}
      <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-10 border border-slate-200 shadow-lg shadow-slate-500/5">
        <h4 className="text-2xl font-bold text-slate-900 mb-8 flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center mr-4 shadow-lg shadow-purple-500/25">
            <span className="text-white font-bold">→</span>
          </div>
          Next Steps
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex items-start space-x-6 p-6 bg-white rounded-2xl border border-purple-100 shadow-lg shadow-purple-500/5 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/25">
              <span className="text-white font-bold text-lg">1</span>
            </div>
            <div>
              <p className="font-bold text-slate-900 text-lg mb-2">Review & Approve</p>
              <p className="text-slate-600 leading-relaxed">Check categorizations and assign account codes</p>
            </div>
          </div>
          <div className="flex items-start space-x-6 p-6 bg-white rounded-2xl border border-purple-100 shadow-lg shadow-purple-500/5 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/25">
              <span className="text-white font-bold text-lg">2</span>
            </div>
            <div>
              <p className="font-bold text-slate-900 text-lg mb-2">Export & Import</p>
              <p className="text-slate-600 leading-relaxed">Download for your accounting software</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 