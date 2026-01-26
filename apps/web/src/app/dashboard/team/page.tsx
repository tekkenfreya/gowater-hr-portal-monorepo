'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TeamPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to team attendance as the main team functionality
    router.replace('/dashboard/team/attendance');
  }, [router]);

  return (
    <div className="p-6">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-800">Redirecting to Team Attendance...</p>
      </div>
    </div>
  );
}