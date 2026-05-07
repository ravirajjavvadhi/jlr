"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/services/authContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [status, setStatus] = useState({ type: '', msg: '' });

  // [SECURITY BLOCK]: Absolute Authority Check
  useEffect(() => {
    if (!user || user.username !== 'raviraj') {
      // Small delay to allow auth state to resolve
      const timer = setTimeout(() => {
        if (!user || user.username !== 'raviraj') router.push('/');
      }, 1000);
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

  const handleUpdateKeys = async (userId: string, keys: string) => {
    setUpdatingId(userId);
    setStatus({ type: '', msg: '' });
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commander: 'raviraj',
          targetUserId: userId,
          keys: keys
        })
      });
      const data = await res.json();
      if (data.success) {
        setStatus({ type: 'success', msg: `Neural Link for Node ${userId.slice(0, 5)}... Activated.` });
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

  // --- STYLES (Sovereign Inline System) ---
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#0a0a0c',
      color: '#f0f0f0',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '40px 20px',
    },
    wrapper: {
      maxWidth: '1000px',
      margin: '0 auto',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '60px',
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
      transition: 'all 0.2s',
      backgroundColor: 'rgba(255,255,255,0.03)',
    },
    status: (type: string) => ({
      padding: '15px 20px',
      borderRadius: '12px',
      marginBottom: '30px',
      fontSize: '11px',
      fontWeight: 800,
      textTransform: 'uppercase' as const,
      letterSpacing: '1px',
      backgroundColor: type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
      border: `1px solid ${type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
      color: type === 'success' ? '#34d399' : '#f87171',
    }),
    card: {
      backgroundColor: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '20px',
      padding: '30px',
      marginBottom: '20px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '20px',
      transition: 'border-color 0.2s',
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    username: {
      fontSize: '18px',
      fontWeight: 800,
      color: '#fff',
    },
    nodeId: {
      fontSize: '10px',
      color: 'rgba(255,255,255,0.2)',
      textTransform: 'uppercase' as const,
      fontWeight: 800,
      letterSpacing: '1px',
    },
    meta: {
      fontSize: '10px',
      color: 'rgba(255,255,255,0.3)',
      textTransform: 'uppercase' as const,
      fontWeight: 800,
      letterSpacing: '1.5px',
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '8px',
    },
    label: {
      fontSize: '9px',
      fontWeight: 900,
      textTransform: 'uppercase' as const,
      letterSpacing: '2px',
      color: 'rgba(255,255,255,0.4)',
    },
    textarea: {
      backgroundColor: '#000',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      padding: '15px',
      color: '#10b981',
      fontSize: '12px',
      fontFamily: 'monospace',
      minHeight: '100px',
      outline: 'none',
    },
    actions: {
      display: 'flex',
      gap: '12px',
    },
    btnUpdate: {
      backgroundColor: '#fff',
      color: '#000',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 900,
      textTransform: 'uppercase' as const,
      letterSpacing: '1.5px',
      cursor: 'pointer',
      flex: 1,
    },
    btnDanger: {
      backgroundColor: 'transparent',
      color: 'rgba(239,68,68,0.6)',
      border: '1px solid rgba(239,68,68,0.1)',
      padding: '12px 24px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 900,
      textTransform: 'uppercase' as const,
      letterSpacing: '1.5px',
      cursor: 'pointer',
    },
    empty: {
      border: '1px dashed rgba(255,255,255,0.1)',
      borderRadius: '20px',
      padding: '60px',
      textAlign: 'center' as const,
    }
  };

  if (loading) return (
    <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ ...styles.subtitle, color: '#10b981' }}>INITIALIZING COMMAND CENTER...</p>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        <header style={styles.header}>
          <div style={styles.titleGroup}>
            <h1 style={styles.title}>
              <span style={styles.logoBox}>J</span>
              Supreme Command Center
            </h1>
            <p style={styles.subtitle}>Neural Node Registry & Link Allocation</p>
          </div>
          <Link href="/" style={styles.backButton}>Return to Core</Link>
        </header>

        {status.msg && (
          <div style={styles.status(status.type)}>
            {status.msg}
          </div>
        )}

        <div style={{ display: 'grid', gap: '24px' }}>
          {users.length === 0 ? (
            <div style={styles.empty}>
              <p style={{ ...styles.label, fontSize: '14px', color: 'rgba(255,255,255,0.2)' }}>No Neural Nodes Detected</p>
              <p style={styles.meta}>Users must establish their identity on the platform to be visible here.</p>
            </div>
          ) : users.map(u => (
            <div key={u.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <div style={styles.username}>@{u.username}</div>
                  <div style={styles.nodeId}>Sequence ID: {u.id.slice(0, 12)}...</div>
                </div>
                <div style={styles.meta}>
                  Activated: {new Date(u.created_at).toLocaleDateString()}
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Dedicated Neural Keys (Comma Separated)</label>
                <textarea
                  style={styles.textarea}
                  defaultValue={u.custom_api_key || ''}
                  placeholder="Insert Link Keys (e.g., gsk_l9..., gsk_x2...)"
                  onChange={(e) => u.temp_keys = e.target.value}
                />
              </div>

              <div style={styles.actions}>
                <button 
                  style={{ ...styles.btnUpdate, opacity: updatingId === u.id ? 0.5 : 1 }}
                  onClick={() => handleUpdateKeys(u.id, u.temp_keys || u.custom_api_key || '')}
                  disabled={updatingId === u.id}
                >
                  {updatingId === u.id ? 'SYNCHRONIZING...' : 'Establish Neural Link'}
                </button>
                <button style={styles.btnDanger}>Suspend Node</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
