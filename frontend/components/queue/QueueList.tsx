'use client';

import { useEffect, useState } from 'react';
import { Queue } from '@/types/queue';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';

export function QueueList() {
  const { user } = useAuthStore();
  const [queues, setQueues] = useState<Queue[]>([]);
  const [activeQueueIds, setActiveQueueIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch the queues when the component loads
  useEffect(() => {
    async function fetchQueues() {
      try {
        const res = await apiFetch('/queues');
        if (res.ok) {
          const data = await res.json();
          setQueues(data);
        } else {
          setError('Failed to load queues.');
        }

        if (user) {
          const activeRes = await apiFetch('/queues/me/active');
          if (activeRes.ok) {
            const activeData = await activeRes.json();
            setActiveQueueIds(activeData);
          }
        }
      } catch (err) {
        setError('Server is unreachable.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchQueues();
  }, []);

  if (isLoading) {
    return <div className="text-center py-10 text-gray-500 animate-pulse">Loading queues...</div>;
  }

  if (error) {
    return <div className="bg-red-50 text-red-600 p-4 rounded-xl">{error}</div>;
  }

  if (queues.length === 0) {
    return (
      <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center">
        <p className="text-gray-500 text-lg">No queues are currently active.</p>
        {user?.role === 'admin' && (
          <Link href="/admin/queues/new" className="inline-block mt-4 text-blue-600 hover:underline">
            Create the first queue
          </Link>
        )}
      </div>
    );
  }

  // Sort queues so active ones are at the top
  const sortedQueues = [...queues].sort((a, b) => {
    const aActive = activeQueueIds.includes(a.id);
    const bActive = activeQueueIds.includes(b.id);
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    return 0;
  });

  return (
    <div className="grid gap-6 md:grid-cols-2 text-left">
      {sortedQueues.map((queue) => {
        const isActive = activeQueueIds.includes(queue.id);
        
        return (
        <div key={queue.id} className={`border rounded-2xl p-5 hover:shadow-md transition-shadow flex flex-col justify-between ${
          isActive ? 'border-green-400 ring-2 ring-green-100' : 'border-gray-100'
        }`}>
          {isActive && (
            <div className="absolute -top-3 -right-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
              Joined
            </div>
          )}
          
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-bold text-lg text-gray-900 mb-1">{queue.name}</h3>
              {queue.description && <p className="text-sm text-gray-500 mt-1">{queue.description}</p>}
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              queue.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {queue.status.toUpperCase()}
            </span>
          </div>

          <div className="bg-blue-50 p-4 rounded-xl flex justify-between items-center mb-6 border border-blue-100">
            <span className="text-blue-800 font-medium">Currently Serving</span>
            <span className="text-3xl font-black text-blue-600">
              {queue.current_token === 0 ? '--' : queue.current_token}
            </span>
          </div>

          {/* Action Button Changes Based on Role! */}
          {user?.role === 'admin' || user?.role === 'operator' ? (
            <Link 
              href={`/operator/${queue.id}`}
              className="block w-full text-center bg-gray-900 text-white font-medium py-2.5 rounded-lg hover:bg-black transition-colors"
            >
              Manage Queue
            </Link>
          ) : user ? (
            <Link 
              href={`/queue/${queue.id}`}
              className="block w-full text-center bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Join Queue
            </Link>
          ) : (
            <Link 
              href="/login"
              className="block w-full text-center border-2 border-gray-200 text-gray-700 font-medium py-2.5 rounded-lg hover:border-gray-300 transition-colors"
            >
              Login to Join
            </Link>
          )}
        </div>
      )})}
    </div>
  );
}
