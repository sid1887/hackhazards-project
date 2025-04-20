import React, { useEffect, useRef, useCallback } from 'react';

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
  
  // Memoized function to set canvas size
  const setCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Use window dimensions for full-page coverage
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
  
  // Create particles function
  const createParticles = useCallback((width: number, height: number) => {
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
    
    // Scale particle count with viewport size
    const particleCount = Math.min(Math.floor((width * height) / 20000), 50);
    
    for (let i = 0; i < particleCount; i++) {
      const size = Math.random() * 2 + 0.5; // Smaller particles
      const x = Math.random() * width;
      const y = Math.random() * height;
      const speedX = Math.random() * 0.3 - 0.15; // Slower movement
      const speedY = Math.random() * 0.3 - 0.15; // Slower movement
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      particlesArray.push({
        x, y, size, speedX, speedY, color
      });
    }
    
    particlesArrayRef.current = particlesArray;
    return particlesArray;
  }, []);
  
  useEffect(() => {
    // Initial setup
    const setup = setCanvasSize();
    if (!setup) return;
    
    const { ctx, width, height } = setup;
    let particlesArray = createParticles(width, height);
    
    // Animate particles
    const animate = () => {
      if (!ctx) return;
      
      // Semi-transparent clearing for subtle trailing effect
      ctx.fillStyle = 'rgba(15, 15, 15, 0.2)';
      ctx.fillRect(0, 0, width, height);
      
      for (let i = 0; i < particlesArray.length; i++) {
        const p = particlesArray[i];
        
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        
        p.x += p.speedX;
        p.y += p.speedY;
        
        // Bounce particles off edges
        if (p.x < 0 || p.x > width) {
          p.speedX = -p.speedX;
        }
        
        if (p.y < 0 || p.y > height) {
          p.speedY = -p.speedY;
        }
        
        // Connect particles with lines - less connections, more subtle
        for (let j = i; j < particlesArray.length; j++) {
          const dx = particlesArray[i].x - particlesArray[j].x;
          const dy = particlesArray[i].y - particlesArray[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 80) { // Reduced connection distance
            ctx.beginPath();
            ctx.strokeStyle = p.color;
            ctx.globalAlpha = 0.5 - distance / 160; // More subtle lines
            ctx.lineWidth = 0.3; // Thinner lines
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(particlesArray[j].x, particlesArray[j].y);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Handle resize
    const handleResize = () => {
      const newSetup = setCanvasSize();
      if (!newSetup) return;
      
      const { width, height } = newSetup;
      particlesArray = createParticles(width, height);
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
    
    // Start the animation
    animate();
    
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
  }, [setCanvasSize, createParticles]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full"
      style={{ width: '100%', height: '100%', display: 'block' }}
      aria-hidden="true"
    />
  );
};

export default HeroParticles;
