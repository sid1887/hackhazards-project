import React, { useEffect, useRef, useCallback } from 'react';
import { useIsMobile } from '../hooks/use-mobile';

const CyberBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const pointsRef = useRef<{ x: number, y: number, vx: number, vy: number }[]>([]);
  const isMobile = useIsMobile();
  
  // Create memoized setup functions to prevent unnecessary re-renders
  const setCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    
    // Use window dimensions directly to ensure full coverage
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    
    // Set display size (CSS)
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    // Set actual canvas size in pixels
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    
    // Scale context to match DPI
    ctx.scale(dpr, dpr);
    
    return { ctx, width, height, dpr };
  }, []);
  
  const initPoints = useCallback((width: number, height: number, dpr: number) => {
    // Adjust density based on screen size and device capability
    const density = isMobile ? 15 : 25;
    const area = width * height;
    const numPoints = Math.min(
      Math.floor(area / (25000 / (density / 10))),
      isMobile ? 75 : 150 // Cap maximum points for performance
    );
    
    const points: { x: number, y: number, vx: number, vy: number }[] = [];
    
    for (let i = 0; i < numPoints; i++) {
      points.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * (isMobile ? 0.05 : 0.08), // Even slower on mobile
        vy: (Math.random() - 0.5) * (isMobile ? 0.05 : 0.08)
      });
    }
    
    pointsRef.current = points;
    return points;
  }, [isMobile]);
  
  useEffect(() => {
    // Initial setup
    const setup = setCanvasSize();
    if (!setup) return;
    
    const { ctx, width, height, dpr } = setup;
    let points = initPoints(width, height, dpr);
    
    // Force one immediate render to prevent blank canvas on load
    renderFrame(ctx, points, width, height, dpr);
    
    // Optimized draw function with throttled connections
    function renderFrame(ctx: CanvasRenderingContext2D, points: any[], width: number, height: number, dpr: number) {
      // Clear canvas with background color
      ctx.fillStyle = 'rgb(18, 18, 18)';
      ctx.fillRect(0, 0, width, height);
      
      // Subtle connecting lines
      ctx.strokeStyle = 'rgba(0, 188, 212, 0.07)';
      ctx.lineWidth = 0.3;
      
      for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        
        // Move point
        p1.x += p1.vx;
        p1.y += p1.vy;
        
        // Bounce off edges with slight dampening
        if (p1.x < 0 || p1.x > width) {
          p1.vx = -p1.vx * 0.99;
          p1.x = p1.x < 0 ? 0 : width;
        }
        if (p1.y < 0 || p1.y > height) {
          p1.vy = -p1.vy * 0.99;
          p1.y = p1.y < 0 ? 0 : height;
        }
        
        // Draw connections efficiently - only connect to nearby points
        const connectionDistance = isMobile ? 60 : 80;
        const maxConnections = isMobile ? 3 : 5; // Limit max connections per point
        let connectionsCount = 0;
        
        for (let j = i + 1; j < points.length && connectionsCount < maxConnections; j++) {
          const p2 = points[j];
          
          // Fast distance check using square distance to avoid sqrt calculation
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const squareDist = dx * dx + dy * dy;
          
          if (squareDist < connectionDistance * connectionDistance) {
            const dist = Math.sqrt(squareDist); // Only calculate sqrt when needed
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.globalAlpha = 0.3 - dist / (connectionDistance * 2.5);
            ctx.stroke();
            connectionsCount++;
          }
        }
        
        // Reset global alpha
        ctx.globalAlpha = 1;
        
        // Draw points with consistent colors
        const colors = ['rgba(0, 188, 212, ', 'rgba(59, 130, 246, ']; 
        const colorIndex = i % colors.length;
        ctx.fillStyle = `${colors[colorIndex]}${0.1 + (i % 10) * 0.01})`;
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Animation loop using requestAnimationFrame
    const animate = () => {
      if (!ctx) return;
      renderFrame(ctx, points, width, height, dpr);
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Start animation
    animationRef.current = requestAnimationFrame(animate);
    
    // More responsive resize handler without debounce delay
    const handleResize = () => {
      const newSetup = setCanvasSize();
      if (!newSetup) return;
      
      const { ctx, width, height, dpr } = newSetup;
      
      // Keep existing points but adjust their positions relative to new dimensions
      if (points.length > 0) {
        const widthRatio = width / (points[0].x === 0 ? 1 : points[0].x + 1);
        const heightRatio = height / (points[0].y === 0 ? 1 : points[0].y + 1);
        
        points.forEach(point => {
          // Ensure points stay within bounds after resize
          point.x = Math.min(width, point.x * widthRatio);
          point.y = Math.min(height, point.y * heightRatio);
        });
      } else {
        // If somehow we lost our points, reinitialize them
        points = initPoints(width, height, dpr);
      }
      
      // Force immediate render after resize
      renderFrame(ctx, points, width, height, dpr);
    };
    
    // Handle visibility change to pause/resume animation
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
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [setCanvasSize, initPoints, isMobile]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full"
      style={{ width: '100%', height: '100%', display: 'block' }}
      aria-hidden="true"
    />
  );
};

export default CyberBackground;
