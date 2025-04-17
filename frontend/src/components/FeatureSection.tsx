
import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface FeatureSectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
}

const FeatureSection: React.FC<FeatureSectionProps> = ({
  icon,
  title,
  description,
  className
}) => {
  return (
    <Card 
      className={cn(
        "glassmorphism-panel p-6 rounded-xl led-border-glow", 
        "transition-all duration-500", 
        "hover:border-pink-500/20 hover:translate-y-[-5px]",
        className
      )}
    >
      <CardContent className="pt-6 pb-4 px-2">
        <div className="mb-5 text-cyber-primary dual-tone-glow p-3 rounded-full inline-flex bg-cyber-dark/30 relative">
          {icon}
          <div className="absolute inset-0 rounded-full shimmer-effect"></div>
        </div>
        
        <h3 className="text-lg md:text-xl font-cyber mb-3 neon-text-blue">
          {title}
        </h3>
        
        <p className="text-gray-400 text-sm md:text-base leading-relaxed">
          {description}
        </p>
      </CardContent>
      
      <div className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-pink-500/20 to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
      </div>
    </Card>
  );
};

export default FeatureSection;
