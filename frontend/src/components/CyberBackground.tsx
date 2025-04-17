
import React, { useEffect, useRef } from 'react';

const CyberBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas to full width/height
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    // Create grid points
    let points: { x: number, y: number, vx: number, vy: number }[] = [];
    
    const initPoints = () => {
      points = [];
      const density = window.innerWidth < 768 ? 20 : 30; // Reduced density
      const numPoints = Math.floor((canvas.width * canvas.height) / (20000 / (density / 10)));
      
      for (let i = 0; i < numPoints; i++) {
        points.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.1, // Much slower movement
          vy: (Math.random() - 0.5) * 0.1  // Much slower movement
        });
      }
    };
    
    // Draw the grid
    const drawGrid = () => {
      if (!ctx || !canvas) return;
      
      // Dark overlay with higher opacity for better contrast
      ctx.fillStyle = 'rgba(18, 18, 18, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // More subtle connecting lines
      ctx.strokeStyle = 'rgba(0, 188, 212, 0.07)'; // Subtle blue
      ctx.lineWidth = 0.3; // Thinner lines
      
      for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        
        // Move point
        p1.x += p1.vx;
        p1.y += p1.vy;
        
        // Bounce off edges
        if (p1.x < 0 || p1.x > canvas.width) p1.vx = -p1.vx;
        if (p1.y < 0 || p1.y > canvas.height) p1.vy = -p1.vy;
        
        // Draw connections, but fewer
        for (let j = i + 1; j < points.length; j++) {
          const p2 = points[j];
          const dist = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
          
          if (dist < 80) { // Shorter connection distance
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.globalAlpha = 0.3 - dist / 200; // More subtle opacity
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
        
        // Subtle points
        const colors = ['rgba(0, 188, 212, ', 'rgba(59, 130, 246, ']; 
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        ctx.fillStyle = `${randomColor}${Math.random() * 0.15 + 0.05})`; // Very subtle colors
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, Math.random() * 1 + 0.3, 0, Math.PI * 2); // Smaller points
        ctx.fill();
      }
      
      requestAnimationFrame(drawGrid);
    };
    
    // Handle resize
    const handleResize = () => {
      setCanvasSize();
      initPoints();
    };
    
    // Initialize
    setCanvasSize();
    initPoints();
    drawGrid();
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-[-1] opacity-70" 
    />
  );
};

export default CyberBackground;
