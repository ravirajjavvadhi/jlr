"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Download, Sparkles, Loader2, Maximize2, X, RefreshCw, Wand2, Layers, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NeuralCanvasProps {
  prompt: string;
  userId?: string;
}

type Phase = 'architecting' | 'rendering' | 'ranking' | 'done' | 'error';

export default function NeuralCanvas({ prompt, userId }: NeuralCanvasProps) {
  const [architecture, setArchitecture] = useState<any>(null);
  const [phase, setPhase] = useState<Phase>('architecting');
  const [selectedSeed, setSelectedSeed] = useState<number | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fullScreenUrl, setFullScreenUrl] = useState('');
  const [regenerateCount, setRegenerateCount] = useState(0);
  const hasFetched = useRef(false);

  const performArchitecture = async () => {
    setPhase('architecting');
    setArchitecture(null);
    setLoadedImages(new Set());
    setSelectedSeed(null);

    try {
      const res = await fetch('/api/image/architect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, userId })
      });

      if (!res.ok) throw new Error('Architect API failed');
      const data = await res.json();
      setArchitecture(data);
      setPhase('rendering');
    } catch (e) {
      console.error('[NeuralCanvas] Architecture failed:', e);
      // Failsafe architecture
      setArchitecture({
        enhanced: `${prompt}, cinematic, masterpiece, 8k`,
        negative: "blurry, low quality",
        style: "Standard",
        seeds: [123, 456, 789, 101]
      });
      setPhase('rendering');
    }
  };

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      performArchitecture();
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    if (regenerateCount > 0) performArchitecture();
  }, [regenerateCount]); // eslint-disable-line

  const handleImageLoad = (seed: number) => {
    setLoadedImages(prev => {
      const next = new Set(prev);
      next.add(seed);
      // Auto-select first loaded image as "Best Choice" initially
      if (next.size === 1) setSelectedSeed(seed);
      if (next.size === architecture?.seeds.length) setPhase('done');
      return next;
    });
  };

  const getPollinationsUrl = (seed: number) => {
    if (!architecture) return '';
    const encodedPrompt = encodeURIComponent(architecture.enhanced);
    const encodedNegative = encodeURIComponent(architecture.negative);
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux&negative=${encodedNegative}`;
  };

  const handleDownload = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `jlr-ai-masterpiece-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  const currentImageUrl = selectedSeed ? getPollinationsUrl(selectedSeed) : '';

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          marginTop: '20px',
          borderRadius: '28px',
          background: 'linear-gradient(135deg, #0a0a0c 0%, #050507 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          maxWidth: '600px',
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 40px 80px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.02)',
        }}
      >
        {/* Sovereign Header 4.0 */}
        <div style={{
          padding: '18px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 15px rgba(16,185,129,0.3)'
            }}>
              <Wand2 size={16} color="black" strokeWidth={2.5} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#fff' }}>
                Sovereign Architect <span style={{ color: '#10b981' }}>// v4.0</span>
              </p>
              <p style={{ margin: 0, fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: '1px' }}>
                FLUX ENGINE // INTELLIGENCE LAYER ACTIVE
              </p>
            </div>
          </div>
          {phase === 'done' && (
             <button
               onClick={() => setRegenerateCount(c => c + 1)}
               style={{
                 background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                 borderRadius: '8px', padding: '6px 10px', color: 'rgba(255,255,255,0.5)',
                 display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                 fontSize: '0.6rem', fontWeight: 800, transition: 'all 0.2s'
               }}
             >
               <RefreshCw size={12} /> RE-ARCHITECT
             </button>
          )}
        </div>

        <div style={{ padding: '20px' }}>
          {/* Main Stage */}
          <div style={{
            position: 'relative',
            aspectRatio: '1/1',
            borderRadius: '20px',
            overflow: 'hidden',
            background: '#020202',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)'
          }}>
            <AnimatePresence>
              {(phase === 'architecting' || phase === 'rendering') && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    position: 'absolute', inset: 0, zIndex: 10,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: '20px', background: 'radial-gradient(circle at center, rgba(16,185,129,0.08) 0%, #020202 80%)'
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid rgba(16,185,129,0.1)', borderTopColor: '#10b981' }}
                    />
                    <Sparkles style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#10b981' }} size={24} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 900, color: '#10b981', letterSpacing: '2px', textTransform: 'uppercase' }}>
                      {phase === 'architecting' ? 'Expanding Prompt Intelligence' : 'Synthesizing Quantum Variants'}
                    </p>
                    <p style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.2)', marginTop: '6px', fontWeight: 700 }}>
                      {phase === 'architecting' ? 'Injecting Cinematic Logic & Skin Morphology...' : 'Processing 4 Parallel Neural Streams...'}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hidden parallel loaders for seeds */}
            {architecture && (
              <div style={{ display: 'none' }}>
                {architecture.seeds.map((seed: number) => (
                  <img key={seed} src={getPollinationsUrl(seed)} onLoad={() => handleImageLoad(seed)} alt="" />
                ))}
              </div>
            )}

            {/* Active Display */}
            {currentImageUrl && (
              <img
                src={currentImageUrl}
                alt={prompt}
                style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  opacity: phase === 'done' ? 1 : 0.3,
                  transition: 'opacity 1s ease'
                }}
                onClick={() => phase === 'done' && (setFullScreenUrl(currentImageUrl), setIsFullScreen(true))}
              />
            )}
          </div>

          {/* Variant Selector / Image Ranking */}
          {architecture && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Layers size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
                <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Architecture Variants
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {architecture.seeds.map((seed: number, idx: number) => {
                  const isLoaded = loadedImages.has(seed);
                  const isSelected = selectedSeed === seed;
                  return (
                    <motion.div
                      key={seed}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => isLoaded && setSelectedSeed(seed)}
                      style={{
                        aspectRatio: '1/1',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        background: 'rgba(255,255,255,0.03)',
                        border: isSelected ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                        cursor: isLoaded ? 'pointer' : 'wait',
                        position: 'relative',
                        transition: 'all 0.3s'
                      }}
                    >
                      {isLoaded ? (
                        <img src={getPollinationsUrl(seed)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      ) : (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Loader2 size={16} className="animate-spin" style={{ color: 'rgba(255,255,255,0.1)' }} />
                        </div>
                      )}
                      {isSelected && (
                        <div style={{ position: 'absolute', top: '4px', right: '4px', background: '#10b981', borderRadius: '50%', padding: '2px' }}>
                          <CheckCircle2 size={10} color="black" strokeWidth={3} />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Prompt Intel (Enhanced Prompt Display) */}
          {architecture?.enhanced && phase === 'done' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              style={{
                marginTop: '20px',
                padding: '14px',
                background: 'rgba(16,185,129,0.04)',
                borderRadius: '16px',
                border: '1px solid rgba(16,185,129,0.1)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Sparkles size={12} style={{ color: '#10b981' }} />
                <span style={{ fontSize: '0.55rem', fontWeight: 900, color: '#10b981', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                  Enhanced Architecture Prompt
                </span>
              </div>
              <p style={{
                fontSize: '0.62rem',
                color: 'rgba(255,255,255,0.3)',
                lineHeight: 1.6,
                margin: 0,
                fontStyle: 'italic',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical' as const
              }}>
                {architecture.enhanced}
              </p>
            </motion.div>
          )}

          {/* Action Footer */}
          {phase === 'done' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px' }}>
               <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ px: '8px', py: '4px', borderRadius: '6px', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: '0.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={10} /> Face Optimized
                  </div>
                  <div style={{ px: '8px', py: '4px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', fontSize: '0.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Finalizing Rank
                  </div>
               </div>
               <button
                  onClick={() => handleDownload(currentImageUrl)}
                  style={{
                    background: '#fff', color: '#000', border: 'none', borderRadius: '50px',
                    padding: '8px 20px', fontSize: '0.65rem', fontWeight: 900, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
                    boxShadow: '0 10px 20px rgba(255,255,255,0.1)'
                  }}
               >
                 <Download size={14} /> SAVE MASTERPIECE
               </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Sovereign Modal 4.0 */}
      <AnimatePresence>
        {isFullScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 99999,
              background: 'rgba(0,0,0,0.98)', backdropFilter: 'blur(30px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
            }}
            onClick={() => setIsFullScreen(false)}
          >
            <button 
              onClick={() => setIsFullScreen(false)}
              style={{ position: 'absolute', top: '30px', right: '30px', color: '#fff', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '44px', height: '44px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={24} />
            </button>

            <div style={{ maxWidth: '900px', width: '100%', display: 'flex', flexDirection: 'column', gap: '30px', alignItems: 'center' }}>
              <motion.img
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                src={fullScreenUrl}
                style={{
                  maxWidth: '100%', maxHeight: '75vh', borderRadius: '24px',
                  boxShadow: '0 0 100px rgba(16,185,129,0.15)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
                onClick={(e) => e.stopPropagation()}
              />
              <div style={{ textAlign: 'center' }}>
                 <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', fontStyle: 'italic', maxWidth: '700px', margin: '0 auto 20px auto', lineHeight: 1.6 }}>
                   &ldquo;{architecture?.enhanced}&rdquo;
                 </p>
                 <button 
                   onClick={(e) => { e.stopPropagation(); handleDownload(fullScreenUrl); }}
                   style={{ background: '#fff', color: '#000', border: 'none', borderRadius: '50px', padding: '14px 40px', fontSize: '0.85rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', margin: '0 auto', textTransform: 'uppercase', letterSpacing: '2px' }}
                 >
                   <Download size={20} /> ARCHIVE MASTERPIECE
                 </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
