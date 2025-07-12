'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Error page:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-9xl font-bold text-slate-300 mb-4">⚠️</div>
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Something went wrong</h1>
        <p className="text-xl text-slate-600 mb-8">
          An unexpected error occurred. Please try again.
        </p>
        <div className="space-x-4">
          <button
            onClick={reset}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors"
          >
            Try Again
          </button>
          <a
            href="/"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-slate-600 hover:bg-slate-700 transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
} 