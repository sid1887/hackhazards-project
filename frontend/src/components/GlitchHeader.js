import React, { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';

const GlitchHeader = ({ title, subtitle }) => {
  const [glitching, setGlitching] = useState(false);
  
  // Randomly trigger glitch effect
  useEffect(() => {
    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setGlitching(true);
        setTimeout(() => setGlitching(false), 150);
      }
    }, 3000);
    
    return () => clearInterval(glitchInterval);
  }, []);
  
  return (
    <div className="text-center mb-12 relative">
      <div className="inline-block relative">
        <h1 
          className={`text-4xl md:text-6xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-cyber-blue to-cyber-purple transition-all duration-300 hover:from-cyber-purple hover:to-cyber-blue ${glitching ? 'animate-glitch' : ''}`}
        >
          {title}
        </h1>
        
        {/* Decorative elements */}
        <div className="absolute -left-4 top-1/2 transform -translate-y-1/2 hidden md:block">
          <Zap className="h-6 w-6 text-cyber-blue opacity-70" />
        </div>
        <div className="absolute -right-4 top-1/2 transform -translate-y-1/2 hidden md:block">
          <Zap className="h-6 w-6 text-cyber-purple opacity-70" />
        </div>
      </div>
      
      {subtitle && (
        <p className="text-gray-400 text-lg mt-2 max-w-md mx-auto transition-all duration-300 hover:text-gray-300">
          {subtitle}
        </p>
      )}
      
      <div className="h-px w-full max-w-md mx-auto bg-gradient-to-r from-transparent via-cyber-blue/30 to-transparent mt-6"></div>
    </div>
  );
};

export default GlitchHeader;