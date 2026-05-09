"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Download, Sparkles, Loader2, Maximize2, X, Film, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Scene {
  scene: number;
  imagePrompt: string;
  narration: string;
  duration: number;
  type?: "cinematic" | "avatar" | "whiteboard" | "diagram";
  fx?: "parallax" | "particles" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right";
}

interface SovereignCinematicProps {
  manifestJson: string;
}

export default function SovereignCinematic({ manifestJson }: SovereignCinematicProps) {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoadingManifest, setIsLoadingManifest] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // [INTELLIGENT PRELOADING]
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());
  
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // [CACHE]: Stabilize URLs across re-renders
  const sceneUrls = useMemo(() => {
    try {
      const parsed = JSON.parse(manifestJson);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((s, i) => {
        const prompt = encodeURIComponent(s.imagePrompt);
        // Chapter consistency seed
        const seed = 42 + i;
        return `https://image.pollinations.ai/prompt/${prompt}?width=1280&height=720&nologo=true&seed=${seed}`;
      });
    } catch { return []; }
  }, [manifestJson]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(manifestJson);
      if (Array.isArray(parsed)) {
        setScenes(parsed);
        setIsLoadingManifest(false);
      } else { throw new Error("Invalid format"); }
    } catch {
      setError("Cinematic Manifest corruption detected.");
      setIsLoadingManifest(false);
    }
    if (typeof window !== 'undefined') synthRef.current = window.speechSynthesis;
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (synthRef.current) synthRef.current.cancel();
    };
  }, [manifestJson]);

  // [PRELOAD NEXT ASSET]
  useEffect(() => {
    const nextIndex = currentSceneIndex + 1;
    if (sceneUrls[nextIndex] && !preloadedImages.has(sceneUrls[nextIndex])) {
      const img = new Image();
      img.src = sceneUrls[nextIndex];
      img.onload = () => setPreloadedImages(prev => new Set(prev).add(sceneUrls[nextIndex]));
    }
  }, [currentSceneIndex, sceneUrls]);

  // [CORE NARRATION LOGIC]
  const playNarration = (text: string) => {
    if (!synthRef.current || isMuted) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    const voices = synthRef.current.getVoices();
    const premium = voices.find(v => v.name.includes('Google') || v.name.includes('Natural')) || voices[0];
    if (premium) utterance.voice = premium;
    synthRef.current.speak(utterance);
  };

  const handleSceneChange = (index: number) => {
    if (!scenes[index]) return;
    setCurrentSceneIndex(index);
    
    // Always trigger narration on scene change (if playing)
    if (isPlaying) {
      playNarration(scenes[index].narration);
      
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (index < scenes.length - 1) handleSceneChange(index + 1);
        else setIsPlaying(false);
      }, scenes[index].duration * 1000);
    }
  };

  // [BUG FIX]: Trigger audio even on manual nav
  useEffect(() => {
     if (isPlaying) {
       playNarration(scenes[currentSceneIndex]?.narration || "");
     }
  }, [currentSceneIndex, isPlaying]);

  const togglePlay = () => {
    if (!isPlaying) {
      setIsPlaying(true);
      handleSceneChange(currentSceneIndex);
    } else {
      setIsPlaying(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (synthRef.current) synthRef.current.cancel();
    }
  };

  if (isLoadingManifest) return <div className="hologram-card" style={{ padding: '40px', textAlign: 'center' }}><Loader2 size={32} className="animate-spin" style={{ color: '#00ff9d', margin: '0 auto' }} /></div>;
  if (error) return <div style={{ color: '#ff6b6b' }}>{error}</div>;

  const scene = scenes[currentSceneIndex];
  const progress = ((currentSceneIndex + 1) / scenes.length) * 100;

  // [FX ENGINE]: Dynamic Framer Motion variants
  const getFxAnimation = (fx: string = "parallax") => {
    switch(fx) {
      case "zoom_in": return { scale: [1, 1.2], x: [0, 10] };
      case "zoom_out": return { scale: [1.2, 1], x: [10, 0] };
      case "pan_left": return { x: [20, -20], scale: 1.1 };
      case "pan_right": return { x: [-20, 20], scale: 1.1 };
      default: return { scale: [1, 1.15], x: [0, 5], y: [0, 5] };
    }
  };

  return (
    <div style={{ marginTop: '20px', width: '100%', maxWidth: '850px' }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          position: 'relative',
          borderRadius: '32px',
          overflow: 'hidden',
          background: '#050505',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 50px 100px rgba(0,0,0,0.9)'
        }}
      >
        {/* Cinematic Particles Layer */}
        {scene?.fx === "particles" && (
           <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15, opacity: 0.3 }}>
              <div className="shimmer-particles" />
           </div>
        )}

        {/* Global Film Grain / Overlay */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 25, background: 'radial-gradient(circle, transparent 50%, rgba(0,0,0,0.4) 100%)', opacity: 0.6 }} />

        {/* Header Bar */}
        <div style={{ 
          position: 'absolute', top: 0, insetX: 0, height: '80px', 
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.9), transparent)', zIndex: 30,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <div style={{ width: '32px', height: '32px', background: 'var(--beast-gradient)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Film size={18} color="black" /></div>
             <div>
                <h4 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 900, color: '#fff', letterSpacing: '2px' }}>SOVEREIGN CINEMATIC 2.0</h4>
                <p style={{ margin: 0, fontSize: '0.55rem', color: '#00ff9d', fontWeight: 800, letterSpacing: '1px' }}>{scene?.type?.toUpperCase()} PROTOCOL // ACTIVE</p>
             </div>
          </div>
          <div style={{ display: 'flex', gap: '5px' }}>
             {scenes.map((_, i) => (
                <div key={i} style={{ width: '4px', height: '4px', borderRadius: '50%', background: i === currentSceneIndex ? '#00ff9d' : 'rgba(255,255,255,0.2)' }} />
             ))}
          </div>
        </div>

        {/* STAGE */}
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSceneIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              style={{ width: '100%', height: '100%', filter: scene?.type === 'whiteboard' ? 'grayscale(0.6) contrast(1.2) sepia(0.2)' : 'none' }}
            >
              <motion.img
                src={sceneUrls[currentSceneIndex]}
                animate={getFxAnimation(scene?.fx)}
                transition={{ duration: (scene?.duration || 8) + 1, ease: "linear" }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />

              {/* Subtitles (Hollywood Style) */}
              <div style={{ position: 'absolute', bottom: '100px', insetX: '0', textAlign: 'center', zIndex: 40, padding: '0 60px' }}>
                <motion.span
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: 'inline-block',
                    background: 'rgba(0,0,0,0.85)',
                    backdropFilter: 'blur(15px)',
                    padding: '12px 25px',
                    borderRadius: '16px',
                    fontSize: '1rem',
                    color: '#fff',
                    lineHeight: 1.6,
                    fontWeight: 500,
                    border: '1px solid rgba(255,255,255,0.12)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                  }}
                >
                  {scene.narration}
                </motion.span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* CONTROLS */}
        <div style={{ padding: '25px 35px', background: 'rgba(10,10,10,0.98)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
           <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px' }}>
              <motion.div animate={{ width: `${progress}%` }} style={{ height: '100%', background: 'linear-gradient(90deg, #00ff9d, #00bc7d)' }} />
           </div>

           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
                 <button onClick={togglePlay} style={{ color: '#fff', background: 'none', border: 'none', cursor: 'pointer' }}>
                   {isPlaying ? <Pause size={28} fill="white" /> : <Play size={28} fill="white" />}
                 </button>
                 <div style={{ display: 'flex', gap: '15px' }}>
                    <SkipBack onClick={() => handleSceneChange(Math.max(0, currentSceneIndex - 1))} className="btn-ghost" style={{ padding: '4px', opacity: 0.6 }} />
                    <SkipForward onClick={() => handleSceneChange(Math.min(scenes.length - 1, currentSceneIndex + 1))} className="btn-ghost" style={{ padding: '4px', opacity: 0.6 }} />
                 </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                 <button onClick={() => setIsMuted(!isMuted)} style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
                 </button>
                 <button className="btn-beast" style={{ padding: '10px 20px', fontSize: '0.65rem' }}>
                    <Download size={14} /> EXPORT 4K SCRIPT
                 </button>
              </div>
           </div>
        </div>
      </motion.div>

      <style jsx global>{`
        @keyframes drift {
          from { transform: translateY(0) rotate(0); }
          to { transform: translateY(-100%) rotate(15deg); }
        }
        .shimmer-particles {
          width: 100%; height: 100%;
          background-image: radial-gradient(#fff 1px, transparent 0);
          background-size: 50px 50px;
          animation: drift 20s linear infinite;
        }
      `}</style>
    </div>
  );
}
