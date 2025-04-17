
import React from 'react';
import { cn } from '@/lib/utils';
import { Zap, Layers, Code } from 'lucide-react';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';

interface StatItemProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  description?: string;
  className?: string;
  style?: React.CSSProperties; // Added style prop to the interface
}

const StatItem: React.FC<StatItemProps> = ({ icon, value, label, description, className, style }) => (
  <HoverCard>
    <HoverCardTrigger asChild>
      <div 
        className={cn(
          "glassmorphism-panel-intense py-8 px-8 flex flex-col items-center led-border-glow",
          "transition-all duration-500 cursor-pointer",
          "hover:bg-cyber-dark/60 hover:border-opacity-30 hover:border-pink-500/20",
          className
        )}
        style={style} // Added style prop
      >
        <div className="text-cyber-primary mb-4 relative dual-tone-glow rounded-full p-3 bg-cyber-dark/50">
          {icon}
          <div className="absolute inset-0 rounded-full shimmer-effect"></div>
        </div>
        <div className="text-xl font-cyber font-bold mb-2 neon-text-blue">{value}</div>
        <div className="text-cyber-muted text-sm">{label}</div>
      </div>
    </HoverCardTrigger>
    
    {description && (
      <HoverCardContent className="frosted-glass border-0 w-80">
        <div className="p-2">
          <h4 className="font-cyber text-cyber-primary mb-2">{value} {label}</h4>
          <p className="text-sm text-gray-300">{description}</p>
        </div>
      </HoverCardContent>
    )}
  </HoverCard>
);

const FloatingStats = () => {
  return (
    <div className="w-full max-w-4xl mx-auto py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatItem 
          icon={<Zap className="w-6 h-6" />} 
          value="AI-Powered" 
          label="Price Comparison"
          description="Our AI algorithms analyze thousands of products in real-time to find the best deals across multiple marketplaces and local stores."
          className="animate-fade-in subtle-float"
        />
        <StatItem 
          icon={<Layers className="w-6 h-6" />} 
          value="Advanced" 
          label="Data Scraping"
          description="Our sophisticated data scraping technology bypasses anti-bot measures to collect accurate pricing information from any website or marketplace."
          className="animate-fade-in delay-150 subtle-float"
          style={{ animationDelay: "0.2s" }}
        />
        <StatItem 
          icon={<Code className="w-6 h-6" />} 
          value="Real-time" 
          label="Market Analysis"
          description="Get instant insights on price trends, historical data, and predicted price drops to make the most informed purchasing decisions."
          className="animate-fade-in delay-300 subtle-float"
          style={{ animationDelay: "0.4s" }}
        />
      </div>
    </div>
  );
};

export default FloatingStats;
