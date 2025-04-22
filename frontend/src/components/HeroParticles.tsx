import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useIsMobile } from '../hooks/use-mobile';

const HeroParticles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesArrayRef = useRef<{
    x: number;
    y: number;
    size: number;
    speedX: number;
    speedY: number;
    color: string;
  }[]>([]);
  const isMobile = useIsMobile();
  const [canvasSupported, setCanvasSupported] = useState(true);
  
  // Memoized function to set canvas size
  const setCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    try {
      const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: false });
      if (!ctx) {
        setCanvasSupported(false);
        return;
      }
      
      // Use window dimensions for full-page coverage
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for performance
      
      // Set display size (CSS)
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      // Set actual canvas size in pixels (with limits for performance)
      const maxSize = 1920 * 1080; // Limit size for performance
      const targetSize = width * height * dpr * dpr;
      const adjustedDpr = targetSize > maxSize ? Math.sqrt(maxSize / (width * height)) : dpr;
      
      canvas.width = Math.floor(width * adjustedDpr);
      canvas.height = Math.floor(height * adjustedDpr);
      
      // Scale context to match DPR
      ctx.scale(adjustedDpr, adjustedDpr);
      
      return { ctx, width, height, dpr: adjustedDpr };
    } catch (error) {
      console.error('HeroParticles canvas setup error:', error);
      setCanvasSupported(false);
      return;
    }
  }, []);
  
  // Create particles function
  const createParticles = useCallback((width: number, height: number) => {
    try {
      const particlesArray: {
        x: number;
        y: number;
        size: number;
        speedX: number;
        speedY: number;
        color: string;
      }[] = [];
      
      // Soft blue color palette with lower opacity
      const colors = [
        'rgba(0, 188, 212, 0.2)', // main blue accent
        'rgba(59, 130, 246, 0.2)', // soft blue
        'rgba(0, 150, 199, 0.2)', // another blue tone
      ];
      
      // Scale particle count with viewport size but keep it reasonable
      const particleCount = Math.min(
        Math.floor((width * height) / (isMobile ? 30000 : 25000)), 
        isMobile ? 30 : 50
      );
      
      for (let i = 0; i < particleCount; i++) {
        const size = Math.random() * (isMobile ? 1.5 : 2) + 0.5; // Smaller particles
        const x = Math.random() * width;
        const y = Math.random() * height;
        const speedX = (Math.random() - 0.5) * (isMobile ? 0.3 : 0.5);
        const speedY = (Math.random() - 0.5) * (isMobile ? 0.3 : 0.5);
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        particlesArray.push({
          x,
          y,
          size,
          speedX,
          speedY,
          color,
        });
      }
      
      particlesArrayRef.current = particlesArray;
      return particlesArray;
    } catch (error) {
      console.error('HeroParticles creation error:', error);
      return [];
    }
  }, [isMobile]);
  
  useEffect(() => {
    if (!canvasSupported) return;
    
    try {
      // Setup canvas with proper sizing
      const setup = setCanvasSize();
      if (!setup) return;
      
      const { ctx, width, height, dpr } = setup;
      let particlesArray = createParticles(width, height);
      
      // Animation function
      const animate = (timestamp: number) => {
        if (!ctx) return;
        
        try {
          // Clear canvas, using clearRect for transparent background
          ctx.clearRect(0, 0, width, height);
          
          // Update and draw each particle
          particlesArray.forEach((particle) => {
            // Move the particle
            particle.x += particle.speedX;
            particle.y += particle.speedY;
            
            // Wrap particles around screen edges
            if (particle.x < 0) particle.x = width;
            if (particle.x > width) particle.x = 0;
            if (particle.y < 0) particle.y = height;
            if (particle.y > height) particle.y = 0;
            
            // Draw the particle
            ctx.beginPath();
            ctx.fillStyle = particle.color;
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
          });
        } catch (renderError) {
          console.error('HeroParticles render error:', renderError);
        }
        
        // Continue the animation loop
        animationRef.current = requestAnimationFrame(animate);
      };
      
      // Start the animation
      animationRef.current = requestAnimationFrame(animate);
      
      // Handle window resize
      const handleResize = () => {
        try {
          const newSetup = setCanvasSize();
          if (!newSetup) return;
          
          const { width: newWidth, height: newHeight } = newSetup;
          
          // Create new particles on significant size change
          if (Math.abs(newWidth - width) > width * 0.2 || Math.abs(newHeight - height) > height * 0.2) {
            particlesArray = createParticles(newWidth, newHeight);
          }
        } catch (resizeError) {
          console.error('HeroParticles resize error:', resizeError);
        }
      };
      
      // Visibility change handler for performance
      const handleVisibilityChange = () => {
        if (document.hidden) {
          // Page is hidden, cancel animation to save resources
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = undefined;
          }
        } else {
          // Page is visible again, resume animation
          if (!animationRef.current) {
            animationRef.current = requestAnimationFrame(animate);
          }
        }
      };
      
      // Add event listeners
      window.addEventListener('resize', handleResize);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Clean up
      return () => {
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    } catch (setupError) {
      console.error('HeroParticles setup error:', setupError);
    }
  }, [setCanvasSize, createParticles, canvasSupported]);
  
  return canvasSupported ? (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ width: '100%', height: '100%', display: 'block' }}
      aria-hidden="true"
    />
  ) : null; // Return nothing if canvas isn't supported to avoid errors
};

export default HeroParticles;
