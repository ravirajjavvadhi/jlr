"use client";

import { useEffect, useRef } from 'react';

export default function GoldLiquidCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    // Simple Perlin-like noise function for liquid effect
    const noise = (x: number, y: number, t: number) => {
      return Math.sin(x * 0.01 + t) * Math.cos(y * 0.01 + t * 0.5) +
             Math.sin(y * 0.02 - t * 0.8) * Math.cos(x * 0.02 + t);
    };

    const draw = () => {
      time += 0.01;
      const { width, height } = canvas;
      
      // Create Liquid Metal Gradient
      const gradient = ctx.createRadialGradient(
        width / 2 + Math.cos(time) * 200, 
        height / 2 + Math.sin(time) * 200, 
        0, 
        width / 2, height / 2, width
      );
      
      gradient.addColorStop(0, '#bf953f'); // Deep Gold
      gradient.addColorStop(0.5, '#fcf6ba'); // Mid Gold
      gradient.addColorStop(1, '#8A2387'); // Deep Purple/Obsidian depths for contrast

      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, width, height);

      // Draw flowing "aurum" lanes
      ctx.globalCompositeOperation = 'screen';
      ctx.lineWidth = 2;

      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(191, 149, 63, 0.15)' : 'rgba(252, 246, 186, 0.1)';
        
        for (let x = 0; x < width; x += 10) {
          const y = height / 2 + noise(x, i * 100, time + i) * 150;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Add a central molten orb glow
      const orbGlow = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, 400);
      orbGlow.addColorStop(0, 'rgba(191, 149, 63, 0.1)');
      orbGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = orbGlow;
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = 'source-over';
      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        background: '#000'
      }}
    />
  );
}
