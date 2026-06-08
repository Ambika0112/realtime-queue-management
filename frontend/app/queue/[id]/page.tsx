'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Queue } from '@/types/queue';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';

export default function QueueDetailPage() {
  const params = useParams();
  const queueId = params.id as string;
  const router = useRouter();

  const [queue, setQueue] = useState<Queue | null>(null);
  const [myToken, setMyToken] = useState<number | null>(null);
  const [peopleAhead, setPeopleAhead] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // 1. Fetch the Queue Details
  useEffect(() => {
    async function loadQueue() {
      try {
        const res = await apiFetch(`/queues/${queueId}`);
        if (res.ok) {
          const data = await res.json();
          setQueue(data);
          
          // Check if we already have an active token by calling the backend
          const tokenRes = await apiFetch(`/queues/${queueId}/my-token`);
          if (tokenRes.ok) {
            const tokenData = await tokenRes.json();
            setMyToken(tokenData.token_number);
            setPeopleAhead(tokenData.people_ahead);
          }
        } else {
          setError('Queue not found.');
        }
      } catch (err) {
        setError('Server error.');
      } finally {
        setIsLoading(false);
      }
    }
    loadQueue();
  }, [queueId]);

  // 2. Connect to the WebSocket for LIVE updates!
  useEffect(() => {
    if (!queueId) return;

    // Connect to ws://localhost:8000/queues/...
    const wsUrl = process.env.NEXT_PUBLIC_API_URL?.replace('http', 'ws') || 'ws://localhost:8000';
    const ws = new WebSocket(`${wsUrl}/queues/${queueId}/ws`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'QUEUE_UPDATE') {
        // The backend pushed a new update! Update the UI instantly.
        setQueue((prev) => prev ? { ...prev, current_token: data.current_token } : null);
        
        // If we are waiting, and the queue advances, our peopleAhead drops by 1
        setPeopleAhead((prev) => prev && prev > 0 ? prev - 1 : 0);
      }
    };

    return () => ws.close(); // Clean up when leaving the page
  }, [queueId]);

  const handleJoin = async () => {
    try {
      const res = await apiFetch(`/queues/${queueId}/join`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setMyToken(data.token_number);
        setPeopleAhead(data.people_ahead);
      } else {
        const err = await res.json();
        setError(err.detail || 'Failed to join queue');
      }
    } catch {
      setError('Connection failed');
    }
  };

  const handleLeave = async () => {
    try {
      const res = await apiFetch(`/queues/${queueId}/leave`, { method: 'POST' });
      if (res.ok) {
        setMyToken(null);
        setPeopleAhead(null);
      }
    } catch {
      setError('Failed to leave queue');
    }
  };

  if (isLoading) return <div className="text-center pt-20 animate-pulse text-gray-500">Loading Queue Data...</div>;
  if (error || !queue) return <div className="text-center pt-20 text-red-500 font-medium">{error}</div>;

  return (
    <div className="max-w-xl mx-auto pt-10 px-4">
      <Link href="/" className="text-blue-600 hover:underline font-medium mb-6 inline-block">
        &larr; Back to Queues
      </Link>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{queue.name}</h1>
        <p className="text-gray-500 mb-8">{queue.description || 'Join the line below.'}</p>

        <div className="flex justify-between items-center bg-gray-50 p-6 rounded-2xl mb-8">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Currently Serving</p>
            <p className="text-5xl font-black text-blue-600">
              {queue.current_token === 0 ? '--' : queue.current_token}
            </p>
          </div>

          {myToken !== null && (
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Your Token</p>
              <p className="text-5xl font-black text-gray-900">{myToken}</p>
            </div>
          )}
        </div>

        {myToken !== null && (
          <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl mb-8 flex justify-between items-center text-left">
            <div>
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-1">Waitlist Position</p>
              <p className="text-3xl font-bold text-gray-900">
                {peopleAhead === 0 ? "You're Next!" : `${peopleAhead} people ahead`}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-blue-600">{peopleAhead}</span>
            </div>
          </div>
        )}

        {!myToken ? (
          <button
            onClick={handleJoin}
            className="w-full bg-blue-600 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-blue-500/30 hover:-translate-y-0.5 hover:shadow-blue-500/50 transition-all"
          >
            Join Queue Now
          </button>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 text-green-700 p-4 rounded-xl font-medium border border-green-200">
              You are in the queue! Keep this page open to track your status live.
            </div>
            <button
              onClick={handleLeave}
              className="w-full bg-red-50 text-red-600 font-bold py-3 rounded-xl hover:bg-red-100 transition-colors"
            >
              Leave Queue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
