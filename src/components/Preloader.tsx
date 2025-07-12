'use client';

import React, { useEffect, useState } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { getSupabaseClient } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const Preloader: React.FC<{ onFinish?: () => void }> = ({ onFinish }) => {
  const [show, setShow] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [authKey, setAuthKey] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const supabase = getSupabaseClient();
  const { user, loading } = useAuth();

  // Smooth entrance animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Check if user is authenticated and launch app immediately
  useEffect(() => {
    if (user && !loading) {
      handleLaunch();
    }
  }, [user, loading]);

  const handleLaunch = () => {
    setShow(false);
    if (onFinish) onFinish();
  };

  const handleShowLogin = () => {
    setAuthKey(prev => prev + 1);
    setShowLogin(true);
  };

  const handleCloseLogin = () => {
    setShowLogin(false);
  };

  if (!show) return null;

  return (
    <>
      <div className={`preloader ${isLoaded ? 'loaded' : ''}`}>
        {/* Enhanced Background Elements */}
        <div className="bg-elements">
          {/* Animated Grid */}
          <div className="grid-overlay"></div>
          
          {/* Gradient Orbs */}
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
          <div className="gradient-orb orb-4"></div>
          <div className="gradient-orb orb-5"></div>
          
          {/* Floating Particles */}
          <div className="particle particle-1"></div>
          <div className="particle particle-2"></div>
          <div className="particle particle-3"></div>
          <div className="particle particle-4"></div>
          <div className="particle particle-5"></div>
          <div className="particle particle-6"></div>
          
          {/* Flowing Lines */}
          <div className="flow-line line-1"></div>
          <div className="flow-line line-2"></div>
          <div className="flow-line line-3"></div>
        </div>

        <div className="preloader-content">
          <div className="logo-section">
            <div className="logo-container">
              <div className="logo-icon">
                <svg width="44" height="44" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 40V8L24 24L40 8V40L24 24L8 40Z" fill="url(#logo-gradient)" fillOpacity="0.95"/>
                  <defs>
                    <linearGradient id="logo-gradient" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#A855F7"/>
                      <stop offset="0.5" stopColor="#8B5CF6"/>
                      <stop offset="1" stopColor="#6366F1"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h1 className="brand-title">Meridian</h1>
            </div>
            <p className="brand-tagline">
              <span className="tagline-accent">Financial Intelligence</span> Platform
            </p>
            <div className="brand-description">
              <span className="description-text">AI-Powered</span>
              <span className="description-separator">•</span>
              <span className="description-text">Real-Time</span>
              <span className="description-separator">•</span>
              <span className="description-text">Secure</span>
            </div>
          </div>
          
          <div className="action-section">
            {!loading && !user && (
              <button className="cta-button" onClick={handleShowLogin}>
                <div className="button-bg"></div>
                <span className="button-text">Access Platform</span>
                <div className="button-arrow">→</div>
              </button>
            )}
            
            {loading && (
              <div className="loading-section">
                <div className="loading-spinner">
                  <div className="spinner-ring"></div>
                  <div className="spinner-ring ring-2"></div>
                  <div className="spinner-ring ring-3"></div>
                </div>
                <p className="loading-text">
                  <span className="loading-accent">Initializing</span> platform...
                </p>
              </div>
            )}
            
            {!loading && user && (
              <div className="welcome-section">
                <div className="welcome-icon">✨</div>
                <p className="welcome-text">
                  <span className="welcome-accent">Welcome back!</span> Launching your dashboard...
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Login Modal */}
        {showLogin && (
          <div className="login-overlay" onClick={(e) => e.target === e.currentTarget && handleCloseLogin()}>
            <div className="login-modal">
              <div className="modal-header">
                <div className="modal-logo">
                  <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 40V8L24 24L40 8V40L24 24L8 40Z" fill="url(#modal-logo-gradient)" fillOpacity="0.95"/>
                    <defs>
                      <linearGradient id="modal-logo-gradient" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#A855F7"/>
                        <stop offset="0.5" stopColor="#8B5CF6"/>
                        <stop offset="1" stopColor="#6366F1"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <h2 className="modal-title">Sign in to <span className="modal-title-accent">Meridian</span></h2>
                <p className="modal-subtitle">Access your financial intelligence platform</p>
                <button className="close-button" onClick={handleCloseLogin}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>

              <div className="modal-form">
                {!supabase ? (
                  <div className="setup-message">
                    <div className="setup-icon">⚙️</div>
                    <h3>Setup Required</h3>
                    <p>Authentication configuration needed</p>
                  </div>
                ) : (
                  <div className="auth-container" key={`auth-${authKey}`}>
                    <Auth
                      supabaseClient={supabase}
                      appearance={{
                        theme: ThemeSupa,
                        style: {
                          button: {
                            background: 'linear-gradient(135deg, #A855F7 0%, #8B5CF6 50%, #6366F1 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '16px',
                            fontSize: '15px',
                            fontWeight: '600',
                            padding: '18px 24px',
                            width: '100%',
                            boxShadow: '0 8px 32px rgba(168, 85, 247, 0.4)',
                            transition: 'all 0.3s ease',
                            fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, sans-serif',
                          },
                          input: {
                            borderRadius: '14px',
                            border: '1px solid #374151',
                            padding: '18px 24px',
                            fontSize: '15px',
                            backgroundColor: '#1f2937',
                            color: '#f9fafb',
                            width: '100%',
                            boxSizing: 'border-box',
                            transition: 'all 0.3s ease',
                            fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, sans-serif',
                          },
                          label: {
                            color: '#d1d5db',
                            fontWeight: '600',
                            fontSize: '14px',
                            marginBottom: '8px',
                            fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, sans-serif',
                          },
                          anchor: {
                            color: '#A855F7',
                            textDecoration: 'none',
                            fontWeight: '600',
                            fontSize: '14px',
                            fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, sans-serif',
                          },
                          message: {
                            color: '#f87171',
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '14px',
                            padding: '16px 20px',
                            fontSize: '14px',
                            fontWeight: '500',
                            fontFamily: 'Poppins, -apple-system, BlinkMacSystemFont, sans-serif',
                          },
                          container: {
                            width: '100%',
                          },
                        },
                      }}
                      providers={[]}
                      theme="dark"
                      showLinks={true}
                      magicLink={true}
                      view="sign_in"
                      redirectTo={typeof window !== 'undefined' ? `${window.location.origin}/` : undefined}
                      onlyThirdPartyProviders={false}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        /* Premium Font Import */
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
        
        .preloader {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
          opacity: 0;
          transform: scale(0.95);
          transition: all 1.2s cubic-bezier(0.23, 1, 0.32, 1);
          overflow: hidden;
        }
        
        .preloader.loaded {
          opacity: 1;
          transform: scale(1);
        }
        
        /* Enhanced Background Elements */
        .bg-elements {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          pointer-events: none;
        }
        
        .grid-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: 
            linear-gradient(rgba(168, 85, 247, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(168, 85, 247, 0.05) 1px, transparent 1px);
          background-size: 50px 50px;
          animation: gridMove 20s linear infinite;
          opacity: 0.6;
        }
        
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
        
        .gradient-orb {
          position: absolute;
          border-radius: 50%;
          animation: float 15s ease-in-out infinite;
          filter: blur(1px);
        }
        
        .orb-1 {
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, transparent 70%);
          top: -15%;
          left: -10%;
          animation-delay: 0s;
        }
        
        .orb-2 {
          width: 280px;
          height: 280px;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%);
          bottom: -15%;
          right: -10%;
          animation-delay: 5s;
        }
        
        .orb-3 {
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%);
          top: 30%;
          right: 5%;
          animation-delay: 10s;
        }
        
        .orb-4 {
          width: 150px;
          height: 150px;
          background: radial-gradient(circle, rgba(168, 85, 247, 0.08) 0%, transparent 70%);
          bottom: 25%;
          left: 15%;
          animation-delay: 7s;
        }
        
        .orb-5 {
          width: 120px;
          height: 120px;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%);
          top: 60%;
          left: 70%;
          animation-delay: 12s;
        }
        
        .particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: linear-gradient(45deg, #A855F7, #8B5CF6);
          border-radius: 50%;
          animation: particleFloat 12s ease-in-out infinite;
          opacity: 0.7;
        }
        
        .particle-1 {
          top: 20%;
          left: 10%;
          animation-delay: 0s;
        }
        
        .particle-2 {
          top: 70%;
          left: 25%;
          animation-delay: 3s;
        }
        
        .particle-3 {
          top: 40%;
          right: 15%;
          animation-delay: 6s;
        }
        
        .particle-4 {
          bottom: 30%;
          right: 40%;
          animation-delay: 9s;
        }
        
        .particle-5 {
          top: 80%;
          left: 60%;
          animation-delay: 2s;
        }
        
        .particle-6 {
          top: 15%;
          right: 30%;
          animation-delay: 11s;
        }
        
        .flow-line {
          position: absolute;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.6), transparent);
          animation: flowMove 8s ease-in-out infinite;
          opacity: 0.8;
        }
        
        .line-1 {
          width: 200px;
          top: 25%;
          left: -200px;
          animation-delay: 0s;
        }
        
        .line-2 {
          width: 150px;
          top: 65%;
          right: -150px;
          animation-delay: 4s;
        }
        
        .line-3 {
          width: 180px;
          bottom: 35%;
          left: -180px;
          animation-delay: 6s;
        }
        
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, -30px) scale(1.1); }
          66% { transform: translate(-30px, 40px) scale(0.9); }
        }
        
        @keyframes particleFloat {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
          25% { transform: translate(20px, -20px) scale(1.2); opacity: 0.8; }
          50% { transform: translate(-15px, 25px) scale(0.8); opacity: 0.5; }
          75% { transform: translate(25px, 10px) scale(1.1); opacity: 0.7; }
        }
        
        @keyframes flowMove {
          0% { transform: translateX(0); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% { transform: translateX(calc(100vw + 200px)); opacity: 0; }
        }
        
        .preloader-content {
          text-align: center;
          max-width: 520px;
          padding: 60px 40px;
          position: relative;
          z-index: 10;
        }
        
        /* Enhanced Logo Section */
        .logo-section {
          margin-bottom: 52px;
        }
        
        .logo-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          margin-bottom: 20px;
        }
        
        .logo-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 72px;
          height: 72px;
          background: linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(139, 92, 246, 0.15) 50%, rgba(99, 102, 241, 0.15) 100%);
          border-radius: 24px;
          backdrop-filter: blur(20px);
          border: 1px solid rgba(168, 85, 247, 0.3);
          animation: logoGlow 4s ease-in-out infinite;
          position: relative;
          overflow: hidden;
        }
        
        .logo-icon::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.3), transparent);
          animation: logoShine 3s ease-in-out infinite;
        }
        
        @keyframes logoGlow {
          0%, 100% { 
            box-shadow: 0 12px 40px rgba(168, 85, 247, 0.3);
            transform: translateY(0px);
          }
          50% { 
            box-shadow: 0 20px 60px rgba(168, 85, 247, 0.5);
            transform: translateY(-3px);
          }
        }
        
        @keyframes logoShine {
          0% { left: -100%; }
          100% { left: 100%; }
        }
        
        .brand-title {
          font-size: 54px;
          font-weight: 800;
          background: linear-gradient(135deg, #A855F7 0%, #8B5CF6 30%, #6366F1 70%, #4F46E5 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
          letter-spacing: -0.03em;
          text-shadow: 0 0 40px rgba(168, 85, 247, 0.3);
          animation: titlePulse 4s ease-in-out infinite;
        }
        
        @keyframes titlePulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.2); }
        }
        
        .brand-tagline {
          font-size: 20px;
          font-weight: 600;
          color: #94a3b8;
          margin: 0 0 16px 0;
          letter-spacing: 0.02em;
        }
        
        .tagline-accent {
          background: linear-gradient(135deg, #A855F7 0%, #8B5CF6 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 700;
        }
        
        .brand-description {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-top: 12px;
        }
        
        .description-text {
          font-size: 14px;
          font-weight: 600;
          color: #64748b;
          padding: 6px 12px;
          background: rgba(168, 85, 247, 0.1);
          border-radius: 20px;
          border: 1px solid rgba(168, 85, 247, 0.2);
          backdrop-filter: blur(10px);
        }
        
        .description-separator {
          font-size: 12px;
          color: #475569;
          opacity: 0.6;
        }
        
        /* Enhanced Action Section */
        .action-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 28px;
        }
        
        .cta-button {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 20px 40px;
          background: transparent;
          border: 2px solid transparent;
          border-radius: 20px;
          color: white;
          font-size: 17px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          letter-spacing: 0.02em;
        }
        
        .button-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #A855F7 0%, #8B5CF6 50%, #6366F1 100%);
          border-radius: 18px;
          transition: all 0.4s ease;
          z-index: -1;
        }
        
        .cta-button:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 60px rgba(168, 85, 247, 0.5);
        }
        
        .cta-button:hover .button-bg {
          transform: scale(1.05);
          filter: brightness(1.1);
        }
        
        .cta-button:active {
          transform: translateY(-2px);
        }
        
        .button-text {
          position: relative;
          z-index: 2;
        }
        
        .button-arrow {
          font-size: 20px;
          transition: transform 0.4s ease;
          position: relative;
          z-index: 2;
        }
        
        .cta-button:hover .button-arrow {
          transform: translateX(6px);
        }
        
        /* Enhanced Loading Section */
        .loading-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }
        
        .loading-spinner {
          position: relative;
          width: 56px;
          height: 56px;
        }
        
        .spinner-ring {
          position: absolute;
          border: 3px solid transparent;
          border-radius: 50%;
          animation: spin 2s linear infinite;
        }
        
        .spinner-ring {
          width: 56px;
          height: 56px;
          border-top: 3px solid #A855F7;
          border-right: 3px solid rgba(168, 85, 247, 0.3);
        }
        
        .ring-2 {
          width: 44px;
          height: 44px;
          top: 6px;
          left: 6px;
          border-top: 3px solid #8B5CF6;
          border-right: 3px solid rgba(139, 92, 246, 0.3);
          animation-delay: 0.3s;
          animation-duration: 1.5s;
        }
        
        .ring-3 {
          width: 32px;
          height: 32px;
          top: 12px;
          left: 12px;
          border-top: 3px solid #6366F1;
          border-right: 3px solid rgba(99, 102, 241, 0.3);
          animation-delay: 0.6s;
          animation-duration: 1s;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .loading-text {
          font-size: 17px;
          color: #94a3b8;
          font-weight: 600;
          margin: 0;
        }
        
        .loading-accent {
          background: linear-gradient(135deg, #A855F7 0%, #8B5CF6 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 700;
        }
        
        /* Enhanced Welcome Section */
        .welcome-section {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 24px 36px;
          background: linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(139, 92, 246, 0.15) 50%, rgba(99, 102, 241, 0.15) 100%);
          border: 1px solid rgba(168, 85, 247, 0.3);
          border-radius: 20px;
          backdrop-filter: blur(20px);
        }
        
        .welcome-icon {
          font-size: 28px;
          animation: bounce 2s ease-in-out infinite;
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        
        .welcome-text {
          font-size: 17px;
          color: #e2e8f0;
          font-weight: 600;
          margin: 0;
        }
        
        .welcome-accent {
          background: linear-gradient(135deg, #A855F7 0%, #8B5CF6 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 700;
        }
        
        /* Enhanced Login Modal */
        .login-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(15, 15, 35, 0.8);
          backdrop-filter: blur(24px);
          z-index: 999999;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: overlayFadeIn 0.4s ease;
        }
        
        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .login-modal {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border: 1px solid rgba(168, 85, 247, 0.2);
          border-radius: 28px;
          padding: 44px;
          max-width: 460px;
          width: 90%;
          position: relative;
          box-shadow: 0 24px 100px rgba(15, 15, 35, 0.6);
          animation: modalSlideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(20px);
        }
        
        @keyframes modalSlideIn {
          from { 
            opacity: 0;
            transform: scale(0.9) translateY(40px);
          }
          to { 
            opacity: 1;
            transform: scale(1) translateY(0px);
          }
        }
        
        .modal-header {
          text-align: center;
          margin-bottom: 36px;
          position: relative;
        }
        
        .modal-logo {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(139, 92, 246, 0.15) 50%, rgba(99, 102, 241, 0.15) 100%);
          border-radius: 20px;
          margin-bottom: 24px;
          border: 1px solid rgba(168, 85, 247, 0.3);
          animation: logoGlow 3s ease-in-out infinite;
        }
        
        .modal-title {
          font-size: 28px;
          font-weight: 800;
          color: #f1f5f9;
          margin: 0 0 12px 0;
          letter-spacing: -0.02em;
        }
        
        .modal-title-accent {
          background: linear-gradient(135deg, #A855F7 0%, #8B5CF6 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .modal-subtitle {
          font-size: 16px;
          color: #94a3b8;
          font-weight: 500;
          margin: 0;
        }
        
        .close-button {
          position: absolute;
          top: -12px;
          right: -12px;
          width: 40px;
          height: 40px;
          background: rgba(31, 41, 55, 0.8);
          border: 1px solid rgba(168, 85, 247, 0.2);
          border-radius: 14px;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(20px);
        }
        
        .close-button:hover {
          background: rgba(168, 85, 247, 0.1);
          color: #f1f5f9;
          transform: scale(1.05);
          border-color: rgba(168, 85, 247, 0.4);
        }
        
        .modal-form {
          width: 100%;
        }
        
        .auth-container {
          width: 100%;
        }
        
        .setup-message {
          text-align: center;
          padding: 44px 24px;
          background: linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
          border-radius: 20px;
          border: 1px solid rgba(168, 85, 247, 0.2);
        }
        
        .setup-icon {
          font-size: 36px;
          margin-bottom: 20px;
        }
        
        .setup-message h3 {
          font-size: 20px;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0 0 12px 0;
        }
        
        .setup-message p {
          font-size: 15px;
          color: #94a3b8;
          margin: 0;
        }
        
        /* Mobile Responsiveness */
        @media (max-width: 768px) {
          .preloader-content {
            padding: 40px 24px;
          }
          
          .brand-title {
            font-size: 40px;
          }
          
          .logo-container {
            flex-direction: column;
            gap: 16px;
          }
          
          .brand-description {
            flex-direction: column;
            gap: 8px;
          }
          
          .login-modal {
            padding: 36px 28px;
            margin: 20px;
            border-radius: 24px;
          }
          
          .cta-button {
            padding: 18px 32px;
            font-size: 16px;
          }
          
          .modal-title {
            font-size: 24px;
          }
        }
      `}</style>
    </>
  );
};

export default Preloader; 