"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Download, Sparkles, Loader2, Maximize2, X, RefreshCw, Wand2, Layers, CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NeuralCanvasProps {
  prompt: string;
  userId?: string;
}

type Phase = 'architecting' | 'rendering' | 'done' | 'error';

export default function NeuralCanvas({ prompt, userId }: NeuralCanvasProps) {
  const [architecture, setArchitecture] = useState<any>(null);
  const [phase, setPhase] = useState<Phase>('architecting');
  const [selectedSeed, setSelectedSeed] = useState<number | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fullScreenUrl, setFullScreenUrl] = useState('');
  const [regenerateCount, setRegenerateCount] = useState(0);
  const hasFetched = useRef(false);
  
  // Resilient Phase Guard: Force 'done' if rendering takes too long
  useEffect(() => {
    if (phase === 'rendering') {
      const timer = setTimeout(() => {
        if (loadedImages.size > 0 || failedImages.size > 0) {
          setPhase('done');
        }
      }, 45000); // 45s max wait
      return () => clearTimeout(timer);
    }
  }, [phase, loadedImages.size, failedImages.size]);

  const performArchitecture = async () => {
    setPhase('architecting');
    setArchitecture(null);
    setLoadedImages(new Set());
    setFailedImages(new Set());
    setSelectedSeed(null);

    try {
      const res = await fetch('/api/image/architect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, userId })
      });

      if (!res.ok) throw new Error('Architect API failed');
      const data = await res.json();
      
      // OPTIMIZATON: Use 3 high-quality variants instead of 4 to reduce server load/latency
      if (data.seeds && data.seeds.length > 3) {
        data.seeds = data.seeds.slice(0, 3);
      }
      
      setArchitecture(data);
      setPhase('rendering');
    } catch (e) {
      console.error('[NeuralCanvas] Architecture failed:', e);
      setArchitecture({
        enhanced: `${prompt}, cinematic masterpiece, 8k, realistic`,
        negative: "blurry, low quality",
        style: "Standard",
        seeds: [Date.now(), Date.now() + 1, Date.now() + 2]
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
      if (next.size === 1) setSelectedSeed(seed);
      
      const totalExpected = architecture?.seeds?.length || 3;
      if (next.size + failedImages.size >= totalExpected) {
        setPhase('done');
      }
      return next;
    });
  };

  const handleImageError = (seed: number) => {
    setFailedImages(prev => {
      const next = new Set(prev);
      next.add(seed);
      
      const totalExpected = architecture?.seeds?.length || 3;
      if (next.size + loadedImages.size >= totalExpected) {
        if (loadedImages.size > 0) setPhase('done');
        else setPhase('error');
      }
      return next;
    });
  };

  const getPollinationsUrl = (seed: number) => {
    if (!architecture) return '';
    const encodedPrompt = encodeURIComponent(architecture.enhanced);
    const encodedNegative = encodeURIComponent(architecture.negative);
    // OPTIMIZATION: Use 768x768 for significantly faster generation while maintaining HD quality
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=768&height=768&nologo=true&seed=${seed}&model=flux&negative=${encodedNegative}`;
  };

  const handleDownload = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `jlr-ai-canvas-${Date.now()}.jpg`;
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
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          marginTop: '16px',
          borderRadius: '24px',
          background: 'rgba(10,10,12,0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.08)',
          maxWidth: '540px',
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '6px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Wand2 size={12} color="black" />
            </div>
            <span style={{ fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.6)' }}>
              Neural Canvas <span style={{ color: '#10b981' }}>// v4.1 Fast</span>
            </span>
          </div>
          {phase === 'done' && (
             <button
               onClick={() => setRegenerateCount(c => c + 1)}
               style={{
                 background: 'transparent', border: 'none',
                 padding: '4px', color: 'rgba(255,255,255,0.3)',
                 cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                 fontSize: '0.55rem', fontWeight: 700
               }}
             >
               <RefreshCw size={10} /> RE-GENERATE
             </button>
          )}
        </div>

        <div style={{ padding: '12px' }}>
          {/* Main Stage */}
          <div style={{
            position: 'relative',
            aspectRatio: '1/1',
            borderRadius: '16px',
            overflow: 'hidden',
            background: '#000',
            border: '1px solid rgba(255,255,255,0.05)'
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
                    gap: '12px', background: '#000'
                  }}
                >
                  <Loader2 size={24} className="animate-spin" style={{ color: '#10b981' }} />
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.6rem', fontWeight: 900, color: '#10b981', letterSpacing: '1px', textTransform: 'uppercase' }}>
                      {phase === 'architecting' ? 'Architecting...' : 'Rendering 3 Variants...'}
                    </p>
                    {loadedImages.size > 0 && phase === 'rendering' && (
                        <p style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                            {loadedImages.size} / {architecture?.seeds.length} READY
                        </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Parallel loaders */}
            {architecture && (
              <div style={{ display: 'none' }}>
                {architecture.seeds.map((seed: number) => (
                  <img 
                    key={seed} 
                    src={getPollinationsUrl(seed)} 
                    onLoad={() => handleImageLoad(seed)} 
                    onError={() => handleImageError(seed)}
                    alt="" 
                  />
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
                  opacity: phase === 'done' ? 1 : 0.4,
                  transition: 'opacity 0.5s ease',
                  cursor: 'pointer'
                }}
                onClick={() => phase === 'done' && (setFullScreenUrl(currentImageUrl), setIsFullScreen(true))}
              />
            )}
          </div>

          {/* Variant Selector */}
          {architecture && (
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                {architecture.seeds.map((seed: number) => {
                  const isLoaded = loadedImages.has(seed);
                  const isFailed = failedImages.has(seed);
                  const isSelected = selectedSeed === seed;
                  
                  return (
                    <div
                      key={seed}
                      onClick={() => isLoaded && setSelectedSeed(seed)}
                      style={{
                        width: '50px', height: '50px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        background: 'rgba(255,255,255,0.03)',
                        border: isSelected ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                        cursor: isLoaded ? 'pointer' : 'default',
                        position: 'relative'
                      }}
                    >
                      {isLoaded ? (
                        <img src={getPollinationsUrl(seed)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      ) : isFailed ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <AlertTriangle size={12} color="rgba(255,0,0,0.3)" />
                        </div>
                      ) : (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Loader2 size={10} className="animate-spin" style={{ color: 'rgba(255,255,255,0.1)' }} />
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {/* Action Footer */}
          {phase === 'done' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px' }}>
               <p style={{
                fontSize: '0.55rem', color: 'rgba(255,255,255,0.2)',
                maxWidth: '60%', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis'
               }}>
                 &ldquo;{architecture?.enhanced}&rdquo;
               </p>
               <button
                  onClick={() => handleDownload(currentImageUrl)}
                  style={{
                    background: '#fff', color: '#000', border: 'none', borderRadius: '50px',
                    padding: '6px 14px', fontSize: '0.6rem', fontWeight: 900, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
               >
                 <Download size={12} /> SAVE
               </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Basic Fullscreen */}
      <AnimatePresence>
        {isFullScreen && (
          <div 
            style={{
              position: 'fixed', inset: 0, zIndex: 99999,
              background: 'rgba(0,0,0,0.98)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
            }}
            onClick={() => setIsFullScreen(false)}
          >
            <div style={{ position: 'relative', maxWidth: '1000px', width: '100%' }}>
                <button style={{ position: 'absolute', top: '-40px', right: 0, color: '#fff', background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                <img src={fullScreenUrl} style={{ width: '100%', borderRadius: '16px' }} alt="" />
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', marginTop: '16px' }}>{architecture?.enhanced}</p>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
