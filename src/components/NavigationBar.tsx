'use client';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { AppIcons, IconSizes, IconColors } from '../lib/iconSystem';
import { useAuth } from '../context/AuthContext';
import { getSupabaseClient } from '../lib/supabase';

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
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [authKey, setAuthKey] = useState(0);
  const { user, signOut, loading } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = getSupabaseClient();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const navigationItems = [
    { label: 'Dashboard', href: '/', key: 'dashboard' },
    { label: 'Reports', href: '/reports', key: 'reports' },
    { label: 'Settings', href: '/settings', key: 'settings' },
    { label: 'Help', href: '/help', key: 'help' }
  ];

  // Get user initials from email if available
  const getUserInitials = (email: string | undefined) => {
    if (!email) return 'U';
    const parts = email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email[0].toUpperCase();
  };

  // Get display name from email
  const getDisplayName = (email: string | undefined) => {
    if (!email) return 'User';
    const parts = email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return parts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
    }
    return email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1);
  };

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/';
  };

  const handleShowLogin = () => {
    setAuthKey(prev => prev + 1);
    setShowLogin(true);
  };

  const handleCloseLogin = () => {
    setShowLogin(false);
  };

  return (
    <div>
      <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-50 shadow-sm" style={{ fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, sans-serif' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Left: Logo and Company Info */}
            <div className="flex items-center space-x-4 flex-shrink-0">
              <Link href="/" className="flex items-center space-x-4 hover:opacity-90 transition-all duration-300 group">
                <div className="relative">
                  <svg 
                    width="44" 
                    height="44" 
                    viewBox="0 0 48 48" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    className="group-hover:scale-105 transition-transform duration-300"
                  >
                    <path d="M8 40V8L24 24L40 8V40L24 24L8 40Z" fill="url(#nav-logo-gradient)" fillOpacity="0.95"/>
                    <defs>
                      <linearGradient id="nav-logo-gradient" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#A855F7"/>
                        <stop offset="0.5" stopColor="#8B5CF6"/>
                        <stop offset="1" stopColor="#6366F1"/>
                      </linearGradient>
                    </defs>
                  </svg>
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

              {/* Notifications */}
              <button className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors">
                <AppIcons.communication.notification className={IconSizes.md} />
                <div className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full"></div>
              </button>

              {/* Loading state */}
              {loading && (
                <div className="px-6 py-2">
                  <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                </div>
              )}

              {/* Login Button - Show when not authenticated */}
              {!user && !loading && (
                <button
                  onClick={handleShowLogin}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-medium hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transform hover:scale-105"
                  style={{ fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, sans-serif' }}
                >
                  Sign In
                </button>
              )}

              {/* User Profile - Only show when authenticated */}
              {user && (
                <div className="relative" ref={dropdownRef}>
                  <div className="flex items-center space-x-3 pl-3 border-l border-slate-200">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {getUserInitials(user?.email)}
                      </span>
                    </div>
                    <div className="hidden xl:block">
                      <p className="text-sm font-medium text-slate-900">
                        {getDisplayName(user?.email)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {user?.email}
                      </p>
                    </div>
                    <button 
                      onClick={() => setShowUserDropdown(!showUserDropdown)}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <AppIcons.navigation.expand className={IconSizes.sm} />
                    </button>
                  </div>

                  {/* User Dropdown */}
                  {showUserDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-sm font-medium text-slate-900">
                          {getDisplayName(user?.email)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {user?.email}
                        </p>
                      </div>
                      <div className="py-1">
                        <Link
                          href="/settings"
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          onClick={() => setShowUserDropdown(false)}
                        >
                          Account Settings
                        </Link>
                        <Link
                          href="/help"
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          onClick={() => setShowUserDropdown(false)}
                        >
                          Help & Support
                        </Link>
                        <div className="border-t border-slate-100 mt-1 pt-1">
                          <button
                            onClick={handleLogout}
                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mobile Menu Button */}
              <button className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors">
                <AppIcons.navigation.menu className={IconSizes.md} />
              </button>
            </div>
          </div>
        </div>
      </header>
    
      {/* Premium Login Modal - Same as Preloader */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100]" onClick={(e) => e.target === e.currentTarget && handleCloseLogin()}>
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl border border-slate-200/50" style={{ fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, sans-serif' }}>
            <div className="text-center mb-6 relative">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 40V8L24 24L40 8V40L24 24L8 40Z" fill="white" fillOpacity="0.95"/>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, sans-serif' }}>
                Sign in to <span className="text-purple-600">Meridian</span>
              </h2>
              <p className="text-slate-600" style={{ fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, sans-serif' }}>
                Access your financial intelligence platform
              </p>
              <button 
                onClick={handleCloseLogin}
                className="absolute top-0 right-0 text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-lg hover:bg-slate-100"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            
            <div className="supabase-auth-container">
              {supabase && (
                <Auth
                  key={authKey}
                  supabaseClient={supabase}
                  appearance={{
                    theme: ThemeSupa,
                    style: {
                      container: {
                        width: '100%',
                        fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, sans-serif',
                      },
                      input: {
                        borderRadius: '14px',
                        border: '1px solid #d1d5db',
                        padding: '18px 24px',
                        fontSize: '15px',
                        backgroundColor: '#ffffff',
                        color: '#1f2937',
                        width: '100%',
                        boxSizing: 'border-box',
                        transition: 'all 0.3s ease',
                        fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, sans-serif',
                      },
                      label: {
                        color: '#374151',
                        fontWeight: '600',
                        fontSize: '14px',
                        marginBottom: '8px',
                        fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, sans-serif',
                      },
                      button: {
                        backgroundColor: '#7c3aed',
                        color: 'white',
                        border: 'none',
                        borderRadius: '14px',
                        padding: '18px 32px',
                        fontSize: '15px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        width: '100%',
                        fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, sans-serif',
                      },
                      message: {
                        color: '#dc2626',
                        textAlign: 'center',
                        fontSize: '14px',
                        marginTop: '16px',
                        fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, sans-serif',
                      },
                    },
                  }}
                  providers={['google']}
                  redirectTo={`${window.location.origin}/`}
                  onlyThirdPartyProviders={false}
                  magicLink={true}
                  showLinks={true}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 