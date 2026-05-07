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


// ─── Guest Local Storage helpers ────────────────────────────────────────────
function loadGuestChats(): Chat[] {
  try { return JSON.parse(localStorage.getItem('guest_chats') || '[]'); } catch { return []; }
}
function saveGuestChats(chats: Chat[]) {
  localStorage.setItem('guest_chats', JSON.stringify(chats));
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<Chat[]>(() => {
    if (typeof window !== 'undefined') return loadGuestChats();
    return [];
  });

  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const loadingRef = useRef(true);
  const firestoreUnsubRef = useRef<(() => void) | null>(null);

  // ─── Identity Synchronization ──────────────────────────────────────────
  useEffect(() => {
    const initIdentity = async () => {
      setLoading(true);
      const savedUser = localStorage.getItem('supremacy_session');
      
      if (savedUser) {
        const u = JSON.parse(savedUser);
        setUser(u);
        // Load cloud chats
        try {
          const res = await fetch(`/api/db/chats?userId=${u.id}`);
          if (res.ok) {
            const data = await res.json();
            const formatted = data.chats.map((c: any) => ({
              id: c.id,
              title: c.title,
              messages: c.messages,
              updatedAt: new Date(c.updated_at).getTime()
            }));
            setChats(formatted.length > 0 ? formatted : loadGuestChats());
          }
        } catch (e) {
          console.warn("Cloud sync deferred. Running local.");
          setChats(loadGuestChats());
        }
      } else {
        setUser({ id: 'guest', username: 'Guest', isGuest: true });
        setChats(loadGuestChats());
      }
      setLoading(false);
    };

    initIdentity();
  }, []);


  // ─── Auth Methods ─────────────────────────────────────────────────────────
  const login = async (username: string, supremacyKey: string) => {
    const res = await fetch(`/api/auth?action=login`, {
      method: 'POST',
      body: JSON.stringify({ username, password: supremacyKey })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    localStorage.setItem('supremacy_session', JSON.stringify(data.user));
    window.location.reload(); // Refresh to trigger sync
  };

  const signup = async (username: string, supremacyKey: string) => {
    const res = await fetch(`/api/auth?action=signup`, {
      method: 'POST',
      body: JSON.stringify({ username, password: supremacyKey })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    localStorage.setItem('supremacy_session', JSON.stringify(data.user));
    window.location.reload();
  };

  const logout = () => {
    localStorage.removeItem('supremacy_session');
    window.location.reload();
  };


  // ─── Chat Actions ─────────────────────────────────────────────────────────
  const createNewChat = async (): Promise<string> => {
    const chatData: Omit<Chat, 'id'> = {
      title: 'New Power Session',
      messages: [],
      model: 'llama-3.3-70b-versatile',
      updatedAt: Date.now()
    };

    // [SUPREMACY SHIFT] - Always create locally first for instant response
    const tempId = `session_${Date.now()}`;
    const newChat = { id: tempId, ...chatData };
    const updated = [newChat, ...chats];
    setChats(updated);
    saveGuestChats(updated);
    setCurrentChatId(tempId);

    if (user && !user.isGuest) {
      fetch('/api/db/chats', {
        method: 'POST',
        body: JSON.stringify({ chatId: tempId, userId: user.id, title: chatData.title, messages: [] })
      }).catch(console.error);
    }
    return tempId;
  };


  const updateChatMessages = async (chatId: string, messages: any[]) => {
    const updated = chats.map(c => c.id === chatId ? { ...c, messages, updatedAt: Date.now() } : c);
    setChats(updated);
    saveGuestChats(updated);

    if (user && !user.isGuest) {
      const activeChat = updated.find(c => c.id === chatId);
      fetch('/api/db/chats', {
        method: 'POST',
        body: JSON.stringify({ chatId, userId: user.id, title: activeChat?.title || 'New Session', messages })
      }).catch(console.error);
    }
  };

  const renameChat = async (chatId: string, title: string) => {
    const updated = chats.map(c => c.id === chatId ? { ...c, title } : c);
    setChats(updated);
    saveGuestChats(updated);

    if (user && !user.isGuest) {
      const activeChat = updated.find(c => c.id === chatId);
      fetch('/api/db/chats', {
        method: 'POST',
        body: JSON.stringify({ chatId, userId: user.id, title, messages: activeChat?.messages || [] })
      }).catch(console.error);
    }
  };

  const deleteChat = async (chatId: string) => {
    const updated = chats.filter(c => c.id !== chatId);
    setChats(updated);
    saveGuestChats(updated);
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
