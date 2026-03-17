'use client';

import { useRouter } from 'next/navigation';
import { AttendanceProvider } from '@/contexts/AttendanceContext';
import { DashboardLayoutProvider, useDashboardLayout } from '@/app/dashboard/_providers/DashboardLayoutProvider';
import PersistentShell from '@/app/dashboard/_components/PersistentShell';
import LeftSidebar from '@/app/dashboard/_components/LeftSidebar';
import TopBar from '@/app/dashboard/_components/TopBar';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import PixelDissolveLoader from '@/components/PixelDissolveLoader';
import { PageTransitionProvider } from '@/contexts/PageTransitionContext';

/**
 * DashboardLayoutContent - Inner component that consumes dashboard layout data
 *
 * This component is separated so it can use useDashboardLayout() hook
 */
function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { logout } = useAuth();

  // Consume all data from DashboardLayoutProvider
  const {
    user,
    currentTime,
    isWorking,
    isSidebarCollapsed,
    toggleSidebar
  } = useDashboardLayout();

  // Logout handler
  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  return (
    <PersistentShell
      leftSidebar={
        <LeftSidebar
          user={user}
          isCollapsed={isSidebarCollapsed}
          onToggle={toggleSidebar}
          onLogout={handleLogout}
        />
      }
      topBar={
        <TopBar
          user={user}
          currentTime={currentTime}
          isWorking={isWorking}
          onToggleSidebar={toggleSidebar}
          onLogout={handleLogout}
        />
      }
    >
      {children}
    </PersistentShell>
  );
}

/**
 * DashboardLayout - Main Layout Component
 *
 * Handles:
 * - Authentication loading state
 * - Provider wrapping (Attendance, DashboardLayout)
 * - Rendering the modular persistent shell
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const [showCurtain, setShowCurtain] = useState(true);
  const curtainPlayed = useRef(false);

  useEffect(() => {
    if (!isLoading && user && !curtainPlayed.current) {
      curtainPlayed.current = true;
      const timer = setTimeout(() => setShowCurtain(false), 1800);
      return () => clearTimeout(timer);
    }
  }, [isLoading, user]);

  if (isLoading || !user) {
    return <div className="fixed inset-0" style={{ backgroundColor: '#111827' }} />;
  }

  return (
    <>
      {showCurtain && <PixelDissolveLoader />}
      <PageTransitionProvider>
        <AttendanceProvider>
          <DashboardLayoutProvider user={user}>
            <DashboardLayoutContent>
              {children}
            </DashboardLayoutContent>
          </DashboardLayoutProvider>
        </AttendanceProvider>
      </PageTransitionProvider>
    </>
  );
}
