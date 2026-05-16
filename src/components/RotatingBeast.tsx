"use client";

import { motion } from 'framer-motion';

export default function RotatingBeast({ size = 60, className = "" }: { size?: number, className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {/* Outer Rotating Halo */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
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
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 2,
          mixBlendMode: 'screen', // Makes the black background transparent
          clipPath: 'circle(48%)', // Ensures no square edge artifacts remain
        }}
      >
        <img 
          src="/lion-core.png" 
          alt="JLR Lion Core" 
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'contain',
            imageRendering: 'crisp-edges', // Keep it sharp as requested
          }} 
        />
      </motion.div>

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
