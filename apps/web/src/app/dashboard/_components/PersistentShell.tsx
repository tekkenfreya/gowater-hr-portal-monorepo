'use client';

import { ReactNode } from 'react';

interface PersistentShellProps {
  leftSidebar: ReactNode;
  topBar: ReactNode;
  children: ReactNode;
}

/**
 * PersistentShell - Modular 2-Side Layout Wrapper
 *
 * This component ensures that the persistent sides (left, top)
 * never re-render during navigation. Only the center content ({children}) refreshes.
 *
 * Architecture:
 * - Top Bar: Fixed at top (h-16, z-40)
 * - Left Sidebar: Fixed at left (w-64, z-30)
 * - Center Content: Scrollable, refreshes on navigation
 */
export default function PersistentShell({
  leftSidebar,
  topBar,
  children
}: PersistentShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top Bar - Fixed across entire top */}
      <div className="fixed top-0 left-0 right-0 z-40 h-16">
        {topBar}
      </div>

      {/* Main Layout Container - Below top bar */}
      <div className="flex flex-1 pt-16">
        {/* Left Sidebar - Fixed on left side */}
        <div className="fixed left-0 top-16 bottom-0 w-64 z-30 overflow-y-auto">
          {leftSidebar}
        </div>

        {/* Main Content Area - Scrollable, ONLY this refreshes */}
        <div className="flex-1 overflow-hidden ml-64 mr-16">
          <main className="h-full p-2.5">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
