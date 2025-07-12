export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-9xl font-bold text-slate-300 mb-4">404</div>
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Page Not Found</h1>
        <p className="text-xl text-slate-600 mb-8">
          The page you're looking for doesn't exist.
        </p>
        <a
          href="/"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors"
        >
          Go Home
        </a>
      </div>
    </div>
  );
} 