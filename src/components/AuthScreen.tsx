"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, User, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '@/services/authContext';

export default function AuthScreen({ onClose }: { onClose?: () => void }) {

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, signup } = useAuth();

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


  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: '#020202' }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="hologram-card"
        style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', position: 'relative', overflow: 'hidden' }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'var(--accent-gradient)', opacity: 0.5 }} />
        
        {onClose && (
          <button 
            onClick={onClose}
            style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', zIndex: 10 }}
          >
            <X size={20} />
          </button>
        )}

        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            style={{ width: '56px', height: '56px', background: 'var(--accent-gradient)', borderRadius: '14px', margin: '0 auto 1.25rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(0, 242, 254, 0.3)' }}
          >
            <Zap size={28} fill="black" stroke="black" />
          </motion.div>
          <h1 className="text-beast" style={{ fontSize: '1.75rem', marginBottom: '0.25rem', letterSpacing: '4px' }}>JLR AI</h1>
          <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '3px' }}>Supreme Intelligence Node</p>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '0.75rem', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '8px', color: '#ff6b6b', fontSize: '0.7rem', fontWeight: 700, marginBottom: '1.5rem', textAlign: 'center' }}>
            {error.toUpperCase()}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <User size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
            <input 
              type="text"
              required
              placeholder="IDENTITY NAME (USERNAME)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="liquid-input"
              style={{ width: '100%', paddingLeft: '3rem', fontSize: '0.75rem', fontWeight: 700 }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
            <input 
              type="password"
              required
              placeholder="SUPREMACY KEY (PASSWORD)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="liquid-input"
              style={{ width: '100%', paddingLeft: '3rem', fontSize: '0.75rem', fontWeight: 700 }}
            />
          </div>


          <button className="btn-beast" type="submit" disabled={loading} style={{ width: '100%', padding: '0.9rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', letterSpacing: '2px', fontSize: '0.75rem' }}>
            {loading ? 'INITIATING...' : (isLogin ? 'ACTIVATE NODE' : 'ESTABLISH ARCHIVE')}
            {!loading && <ArrowRight size={16} />}
          </button>

        </form>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button 
            onClick={() => setIsLogin(!isLogin)}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer', letterSpacing: '1px' }}
          >
            {isLogin ? "LACKING IDENTITY? ESTABLISH NODE" : "ID ALREADY ACTIVE? INITIATE LINK"}
          </button>
        </div>
      </motion.div>
    </div>

  );
}

