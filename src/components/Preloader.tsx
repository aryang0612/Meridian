import React, { useEffect, useRef, useState } from 'react';

const Preloader: React.FC<{ onFinish?: () => void }> = ({ onFinish }) => {
  const [show, setShow] = useState(true);
  const [zapActive, setZapActive] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [fadeIn, setFadeIn] = useState(true);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [dataStreams, setDataStreams] = useState<Array<{
    id: number;
    code: string;
    x: number;
    y: number;
    size: number;
    rotation: number;
    speed: number;
    opacity: number;
    delay: number;
  }>>([]);

  // Generate data stream codes
  const accountingCodes = [
    "GL-4001", "AR-2847", "AP-1205", "JE-9834", "PO-5621", "INV-7429",
    "ACR-3301", "DEP-8845", "TAX-2156", "REV-6789", "EXP-4423", "BAL-9901"
  ];

  // Fade in entrance animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Mouse tracking for custom cursor
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Initialize data streams
  useEffect(() => {
    const generateStreams = () => {
      const streams = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        code: accountingCodes[Math.floor(Math.random() * accountingCodes.length)],
        x: Math.random() * 30, // Left 30% of screen
        y: Math.random() * 100 + 100, // Random starting height
        size: 0.2 + Math.random() * 0.2, // 0.2rem to 0.4rem (extremely small)
        rotation: (Math.random() - 0.5) * 10, // -5deg to +5deg
        speed: 0.5 + Math.random() * 1, // Varying speeds
        opacity: 0.1 + Math.random() * 0.1, // 0.1 to 0.2
        delay: Math.random() * 5 // Random delays
      }));
      setDataStreams(streams);
    };

    generateStreams();
    const interval = setInterval(generateStreams, 8000); // Regenerate every 8 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Add pulse animation for scroll indicator
    const style = document.createElement('style');
    style.textContent = `
      @keyframes meridian-preloader-pulse {
        0%, 100% { opacity: 0.8; transform: translateX(-50%) scaleY(1); }
        50% { opacity: 0.4; transform: translateX(-50%) scaleY(0.7); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  // Electric zap effect every 5 seconds
  useEffect(() => {
    const zapInterval = setInterval(() => {
      setZapActive(true);
      setTimeout(() => setZapActive(false), 300); // Zap lasts 300ms
    }, 5000);

    return () => clearInterval(zapInterval);
  }, []);

  useEffect(() => {
    // Fade in from black on mount
    const fadeTimer = setTimeout(() => setFadeIn(false), 400);
    return () => clearTimeout(fadeTimer);
  }, []);

  // Instant launch - no delay, no fade
  const handleLaunch = () => {
    setShow(false);
    if (onFinish) onFinish();
    // eslint-disable-next-line no-console
    console.log('🚀 Launching the greatest app ever created...');
  };

  if (!show) return null;

  return (
    <div className={`meridian-preloader-root${isLoaded ? ' meridian-preloader-loaded' : ''}`}>  
      {/* Black fade-in overlay */}
      {fadeIn && <div className="meridian-preloader-fadein-overlay" />}

      {/* Custom Fintech Cursor */}
      <div 
        className="meridian-preloader-custom-cursor"
        style={{
          left: mousePosition.x,
          top: mousePosition.y,
        }}
      />

      {/* Flowing Ribbons */}
      <div className="meridian-preloader-ribbon-container">
        <div className="meridian-preloader-flow-ribbon">
          <svg viewBox="0 0 1000 600" xmlns="http://www.w3.org/2000/svg">
            {/* Main flowing ribbons - more intricate */}
            <path d="M150,50 Q300,20 450,80 T750,120 Q600,180 450,220 T150,260 Q300,300 450,340 T750,380 Q600,420 450,460 T150,500 Q300,540 450,580" 
                  fill="none" stroke="url(#meridian-preloader-gradient1)" strokeWidth="4" opacity="0.7"/>
            
            <path d="M200,30 Q350,10 500,60 T800,100 Q650,160 500,200 T200,240 Q350,280 500,320 T800,360 Q650,400 500,440 T200,480 Q350,520 500,560" 
                  fill="none" stroke="url(#meridian-preloader-gradient2)" strokeWidth="3" opacity="0.6"/>
            
            <path d="M100,80 Q250,50 400,110 T700,150 Q550,210 400,250 T100,290 Q250,330 400,370 T700,410 Q550,470 400,510 T100,550 Q250,590 400,630" 
                  fill="none" stroke="url(#meridian-preloader-gradient3)" strokeWidth="5" opacity="0.5"/>
            
            {/* Secondary intricate patterns */}
            <path d="M180,40 Q320,15 470,70 T770,110 Q620,170 470,210 T180,250 Q320,290 470,330 T770,370 Q620,430 470,470 T180,510 Q320,550 470,590" 
                  fill="none" stroke="url(#meridian-preloader-gradient4)" strokeWidth="2" opacity="0.4"/>
            
            <path d="M120,70 Q260,40 410,90 T710,130 Q560,190 410,230 T120,270 Q260,310 410,350 T710,390 Q560,450 410,490 T120,530 Q260,570 410,610" 
                  fill="none" stroke="url(#meridian-preloader-gradient5)" strokeWidth="3" opacity="0.3"/>
            
            {/* Cosmic swirls and spirals */}
            <path d="M250,20 Q400,5 550,40 T850,80 Q700,140 550,180 T250,220 Q400,260 550,300 T850,340 Q700,400 550,440 T250,480 Q400,520 550,560" 
                  fill="none" stroke="url(#meridian-preloader-gradient6)" strokeWidth="2" opacity="0.4"/>
            
            <path d="M300,10 Q450,0 600,30 T900,70 Q750,130 600,170 T300,210 Q450,250 600,290 T900,330 Q750,390 600,430 T300,470 Q450,510 600,550" 
                  fill="none" stroke="url(#meridian-preloader-gradient7)" strokeWidth="1.5" opacity="0.3"/>
            
            {/* Nebula-like cloud patterns */}
            <path d="M50,100 Q200,80 350,120 T650,160 Q500,220 350,260 T50,300 Q200,340 350,380 T650,420 Q500,480 350,520 T50,560 Q200,600 350,640" 
                  fill="none" stroke="url(#meridian-preloader-gradient8)" strokeWidth="6" opacity="0.2"/>
            
            {/* Ethereal wisps */}
            <path d="M80,60 Q230,35 380,85 T680,125 Q530,185 380,225 T80,265 Q230,305 380,345 T680,385 Q530,445 380,485 T80,525 Q230,565 380,605" 
                  fill="none" stroke="url(#meridian-preloader-gradient9)" strokeWidth="1" opacity="0.25"/>
            
            {/* Cosmic stars and sparkles */}
            <circle cx="150" cy="80" r="2" fill="url(#meridian-preloader-star1)" opacity="0.8">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="3s" repeatCount="indefinite"/>
            </circle>
            <circle cx="350" cy="120" r="1.5" fill="url(#meridian-preloader-star2)" opacity="0.6">
              <animate attributeName="opacity" values="0.2;0.8;0.2" dur="2.5s" repeatCount="indefinite"/>
            </circle>
            <circle cx="550" cy="160" r="2.5" fill="url(#meridian-preloader-star3)" opacity="0.9">
              <animate attributeName="opacity" values="0.4;1;0.4" dur="4s" repeatCount="indefinite"/>
            </circle>
            <circle cx="750" cy="200" r="1" fill="url(#meridian-preloader-star4)" opacity="0.7">
              <animate attributeName="opacity" values="0.3;0.9;0.3" dur="3.5s" repeatCount="indefinite"/>
            </circle>
            <circle cx="250" cy="280" r="2" fill="url(#meridian-preloader-star5)" opacity="0.8">
              <animate attributeName="opacity" values="0.2;1;0.2" dur="2.8s" repeatCount="indefinite"/>
            </circle>
            <circle cx="450" cy="320" r="1.5" fill="url(#meridian-preloader-star6)" opacity="0.6">
              <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3.2s" repeatCount="indefinite"/>
            </circle>
            <circle cx="650" cy="360" r="2.5" fill="url(#meridian-preloader-star7)" opacity="0.9">
              <animate attributeName="opacity" values="0.4;1;0.4" dur="3.8s" repeatCount="indefinite"/>
            </circle>
            <circle cx="850" cy="400" r="1" fill="url(#meridian-preloader-star8)" opacity="0.7">
              <animate attributeName="opacity" values="0.2;0.9;0.2" dur="2.9s" repeatCount="indefinite"/>
            </circle>
            
            {/* Nebula clusters */}
            <g opacity="0.3">
              <circle cx="200" cy="150" r="8" fill="url(#meridian-preloader-nebula1)"/>
              <circle cx="400" cy="190" r="6" fill="url(#meridian-preloader-nebula2)"/>
              <circle cx="600" cy="230" r="10" fill="url(#meridian-preloader-nebula3)"/>
              <circle cx="800" cy="270" r="7" fill="url(#meridian-preloader-nebula4)"/>
              <circle cx="300" cy="350" r="9" fill="url(#meridian-preloader-nebula5)"/>
              <circle cx="500" cy="390" r="5" fill="url(#meridian-preloader-nebula6)"/>
              <circle cx="700" cy="430" r="8" fill="url(#meridian-preloader-nebula7)"/>
              <circle cx="900" cy="470" r="6" fill="url(#meridian-preloader-nebula8)"/>
            </g>
            
            <defs>
              <linearGradient id="meridian-preloader-gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0" />
                <stop offset="20%" stopColor="#8b5cf6" stopOpacity="0.9" />
                <stop offset="40%" stopColor="#3b82f6" stopOpacity="0.8" />
                <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.7" />
                <stop offset="80%" stopColor="#8b5cf6" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="meridian-preloader-gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
                <stop offset="30%" stopColor="#8b5cf6" stopOpacity="0.8" />
                <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="meridian-preloader-gradient3" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
                <stop offset="25%" stopColor="#3b82f6" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.8" />
                <stop offset="75%" stopColor="#06b6d4" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="meridian-preloader-gradient4" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0" />
                <stop offset="40%" stopColor="#06b6d4" stopOpacity="0.6" />
                <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="meridian-preloader-gradient5" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
                <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="meridian-preloader-gradient6" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
                <stop offset="35%" stopColor="#8b5cf6" stopOpacity="0.6" />
                <stop offset="65%" stopColor="#3b82f6" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="meridian-preloader-gradient7" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0" />
                <stop offset="45%" stopColor="#06b6d4" stopOpacity="0.5" />
                <stop offset="55%" stopColor="#3b82f6" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="meridian-preloader-gradient8" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
                <stop offset="30%" stopColor="#8b5cf6" stopOpacity="0.4" />
                <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="meridian-preloader-gradient9" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
                <stop offset="40%" stopColor="#8b5cf6" stopOpacity="0.4" />
                <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
              </linearGradient>
              
              {/* Star gradients */}
              <radialGradient id="meridian-preloader-star1" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="meridian-preloader-star2" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="meridian-preloader-star3" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="meridian-preloader-star4" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="meridian-preloader-star5" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="meridian-preloader-star6" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="meridian-preloader-star7" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="meridian-preloader-star8" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </radialGradient>
              
              {/* Nebula gradients */}
              <radialGradient id="meridian-preloader-nebula1" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(139,92,246,0.3)" stopOpacity="1" />
                <stop offset="50%" stopColor="rgba(59,130,246,0.2)" stopOpacity="0.5" />
                <stop offset="100%" stopColor="rgba(6,182,212,0.1)" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="meridian-preloader-nebula2" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(59,130,246,0.3)" stopOpacity="1" />
                <stop offset="50%" stopColor="rgba(6,182,212,0.2)" stopOpacity="0.5" />
                <stop offset="100%" stopColor="rgba(139,92,246,0.1)" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="meridian-preloader-nebula3" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(6,182,212,0.3)" stopOpacity="1" />
                <stop offset="50%" stopColor="rgba(139,92,246,0.2)" stopOpacity="0.5" />
                <stop offset="100%" stopColor="rgba(59,130,246,0.1)" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="meridian-preloader-nebula4" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(139,92,246,0.3)" stopOpacity="1" />
                <stop offset="50%" stopColor="rgba(59,130,246,0.2)" stopOpacity="0.5" />
                <stop offset="100%" stopColor="rgba(6,182,212,0.1)" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="meridian-preloader-nebula5" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(59,130,246,0.3)" stopOpacity="1" />
                <stop offset="50%" stopColor="rgba(6,182,212,0.2)" stopOpacity="0.5" />
                <stop offset="100%" stopColor="rgba(139,92,246,0.1)" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="meridian-preloader-nebula6" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(6,182,212,0.3)" stopOpacity="1" />
                <stop offset="50%" stopColor="rgba(139,92,246,0.2)" stopOpacity="0.5" />
                <stop offset="100%" stopColor="rgba(59,130,246,0.1)" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="meridian-preloader-nebula7" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(139,92,246,0.3)" stopOpacity="1" />
                <stop offset="50%" stopColor="rgba(59,130,246,0.2)" stopOpacity="0.5" />
                <stop offset="100%" stopColor="rgba(6,182,212,0.1)" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="meridian-preloader-nebula8" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(59,130,246,0.3)" stopOpacity="1" />
                <stop offset="50%" stopColor="rgba(6,182,212,0.2)" stopOpacity="0.5" />
                <stop offset="100%" stopColor="rgba(139,92,246,0.1)" stopOpacity="0" />
              </radialGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Data Stream Animation */}
      <div className="meridian-preloader-data-stream-container">
        {dataStreams.map((stream) => (
          <div
            key={stream.id}
            className="meridian-preloader-data-stream-item"
            style={{
              left: `${stream.x}%`,
              top: `${stream.y}%`,
              fontSize: `${stream.size}rem`,
              transform: `rotate(${stream.rotation}deg)`,
              opacity: stream.opacity,
              animationDelay: `${stream.delay}s`,
              animationDuration: `${stream.speed * 10}s`
            }}
          >
            {stream.code}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="meridian-preloader-main-container">
        <div className="meridian-preloader-content-wrapper">
          <div className="meridian-preloader-left-content">
            <h1 className={`meridian-preloader-welcome-heading${zapActive ? ' meridian-preloader-zap' : ''}`}>Welcome.</h1>
            <div className="meridian-preloader-brand-text">
              <span className="meridian-preloader-brand-prefix">to</span>
              <span className="meridian-preloader-brand-name">meridian</span>
            </div>
            <div className="meridian-preloader-button-group">
              <button className="meridian-preloader-btn-primary" onClick={handleLaunch}>Launch Application</button>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator (hidden visually, but logic included for completeness) */}
      <div className="meridian-preloader-scroll-indicator" style={{animation: 'meridian-preloader-pulse 2s ease-in-out infinite'}} />

      {/* Styles */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&family=Times+New+Roman:wght@400;700&family=Outfit:wght@300;400;500;600;700;800;900&family=Cormorant+Garamond:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        .meridian-preloader-root {
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
          background: linear-gradient(135deg, #000000 0%, #1a1a2e 50%, #16213e 100%);
          min-height: 100vh;
          overflow-x: hidden;
          color: white;
          position: fixed;
          inset: 0;
          z-index: 99999;
          opacity: 0;
          transform: scale(0.95);
          transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .meridian-preloader-root.meridian-preloader-loaded {
          opacity: 1;
          transform: scale(1);
        }
        
        /* Custom Fintech Cursor */
        .meridian-preloader-custom-cursor {
          position: fixed;
          width: 12px;
          height: 12px;
          background: linear-gradient(135deg, #8b5cf6, #00d4ff);
          border-radius: 50%;
          pointer-events: none;
          z-index: 999999;
          transform: translate(-50%, -50%);
          box-shadow: 
            0 0 0 2px rgba(139, 92, 246, 0.3),
            0 0 20px rgba(139, 92, 246, 0.6),
            0 0 40px rgba(0, 212, 255, 0.4);
          animation: meridian-preloader-cursorPulse 2s ease-in-out infinite;
        }
        .meridian-preloader-custom-cursor::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 4px;
          height: 4px;
          background: #ffffff;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
        }
        @keyframes meridian-preloader-cursorPulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            box-shadow: 
              0 0 0 2px rgba(139, 92, 246, 0.3),
              0 0 20px rgba(139, 92, 246, 0.6),
              0 0 40px rgba(0, 212, 255, 0.4);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2);
            box-shadow: 
              0 0 0 2px rgba(139, 92, 246, 0.5),
              0 0 30px rgba(139, 92, 246, 0.8),
              0 0 60px rgba(0, 212, 255, 0.6);
          }
        }
        
        .meridian-preloader-ribbon-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
          overflow: hidden;
        }
        .meridian-preloader-flow-ribbon {
          position: absolute;
          right: -400px;
          top: 15%;
          width: 1000px;
          height: 600px;
          background: transparent;
          z-index: 1;
        }
        .meridian-preloader-flow-ribbon svg {
          width: 100%;
          height: 100%;
          animation: meridian-preloader-ribbonFlow 15s ease-in-out infinite;
        }
        .meridian-preloader-flow-ribbon svg path {
          animation: meridian-preloader-rippleWave 8s ease-in-out infinite;
        }
        .meridian-preloader-flow-ribbon svg path:nth-child(2) {
          animation-delay: -2s;
        }
        .meridian-preloader-flow-ribbon svg path:nth-child(3) {
          animation-delay: -4s;
        }
        .meridian-preloader-flow-ribbon svg path:nth-child(4) {
          animation-delay: -1s;
        }
        .meridian-preloader-flow-ribbon svg path:nth-child(5) {
          animation-delay: -3s;
        }
        .meridian-preloader-flow-ribbon svg path:nth-child(6) {
          animation-delay: -5s;
        }
        .meridian-preloader-flow-ribbon svg path:nth-child(7) {
          animation-delay: -2.5s;
        }
        .meridian-preloader-flow-ribbon svg path:nth-child(8) {
          animation-delay: -4.5s;
        }
        .meridian-preloader-flow-ribbon svg path:nth-child(9) {
          animation-delay: -1.5s;
        }
        @keyframes meridian-preloader-ribbonFlow {
          0% { 
            transform: translateX(0) translateY(0) rotate(0deg) scale(1); 
          }
          15% { 
            transform: translateX(-30px) translateY(-40px) rotate(8deg) scale(1.05); 
          }
          30% { 
            transform: translateX(-60px) translateY(20px) rotate(-5deg) scale(0.95); 
          }
          45% { 
            transform: translateX(-40px) translateY(-60px) rotate(12deg) scale(1.1); 
          }
          60% { 
            transform: translateX(-80px) translateY(40px) rotate(-8deg) scale(0.9); 
          }
          75% { 
            transform: translateX(-20px) translateY(-30px) rotate(6deg) scale(1.02); 
          }
          90% { 
            transform: translateX(-70px) translateY(10px) rotate(-3deg) scale(0.98); 
          }
          100% { 
            transform: translateX(0) translateY(0) rotate(0deg) scale(1); 
          }
        }
        @keyframes meridian-preloader-rippleWave {
          0%, 100% {
            stroke-dasharray: 1000;
            stroke-dashoffset: 0;
            filter: drop-shadow(0 0 5px rgba(139, 92, 246, 0.3));
          }
          25% {
            stroke-dasharray: 800;
            stroke-dashoffset: 200;
            filter: drop-shadow(0 0 15px rgba(139, 92, 246, 0.6));
          }
          50% {
            stroke-dasharray: 1200;
            stroke-dashoffset: 400;
            filter: drop-shadow(0 0 25px rgba(139, 92, 246, 0.8));
          }
          75% {
            stroke-dasharray: 900;
            stroke-dashoffset: 300;
            filter: drop-shadow(0 0 20px rgba(139, 92, 246, 0.7));
          }
        }
        
        /* Data Stream Animation Styles */
        .meridian-preloader-data-stream-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
          pointer-events: none;
          overflow: hidden;
        }
        .meridian-preloader-data-stream-item {
          position: absolute;
          font-family: 'JetBrains Mono', 'Courier New', 'Monaco', monospace;
          color: #8b5cf6;
          text-shadow: 0 0 8px rgba(139, 92, 246, 0.6), 0 0 16px rgba(139, 92, 246, 0.3);
          white-space: nowrap;
          animation: meridian-preloader-dataStreamFloat linear infinite;
          opacity: 0;
        }
        @keyframes meridian-preloader-dataStreamFloat {
          0% {
            opacity: 0;
            transform: translateY(0) translateX(0);
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateY(-100vh) translateX(20px);
          }
        }
        
        .meridian-preloader-main-container {
          position: relative;
          z-index: 2;
          min-height: 100vh;
          display: flex;
          align-items: center;
          padding: 100px 60px 60px 60px;
        }
        .meridian-preloader-content-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-direction: column;
          text-align: center;
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
        }
        .meridian-preloader-left-content {
          animation: meridian-preloader-slideInLeft 1.2s cubic-bezier(0.16, 1, 0.3, 1), meridian-preloader-breathe 6s ease-in-out infinite 3s;
        }
        @keyframes meridian-preloader-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.015); }
        }
        @keyframes meridian-preloader-slideInLeft {
          from { opacity: 0; transform: translateX(-60px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .meridian-preloader-welcome-heading {
          font-family: 'Playfair Display', serif;
          font-size: 5.5rem;
          font-weight: 700;
          line-height: 0.9;
          margin-bottom: 40px;
          background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          position: relative;
          text-shadow: 
            0 1px 0 rgba(255,255,255,0.1),
            0 2px 0 rgba(255,255,255,0.05),
            0 3px 0 rgba(255,255,255,0.025),
            0 4px 8px rgba(0,0,0,0.3),
            0 8px 16px rgba(0,0,0,0.2);
          transform: perspective(1000px) rotateX(2deg);
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4)) drop-shadow(0 8px 16px rgba(0,0,0,0.2));
        }
        .meridian-preloader-welcome-heading.meridian-preloader-zap {
          animation: meridian-preloader-electricZap 0.3s ease-out;
        }
        @keyframes meridian-preloader-electricZap {
          0% {
            background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            filter: brightness(1) drop-shadow(0 4px 8px rgba(0,0,0,0.4)) drop-shadow(0 8px 16px rgba(0,0,0,0.2));
            transform: perspective(1000px) rotateX(2deg);
          }
          10% {
            background: linear-gradient(135deg, #00ffff 0%, #0080ff 50%, #ff00ff 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            filter: brightness(2) drop-shadow(0 0 20px rgba(0, 255, 255, 0.8)) drop-shadow(0 0 40px rgba(255, 0, 255, 0.6)) drop-shadow(0 4px 8px rgba(0,0,0,0.4));
            transform: perspective(1000px) rotateX(2deg) scale(1.05) skewX(2deg);
          }
          20% {
            background: linear-gradient(135deg, #ffff00 0%, #ff8000 50%, #ff0080 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            filter: brightness(3) drop-shadow(0 0 30px rgba(255, 255, 0, 0.9)) drop-shadow(0 0 60px rgba(255, 0, 128, 0.7)) drop-shadow(0 4px 8px rgba(0,0,0,0.4));
            transform: perspective(1000px) rotateX(2deg) scale(1.1) skewX(-1deg);
          }
          30% {
            background: linear-gradient(135deg, #00ff80 0%, #00ffff 50%, #8000ff 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            filter: brightness(2.5) drop-shadow(0 0 25px rgba(0, 255, 128, 0.8)) drop-shadow(0 0 50px rgba(128, 0, 255, 0.6)) drop-shadow(0 4px 8px rgba(0,0,0,0.4));
            transform: perspective(1000px) rotateX(2deg) scale(1.08) skewX(1deg);
          }
          40% {
            background: linear-gradient(135deg, #ff0080 0%, #ff8000 50%, #ffff00 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            filter: brightness(2) drop-shadow(0 0 20px rgba(255, 0, 128, 0.7)) drop-shadow(0 0 40px rgba(255, 128, 0, 0.5)) drop-shadow(0 4px 8px rgba(0,0,0,0.4));
            transform: perspective(1000px) rotateX(2deg) scale(1.05) skewX(-0.5deg);
          }
          50% {
            background: linear-gradient(135deg, #8000ff 0%, #00ffff 50%, #00ff80 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            filter: brightness(1.8) drop-shadow(0 0 15px rgba(128, 0, 255, 0.6)) drop-shadow(0 0 30px rgba(0, 255, 128, 0.4)) drop-shadow(0 4px 8px rgba(0,0,0,0.4));
            transform: perspective(1000px) rotateX(2deg) scale(1.02) skewX(0.2deg);
          }
          60% {
            background: linear-gradient(135deg, #ffff00 0%, #ff8000 50%, #ff0080 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            filter: brightness(1.5) drop-shadow(0 0 10px rgba(255, 255, 0, 0.5)) drop-shadow(0 0 20px rgba(255, 0, 128, 0.3)) drop-shadow(0 4px 8px rgba(0,0,0,0.4));
            transform: perspective(1000px) rotateX(2deg) scale(1.01) skewX(-0.1deg);
          }
          70% {
            background: linear-gradient(135deg, #00ff80 0%, #00ffff 50%, #8000ff 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            filter: brightness(1.3) drop-shadow(0 0 8px rgba(0, 255, 128, 0.4)) drop-shadow(0 0 15px rgba(128, 0, 255, 0.2)) drop-shadow(0 4px 8px rgba(0,0,0,0.4));
            transform: perspective(1000px) rotateX(2deg) scale(1.005) skewX(0.05deg);
          }
          80% {
            background: linear-gradient(135deg, #ff0080 0%, #ff8000 50%, #ffff00 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            filter: brightness(1.1) drop-shadow(0 0 5px rgba(255, 0, 128, 0.3)) drop-shadow(0 0 10px rgba(255, 128, 0, 0.1)) drop-shadow(0 4px 8px rgba(0,0,0,0.4));
            transform: perspective(1000px) rotateX(2deg) scale(1.002) skewX(-0.02deg);
          }
          90% {
            background: linear-gradient(135deg, #8000ff 0%, #00ffff 50%, #00ff80 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            filter: brightness(1.05) drop-shadow(0 0 3px rgba(128, 0, 255, 0.2)) drop-shadow(0 0 6px rgba(0, 255, 128, 0.1)) drop-shadow(0 4px 8px rgba(0,0,0,0.4));
            transform: perspective(1000px) rotateX(2deg) scale(1.001) skewX(0.01deg);
          }
          100% {
            background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            filter: brightness(1) drop-shadow(0 4px 8px rgba(0,0,0,0.4)) drop-shadow(0 8px 16px rgba(0,0,0,0.2));
            transform: perspective(1000px) rotateX(2deg);
          }
        }
        .meridian-preloader-brand-text {
          text-align: center;
          margin-bottom: 40px;
        }
        .meridian-preloader-brand-prefix {
          font-family: 'Times', 'Times New Roman', serif;
          font-size: 0.9rem;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.6);
          letter-spacing: 3px;
          text-transform: uppercase;
          margin-bottom: 4px;
          display: block;
        }
        .meridian-preloader-brand-name {
          font-family: 'Times', 'Times New Roman', serif;
          font-size: 1.2rem;
          font-weight: 700;
          color: white;
          letter-spacing: 4px;
          text-transform: uppercase;
          text-shadow: 0 0 10px rgba(139, 92, 246, 0.6), 0 0 20px rgba(139, 92, 246, 0.4);
          overflow: hidden;
          white-space: nowrap;
          width: 0;
          animation: meridian-preloader-typewriter 2s steps(8) 1.5s forwards;
          border-right: 2px solid rgba(139, 92, 246, 0.8);
        }
        @keyframes meridian-preloader-typewriter {
          to { width: 100%; }
        }
        .meridian-preloader-brand-name::after {
          content: '';
          animation: meridian-preloader-blink 1s infinite 3.5s;
        }
        @keyframes meridian-preloader-blink {
          0%, 50% { border-color: rgba(139, 92, 246, 0.8); }
          51%, 100% { border-color: transparent; }
        }
        .meridian-preloader-button-group {
          display: flex;
          gap: 20px;
          margin-bottom: 40px;
          justify-content: center;
        }
        .meridian-preloader-btn-primary {
          background: transparent;
          border: 2px solid #8b5cf6;
          border-radius: 0;
          padding: 18px 36px;
          color: white;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 1px;
          transition: all 0.3s ease;
          position: relative;
          box-shadow: 
            0 0 0 2px rgba(139, 92, 246, 0.3),
            inset 0 0 0 1px rgba(139, 92, 246, 0.2);
        }
        .meridian-preloader-btn-primary::before {
          content: '';
          position: absolute;
          top: -4px;
          left: -4px;
          right: -4px;
          bottom: -4px;
          border: 1px solid #8b5cf6;
          opacity: 0.6;
          pointer-events: none;
        }
        .meridian-preloader-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 
            0 0 0 2px rgba(139, 92, 246, 0.5),
            inset 0 0 0 1px rgba(139, 92, 246, 0.3),
            0 10px 30px rgba(139, 92, 246, 0.4);
          border-color: #a855f7;
        }
        .meridian-preloader-btn-primary:hover::before {
          border-color: #a855f7;
          opacity: 0.8;
        }
        .meridian-preloader-scroll-indicator {
          position: fixed;
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
          width: 2px;
          height: 40px;
          background: linear-gradient(to bottom, rgba(139, 92, 246, 0.8), transparent);
          z-index: 10;
        }
        @media (max-width: 1024px) {
          .meridian-preloader-welcome-heading { font-size: 4rem; }
          .meridian-preloader-main-container { padding: 80px 40px 60px 40px; }
        }
        @media (max-width: 768px) {
          .meridian-preloader-welcome-heading { font-size: 3rem; }
          .meridian-preloader-main-container { padding: 60px 20px 40px 20px; }
          .meridian-preloader-button-group { flex-direction: column; align-items: center; }
          .meridian-preloader-btn-primary { width: 100%; max-width: 300px; }
        }
        .meridian-preloader-fadein-overlay {
          position: fixed;
          inset: 0;
          background: #000;
          z-index: 100000;
          opacity: 1;
          pointer-events: none;
          animation: meridian-preloader-fadein 0.4s cubic-bezier(0.4,0,0.2,1) forwards;
        }
        @keyframes meridian-preloader-fadein {
          from { opacity: 1; }
          to { opacity: 0; }
      `}</style>
    </div>
  );
};

export default Preloader; 