"use client";
import { useState, useEffect } from 'react';
import Preloader from './Preloader';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [showPreloader, setShowPreloader] = useState(true);
  const [appVisible, setAppVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Show preloader for 2 seconds, then transition to app
    const preloaderTimer = setTimeout(() => {
      setShowPreloader(false);
      // Small delay to allow preloader fade out, then show app
      setTimeout(() => {
        setAppVisible(true);
      }, 300);
    }, 2000);

    return () => clearTimeout(preloaderTimer);
  }, []);

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