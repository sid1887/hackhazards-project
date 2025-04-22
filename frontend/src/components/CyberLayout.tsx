import React, { useState, useEffect } from 'react';
import CyberBackground from './CyberBackground';
import HeroParticles from './HeroParticles';

interface CyberLayoutProps {
  children: React.ReactNode;
}

const CyberLayout: React.FC<CyberLayoutProps> = ({ children }) => {
  const [backgroundError, setBackgroundError] = useState<string | null>(null);
  const [particlesError, setParticlesError] = useState<string | null>(null);
  
  // Error handling for canvas components
  useEffect(() => {
    // Log errors for debugging
    if (backgroundError) {
      console.error('CyberBackground error:', backgroundError);
    }
    if (particlesError) {
      console.error('HeroParticles error:', particlesError);
    }
  }, [backgroundError, particlesError]);

  return (
    <div className="cyber-layout relative min-h-screen">
      <div className="fixed inset-0 z-[-2] bg-cyber-dark">
        {/* Error boundary for CyberBackground */}
        {!backgroundError ? (
          <React.Suspense fallback={<div className="w-full h-full bg-cyber-dark" />}>
            <ErrorCatcher onError={setBackgroundError}>
              <CyberBackground />
            </ErrorCatcher>
          </React.Suspense>
        ) : (
          <div className="w-full h-full bg-cyber-dark" />
        )}
      </div>
      
      <div className="fixed inset-0 z-[-1] opacity-80">
        {/* Error boundary for HeroParticles */}
        {!particlesError ? (
          <React.Suspense fallback={<div className="w-full h-full" />}>
            <ErrorCatcher onError={setParticlesError}>
              <HeroParticles />
            </ErrorCatcher>
          </React.Suspense>
        ) : (
          <div className="w-full h-full" />
        )}
      </div>
      
      <div className="relative z-10 w-full min-h-screen">
        {children}
      </div>
    </div>
  );
};

// Simple error boundary component
interface ErrorCatcherProps {
  children: React.ReactNode;
  onError: (error: string) => void;
}

class ErrorCatcher extends React.Component<ErrorCatcherProps, { hasError: boolean }> {
  constructor(props: ErrorCatcherProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error.message);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

export default CyberLayout;