"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Download, Sparkles, Loader2, Maximize2, X, Film } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Scene {
  scene: number;
  imagePrompt: string;
  narration: string;
  duration: number;
}

interface SovereignCinematicProps {
  manifestJson: string;
}

export default function SovereignCinematic({ manifestJson }: SovereignCinematicProps) {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    try {
      const parsed = JSON.parse(manifestJson);
      if (Array.isArray(parsed)) {
        setScenes(parsed);
        setLoadingAssets(false);
      } else {
        throw new Error("Invalid Manifest format");
      }
    } catch (e) {
      setError("Failed to initialize Cinematic Manifest Linkage.");
      setLoadingAssets(false);
    }

    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (synthRef.current) synthRef.current.cancel();
    };
  }, [manifestJson]);

  const playScene = (index: number) => {
    if (!scenes[index]) return;
    
    setCurrentSceneIndex(index);
    const scene = scenes[index];

    // Narration
    if (synthRef.current && !isMuted) {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(scene.narration);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      // High authority voice if available
      const voices = synthRef.current.getVoices();
      const premiumVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Natural')) || voices[0];
      if (premiumVoice) utterance.voice = premiumVoice;
      
      utteranceRef.current = utterance;
      synthRef.current.speak(utterance);
    }

    // Timer for next scene
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isPlaying) {
      timerRef.current = setTimeout(() => {
        if (index < scenes.length - 1) {
          playScene(index + 1);
        } else {
          setIsPlaying(false);
        }
      }, scene.duration * 1000);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      playScene(currentSceneIndex);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (synthRef.current) synthRef.current.cancel();
    }
  }, [isPlaying]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const toggleMute = () => setIsMuted(!isMuted);

  if (loadingAssets) {
    return (
      <div style={{ marginTop: '20px', padding: '30px', borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#00ff9d', margin: '0 auto mb-15' }} />
        <p style={{ fontSize: '0.7rem', fontWeight: 900, color: '#00ff9d', letterSpacing: '2px' }}>INITIALIZING CINEMATIC LINK...</p>
      </div>
    );
  }

  if (error || scenes.length === 0) {
    return (
      <div style={{ marginTop: '20px', padding: '20px', borderRadius: '16px', background: 'rgba(255,100,100,0.05)', border: '1px solid rgba(255,100,100,0.1)', color: '#ff6b6b', fontSize: '0.7rem', textAlign: 'center' }}>
        {error || "Empty Manifest Detected."}
      </div>
    );
  }

  const currentScene = scenes[currentSceneIndex];
  const progress = ((currentSceneIndex + 1) / scenes.length) * 100;

  // Pollinations URL for the current scene
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(currentScene.imagePrompt)}?width=1280&height=720&nologo=true&seed=${currentSceneIndex + 42}`;

  return (
    <div style={{ marginTop: '20px', width: '100%', maxWidth: '800px' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          position: 'relative',
          borderRadius: '24px',
          overflow: 'hidden',
          background: '#000',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.8)'
        }}
      >
        {/* Header Branding */}
        <div style={{ 
          position: 'absolute', 
          top: 0, left: 0, right: 0, 
          padding: '15px 25px', 
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
          zIndex: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Film size={16} color="#00ff9d" />
            <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#00ff9d', textTransform: 'uppercase', letterSpacing: '2.5px' }}>
              Sovereign Cinematic <span style={{ opacity: 0.5 }}>// Live Synthesis</span>
            </span>
          </div>
          <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)' }}>
            SCENE {currentSceneIndex + 1} / {scenes.length}
          </div>
        </div>

        {/* Cinematic Stage (Ken Burns Effect) */}
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSceneIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
              style={{ width: '100%', height: '100%' }}
            >
              <motion.img
                src={imageUrl}
                alt={currentScene.imagePrompt}
                initial={{ scale: 1, x: 0 }}
                animate={{ 
                  scale: 1.15,
                  x: currentSceneIndex % 2 === 0 ? 20 : -20
                }}
                transition={{ 
                  duration: currentScene.duration + 2, 
                  ease: "linear" 
                }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />

              {/* Subtitles Overlay */}
              <div style={{
                position: 'absolute',
                bottom: '80px',
                left: '40px',
                right: '40px',
                textAlign: 'center',
                zIndex: 30
              }}>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={`sub-${currentSceneIndex}`}
                  style={{
                    display: 'inline-block',
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(10px)',
                    padding: '8px 20px',
                    borderRadius: '12px',
                    fontSize: '0.9rem',
                    color: '#fff',
                    lineHeight: 1.5,
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  {currentScene.narration}
                </motion.p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Master Controls */}
        <div style={{
          padding: '20px 25px',
          background: 'rgba(5,5,5,0.95)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '15px'
        }}>
          {/* Progress Bar */}
          <div style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              style={{ height: '100%', background: 'linear-gradient(90deg, #00ff9d, #00bc7d)' }} 
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <button 
                onClick={togglePlay}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                {isPlaying ? <Pause fill="white" size={24} /> : <Play fill="white" size={24} />}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                 <button onClick={() => setCurrentSceneIndex(Math.max(0, currentSceneIndex - 1))} className="btn-ghost" style={{ padding: '4px' }}><SkipBack size={18} /></button>
                 <button onClick={() => setCurrentSceneIndex(Math.min(scenes.length - 1, currentSceneIndex + 1))} className="btn-ghost" style={{ padding: '4px' }}><SkipForward size={18} /></button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <button 
                onClick={toggleMute}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <button 
                className="btn-beast" 
                style={{ padding: '8px 15px', fontSize: '0.6rem', borderRadius: '10px' }}
                onClick={() => {
                   const blob = new Blob([manifestJson], { type: 'application/json' });
                   const url = URL.createObjectURL(blob);
                   const a = document.createElement('a');
                   a.href = url; a.download = `cinematic-manifest-${Date.now()}.json`;
                   a.click();
                }}
              >
                <Download size={14} /> EXPORT MANIFEST
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Chapter Index Card */}
      <div style={{ 
        marginTop: '15px', 
        padding: '15px 20px', 
        borderRadius: '20px', 
        background: 'rgba(255,255,255,0.02)', 
        border: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>
          TOTAL DURATION: <span style={{ color: '#fff', fontWeight: 900 }}>{scenes.reduce((acc, s) => acc + s.duration, 0)} SECONDS</span>
        </div>
        <div style={{ fontSize: '0.65rem', color: 'rgba(0,255,157,0.5)', fontWeight: 900 }}>
          READY FOR BROADCAST
        </div>
      </div>
    </div>
  );
}
