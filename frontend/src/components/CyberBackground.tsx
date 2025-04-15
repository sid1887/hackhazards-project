
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
      const density = window.innerWidth < 768 ? 30 : 50;
      const numPoints = Math.floor((canvas.width * canvas.height) / (10000 / (density / 10)));
      
      for (let i = 0; i < numPoints; i++) {
        points.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3
        });
      }
    };
    
    // Draw the grid
    const drawGrid = () => {
      if (!ctx || !canvas) return;
      
      // Clear canvas with semi-transparent background to create trail effect
      ctx.fillStyle = 'rgba(18, 18, 18, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw connecting lines between close points
      ctx.strokeStyle = 'rgba(217, 70, 239, 0.15)'; // Changed to cyber-pink shade
      ctx.lineWidth = 0.5;
      
      for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        
        // Move point
        p1.x += p1.vx;
        p1.y += p1.vy;
        
        // Bounce off edges
        if (p1.x < 0 || p1.x > canvas.width) p1.vx = -p1.vx;
        if (p1.y < 0 || p1.y > canvas.height) p1.vy = -p1.vy;
        
        // Draw connections
        for (let j = i + 1; j < points.length; j++) {
          const p2 = points[j];
          const dist = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
          
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.globalAlpha = 1 - dist / 100;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
        
        // Create random colored points for more vibrancy
        const colors = ['rgba(14, 165, 233, ', 'rgba(217, 70, 239, ', 'rgba(155, 135, 245, ', 'rgba(16, 185, 129, ']; 
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        ctx.fillStyle = `${randomColor}${Math.random() * 0.5 + 0.5})`;
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, Math.random() * 1.5 + 0.5, 0, Math.PI * 2);
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
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-[-1]" 
    />
  );
};

export default CyberBackground;
