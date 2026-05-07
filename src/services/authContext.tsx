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
  isGuest?: boolean;
};


type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (username: string, supremacyKey: string) => Promise<void>;
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);


// ─── Namespaced Local Storage helpers ─────────────────────────────────────────
function getStorageKey(userId?: string) {
  return userId ? `supremacy_chats_${userId}` : 'supremacy_chats_guest';
}

function loadLocalChats(userId?: string): Chat[] {
  if (typeof window === 'undefined') return [];
  try { 
    return JSON.parse(localStorage.getItem(getStorageKey(userId)) || '[]'); 
  } catch { return []; }
}

function saveLocalChats(chats: Chat[], userId?: string) {
  localStorage.setItem(getStorageKey(userId), JSON.stringify(chats));
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  // ─── Identity Synchronization ──────────────────────────────────────────
  useEffect(() => {
    const initIdentity = async () => {
      setLoading(true);
      const sessionData = localStorage.getItem('supremacy_session');
      
      let initialUser: User = { id: 'guest', username: 'Guest', isGuest: true };
      if (sessionData) {
        try { initialUser = JSON.parse(sessionData); } catch {}
      }
      
      setUser(initialUser);
      // Immediately load local namespaced cache to prevent 1-2s disappearing act
      const locals = loadLocalChats(initialUser.id);
      setChats(locals);

      if (!initialUser.isGuest) {
        try {
          const res = await fetch(`/api/db/chats?userId=${initialUser.id}`);
          if (res.ok) {
            const data = await res.json();
            const cloud: Chat[] = data.chats.map((c: any) => ({
              id: c.id,
              title: c.title,
              messages: c.messages,
              model: c.model || 'llama-3.3-70b-versatile',
              updatedAt: new Date(c.updated_at).getTime()
            }));

            // Smart Merge: Use cloud as source of truth, but keep local-only new chats
            setChats(prev => {
              const cloudIds = new Set(cloud.map(c => c.id));
              const localOnly = prev.filter(c => !cloudIds.has(c.id));
              const merged = [...localOnly, ...cloud].sort((a,b) => b.updatedAt - a.updatedAt);
              saveLocalChats(merged, initialUser.id);
              return merged;
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
    // We don't remove namespaced chat storage so the user's data remains on device
    window.location.reload();
  };


  // ─── Chat Actions ─────────────────────────────────────────────────────────
  const createNewChat = async (): Promise<string> => {
    const tempId = `session_${Date.now()}`;
    const chatData: Chat = {
      id: tempId,
      title: 'New Power Session',
      messages: [],
      model: 'llama-3.3-70b-versatile',
      updatedAt: Date.now()
    };

    setChats(prev => {
      // Prevent duplicate creation of the same temp ID in rapid state updates
      if (prev.some(c => c.id === tempId)) return prev;
      const updated = [chatData, ...prev];
      saveLocalChats(updated, user?.id);
      return updated;
    });
    
    setCurrentChatId(tempId);

    if (user && !user.isGuest) {
      fetch('/api/db/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chatId: tempId, 
          userId: user.id, 
          title: chatData.title, 
          messages: [],
          model: chatData.model 
        })
      }).catch(console.error);
    }
    return tempId;
  };


  const updateChatMessages = async (chatId: string, messages: any[]) => {
    setChats(prev => {
      const updated = prev.map(c => c.id === chatId ? { ...c, messages, updatedAt: Date.now() } : c);
      saveLocalChats(updated, user?.id);
      
      if (user && !user.isGuest) {
        const activeChat = updated.find(c => c.id === chatId);
        fetch('/api/db/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            chatId, 
            userId: user.id, 
            title: activeChat?.title || 'New Session', 
            messages,
            model: activeChat?.model || 'llama-3.3-70b-versatile'
          })
        }).catch(console.error);
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
    setChats(prev => {
      const updated = prev.filter(c => c.id !== chatId);
      saveLocalChats(updated, user?.id);
      return updated;
    });

    if (user && !user.isGuest) {
      fetch(`/api/db/chats?chatId=${chatId}`, { method: 'DELETE' }).catch(console.error);
    }
    if (currentChatId === chatId) setCurrentChatId(null);
  };


  return (
    <AuthContext.Provider value={{
      user, loading, login, signup, logout,
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
