'use client';
import Image from 'next/image';
import Link from 'next/link';
import { AppIcons, IconSizes, IconColors } from '../lib/iconSystem';

interface NavigationBarProps {
  currentStep?: 'upload' | 'review' | 'export';
  activeSection?: 'dashboard' | 'reports' | 'settings' | 'help';
  onNewFile?: () => void;
  showNewFileButton?: boolean;
}

export default function NavigationBar({ 
  currentStep, 
  activeSection = 'dashboard',
  onNewFile,
  showNewFileButton = false
}: NavigationBarProps) {
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
          <div className="flex items-center space-x-4 flex-shrink-0">
            <Link href="/" className="flex items-center space-x-4 hover:opacity-90 transition-all duration-300 group">
              <div className="relative">
                <div className="w-12 h-12 bg-white rounded-xl shadow-lg border border-slate-200/60 flex items-center justify-center group-hover:shadow-xl transition-all duration-300">
                  <Image 
                    src="/meridian-logo-new.png" 
                    alt="Meridian AI" 
                    width={32} 
                    height={32} 
                    className="object-contain"
                    priority
                  />
                </div>
              </div>
              <div className="group-hover:transform group-hover:translate-x-0.5 transition-transform duration-300">
                <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Meridian AI</h1>
                <p className="text-sm text-slate-600 font-medium -mt-0.5">Bookkeeping Solutions</p>
              </div>
            </Link>
          </div>

          {/* Center: Navigation Links - Properly Centered */}
          <nav className="hidden md:flex items-center justify-center space-x-1 flex-1">
            {navigationItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
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
          <div className="flex items-center space-x-3 flex-shrink-0">
            {/* New File Button */}
            {showNewFileButton && onNewFile && (
              <button
                onClick={onNewFile}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-medium hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transform hover:scale-105 whitespace-nowrap"
              >
                <AppIcons.actions.add className={IconSizes.sm} />
                <span className="hidden sm:inline">New File</span>
                <span className="sm:hidden">+</span>
              </button>
            )}

            {/* CRA Compliant Badge */}
            <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-green-700 whitespace-nowrap">CRA Compliant</span>
            </div>

            {/* Notifications */}
            <button className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors">
              <AppIcons.communication.notification className={IconSizes.md} />
              <div className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full"></div>
            </button>

            {/* User Profile */}
            <div className="flex items-center space-x-3 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">JD</span>
              </div>
              <div className="hidden xl:block">
                <p className="text-sm font-medium text-slate-900">John Doe</p>
                <p className="text-xs text-slate-500">Business Owner</p>
              </div>
              <button className="text-slate-400 hover:text-slate-600 transition-colors">
                <AppIcons.navigation.expand className={IconSizes.sm} />
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors">
              <AppIcons.navigation.menu className={IconSizes.md} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
} 