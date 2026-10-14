'use client';

import { useEffect, useRef } from 'react';

// Optimized trail length to improve performance
const TRAIL_LENGTH = 5;

// Base size of the trail.
const POINT_SIZE = 4;

export function CursorFollower() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef(
    Array.from({ length: TRAIL_LENGTH }, () => ({
      x: 0,
      y: 0,
      dx: 0,
      dy: 0,
    }))
  );
  const mousePos = useRef({ x: -1000, y: -1000 }); // Start off-screen
  const animationFrameId = useRef<number>();
  const primaryColorRef = useRef('hsl(207, 68%, 53%)'); // Default primary color

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Get the primary color from CSS variables to match the site's theme
    try {
        const colorValue = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
        if(colorValue) primaryColorRef.current = colorValue;
    } catch (e) {
        console.warn("Could not read --primary color for cursor effect, using default.");
    }
    
    const primaryHsl = primaryColorRef.current.split(' ').map(parseFloat);
    const primaryColor = `hsl(${primaryHsl[0]}, ${primaryHsl[1]}%, ${primaryHsl[2]}%)`;
    const glowColor = `hsla(${primaryHsl[0]}, ${primaryHsl[1]}%, ${primaryHsl[2]}%, 0.5)`;


    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      // Use retina resolution for sharper drawing
      canvas.width = window.innerWidth * 2; 
      canvas.height = window.innerHeight * 2;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(2, 2);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
    };

    const updatePoints = () => {
      let x = mousePos.current.x;
      let y = mousePos.current.y;

      pointsRef.current.forEach((p) => {
        const prevX = p.x;
        const prevY = p.y;
        
        // Easing/spring effect for smooth trailing
        p.dx = (x - p.x) * 0.85; 
        p.dy = (y - p.y) * 0.85;

        p.x += p.dx;
        p.y += p.dy;

        // The next point will trail the previous one
        x = prevX;
        y = prevY;
      });
    };

    const draw = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      let lastPoint = pointsRef.current[0];

      // 1. Draw the outer glowing "blade"
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = POINT_SIZE;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 20;

      for (let i = 1; i < TRAIL_LENGTH; i++) {
        const point = pointsRef.current[i];
        ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();

      // 2. Draw the bright white "core" for the light saber effect
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.strokeStyle = 'white';
      ctx.lineWidth = POINT_SIZE / 2.5; // Thinner core
      ctx.shadowBlur = 0; // No glow for the core

      for (let i = 1; i < TRAIL_LENGTH; i++) {
        const point = pointsRef.current[i];
        ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();
    };

    const animate = () => {
      updatePoints();
      draw();
      animationFrameId.current = requestAnimationFrame(animate);
    };
    
    // Initial setup
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    document.addEventListener('mousemove', handleMouseMove);
    animationFrameId.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      window.removeEventListener('resize', resizeCanvas);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="hidden md:block fixed top-0 left-0 w-full h-full pointer-events-none z-[9999]"
    />
  );
}
