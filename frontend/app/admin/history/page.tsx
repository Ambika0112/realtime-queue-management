'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminHistoryPage() {
  const { user, isLoading: isAuthLoading } = useAuthStore();
  const router = useRouter();
  
  const [history, setHistory] = useState<any[]>([]);
  const [queues, setQueues] = useState<any[]>([]);
  
  const [selectedQueue, setSelectedQueue] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Security check & Load data
  useEffect(() => {
    if (!isAuthLoading && (!user || user.role !== 'admin')) {
      router.push('/');
      return;
    }

    if (user && user.role === 'admin') {
      // Fetch queues for the filter dropdown
      apiFetch('/queues/').then(res => res.ok && res.json().then(setQueues));
      fetchHistory();
    }
  }, [user, isAuthLoading, router]);

  const fetchHistory = async (queueId = '', status = '') => {
    setIsLoading(true);
    try {
      let url = '/queues/admin/history?';
      if (queueId) url += `queue_id=${queueId}&`;
      if (status) url += `status=${status}&`;
      
      const res = await apiFetch(url);
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
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHistory(selectedQueue, selectedStatus);
  };

  if (isAuthLoading) return <div className="text-center pt-20 animate-pulse text-gray-500">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto pt-8 px-4 pb-20">
      <div className="flex justify-between items-center mb-6">
        <Link href="/" className="text-gray-500 hover:underline font-medium inline-block text-sm">
          &larr; Back to Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Historical Analytics</h1>
        <p className="text-sm text-gray-500 mb-6">View and filter historical queue records across all users.</p>

        {/* Filters */}
        <form onSubmit={handleFilterSubmit} className="bg-gray-50 p-5 rounded-xl mb-6 flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-1/3">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Filter by Queue</label>
            <select 
              value={selectedQueue}
              onChange={(e) => setSelectedQueue(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
            >
              <option value="">All Queues</option>
              {queues.map(q => (
                <option key={q.id} value={q.id}>{q.name}</option>
              ))}
            </select>
          </div>
          
          <div className="w-full md:w-1/3">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Filter by Status</label>
            <select 
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
            >
              <option value="">All Terminal Statuses</option>
              <option value="completed">Completed</option>
              <option value="skipped">Skipped</option>
              <option value="left">Left</option>
            </select>
          </div>
          
          <button 
            type="submit"
            className="w-full md:w-auto bg-gray-900 text-white font-bold py-2 px-6 rounded-lg text-sm hover:bg-black transition-colors"
          >
            Apply Filters
          </button>
        </form>

        {/* Results */}
        {isLoading ? (
          <div className="text-center py-10 animate-pulse text-gray-500">Loading records...</div>
        ) : error ? (
          <div className="text-red-500 text-center py-10">{error}</div>
        ) : history.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-2xl">
            <p className="text-gray-500">No historical records found for these filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-100 text-sm">
                  <th className="py-3 px-4 font-bold text-gray-600">Token</th>
                  <th className="py-3 px-4 font-bold text-gray-600">Patient Name</th>
                  <th className="py-3 px-4 font-bold text-gray-600">Queue</th>
                  <th className="py-3 px-4 font-bold text-gray-600">Status</th>
                  <th className="py-3 px-4 font-bold text-gray-600">Joined At</th>
                  <th className="py-3 px-4 font-bold text-gray-600">Wait / Service Time</th>
                </tr>
              </thead>
              <tbody>
                {history.map(entry => {
                  // Calculate times
                  let waitTime = '-';
                  let serviceTime = '-';
                  
                  if (entry.served_at && entry.created_at) {
                    const waitMs = new Date(entry.served_at).getTime() - new Date(entry.created_at).getTime();
                    waitTime = Math.round(waitMs / 60000) + ' min';
                  }
                  
                  if (entry.resolved_at && entry.served_at) {
                    const serviceMs = new Date(entry.resolved_at).getTime() - new Date(entry.served_at).getTime();
                    serviceTime = Math.round(serviceMs / 60000) + ' min';
                  }

                  return (
                    <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors text-sm">
                      <td className="py-3 px-4 font-black text-blue-600">#{entry.token_number}</td>
                      <td className="py-3 px-4 font-semibold text-gray-900">{entry.user_name}</td>
                      <td className="py-3 px-4 text-gray-600">{entry.queue_name}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                          entry.status === 'completed' ? 'bg-green-100 text-green-700' :
                          entry.status === 'skipped' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {entry.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">
                        {new Date(entry.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        <br/>
                        <span className="text-[10px]">{new Date(entry.created_at).toLocaleDateString()}</span>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div className="text-gray-900">Wait: <span className="font-semibold">{waitTime}</span></div>
                        <div className="text-gray-500">Svc: <span className="font-semibold">{serviceTime}</span></div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
