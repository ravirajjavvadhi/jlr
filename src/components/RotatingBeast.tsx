"use client";

import { motion } from 'framer-motion';

export default function RotatingBeast({ size = 60, className = "" }: { size?: number, className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {/* Outer Rotating Halo */}
      <div
        className="beast-rotate-clockwise"
        style={{
          position: 'absolute',
          inset: -4,
          borderRadius: '50%',
          border: '1px solid rgba(191, 149, 63, 0.2)',
          borderTopColor: 'rgba(191, 149, 63, 0.8)',
          zIndex: 0
        }}
      />
      
      {/* Inner Rotating Lion Core */}
      <div
        className="beast-rotate-counter"
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 2,
          mixBlendMode: 'screen', 
          clipPath: 'circle(48%)',
          willChange: 'transform'
        }}
      >
        <img 
          src="/lion-core.png" 
          alt="JLR Lion Core" 
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'contain',
            imageRendering: 'auto', 
          }} 
        />
      </div>

      {/* Static Glow Core */}
      <div style={{
        position: 'absolute',
        inset: '15%',
        background: 'radial-gradient(circle, rgba(191,149,63,0.3) 0%, transparent 70%)',
        filter: 'blur(15px)',
        zIndex: 1,
        pointerEvents: 'none'
      }} />
    </div>
  );
}
