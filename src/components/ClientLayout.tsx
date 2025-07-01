"use client";
import { useState } from 'react';
import Preloader from './Preloader';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [showPreloader, setShowPreloader] = useState(true);

  const handleFinish = () => {
    setShowPreloader(false);
  };

  return (
    <>
      {showPreloader && <Preloader onFinish={handleFinish} />}
      <div style={{ opacity: showPreloader ? 0 : 1, transition: 'opacity 0.3s' }}>
        {children}
      </div>
    </>
  );
} 