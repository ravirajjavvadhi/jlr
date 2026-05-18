"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

export type Chat = {
  id: string;
  title: string;
  messages: any[];
  model: string;
  updatedAt: number;
};

type User = {
  id: string;
  username: string;
  email?: string;
  isGuest?: boolean;
  custom_api_key?: string;
};


type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (username: string, supremacyKey: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signup: (username: string, supremacyKey: string) => Promise<void>;
  logout: () => void;
  chats: Chat[];
  currentChatId: string | null;
  setCurrentChatId: (id: string | null) => void;
  createNewChat: () => Promise<string>;
  updateChatMessages: (chatId: string, messages: any[]) => Promise<void>;
  renameChat: (chatId: string, title: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
};

import { auth, googleProvider } from './firebase';
import { signInWithPopup } from 'firebase/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);


// ─── Namespaced Local Storage helpers ─────────────────────────────────────────
function getStorage(userId?: string) {
  if (typeof window === 'undefined') return null;
  // [GUEST VOLATILITY]: Use sessionStorage for guests, localStorage for members
  return (!userId || userId === 'guest') ? window.sessionStorage : window.localStorage;
}

function getStorageKey(userId?: string) {
  return userId && userId !== 'guest' ? `supremacy_chats_${userId}` : 'supremacy_chats_guest';
}

function loadLocalChats(userId?: string): Chat[] {
  const s = getStorage(userId);
  if (!s) return [];
  try { 
    return JSON.parse(s.getItem(getStorageKey(userId)) || '[]'); 
  } catch { return []; }
}

function saveLocalChats(chats: Chat[], userId?: string) {
  const s = getStorage(userId);
  if (s) s.setItem(getStorageKey(userId), JSON.stringify(chats));
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  // ─── Identity & URL Synchronization ──────────────────────────────────────────
  useEffect(() => {
    const initIdentity = async () => {
      setLoading(true);
      const sessionData = localStorage.getItem('supremacy_session');
      
      let initialUser: User = { id: 'guest', username: 'Guest', isGuest: true };
      if (sessionData) {
        try { initialUser = JSON.parse(sessionData); } catch {}
      }
      
      setUser(initialUser);
      
      // Load currentChatId from URL if present
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const urlId = params.get('c');
        if (urlId) setCurrentChatId(urlId);
      }

      // Immediately load local namespaced cache
      const locals = loadLocalChats(initialUser.id);
      setChats(locals);

      if (!initialUser.isGuest) {
        try {
          const res = await fetch(`/api/db/chats?userId=${initialUser.id}`);
          if (res.ok) {
            const data = await res.json();
            const cloudRaw = Array.isArray(data.chats) ? data.chats : [];
            
            const cloud: Chat[] = cloudRaw.map((c: any) => ({
              id: c.id,
              title: c.title || 'New Power Session',
              messages: Array.isArray(c.messages) ? c.messages : [],
              model: c.aiModel || c.model || 'JLR-SUPREME-ULTRA',
              updatedAt: new Date(c.updatedAt || c.updated_at || Date.now()).getTime()
            }));

            // [SOVEREIGN MERGE]: Synchronize Cloud Archive with Local Node
            setChats(prev => {
              const mergedMap = new Map<string, Chat>();
              
              // 1. Add cloud chats (Source of Truth)
              cloud.forEach(c => mergedMap.set(c.id, c));
              
              // 2. Add local-only chats if they have content OR are currently active
              prev.forEach(c => {
                if (!mergedMap.has(c.id)) {
                  // ONLY keep local if it has messages OR is the one in the URL
                  if (c.messages.length > 0 || c.id === currentChatId) {
                    mergedMap.set(c.id, c);
                  }
                } else {
                  // Resolve conflict: Use local if it has more messages (active session)
                  const cloudVer = mergedMap.get(c.id)!;
                  if (c.messages.length > cloudVer.messages.length) {
                    mergedMap.set(c.id, c);
                  }
                }
              });

              const final = Array.from(mergedMap.values())
               .sort((a,b) => b.updatedAt - a.updatedAt);
               
              saveLocalChats(final, initialUser.id);
              return final;
            });
          }
        } catch (e) {
          console.warn("[SUPREMACY SYNC]: Cloud sync deferred.");
        }
      }
      setLoading(false);
    };

    initIdentity();
  }, []);

  // [URL PERSISTENCE]: Update URL when currentChatId changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (currentChatId) {
      if (params.get('c') !== currentChatId) {
        params.set('c', currentChatId);
        window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
      }
    } else {
      if (params.has('c')) {
        params.delete('c');
        window.history.pushState({}, '', `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`);
      }
    }
  }, [currentChatId]);


  // ─── Auth Methods ─────────────────────────────────────────────────────────
  const login = async (username: string, supremacyKey: string) => {
    try {
      const res = await fetch(`/api/auth?action=login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: supremacyKey })
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Handshake Failed' }));
        throw new Error(data.error || 'Identity Access Denied');
      }

      const data = await res.json();
      localStorage.setItem('supremacy_session', JSON.stringify(data.user));
      window.location.reload(); 
    } catch (err: any) {
      console.error("[AUTH ERR]:", err);
      throw new Error(err.message.includes('fetch') ? 'NETWORK TIMEOUT: Check Vercel Storage Keys' : err.message);
    }
  };

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      
      const res = await fetch(`/api/auth?action=google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: firebaseUser.email, 
          username: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
          id: firebaseUser.uid 
        })
      });
      
      if (!res.ok) throw new Error('Cloud Link Failed');

      const data = await res.json();
      localStorage.setItem('supremacy_session', JSON.stringify(data.user));
      window.location.reload();
    } catch (err: any) {
      console.error("[GOOGLE AUTH ERR]:", err);
      setLoading(false);
      throw err;
    }
  };

  const signup = async (username: string, supremacyKey: string) => {
    try {
      const res = await fetch(`/api/auth?action=signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: supremacyKey })
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Link Failed' }));
        throw new Error(data.error || 'Identity Establishment Failed');
      }

      const data = await res.json();
      localStorage.setItem('supremacy_session', JSON.stringify(data.user));
      window.location.reload();
    } catch (err: any) {

      console.error("[AUTH ERR]:", err);
      throw new Error(err.message.includes('fetch') ? 'NETWORK TIMEOUT: DB Link Unstable' : err.message);
    }
  };


  const logout = () => {
    localStorage.removeItem('supremacy_session');
    auth.signOut();
    window.location.reload();
  };


  // ─── Chat Actions ─────────────────────────────────────────────────────────
  const createNewChat = async (): Promise<string> => {
    // [GHOST PREVENTION]: Reuse existing empty session if available
    const existingEmpty = chats.find(c => c.messages.length === 0);
    if (existingEmpty) {
      setCurrentChatId(existingEmpty.id);
      return existingEmpty.id;
    }

    const tempId = `session_${Date.now()}`;
    const chatData: Chat = {
      id: tempId,
      title: 'New Power Session',
      messages: [],
      model: 'JLR-SUPREME-ULTRA',
      updatedAt: Date.now()
    };

    setChats(prev => {
      const updated = [chatData, ...prev];
      saveLocalChats(updated, user?.id);
      return updated;
    });
    
    setCurrentChatId(tempId);
    return tempId;
  };


  const updateChatMessages = async (chatId: string, messages: any[]) => {
    setChats(prev => {
      let chatExists = prev.some(c => c.id === chatId);
      let updated;
      
      if (chatExists) {
        updated = prev.map(c => c.id === chatId ? { ...c, messages, updatedAt: Date.now() } : c);
      } else {
        // [SOVEREIGN UPSERT]: If the chat doesn't exist (created on-the-fly), inject it immediately
        const newChat: Chat = {
          id: chatId,
          title: 'New Power Session',
          messages: messages,
          model: 'JLR-SUPREME-ULTRA',
          updatedAt: Date.now()
        };
        updated = [newChat, ...prev];
      }

      saveLocalChats(updated, user?.id);
      
      if (user && !user.isGuest) {
        const activeChat = updated.find(c => c.id === chatId);
        if (activeChat) {
          fetch('/api/db/chats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              chatId, 
              userId: user.id, 
              title: activeChat?.title || 'New Session', 
              messages,
              model: activeChat?.model || 'JLR-SUPREME-ULTRA'
            })
          }).catch(console.error);
        }
      }
      
      return updated;
    });
  };

  const renameChat = async (chatId: string, title: string) => {
    setChats(prev => {
      const updated = prev.map(c => c.id === chatId ? { ...c, title } : c);
      saveLocalChats(updated, user?.id);

      if (user && !user.isGuest) {
        const activeChat = updated.find(c => c.id === chatId);
        fetch('/api/db/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId, userId: user.id, title, messages: activeChat?.messages || [] })
        }).catch(console.error);
      }
      return updated;
    });
  };

  const deleteChat = async (chatId: string) => {
    if (currentChatId === chatId) {
      setCurrentChatId(null);
    }

    setChats(prev => {
      const updated = prev.filter(c => c.id !== chatId);
      saveLocalChats(updated, user?.id);
      return updated;
    });

    if (user && !user.isGuest) {
      fetch(`/api/db/chats?chatId=${chatId}`, { method: 'DELETE' }).catch(console.error);
    }
  };


  return (
    <AuthContext.Provider value={{
      user, loading, login, loginWithGoogle, signup, logout,
      chats, currentChatId, setCurrentChatId,
      createNewChat, updateChatMessages, renameChat, deleteChat
    }}>
      {children}
    </AuthContext.Provider>

  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
