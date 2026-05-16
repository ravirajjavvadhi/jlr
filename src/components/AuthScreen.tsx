"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, User, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '@/services/authContext';

export default function AuthScreen({ onClose }: { onClose?: () => void }) {

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loginWithGoogle, signup } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div style={{ height: '100dvh', width: '100vw', position: 'fixed', inset: 0, background: '#000', overflow: 'hidden', display: 'flex', flexDirection: isLogin ? 'row' : 'row-reverse' }}>
      {/* LEFT/RIGHT CINEMATIC HERO (Hidden on Mobile) */}
      {!onClose && (
        <div style={{ flex: 1, display: isLogin ? (window.innerWidth < 768 ? 'none' : 'flex') : 'flex', position: 'relative', overflow: 'hidden', background: '#050505', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, rgba(0, 210, 255, 0.05) 0%, transparent 70%)', zIndex: 0 }} />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5 }}
            style={{ textAlign: 'center', zIndex: 1 }}
          >
            <Zap size={80} style={{ color: 'var(--accent-primary)', marginBottom: '2rem', filter: 'drop-shadow(0 0 20px rgba(0,210,255,0.4))' }} />
            <h2 style={{ fontFamily: 'var(--font-brand)', fontSize: '3rem', fontWeight: 900, letterSpacing: '8px', color: '#fff', textTransform: 'uppercase' }}>JLR AI</h2>
            <p style={{ fontSize: '0.8rem', opacity: 0.4, letterSpacing: '4px', marginTop: '1rem', fontWeight: 700 }}>SOVEREIGN INTELLIGENCE CORE</p>
          </motion.div>
        </div>
      )}

      {/* AUTH FORM SECTION */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'rgba(2,2,2,0.95)', backdropFilter: 'blur(40px)', position: 'relative', zIndex: 10 }}>
        {/* Mobile Background Glow */}
        <div style={{ position: 'absolute', top: '10%', left: '10%', width: '200px', height: '200px', background: 'rgba(0, 210, 255, 0.1)', filter: 'blur(100px)', zIndex: -1 }} />

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ width: '100%', maxWidth: '400px', position: 'relative' }}
        >
          {/* HEADER */}
          <div style={{ marginBottom: '3rem' }}>
             <h3 style={{ fontSize: '0.7rem', fontWeight: 900, letterSpacing: '4px', color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
               {isLogin ? 'Protocol: Login' : 'Protocol: Initialize'}
             </h3>
             <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
               {isLogin ? 'Welcome, Commander.' : 'Create your identity.'}
             </h1>
          </div>

          {onClose && (
            <button 
              onClick={onClose}
              style={{ position: 'absolute', top: '-2rem', right: '0', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '50%', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', zIndex: 10, width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={16} />
            </button>
          )}

          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '1rem', background: 'rgba(255, 62, 62, 0.08)', border: '1px solid rgba(255, 62, 62, 0.15)', borderRadius: '12px', color: '#ff3e3e', fontSize: '0.75rem', fontWeight: 700, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Zap size={14} /> {error}
            </motion.div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <motion.button 
              whileHover={{ scale: 1.01, background: 'rgba(255,255,255,0.06)' }}
              whileTap={{ scale: 0.99 }}
              onClick={handleGoogleLogin}
              disabled={loading} 
              style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', fontSize: '0.85rem', fontWeight: 700, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '16px', color: '#fff', cursor: 'pointer', transition: 'all 0.3s' }}
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" style={{ width: '18px', height: '18px' }} />
              {loading ? 'SYNCHRONIZING...' : 'CONTINUE WITH GOOGLE'}
            </motion.button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.5rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
              <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'rgba(255,255,255,0.2)', letterSpacing: '2px' }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ position: 'relative' }}>
                <input 
                  type="email"
                  required
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '14px', padding: '1rem 1.25rem', color: '#fff', fontSize: '0.9rem', outline: 'none', transition: 'border 0.3s' }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                />
              </div>

              <div style={{ position: 'relative' }}>
                <input 
                  type="password"
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '14px', padding: '1rem 1.25rem', color: '#fff', fontSize: '0.9rem', outline: 'none', transition: 'border 0.3s' }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
                />
              </div>

              <motion.button 
                whileHover={{ transform: 'translateY(-2px)', boxShadow: '0 8px 30px rgba(0, 210, 255, 0.3)' }}
                whileTap={{ scale: 0.98 }}
                type="submit" 
                disabled={loading} 
                style={{ width: '100%', padding: '1rem', marginTop: '1rem', fontSize: '0.9rem', fontWeight: 900, background: 'var(--accent-gradient)', border: 'none', borderRadius: '16px', color: '#fff', cursor: 'pointer', transition: 'all 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}
              >
                {loading ? 'INITIALIZING...' : (isLogin ? 'LOGIN' : 'SIGN UP')}
                {!loading && <ArrowRight size={18} />}
              </motion.button>
            </form>

            <button 
              onClick={() => setIsLogin(!isLogin)}
              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', marginTop: '1rem' }}
            >
              {isLogin ? "DON'T HAVE AN ACCOUNT? SIGN UP" : "ALREADY HAVE AN ACCOUNT? LOGIN"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

