
import React from 'react';
import { cn } from '@/lib/utils';
import { Zap, Layers, Code } from 'lucide-react';

interface StatItemProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  className?: string;
}

const StatItem: React.FC<StatItemProps> = ({ icon, value, label, className }) => (
  <div className={cn(
    "glassmorphism-panel py-4 px-6 flex flex-col items-center",
    "animate-float transition-all duration-300 hover:translate-y-[-5px]",
    "hover:border-cyber-blue/30 hover:shadow-[0_0_15px_rgba(14,165,233,0.3)]",
    className
  )}>
    <div className="text-cyber-blue mb-2">
      {icon}
    </div>
    <div className="text-2xl font-cyber font-bold neon-text-blue mb-1">{value}</div>
    <div className="text-gray-400 text-sm">{label}</div>
  </div>
);

const FloatingStats = () => {
  return (
    <div className="w-full max-w-4xl mx-auto py-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatItem 
          icon={<Zap className="w-8 h-8" />} 
          value="AI-Powered" 
          label="Price Comparison"
          className="animation-delay-100"
        />
        <StatItem 
          icon={<Layers className="w-8 h-8" />} 
          value="Advanced" 
          label="Data Scraping"
          className="animation-delay-200"
        />
        <StatItem 
          icon={<Code className="w-8 h-8" />} 
          value="Real-time" 
          label="Market Analysis"
          className="animation-delay-300" 
        />
      </div>
    </div>
  );
};

export default FloatingStats;
