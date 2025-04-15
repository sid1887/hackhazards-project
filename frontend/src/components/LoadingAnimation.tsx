
import React from 'react';

interface LoadingAnimationProps {
  message?: string;
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ 
  message = "Scanning prices across the digital marketplace..." 
}) => {
  return (
    <div className="w-full flex flex-col items-center justify-center py-16">
      <div className="relative w-24 h-24 mb-8">
        {/* Spinning outer circle */}
        <div className="absolute inset-0 border-4 border-t-cyber-blue border-r-cyber-purple border-b-cyber-pink border-l-cyber-orange rounded-full animate-spin"></div>
        
        {/* Inner elements */}
        <div className="absolute inset-2 flex items-center justify-center">
          <div className="w-4 h-4 bg-cyber-blue rounded-full animate-pulse"></div>
        </div>
        
        {/* Additional particles */}
        <div className="absolute top-6 left-0 w-2 h-2 bg-cyber-pink rounded-full animate-ping"></div>
        <div className="absolute bottom-4 right-2 w-2 h-2 bg-cyber-orange rounded-full animate-ping" 
             style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute top-2 right-6 w-2 h-2 bg-cyber-purple rounded-full animate-ping"
             style={{ animationDelay: '1s' }}></div>
      </div>
      
      <div className="text-center">
        <p className="text-lg font-cyber text-cyber-blue mb-2">
          {message}
        </p>
        <div className="flex space-x-1 justify-center mt-2">
          <div className="w-2 h-2 bg-cyber-blue rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-cyber-purple rounded-full animate-bounce" 
               style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-cyber-pink rounded-full animate-bounce"
               style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingAnimation;
