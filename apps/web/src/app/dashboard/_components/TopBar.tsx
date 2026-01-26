'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types/auth';
import { formatPhilippineTime } from '@/lib/timezone';

interface TopBarProps {
  user: User | null;
  currentTime: Date;
  isWorking: boolean;
  onToggleSidebar: () => void;
  onLogout: () => Promise<void>;
}

interface Notification {
  id: string;
  unread: boolean;
  type: string;
  title: string;
  message: string;
  time: string;
}

/**
 * TopBar - Pure Presentational Component
 *
 * No polling, no intervals, no data fetching.
 * All data comes from props (currentTime, isWorking, etc.)
 */
export default function TopBar({
  user,
  currentTime,
  isWorking,
  onToggleSidebar,
  onLogout
}: TopBarProps) {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Click outside to close user menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showUserMenu]);

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    setShowUserMenu(false);
    await onLogout();
  };

  // Database-driven notifications (empty for now)
  const notifications: Notification[] = [];
  const unreadCount = notifications?.filter(n => n?.unread)?.length || 0;

  return (
    <>
      <header className="bg-white border-b border-gray-200 shadow-sm h-16 relative">
        <div className="flex items-center h-full px-4 lg:px-6">
          {/* Mobile Menu Button */}
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden text-gray-700 mr-4"
          >
            <MenuIcon />
          </button>

          {/* Main Container - Gray rounded bar spanning entire TopBar */}
          <div className="hidden lg:flex items-center flex-1 bg-gray-50 rounded-xl border border-gray-200 px-4 py-2">

            {/* Left Section - Time & Date */}
            <div className="flex items-center space-x-3 px-2">
              <span className="text-xl font-bold text-gray-800 tabular-nums tracking-wider" style={{ fontFamily: 'var(--font-geist-mono)' }}>
                {formatPhilippineTime(currentTime)}
              </span>
              <div className="h-6 w-px bg-gray-300"></div>
              <span className="text-sm font-semibold text-gray-600 uppercase tracking-wider" style={{ fontFamily: 'var(--font-geist-sans)' }}>
                {currentTime.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>

            {/* Spacer */}
            <div className="flex-1"></div>

            {/* Right Section - User Profile */}
            <div className="flex items-center space-x-4 px-2">
              {/* Work Status Indicator */}
              <div className="flex items-center space-x-2">
                {isWorking ? (
                  <>
                    <div className="relative">
                      <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                      <div className="absolute inset-0 w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></div>
                    </div>
                    <span className="text-xs font-bold text-green-700 uppercase tracking-wider" style={{ fontFamily: 'var(--font-geist-sans)' }}>Working</span>
                  </>
                ) : (
                  <>
                    <div className="w-2.5 h-2.5 bg-gray-400 rounded-full"></div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider" style={{ fontFamily: 'var(--font-geist-sans)' }}>Offline</span>
                  </>
                )}
              </div>

              {/* Divider */}
              <div className="h-8 w-px bg-gray-300"></div>

              {/* User Info with Dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 hover:bg-gray-100 rounded-lg p-2 transition-colors -m-2"
                >
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-blue-100">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name || 'User'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-bold text-sm">
                        {user?.name?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-800 leading-none" style={{ fontFamily: 'var(--font-geist-sans)' }}>{user?.name}</span>
                    <span className="text-xs capitalize leading-none mt-0.5" style={{ fontFamily: 'var(--font-geist-sans)' }}>
                      {user?.role === 'admin' ? (
                        <span className="text-blue-600 font-semibold uppercase tracking-wider">Admin</span>
                      ) : user?.role === 'manager' ? (
                        <span className="text-blue-600 font-semibold uppercase tracking-wider">Manager</span>
                      ) : user?.role === 'intern' ? (
                        <span className="text-orange-500 font-semibold uppercase tracking-wider">OJT/Intern</span>
                      ) : (
                        <span className="text-gray-500 uppercase tracking-wider">Employee</span>
                      )}
                    </span>
                  </div>
                  <svg className={`w-4 h-4 text-gray-600 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* User Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                    <div className="relative">
                      <div className="px-4 py-3 border-b border-gray-200">
                        <p className="text-sm font-bold text-gray-800" style={{ fontFamily: 'var(--font-geist-sans)' }}>{user?.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      </div>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          router.push('/dashboard/settings');
                        }}
                        className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center space-x-3 transition-all duration-300"
                        style={{ fontFamily: 'var(--font-geist-sans)' }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>Profile & Settings</span>
                      </button>

                      <div className="border-t border-gray-200 my-2"></div>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          setShowLogoutConfirm(true);
                        }}
                        className="w-full text-left px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 flex items-center space-x-3 transition-all duration-300"
                        style={{ fontFamily: 'var(--font-geist-sans)' }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <BellIcon />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount || 0}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowNotifications(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-20">
                    <div className="relative">
                      <div className="p-4 border-b border-gray-200">
                        <h3 className="font-bold text-gray-800 uppercase tracking-wider" style={{ fontFamily: 'var(--font-geist-sans)' }}>Notifications</h3>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-gray-500 text-sm" style={{ fontFamily: 'var(--font-geist-sans)' }}>
                            No notifications
                          </div>
                        ) : notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                              notification.unread ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`w-2 h-2 rounded-full mt-2 ${
                                notification.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                              }`} />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-800" style={{ fontFamily: 'var(--font-geist-sans)' }}>
                                  {notification.title}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {notification.time}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-3 text-center border-t border-gray-200">
                        <button className="text-sm font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider transition-colors" style={{ fontFamily: 'var(--font-geist-sans)' }}>
                          View all notifications
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden px-4 pb-3 relative z-10">
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              className="w-full px-4 py-2 text-sm bg-gray-50 text-gray-900 placeholder-gray-400 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              style={{ fontFamily: 'var(--font-geist-sans)' }}
            />
            <SearchIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="relative">
              <h3 className="text-2xl font-bold text-gray-800 mb-3" style={{ fontFamily: 'var(--font-geist-sans)' }}>
                Confirm Logout
              </h3>
              <p className="text-gray-600 mb-8 text-base">Are you sure you want to logout?</p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 hover:border-gray-400 transition-all duration-300"
                  style={{ fontFamily: 'var(--font-geist-sans)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-sm hover:shadow-md transition-all duration-300"
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

// Icon Components
function MenuIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}
