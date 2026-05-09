"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Send, Code, Play, Download, PanelLeft, 
  Settings, ChevronDown, Check, Copy, Terminal,
  Cpu, FileText, Maximize2, X, Sparkles, Layout,
  Layers, Package, ChevronRight, MessageSquare
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import ArtifactPanel from '@/components/ArtifactPanel';
import { useAuth } from '@/services/authContext';
import { GROQ_MODELS } from '@/services/aiService';

export default function ForgePage() {
  const { user, chats, currentChatId, setCurrentChatId, createNewChat, updateChatMessages, renameChat, deleteChat, logout } = useAuth();
  const [input, setInput] = useState('');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [localMessages, setLocalMessages] = useState<any[]>([]);
  const [manifest, setManifest] = useState<any>(null);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize a "Forge Session" if none exists
  useEffect(() => {
    if (!currentChatId && chats.length > 0) {
       // Auto-select latest or create new if needed
    }
  }, [currentChatId, chats]);

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

  const handleForgeRequest = async () => {
    if (!input.trim() || isLoading) return;
    
    let chatId = currentChatId || await createNewChat();
    const userMessage = { id: Date.now().toString(), role: 'user', content: input };
    const updatedMessages = [...localMessages, userMessage];
    
    setLocalMessages(updatedMessages);
    const originalInput = input;
    setInput('');
    setIsLoading(true);
    
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/forge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) throw new Error('API Sync Failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        setLocalMessages(prev => [...prev, { role: 'assistant', content: '' }]);
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          fullContent += chunk;
          
          setLocalMessages(prev => {
            const updated = [...prev];
            if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
              updated[updated.length - 1].content = fullContent;
            }
            return updated;
          });
        }
      }

      // Extract manifest
      const manifestMatch = fullContent.match(/<<<PROJECT_MANIFEST_START>>>([\s\S]*?)<<<PROJECT_MANIFEST_END>>>/);
      if (manifestMatch) {
         try {
           const parsed = JSON.parse(manifestMatch[1]);
           setManifest(parsed);
           setIsWorkspaceOpen(true);
         } catch (e) { console.error(e); }
      }

      updateChatMessages(chatId, [...updatedMessages, { role: 'assistant', content: fullContent }]);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      console.error(err);
    }
  };

  return (
    <div className="app-container" style={{ display: 'flex', height: '100dvh', background: '#050505', color: '#fff', overflow: 'hidden' }}>
      <Sidebar 
        isOpen={isSidebarOpen} 
        isMobile={false} 
        onClose={() => setSidebarOpen(false)} 
        chats={chats} 
        currentChatId={currentChatId}
        setCurrentChatId={setCurrentChatId}
        createNewChat={createNewChat}
        renameChat={renameChat}
        deleteChat={deleteChat}
        user={user}
        logout={logout}
        setShowAuthModal={() => {}}
        onSettingsOpen={() => {}}
      />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {/* Header */}
        <header style={{ padding: '0.8rem 1.5rem', background: 'rgba(2,2,2,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
             <button onClick={() => setSidebarOpen(true)} className="btn-ghost" style={{ padding: '8px' }}><PanelLeft size={20} /></button>
             <div style={{ width: '32px', height: '32px', background: 'var(--beast-gradient)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Layout size={18} fill="black" /></div>
             <div>
               <h1 style={{ fontSize: '0.9rem', fontWeight: 900, letterSpacing: '2px', color: '#fff' }}>SOVEREIGN FORGE</h1>
               <p style={{ fontSize: '0.6rem', color: 'var(--accent-beast)', fontWeight: 800, opacity: 0.7 }}>SOFTWARE FACTORY V1.0</p>
             </div>
           </div>
           
           <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
               <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 10px #10b981' }} />
               <span style={{ fontSize: '0.65rem', fontWeight: 900, letterSpacing: '1px', opacity: 0.6 }}>SYSTEMS ONLINE</span>
             </div>
           </div>
        </header>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Forge Chat */}
          <div style={{ width: isWorkspaceOpen ? '400px' : '100%', display: 'flex', flexDirection: 'column', borderRight: isWorkspaceOpen ? '1px solid rgba(255,255,255,0.05)' : 'none', transition: 'all 0.3s ease' }}>
            <div className="chat-scroll" ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
               {localMessages.length === 0 ? (
                 <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem', textAlign: 'center', opacity: 0.4 }}>
                   <div style={{ width: '64px', height: '64px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={32} /></div>
                   <div>
                     <h2 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '0.5rem' }}>INITIATE SYNTHESIS</h2>
                     <p style={{ fontSize: '0.75rem', maxWidth: '280px' }}>Describe the software or website you wish to forge. JLR AI will architect the solution.</p>
                   </div>
                 </div>
               ) : (
                 localMessages.map((msg, idx) => (
                   <div key={idx} style={{ marginBottom: '2rem' }}>
                     <div style={{ fontSize: '0.65rem', fontWeight: 900, opacity: 0.3, marginBottom: '0.6rem', letterSpacing: '1px' }}>{msg.role === 'user' ? 'COMMANDER' : 'JLR CORE'}</div>
                     <div style={{ fontSize: '0.9rem', lineHeight: 1.6, color: msg.role === 'user' ? '#fff' : 'rgba(255,255,255,0.8)' }}>{msg.content}</div>
                   </div>
                 ))
               )}
            </div>

            {/* Input */}
            <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.01)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
               <div style={{ position: 'relative' }}>
                 <textarea 
                   value={input}
                   onChange={(e) => setInput(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleForgeRequest()}
                   placeholder="Describe your project intent..."
                   style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1rem', paddingRight: '3.5rem', minHeight: '80px', color: '#fff', fontSize: '0.9rem', outline: 'none', resize: 'none' }}
                 />
                 <button onClick={handleForgeRequest} style={{ position: 'absolute', right: '12px', bottom: '12px', width: '40px', height: '40px', background: 'var(--beast-gradient)', border: 'none', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Send size={18} fill="black" /></button>
               </div>
            </div>
          </div>

          {/* Activity Workbench */}
          {isWorkspaceOpen && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#000' }}>
               {manifest ? (
                  <ArtifactPanel 
                   isOpen={true}
                   onClose={() => setIsWorkspaceOpen(false)}
                   manifest={manifest}
                  />
               ) : (
                 <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', opacity: 0.2 }}>
                   <Cpu size={64} />
                   <p style={{ fontSize: '0.8rem', fontWeight: 900, letterSpacing: '2px' }}>AWAITING ARCHITECTURE</p>
                 </div>
               )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
