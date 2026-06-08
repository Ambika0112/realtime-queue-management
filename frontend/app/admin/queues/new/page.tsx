'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';

export default function CreateQueuePage() {
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxCapacity, setMaxCapacity] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Send the data to our backend Create Queue endpoint
      const res = await apiFetch('/queues', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description: description || null,
          max_capacity: maxCapacity ? parseInt(maxCapacity) : null,
        }),
      });

      if (res.ok) {
        // Success! Go back to the home page (Admin Dashboard)
        router.push('/');
      } else {
        const data = await res.json();
        setError(data.detail || 'Failed to create queue');
      }
    } catch (err) {
      setError('Something went wrong connecting to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pt-10 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Queue</h1>
          <p className="text-sm text-gray-500">Set up a new waitlist for a department or doctor.</p>
        </div>
        <Link href="/" className="text-blue-600 hover:underline font-medium text-sm">
          &larr; Back to Dashboard
        </Link>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Queue Name (e.g., Cardiology, General Consulting)</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900"
              placeholder="Enter department name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description (Optional)</label>
            <textarea
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900"
              placeholder="e.g., Room 104, Dr. Smith"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Max Capacity (Optional)</label>
            <input
              type="number"
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900"
              placeholder="e.g., 50"
              value={maxCapacity}
              onChange={(e) => setMaxCapacity(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">Leave blank for unlimited.</p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 mt-6"
          >
            {isLoading ? 'Creating...' : 'Create Queue'}
          </button>
        </form>
      </div>
    </div>
  );
}
