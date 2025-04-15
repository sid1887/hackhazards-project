
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
  
  // Define color schemes based on variants
  const colorSchemes = {
    primary: {
      purple: 'bg-cyber-purple hover:bg-cyber-purple/90 text-white',
      blue: 'bg-cyber-blue hover:bg-cyber-blue/90 text-white',
      pink: 'bg-cyber-pink hover:bg-cyber-pink/90 text-white',
      green: 'bg-cyber-green hover:bg-cyber-green/90 text-white',
    },
    secondary: {
      purple: 'bg-cyber-purple/20 hover:bg-cyber-purple/30 text-cyber-purple',
      blue: 'bg-cyber-blue/20 hover:bg-cyber-blue/30 text-cyber-blue',
      pink: 'bg-cyber-pink/20 hover:bg-cyber-pink/30 text-cyber-pink',
      green: 'bg-cyber-green/20 hover:bg-cyber-green/30 text-cyber-green',
    },
    outline: {
      purple: 'bg-transparent hover:bg-cyber-purple/10 text-cyber-purple border border-cyber-purple',
      blue: 'bg-transparent hover:bg-cyber-blue/10 text-cyber-blue border border-cyber-blue',
      pink: 'bg-transparent hover:bg-cyber-pink/10 text-cyber-pink border border-cyber-pink',
      green: 'bg-transparent hover:bg-cyber-green/10 text-cyber-green border border-cyber-green',
    },
    ghost: {
      purple: 'bg-transparent hover:bg-cyber-purple/10 text-cyber-purple',
      blue: 'bg-transparent hover:bg-cyber-blue/10 text-cyber-blue',
      pink: 'bg-transparent hover:bg-cyber-pink/10 text-cyber-pink',
      green: 'bg-transparent hover:bg-cyber-green/10 text-cyber-green',
    },
  };
  
  // Define glow effects based on color
  const glowEffects = {
    purple: isHovered ? 'shadow-[0_0_15px_rgba(155,135,245,0.5)]' : '',
    blue: isHovered ? 'shadow-[0_0_15px_rgba(14,165,233,0.5)]' : '',
    pink: isHovered ? 'shadow-[0_0_15px_rgba(217,70,239,0.5)]' : '',
    green: isHovered ? 'shadow-[0_0_15px_rgba(16,185,129,0.5)]' : '',
  };
  
  // Define active press effect
  const pressEffect = isPressed ? 'transform scale-[0.98]' : '';
  
  return (
    <button
      className={cn(
        'relative px-6 py-3 rounded-md transition-all duration-300',
        'font-cyber uppercase tracking-wider text-sm',
        'flex items-center justify-center gap-2',
        colorSchemes[variant][glowColor],
        glowEffects[glowColor],
        pressEffect,
        {
          'opacity-70 cursor-wait': isLoading,
          'hover:translate-y-[-2px]': !isLoading && !isPressed,
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
      {isLoading ? (
        <div className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
      ) : icon && (
        <span className={cn('transition-transform duration-300', { 'transform translate-x-[-3px]': isHovered })}>
          {icon}
        </span>
      )}
      
      <span className={cn('relative z-10', { 'transform translate-x-[3px]': isHovered && icon })}>
        {children}
      </span>
      
      {/* Background effects */}
      <div
        className={cn(
          'absolute inset-0 rounded-md opacity-0 transition-opacity duration-500',
          'bg-gradient-to-r',
          {
            'from-cyber-purple/50 to-cyber-blue/50': glowColor === 'purple',
            'from-cyber-blue/50 to-cyber-green/50': glowColor === 'blue',
            'from-cyber-pink/50 to-cyber-purple/50': glowColor === 'pink',
            'from-cyber-green/50 to-cyber-blue/50': glowColor === 'green',
          },
          { 'opacity-20': isHovered && (variant === 'primary' || variant === 'secondary') }
        )}
      />
      
      {/* Glitch effect on hover */}
      {isHovered && (
        <>
          <div className="absolute inset-0 rounded-md bg-white/10 opacity-0 animate-[glitch_0.3s_ease_infinite_alternate]" />
          <div className="absolute inset-0 rounded-md bg-white/5 opacity-0 animate-[glitch_0.3s_0.1s_ease_infinite_alternate]" />
        </>
      )}
    </button>
  );
};

export default CyberButton;
