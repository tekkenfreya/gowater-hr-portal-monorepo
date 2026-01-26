'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TimeTracker() {
  const router = useRouter();
  
  // Redirect to dashboard as time tracking is integrated there
  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-800">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}