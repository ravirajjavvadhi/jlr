"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Zap, Shield, Save, Check, Settings as SettingsIcon } from 'lucide-react';

type SettingsProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function Settings({ isOpen, onClose }: SettingsProps) {
  const [userName, setUserName] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    setUserName(localStorage.getItem('user_name') || 'ravirajjavvadi');

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, [isOpen]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const saveSettings = () => {
    localStorage.setItem('user_name', userName);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}
          />
          
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="hologram-card"
            style={{ position: 'relative', width: '100%', maxWidth: '400px', background: '#050505', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--glass-border)', padding: '2rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '32px', height: '32px', background: 'var(--accent-gradient)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <SettingsIcon size={18} color="black" />
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '1px' }}>SYSTEM SETTINGS</h2>
              </div>
              <button onClick={onClose} className="btn-ghost" style={{ padding: '6px' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <section>
                <label style={{ fontSize: '0.65rem', fontWeight: 900, opacity: 0.5, letterSpacing: '1.5px', marginBottom: '0.8rem', display: 'block' }}>OPERATOR DESIGNATION</label>
                <div style={{ position: 'relative' }}>
                  <User size={14} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                  <input 
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter Name"
                    className="liquid-input"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', padding: '0.8rem 1rem 0.8rem 2.8rem', borderRadius: '12px', width: '100%' }}
                  />
                </div>
              </section>

              {deferredPrompt && (
                <section>
                  <label style={{ fontSize: '0.65rem', fontWeight: 900, opacity: 0.5, letterSpacing: '1.5px', marginBottom: '0.8rem', display: 'block' }}>LOCAL DEPLOYMENT</label>
                  <button 
                    onClick={handleInstall}
                    style={{ 
                      width: '100%', 
                      padding: '1rem', 
                      background: 'rgba(59, 130, 246, 0.1)', 
                      border: '1px solid rgba(59, 130, 246, 0.2)', 
                      borderRadius: '14px', 
                      color: '#3b82f6', 
                      fontSize: '0.8rem', 
                      fontWeight: 800, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '0.75rem',
                      cursor: 'pointer',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                  >
                    <Zap size={16} fill="#3b82f6" /> DOWNLOAD AS APP
                  </button>
                </section>
              )}

              <div className="hologram-card" style={{ padding: '1rem', background: 'rgba(0, 255, 157, 0.03)', border: '1px solid rgba(0, 255, 157, 0.1)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', fontWeight: 900, color: 'var(--accent-beast)', marginBottom: '0.5rem' }}>
                  <Shield size={12} /> SUPREMACY CORE ACTIVE
                </div>
                <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                  The Intelligence Core is under absolute synchronization.
                </p>
              </div>
            </div>

            <button 
              onClick={saveSettings} 
              className="btn-beast" 
              style={{ width: '100%', marginTop: '2rem', height: '50px', justifyContent: 'center', boxShadow: isSaved ? '0 0 30px var(--accent-beast)' : 'none' }}
            >
              {isSaved ? <><Check size={18} /> UPDATED</> : <><Save size={18} /> SAVE CHANGES</>}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
