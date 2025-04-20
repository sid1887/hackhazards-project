import React from 'react';
import CyberBackground from './CyberBackground';
import HeroParticles from './HeroParticles';

// This component will provide the cyberpunk background and styling consistently across all pages
interface CyberLayoutProps {
  children: React.ReactNode;
}

const CyberLayout: React.FC<CyberLayoutProps> = ({ children }) => {
  return (
    <div className="relative min-h-screen">
      {/* 1) Base background - CyberBackground as bottom layer */}
      <div className="fixed inset-0 z-[-2]">
        <CyberBackground />
      </div>
      
      {/* 2) Particle overlay - HeroParticles as middle layer */}
      <div className="fixed inset-0 z-[-1] opacity-80">
        <HeroParticles />
      </div>
      
      {/* 3) Content container */}
      <div className="relative z-10 flex-grow">
        {children}
      </div>
    </div>
  );
};

export default CyberLayout;