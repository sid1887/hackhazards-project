
import React, { useEffect, useRef } from 'react';

const HeroParticles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = 600;
    
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
    
    // Create particles
    const createParticles = () => {
      const particleCount = Math.min(window.innerWidth / 20, 30); // Reduced particle count
      
      for (let i = 0; i < particleCount; i++) {
        const size = Math.random() * 2 + 0.5; // Smaller particles
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const speedX = Math.random() * 0.3 - 0.15; // Slower movement
        const speedY = Math.random() * 0.3 - 0.15; // Slower movement
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        particlesArray.push({
          x, y, size, speedX, speedY, color
        });
      }
    };
    
    // Animate particles
    const animate = () => {
      // Semi-transparent clearing for subtle trailing effect
      ctx.fillStyle = 'rgba(15, 15, 15, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      for (let i = 0; i < particlesArray.length; i++) {
        const p = particlesArray[i];
        
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        
        p.x += p.speedX;
        p.y += p.speedY;
        
        // Bounce particles off edges
        if (p.x < 0 || p.x > canvas.width) {
          p.speedX = -p.speedX;
        }
        
        if (p.y < 0 || p.y > canvas.height) {
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
      
      requestAnimationFrame(animate);
    };
    
    // Handle resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = 600;
      particlesArray.length = 0;
      createParticles();
    };
    
    createParticles();
    animate();
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="absolute top-0 left-0 w-full h-[600px] pointer-events-none opacity-60" 
    />
  );
};

export default HeroParticles;
