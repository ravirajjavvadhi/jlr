"use client";

import React, { useState, useRef } from 'react';
import { Upload, Video, FileText, CheckCircle2, Loader2, Sparkles, X, Play, Clock, Download, Copy, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface VideoAnalyzerProps {
  onClose?: () => void;
}

type Step = 'idle' | 'uploading' | 'analyzing' | 'finalizing' | 'done' | 'error';

export default function VideoAnalyzer({ onClose }: VideoAnalyzerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [progress, setProgress] = useState(0);
  const [analysis, setAnalysis] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type.startsWith('video/')) {
      setFile(selected);
      setError('');
    } else {
      setError('Please select a valid video file.');
    }
  };

  const startAnalysis = async () => {
    if (!file) return;

    setStep('uploading');
    setProgress(10);

    const formData = new FormData();
    formData.append('video', file);
    formData.append('prompt', 'Analyze this video in detail and provide a complete pin-to-pin presentation script with exact sync timestamps. Include UI details, verbal narrations, and key visual transitions.');

    try {
      // Simulate progress for UI feel
      const progressInterval = setInterval(() => {
        setProgress(prev => (prev < 90 ? prev + 2 : prev));
      }, 1000);

      const res = await fetch('/api/video/analyze', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setProgress(95);
      setStep('analyzing');

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Deep analysis failed');
      }

      const data = await res.json();
      setAnalysis(data.analysis);
      setStep('done');
      setProgress(100);
    } catch (e: any) {
      console.error('[VIDEO-ANALYZER] Error:', e);
      setError(e.message || 'The Sovereign Link was interrupted during analysis.');
      setStep('error');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(analysis);
    // Simple feedback could be added here
  };

  const stepLabels: Record<Step, string> = {
    idle: 'READY FOR UPLOAD',
    uploading: 'UPLOADING TO NEURAL HUB',
    analyzing: 'GEMINI-PRO VISION ANALYSIS',
    finalizing: 'FINALIZING SCRIPT...',
    done: 'ANALYSIS COMPLETE',
    error: 'LINK ERROR'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        width: '100%',
        maxWidth: '800px',
        background: 'linear-gradient(135deg, rgba(8,8,12,0.98) 0%, rgba(15,15,25,0.98) 100%)',
        borderRadius: '32px',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 50px 100px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.02)',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Header */}
      <div style={{
        padding: '24px 32px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #a855f7, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(168,85,247,0.3)'
          }}>
            <Video size={20} color="#fff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', color: '#fff' }}>
              VIDEO INTEL ARCHITECT
            </h2>
            <p style={{ margin: 0, fontSize: '0.6rem', color: '#a855f7', fontWeight: 800, letterSpacing: '1px' }}>
              GEMINI 1.5 PRO // UNLIMITED DURATION ENGINE
            </p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        )}
      </div>

      <div style={{ padding: '32px' }}>
        <AnimatePresence mode="wait">
          {step === 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ textAlign: 'center' }}
            >
              <div 
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '60px 40px',
                  borderRadius: '24px',
                  border: '2px dashed rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.02)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  marginBottom: '24px'
                }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = 'rgba(168,85,247,0.4)'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="video/*" 
                  style={{ display: 'none' }} 
                />
                <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
                  <div style={{ padding: '20px', borderRadius: '50%', background: 'rgba(168,85,247,0.05)', color: '#a855f7' }}>
                    <Upload size={32} />
                  </div>
                </div>
                <h3 style={{ fontSize: '1.2rem', color: '#fff', fontWeight: 800, marginBottom: '8px' }}>
                  {file ? file.name : 'Drop Video or Click to Upload'}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', fontWeight: 500 }}>
                  Supports MP4, MOV, AVI up to 500MB (No Duration Limit)
                </p>
              </div>

              {file && (
                <button
                  onClick={startAnalysis}
                  style={{
                    width: '100%',
                    padding: '16px',
                    borderRadius: '50px',
                    background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                    color: '#fff',
                    border: 'none',
                    fontSize: '0.9rem',
                    fontWeight: 900,
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    boxShadow: '0 15px 30px rgba(168,85,247,0.2)'
                  }}
                >
                  <Sparkles size={18} /> INITIALIZE DEEP SCAN
                </button>
              )}
            </motion.div>
          )}

          {(step === 'uploading' || step === 'analyzing' || step === 'finalizing') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ padding: '40px 0' }}
            >
              <div style={{ marginBottom: '32px', textAlign: 'center' }}>
                <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto 24px auto' }}>
                   <motion.div 
                     animate={{ rotate: 360 }}
                     transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                     style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '4px solid rgba(168,85,247,0.1)', borderTopColor: '#a855f7' }}
                   />
                   <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Loader2 size={32} className="animate-spin" style={{ color: '#a855f7', opacity: 0.5 }} />
                   </div>
                </div>
                <h3 style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 900, letterSpacing: '3px', textTransform: 'uppercase' }}>
                   {stepLabels[step]}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', marginTop: '10px', fontWeight: 800 }}>
                   UPLINK ACTIVE // PROCESSING TEMPORAL DATA
                </p>
              </div>

              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${progress}%` }}
                   style={{ height: '100%', background: 'linear-gradient(90deg, #a855f7, #6366f1)', boxShadow: '0 0 10px #a855f7' }}
                />
              </div>
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '12px 20px',
                background: 'rgba(168,85,247,0.05)',
                borderRadius: '16px',
                border: '1px solid rgba(168,85,247,0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle2 color="#10b981" size={20} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#fff', letterSpacing: '1px' }}>SYNCHRONIZED SCRIPT READY</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                   <button onClick={copyToClipboard} style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }} title="Copy Script"><Copy size={16} /></button>
                   <button style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }} title="Download Script"><Download size={16} /></button>
                </div>
              </div>

              <div style={{
                maxHeight: '450px',
                overflowY: 'auto',
                padding: '24px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.8)',
                fontSize: '0.9rem',
                lineHeight: 1.6
              }} className="custom-scrollbar">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {analysis}
                </ReactMarkdown>
              </div>

              <button
                onClick={() => setStep('idle')}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.6)',
                  padding: '14px',
                  borderRadius: '50px',
                  fontSize: '0.8rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
              >
                ANALYZE NEW VIDEO
              </button>
            </motion.div>
          )}

          {step === 'error' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ textAlign: 'center', padding: '40px 0' }}
            >
              <div style={{ marginBottom: '24px', color: '#ef4444' }}>
                <AlertTriangle size={64} style={{ margin: '0 auto' }} />
              </div>
              <h3 style={{ fontSize: '1.2rem', color: '#fff', fontWeight: 900, marginBottom: '12px' }}>NEURAL LINK FAILURE</h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: '32px' }}>{error}</p>
              <button
                onClick={() => setStep('idle')}
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                  color: '#fff',
                  border: 'none',
                  padding: '14px 40px',
                  borderRadius: '50px',
                  fontSize: '0.8rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  textTransform: 'uppercase'
                }}
              >
                RE-INITIALIZE LINK
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(168,85,247,0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(168,85,247,0.4);
        }
      `}</style>
    </motion.div>
  );
}
