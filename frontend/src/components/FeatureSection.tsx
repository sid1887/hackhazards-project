
import React from 'react';
import { cn } from '@/lib/utils';

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
    <div 
      className={cn(
        "glassmorphism-panel p-6 rounded-lg transition-all duration-300", 
        "hover:border-cyber-blue/30 hover:translate-y-[-5px]",
        className
      )}
    >
      <div className="mb-4">
        {icon}
      </div>
      
      <h3 className="text-lg md:text-xl font-cyber mb-3 text-cyber-blue">
        {title}
      </h3>
      
      <p className="text-gray-400 text-sm md:text-base">
        {description}
      </p>
    </div>
  );
};

export default FeatureSection;
