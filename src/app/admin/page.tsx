"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/services/authContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'with-key' | 'no-key'>('all');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [status, setStatus] = useState({ type: '', msg: '' });

  // [SECURITY BLOCK]: Absolute Authority Check
  useEffect(() => {
    if (!user || user.username !== 'raviraj') {
      const timer = setTimeout(() => {
        if (!user || user.username !== 'raviraj') router.push('/');
      }, 1500);
      return () => clearTimeout(timer);
    }
    fetchUsers();
  }, [user]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`/api/admin/users?commander=raviraj`);
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      } else if (data.error) {
        setStatus({ type: 'error', msg: `Diagnostic: ${data.error}` });
      }
    } catch (e: any) {
      setStatus({ type: 'error', msg: `Link Failure: ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateKeys = async (userId: string, keys: string, geminiKeys: string) => {
    setUpdatingId(userId);
    setStatus({ type: '', msg: '' });
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commander: 'raviraj',
          targetUserId: userId,
          keys: keys || null,
          geminiKeys: geminiKeys || null
        })
      });
      const data = await res.json();
      if (data.success) {
        setStatus({ type: 'success', msg: `Neural Link for Node ${userId.slice(0, 5)}... Activated.` });
        fetchUsers();
        setTimeout(() => setStatus({ type: '', msg: '' }), 3000);
      } else {
        setStatus({ type: 'error', msg: data.error });
      }
    } catch (e) {
      setStatus({ type: 'error', msg: 'Neural Uplink Failed.' });
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase());
    const hasKey = !!u.custom_api_key;
    if (filter === 'with-key') return matchesSearch && hasKey;
    if (filter === 'no-key') return matchesSearch && !hasKey;
    return matchesSearch;
  });

  // --- STYLES (Sovereign Inline System) ---
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#0a0a0c',
      color: '#f0f0f0',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '40px 20px',
      overflowY: 'auto' as const,
    },
    wrapper: {
      maxWidth: '1000px',
      margin: '0 auto',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '40px',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      paddingBottom: '30px',
    },
    titleGroup: {
      display: 'flex',
      flexDirection: 'column' as const,
    },
    title: {
      fontSize: '28px',
      fontWeight: 900,
      letterSpacing: '-1px',
      textTransform: 'uppercase' as const,
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontStyle: 'italic',
    },
    logoBox: {
      width: '38px',
      height: '38px',
      backgroundColor: '#10b981',
      color: '#000',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontStyle: 'normal',
      fontWeight: 900,
      fontSize: '20px',
      boxShadow: '0 0 20px rgba(16,185,129,0.3)',
    },
    subtitle: {
      fontSize: '10px',
      color: 'rgba(255,255,255,0.4)',
      textTransform: 'uppercase' as const,
      letterSpacing: '2px',
      fontWeight: 800,
      marginTop: '4px',
    },
    controls: {
      display: 'flex',
      gap: '15px',
      marginBottom: '40px',
      flexWrap: 'wrap' as const,
    },
    search: {
      flex: 2,
      backgroundColor: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '12px',
      padding: '12px 20px',
      color: '#fff',
      fontSize: '13px',
      outline: 'none',
      minWidth: '250px',
    },
    filterSelect: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '12px',
      padding: '12px',
      color: '#fff',
      fontSize: '12px',
      fontWeight: 700,
      outline: 'none',
    },
    card: {
      backgroundColor: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '20px',
      padding: '24px',
      marginBottom: '16px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '20px',
    },
    nodeHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    badge: (active: boolean) => ({
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '9px',
      fontWeight: 900,
      textTransform: 'uppercase' as const,
      letterSpacing: '1px',
      backgroundColor: active ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
      color: active ? '#10b981' : '#f59e0b',
      border: `1px solid ${active ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
    }),
    textarea: {
      backgroundColor: '#000',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      padding: '15px',
      color: '#10b981',
      fontSize: '12px',
      fontFamily: 'monospace',
      minHeight: '80px',
      outline: 'none',
      width: '100%',
      boxSizing: 'border-box' as const,
    },
    backButton: {
      padding: '10px 20px',
      borderRadius: '50px',
      border: '1px solid rgba(255,255,255,0.1)',
      color: '#fff',
      textDecoration: 'none',
      fontSize: '11px',
      fontWeight: 800,
      textTransform: 'uppercase' as const,
      letterSpacing: '1px',
      backgroundColor: 'rgba(255,255,255,0.03)',
    }
  };

  if (loading) return (
    <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ ...styles.subtitle, color: '#10b981' }}>Synchronizing Command Center...</p>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        <header style={styles.header}>
          <div style={styles.titleGroup}>
            <h1 style={styles.title}><span style={styles.logoBox}>J</span>Supreme Command Center</h1>
            <p style={styles.subtitle}>Neural Node Registry & Link Allocation</p>
          </div>
          <Link href="/" style={styles.backButton}>Return to Core</Link>
        </header>

        <div style={styles.controls}>
          <input 
            style={styles.search}
            placeholder="Search Intelligence Nodes (Username)..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select 
            style={styles.filterSelect}
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="all">ALL NODES</option>
            <option value="with-key">LINKED NODES</option>
            <option value="no-key">RESTRICTED NODES</option>
          </select>
        </div>

        {status.msg && (
          <div style={{ padding: '15px', borderRadius: '12px', marginBottom: '30px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', backgroundColor: status.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${status.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, color: status.type === 'success' ? '#34d399' : '#f87171' }}>
            {status.msg}
          </div>
        )}

        <div style={{ display: 'grid', gap: '16px' }}>
          {filteredUsers.length === 0 ? (
            <div style={{ border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '20px', padding: '60px', textAlign: 'center' }}>
              <p style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', color: 'rgba(255,255,255,0.2)' }}>No Nodes Match Your Search</p>
            </div>
          ) : filteredUsers.map(u => (
            <div key={u.id} style={styles.card}>
              <div style={styles.nodeHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 800 }}>@{u.username}</span>
                  <span style={styles.badge(!!u.custom_api_key)}>{u.custom_api_key ? 'NODE LINKED' : 'LIMITED ACCESS'}</span>
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: 800 }}>
                  ESTABLISHED: {new Date(u.created_at).toLocaleDateString()}
                </div>
              </div>

            <div>
                <label style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '8px' }}>⚡ Groq Neural Keys (comma separated, up to 20)</label>
                <textarea
                  style={styles.textarea}
                  defaultValue={u.custom_api_key || ''}
                  placeholder="gsk_link1, gsk_link2, gsk_link3..."
                  onChange={(e) => u.temp_keys = e.target.value}
                />
              </div>

              <div>
                <label style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', color: 'rgba(16,185,129,0.6)', display: 'block', marginBottom: '8px' }}>🌌 Gemini Vision Keys (comma separated, up to 20)</label>
                <textarea
                  style={{ ...styles.textarea, color: '#4ade80', borderColor: 'rgba(16,185,129,0.15)' }}
                  defaultValue={u.gemini_api_keys || ''}
                  placeholder="AIzaSy...key1, AIzaSy...key2..."
                  onChange={(e) => u.temp_gemini_keys = e.target.value}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  style={{ flex: 1, backgroundColor: '#fff', color: '#000', border: 'none', padding: '12px', borderRadius: '10px', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer', opacity: updatingId === u.id ? 0.5 : 1 }}
                  onClick={() => handleUpdateKeys(u.id, u.temp_keys ?? u.custom_api_key ?? '', u.temp_gemini_keys ?? u.gemini_api_keys ?? '')}
                  disabled={updatingId === u.id}
                >
                  {updatingId === u.id ? 'SYNCHRONIZING...' : 'Establish Neural Link'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
