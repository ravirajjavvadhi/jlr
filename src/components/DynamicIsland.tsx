"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, CornerDownLeft, Sparkles, Loader2, Maximize2 } from 'lucide-react';
import { sendMessage } from '@/services/aiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function DynamicIsland() {
  const [mode, setMode] = useState<'pill' | 'expanded'>('pill');
  const [isVisible, setIsVisible] = useState(false);
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check visibility from settings
  useEffect(() => {
    const checkVisibility = () => {
      const enabled = localStorage.getItem('neural_island_enabled') === 'true';
      setIsVisible(enabled);
    };
    checkVisibility();
    window.addEventListener('storage', checkVisibility);
    // Custom event for same-page updates
    window.addEventListener('neural-island-toggle', checkVisibility);
    return () => {
      window.removeEventListener('storage', checkVisibility);
      window.removeEventListener('neural-island-toggle', checkVisibility);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [response]);

  if (!isVisible) return null;

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    setIsLoading(true);
    setResponse('');
    setMode('expanded');
    abortControllerRef.current = new AbortController();

    try {
      await sendMessage([{ role: 'user', content: input }], 'llama-3.1-8b-instant', {
        onToken: (token) => setResponse(prev => prev + token),
        onDone: () => setIsLoading(false),
        onError: (err) => {
          setIsLoading(false);
          setResponse(`⚠️ System Failure: ${err}`);
        },
        signal: abortControllerRef.current.signal,
        responseLength: 'concise' // Default to concise for island mode
      });
      setInput('');
    } catch (e) {
      setIsLoading(false);
    }
  };

  const closeIsland = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setMode('pill');
    setResponse('');
    setIsLoading(false);
  };

  return (
    <div style={{ position: 'fixed', top: '12px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, width: '100%', maxWidth: '900px', pointerEvents: 'none', display: 'flex', justifyContent: 'center' }}>
      <motion.div
        layout
        initial={{ opacity: 0, y: -20, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        style={{
          background: 'rgba(0, 0, 0, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: mode === 'pill' ? '24px' : '28px',
          padding: mode === 'pill' ? '6px 16px' : '16px',
          width: mode === 'pill' ? 'auto' : 'calc(100% - 32px)',
          maxWidth: mode === 'pill' ? '180px' : '450px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.8), 0 0 20px rgba(0, 242, 254, 0.1)',
          pointerEvents: 'auto',
          color: '#fff',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        {mode === 'pill' ? (
          <motion.div 
            onClick={() => setMode('expanded')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          >
            <div style={{ position: 'relative' }}>
              <Zap size={14} className="text-accent-beast" fill="currentColor" />
              {isLoading && <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} style={{ position: 'absolute', inset: -4, border: '1px solid var(--accent-beast)', borderRadius: '50%' }} />}
            </div>
            <span style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.8 }}>Neural Island</span>
          </motion.div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={14} className="text-accent-beast" />
                <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.5px' }}>Sovereign Overhang</span>
              </div>
              <button onClick={closeIsland} style={{ background: 'transparent', border: 'none', color: '#fff', opacity: 0.4, cursor: 'pointer' }}><X size={16} /></button>
            </div>

            {response && (
              <div 
                ref={scrollRef}
                className="prose prose-invert"
                style={{ 
                  maxHeight: '200px', 
                  overflowY: 'auto', 
                  fontSize: '13px', 
                  padding: '8px', 
                  background: 'rgba(255,255,255,0.03)', 
                  borderRadius: '12px',
                  lineHeight: '1.6'
                }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{response}</ReactMarkdown>
                {isLoading && <Loader2 size={12} className="animate-spin" style={{ marginTop: '8px', opacity: 0.4 }} />}
              </div>
            )}

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Direct Snipe..."
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '14px',
                  padding: '10px 40px 10px 14px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                style={{ position: 'absolute', right: '8px', background: 'transparent', border: 'none', color: input.trim() ? 'var(--accent-beast)' : 'rgba(255,255,255,0.2)', cursor: 'pointer' }}
              >
                <CornerDownLeft size={18} />
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
