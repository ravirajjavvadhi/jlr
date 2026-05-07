"use client";

import { motion } from 'framer-motion';
import { Zap, Wifi, Battery, SignalHigh } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function SovereignStatusBar() {
  const [time, setTime] = useState('');
  
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const triggerIsland = () => {
    // If disabled, enable it first
    if (localStorage.getItem('neural_island_enabled') !== 'true') {
      localStorage.setItem('neural_island_enabled', 'true');
    }
    // Dispatch event to force refresh and expand
    window.dispatchEvent(new CustomEvent('neural-island-toggle'));
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      height: '32px', 
      background: 'rgba(0,0,0,0.4)', 
      backdropFilter: 'blur(10px)',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      padding: '0 16px', 
      zIndex: 10000,
      fontSize: '11px',
      fontWeight: 900,
      letterSpacing: '0.5px',
      color: 'rgba(255,255,255,0.7)',
      pointerEvents: 'none'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>{time}</span>
        <div style={{ width: '4px', height: '4px', background: 'var(--accent-beast)', borderRadius: '50%' }} />
        <span style={{ fontSize: '9px', opacity: 0.5 }}>JLR SECURE</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', pointerEvents: 'auto' }}>
        <div style={{ display: 'flex', gap: '4px', opacity: 0.4 }}>
          <SignalHigh size={12} />
          <Wifi size={12} />
          <Battery size={12} />
        </div>
        
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={triggerIsland}
          className="hover-glow"
          style={{ 
            background: 'var(--beast-gradient)', 
            border: 'none', 
            borderRadius: '6px', 
            width: '20px', 
            height: '20px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 0 10px rgba(0, 255, 157, 0.4)'
          }}
        >
          <Zap size={12} fill="black" stroke="black" />
        </motion.button>
      </div>
    </div>
  );
}
