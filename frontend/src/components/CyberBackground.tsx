import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useIsMobile } from '../hooks/use-mobile';

const CyberBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const pointsRef = useRef<{ x: number, y: number, vx: number, vy: number }[]>([]);
  const isMobile = useIsMobile();
  const [canvasSupported, setCanvasSupported] = useState(true);
  
  // Create memoized setup functions to prevent unnecessary re-renders
  const setCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    try {
      const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: false });
      if (!ctx) {
        setCanvasSupported(false);
        return;
      }
      
      // Use window dimensions directly to ensure full coverage
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for performance
      
      // Set display size (CSS)
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      // Set actual canvas size in pixels
      const maxSize = 3840 * 2160; // 4K resolution limit
      const targetSize = width * height * dpr * dpr;
      
      // If target size is too large, use a lower DPR
      const adjustedDpr = targetSize > maxSize ? Math.sqrt(maxSize / (width * height)) : dpr;
      
      canvas.width = Math.floor(width * adjustedDpr);
      canvas.height = Math.floor(height * adjustedDpr);
      
      // Scale context to match DPR
      ctx.scale(adjustedDpr, adjustedDpr);
      
      return { ctx, width, height, dpr: adjustedDpr };
    } catch (error) {
      console.error('Canvas setup error:', error);
      setCanvasSupported(false);
      return;
    }
  }, []);
  
  const initPoints = useCallback((width: number, height: number, dpr: number) => {
    try {
      // Adjust density based on screen size and device capability
      const density = isMobile ? 10 : 20; // Reduced point count for better performance
      const area = width * height;
      const numPoints = Math.min(
        Math.floor(area / (30000 / (density / 10))),
        isMobile ? 50 : 100 // Further reduced cap for better performance
      );
      
      const points: { x: number, y: number, vx: number, vy: number }[] = [];
      
      for (let i = 0; i < numPoints; i++) {
        points.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * (isMobile ? 0.03 : 0.06), // Even slower motion
          vy: (Math.random() - 0.5) * (isMobile ? 0.03 : 0.06)
        });
      }
      
      pointsRef.current = points;
      return points;
    } catch (error) {
      console.error('Points initialization error:', error);
      return [];
    }
  }, [isMobile]);
  
  useEffect(() => {
    if (!canvasSupported) return;
    
    // Initial setup with error handling
    try {
      const setup = setCanvasSize();
      if (!setup) return;
      
      const { ctx, width, height, dpr } = setup;
      let points = initPoints(width, height, dpr);
      
      // Force one immediate render to prevent blank canvas on load
      renderFrame(ctx, points, width, height, dpr);
      
      // Optimized draw function with throttled connections
      function renderFrame(ctx: CanvasRenderingContext2D, points: any[], width: number, height: number, dpr: number) {
        try {
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
            // Skip connections on low-end mobile devices for performance
            if (!isMobile || i % 2 === 0) {
              const connectionDistance = isMobile ? 50 : 80;
              const maxConnections = isMobile ? 2 : 4; // Limit max connections
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
                  ctx.globalAlpha = 0.2 - dist / (connectionDistance * 3);
                  ctx.stroke();
                  connectionsCount++;
                }
              }
            }
            
            // Reset global alpha
            ctx.globalAlpha = 1;
            
            // Draw points with consistent colors - simplified for performance
            ctx.fillStyle = i % 3 === 0 ? 'rgba(0, 188, 212, 0.2)' : 'rgba(59, 130, 246, 0.15)';
            ctx.beginPath();
            ctx.arc(p1.x, p1.y, 0.7, 0, Math.PI * 2);
            ctx.fill();
          }
        } catch (renderError) {
          console.error('Canvas render error:', renderError);
        }
      }
      
      // Animation loop with frame rate limiting for performance
      let lastFrameTime = 0;
      const targetFPS = isMobile ? 30 : 50;
      const frameInterval = 1000 / targetFPS;
      
      const animate = (timestamp: number) => {
        if (!ctx) return;
        
        const elapsed = timestamp - lastFrameTime;
        
        // Only render if enough time has passed (frame limiting)
        if (elapsed > frameInterval) {
          lastFrameTime = timestamp - (elapsed % frameInterval);
          renderFrame(ctx, points, width, height, dpr);
        }
        
        animationRef.current = requestAnimationFrame(animate);
      };
      
      // Start animation
      animationRef.current = requestAnimationFrame(animate);
      
      // More responsive resize handler without debounce delay
      const handleResize = () => {
        try {
          const newSetup = setCanvasSize();
          if (!newSetup) return;
          
          const { ctx, width, height, dpr } = newSetup;
          
          // Regenerate points on significant resize for better performance
          if (Math.abs(width - (points[0]?.x || 0)) > width * 0.5) {
            points = initPoints(width, height, dpr);
          } else {
            // Otherwise just adjust existing points
            const widthRatio = width / (points[0]?.x || 1);
            const heightRatio = height / (points[0]?.y || 1);
            
            points.forEach(point => {
              // Ensure points stay within bounds after resize
              point.x = Math.min(width, point.x * widthRatio);
              point.y = Math.min(height, point.y * heightRatio);
            });
          }
          
          // Force immediate render after resize
          renderFrame(ctx, points, width, height, dpr);
        } catch (resizeError) {
          console.error('Resize error:', resizeError);
        }
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
            lastFrameTime = 0; // Reset frame time
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
    } catch (error) {
      console.error('Canvas effect error:', error);
    }
  }, [setCanvasSize, initPoints, isMobile, canvasSupported]);
  
  // Fallback if canvas is not supported or has error
  if (!canvasSupported) {
    return (
      <div 
        className="w-full h-full bg-cyber-dark"
        style={{
          backgroundImage: 'radial-gradient(rgba(0, 188, 212, 0.1) 1px, transparent 1px), radial-gradient(rgba(59, 130, 246, 0.05) 1px, transparent 1px)',
          backgroundSize: '40px 40px, 30px 30px',
          backgroundPosition: '0 0, 20px 20px'
        }}
      />
    );
  }
  
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
