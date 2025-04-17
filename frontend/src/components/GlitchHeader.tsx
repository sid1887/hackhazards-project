
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

type GlitchHeaderProps = {
  title: string;
  subtitle?: string;
  className?: string;
}

const GlitchHeader: React.FC<GlitchHeaderProps> = ({
  title,
  subtitle,
  className
}) => {
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    // Occasional subtle effect
    const glitchInterval = setInterval(() => {
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 200);
    }, 15000 + Math.random() * 10000); // Much less frequent
    
    return () => {
      clearInterval(glitchInterval);
    };
  }, []);

  return (
    <header className={cn('text-center py-12 md:py-16 relative', className)}>
      <div className="absolute top-0 left-0 w-full h-full z-0 opacity-10">
        <div className="dot-pattern"></div>
      </div>
      
      <div className="relative z-10">
        <div className="relative">
          <h1 
            className={cn(
              'text-5xl md:text-6xl font-cyber font-bold mb-6',
              'text-cyber-text tracking-wide',
              'transition-all duration-300',
              isGlitching && "animate-pulse"
            )}
            onMouseEnter={() => {
              setIsGlitching(true);
            }}
            onMouseLeave={() => {
              setTimeout(() => setIsGlitching(false), 300);
            }}
          >
            {title}
            <span className="text-cyber-primary">.</span>
          </h1>
        </div>
        
        {subtitle && (
          <p className="text-xl md:text-2xl text-cyber-muted max-w-2xl mx-auto animate-fade-in relative">
            {subtitle}
            <span className="absolute -bottom-2 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-cyber-primary/20 to-transparent"></span>
          </p>
        )}
      </div>

      {/* Subtle background lighting effects */}
      <div className="absolute -top-10 -left-10 w-64 h-64 bg-cyber-primary/5 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-cyber-accent/5 rounded-full blur-3xl"></div>
    </header>
  );
};

export default GlitchHeader;
