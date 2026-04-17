'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User } from '@/types/auth';
import { usePageTransition } from '@/contexts/PageTransitionContext';
import {
  Home,
  Clock,
  ClipboardCheck,
  CalendarDays,
  Users,
  Folder,
  Settings,
  LogOut,
  X,
  ShieldCheck,
  Package,
  Wrench,
  UsersRound,
} from 'lucide-react';

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
  const { navigateTo } = usePageTransition();
  const [expandedItems, setExpandedItems] = useState<string[]>(['team']);
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
      icon: <Home className="w-5 h-5" />,
      href: '/dashboard'
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: <Clock className="w-5 h-5" />,
      href: '/dashboard/attendance'
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: <ClipboardCheck className="w-5 h-5" />,
      href: '/dashboard/tasks'
    },
    {
      id: 'leave',
      label: 'Leave Tracker',
      icon: <CalendarDays className="w-5 h-5" />,
      href: '/dashboard/leave'
    },
    {
      id: 'task-assigned',
      label: 'Activities',
      icon: <UsersRound className="w-5 h-5" />,
      href: '/dashboard/task-assigned'
    },
    {
      id: 'team',
      label: 'Team',
      icon: <Users className="w-5 h-5" />,
      href: '#',
      subItems: []
    },
    {
      id: 'files',
      label: 'Files',
      icon: <Folder className="w-5 h-5" />,
      href: '/dashboard/files'
    },
    {
      id: 'assets',
      label: 'Assets',
      icon: <Package className="w-5 h-5" />,
      href: '#',
      subItems: [
        {
          id: 'assets-units',
          label: 'Units',
          icon: <Package className="w-4 h-4" />,
          href: '/dashboard/admin/units'
        },
        ...(user?.role === 'admin' ? [{
          id: 'assets-service-requests',
          label: 'Service Requests',
          icon: <Wrench className="w-4 h-4" />,
          href: '/dashboard/admin/service-requests'
        }] : [])
      ]
    },
    ...(user?.role === 'admin' ? [{
      id: 'admin',
      label: 'Admin Panel',
      icon: <ShieldCheck className="w-5 h-5" />,
      href: '/dashboard/admin',
    }] : [])
  ];

  const settingsItem: NavItem = {
    id: 'settings',
    label: 'Settings',
    icon: <Settings className="w-5 h-5" />,
    href: '/dashboard/settings'
  };

  const subItemHrefs = navItems.flatMap(item => item.subItems?.map(sub => sub.href) ?? []);

  const isActive = (href: string) => {
    if (href === '#') return false;
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    if (pathname === href) return true;
    if (pathname.startsWith(href + '/')) {
      // Don't match parent if a more specific sub-item owns this path
      const claimedBySubItem = subItemHrefs.some(
        subHref => subHref !== href && pathname.startsWith(subHref)
      );
      return !claimedBySubItem;
    }
    return false;
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
            <X className="w-5 h-5 text-gray-300" />
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
                      {item.id === 'team' || item.id === 'assets' ? (
                        <div className="flex-1 flex items-center px-3 py-3 text-sm font-bold uppercase tracking-[0.1em]" style={{ fontFamily: 'var(--font-geist-sans)' }}>
                          <div className="flex items-center space-x-3">
                            <div className="w-5 h-5 flex-shrink-0">{item.icon}</div>
                            {!isCollapsed && <span>{item.label}</span>}
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => navigateTo(item.href)}
                          className="flex-1 flex items-center px-3 py-3 text-sm font-bold uppercase tracking-[0.1em] text-left"
                          style={{ fontFamily: 'var(--font-geist-sans)' }}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-5 h-5 flex-shrink-0">{item.icon}</div>
                            {!isCollapsed && <span>{item.label}</span>}
                          </div>
                        </button>
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
                    <button
                      onClick={() => navigateTo(item.href)}
                      className={`group flex items-center px-3 py-3 text-sm font-bold uppercase tracking-[0.1em] rounded-lg transition-all duration-300 ease-out w-full text-left ${
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
                    </button>
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
                      <button
                        key={subItem.id}
                        onClick={() => navigateTo(subItem.href)}
                        className={`flex items-center space-x-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all duration-300 w-full text-left ${
                          isActive(subItem.href)
                            ? 'bg-blue-600/20 text-white border-l-2 border-blue-400'
                            : 'text-gray-400 hover:bg-gray-700/50 hover:text-white hover:translate-x-1'
                        }`}
                        style={{ fontFamily: 'var(--font-geist-sans)' }}
                      >
                        <div className="w-4 h-4 flex-shrink-0">{subItem.icon}</div>
                        <span>{subItem.label}</span>
                      </button>
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
            <button
              onClick={() => navigateTo(settingsItem.href)}
              className={`group flex items-center justify-between px-3 py-3 text-sm font-bold uppercase tracking-[0.1em] rounded-lg transition-all duration-300 ease-out w-full text-left ${
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
            </button>

            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full group flex items-center justify-between px-3 py-3 text-sm font-bold uppercase tracking-[0.1em] rounded-lg transition-all duration-300 ease-out text-gray-300 hover:bg-red-900/20 hover:text-red-400 hover:translate-x-1 hover:scale-[1.02] border-l-4 border-transparent hover:border-red-500"
              style={{ fontFamily: 'var(--font-geist-sans)' }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 flex-shrink-0"><LogOut className="w-5 h-5" /></div>
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

