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
    <div style={{ height: '100dvh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: '#020202', overflow: 'hidden' }}>
      {/* Cinematic Backdrop Elements */}
      <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(255, 215, 0, 0.05) 0%, transparent 70%)', filter: 'blur(50px)', zIndex: 0 }} />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: '440px', padding: '3rem 2rem', position: 'relative', background: 'rgba(10, 10, 10, 0.7)', backdropFilter: 'blur(30px)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', zIndex: 1 }}
      >
        {/* PEAK BRANDING */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
             <h1 className="text-gold" style={{ 
               fontFamily: "'Syncopate', sans-serif", 
               fontSize: '2.5rem', 
               fontWeight: 700, 
               letterSpacing: '12px', 
               margin: 0,
               textTransform: 'uppercase',
               paddingLeft: '12px' // Offset for tracking
             }}>
               JLR AI
             </h1>
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: '60px' }}
               style={{ height: '2px', background: 'var(--gold-glow)', margin: '15px auto', opacity: 0.6 }}
             />
             <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '4px' }}>Supreme Intelligence Node</p>
          </motion.div>
        </div>

        {onClose && (
          <button 
            onClick={onClose}
            style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '50%', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', zIndex: 10, width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={16} />
          </button>
        )}

        {error && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ padding: '0.85rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', color: '#f87171', fontSize: '0.7rem', fontWeight: 800, marginBottom: '2rem', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {error}
          </motion.div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoogleLogin}
            disabled={loading} 
            style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', letterSpacing: '2px', fontSize: '0.75rem', fontWeight: 800, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', color: '#fff', cursor: 'pointer' }}
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" style={{ width: '18px', height: '18px' }} />
            {loading ? 'SYNCHRONIZING...' : 'ACTIVATE VIA GOOGLE'}
          </motion.button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', opacity: 0.1 }}>
            <div style={{ flex: 1, height: '1px', background: '#fff' }} />
            <span style={{ fontSize: '0.6rem', fontWeight: 900 }}>IDENTITY BRIDGE</span>
            <div style={{ flex: 1, height: '1px', background: '#fff' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#B8860B', opacity: 0.6 }} />
              <input 
                type="text"
                required
                placeholder="IDENTITY NODE ID"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.1rem 1.1rem 1.1rem 3.5rem', color: '#fff', fontSize: '0.85rem', fontWeight: 600, outline: 'none' }}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#B8860B', opacity: 0.6 }} />
              <input 
                type="password"
                required
                placeholder="SUPREMACY ACCESS KEY"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.1rem 1.1rem 1.1rem 3.5rem', color: '#fff', fontSize: '0.85rem', fontWeight: 600, outline: 'none' }}
              />
            </div>

            <motion.button 
              whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(184, 134, 11, 0.2)' }}
              whileTap={{ scale: 0.98 }}
              type="submit" 
              disabled={loading} 
              style={{ width: '100%', padding: '1.1rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', letterSpacing: '4px', fontSize: '0.8rem', fontWeight: 900, background: 'var(--gold-glow)', border: 'none', borderRadius: '16px', color: '#000', cursor: 'pointer', textTransform: 'uppercase' }}
            >
              {loading ? 'INITIATING...' : (isLogin ? 'ACTIVATE NODE' : 'ESTABLISH LINK')}
              {!loading && <ArrowRight size={18} />}
            </motion.button>
          </form>

          <button 
            onClick={() => setIsLogin(!isLogin)}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '1rem' }}
          >
            {isLogin ? "LACKING IDENTITY? ESTABLISH NODE" : "ID ALREADY ACTIVE? INITIATE LINK"}
          </button>
        </div>
      </motion.div>
    </div>

  );
}

