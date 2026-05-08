"use client";

import React, { useState, useEffect } from 'react';
import { Download, Sparkles, Loader2, Maximize2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NeuralCanvasProps {
  prompt: string;
}

export default function NeuralCanvas({ prompt }: NeuralCanvasProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [seed] = useState(Math.floor(Math.random() * 1000000));

  useEffect(() => {
    // [TRICK]: Pollinations.ai free unlimited engine
    const encoded = encodeURIComponent(prompt);
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
      a.download = `jlr-ai-canvas-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      window.open(imageUrl, '_blank');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        marginTop: '15px',
        padding: '12px',
        borderRadius: '20px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        maxWidth: '512px',
        width: '100%',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Sovereign Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
            <Sparkles size={14} />
          </div>
          <span style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.6)' }}>
            Neural Canvas <span style={{ color: '#10b981' }}>// Activated</span>
          </span>
        </div>
      </div>

      {/* Image Container */}
      <div style={{ 
        position: 'relative', 
        aspectRatio: '1/1', 
        borderRadius: '12px', 
        overflow: 'hidden', 
        background: '#000',
        border: '1px solid rgba(255,255,255,0.05)'
      }}>
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
              <Loader2 size={32} className="animate-spin" style={{ color: '#10b981', opacity: 0.8 }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.6rem', fontWeight: 900, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Redesigning Art Prompt</p>
                <p style={{ fontSize: '0.5rem', fontWeight: 500, color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>Synchronizing Neural Nodes...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <img
          src={imageUrl}
          alt={prompt}
          onLoad={() => setIsLoading(false)}
          onError={() => { setError(true); setIsLoading(false); }}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: error ? 'none' : 'block' }}
        />

        {error && (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
            Neural Uplink Interrupted.
          </div>
        )}

        {/* Hover Controls */}
        {!isLoading && !error && (
          <div style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            display: 'flex',
            gap: '8px'
          }}>
            <button
              onClick={handleDownload}
              style={{
                padding: '8px',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.7)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Download size={16} />
            </button>
            <button
              onClick={() => window.open(imageUrl, '_blank')}
              style={{
                padding: '8px',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.7)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ExternalLink size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Prompt Footer */}
      <div style={{ marginTop: '12px', padding: '0 4px' }}>
        <p style={{ 
          fontSize: '0.62rem', 
          color: 'rgba(255,255,255,0.4)', 
          lineHeight: 1.4,
          fontStyle: 'italic'
        }}>
          &ldquo;{prompt.length > 120 ? prompt.substring(0, 120) + '...' : prompt}&rdquo;
        </p>
      </div>
    </motion.div>
  );
}
