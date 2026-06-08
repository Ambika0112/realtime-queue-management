'use client'; // This tells Next.js: "Run this component in the browser, not the server!"

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  // useEffect with an empty dependency array [] means: 
  // "Run this exactly once when the component mounts in the browser"
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return <>{children}</>;
}
