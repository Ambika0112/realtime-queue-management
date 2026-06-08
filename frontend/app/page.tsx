'use client';

import { QueueList } from '@/components/queue/QueueList';
import { useAuthStore } from '@/store/auth';
import Link from 'next/link';

export default function Home() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return <div className="pt-20 text-center animate-pulse text-gray-500">Loading QueueFlow...</div>;
  }

  // 1. PUBLIC MARKETING PAGE (Logged Out)
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center pt-20 px-4">
        <div className="inline-block mb-4 px-4 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 font-semibold text-xs sm:text-sm">
          🚀 Next-Gen Hospital Queueing
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-blue-800 to-gray-900 tracking-tight mb-4 text-center">
          Stop Waiting.<br />Start Flowing.
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl text-center mb-8 leading-relaxed">
          QueueFlow brings real-time transparency to hospital waiting rooms. 
          Get your token on your phone, track the current serving number live, 
          and arrive exactly when it's your turn.
        </p>
        <Link href="/register" className="bg-blue-600 text-white font-bold text-base sm:text-lg px-6 py-3 rounded-full shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
          Get Your Token Now
        </Link>
      </div>
    );
  }

  // 2. ADMIN DASHBOARD
  if (user.role === 'admin') {
    return (
      <div className="max-w-3xl mx-auto pt-6 sm:pt-10 px-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Admin Dashboard</h1>
            <p className="text-xs sm:text-sm text-gray-500">Manage queues, operators, and hospital flow.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/history" className="text-gray-600 hover:text-blue-600 text-sm font-medium px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-colors border border-gray-200">
              Analytics
            </Link>
            <Link href="/admin/queues/new" className="bg-blue-600 text-white text-sm px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors">
              + Create Queue
            </Link>
          </div>
        </div>
        
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
          <QueueList />
        </div>
      </div>
    );
  }


  // 3. OPERATOR DASHBOARD
  if (user.role === 'operator') {
    return (
      <div className="max-w-4xl mx-auto pt-8 px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Operator Terminal</h1>
        <p className="text-sm text-gray-500 mb-6">Manage your assigned queue and call the next patient.</p>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
          <p className="text-gray-500 mb-4">Operator controls coming soon...</p>
        </div>
      </div>
    );
  }

  // 4. CUSTOMER DASHBOARD (Default)
  return (
    <div className="max-w-3xl mx-auto pt-6 sm:pt-8 px-4">
      {/* Customer View */}
      <div className="mt-4 sm:mt-8">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3 mb-6">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">Available Queues</h2>
            <p className="text-xs sm:text-sm text-gray-500">Select a department to join the waitlist.</p>
          </div>
          <Link href="/history" className="text-gray-600 hover:text-blue-600 text-sm font-medium px-4 py-2 rounded-lg transition-colors border border-gray-200">
            My History
          </Link>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
          <QueueList />
        </div>
      </div>
    </div>
  );
}

