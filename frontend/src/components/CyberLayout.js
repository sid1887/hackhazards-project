import React, { useState, useEffect } from 'react';
import GlitchHeader from './GlitchHeader';

/**
 * CyberLayout Component
 * 
 * A base layout component that provides the cyberpunk aesthetic structure
 * including background effects, responsive layout, and animated transitions.
 */
const CyberLayout = ({ 
  children,
  title = 'Cumpair',
  subtitle,
  background = 'grid', // 'grid', 'dots', 'minimal', 'matrix'
  noHeader = false,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Background pattern classes
  const backgroundClasses = {
    grid: 'bg-cyber-grid',
    dots: 'bg-cyber-dots',
    minimal: 'bg-dark-bg',
    matrix: 'bg-matrix-rain',
  };
  
  // Simulate loading effect for smoother transitions
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`min-h-screen bg-dark-bg text-dark-text-primary ${backgroundClasses[background]}`}>
      {/* Gradient overlay at the top */}
      <div className="fixed top-0 left-0 right-0 h-64 bg-gradient-to-b from-cyber-dark-blue/50 to-transparent pointer-events-none z-0"></div>
      
      {/* Animated scanline effect */}
      <div className="fixed inset-0 scanline opacity-30 pointer-events-none z-0"></div>
      
      {/* Container with max width and centered content */}
      <div 
        className={`
          container mx-auto px-4 py-8 relative z-10
          transition-opacity duration-700 ease-out
          ${isLoaded ? 'opacity-100' : 'opacity-0'}
        `}
      >
        {/* Header section */}
        {!noHeader && (
          <header className="mb-8 mt-4">
            <GlitchHeader 
              title={title} 
              subtitle={subtitle} 
              size="large"
              color="mixed"
            />
          </header>
        )}
        
        {/* Main content area */}
        <main>
          {children}
        </main>
        
        {/* Footer with attribution */}
        <footer className="mt-20 py-6 text-center text-dark-text-secondary border-t border-dark-border">
          <div className="font-mono text-xs tracking-wider">
            <p>CUMPAIR • PRICE COMPARISON SYSTEM</p>
            <p className="mt-2 text-dark-text-disabled">© {new Date().getFullYear()} • POWERED BY GROQ AI</p>
          </div>
        </footer>
      </div>
      
      {/* Radial glow effect in corner */}
      <div className="fixed top-[-20%] right-[-10%] w-[50vw] h-[50vh] bg-radial-glow opacity-40 pointer-events-none"></div>
      <div className="fixed bottom-[-20%] left-[-10%] w-[50vw] h-[50vh] bg-radial-glow opacity-30 pointer-events-none"></div>
    </div>
  );
};

export default CyberLayout;