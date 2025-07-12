"use client";
import { useState, useEffect } from 'react';
import Preloader from './Preloader';
import { useAuth } from '../context/AuthContext';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [showPreloader, setShowPreloader] = useState(true);
  const [appVisible, setAppVisible] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !loading) {
      if (user) {
        // User is authenticated, show preloader briefly then transition to app
        const preloaderTimer = setTimeout(() => {
          setShowPreloader(false);
          setTimeout(() => {
            setAppVisible(true);
          }, 300);
        }, 1500);
        
        return () => clearTimeout(preloaderTimer);
      } else {
        // User is not authenticated, don't show ClientLayout preloader
        // Let the main page handle showing its own Preloader with login overlay
        setShowPreloader(false);
        setAppVisible(true);
      }
    }
  }, [mounted, loading, user]);

  if (!mounted) {
    return null; // Avoid hydration mismatch
  }

  return (
    <>
      {showPreloader && (
        <Preloader 
          onFinish={() => {
            setShowPreloader(false);
            setTimeout(() => setAppVisible(true), 300);
          }} 
        />
      )}
      <div 
        className={`meridian-app-content ${appVisible ? 'meridian-app-content-visible' : 'meridian-app-content-hidden'}`}
        style={{
          opacity: appVisible ? 1 : 0,
          visibility: appVisible ? 'visible' : 'hidden',
          transition: 'opacity 0.5s ease-in-out'
        }}
      >
        {children}
      </div>
    </>
  );
} 