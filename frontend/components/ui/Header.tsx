'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/auth';

export function Header() {
  const { user, logout, isLoading } = useAuthStore();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
      {/* Logo */}
      <Link href="/" className="text-xl font-bold text-blue-600">
        QueueFlow
      </Link>

      {/* Navigation */}
      <div className="flex gap-4 items-center">
        {/* We use isLoading to prevent UI flashing before we check localStorage */}
        {isLoading ? (
          <div className="h-6 w-24 bg-gray-100 animate-pulse rounded" />
        ) : user ? (
          <>
            <span className="text-gray-600">Hello, {user.full_name}</span>
            <button
              onClick={logout}
              className="text-sm font-medium text-red-600 hover:text-red-800"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Login
            </Link>
            <Link 
              href="/register" 
              className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Register
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
