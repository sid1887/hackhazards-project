import React from "react";
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 max-w-md mx-auto glassmorphism-panel border border-cyber-border/30 my-8 relative overflow-hidden">
          <div className="circuit-pattern absolute inset-0 opacity-20 z-0"></div>
          <div className="cyber-lines"></div>
          
          <div className="w-16 h-16 rounded-full bg-cyber-darker flex items-center justify-center mb-5 border border-cyber-pink/30 relative">
            <div className="absolute inset-0 bg-cyber-pink/10 rounded-full animate-ping opacity-75"></div>
            <AlertTriangle className="h-8 w-8 text-cyber-pink" />
          </div>
          
          <h2 className="text-xl font-cyber text-cyber-blue mb-4 neon-text-blue">SYSTEM MALFUNCTION</h2>
          
          <div className="glassmorphism-panel bg-cyber-darker/50 p-4 rounded-md border border-cyber-border/20 mb-6 w-full">
            <p className="text-cyber-pink font-mono text-sm break-all">
              {this.state.error?.message || "An unexpected system error occurred"}
            </p>
          </div>
          
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-6 py-2 bg-cyber-darker border border-cyber-blue/50 text-cyber-blue rounded-md hover:bg-cyber-blue/20 transition-all duration-300 font-cyber flex items-center gap-2 ui-component"
          >
            <RefreshCw className="h-4 w-4" />
            REINITIALIZE SYSTEM
          </button>
          
          {/* Decorative elements */}
          <div className="absolute top-3 right-3 w-4 h-4 rounded-full border border-cyber-pink/50 animate-pulse bg-cyber-pink/20"></div>
          <div className="absolute bottom-3 left-3 w-4 h-4 rounded-full border border-cyber-blue/50 animate-pulse bg-cyber-blue/20"></div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;