import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

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
  const [glitchIntensity, setGlitchIntensity] = useState(0);

  useEffect(() => {
    // Initial glitch effect
    setIsGlitching(true);
    
    // Random glitches
    const glitchInterval = setInterval(() => {
      const intensity = Math.random();
      setGlitchIntensity(intensity);
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 200 + Math.random() * 400);
    }, 3000 + Math.random() * 5000);
    
    // Periodic intense glitches
    const intenseGlitchInterval = setInterval(() => {
      setGlitchIntensity(0.8 + Math.random() * 0.2);
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 500 + Math.random() * 500);
    }, 10000 + Math.random() * 5000);
    
    return () => {
      clearInterval(glitchInterval);
      clearInterval(intenseGlitchInterval);
    };
  }, []);

  const getGlitchClass = () => {
    if (!isGlitching) return '';
    if (glitchIntensity > 0.7) return 'animate-glitch-text-intense';
    if (glitchIntensity > 0.4) return 'animate-glitch-text-medium';
    return 'animate-glitch-text';
  };

  return (
    <header className={cn('text-center py-12 md:py-20 relative', className)}>
      <div className="absolute top-0 left-0 w-full h-full z-0">
        <div className="dot-pattern opacity-10"></div>
      </div>
      
      <div className="relative z-10">
        <div className="relative">
          <h1 
            data-text={title}
            className={cn(
              'text-5xl md:text-7xl font-cyber font-bold mb-4',
              'text-cyber-primary tracking-wide',
              'glitch-wrapper transition-all duration-300',
              getGlitchClass()
            )}
            onMouseEnter={() => {
              setGlitchIntensity(0.9);
              setIsGlitching(true);
            }}
            onMouseLeave={() => {
              setTimeout(() => setIsGlitching(false), 300);
            }}
          >
            {title}
            
            {/* Layers for additional glitch effects */}
            <span 
              aria-hidden="true" 
              className={cn(
                "absolute top-0 left-0 w-full",
                "text-cyber-accent opacity-0",
                isGlitching && "animate-[glitch-anim_0.3s_ease_forwards]"
              )}
            >
              {title}
            </span>
            
            <span 
              aria-hidden="true" 
              className={cn(
                "absolute top-0 left-0 w-full",
                "text-cyber-secondary opacity-0",
                isGlitching && "animate-[glitch-anim2_0.3s_ease_forwards]"
              )}
            >
              {title}
            </span>
          </h1>
        </div>
        
        {subtitle && (
          <p className="text-xl md:text-2xl text-cyber-accent max-w-2xl mx-auto animate-fade-in relative">
            {subtitle}
            <span className="absolute -bottom-2 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-cyber-primary/50 to-transparent"></span>
          </p>
        )}
      </div>

      {/* Background lighting effects */}
      <div className="absolute -top-10 -left-10 w-64 h-64 bg-cyber-purple/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-cyber-blue/10 rounded-full blur-3xl"></div>
      
      {/* Animated accent elements */}
      <div className="absolute top-1/4 right-[10%] w-2 h-2 bg-cyber-pink rounded-full animate-ping opacity-70"></div>
      <div className="absolute bottom-1/4 left-[10%] w-2 h-2 bg-cyber-blue rounded-full animate-ping opacity-70 animation-delay-300"></div>
      
      {/* Circuit lines */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyber-purple/30 to-transparent"></div>
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyber-blue/30 to-transparent"></div>
    </header>
  );
};

export default GlitchHeader;
