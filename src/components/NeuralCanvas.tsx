"use client";

import React, { useState, useEffect } from 'react';
import { Download, Sparkles, Loader2, Maximize2, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NeuralCanvasProps {
  prompt: string;
}

export default function NeuralCanvas({ prompt }: NeuralCanvasProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [error, setError] = useState(false);
  const [seed] = useState(Math.floor(Math.random() * 1000000));

  useEffect(() => {
    // [SOVEREIGN ENGINE]: Hidden Pollinations fetch
    const encoded = encodeURIComponent(prompt);
    // Use width/height to ensure high quality
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&seed=${seed}`;
    setImageUrl(url);
    setIsLoading(true);
    setError(false);
  }, [prompt, seed]);

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jlr-ai-supreme-canvas-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      // Failsafe download via new tab if fetch fails due to CORS, but try to avoid
      window.open(imageUrl, '_blank');
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          marginTop: '15px',
          padding: '14px',
          borderRadius: '24px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          maxWidth: '512px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Sovereign Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', padding: '0 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
              <Sparkles size={14} />
            </div>
            <span style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.5)' }}>
              Neural Canvas <span style={{ color: '#10b981' }}>// AI Synthesis</span>
            </span>
          </div>
        </div>

        {/* Image Container */}
        <div style={{ 
          position: 'relative', 
          aspectRatio: '1/1', 
          borderRadius: '16px', 
          overflow: 'hidden', 
          background: '#050505',
          border: '1px solid rgba(255,255,255,0.05)',
          cursor: 'pointer'
        }} onClick={() => !isLoading && !error && setIsFullScreen(true)}>
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  background: '#050505',
                  zIndex: 10
                }}
              >
                <Loader2 size={28} className="animate-spin" style={{ color: '#10b981', opacity: 0.7 }} />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '0.6rem', fontWeight: 900, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.25em' }}>Redesigning Art Prompt</p>
                  <p style={{ fontSize: '0.5rem', fontWeight: 600, color: 'rgba(255,255,255,0.2)', marginTop: '6px' }}>JLR SUPREMACY CORE ACTIVE</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <img
            src={imageUrl}
            alt={prompt}
            onLoad={() => setIsLoading(false)}
            onError={() => { setError(true); setIsLoading(false); }}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: error ? 'none' : 'block', opacity: isLoading ? 0 : 1, transition: 'opacity 0.5s ease' }}
          />

          {error && (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,100,100,0.5)', fontSize: '0.7rem', fontWeight: 800 }}>
              NEURAL UPLINK FAILED
            </div>
          )}

          {/* Prompt Overlay (Shown on Hover) */}
          <div className="canvas-overlay" style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
            opacity: 0,
            transition: 'opacity 0.3s',
            display: 'flex',
            alignItems: 'flex-end',
            padding: '20px'
          }}>
            <Maximize2 size={24} style={{ color: '#fff', opacity: 0.8 }} />
          </div>
        </div>

        {/* Controls Footer */}
        {!isLoading && !error && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            marginTop: '16px',
            padding: '0 4px'
          }}>
             <p style={{ 
              fontSize: '0.62rem', 
              color: 'rgba(255,255,255,0.3)', 
              lineHeight: 1.4,
              maxWidth: '80%',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              &ldquo;{prompt}&rdquo;
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                style={{
                  padding: '8px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#10b981',
                  border: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <Download size={16} />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Supreme In-App Viewer Modal */}
      <AnimatePresence>
        {isFullScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              background: 'rgba(0,0,0,0.95)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setIsFullScreen(false)}
          >
            {/* Modal Header */}
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              right: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #00ff9d 0%, #00bc7d 100%)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={18} color="black" />
                </div>
                <div>
                   <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#fff', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px' }}>JLR AI SUPREME CANVAS</h3>
                   <p style={{ margin: 0, fontSize: '0.6rem', color: '#10b981', fontWeight: 800 }}>IDENTITY CONFIRMED // COMMANDER ACCESS</p>
                </div>
              </div>
              <button 
                onClick={() => setIsFullScreen(false)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Main Image */}
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={imageUrl}
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                borderRadius: '12px',
                boxShadow: '0 0 100px rgba(0, 255, 157, 0.1)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
              onClick={(e) => e.stopPropagation()}
            />

            {/* Modal Footer */}
            <div style={{
              position: 'absolute',
              bottom: '40px',
              textAlign: 'center',
              maxWidth: '800px',
              padding: '0 20px'
            }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontStyle: 'italic', marginBottom: '20px' }}>&ldquo;{prompt}&rdquo;</p>
              <button 
                onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                style={{
                  background: '#fff',
                  color: '#000',
                  border: 'none',
                  padding: '12px 30px',
                  borderRadius: '50px',
                  fontSize: '0.8rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  margin: '0 auto'
                }}
              >
                <Download size={18} /> SAVE TO ARCHIVE
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .canvas-overlay:hover {
          opacity: 1 !important;
        }
      `}</style>
    </>
  );
}
