'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types/auth';
import { logger } from '@/lib/logger';

/**
 * DashboardLayoutProvider - Centralized State Management
 *
 * This provider handles ALL polling and data fetching for the dashboard layout:
 * - Time updates (every 1 second)
 * - Working status (every 30 seconds)
 * - Team members (every 30 seconds)
 * - Notifications
 * - Sidebar collapse state
 *
 * All presentational components consume this data via useDashboardLayout() hook
 */

interface TeamMember {
  id: number;
  name: string;
  email: string;
  employeeId: string;
  role: string;
  position: string;
  department: string;
  isOnline: boolean;
}

interface Notification {
  id: string;
  unread: boolean;
  type: string;
  title: string;
  message: string;
  time: string;
}

interface DashboardLayoutContextValue {
  // User & Auth
  user: User | null;

  // Time
  currentTime: Date;

  // Working Status
  isWorking: boolean;

  // Team
  teamMembers: TeamMember[];

  // Notifications
  notifications: Notification[];
  unreadCount: number;

  // Sidebar
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const DashboardLayoutContext = createContext<DashboardLayoutContextValue | undefined>(undefined);

interface DashboardLayoutProviderProps {
  user: User | null;
  children: ReactNode;
}

export function DashboardLayoutProvider({ user, children }: DashboardLayoutProviderProps) {
  // Time State
  const [currentTime, setCurrentTime] = useState(new Date());

  // Working Status State
  const [isWorking, setIsWorking] = useState(false);

  // Team Members State
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Sidebar State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // ========================================
  // POLLING: Time Updates (Every 1 Second)
  // ========================================
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // ========================================
  // POLLING: Working Status (Every 30 Seconds)
  // ========================================
  useEffect(() => {
    const fetchWorkingStatus = async () => {
      try {
        const response = await fetch('/api/attendance');
        if (response.ok) {
          const data = await response.json();
          // User is working if they have checked in but not checked out
          const hasCheckedIn = data.attendance && data.attendance.checkInTime;
          const hasCheckedOut = data.attendance && data.attendance.checkOutTime;
          setIsWorking(hasCheckedIn && !hasCheckedOut);
        }
      } catch (error) {
        logger.error('Failed to fetch working status', error);
      }
    };

    if (user) {
      fetchWorkingStatus();
      // Refresh every 30 seconds to keep status updated
      const statusInterval = setInterval(fetchWorkingStatus, 30000);
      return () => clearInterval(statusInterval);
    }
  }, [user]);

  // ========================================
  // POLLING: Team Members (Every 30 Seconds)
  // ========================================
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const response = await fetch('/api/team/members');
        if (response.ok) {
          const data = await response.json();
          setTeamMembers(data.employees || []);
        }
      } catch (error) {
        logger.error('Failed to fetch team members', error);
      }
    };

    if (user) {
      fetchTeamMembers();
      // Refresh every 30 seconds
      const interval = setInterval(fetchTeamMembers, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // ========================================
  // Sidebar Toggle Handler
  // ========================================
  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  // ========================================
  // Computed Values
  // ========================================
  const unreadCount = notifications.filter(n => n.unread).length;

  const value: DashboardLayoutContextValue = {
    user,
    currentTime,
    isWorking,
    teamMembers,
    notifications,
    unreadCount,
    isSidebarCollapsed,
    toggleSidebar
  };

  return (
    <DashboardLayoutContext.Provider value={value}>
      {children}
    </DashboardLayoutContext.Provider>
  );
}

/**
 * Hook to consume dashboard layout data
 *
 * Usage:
 * const { currentTime, isWorking, teamMembers, ... } = useDashboardLayout();
 */
export function useDashboardLayout() {
  const context = useContext(DashboardLayoutContext);
  if (context === undefined) {
    throw new Error('useDashboardLayout must be used within DashboardLayoutProvider');
  }
  return context;
}
