'use client';

import { useRouter } from 'next/navigation';
import { AttendanceProvider } from '@/contexts/AttendanceContext';
import { DashboardLayoutProvider, useDashboardLayout } from '@/app/dashboard/_providers/DashboardLayoutProvider';
import PersistentShell from '@/app/dashboard/_components/PersistentShell';
import LeftSidebar from '@/app/dashboard/_components/LeftSidebar';
import TopBar from '@/app/dashboard/_components/TopBar';
import { useAuth } from '@/hooks/useAuth';

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

  // Block ALL rendering while authentication is loading
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-neutral-900 flex items-center justify-center">
        <div className="animate-pulse text-white text-xl font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-geist-sans)' }}>
          Loading...
        </div>
      </div>
    );
  }

  // Auth complete: Render dashboard immediately
  return (
    <AttendanceProvider>
      <DashboardLayoutProvider user={user}>
        <DashboardLayoutContent>
          {children}
        </DashboardLayoutContent>
      </DashboardLayoutProvider>
    </AttendanceProvider>
  );
}
