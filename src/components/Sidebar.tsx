"use client";

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  PanelLeft, Plus, MessageSquare, User, Zap, 
  Settings as SettingsIcon, ShieldAlert, LogOut, Trash2, Edit2,
  Sparkles, Globe, Database, Code, Search
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  isMobile: boolean;
  onClose: () => void;
  chats: any[];
  currentChatId: string | null;
  setCurrentChatId: (id: string) => void;
  createNewChat: () => Promise<string>;
  renameChat: (id: string, title: string) => void;
  deleteChat: (id: string) => void;
  user: any;
  logout: () => void;
  setShowAuthModal: (show: boolean) => void;
  onSettingsOpen: () => void;
  onArtifactToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen, isMobile, onClose, chats, currentChatId, 
  setCurrentChatId, createNewChat, renameChat, deleteChat, 
  user, logout, setShowAuthModal, onSettingsOpen, onArtifactToggle
}) => {
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState('');

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

  const featuredModules = [
    { id: 'canvas', name: 'Neural Canvas', icon: <Sparkles size={16} />, active: true, onClick: () => {} },
    { id: 'search', name: 'Global Search', icon: <Globe size={16} />, active: false, onClick: () => {} },
    { id: 'artifacts', name: 'Artifact Workspace', icon: <Code size={16} />, active: true, onClick: onArtifactToggle },
    { id: 'memory', name: 'Memory Vault', icon: <Database size={16} />, active: false, onClick: () => {} },
  ];

  return (
    <motion.aside 
      initial={isMobile ? { x: '-100%' } : { width: '280px' }}
      animate={isMobile ? (isOpen ? { x: 0 } : { x: '-100%' }) : (isOpen ? { width: '280px' } : { width: '0px' })}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      style={{ 
        background: 'rgba(5,5,5,0.95)', 
        backdropFilter: 'blur(40px)',
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
        boxShadow: isMobile && isOpen ? '20px 0 50px rgba(0,0,0,0.5)' : 'none',
        padding: '1.25rem'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{ width: '36px', height: '36px', background: 'var(--beast-gradient)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(0, 255, 157, 0.3)' }}>
            <Zap size={20} fill="black" />
          </div>
          <h2 className="text-beast" style={{ fontSize: '1.1rem', letterSpacing: '1px', fontWeight: 900 }}>JLR SUPREMACY</h2>
        </div>
        <button onClick={onClose} className="btn-ghost" style={{ padding: '6px' }}><PanelLeft size={18} /></button>
      </div>
      
      <button 
        onClick={() => { createNewChat(); if(isMobile) onClose(); }} 
        className="btn-beast" 
        style={{ width: '100%', marginBottom: '1.5rem', justifyContent: 'center', borderRadius: '14px', padding: '12px', fontSize: '0.75rem', fontWeight: 900, letterSpacing: '1px' }}
      >
        <Plus size={18} /><span>NEW SESSION</span>
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
        <Search size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />
        <input 
          placeholder="Search history..." 
          style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.8rem', outline: 'none', width: '100%' }}
        />
      </div>

      {/* Featured Section */}
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: '1rem', fontWeight: 900, letterSpacing: '2px' }}>Supreme Modules</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {featuredModules.map(mod => (
             <div 
               key={mod.id}
               onClick={mod.onClick}
               style={{ 
                 display: 'flex', 
                 alignItems: 'center', 
                 gap: '0.75rem', 
                 padding: '0.65rem 0.85rem', 
                 borderRadius: '10px',
                 cursor: mod.active ? 'pointer' : 'default',
                 transition: 'all 0.2s',
                 background: mod.active && mod.id !== 'search' && mod.id !== 'memory' ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                 border: mod.active && mod.id !== 'search' && mod.id !== 'memory' ? '1px solid rgba(16, 185, 129, 0.1)' : '1px solid transparent'
               }}
               className="sidebar-featured-item"
             >
                <div style={{ color: mod.active && mod.id !== 'search' && mod.id !== 'memory' ? '#10b981' : 'rgba(255,255,255,0.4)' }}>{mod.icon}</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: mod.active && mod.id !== 'search' && mod.id !== 'memory' ? '#fff' : 'rgba(255,255,255,0.5)' }}>{mod.name}</div>
                {!mod.active && <div style={{ marginLeft: 'auto', fontSize: '0.5rem', padding: '2px 6px', background: 'rgba(255,165,0,0.1)', color: '#ffa500', borderRadius: '4px', fontWeight: 900 }}>SOON</div>}
             </div>
          ))}
        </div>
      </div>
      
      {/* History Section */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
        <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: '1rem', fontWeight: 900, letterSpacing: '2px' }}>Neural Archive</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {chats.filter(c => c.messages.length > 0 || c.id === currentChatId).map(chat => (
            <div 
              key={chat.id} 
              className={`sidebar-item ${currentChatId === chat.id ? 'active' : ''}`}
              style={{ 
                position: 'relative', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem', 
                padding: '0.7rem 0.8rem', 
                borderRadius: '12px', 
                transition: 'all 0.2s', 
                border: currentChatId === chat.id ? '1px solid var(--glass-border)' : '1px solid transparent', 
                background: currentChatId === chat.id ? 'rgba(255,255,255,0.03)' : 'transparent' 
              }}
            >
              <MessageSquare size={14} style={{ opacity: 0.4, flexShrink: 0 }} />
              {renamingId === chat.id ? (
                <input 
                  autoFocus 
                  value={renameValue} 
                  onChange={(e) => setRenameValue(e.target.value)} 
                  onBlur={submitRename}
                  onKeyDown={(e) => e.key === 'Enter' && submitRename()}
                  style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.8rem', width: '100%', outline: 'none' }}
                />
              ) : (
                <div 
                  onClick={() => { setCurrentChatId(chat.id); if(isMobile) onClose(); }} 
                  style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem', fontWeight: 500, color: currentChatId === chat.id ? '#fff' : 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                >
                  {chat.title}
                </div>
              )}
              <div className="item-actions" style={{ display: 'flex', gap: '0.4rem' }}>
                {!renamingId && (
                  <button onClick={(e) => { e.stopPropagation(); startRename(chat.id, chat.title); }} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer' }} title="Rename Session">
                    <Edit2 size={12} />
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer' }} title="Purge Session">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
        <div className="hologram-card" style={{ padding: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.8rem', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(45deg, #050505, #222)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', color: '#fff' }}>{user ? user.username : 'GUEST NODE'}</div>
            <div style={{ fontSize: '0.6rem', color: user?.id !== 'guest' ? 'var(--accent-beast)' : 'rgba(255,255,255,0.3)', fontWeight: 800, letterSpacing: '0.5px' }}>{user?.id !== 'guest' ? 'SUPREME ACCESS' : 'RESTRICTED LINK'}</div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(user?.username === 'ravirajjavvadi' || user?.email === 'ravirajjavvadi@gmail.com') && (
              <Link href="/admin" style={{ color: 'rgba(255,255,255,0.3)' }} title="Command Center">
                <ShieldAlert size={16} />
              </Link>
            )}
            {user?.id !== 'guest' ? (
              <button onClick={logout} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }} title="Log Out"><LogOut size={16} /></button>
            ) : (
              <button onClick={() => setShowAuthModal(true)} style={{ background: 'var(--accent-beast)', border: 'none', color: '#000', padding: '4px 8px', borderRadius: '6px', fontSize: '0.6rem', fontWeight: 900, cursor: 'pointer' }}>IDENTIFY</button>
            )}
          </div>
        </div>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
