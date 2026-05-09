"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Download, Sparkles, Loader2, Maximize2, X, Film, Info, Camera, PlayCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Scene {
  scene: number;
  imagePrompt: string;
  narration: string;
  duration: number;
  type?: "cinematic" | "avatar" | "whiteboard" | "diagram";
  fx?: "parallax" | "particles" | "zoom_deep" | "shake" | "leak";
  camera_angle?: "wide" | "close-up" | "high-angle" | "low-angle";
  vibe?: "epic" | "noir" | "techno" | "vintage";
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
  const [isBuffering, setIsBuffering] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // [INTELLIGENT PRELOADING]
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());
  
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // [JSON AUTO-REPAIR ENGINE]: Hardens against AI truncation
  const repairedJson = useMemo(() => {
    let json = manifestJson.trim();
    if (!json) return "[]";
    
    // Count unclosed structures
    let openBraces = (json.match(/\{/g) || []).length;
    let closeBraces = (json.match(/\}/g) || []).length;
    let openBrackets = (json.match(/\[/g) || []).length;
    let closeBrackets = (json.match(/\]/g) || []).length;
    
    // Attempt rescue if truncated
    try {
      if (openBraces > closeBraces) json += "}".repeat(openBraces - closeBraces);
      if (openBrackets > closeBrackets) json += "]".repeat(openBrackets - closeBrackets);
      
      // If still invalid, try to find the last valid scene boundary
      JSON.parse(json); 
      return json;
    } catch {
      // Deep recovery: Find last complete scene object
      const lastIndex = json.lastIndexOf('}');
      if (lastIndex !== -1) {
         let subJson = json.substring(0, lastIndex + 1);
         if (openBrackets > closeBrackets) subJson += "]";
         try { JSON.parse(subJson); return subJson; } catch { return "[]"; }
      }
      return "[]";
    }
  }, [manifestJson]);

  // [CACHE]: Stabilize URLs across re-renders
  const sceneUrls = useMemo(() => {
    try {
      const parsed = JSON.parse(repairedJson);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((s, i) => {
        if (!s || !s.imagePrompt) return "https://image.pollinations.ai/prompt/Cinematic%20Mystery?width=1920&height=1080&nologo=true&seed=1337";
        const prompt = encodeURIComponent(s.imagePrompt);
        const seed = 1337 + i; 
        return `https://image.pollinations.ai/prompt/${prompt}?width=1920&height=1080&nologo=true&seed=${seed}&model=flux`;
      });
    } catch { return []; }
  }, [repairedJson]);

  // [PRE-ROLL BUFFERING LOGIC]
  useEffect(() => {
    if (sceneUrls.length > 0 && !preloadedImages.has(sceneUrls[0])) {
      const img = new Image();
      img.src = sceneUrls[0];
      img.onload = () => {
         setPreloadedImages(prev => new Set(prev).add(sceneUrls[0]));
         setIsBuffering(false);
      };
      img.onerror = () => setIsBuffering(false); // Fail fast
    } else if (sceneUrls.length > 0) {
      setIsBuffering(false);
    }
  }, [sceneUrls]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(repairedJson);
      if (Array.isArray(parsed)) {
        setScenes(parsed);
        setCurrentSceneIndex(0); // [CRITICAL]: Reset on new manifest to prevent OOB
        setIsLoadingManifest(false);
      } else { 
        setIsLoadingManifest(false);
      }
    } catch {
      setIsLoadingManifest(false);
    }
    if (typeof window !== 'undefined') synthRef.current = window.speechSynthesis;
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (synthRef.current) synthRef.current.cancel();
    };
  }, [repairedJson]);

  // [PRELOAD NEXT ASSET (PIPELINED)]
  useEffect(() => {
    const nextIndex = currentSceneIndex + 1;
    if (sceneUrls[nextIndex] && !preloadedImages.has(sceneUrls[nextIndex])) {
      const img = new Image();
      img.src = sceneUrls[nextIndex];
      img.onload = () => setPreloadedImages(prev => new Set(prev).add(sceneUrls[nextIndex]));
    }
  }, [currentSceneIndex, sceneUrls]);

  const playNarration = (text: string) => {
    if (!synthRef.current || isMuted || !text) return;
    try {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.90;
      utterance.pitch = 0.95;
      const voices = synthRef.current.getVoices();
      const premium = voices.find(v => v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Daniel')) || voices[0];
      if (premium) utterance.voice = premium;
      synthRef.current.speak(utterance);
    } catch {}
  };

  const handleSceneChange = (index: number) => {
    const s = scenes[index];
    if (!s) return;
    setCurrentSceneIndex(index);
    
    if (isPlaying) {
      playNarration(s.narration || "");
      if (timerRef.current) clearTimeout(timerRef.current);
      
      const duration = (Number(s.duration) || 10) * 1000;
      timerRef.current = setTimeout(() => {
        if (index < scenes.length - 1) handleSceneChange(index + 1);
        else setIsPlaying(false);
      }, duration);
    }
  };

  useEffect(() => {
     if (isPlaying) playNarration(scenes[currentSceneIndex]?.narration || "");
  }, [currentSceneIndex, isPlaying]);

  const togglePlay = () => {
    if (isBuffering) return; // Prevent play before first image
    if (!isPlaying) {
      setIsPlaying(true);
      handleSceneChange(currentSceneIndex);
    } else {
      setIsPlaying(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (synthRef.current) synthRef.current.cancel();
    }
  };

  const scene = scenes[currentSceneIndex];
  
  if (isLoadingManifest || (scenes.length === 0 && manifestJson.includes('<<<CINEMATIC_MANIFEST_START>>>'))) {
    return (
      <div className="hologram-card" style={{ padding: '60px', textAlign: 'center', background: 'rgba(0,0,0,0.5)', borderRadius: '40px', border: '1px solid rgba(0,255,157,0.2)' }}>
        <Loader2 size={40} className="animate-spin" style={{ color: '#00ff9d', margin: '0 auto' }} />
        <p style={{ fontSize: '0.7rem', fontWeight: 900, color: '#00ff9d', marginTop: '20px', letterSpacing: '4px' }}>SYNTHESIZING CINEMATIC SCENES...</p>
        <p style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>NEURAL CORE PROCESSING ARCHIVE</p>
      </div>
    );
  }

  if (error || !scene) return null;

  const progress = scenes.length > 0 ? ((currentSceneIndex + 1) / scenes.length) * 100 : 0;

  // [MOTION PRO 3.0 VARIANTS]
  const containerVariants = {
    shake: {
      x: [0, -1, 2, -2, 1, 0],
      y: [0, 1, -2, 2, -1, 0],
      transition: { duration: 0.15, repeat: Infinity }
    },
    stable: { x: 0, y: 0 }
  };

  const getVibeFilter = (vibe: string = "epic") => {
    switch(vibe) {
      case "noir": return "grayscale(1) contrast(1.5) brightness(0.8)";
      case "vintage": return "sepia(0.3) contrast(0.9) brightness(1.1) saturate(0.8)";
      case "techno": return "hue-rotate(180deg) brightness(1.2) contrast(1.1) saturate(1.2)";
      case "epic": return "contrast(1.1) saturate(1.1) brightness(1.05)";
      default: return "none";
    }
  };

  return (
    <div style={{ marginTop: '20px', width: '100%', maxWidth: '900px' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          position: 'relative',
          borderRadius: '40px',
          overflow: 'hidden',
          background: '#000',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 80px 150px rgba(0,0,0,1)'
        }}
      >
        {/* Cinema 3.0 Overlays */}
        {scene?.fx === "leak" && (
           <motion.div 
             animate={{ opacity: [0.1, 0.4, 0.1], scale: [1, 1.2, 1] }}
             transition={{ duration: 4, repeat: Infinity }}
             style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20, background: 'linear-gradient(45deg, rgba(255,100,50,0.2), transparent, rgba(0,100,255,0.2))' }} 
           />
        )}
        
        {/* BUFFERING GUARD */}
        <AnimatePresence>
          {isBuffering && (
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               style={{ position: 'absolute', inset: 0, background: '#050505', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}
             >
                <div className="beast-loader-ring" />
                <p style={{ fontSize: '0.65rem', fontWeight: 900, color: '#00ff9d', letterSpacing: '4px' }}>BUFFERING CINEMA MASTER...</p>
             </motion.div>
          )}
        </AnimatePresence>

        {/* Global Documentary Texture */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 28, background: 'url("https://www.transparenttextures.com/patterns/p6.png")', opacity: 0.05 }} />

        {/* Header (Director GUI) */}
        <div style={{ 
          position: 'absolute', top: 0, left: 0, right: 0, height: '100px', 
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.95), transparent)', zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
             <PlayCircle size={32} color="#00ff9d" />
             <div>
                <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, color: '#fff', letterSpacing: '3px' }}>SOVEREIGN CINEMATIC 3.0</h4>
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                   <span style={{ fontSize: '0.5rem', color: '#00ff9d', fontWeight: 900, border: '1px solid rgba(0,255,157,0.3)', padding: '2px 6px', borderRadius: '4px' }}>{scene?.camera_angle?.toUpperCase() || 'WIDE'}</span>
                   <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', fontWeight: 900 }}>VIBE: {scene?.vibe?.toUpperCase() || 'EPIC'}</span>
                </div>
             </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
             {scenes.slice(0, 10).map((_, i) => (
                <div key={i} style={{ width: i === currentSceneIndex ? '20px' : '6px', height: '6px', borderRadius: '10px', background: i === currentSceneIndex ? '#00ff9d' : 'rgba(255,255,255,0.2)', transition: 'all 0.3s' }} />
             ))}
          </div>
        </div>

        {/* STAGE (Liquid Motion Interface) */}
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSceneIndex}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 }}
              style={{ width: '100%', height: '100%' }}
            >
              <motion.div 
                variants={containerVariants}
                animate={scene?.fx === 'shake' ? 'shake' : 'stable'}
                style={{ width: '100%', height: '100%', filter: getVibeFilter(scene?.vibe) }}
              >
                <motion.img
                  src={sceneUrls[currentSceneIndex]}
                  animate={{ 
                    scale: scene?.fx === 'zoom_deep' ? [1, 1.4] : [1, 1.15],
                    x: scene?.camera_angle === 'wide' ? [-20, 20] : [0, 10]
                  }}
                  transition={{ duration: (scene?.duration || 10) + 1, ease: "easeInOut" }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </motion.div>

              {/* Hollywood Script Subs */}
              <div style={{ position: 'absolute', bottom: '120px', left: '0', right: '0', textAlign: 'center', zIndex: 60, padding: '0 80px' }}>
                <motion.h2
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={`text-${currentSceneIndex}`}
                  style={{
                    display: 'inline-block',
                    background: 'rgba(0,0,0,0.85)',
                    backdropFilter: 'blur(30px) saturate(180%)',
                    padding: '20px 40px',
                    borderRadius: '24px',
                    fontSize: '1.2rem',
                    color: '#fff',
                    lineHeight: 1.5,
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    boxShadow: '0 40px 80px rgba(0,0,0,0.8)'
                  }}
                >
                  {scene.narration}
                </motion.h2>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* STEERING CONTROLS */}
        <div style={{ padding: '35px 50px', background: 'rgba(5,5,5,0.98)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
           <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', marginBottom: '30px' }}>
              <motion.div animate={{ width: `${progress}%` }} style={{ height: '100%', background: 'linear-gradient(90deg, #00ff9d, #007d4d)' }} />
           </div>

           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                 <button onClick={togglePlay} disabled={isBuffering} style={{ color: isBuffering ? 'rgba(255,255,255,0.1)' : '#fff', background: 'none', border: 'none', cursor: 'pointer' }}>
                   {isPlaying ? <Pause size={32} fill="white" /> : <Play size={32} fill="white" />}
                 </button>
                 <div style={{ display: 'flex', gap: '20px' }}>
                    <SkipBack onClick={() => handleSceneChange(Math.max(0, currentSceneIndex - 1))} className="btn-ghost" style={{ padding: '6px', opacity: 0.5 }} />
                    <SkipForward onClick={() => handleSceneChange(Math.min(scenes.length - 1, currentSceneIndex + 1))} className="btn-ghost" style={{ padding: '6px', opacity: 0.5 }} />
                 </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
                 <button onClick={() => setIsMuted(!isMuted)} style={{ color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                 </button>
                 <button className="btn-beast" style={{ padding: '12px 25px', fontSize: '0.7rem', fontWeight: 900 }}>
                    <Download size={16} /> EXPORT CINEMA PACKAGE
                 </button>
              </div>
           </div>
        </div>
      </motion.div>

      <style jsx global>{`
        .beast-loader-ring {
          width: 60px; height: 60px;
          border: 3px solid rgba(0,255,157,0.1);
          border-top: 3px solid #00ff9d;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
