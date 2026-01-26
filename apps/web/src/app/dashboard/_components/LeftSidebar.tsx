'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User } from '@/types/auth';

interface LeftSidebarProps {
  user: User | null;
  isCollapsed: boolean;
  onToggle: () => void;
  onLogout: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactElement;
  href: string;
  subItems?: NavItem[];
}

interface EmployeeWithStatus extends User {
  isWorking: boolean;
  isOnBreak: boolean;
  checkInTime?: string;
}

/**
 * LeftSidebar - Pure Presentational Component
 *
 * No data fetching, no effects, no external state management.
 * All data comes from props. Only manages its own UI state (expanded items).
 */
export default function LeftSidebar({ user, isCollapsed, onToggle, onLogout }: LeftSidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>(['team']); // Team expanded by default
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [employees, setEmployees] = useState<EmployeeWithStatus[]>([]);

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Fetch all employees and their attendance status
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        // Use team members endpoint which now includes attendance status
        const response = await fetch('/api/team/members');

        if (!response.ok) {
          console.error('Failed to fetch team members:', response.status);
          setEmployees([]);
          return;
        }

        const data = await response.json();
        const users = data.users || [];

        // Map users to EmployeeWithStatus format (attendance status is now included in response)
        const usersWithStatus: EmployeeWithStatus[] = users.map((u: User & { isWorking?: boolean; isOnBreak?: boolean; checkInTime?: string }) => ({
          ...u,
          isWorking: u.isWorking || false,
          isOnBreak: u.isOnBreak || false,
          checkInTime: u.checkInTime
        }));

        setEmployees(usersWithStatus);
      } catch (error) {
        console.error('Failed to fetch employees:', error);
        setEmployees([]);
      }
    };

    fetchEmployees();
    // Refresh every 30 seconds
    const interval = setInterval(fetchEmployees, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems: NavItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: <HomeIcon />,
      href: '/dashboard'
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: <ClockIcon />,
      href: '/dashboard/attendance'
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: <TaskIcon />,
      href: '/dashboard/tasks'
    },
    {
      id: 'leave',
      label: 'Leave Tracker',
      icon: <CalendarDaysIcon />,
      href: '/dashboard/leave'
    },
    {
      id: 'task-assigned',
      label: 'Activities',
      icon: <LeadsIcon />,
      href: '/dashboard/task-assigned'
    },
    {
      id: 'team',
      label: 'Team',
      icon: <UsersIcon />,
      href: '#',
      subItems: []
    },
    {
      id: 'files',
      label: 'Files',
      icon: <FolderIcon />,
      href: '/dashboard/files'
    },
    ...(user?.role === 'admin' ? [{
      id: 'admin',
      label: 'Admin Panel',
      icon: <AdminIcon />,
      href: '/dashboard/admin'
    }] : [])
  ];

  const settingsItem: NavItem = {
    id: 'settings',
    label: 'Settings',
    icon: <SettingsIcon />,
    href: '/dashboard/settings'
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  const hasActiveSubItem = (item: NavItem) => {
    return item.subItems?.some(subItem => isActive(subItem.href)) || false;
  };

  return (
    <>
      {/* Sidebar */}
      <div className={`h-full bg-gradient-to-b from-[#1a2332] to-[#0f1824] border-r border-gray-700/30 shadow-xl flex flex-col overflow-hidden ${
        isCollapsed ? 'w-16' : 'w-64'
      } transition-all duration-300`}>
        {/* Header with Logo */}
        <div className="relative flex flex-col items-center justify-center border-b border-gray-700/30">
          {!isCollapsed && (
            <Link
              href="/dashboard"
              className="bg-white p-6 w-full flex items-center justify-center group transition-all duration-300 hover:shadow-lg"
            >
              <img
                src="/gowater new logo.png"
                alt="GoWater"
                className="h-32 w-auto object-contain transform transition-all duration-500 group-hover:scale-110"
              />
            </Link>
          )}
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-gray-700/50 transition-colors lg:hidden absolute top-2 right-2 z-10"
          >
            <XIcon className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="relative py-6 flex-1 overflow-y-auto">
          <div className="px-4 mb-4">
            <p className="text-gray-400 text-xs uppercase tracking-[0.15em] font-bold" style={{ fontFamily: 'var(--font-geist-sans)' }}>Navigation</p>
          </div>
          <div className="px-4 space-y-1">
            {navItems.map((item) => (
              <div key={item.id}>
                <div className="relative">
                  {item.subItems ? (
                    <div className={`group flex items-center rounded-lg transition-all duration-300 ease-out ${
                      isActive(item.href) || hasActiveSubItem(item) || expandedItems.includes(item.id)
                        ? 'bg-blue-600/20 text-white border-l-4 border-blue-500 shadow-md'
                        : 'text-gray-300 hover:bg-gray-700/50 hover:text-white hover:translate-x-1 hover:scale-[1.02] border-l-4 border-transparent'
                    }`}>
                      {item.id === 'team' ? (
                        <div className="flex-1 flex items-center px-3 py-3 text-sm font-bold uppercase tracking-[0.1em]" style={{ fontFamily: 'var(--font-geist-sans)' }}>
                          <div className="flex items-center space-x-3">
                            <div className="w-5 h-5 flex-shrink-0">{item.icon}</div>
                            {!isCollapsed && <span>{item.label}</span>}
                          </div>
                        </div>
                      ) : (
                        <Link
                          href={item.href}
                          className="flex-1 flex items-center px-3 py-3 text-sm font-bold uppercase tracking-[0.1em]"
                          style={{ fontFamily: 'var(--font-geist-sans)' }}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-5 h-5 flex-shrink-0">{item.icon}</div>
                            {!isCollapsed && <span>{item.label}</span>}
                          </div>
                        </Link>
                      )}
                      {!isCollapsed && (
                        <button
                          onClick={() => toggleExpanded(item.id)}
                          className="px-3 py-3 hover:bg-gray-700/50 transition-colors"
                        >
                          <svg className={`w-4 h-4 transition-transform duration-300 ${expandedItems.includes(item.id) ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      className={`group flex items-center px-3 py-3 text-sm font-bold uppercase tracking-[0.1em] rounded-lg transition-all duration-300 ease-out ${
                        isActive(item.href)
                          ? 'bg-blue-600/20 text-white border-l-4 border-blue-500 shadow-md'
                          : 'text-gray-300 hover:bg-gray-700/50 hover:text-white hover:translate-x-1 hover:scale-[1.02] border-l-4 border-transparent'
                      }`}
                      style={{ fontFamily: 'var(--font-geist-sans)' }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-5 h-5 flex-shrink-0">{item.icon}</div>
                        {!isCollapsed && <span>{item.label}</span>}
                      </div>
                    </Link>
                  )}
                </div>

                {/* Sub Items - Special handling for Team dropdown */}
                {expandedItems.includes(item.id) && !isCollapsed && (
                  <div className="ml-6 mt-1 space-y-1">
                    {/* Team Employee List - Grouped by Role */}
                    {item.id === 'team' && (
                      <div className="space-y-2">
                        {/* Role Categories */}
                        {(['admin', 'manager', 'employee', 'intern'] as const).map((role) => {
                          const roleEmployees = employees.filter(e => e.role === role);
                          if (roleEmployees.length === 0) return null;

                          const roleLabels: Record<string, string> = {
                            admin: 'Admin',
                            manager: 'Manager',
                            employee: 'Employee',
                            intern: 'OJT/Intern'
                          };

                          const roleColors: Record<string, string> = {
                            admin: 'text-blue-400',
                            manager: 'text-blue-400',
                            employee: 'text-gray-400',
                            intern: 'text-orange-400'
                          };

                          return (
                            <div key={role} className="space-y-1">
                              {/* Role Header */}
                              <div className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${roleColors[role]}`} style={{ fontFamily: 'var(--font-geist-sans)' }}>
                                {roleLabels[role]}
                              </div>
                              {/* Employees under this role */}
                              {roleEmployees.map((employee) => (
                                <div
                                  key={employee.id}
                                  className="flex items-center space-x-2 px-3 py-2 text-xs rounded-lg transition-all duration-300 text-gray-300 hover:bg-gray-700/30"
                                >
                                  {/* Status Indicator */}
                                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                    employee.isWorking ? 'bg-green-500 animate-pulse' : employee.isOnBreak ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
                                  }`} />
                                  {/* Employee Name - Use employeeName (Display Name) if available, otherwise name */}
                                  <span className="text-xs font-medium truncate" style={{ fontFamily: 'var(--font-geist-sans)' }}>
                                    {employee.employeeName || employee.name}
                                  </span>
                                  {/* Status Text */}
                                  <span className={`text-[10px] ml-auto flex-shrink-0 ${
                                    employee.isWorking ? 'text-green-400' : employee.isOnBreak ? 'text-yellow-400' : 'text-red-400'
                                  }`}>
                                    {employee.isWorking ? 'Active' : employee.isOnBreak ? 'Break' : 'Offline'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* Regular Sub Items */}
                    {item.id !== 'team' && item.subItems && item.subItems.map((subItem) => (
                      <Link
                        key={subItem.id}
                        href={subItem.href}
                        className={`flex items-center space-x-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all duration-300 ${
                          isActive(subItem.href)
                            ? 'bg-blue-600/20 text-white border-l-2 border-blue-400'
                            : 'text-gray-400 hover:bg-gray-700/50 hover:text-white hover:translate-x-1'
                        }`}
                        style={{ fontFamily: 'var(--font-geist-sans)' }}
                      >
                        <div className="w-4 h-4 flex-shrink-0">{subItem.icon}</div>
                        <span>{subItem.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>

        {/* Settings and Logout at Bottom */}
        <div className="relative mt-auto border-t border-gray-700/30">
          <div className="p-4 space-y-2">
            <Link
              href={settingsItem.href}
              className={`group flex items-center justify-between px-3 py-3 text-sm font-bold uppercase tracking-[0.1em] rounded-lg transition-all duration-300 ease-out ${
                isActive(settingsItem.href)
                  ? 'bg-blue-600/20 text-white border-l-4 border-blue-500 shadow-md'
                  : 'text-gray-300 hover:bg-gray-700/50 hover:text-white hover:translate-x-1 hover:scale-[1.02] border-l-4 border-transparent'
              }`}
              style={{ fontFamily: 'var(--font-geist-sans)' }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 flex-shrink-0">{settingsItem.icon}</div>
                {!isCollapsed && <span>{settingsItem.label}</span>}
              </div>
            </Link>

            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full group flex items-center justify-between px-3 py-3 text-sm font-bold uppercase tracking-[0.1em] rounded-lg transition-all duration-300 ease-out text-gray-300 hover:bg-red-900/20 hover:text-red-400 hover:translate-x-1 hover:scale-[1.02] border-l-4 border-transparent hover:border-red-500"
              style={{ fontFamily: 'var(--font-geist-sans)' }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 flex-shrink-0"><LogoutIcon /></div>
                {!isCollapsed && <span>Logout</span>}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a2332] rounded-2xl shadow-xl border border-gray-700/30 max-w-md w-full p-8 transform animate-card-slide-in">
            <div className="relative">
              <h3 className="text-2xl font-bold text-white uppercase tracking-wider mb-3" style={{ fontFamily: 'var(--font-geist-sans)' }}>
                Confirm Logout
              </h3>
              <p className="text-gray-300 mb-8 text-base">Are you sure you want to logout?</p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-6 py-3 border-2 border-gray-600 rounded-xl text-gray-300 font-bold uppercase tracking-wider hover:bg-gray-700/50 hover:text-white hover:border-gray-500 transition-all duration-300"
                  style={{ fontFamily: 'var(--font-geist-sans)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    onLogout();
                  }}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold uppercase tracking-wider hover:bg-red-700 hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-all duration-300"
                  style={{ fontFamily: 'var(--font-geist-sans)' }}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Icon Components (same as before)
function HomeIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m3 7 5.119-4.094a1.628 1.628 0 0 1 2.123 0L16 7v11a1 1 0 0 1-1 1H9v-5a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v5H5a1 1 0 0 1-1-1V7z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CalendarDaysIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008ZM14.25 15h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008ZM16.5 15h.008v.008H16.5V15Zm0 2.25h.008v.008H16.5v-.008Z" />
    </svg>
  );
}

function TaskIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

function LeadsIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}
