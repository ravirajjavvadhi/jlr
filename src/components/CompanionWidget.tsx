"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Mic, Volume2, Heart, Zap, User, Trash2 } from 'lucide-react';
import { useCompanionStore, CompanionPersonality, CompanionGender, buildCompanionPrompt } from '@/services/useCompanionStore';
import { sendMessage } from '@/services/aiService';
import { useAuth } from '@/services/authContext';

export default function CompanionWidget() {
  const { settings, updateSettings } = useCompanionStore();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<'idle' | 'talking' | 'shocked' | 'listening'>('idle');
  const [chatBubble, setChatBubble] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const bubbleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result: any) => result.transcript)
            .join('')
            .toLowerCase();
          
          const wakeWord = settings.name.toLowerCase();
          if (transcript.includes(`hey ${wakeWord}`) || transcript.includes(`hi ${wakeWord}`)) {
            handleActivate();
          }
        };

        if (settings.isEnabled) {
            try { recognitionRef.current.start(); } catch(e) {}
        }
      }
    }
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [settings.name, settings.isEnabled]);

  const handleActivate = () => {
    if (isSpeaking) return;
    setState('listening');
    setIsListening(true);
    setChatBubble(`I'm listening, Commander...`);
    
    // Switch to active listening for the command
    if (recognitionRef.current) {
        recognitionRef.current.stop();
        setTimeout(() => {
            const cmdRec = new ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)();
            cmdRec.onresult = (e: any) => {
                const cmd = e.results[0][0].transcript;
                processCommand(cmd);
            };
            cmdRec.start();
        }, 300);
    }
  };

  const processCommand = async (text: string) => {
    setIsListening(false);
    setState('talking');
    setChatBubble(null);

    const systemPrompt = buildCompanionPrompt(settings);
    
    try {
        await sendMessage([{ role: 'user', content: text }], 'llama-3.1-8b-instant', {
            userId: user?.id,
            onDone: (full) => {
                setChatBubble(full);
                speak(full);
            },
            onError: () => {
                setState('idle');
                setChatBubble("Neural link failure...");
            }
        });
    } catch (e) {
        setState('idle');
    }
  };

  const speak = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = synthRef.current.getVoices();
    const selectedVoice = voices.find(v => v.voiceURI === settings.voiceURI) || voices[0];
    
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.pitch = settings.pitch;
    utterance.rate = settings.rate;
    
    utterance.onstart = () => {
        setIsSpeaking(true);
        setState('talking');
    };
    utterance.onend = () => {
        setIsSpeaking(false);
        setState('idle');
        if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
        bubbleTimeoutRef.current = setTimeout(() => setChatBubble(null), 5000);
    };

    synthRef.current.speak(utterance);
  };

  const handleBeat = () => {
    setState('shocked');
    setChatBubble("Ouch! Be nice! 🥺");
    speak("Ouch! Be nice!");
    setTimeout(() => setState('idle'), 2000);
  };

  const characterImg = {
    idle: '/companion/happy.png',
    talking: '/companion/talking.png',
    shocked: '/companion/shocked.png',
    listening: '/companion/talking.png', // Or a "listening" image if we had one
  };

  if (!settings.isEnabled) return null;

  return (
    <>
      <div className="companion-layer" style={{ 
        position: 'fixed', 
        bottom: '20px', 
        right: '20px', 
        zIndex: 1000000, 
        pointerEvents: 'none' 
      }}>
        <AnimatePresence>
          {chatBubble && (
            <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                style={{ 
                    position: 'absolute', 
                    bottom: '140px', 
                    right: '0', 
                    width: '200px',
                    background: 'rgba(5,5,5,0.9)',
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${settings.accentColor}44`,
                    borderRadius: '20px',
                    padding: '12px 16px',
                    color: '#fff',
                    fontSize: '0.9rem',
                    boxShadow: `0 10px 30px rgba(0,0,0,0.5), 0 0 20px ${settings.accentColor}22`,
                    pointerEvents: 'auto'
                }}
            >
                {chatBubble}
                <div style={{ 
                    position: 'absolute', 
                    bottom: '-8px', 
                    right: '30px', 
                    width: '16px', 
                    height: '16px', 
                    background: 'rgba(5,5,5,0.9)', 
                    borderRight: `1px solid ${settings.accentColor}44`,
                    borderBottom: `1px solid ${settings.accentColor}44`,
                    transform: 'rotate(45deg)' 
                }} />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
            drag
            dragConstraints={{ top: -500, bottom: 0, left: -500, right: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
                if (state === 'idle') handleActivate();
                else handleBeat();
            }}
            style={{ 
                width: '120px', 
                height: '120px', 
                borderRadius: '50%',
                cursor: 'pointer',
                pointerEvents: 'auto',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {/* Glow Aura */}
            <motion.div 
                animate={{ 
                    scale: [1, 1.1, 1],
                    opacity: isListening ? [0.6, 1, 0.6] : [0.2, 0.4, 0.2]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ 
                    position: 'absolute', 
                    inset: '-10px', 
                    borderRadius: '50%', 
                    background: `radial-gradient(circle, ${settings.accentColor} 0%, transparent 70%)` 
                }} 
            />

            <img 
                src={characterImg[state]} 
                alt="AI Companion"
                style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'contain',
                    filter: state === 'shocked' ? 'sepia(1) hue-rotate(-50deg) saturate(3)' : 'none'
                }} 
            />

            {/* Interaction Buttons */}
            <div style={{ 
                position: 'absolute', 
                top: '-40px', 
                left: '50%', 
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '8px'
            }}>
                <button 
                    onClick={(e) => { e.stopPropagation(); setShowSettings(true); }}
                    style={{ background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', padding: '6px', color: '#fff', cursor: 'pointer' }}
                >
                    <Settings size={14} />
                </button>
            </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showSettings && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 2000000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div 
              initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              animate={{ opacity: 1, backdropFilter: 'blur(20px)' }}
              exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              onClick={() => setShowSettings(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)' }}
            />
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              style={{ 
                width: '100%', 
                maxWidth: '450px', 
                background: '#0a0a0a', 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '24px', 
                padding: '24px', 
                position: 'relative',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 900, letterSpacing: '2px', color: 'var(--accent-primary)' }}>COMPANION CONFIG</h2>
                <button onClick={() => setShowSettings(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}><X /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>COMPANION NAME (WAKE WORD)</label>
                  <input 
                    type="text" 
                    value={settings.name} 
                    onChange={(e) => updateSettings({ name: e.target.value })}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px', color: '#fff', outline: 'none' }}
                  />
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>PERSONALITY PROTOCOL</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        {(['friendly', 'girlfriend', 'boyfriend', 'cute'] as CompanionPersonality[]).map(p => (
                            <button 
                                key={p}
                                onClick={() => updateSettings({ personality: p, accentColor: p === 'girlfriend' ? '#ff4081' : p === 'boyfriend' ? '#00e5ff' : '#ffea00' })}
                                style={{ 
                                    padding: '10px', 
                                    borderRadius: '10px', 
                                    background: settings.personality === p ? 'var(--accent-primary)' : 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: settings.personality === p ? '#000' : '#fff',
                                    fontWeight: 900,
                                    fontSize: '0.7rem',
                                    textTransform: 'uppercase',
                                    cursor: 'pointer'
                                }}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>VOICE SELECT</label>
                    <select 
                        value={settings.voiceURI}
                        onChange={(e) => updateSettings({ voiceURI: e.target.value })}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px', color: '#fff', outline: 'none' }}
                    >
                        {typeof window !== 'undefined' && window.speechSynthesis.getVoices().map(v => (
                            <option key={v.voiceURI} value={v.voiceURI} style={{ background: '#0a0a0a' }}>{v.name}</option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 900, color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>PITCH</label>
                        <input type="range" min="0.5" max="2" step="0.1" value={settings.pitch} onChange={(e) => updateSettings({ pitch: parseFloat(e.target.value) })} style={{ width: '100%' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: 900, color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>SPEED</label>
                        <input type="range" min="0.5" max="2" step="0.1" value={settings.rate} onChange={(e) => updateSettings({ rate: parseFloat(e.target.value) })} style={{ width: '100%' }} />
                    </div>
                </div>

                <div style={{ marginTop: '10px' }}>
                    <button 
                        onClick={() => { updateSettings({ isEnabled: false }); setShowSettings(false); }}
                        style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,64,64,0.1)', border: '1px solid rgba(255,64,64,0.2)', color: '#ff4040', fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                        DEACTIVATE COMPANION
                    </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        .companion-layer img {
            animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
