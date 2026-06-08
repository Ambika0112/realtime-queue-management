'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { apiFetch } from '@/lib/api';
import { Queue } from '@/types/queue';
import Link from 'next/link';

export default function EditQueuePage() {
  const router = useRouter();
  const params = useParams();
  const queueId = params.id as string;
  const { user, isLoading: isAuthLoading } = useAuthStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxCapacity, setMaxCapacity] = useState('');
  const [status, setStatus] = useState<'active' | 'paused' | 'closed'>('active');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Security check & Load data
  useEffect(() => {
    if (!isAuthLoading && (!user || user.role !== 'admin')) {
      router.push('/');
      return;
    }

    async function loadQueue() {
      try {
        const res = await apiFetch(`/queues/${queueId}`);
        if (res.ok) {
          const data: Queue = await res.json();
          setName(data.name);
          setDescription(data.description || '');
          setMaxCapacity(data.max_capacity?.toString() || '');
          setStatus(data.status);
        } else {
          setError('Failed to load queue details.');
        }
      } catch {
        setError('Server error.');
      } finally {
        setIsLoading(false);
      }
    }

    if (user && user.role === 'admin') {
      loadQueue();
    }
  }, [user, isAuthLoading, router, queueId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);

    try {
      const res = await apiFetch(`/queues/${queueId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description: description || null,
          max_capacity: maxCapacity ? parseInt(maxCapacity) : null,
          status,
        }),
      });

      if (res.ok) {
        router.push(`/operator/${queueId}`);
      } else {
        const data = await res.json();
        setError(data.detail || 'Failed to update queue');
      }
    } catch (err) {
      setError('An error occurred while connecting to the server.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isAuthLoading || isLoading) return <div className="text-center pt-20 animate-pulse">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto pt-10">
      <Link href={`/operator/${queueId}`} className="text-gray-500 hover:underline mb-6 inline-block">
        &larr; Back to Operator Terminal
      </Link>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Edit Queue</h1>
        <p className="text-sm text-gray-500 mb-6">Update the details and settings for this queue.</p>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Queue Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Maximum Capacity (Optional)
              </label>
              <input
                type="number"
                min="1"
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(e.target.value)}
                placeholder="Leave blank for unlimited"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white"
              >
                <option value="active">Active (Taking patients)</option>
                <option value="paused">Paused (No new joins)</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black transition-colors disabled:opacity-50 mt-6"
          >
            {isSaving ? 'Saving Changes...' : 'Save Queue Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}
