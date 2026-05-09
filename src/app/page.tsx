"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

import { 
  PanelLeft, Send, Plus, MessageSquare, Copy, Check, StopCircle, 
  User, Sparkles, Search, Settings as SettingsIcon, MoreVertical, Zap, 
  Terminal, ChevronDown, LogOut, Trash2, Edit2, AlertCircle, ArrowRight, ShieldAlert,
  Loader2, Film
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
  const [input, setInput] = useState('');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(GROQ_MODELS[0].id);
  const [files, setFiles] = useState<FileData[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
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

    const opts = {
      userId: user?.id,
      responseLength: responseIntelligence,
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
          return [...prev, { role: 'assistant', content: token }];
        });
      },
      onDone: (full: string) => {
        setIsLoading(false);
        setIsGeneratingImage(false);
        const finalMessages = [...updatedMessagesWithAI, { role: 'assistant', content: full }];
        updateChatMessages(chatId, finalMessages);
        const isDefaultTitle = !currentChat?.title || currentChat.title === 'New Power Session';
        if (updatedMessagesWithAI.length === 1 && isDefaultTitle) {
          autoGenerateTitle(chatId, originalInput, full);
        }
      },
      onError: (err: any) => {
        setIsLoading(false);
        setLocalMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${err.message || err}` }]);
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


  const startRename = (id: string, title: string) => {
    setRenamingId(id);
    setRenameValue(title);
  };

  const submitRename = () => {
    if (renamingId && renameValue.trim()) {
      renameChat(renamingId, renameValue.trim());
      setRenamingId(null);
    }
  };

  return (
    <div className="app-container" suppressHydrationWarning style={{ position: 'relative', overflow: 'hidden', height: '100dvh', display: 'flex', background: '#020202' }}>
      <Settings isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} />
      
      <AnimatePresence>
        {isSidebarOpen && isMobile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="mobile-overlay"
          />
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside 
            initial={isMobile ? { x: '-100%' } : { width: '280px' }}
            animate={isMobile ? (isSidebarOpen ? { x: 0 } : { x: '-100%' }) : (isSidebarOpen ? { width: '280px' } : { width: '0px' })}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{ 
              background: 'rgba(5,5,5,0.95)', 
              backdropFilter: 'blur(30px)',
              borderRight: '1px solid var(--glass-border)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: isMobile ? 'fixed' : 'relative',
              top: 0,
              bottom: 0,
              left: 0,
              width: isMobile ? '85%' : '280px',
              zIndex: 100,
              boxShadow: isMobile && isSidebarOpen ? '20px 0 50px rgba(0,0,0,0.5)' : 'none',
              padding: '1.25rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <div style={{ width: '36px', height: '36px', background: 'var(--beast-gradient)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(0, 255, 157, 0.3)' }}><Zap size={20} fill="black" /></div>
                <h2 className="text-beast" style={{ fontSize: '1.2rem', letterSpacing: '0.5px' }}>JLR AI</h2>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="btn-ghost" style={{ padding: '6px' }}><PanelLeft size={18} /></button>
            </div>
            
            <button onClick={() => { createNewChat(); if(isMobile) setSidebarOpen(false); }} className="btn-beast" style={{ width: '100%', marginBottom: '2rem', justifyContent: 'center', borderRadius: '12px', padding: '12px', fontSize: '0.8rem', letterSpacing: '1px' }}><Plus size={18} /><span>NEW SESSION</span></button>
            
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: '1.25rem', fontWeight: 900, letterSpacing: '2px' }}>NEURAL ARCHIVE</p>
              {chats.filter(c => c.messages.length > 0 || c.id === currentChatId).map(chat => (
                <div key={chat.id} className={`sidebar-item ${currentChatId === chat.id ? 'active' : ''}`} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 0.8rem', marginBottom: '6px', borderRadius: '12px', transition: 'all 0.2s', border: currentChatId === chat.id ? '1px solid var(--glass-border)' : '1px solid transparent', background: currentChatId === chat.id ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                  <MessageSquare size={16} style={{ opacity: 0.4, flexShrink: 0 }} />
                  {renamingId === chat.id ? (
                    <input 
                      autoFocus 
                      value={renameValue} 
                      onChange={(e) => setRenameValue(e.target.value)} 
                      onBlur={submitRename}
                      onKeyDown={(e) => e.key === 'Enter' && submitRename()}
                      style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.85rem', width: '100%', outline: 'none' }}
                    />
                  ) : (
                    <div onClick={() => { setCurrentChatId(chat.id); if(isMobile) setSidebarOpen(false); }} style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem', fontWeight: 500, color: currentChatId === chat.id ? '#fff' : 'rgba(255,255,255,0.6)' }}>{chat.title}</div>
                  )}
                  <div className="item-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                    {!renamingId && (
                      <button onClick={(e) => { e.stopPropagation(); startRename(chat.id, chat.title); }} className="action-btn hover-glow" title="Rename Session">
                        <Edit2 size={12} />
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }} className="action-btn stylish-delete" title="Purge Session">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
              <div className="hologram-card" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderRadius: '16px', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(45deg, #050505, #222)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={18} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user ? user.username : 'GUEST NODE'}</div>
                  <div style={{ fontSize: '0.65rem', color: user?.id !== 'guest' ? 'var(--accent-beast)' : 'rgba(255,255,255,0.3)', fontWeight: 800 }}>{user?.id !== 'guest' ? 'SUPREME ACCESS' : 'RESTRICTED LINK'}</div>
                </div>
                {(user?.username === 'ravirajjavvadi' || user?.email === 'ravirajjavvadi@gmail.com') && (
                  <Link href="/admin" style={{ color: 'rgba(255,255,255,0.4)' }} title="Supreme Command Center">
                    <ShieldAlert size={16} />
                  </Link>

                )}
                {user?.id !== 'guest' ? (
                  <button onClick={logout} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }} title="Log Out"><LogOut size={16} /></button>
                ) : (
                  <button onClick={() => setShowAuthModal(true)} style={{ background: 'var(--accent-beast)', border: 'none', color: '#000', padding: '4px 10px', borderRadius: '8px', fontSize: '0.6rem', fontWeight: 900, cursor: 'pointer', letterSpacing: '1px' }}>IDENTIFY</button>
                )}
              </div>


            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <main className="main-content" suppressHydrationWarning style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', width: '100%', height: '100dvh' }}>
        <header style={{ padding: isMobile ? '0.5rem 0.75rem' : '0.8rem 1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(2,2,2,0.7)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--glass-border)', zIndex: 10, height: isMobile ? '56px' : 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <button onClick={() => setSidebarOpen(true)} className="btn-ghost" style={{ padding: '8px', background: 'transparent', border: 'none', color: '#fff' }}><PanelLeft size={22} /></button>
          </div>

          <div style={{ flex: 3, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.9)', border: 'none', fontSize: isMobile ? '0.85rem' : '0.9rem', fontWeight: 800, cursor: 'pointer', outline: 'none', textAlign: 'center', width: 'auto' }}>
              {GROQ_MODELS.map(m => <option key={m.id} value={m.id} style={{ background: '#080808' }}>{m.name.toUpperCase()}</option>)}
            </select>
            <ChevronDown size={14} style={{ marginLeft: '4px', opacity: 0.5 }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'flex-end' }}>
            <button onClick={() => setSettingsOpen(true)} className="btn-ghost" style={{ padding: '8px', background: 'transparent', border: 'none', color: '#fff' }}><SettingsIcon size={20} /></button>
          </div>
        </header>

        <div className="chat-scroll" ref={scrollRef} style={{ flex: 1, overflowY: 'auto' }}>
          <div className="chat-container" style={{ maxWidth: '850px', margin: '0 auto', padding: isMobile ? '1rem 1rem 220px 1rem' : '3rem 1.5rem 180px 1.5rem' }}>
            {localMessages.length === 0 ? (
              <div style={{ height: '55vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2.5rem', opacity: 0.6 }}>
                <motion.div animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }} transition={{ duration: 4, repeat: Infinity }} style={{ width: '80px', height: '80px', background: 'var(--accent-gradient)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 50px rgba(0, 242, 254, 0.4)' }}>
                  <Zap size={40} fill="black" />
                </motion.div>
                <h1 className="text-beast" style={{ fontSize: isMobile ? '1.5rem' : '2.5rem', letterSpacing: isMobile ? '4px' : '8px', textAlign: 'center' }}>DEPLOY INTELLIGENCE</h1>
              </div>
            ) : (
              localMessages.map((msg: any) => (

                <div key={msg.id} className={`message ${msg.role}`} style={{ marginBottom: '3.5rem' }}>
                  <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: msg.role === 'assistant' ? 'var(--beast-gradient)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {msg.role === 'assistant' ? <Zap size={22} fill="black" /> : <User size={22} />}
                    </div>
                    <div className="prose" style={{ 
                      flex: 1, 
                      minWidth: 0, 
                      overflowWrap: 'anywhere',
                      wordBreak: 'normal'
                    }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 900, opacity: 0.4, marginBottom: '0.75rem', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                        {msg.role === 'assistant' ? 'JLR AI SUPREMACY' : 'COMMANDER'}
                      </div>
                      <div style={{ 
                        padding: (msg as any).isError ? '1rem' : '0',
                        background: (msg as any).isError ? 'rgba(255,107,107,0.05)' : 'transparent',
                        borderRadius: '12px',
                        border: (msg as any).isError ? '1px solid rgba(255,107,107,0.2)' : 'none',
                        fontSize: isMobile ? '0.95rem' : '1.05rem',
                        lineHeight: 1.7,
                        color: 'rgba(255,255,255,0.9)'
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
                              <NeuralCanvas prompt={msg.content?.match(/\[ART_PROMPT:\s*(.*?)\]/)?.[1] || ''} />
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
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <p style={{ whiteSpace: 'pre-wrap', fontSize: '1.05rem', color: '#fff', lineHeight: 1.6 }}>{msg.content || ''}</p>
                            {msg.attachments?.map((at: any, i: number) => (
                              <div key={i} style={{ fontSize: '0.7rem', opacity: 0.5, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Sparkles size={10} /> {at.name} ({at.type.toUpperCase()})
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
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {isGeneratingImage ? (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    background: 'rgba(16,185,129,0.05)', 
                    padding: '12px 20px', 
                    borderRadius: '16px', 
                    border: '1px solid rgba(16,185,129,0.15)',
                    width: 'fit-content'
                  }}>
                    <Loader2 size={18} className="animate-spin" style={{ color: '#10b981' }} />
                    <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#10b981', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                      Synthesizing Neural Canvas...
                    </span>
                  </div>
                ) : (
                  <div style={{ opacity: 0.6 }}><LoaderPulse /></div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="command-center" style={{ 
          position: 'absolute', 
          bottom: isMobile ? '16px' : '28px', 
          left: 0, 
          right: 0, 
          pointerEvents: 'none', 
          padding: isMobile ? '0 0.75rem' : '0 1.5rem', 
          zIndex: 50 
        }}>
          <div className="input-container" style={{ 
            pointerEvents: 'auto', 
            margin: '0 auto', 
            maxWidth: '900px', 
            width: '100%',
            display: 'flex', 
            flexDirection: 'column',
            padding: isMobile ? '10px 14px' : '12px 20px',
            background: 'rgba(28, 28, 30, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: isMobile ? '24px' : '32px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 4px' }}>
              <FileUploader files={files} onFilesChange={setFiles} showButton={false} />
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.4 }}>Length:</span>
                <select 
                  value={responseIntelligence}
                  onChange={(e) => setResponseIntelligence(e.target.value as any)}
                  style={{ 
                    background: 'rgba(255,255,255,0.05)', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '6px', 
                    color: '#fff', 
                    fontSize: '10px', 
                    padding: '2px 8px',
                    outline: 'none',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  <option value="auto">SMART AUTO</option>
                  <option value="concise">CONCISE (2-3 L)</option>
                  <option value="medium">MEDIUM (10-15 L)</option>
                  <option value="long">LONG (DETAILED)</option>
                </select>
              </div>
            </div>

            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '44px' }}>
              <div style={{ flexShrink: 0 }}><FileUploader files={files} onFilesChange={setFiles} showButton={true} showPreviews={false} /></div>
              
              <textarea 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                placeholder="Message JLR AI..." 
                className="liquid-input" 
                rows={1}
                style={{ 
                  flex: 1, 
                  maxHeight: '150px', 
                  fontSize: '16px', // Prevents iOS zoom
                  padding: '10px 0',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  lineHeight: '1.4'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              
              <button 
                onClick={handleSendMessage} 
                disabled={!input.trim() && files.length === 0}
                style={{ 
                  width: isMobile ? '40px' : '36px', 
                  height: isMobile ? '40px' : '36px', 
                  borderRadius: '50%', 
                  background: input.trim() ? '#fff' : 'rgba(255,255,255,0.1)', 
                  border: 'none', 
                  color: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  transform: input.trim() ? 'scale(1)' : 'scale(0.95)'
                }}
              >
                <ArrowRight size={isMobile ? 20 : 18} strokeWidth={3} />
              </button>

            </div>
          </div>
          <p style={{ textAlign: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>
            JLR AI can make mistakes.
          </p>
        </div>
      </main>

      <AnimatePresence>
        {showAuthModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
