"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

import { 
  PanelLeft, Send, Plus, MessageSquare, Copy, Check, StopCircle, 
  User, Sparkles, Search, Settings as SettingsIcon, MoreVertical, Zap, 
  Terminal, ChevronDown, LogOut, Trash2, Edit2, AlertCircle, ArrowRight, ShieldAlert,
  Loader2, Film, Globe, ShieldCheck, EyeOff
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sendMessage, analyzeImage, GROQ_MODELS } from '@/services/aiService';
import { useAuth } from '@/services/authContext';
import AuthScreen from '@/components/AuthScreen';
import FileUploader, { FileData } from '@/components/FileUploader';
import Settings from '@/components/Settings';
import NeuralCanvas from '@/components/NeuralCanvas';
import SovereignCinematic from '@/components/SovereignCinematic';
import Sidebar from '@/components/Sidebar';
import NeuralCanvas3D from '@/components/NeuralCanvas3D';
import RotatingBeast from '@/components/RotatingBeast';

const CodeBlock = ({ inline, className, children, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : '';
  const copyToClipboard = () => {
    const text = String(children).replace(/\n$/, '');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  if (inline) return <code className={className} {...props} style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.9em', color: 'var(--accent-primary)' }}>{children}</code>;
  return (
    <div className="hologram-card" style={{ margin: '1rem 0', overflow: 'hidden', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', opacity: 0.6, fontSize: '0.65rem', fontWeight: 900, letterSpacing: '0.05em' }}>
          <Terminal size={12} className="text-accent-primary" />
          <span>{lang.toUpperCase() || 'DOCUMENT'}</span>
        </div>
        <button onClick={copyToClipboard} style={{ background: 'transparent', border: 'none', color: copied ? '#00f2fe' : 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.65rem', fontWeight: 800 }}>
          {copied ? <><Check size={12} /> COPIED</> : <><Copy size={12} /> COPY</>}
        </button>
      </div>
      <pre style={{ 
        padding: '1rem', 
        margin: 0, 
        overflowX: 'auto', 
        background: 'transparent',
        whiteSpace: 'pre-wrap', 
        wordBreak: 'break-word',
        fontSize: '0.8rem',
        lineHeight: '1.6'
      }}>
        <code style={{ background: 'transparent', color: '#d1d5db', fontFamily: 'monospace' }} {...props}>{children}</code>
      </pre>
    </div>
  );
};

export default function AppMain() {
  const { user, loading: authLoading, chats, currentChatId, setCurrentChatId, createNewChat, updateChatMessages, renameChat, deleteChat, logout } = useAuth();
  const [artifactManifest, setArtifactManifest] = useState<any>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false); // [SOVEREIGN PRIVACY]: Incognito Mode
  const [input, setInput] = useState('');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(GROQ_MODELS[0].id);
  const [files, setFiles] = useState<FileData[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [responseIntelligence, setResponseIntelligence] = useState<'auto' | 'concise' | 'medium' | 'long'>('auto');
  const [localMessages, setLocalMessages] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastChatIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    setHasMounted(true);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const currentChat = chats.find(c => c.id === currentChatId);

  useEffect(() => {
    if (isLoading) return; 
    
    if (currentChat) {
      const cloudMsgs = currentChat.messages || [];
      const isChatSwitch = lastChatIdRef.current !== currentChatId;
      
      // [SOVEREIGN PROTECTION]: On chat switch, clear local messages first to prevent ghost rendering collisions
      if (isChatSwitch) {
        setLocalMessages([]); 
        // Small delay to ensure state clears before loading new batch
        setTimeout(() => {
          setLocalMessages(cloudMsgs);
          lastChatIdRef.current = currentChatId;
        }, 10);
      } else if (localMessages.length === 0 && cloudMsgs.length > 0) {
        setLocalMessages(cloudMsgs);
      }
    } else if (!currentChatId) {
      if (localMessages.length > 0) setLocalMessages([]);
      lastChatIdRef.current = null;
    }
  }, [currentChatId, chats, isLoading]);

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  const scrollToBottom = useCallback((smooth = false) => { 
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ 
        top: scrollRef.current.scrollHeight, 
        behavior: smooth ? 'smooth' : 'auto' 
      }); 
    } 
  }, []);

  useEffect(() => { 
    scrollToBottom(localMessages.length > 0 && !isLoading); 
  }, [localMessages, scrollToBottom, isLoading]);

  useEffect(() => {
    if (user && user.id !== 'guest') {
      setShowAuthModal(false);
    }
  }, [user]);

  const autoGenerateTitle = async (chatId: string, userMsg: string, aiMsg: string) => {
    try {
      // Use a more sophisticated prompt for "Supreme" titles
      const prompt = `Task: Create a 3-5 word high-authority title for this conversation.
Context:
User: ${userMsg.slice(0, 500)}
AI: ${aiMsg.slice(0, 500)}

Requirements:
- Professional, technical, or descriptive.
- No quotes.
- No "Title:".
- Max 5 words.`;

      await sendMessage([{ role: 'user', content: prompt }], 'llama-3.1-8b-instant', {
        onDone: (title) => {
          const cleanTitle = title.trim().replace(/^"|"$/g, '').replace(/^Title:\s*/i, '');
          if (cleanTitle && cleanTitle.length < 60) {
            renameChat(chatId, cleanTitle);
          }
        }
      });
    } catch {}
  };

  const handleSendMessage = async () => {
    if ((!input.trim() && files.length === 0) || isLoading) return;
    
    let chatId = currentChatId || await createNewChat();
    const userMessage = { id: Date.now().toString(), role: 'user', content: input, attachments: files.map(f => ({ name: f.name, type: f.type })) };
    const updatedMessagesWithAI = [...localMessages, userMessage];
    
    setLocalMessages(updatedMessagesWithAI);
    const originalInput = input;
    setInput('');
    const originalFiles = [...files];
    setFiles([]);
    setIsLoading(true);
    
    // [NEURAL INTENT]: Detect if user wants an image or video to trigger beast loading
    const isArtIntent = /draw|create|generate|render.*?image|picture|photo|art|video|movie|film/i.test(originalInput);
    if (isArtIntent) setIsGeneratingImage(true);

    abortControllerRef.current = new AbortController();

    const videoFileObj = originalFiles.find(f => f.type === 'video')?.file;

    const opts = {
      userId: user?.id,
      responseLength: responseIntelligence,
      isSearchMode: isSearchMode,
      isPrivacyMode: isPrivacyMode, // [INCOGNITO]: Bypass persistence
      videoFile: videoFileObj, // [OMNI-MODE]: Pass raw file

      // [CRITICAL FIX]: Only include TEXT-based documents in fileContext, NEVER base64 images/PDFs
      fileContext: originalFiles.filter(f => f.type === 'document').length > 0
        ? originalFiles.filter(f => f.type === 'document').map(f => `File: ${f.name}\nContent: ${f.data}`).join('\n\n')
        : undefined,
      signal: abortControllerRef.current?.signal,
      onToken: (token: string) => {
        setLocalMessages(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'assistant') {
            const updated = [...prev];
            updated[updated.length - 1] = { ...last, content: last.content + token };
            return updated;
          }
          return [...prev, { id: 'streaming-ai', role: 'assistant', content: token }];
        });
      },
      onDone: (full: string) => {
        setIsLoading(false);
        setIsGeneratingImage(false);
        const aiMessage = { id: Date.now().toString(), role: 'assistant', content: full };
        const finalMessages = [...updatedMessagesWithAI, aiMessage];
        
        // [SOVEREIGN PRIVACY]: If Incognito is active, skip cloud persistence entirely
        if (!isPrivacyMode) {
          updateChatMessages(chatId, finalMessages);
          
          const isDefaultTitle = !currentChat?.title || currentChat.title === 'New Power Session';
          if (updatedMessagesWithAI.length === 1 && isDefaultTitle) {
            autoGenerateTitle(chatId, originalInput, full);
          }
        }
        
        setLocalMessages(finalMessages); // Explicitly sync local state for immediate feedback
      },
      onError: (err: any) => {
        setIsLoading(false);
        const errorMsg = typeof err === 'string' ? err : (err.message || 'Unknown Neural Error');
        setLocalMessages(prev => [...prev, { 
          id: Date.now().toString(), 
          role: 'assistant', 
          content: `⚠️ JLR AI ERROR: ${errorMsg}` 
        }]);
      }
    };

    try {
      // [ABSOLUTE FIX]: Route images AND pdf_visual through the vision pipeline, never as text
      const visualFile = originalFiles.find(f => f.type === 'image' || f.type === 'pdf_visual' || f.type.startsWith('image/'));
      if (visualFile) {
        // For PDFs, use first page. For images, use data directly.
        const imageData = visualFile.data;
        const prompt = originalInput || (visualFile.type === 'pdf_visual'
          ? `Analyze this document page from "${visualFile.name}" in detail. Extract all text, explain all content thoroughly.`
          : `Analyze this image in high-density detail.`);
        await analyzeImage(imageData, prompt, selectedModel, opts);
      } else {
        await sendMessage(updatedMessagesWithAI, selectedModel, opts);
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setIsLoading(false);
        setIsGeneratingImage(false);
        setLocalMessages(prev => [...prev, { role: 'assistant', content: `⚠️ System Link Failure: ${e.message}` }]);
      }
    }
  };

  return (
    <div className="app-container" suppressHydrationWarning style={{ 
      position: 'fixed', 
      inset: 0, 
      overflow: 'hidden', 
      height: '100dvh', 
      display: 'flex', 
      background: '#010101' 
    }}>
      {/* Neural Omniscience Background Engine */}
      <NeuralCanvas3D />
      
      {/* Cinematic Background Scanlines */}
      <div className="scanlines" style={{ pointerEvents: 'none' }} />

      {/* Giant Holographic Watermark Branding */}
      {/* Giant Holographic Watermark - ANCHORED TO BACKGROUND layer */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.02 }}
        style={{ 
          position: 'fixed', 
          inset: 0, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          pointerEvents: 'none', 
          zIndex: -10, // Moved below EVERYTHING
          userSelect: 'none'
        }}
      >
        <h1 style={{ 
          fontSize: isMobile ? '12vw' : '15vw', 
          fontWeight: 900, 
          color: 'rgba(255,255,255,1)', 
          opacity: 0.03, 
          letterSpacing: '2vw',
          fontFamily: 'Montserrat'
        }}>JLR AI</h1>
      </motion.div>
      
      <Settings isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} />
      
      <AnimatePresence>
        {isSidebarOpen && isMobile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="mobile-overlay"
            style={{ zIndex: 100 }}
          />
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {isSidebarOpen && (
          <Sidebar 
            isOpen={isSidebarOpen}
            isMobile={isMobile}
            onClose={() => setSidebarOpen(false)}
            chats={chats}
            currentChatId={currentChatId}
            setCurrentChatId={setCurrentChatId}
            createNewChat={createNewChat}
            renameChat={renameChat}
            deleteChat={deleteChat}
            user={user}
            logout={logout}
            setShowAuthModal={setShowAuthModal}
            isSearchMode={isSearchMode}
            onSearchToggle={() => setIsSearchMode(!isSearchMode)}
            onSettingsOpen={() => setSettingsOpen(true)}
          />
        )}
      </AnimatePresence>

      <main 
        className="main-content" 
        suppressHydrationWarning 
        style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          position: 'relative', 
          width: '100%', 
          height: '100dvh', // Explicit height to prevent keyboard shift
          overflow: 'hidden'
        }}
      >
        {/* PEAK HEADER */}
        <header style={{ 
          padding: isMobile ? '0.75rem 1rem' : '1rem 2rem', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          background: 'rgba(1,1,1,0.6)', 
          backdropFilter: 'blur(30px)', 
          borderBottom: '1px solid var(--glass-border)', 
          zIndex: 50,
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button 
              onClick={() => setSidebarOpen(true)} 
              style={{ padding: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '10px', color: '#fff', cursor: 'pointer' }}
            >
              <PanelLeft size={20} />
            </button>
            {!isMobile && (
              <div style={{ display: 'flex', gap: '2rem', marginLeft: '2rem', alignItems: 'center' }}>
                <RotatingBeast size={32} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--accent-primary)', letterSpacing: '2px' }}>SUPREMACY ACTIVE</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 900, letterSpacing: '1px' }}>NEURAL SYNC // PROTOCOL ∞</span>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <select 
              value={selectedModel} 
              onChange={(e) => setSelectedModel(e.target.value)} 
              style={{ background: 'transparent', color: '#fff', border: 'none', fontSize: '0.8rem', fontWeight: 900, cursor: 'pointer', outline: 'none', appearance: 'none' }}
            >
              {GROQ_MODELS.map(m => <option key={m.id} value={m.id} style={{ background: '#0a0a0a' }}>{m.name.toUpperCase()}</option>)}
            </select>
            <ChevronDown size={14} opacity={0.5} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button 
              onClick={() => setSettingsOpen(true)} 
              style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}
            >
              <SettingsIcon size={18} />
            </button>
          </div>
        </header>

        {/* CHAT AREA */}
        <div className="chat-scroll" ref={scrollRef} style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: isMobile ? '1rem' : '2rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <div className="chat-container" style={{ width: '100%', maxWidth: '800px', paddingBottom: '160px' }}>
            {localMessages.length === 0 ? (
              <div style={{ height: '50vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem' }}>
                <RotatingBeast size={isMobile ? 120 : 180} />
                <div style={{ textAlign: 'center' }}>
                  <h1 style={{ fontSize: isMobile ? '1.8rem' : '3.5rem', fontWeight: 900, letterSpacing: '12px', textTransform: 'uppercase', marginBottom: '0.5rem', background: 'var(--gold-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>NEURAL SYNC</h1>
                  <p style={{ fontSize: '0.8rem', fontWeight: 900, opacity: 0.6, letterSpacing: '6px', color: 'var(--accent-primary)' }}>SUPREMACY ACTIVE // AWAITING COMMANDS</p>
                </div>
              </div>
            ) : (
              localMessages.map((msg: any) => (
                <div key={msg.id} style={{ marginBottom: '3rem', opacity: 1, position: 'relative' }}>
                  {/* Neural Connector Line */}
                  <div style={{ 
                    position: 'absolute', 
                    left: isMobile ? '17px' : '17px', 
                    top: '40px', 
                    bottom: '-48px', 
                    width: '2px', 
                    background: 'linear-gradient(to bottom, var(--accent-primary), transparent)', 
                    opacity: 0.2, 
                    zIndex: 0 
                  }} />

                  <div style={{ display: 'flex', gap: isMobile ? '1rem' : '1.5rem', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                    <div style={{ 
                      width: '36px', 
                      height: '36px', 
                      borderRadius: '10px', 
                      background: msg.role === 'assistant' ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '4px',
                      boxShadow: msg.role === 'assistant' ? '0 0 15px rgba(0, 210, 255, 0.4)' : 'none'
                    }}>
                      {msg.role === 'assistant' ? <RotatingBeast size={28} /> : <User size={18} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 900, opacity: 0.3, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                        {msg.role === 'assistant' ? 'JLR SUPREMACY' : 'COMMANDER'}
                      </div>
                      <div className="prose" style={{ 
                        fontSize: isMobile ? '0.95rem' : '1.05rem', 
                        lineHeight: 1.6, 
                        color: msg.role === 'assistant' ? 'rgba(255,255,255,0.95)' : '#fff'
                      }}>
                        {msg.role === 'assistant' ? (
                          <>
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]} 
                              components={{ 
                                code: CodeBlock, 
                                p: ({ children }) => <div style={{ marginBottom: '1.25rem' }}>{children}</div> 
                              }}
                            >
                              {(msg.content || '')
                                .replace(/\[ART_PROMPT:\s*(.*?)\]/g, '')
                                .replace(/<<<CINEMATIC_MANIFEST_START>>>[\s\S]*?(?:<<<CINEMATIC_MANIFEST_END>>>|$)/g, '')}
                            </ReactMarkdown>

                            {msg.content?.match(/\[ART_PROMPT:\s*(.*?)\]/) && (
                              <NeuralCanvas prompt={msg.content?.match(/\[ART_PROMPT:\s*(.*?)\]/)?.[1] || ''} userId={user?.id} />
                            )}

                            {(() => {
                              const manifestMatch = msg.content?.match(/<<<CINEMATIC_MANIFEST_START>>>([\s\S]*?)(?:<<<CINEMATIC_MANIFEST_END>>>|$)/);
                              if (manifestMatch) {
                                return <SovereignCinematic manifestJson={manifestMatch[1].trim()} />;
                              }
                              return null;
                            })()}
                          </>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content || ''}</p>
                            {msg.attachments?.map((at: any, i: number) => (
                              <div key={i} className="hologram-card" style={{ padding: '8px 16px', fontSize: '0.7rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '8px', width: 'fit-content' }}>
                                <FileUploader files={files} onFilesChange={setFiles} showButton={false} />
                                {at.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div style={{ paddingLeft: isMobile ? '3.25rem' : '3.75rem' }}>
                <LoaderPulse />
              </div>
            )}
          </div>
        </div>

        {/* COMMAND CENTER - ULTRA HARDENED LAYER */}
        <div className="command-center" style={{ 
          padding: isMobile ? '1rem 0.75rem 2rem 0.75rem' : '20px 2rem 40px 2rem', 
          background: 'rgba(2,2,2,0.98)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          backdropFilter: 'blur(30px)',
          zIndex: 2000000, // Absolute peak priority
          position: 'sticky',
          bottom: 0,
          pointerEvents: 'auto'
        }}>
          <div className="input-container" style={{ 
            margin: '0 auto', 
            width: '100%', 
            maxWidth: '850px',
            padding: '12px 16px',
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--glass-border)',
            pointerEvents: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
               <div style={{ display: 'flex', gap: '8px' }}>
                 <button 
                   onClick={() => setIsSearchMode(!isSearchMode)}
                   style={{ 
                     display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '12px', 
                     background: isSearchMode ? 'rgba(0,210,255,0.1)' : 'rgba(255,255,255,0.03)',
                     border: isSearchMode ? '1px solid rgba(0,210,255,0.3)' : '1px solid var(--glass-border)',
                     color: isSearchMode ? 'var(--accent-primary)' : 'rgba(255,255,255,0.4)',
                     fontSize: '0.65rem', fontWeight: 900, cursor: 'pointer', transition: 'all 0.3s'
                   }}
                 >
                   <Globe size={12} /> {isSearchMode ? 'SEARCH: ON' : 'SEARCH'}
                 </button>
                 <button 
                   onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                   style={{ 
                     display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '12px', 
                     background: isPrivacyMode ? 'rgba(0,255,157,0.1)' : 'rgba(255,255,255,0.03)',
                     border: isPrivacyMode ? '1px solid rgba(0,255,157,0.3)' : '1px solid var(--glass-border)',
                     color: isPrivacyMode ? 'var(--accent-beast)' : 'rgba(255,255,255,0.4)',
                     fontSize: '0.65rem', fontWeight: 900, cursor: 'pointer', transition: 'all 0.3s'
                   }}
                 >
                   {isPrivacyMode ? <ShieldCheck size={12} /> : <EyeOff size={12} />}
                   {isPrivacyMode ? 'PRIVATE: ACTIVE' : 'PRIVATE'}
                 </button>
               </div>
               <select 
                 value={responseIntelligence}
                 onChange={(e) => setResponseIntelligence(e.target.value as any)}
                 style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', fontWeight: 900, cursor: 'pointer', outline: 'none' }}
               >
                 <option value="auto">AUTO</option>
                 <option value="concise">CONCISE</option>
                 <option value="medium">MEDIUM</option>
                 <option value="long">LONG</option>
               </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <FileUploader files={files} onFilesChange={setFiles} />
              <textarea 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                placeholder="Synchronize command..." 
                rows={1}
                style={{ 
                  flex: 1, 
                  maxHeight: '120px', 
                  fontSize: '1rem', 
                  padding: '12px 0',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  lineHeight: '1.5',
                  resize: 'none',
                  pointerEvents: 'auto'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <motion.button 
                whileHover={{ scale: 1.1, color: 'var(--accent-primary)' }}
                whileTap={{ scale: 0.9 }}
                onClick={handleSendMessage}
                disabled={isLoading}
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  color: 'rgba(255,255,255,0.4)', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px'
                }}
              >
                <ArrowRight size={20} />
              </motion.button>
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showAuthModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 3000000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <AuthScreen onClose={() => setShowAuthModal(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .sidebar-item:hover .action-btn { opacity: 1; }
        .sidebar-item:hover .stylish-delete:hover { color: #ff4d4d; }
        .action-btn { opacity: 0; transition: all 0.2s; background: transparent; border: none; padding: 4px; border-radius: 4px; color: rgba(255,255,255,0.4); cursor: pointer; }
        .sidebar-item:hover { background: rgba(255,255,255,0.05) !important; transform: translateX(5px); }
        .sidebar-item.active { border-left: 2px solid var(--accent-beast) !important; }
        
        .prose h1, .prose h2, .prose h3 { color: var(--accent-primary); margin: 1.5rem 0 1rem 0; font-weight: 800; letter-spacing: -0.02em; }
        .prose h1 { font-size: 1.6rem; }
        .prose h2 { font-size: 1.4rem; }
        .prose h3 { font-size: 1.2rem; }
        .prose p { margin-bottom: 1.2rem; color: rgba(255,255,255,0.85); line-height: 1.8; }
        .prose ul, .prose ol { padding-left: 1.5rem; margin-bottom: 1.2rem; }
        .prose li { margin-bottom: 0.5rem; color: rgba(255,255,255,0.85); }
        .prose strong { color: #fff; font-weight: 700; }
        .prose blockquote { border-left: 4px solid var(--accent-primary); padding-left: 1rem; margin: 1rem 0; font-style: italic; opacity: 0.8; }
        
        .chat-scroll::-webkit-scrollbar { width: 5px; }
        .chat-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>

    </div>
  );
}

const LoaderPulse = () => <div style={{ display: 'flex', gap: '8px' }}>{[0,1,2].map(i => <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }} transition={{ duration: 1.2, repeat: Infinity, delay: i*0.2 }} style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-beast)', boxShadow: '0 0 10px var(--accent-beast)' }} />)}</div>;
