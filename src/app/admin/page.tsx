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
      router.push('/');
      return;
    }
    fetchUsers();
  }, [user]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`/api/admin/users?commander=raviraj`);
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch (e) {
      console.error(e);
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
        setStatus({ type: 'success', msg: `Node ${userId.slice(0, 5)}... Link Updated.` });
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

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0c] text-white flex items-center justify-center font-sans tracking-tight">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-emerald-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.5)]"></div>
        <p className="text-emerald-500 font-bold uppercase tracking-widest text-sm">Synchronizing Command Center...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-[#f0f0f0] font-sans p-8 selection:bg-emerald-500/30">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-12 border-b border-white/5 pb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-3">
              <span className="w-10 h-10 bg-emerald-500 rounded flex items-center justify-center not-italic shadow-[0_0_15px_rgba(16,185,129,0.3)]">J</span>
              Supreme Command Center
            </h1>
            <p className="text-white/40 mt-1 uppercase tracking-widest text-[10px] font-bold">Neural Node Registry & Link Allocation</p>
          </div>
          <Link href="/" className="px-4 py-2 border border-white/10 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-all">
            Return to Core
          </Link>
        </header>

        {status.msg && (
          <div className={`mb-8 p-4 rounded-lg border text-xs font-bold uppercase tracking-widest ${
            status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {status.msg}
          </div>
        )}

        <div className="grid gap-6">
          {users.map(u => (
            <div key={u.id} className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 hover:border-white/10 transition-all group">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl font-bold tracking-tight text-white/90 lowercase">@{u.username}</span>
                    <span className="px-2 py-0.5 bg-white/5 rounded text-[10px] font-bold text-white/30 uppercase tracking-widest">
                      ID: {u.id.slice(0, 8)}...
                    </span>
                  </div>
                  <p className="text-white/30 text-[10px] uppercase font-bold tracking-widest mb-4">
                    Joined: {new Date(u.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex-[2] w-full">
                  <label className="block text-[10px] uppercase font-black tracking-[0.2em] text-white/20 mb-2">Allocated Neural Links (Comma Separated Keys)</label>
                  <textarea
                    defaultValue={u.custom_api_key || ''}
                    placeholder="gsk_key1, gsk_key2, gsk_key3..."
                    onChange={(e) => u.temp_keys = e.target.value}
                    className="w-full h-24 bg-black/40 border border-white/5 rounded-xl p-4 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500/40 transition-all placeholder:text-white/5"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => handleUpdateKeys(u.id, u.temp_keys || u.custom_api_key || '')}
                    disabled={updatingId === u.id}
                    className="px-6 py-3 bg-white text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50"
                  >
                    {updatingId === u.id ? 'Updating...' : 'Update Node'}
                  </button>
                  <button className="px-6 py-3 border border-white/5 text-white/30 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all">
                    Deactivate
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
