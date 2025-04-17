
import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface CyberButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  glowColor?: 'purple' | 'blue' | 'pink' | 'green';
  children: React.ReactNode;
  icon?: React.ReactNode;
  isLoading?: boolean;
}

const CyberButton: React.FC<CyberButtonProps> = ({
  className,
  variant = 'primary',
  glowColor = 'purple',
  children,
  icon,
  isLoading,
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  
  // Refined color schemes with more cyberpunk feel
  const colorSchemes = {
    primary: {
      purple: 'bg-cyber-purple/90 hover:bg-cyber-purple text-white border border-cyber-purple/30',
      blue: 'bg-cyber-blue/90 hover:bg-cyber-blue text-white border border-cyber-blue/30',
      pink: 'bg-cyber-pink/90 hover:bg-cyber-pink text-white border border-cyber-pink/30',
      green: 'bg-cyber-green/90 hover:bg-cyber-green text-white border border-cyber-green/30',
    },
    secondary: {
      purple: 'bg-cyber-dark/60 hover:bg-cyber-purple/20 text-cyber-purple border border-cyber-purple/20',
      blue: 'bg-cyber-dark/60 hover:bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/20',
      pink: 'bg-cyber-dark/60 hover:bg-cyber-pink/20 text-cyber-pink border border-cyber-pink/20',
      green: 'bg-cyber-dark/60 hover:bg-cyber-green/20 text-cyber-green border border-cyber-green/20',
    },
    outline: {
      purple: 'bg-transparent hover:bg-cyber-purple/10 text-cyber-purple border border-cyber-purple/50',
      blue: 'bg-transparent hover:bg-cyber-blue/10 text-cyber-blue border border-cyber-blue/50',
      pink: 'bg-transparent hover:bg-cyber-pink/10 text-cyber-pink border border-cyber-pink/50',
      green: 'bg-transparent hover:bg-cyber-green/10 text-cyber-green border border-cyber-green/50',
    },
    ghost: {
      purple: 'bg-transparent hover:bg-cyber-purple/10 text-cyber-purple',
      blue: 'bg-transparent hover:bg-cyber-blue/10 text-cyber-blue',
      pink: 'bg-transparent hover:bg-cyber-pink/10 text-cyber-pink',
      green: 'bg-transparent hover:bg-cyber-green/10 text-cyber-green',
    },
  };
  
  // Enhanced glow effects with reddish-bluish mix
  const glowEffects = {
    purple: isHovered ? 'shadow-[0_0_20px_rgba(155,135,245,0.3),_0_0_8px_rgba(236,72,153,0.25)]' : '',
    blue: isHovered ? 'shadow-[0_0_20px_rgba(14,165,233,0.3),_0_0_8px_rgba(236,72,153,0.25)]' : '',
    pink: isHovered ? 'shadow-[0_0_20px_rgba(217,70,239,0.3),_0_0_8px_rgba(59,130,246,0.25)]' : '',
    green: isHovered ? 'shadow-[0_0_20px_rgba(16,185,129,0.3),_0_0_8px_rgba(59,130,246,0.25)]' : '',
  };
  
  // More aggressive press effect
  const pressEffect = isPressed ? 'transform scale-[0.98] brightness-90' : '';
  
  // Enhanced border and glow animation
  const borderAnimationClass = isHovered ? 'led-border-glow' : '';
  
  return (
    <button
      className={cn(
        'relative px-6 py-3 rounded-xl transition-all duration-300', // Changed from rounded-md to rounded-xl
        'font-cyber uppercase tracking-wider text-sm',
        'flex items-center justify-center gap-2 overflow-hidden',
        'backdrop-blur-sm skew-x-[-3deg] hover:skew-x-0', // Added slight skew for cyberpunk feel
        colorSchemes[variant][glowColor],
        glowEffects[glowColor],
        pressEffect,
        borderAnimationClass,
        {
          'opacity-70 cursor-wait': isLoading,
          'hover:translate-y-[-2px] hover:shadow-lg': !isLoading && !isPressed,
        },
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {/* More dynamic loading and icon states */}
      {isLoading ? (
        <div className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
      ) : icon && (
        <span 
          className={cn(
            'transition-transform duration-300 opacity-80 group-hover:opacity-100',
            { 'transform translate-x-[-3px]': isHovered }
          )}
        >
          {icon}
        </span>
      )}
      
      <span 
        className={cn(
          'relative z-10 transition-transform duration-300',
          { 'transform translate-x-[3px]': isHovered && icon }
        )}
      >
        {children}
      </span>
      
      {/* Enhanced background gradient effects */}
      <div
        className={cn(
          'absolute inset-0 rounded-xl opacity-0 transition-opacity duration-500',
          'bg-gradient-to-r from-transparent to-transparent',
          {
            'from-pink-500/30 to-blue-500/30': glowColor === 'purple',
            'from-blue-500/30 to-cyan-500/30': glowColor === 'blue',
            'from-pink-500/30 to-purple-500/30': glowColor === 'pink',
            'from-green-500/30 to-blue-500/30': glowColor === 'green',
          },
          { 'opacity-30': isHovered && (variant === 'primary' || variant === 'secondary') }
        )}
      />
      
      {/* More intricate hover and shimmer effects */}
      {isHovered && (
        <>
          <div className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-pink-500/30 to-transparent"></div>
            <div className="absolute bottom-0 right-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>
          </div>
          <div className="shimmer-effect absolute inset-0 pointer-events-none"></div>
        </>
      )}
    </button>
  );
};

export default CyberButton;
