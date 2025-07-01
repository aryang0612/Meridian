'use client';
import Image from 'next/image';
import Link from 'next/link';

interface NavigationBarProps {
  currentStep?: 'upload' | 'review' | 'export';
  activeSection?: 'dashboard' | 'reports' | 'settings' | 'help';
}

export default function NavigationBar({ currentStep, activeSection = 'dashboard' }: NavigationBarProps) {
  const navigationItems = [
    { label: 'Dashboard', href: '/', key: 'dashboard' },
    { label: 'Reports', href: '/reports', key: 'reports' },
    { label: 'Settings', href: '/settings', key: 'settings' },
    { label: 'Help', href: '/help', key: 'help' }
  ];

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Left: Logo and Company Info */}
          <Link href="/" className="flex items-center space-x-4 hover:opacity-80 transition-opacity">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg shadow-purple-600/20">
                <Image 
                  src="/meridian-logo-new.png" 
                  alt="Meridian" 
                  width={40} 
                  height={40} 
                  className="rounded-lg object-contain"
                  priority
                />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-300 rounded-full opacity-40"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Meridian AI</h1>
              <p className="text-xs text-slate-600 -mt-1">Bookkeeping Solutions</p>
            </div>
          </Link>

          {/* Center: Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  activeSection === item.key
                    ? 'bg-purple-100 text-purple-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right: Status and User Area */}
          <div className="flex items-center space-x-4">
            {/* CRA Compliant Badge */}
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-green-700">CRA Compliant</span>
            </div>

            {/* Notifications */}
            <button className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM10.5 3.5L7 7h3v10l4-4h-3V3.5z" />
              </svg>
              <div className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full"></div>
            </button>

            {/* User Profile */}
            <div className="flex items-center space-x-3 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">JD</span>
              </div>
              <div className="hidden lg:block">
                <p className="text-sm font-medium text-slate-900">John Doe</p>
                <p className="text-xs text-slate-500">Business Owner</p>
              </div>
              <button className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
} 