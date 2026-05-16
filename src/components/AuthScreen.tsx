"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, User, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/services/authContext';
import GoldLiquidCanvas from './GoldLiquidCanvas';
import RotatingBeast from './RotatingBeast';

export default function AuthScreen({ onClose }: { onClose?: () => void }) {
  const [isMobile, setIsMobile] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loginWithGoogle, signup } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'AUTHENTICATION FAILED');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'GOOGLE AUTH FAILED');
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      height: '100dvh', 
      width: '100vw', 
      position: 'fixed', 
      inset: 0, 
      background: '#000', 
      overflow: 'hidden', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <GoldLiquidCanvas />
      
      {/* 3D Depth Particles Overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.6) 100%)', zIndex: 1, pointerEvents: 'none' }} />

      {/* SOVEREIGN GOLD FORM CONTAINER */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        style={{ 
          width: '100%', 
          maxWidth: '500px', 
          padding: isMobile ? '2.5rem 1.5rem' : '4rem', 
          zIndex: 10,
          position: 'relative',
          perspective: '1200px'
        }}
      >
        {/* Layered Glass Depth Background */}
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          background: 'rgba(5, 5, 5, 0.5)', 
          backdropFilter: 'blur(80px) saturate(220%)', 
          border: '1px solid rgba(191, 149, 63, 0.2)',
          borderRadius: '48px',
          zIndex: -1,
          boxShadow: '0 80px 150px rgba(0,0,0,0.9), inset 0 0 20px rgba(191, 149, 63, 0.05)'
        }} />

        <div style={{ textAlign: 'center', marginBottom: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <RotatingBeast size={80} className="mb-6" />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <h1 className="text-gold" style={{ fontSize: isMobile ? '2.5rem' : '4rem', fontWeight: 900, marginBottom: '0.2rem', letterSpacing: '4px', lineHeight: 1 }}>
              JLR AI
            </h1>
            <h2 style={{ 
              fontFamily: 'Montserrat', 
              fontSize: '0.7rem', 
              fontWeight: 900, 
              letterSpacing: '12px', 
              color: 'rgba(191,149,63,0.9)', 
              textTransform: 'uppercase',
              marginTop: '0.5rem'
            }}>
              SUPREMACY
            </h2>
          </motion.div>
          
          <div style={{ 
            width: '80px', 
            height: '2px', 
            background: 'linear-gradient(to right, transparent, var(--gold-mid), transparent)', 
            margin: '2rem auto', 
            opacity: 0.6 
          }} />
        </div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '1rem', background: 'rgba(255, 62, 62, 0.05)', border: '1px solid rgba(255, 62, 62, 0.2)', borderRadius: '14px', color: '#ff3e3e', fontSize: '0.7rem', fontWeight: 800, marginBottom: '2.5rem', textAlign: 'center', letterSpacing: '1px' }}>
            {error.toUpperCase()}
          </motion.div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          <motion.button 
            whileHover={{ scale: 1.03, background: 'rgba(191, 149, 63, 0.1)' }}
            whileTap={{ scale: 0.97 }}
            onClick={handleGoogleLogin}
            disabled={loading} 
            style={{ width: '100%', padding: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', fontSize: '0.85rem', fontWeight: 900, background: 'transparent', border: '1px solid rgba(191, 149, 63, 0.4)', borderRadius: '24px', color: '#fff', cursor: 'pointer', letterSpacing: '2px', transition: 'all 0.3s' }}
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" style={{ width: '20px', height: '20px', filter: 'brightness(2)' }} />
            {loading ? 'SYNCHRONIZING...' : 'AUTHORIZE WITH GOOGLE'}
          </motion.button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', opacity: 0.3 }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--gold-mid)' }} />
            <ShieldCheck size={14} color="var(--gold-mid)" />
            <div style={{ flex: 1, height: '1px', background: 'var(--gold-mid)' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ position: 'relative' }}>
               <User size={16} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(191,149,63,0.4)' }} />
               <input 
                type="email"
                required
                placeholder="OPERATOR IDENTITY"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="gold-etched-input"
                style={{ width: '100%', padding: '1.25rem 1.25rem 1.25rem 3rem', borderRadius: '20px', outline: 'none', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '1px' }}
              />
            </div>
            
            <div style={{ position: 'relative' }}>
               <Lock size={16} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(191,149,63,0.4)' }} />
               <input 
                type="password"
                required
                placeholder="ENCRYPTION KEY"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="gold-etched-input"
                style={{ width: '100%', padding: '1.25rem 1.25rem 1.25rem 3rem', borderRadius: '20px', outline: 'none', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '1px' }}
              />
            </div>

            <motion.button 
              whileHover={{ scale: 1.03, boxShadow: '0 0 50px rgba(191, 149, 63, 0.5)' }}
              whileTap={{ scale: 0.97 }}
              type="submit" 
              disabled={loading} 
              style={{ width: '100%', padding: '1.3rem', marginTop: '1.5rem', fontSize: '1rem', fontWeight: 900, background: 'var(--gold-gradient)', border: 'none', borderRadius: '24px', color: '#000', cursor: 'pointer', letterSpacing: '4px', textTransform: 'uppercase' }}
            >
              {loading ? 'AUTHORIZING...' : (isLogin ? 'ACCESS CORE' : 'INITIALIZE')}
            </motion.button>
          </form>

          <button 
            onClick={() => setIsLogin(!isLogin)}
            style={{ background: 'transparent', border: 'none', color: 'var(--gold-mid)', fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer', marginTop: '1.5rem', letterSpacing: '2px', opacity: 0.6 }}
          >
            {isLogin ? "NEW COMMANDER? INITIALIZE ACCESS" : "KNOWN OPERATOR? ACCESS CORE"}
          </button>
        </div>

        {onClose && (
          <button 
            onClick={onClose}
            style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(191, 149, 63, 0.1)', border: '1px solid rgba(191, 149, 63, 0.2)', borderRadius: '50%', color: 'var(--gold-mid)', cursor: 'pointer', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}
          >
            <X size={18} />
          </button>
        )}
      </motion.div>
      
      {/* CINEMATIC SCANLINE */}
      <div className="scanlines" style={{ opacity: 0.1, zIndex: 5 }} />
    </div>
  );
}
