"use client";
import { useState, useEffect } from 'react';
import Preloader from './Preloader';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [showPreloader, setShowPreloader] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setShowPreloader(true);
  }, []);

  const handleFinish = () => {
    setShowPreloader(false);
  };

  // Render the same structure on both server and client to prevent hydration mismatch
  return (
    <>
      {isClient && showPreloader && <Preloader onFinish={handleFinish} />}
      <div 
        style={{ 
          opacity: isClient && showPreloader ? 0 : 1, 
          transition: 'opacity 0.3s',
          visibility: isClient && showPreloader ? 'hidden' : 'visible'
        }}
      >
        {children}
      </div>
    </>
  );
} 