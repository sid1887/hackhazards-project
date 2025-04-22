import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, XCircle, AlertTriangle } from 'lucide-react';
import CyberButton from "@/components/CyberButton";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="container mx-auto px-4 py-8 max-w-md relative">
        <div className="glassmorphism-panel border border-cyber-border/30 p-8 relative overflow-hidden">
          <div className="circuit-pattern absolute inset-0 opacity-20 z-0"></div>
          <div className="cyber-lines"></div>
          
          {/* Glitched 404 */}
          <div className="relative mb-8 text-center">
            <h1 className="text-6xl md:text-7xl font-cyber text-cyber-pink neon-text-pink tracking-wider glitch-text-container">
              <span className="animate-glitch-1">404</span>
            </h1>
            <p className="text-sm font-mono text-cyber-blue/70 mt-1 tracking-wider">
              ERROR CODE: SYS_PAGE_NOT_FOUND
            </p>
          </div>
          
          {/* Warning Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-cyber-darker flex items-center justify-center border border-cyber-pink/30 relative">
              <div className="absolute inset-0 bg-cyber-pink/5 rounded-full animate-ping"></div>
              <AlertTriangle className="h-8 w-8 text-cyber-pink" />
            </div>
          </div>
          
          {/* Message */}
          <div className="text-center mb-8">
            <h2 className="text-xl font-cyber text-cyber-blue mb-4 neon-text-blue">LOCATION NOT FOUND</h2>
            <div className="glassmorphism-panel bg-cyber-darker/50 p-3 rounded-md border border-cyber-border/20 mb-4">
              <p className="text-cyber-primary font-mono text-sm break-all">
                {location.pathname}
              </p>
            </div>
            <p className="text-gray-400 mb-6">
              The neural pathway you're attempting to access doesn't exist in our system.
            </p>
          </div>
          
          {/* Action Button */}
          <div className="flex justify-center">
            <Link to="/">
              <CyberButton color="blue" className="px-6 py-2 flex items-center gap-2">
                <Home className="h-4 w-4" />
                RETURN TO HOME
              </CyberButton>
            </Link>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-4 right-4 w-3 h-3 rounded-full border border-cyber-pink/50 animate-pulse bg-cyber-pink/20"></div>
          <div className="absolute top-4 right-10 w-2 h-2 rounded-full border border-cyber-blue/50 animate-pulse bg-cyber-blue/20"></div>
          <div className="absolute bottom-4 left-4 w-3 h-3 rounded-full border border-cyber-blue/50 animate-pulse bg-cyber-blue/20"></div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
