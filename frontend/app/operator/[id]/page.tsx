'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Queue } from '@/types/queue';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';

export default function OperatorDashboard() {
  const params = useParams();
  const queueId = params.id as string;
  const router = useRouter();
  const { user } = useAuthStore();

  const [queue, setQueue] = useState<Queue | null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // 1. Fetch the Queue Details
  useEffect(() => {
    async function loadData() {
      try {
        const [queueRes, entriesRes] = await Promise.all([
          apiFetch(`/queues/${queueId}`),
          apiFetch(`/queues/${queueId}/entries`)
        ]);

        if (queueRes.ok && entriesRes.ok) {
          const queueData = await queueRes.json();
          const entriesData = await entriesRes.json();
          setQueue(queueData);
          setEntries(entriesData);
        } else {
          setError('Failed to load queue data.');
        }
      } catch (err) {
        setError('Server error.');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [queueId]);

  // 2. Connect to WebSocket
  useEffect(() => {
    if (!queueId) return;

    const wsUrl = process.env.NEXT_PUBLIC_API_URL?.replace('http', 'ws') || 'ws://localhost:8000';
    const ws = new WebSocket(`${wsUrl}/queues/${queueId}/ws`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'QUEUE_UPDATE') {
        // Refresh everything to get the latest status
        apiFetch(`/queues/${queueId}`).then(res => res.ok && res.json().then(setQueue));
        apiFetch(`/queues/${queueId}/entries`).then(res => res.ok && res.json().then(setEntries));
      }
    };

    return () => ws.close();
  }, [queueId]);

  const handleCallNext = async () => {
    try {
      const res = await apiFetch(`/queues/${queueId}/advance`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Failed to call next patient');
      }
    } catch {
      alert('Connection failed');
    }
  };

  const handleUpdateStatus = async (entryId: string, status: string) => {
    try {
      const res = await apiFetch(`/queues/${queueId}/entries/${entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        // The websocket will automatically trigger a refresh!
      } else {
        alert('Failed to update status');
      }
    } catch {
      alert('Connection failed');
    }
  };

  if (isLoading) return <div className="text-center pt-20 animate-pulse text-gray-500">Loading Operator Terminal...</div>;
  if (error || !queue) return <div className="text-center pt-20 text-red-500 font-medium">{error}</div>;

  // Security Check: Only Admins and Operators should see this page
  if (!user || (user.role !== 'admin' && user.role !== 'operator')) {
    return (
      <div className="text-center pt-20">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p className="text-gray-500 mt-2">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pt-10 px-4">
      <div className="flex justify-between items-center mb-6">
        <Link href="/" className="text-gray-500 hover:underline font-medium inline-block">
          &larr; Back to Queues
        </Link>
        {user?.role === 'admin' && (
          <Link href={`/admin/queues/${queueId}/edit`} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
            Edit Settings
          </Link>
        )}
      </div>

      <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-2xl">
        <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold">{queue.name}</h1>
            <p className="text-gray-400 text-sm">Operator Terminal</p>
          </div>
          <div className="bg-green-500/10 text-green-400 px-4 py-1.5 rounded-full text-sm font-bold border border-green-500/20">
            Live Connection
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-8 text-center mb-6 border border-gray-700 shadow-inner">
          <p className="text-gray-400 font-bold uppercase tracking-widest mb-2 text-sm">Currently Serving</p>
          <div className="text-6xl font-black text-blue-400 font-mono tracking-tighter drop-shadow-md">
            {queue.current_token || '--'}
          </div>
        </div>

        <button
          onClick={handleCallNext}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xl py-4 rounded-xl shadow-[0_0_40px_rgba(37,99,235,0.3)] hover:shadow-[0_0_60px_rgba(37,99,235,0.5)] transition-all hover:-translate-y-1 active:translate-y-0 mb-8"
        >
          Call Next Patient
        </button>

        <div>
          <h3 className="text-lg font-bold mb-3 border-b border-gray-800 pb-2">Live Patient List</h3>
          {entries.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No patients are currently waiting.</p>
          ) : (
            <div className="space-y-3">
              {entries.map(entry => (
                <div key={entry.id} className="bg-gray-800 rounded-lg p-3 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-900 text-blue-400 font-black text-lg h-10 w-10 rounded-full flex items-center justify-center">
                      {entry.token_number}
                    </div>
                    <div>
                      <p className="font-bold text-md">{entry.user.full_name}</p>
                      <p className="text-xs text-gray-400 capitalize">{entry.status}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleUpdateStatus(entry.id, 'skipped')}
                      className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 px-3 py-1 rounded text-xs font-semibold transition-colors"
                    >
                      Skip
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus(entry.id, 'completed')}
                      className="bg-green-500/20 text-green-500 hover:bg-green-500/30 px-3 py-1 rounded text-xs font-semibold transition-colors"
                    >
                      Complete
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus(entry.id, 'left')}
                      className="bg-red-500/20 text-red-500 hover:bg-red-500/30 px-3 py-1 rounded text-xs font-semibold transition-colors"
                    >
                      Left
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
