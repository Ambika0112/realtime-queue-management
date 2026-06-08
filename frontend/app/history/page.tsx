'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CustomerHistoryPage() {
  const { user, isLoading: isAuthLoading } = useAuthStore();
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
      return;
    }

    async function fetchHistory() {
      try {
        const res = await apiFetch('/queues/me/history');
        if (res.ok) {
          setHistory(await res.json());
        } else {
          setError('Failed to load history');
        }
      } catch (err) {
        setError('Server error');
      } finally {
        setIsLoading(false);
      }
    }

    if (user) {
      fetchHistory();
    }
  }, [user, isAuthLoading, router]);

  if (isAuthLoading || isLoading) {
    return <div className="text-center pt-20 animate-pulse text-gray-500">Loading your history...</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500 bg-green-500/10';
      case 'skipped': return 'text-yellow-500 bg-yellow-500/10';
      case 'left': return 'text-red-500 bg-red-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  return (
    <div className="max-w-4xl mx-auto pt-10 px-4">
      <Link href="/" className="text-gray-500 hover:underline font-medium mb-6 inline-block">
        &larr; Back to Queues
      </Link>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My History</h1>
        <p className="text-gray-500 mb-8">View your past queue visits and tokens.</p>

        {error && <div className="text-red-500 mb-4">{error}</div>}

        {history.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-2xl">
            <p className="text-gray-500">You have no queue history yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((entry) => (
              <div key={entry.id} className="border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-50 text-blue-600 font-black text-2xl h-16 w-16 rounded-full flex items-center justify-center shrink-0">
                    {entry.token_number}
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-gray-900">{entry.queue_name}</h3>
                    <p className="text-gray-500 text-sm">
                      Joined: {new Date(entry.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                  <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider ${getStatusColor(entry.status)}`}>
                    {entry.status}
                  </span>
                  {entry.resolved_at && (
                    <p className="text-gray-400 text-xs text-right">
                      Finished: {new Date(entry.resolved_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
