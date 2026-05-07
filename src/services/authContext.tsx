"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { 
  doc, setDoc, getDoc, collection, 
  onSnapshot, addDoc, updateDoc, deleteDoc,
  serverTimestamp, orderBy, query
} from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';

export type Chat = {
  id: string;
  title: string;
  messages: any[];
  model: string;
  updatedAt: any;
};

type User = {
  id: string;
  name: string;
  email: string;
  isPro: boolean;
  isGuest?: boolean;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
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

  // ─── Auth State Observer ─────────────────────────────────────────────────
  useEffect(() => {
    const failsafe = setTimeout(() => {
      if (loadingRef.current) {
        console.warn("⚠️ AUTH FAILSAFE: Initialization timed out. Falling back to Guest Mode.");
        setUser({ id: 'guest', name: 'Guest', email: '', isPro: false, isGuest: true });
        setChats(loadGuestChats());
        loadingRef.current = false;
        setLoading(false);
      }
    }, 3000);


    if (!auth || !db) {
      clearTimeout(failsafe);
      console.warn("⚠️ AUTH SHIELD: Firebase services not initialized. Running in Offline/Guest mode.");
      setUser({ id: 'guest', name: 'Guest', email: '', isPro: false, isGuest: true });
      setChats(loadGuestChats());
      setLoading(false);
      return;
    }

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(failsafe);
      setLoading(true);



      // Clean up old Firestore listener
      if (firestoreUnsubRef.current) { firestoreUnsubRef.current(); firestoreUnsubRef.current = null; }

      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.data();

        setUser({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || userData?.name || 'Commander',
          email: firebaseUser.email || '',
          isPro: userData?.isPro ?? true,
          isGuest: false,
        });

        // Attach real-time Firestore listener for this user
        const q = query(collection(db, `users/${firebaseUser.uid}/chats`), orderBy('updatedAt', 'desc'));
        const unsub = onSnapshot(q, (snap: any) => {
          const freshChats = snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Chat));
          setChats(freshChats);
          saveGuestChats(freshChats); 
        }, (err: any) => {
          console.error("Firestore snapshot error:", err);
        });
        firestoreUnsubRef.current = unsub;



      } else {
        // No Firebase user — run as Guest with local storage
        setUser({ id: 'guest', name: 'Guest', email: '', isPro: false, isGuest: true });
        setChats(loadGuestChats());
      }

      loadingRef.current = false;
      setLoading(false);
    });


    return () => { 
      clearTimeout(failsafe);
      unsubAuth(); 
      if (firestoreUnsubRef.current) firestoreUnsubRef.current(); 
    };

  }, []);

  // ─── Auth Methods ─────────────────────────────────────────────────────────
  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (name: string, email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, 'users', cred.user.uid), {
      name, email, isPro: true, createdAt: serverTimestamp()
    });
  };

  const loginWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    const userRef = doc(db, 'users', cred.user.uid);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      await setDoc(userRef, {
        name: cred.user.displayName,
        email: cred.user.email,
        isPro: true,
        createdAt: serverTimestamp()
      });
    }
  };

  const logout = () => signOut(auth);

  // ─── Chat Actions ─────────────────────────────────────────────────────────
  const createNewChat = async (): Promise<string> => {
    const chatData: Omit<Chat, 'id'> = {
      title: 'New Power Session',
      messages: [],
      model: 'llama-3.3-70b-versatile',
      updatedAt: Date.now()
    };

    // [SUPREMACY SHIFT] - Always create locally first for instant response
    const tempId = (!user || user.isGuest || !db) ? `guest_${Date.now()}` : `sync_${Date.now()}`;
    const newChat = { id: tempId, ...chatData };
    const updated = [newChat, ...chats];
    setChats(updated);
    saveGuestChats(updated);
    setCurrentChatId(tempId);

    if (!user || user.isGuest || !db) return tempId;


    try {
      const ref = await addDoc(collection(db, `users/${user.id}/chats`), {
        ...chatData, updatedAt: serverTimestamp()
      });
      // Replace temp ID with real ID in background if needed
      return ref.id;
    } catch (e) {
      console.warn("Firebase sync failed, session remains local.");
      return tempId;
    }
  };


  const updateChatMessages = async (chatId: string, messages: any[]) => {
    if (user?.isGuest || !db) {
      const updated = chats.map(c => c.id === chatId ? { ...c, messages, updatedAt: Date.now() } : c);

      setChats(updated);
      saveGuestChats(updated);
      return;
    }
    if (!user) return;
    await updateDoc(doc(db, `users/${user.id}/chats`, chatId), { messages, updatedAt: serverTimestamp() });
  };

  const renameChat = async (chatId: string, title: string) => {
    if (user?.isGuest || !db) {
      const updated = chats.map(c => c.id === chatId ? { ...c, title } : c);

      setChats(updated);
      saveGuestChats(updated);
      return;
    }
    if (!user) return;
    await updateDoc(doc(db, `users/${user.id}/chats`, chatId), { title, updatedAt: serverTimestamp() });
  };

  const deleteChat = async (chatId: string) => {
    if (user?.isGuest || !db) {
      const updated = chats.filter(c => c.id !== chatId);

      setChats(updated);
      saveGuestChats(updated);
      if (currentChatId === chatId) setCurrentChatId(null);
      return;
    }
    if (!user) return;
    await deleteDoc(doc(db, `users/${user.id}/chats`, chatId));
    if (currentChatId === chatId) setCurrentChatId(null);
  };

  return (
    <AuthContext.Provider value={{
      user, loading, login, signup, loginWithGoogle, logout,
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
