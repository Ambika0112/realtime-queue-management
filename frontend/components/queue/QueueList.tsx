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
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-100 text-center">
        <p className="text-gray-500 text-base">No queues are currently active.</p>
        {user?.role === 'admin' && (
          <Link href="/admin/queues/new" className="inline-block mt-3 text-sm text-blue-600 hover:underline">
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
        <div key={queue.id} className={`border rounded-xl p-4 sm:p-5 hover:shadow-md transition-shadow flex flex-col justify-between relative ${
          isActive ? 'border-green-400 ring-1 ring-green-100' : 'border-gray-100'
        }`}>
          {isActive && (
            <div className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
              Joined
            </div>
          )}
          
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-0.5">{queue.name}</h3>
              {queue.description && <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{queue.description}</p>}
            </div>
            <span className={`px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-semibold uppercase tracking-wider ${
              queue.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {queue.status}
            </span>
          </div>

          <div className="bg-blue-50 p-3 sm:p-4 rounded-lg flex justify-between items-center mb-4 border border-blue-100">
            <span className="text-blue-800 text-sm font-medium">Currently Serving</span>
            <span className="text-2xl font-bold text-blue-600">
              {queue.current_token === 0 ? '--' : queue.current_token}
            </span>
          </div>

          {/* Action Button Changes Based on Role! */}
          {user?.role === 'admin' || user?.role === 'operator' ? (
            <Link 
              href={`/operator/${queue.id}`}
              className="block w-full text-center bg-gray-900 text-white text-sm font-medium py-2 rounded-md hover:bg-black transition-colors"
            >
              Manage Queue
            </Link>
          ) : user ? (
            <Link 
              href={`/queue/${queue.id}`}
              className="block w-full text-center bg-blue-600 text-white text-sm font-medium py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Join Queue
            </Link>
          ) : (
            <Link 
              href="/login"
              className="block w-full text-center border border-gray-200 text-gray-700 text-sm font-medium py-2 rounded-md hover:border-gray-300 transition-colors"
            >
              Login to Join
            </Link>
          )}
        </div>
      )})}
    </div>
  );
}
