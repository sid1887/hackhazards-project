import React, { useState, useEffect } from 'react';
import GlitchHeader from './GlitchHeader';
import Footer from './Footer';
import CyberBackground from './CyberBackground';
import HeroParticles from './HeroParticles';

/**
 * CyberLayout Component
 * 
 * A base layout component that provides the cyberpunk aesthetic structure
 * including background effects, responsive layout, and animated transitions.
 */
const CyberLayout: React.FC<{
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  background?: 'grid' | 'dots' | 'minimal' | 'matrix';
  noHeader?: boolean;
}> = ({ 
  children,
  title = 'Cumpair',
  subtitle,
  background = 'grid',
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
    <div className={`min-h-screen bg-dark-bg text-dark-text-primary ${backgroundClasses[background]} relative overflow-hidden`}>
      {/* Dynamic background effects */}
      <CyberBackground />
      
      {/* Hero particles effect at the top section */}
      <div className="absolute top-0 left-0 right-0 h-[600px] pointer-events-none">
        <HeroParticles />
      </div>
      
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
        <main className="relative z-10">
          {children}
        </main>
        
        {/* Footer with custom component */}
        <div className="mt-20">
          <Footer />
        </div>
      </div>
      
      {/* Radial glow effect in corner */}
      <div className="fixed top-[-20%] right-[-10%] w-[50vw] h-[50vh] bg-radial-glow opacity-40 pointer-events-none"></div>
      <div className="fixed bottom-[-20%] left-[-10%] w-[50vw] h-[50vh] bg-radial-glow opacity-30 pointer-events-none"></div>
    </div>
  );
};

export default CyberLayout;