'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAttendance } from '@/contexts/AttendanceContext';
import { logger } from '@/lib/logger';
import { formatPhilippineTime } from '@/lib/timezone';
import AttendanceEditModal from '@/components/AttendanceEditModal';

interface WeeklyAttendanceData {
  id?: number;
  date: string;
  day: string;
  checkInTime?: string;
  checkOutTime?: string;
  breakStartTime?: string;
  breakEndTime?: string;
  totalHours: number;
  status: 'present' | 'absent';
  isWeekend?: boolean;
  sessions?: Array<{ checkIn: string; checkOut: string }>;
}

interface TeamUser {
  id: number;
  name: string;
  email: string;
  role: string;
  position?: string;
  employeeName?: string;
}

export default function AttendancePage() {
  const { user } = useAuth();
  const { isTimedIn, workDuration, checkInTime } = useAttendance();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Attendance calendar state
  const [weeklyAttendance, setWeeklyAttendance] = useState<WeeklyAttendanceData[]>([]);
  const [activeTab, setActiveTab] = useState<'calendar' | 'summary' | 'team'>('calendar');

  // Team attendance state (admin only)
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [selectedUserIndex, setSelectedUserIndex] = useState(0);
  const [teamWeeklyAttendance, setTeamWeeklyAttendance] = useState<WeeklyAttendanceData[]>([]);
  const [isLoadingTeamAttendance, setIsLoadingTeamAttendance] = useState(false);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<WeeklyAttendanceData | null>(null);

  // Export scope modal state
  const [showExportModal, setShowExportModal] = useState(false);

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    // Initialize to current week's Sunday
    const today = new Date();
    const currentDay = today.getDay();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - currentDay);
    sunday.setHours(0, 0, 0, 0);
    return sunday;
  });

  // Check if user is admin (needed early for useEffects)
  const isAdmin = user?.role === 'admin';
  const calendarRef = useRef<HTMLDivElement>(null);

  // Get week dates based on currentWeekStart (Sunday to Saturday)
  const getWeekDates = () => {
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      weekDates.push(date);
    }
    return weekDates;
  };

  const weekDates = getWeekDates();

  // Calculate real-time summary from weeklyAttendance
  const calculateWeeklySummary = () => {
    let totalHours = 0;
    let daysPresent = 0;

    weeklyAttendance.forEach(attendance => {
      if (attendance.totalHours > 0) {
        totalHours += attendance.totalHours;
        daysPresent++;
      }
    });

    const avgHoursPerDay = daysPresent > 0 ? totalHours / daysPresent : 0;
    const expectedHours = 40; // 5 days * 8 hours
    const progress = (totalHours / expectedHours) * 100;

    return {
      totalHours: Math.round(totalHours * 10) / 10,
      daysPresent,
      avgHoursPerDay: Math.round(avgHoursPerDay * 10) / 10,
      progress: Math.min(Math.round(progress), 100),
      expectedHours
    };
  };

  const weeklySummary = calculateWeeklySummary();

  // Navigation functions
  const goToPreviousWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  };

  const goToNextWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  };

  const goToCurrentWeek = () => {
    const today = new Date();
    const currentDay = today.getDay();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - currentDay);
    sunday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(sunday);
  };

  // Fetch weekly attendance
  useEffect(() => {
    if (user) {
      fetchWeeklyAttendance();
    }
  }, [user, currentWeekStart]);

  // Update current time every second for live progress bar
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch team users when switching to team tab (admin only)
  useEffect(() => {
    if (activeTab === 'team' && isAdmin && teamUsers.length === 0) {
      fetchTeamUsers();
    }
  }, [activeTab, isAdmin]);

  // Fetch team attendance when user selection or week changes
  useEffect(() => {
    if (activeTab === 'team' && isAdmin && teamUsers.length > 0) {
      const selectedUser = teamUsers[selectedUserIndex];
      if (selectedUser) {
        fetchTeamAttendance(selectedUser.id);
      }
    }
  }, [activeTab, selectedUserIndex, teamUsers, currentWeekStart, isAdmin]);

  // Format date as YYYY-MM-DD using local time (not UTC)
  const toLocalDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const fetchWeeklyAttendance = async () => {
    try {
      const startDateStr = toLocalDateStr(currentWeekStart);
      const response = await fetch(`/api/attendance/weekly?startDate=${startDateStr}`);
      if (response.ok) {
        const data = await response.json();
        setWeeklyAttendance(data.attendance || []);
      }
    } catch (error) {
      logger.error('Failed to fetch weekly attendance', error);
    }
  };

  // Fetch team users (admin only)
  const fetchTeamUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        // Filter out current user from the list
        const otherUsers = (data.users || []).filter((u: TeamUser) => u.id !== user?.id);
        setTeamUsers(otherUsers);
      }
    } catch (error) {
      logger.error('Failed to fetch team users', error);
    }
  };

  // Fetch team member's attendance (admin only)
  const fetchTeamAttendance = async (userId: number) => {
    setIsLoadingTeamAttendance(true);
    try {
      const startDateStr = toLocalDateStr(currentWeekStart);
      const endDate = new Date(currentWeekStart);
      endDate.setDate(currentWeekStart.getDate() + 6);
      const endDateStr = toLocalDateStr(endDate);

      const response = await fetch(`/api/admin/attendance?userId=${userId}&startDate=${startDateStr}&endDate=${endDateStr}`);
      if (response.ok) {
        const data = await response.json();
        // Transform the data to match WeeklyAttendanceData format
        const attendanceRecords = data.records || [];
        const weeklyData: WeeklyAttendanceData[] = [];

        // Create entries for each day of the week
        for (let i = 0; i < 7; i++) {
          const date = new Date(currentWeekStart);
          date.setDate(currentWeekStart.getDate() + i);
          const dateStr = toLocalDateStr(date);

          const record = attendanceRecords.find((r: { date: string }) => {
            const recordDate = r.date.split('T')[0];
            return recordDate === dateStr;
          });

          if (record) {
            weeklyData.push({
              id: record.id,
              date: record.date,
              day: date.toLocaleDateString('en-US', { weekday: 'short' }),
              checkInTime: record.checkInTime,
              checkOutTime: record.checkOutTime,
              breakStartTime: record.breakStartTime,
              breakEndTime: record.breakEndTime,
              totalHours: record.totalHours || 0,
              status: record.status || 'present',
              isWeekend: date.getDay() === 0,
            });
          } else {
            weeklyData.push({
              date: dateStr,
              day: date.toLocaleDateString('en-US', { weekday: 'short' }),
              totalHours: 0,
              status: 'absent',
              isWeekend: date.getDay() === 0,
            });
          }
        }

        setTeamWeeklyAttendance(weeklyData);
      }
    } catch (error) {
      logger.error('Failed to fetch team attendance', error);
    } finally {
      setIsLoadingTeamAttendance(false);
    }
  };

  // User navigation functions
  const goToPreviousUser = () => {
    if (teamUsers.length > 0) {
      setSelectedUserIndex((prev) => (prev > 0 ? prev - 1 : teamUsers.length - 1));
    }
  };

  const goToNextUser = () => {
    if (teamUsers.length > 0) {
      setSelectedUserIndex((prev) => (prev < teamUsers.length - 1 ? prev + 1 : 0));
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Open edit modal for a specific attendance record
  const handleEditAttendance = (attendance: WeeklyAttendanceData) => {
    setEditingAttendance(attendance);
    setEditModalOpen(true);
  };

  // Handle successful edit submission
  const handleEditSuccess = () => {
    if (activeTab === 'team' && teamUsers.length > 0) {
      const selectedUser = teamUsers[selectedUserIndex];
      if (selectedUser) {
        fetchTeamAttendance(selectedUser.id);
      }
    } else {
      fetchWeeklyAttendance();
    }
    setEditModalOpen(false);
    setEditingAttendance(null);
  };

  // Create attendance record for absent day (admin only for team members)
  const handleAddTeamAttendance = async (date: string) => {
    if (!isAdmin || teamUsers.length === 0) return;

    const selectedUser = teamUsers[selectedUserIndex];
    if (!selectedUser) return;

    try {
      const response = await fetch('/api/admin/attendance/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          date: date,
          checkInTime: null,
          checkOutTime: null,
          status: 'present',
          workLocation: 'Onsite',
          notes: 'Added by admin'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // If record already exists, refresh and open edit modal
        if (data.error?.includes('already exists')) {
          await fetchTeamAttendance(selectedUser.id);
          return;
        }
        alert(data.error || 'Failed to create attendance record');
        return;
      }

      // Refresh team attendance to get the new record
      await fetchTeamAttendance(selectedUser.id);

      // Open edit modal with the newly created record
      const newAttendance: WeeklyAttendanceData = {
        id: data.attendanceId,
        date: date,
        day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        totalHours: 0,
        status: 'present',
        checkInTime: undefined,
        checkOutTime: undefined,
        breakStartTime: undefined,
        breakEndTime: undefined
      };
      setEditingAttendance(newAttendance);
      setEditModalOpen(true);
    } catch (error) {
      logger.error('Failed to add team attendance', error);
      alert('Failed to create attendance record');
    }
  };

  // Export attendance to Excel
  const handleExportExcel = () => {
    setShowExportModal(true);
  };

  const handleExportWithScope = (scope: '1week' | '2weeks' | '1month') => {
    const endDate = new Date();
    const startDate = new Date();

    if (scope === '1week') {
      startDate.setDate(endDate.getDate() - 7);
    } else if (scope === '2weeks') {
      startDate.setDate(endDate.getDate() - 14);
    } else {
      startDate.setMonth(endDate.getMonth() - 1);
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    window.location.href = `/api/attendance/export?startDate=${startDateStr}&endDate=${endDateStr}`;
    setShowExportModal(false);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Attendance Calendar View */}
      <div className="flex-1 flex flex-col">
        {/* Tabs */}
        <div
          className="relative px-6 py-2"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`pb-3 px-1 border-b-2 font-bold text-sm uppercase tracking-wider transition-all duration-300 ${
                activeTab === 'calendar'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent hover:text-cyan-400'
              }`}
              style={{
                fontFamily: 'var(--font-geist-sans)',
                ...( activeTab !== 'calendar' ? { color: 'rgba(255,255,255,0.4)' } : {} )
              }}
            >
              Attendance Calendar
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`pb-3 px-1 border-b-2 font-bold text-sm uppercase tracking-wider transition-all duration-300 ${
                activeTab === 'summary'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent hover:text-cyan-400'
              }`}
              style={{
                fontFamily: 'var(--font-geist-sans)',
                ...( activeTab !== 'summary' ? { color: 'rgba(255,255,255,0.4)' } : {} )
              }}
            >
              Attendance Summary
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('team')}
                className={`pb-3 px-1 border-b-2 font-bold text-sm uppercase tracking-wider transition-all duration-300 ${
                  activeTab === 'team'
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent hover:text-cyan-400'
                }`}
                style={{
                  fontFamily: 'var(--font-geist-sans)',
                  ...( activeTab !== 'team' ? { color: 'rgba(255,255,255,0.4)' } : {} )
                }}
              >
                Team Attendance
              </button>
            )}
          </div>
        </div>

        {/* Calendar Content */}
        <div ref={calendarRef} className="relative px-6 py-4 flex-1 overflow-y-auto flex flex-col">
          {activeTab === 'calendar' ? (
            <>
              {/* Week Navigation Header */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={goToPreviousWeek}
                    className="p-2 rounded-lg transition-colors text-cyan-400"
                    style={{ background: 'transparent' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    title="Previous week"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-bold text-white uppercase tracking-wider" style={{ fontFamily: 'var(--font-geist-sans)' }}>
                      {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  <button
                    onClick={goToNextWeek}
                    className="p-2 rounded-lg transition-colors text-cyan-400"
                    style={{ background: 'transparent' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    title="Next week"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                <button
                  onClick={goToCurrentWeek}
                  className="px-4 py-2 text-sm font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-all duration-300"
                  style={{
                    fontFamily: 'var(--font-geist-sans)',
                    boxShadow: '0 0 20px rgba(59,130,246,0.3)'
                  }}
                >
                  Today
                </button>
              </div>

              {/* General shift info */}
              <div
                className="mb-1 p-1.5 rounded-lg"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(56,189,248,0.3)'
                }}
              >
                <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-geist-sans)', color: 'rgba(255,255,255,0.7)' }}>
                  General [<span className="font-bold text-cyan-400">12:00 AM - 12:00 AM</span>]
                </p>
              </div>

              {/* Week calendar */}
              <div className="flex-1 flex flex-col gap-2 relative overflow-y-auto">
                {weekDates.map((date) => {
                  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                  const dayNumber = date.getDate();
                  const dayOfWeek = date.getDay();
                  const isSunday = dayOfWeek === 0;
                  const isToday = date.toDateString() === currentTime.toDateString();

                  // Check for saved attendance data for this day
                  const savedAttendance = weeklyAttendance.find(a => {
                    const attDate = new Date(a.date);
                    return attDate.toDateString() === date.toDateString();
                  });

                  // Live calculation based on actual check-in time (only for today while clocked in)
                  const hasLiveAttendance = !isSunday && isToday && isTimedIn && checkInTime;
                  const hasSavedAttendance = savedAttendance && (savedAttendance.checkInTime || savedAttendance.sessions);

                  // Build sessions array for display (includes past sessions + current live session)
                  const displaySessions: Array<{checkIn: Date, checkOut: Date | null, isLive: boolean}> = [];

                  if (hasSavedAttendance) {
                    // Add completed sessions from history
                    const sessions = savedAttendance.sessions || [];
                    if (Array.isArray(sessions)) {
                      sessions.forEach((session: { checkIn: string; checkOut: string }) => {
                        displaySessions.push({
                          checkIn: new Date(session.checkIn),
                          checkOut: new Date(session.checkOut),
                          isLive: false
                        });
                      });
                    }

                    // Add current session (either live or completed)
                    if (savedAttendance.checkInTime) {
                      let currentCheckOut: Date | null = null;
                      if (!hasLiveAttendance && savedAttendance.checkOutTime) {
                        currentCheckOut = new Date(savedAttendance.checkOutTime);
                      }
                      displaySessions.push({
                        checkIn: new Date(savedAttendance.checkInTime),
                        checkOut: currentCheckOut,
                        isLive: Boolean(hasLiveAttendance)
                      });
                    }
                  }

                  const hoursWorked = savedAttendance?.totalHours ?
                    formatTime(Math.floor(savedAttendance.totalHours * 3600)) :
                    (hasLiveAttendance ? formatTime(workDuration) : '00:00:00');

                  const hasAttendance = displaySessions.length > 0;

                  return (
                    <div
                      key={date.toISOString()}
                      className="flex-1 flex items-center py-3"
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                        background: isToday
                          ? 'rgba(56,189,248,0.1)'
                          : isSunday
                            ? 'rgba(255,255,255,0.03)'
                            : 'transparent',
                        ...(isToday ? { borderLeft: '2px solid rgba(56,189,248,0.5)', paddingLeft: '8px' } : {})
                      }}
                    >
                      <div className="w-12 sm:w-16 text-sm font-medium text-white">{dayName}</div>
                      <div className="w-10 sm:w-12 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{dayNumber < 10 ? `0${dayNumber}` : dayNumber}</div>
                      <div className="flex-1 px-2">
                        {isSunday ? (
                          <div className="flex items-center justify-center">
                            <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>Rest Day</span>
                          </div>
                        ) : (
                          <div
                            className="relative h-10 rounded-lg overflow-hidden"
                            style={{
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.1)'
                            }}
                          >
                            {/* Time grid lines (every 3 hours) */}
                            {[0, 12.5, 25, 37.5, 50, 62.5, 75, 87.5].map((percent) => (
                              <div
                                key={percent}
                                className="absolute top-0 bottom-0 w-px"
                                style={{ left: `${percent}%`, background: 'rgba(255,255,255,0.08)' }}
                              />
                            ))}

                            {/* Check-in time labels above bars */}
                            {hasAttendance && displaySessions.map((session, sessionIndex) => {
                              const checkInHour = session.checkIn.getHours() + session.checkIn.getMinutes() / 60;
                              const checkInPercent = (checkInHour / 24) * 100;

                              return (
                                <div
                                  key={`label-${sessionIndex}`}
                                  className="absolute -top-5 text-xs font-medium"
                                  style={{ left: `${checkInPercent}%`, color: 'rgba(255,255,255,0.6)' }}
                                >
                                  {formatPhilippineTime(session.checkIn)}
                                </div>
                              );
                            })}

                            {/* Green progress bars - Multiple sessions with gaps */}
                            {hasAttendance && displaySessions.map((session, sessionIndex) => {
                              const checkInHour = session.checkIn.getHours() + session.checkIn.getMinutes() / 60;
                              const checkInPercent = (checkInHour / 24) * 100;

                              let checkOutHour = checkInHour;
                              if (session.checkOut) {
                                checkOutHour = session.checkOut.getHours() + session.checkOut.getMinutes() / 60;
                              } else if (session.isLive) {
                                checkOutHour = currentTime.getHours() + currentTime.getMinutes() / 60;
                              }

                              const durationPercent = ((checkOutHour - checkInHour) / 24) * 100;

                              return (
                                <div key={sessionIndex}>
                                  <div
                                    className="attendance-bar absolute top-1 bottom-1 bg-gradient-to-r from-green-500 to-green-400 rounded flex items-center justify-between px-2"
                                    style={{
                                      left: `${checkInPercent}%`,
                                      width: `${durationPercent}%`,
                                      animation: 'barGrow 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                                      transformOrigin: 'left center',
                                    }}
                                  >
                                    <span className="text-xs font-medium text-white">
                                      {formatPhilippineTime(session.checkIn)}
                                    </span>
                                    {durationPercent > 5 && (
                                      <span className="text-xs font-medium text-white">
                                        {session.checkOut ?
                                          formatPhilippineTime(session.checkOut) :
                                          formatPhilippineTime(currentTime)
                                        }
                                      </span>
                                    )}
                                  </div>
                                  {/* Pulsing dot at the end of progress bar (only for live session) */}
                                  {session.isLive && (
                                    <div
                                      className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 bg-green-400 rounded-full animate-pulse"
                                      style={{
                                        left: `${checkInPercent + durationPercent}%`
                                      }}
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="w-20 sm:w-24 text-right text-sm font-medium text-white" style={{ fontFamily: 'var(--font-geist-mono, monospace)' }}>
                        {hasAttendance ? hoursWorked : '00:00:00'}
                      </div>
                      <div className="hidden sm:block w-32 text-right text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        Hrs worked
                      </div>
                    </div>
                  );
                })}

                {/* Hour tracker labels at bottom */}
                <div className="flex items-center py-1 mt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <div className="w-16"></div>
                  <div className="w-12"></div>
                  <div className="flex-1 px-2 relative">
                    <div className="flex justify-between text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {['12AM', '02AM', '04AM', '06AM', '08AM', '10AM', '01PM', '03PM', '05PM', '07PM', '09PM', '11PM'].map((time) => (
                        <span key={time} className="flex-shrink-0">
                          {time}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="w-24"></div>
                  <div className="w-32"></div>
                </div>
              </div>
            </>
          ) : activeTab === 'summary' ? (
            /* Attendance Summary View */
            <div className="space-y-6">
              {/* Week Navigation Header - Same as Calendar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={goToPreviousWeek}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'rgba(255,255,255,0.6)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    title="Previous week"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.4)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-semibold text-white">
                      {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  <button
                    onClick={goToNextWeek}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'rgba(255,255,255,0.6)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    title="Next week"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={goToCurrentWeek}
                    className="px-4 py-2 text-sm font-medium text-cyan-400 rounded-lg transition-colors"
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    Today
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors flex items-center space-x-2"
                    style={{ boxShadow: '0 0 15px rgba(34,197,94,0.3)' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Export Excel</span>
                  </button>
                </div>
              </div>

              {/* Summary Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Hours Card */}
                <div
                  className="rounded-xl p-6"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(8px)'
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-p3-cyan rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>Total Hours Worked</p>
                  <p className="text-4xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-geist-mono, monospace)' }}>{weeklySummary.totalHours}h</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>This week</p>
                </div>

                {/* Days Present Card */}
                <div
                  className="rounded-xl p-6"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(8px)'
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-p3-cyan rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>Days Present</p>
                  <p className="text-4xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-geist-mono, monospace)' }}>{weeklySummary.daysPresent}<span className="text-2xl" style={{ color: 'rgba(255,255,255,0.4)' }}>/5</span></p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Working days</p>
                </div>

                {/* Average Hours Card */}
                <div
                  className="rounded-xl p-6"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(8px)'
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-p3-cyan rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>Average Per Day</p>
                  <p className="text-4xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-geist-mono, monospace)' }}>{weeklySummary.avgHoursPerDay}h</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Daily average</p>
                </div>
              </div>

              {/* Weekly Target Progress Bar */}
              <div
                className="rounded-xl p-6"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(8px)'
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">Weekly Target Progress</h3>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{weeklySummary.totalHours}h of {weeklySummary.expectedHours}h expected</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-cyan-400" style={{ fontFamily: 'var(--font-geist-mono, monospace)' }}>{weeklySummary.progress}%</p>
                  </div>
                </div>
                <div className="w-full rounded-full h-3 overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <div
                    className="bg-gradient-to-r from-blue-600 to-cyan-500 h-3 rounded-full shadow-lg shadow-cyan-400/30"
                    style={{ width: `${weeklySummary.progress}%` }}
                  />
                </div>
              </div>

              {/* Daily Breakdown Table */}
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                <div
                  className="px-6 py-4"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  <h3 className="text-base font-semibold text-white">Daily Breakdown</h3>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Detailed attendance for the week</p>
                </div>
                <div className="overflow-x-auto -mx-6 sm:mx-0">
                  <table className="min-w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <tr>
                        <th className="px-3 sm:px-5 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Day</th>
                        <th className="px-3 sm:px-5 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Date</th>
                        <th className="px-3 sm:px-5 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Check In</th>
                        <th className="px-3 sm:px-5 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Check Out</th>
                        <th className="px-3 sm:px-5 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Total Hours</th>
                        <th className="px-3 sm:px-5 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Status</th>
                        <th className="px-3 sm:px-5 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weekDates.map((date) => {
                        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                        const dayOfWeek = date.getDay();
                        const isSunday = dayOfWeek === 0;
                        const isToday = date.toDateString() === currentTime.toDateString();

                        const savedAttendance = weeklyAttendance.find(a => {
                          const attDate = new Date(a.date);
                          return attDate.toDateString() === date.toDateString();
                        });

                        const hasAttendance = savedAttendance && (savedAttendance.checkInTime || savedAttendance.sessions);

                        return (
                          <tr
                            key={date.toISOString()}
                            style={{
                              background: isToday
                                ? 'rgba(56,189,248,0.1)'
                                : isSunday
                                  ? 'rgba(255,255,255,0.03)'
                                  : 'transparent',
                              borderBottom: '1px solid rgba(255,255,255,0.08)'
                            }}
                          >
                            <td className="px-3 sm:px-5 py-4 whitespace-nowrap text-sm font-medium text-white">
                              {dayName}
                              {isToday && <span className="ml-2 text-xs text-cyan-400 font-semibold">(Today)</span>}
                            </td>
                            <td className="px-3 sm:px-5 py-4 whitespace-nowrap text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                              {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="px-3 sm:px-5 py-4 whitespace-nowrap text-sm text-white">
                              {isSunday ? (
                                <span style={{ color: 'rgba(255,255,255,0.3)' }}>Rest Day</span>
                              ) : hasAttendance && savedAttendance.checkInTime ? (
                                formatPhilippineTime(savedAttendance.checkInTime)
                              ) : (
                                <span style={{ color: 'rgba(255,255,255,0.3)' }}>--</span>
                              )}
                            </td>
                            <td className="px-3 sm:px-5 py-4 whitespace-nowrap text-sm text-white">
                              {isSunday ? (
                                <span style={{ color: 'rgba(255,255,255,0.3)' }}>Rest Day</span>
                              ) : hasAttendance && savedAttendance.checkOutTime ? (
                                formatPhilippineTime(savedAttendance.checkOutTime)
                              ) : hasAttendance && !savedAttendance.checkOutTime && isToday ? (
                                <span className="text-green-400 font-medium">Working...</span>
                              ) : (
                                <span style={{ color: 'rgba(255,255,255,0.3)' }}>--</span>
                              )}
                            </td>
                            <td className="px-3 sm:px-5 py-4 whitespace-nowrap text-sm font-semibold text-white" style={{ fontFamily: 'var(--font-geist-mono, monospace)' }}>
                              {isSunday ? (
                                <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>--</span>
                              ) : hasAttendance ? (
                                <span>
                                  {savedAttendance.totalHours
                                    ? `${Math.round(savedAttendance.totalHours * 10) / 10}h`
                                    : (isToday && isTimedIn ? formatTime(workDuration) : '0h')
                                  }
                                </span>
                              ) : (
                                <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>0h</span>
                              )}
                            </td>
                            <td className="px-3 sm:px-5 py-4 whitespace-nowrap">
                              {isSunday ? (
                                <span
                                  className="px-2 py-1 text-xs font-medium rounded-full"
                                  style={{ background: 'rgba(234,179,8,0.2)', color: '#fbbf24' }}
                                >
                                  Rest Day
                                </span>
                              ) : hasAttendance ? (
                                <span
                                  className="px-2 py-1 text-xs font-medium rounded-full"
                                  style={{ background: 'rgba(34,197,94,0.2)', color: '#4ade80' }}
                                >
                                  Present
                                </span>
                              ) : (
                                <span
                                  className="px-2 py-1 text-xs font-medium rounded-full"
                                  style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}
                                >
                                  Absent
                                </span>
                              )}
                            </td>
                            <td className="px-3 sm:px-5 py-4 whitespace-nowrap">
                              {!isSunday && hasAttendance && savedAttendance.id && (
                                <button
                                  onClick={() => handleEditAttendance(savedAttendance)}
                                  className="p-1.5 text-cyan-400 rounded-lg transition-colors"
                                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                  title={isAdmin ? 'Edit time directly' : 'Request time edit'}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* Team Attendance View - Admin Only */
            <div className="space-y-6">
              {/* User Navigation Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={goToPreviousUser}
                    className="p-2 rounded-lg transition-colors text-cyan-400"
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    title="Previous user"
                    disabled={teamUsers.length === 0}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {teamUsers[selectedUserIndex]?.employeeName?.[0] || teamUsers[selectedUserIndex]?.name?.[0] || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-white" style={{ fontFamily: 'var(--font-geist-sans)' }}>
                        {teamUsers[selectedUserIndex]?.employeeName || teamUsers[selectedUserIndex]?.name || 'No users'}
                      </p>
                      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {teamUsers[selectedUserIndex]?.position || teamUsers[selectedUserIndex]?.role || ''}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={goToNextUser}
                    className="p-2 rounded-lg transition-colors text-cyan-400"
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    title="Next user"
                    disabled={teamUsers.length === 0}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  <span className="text-sm ml-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {teamUsers.length > 0 ? `${selectedUserIndex + 1} of ${teamUsers.length}` : '0 users'}
                  </span>
                </div>
              </div>

              {/* Week Navigation */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={goToPreviousWeek}
                    className="p-2 rounded-lg transition-colors text-cyan-400"
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    title="Previous week"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-bold text-white uppercase tracking-wider" style={{ fontFamily: 'var(--font-geist-sans)' }}>
                      {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  <button
                    onClick={goToNextWeek}
                    className="p-2 rounded-lg transition-colors text-cyan-400"
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    title="Next week"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                <button
                  onClick={goToCurrentWeek}
                  className="px-4 py-2 text-sm font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-all duration-300"
                  style={{
                    fontFamily: 'var(--font-geist-sans)',
                    boxShadow: '0 0 20px rgba(59,130,246,0.3)'
                  }}
                >
                  Today
                </button>
              </div>

              {/* Team Attendance Table */}
              {isLoadingTeamAttendance ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                </div>
              ) : teamUsers.length === 0 ? (
                <div className="text-center py-12">
                  <p style={{ color: 'rgba(255,255,255,0.4)' }}>No team members found</p>
                </div>
              ) : (
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <div
                    className="px-6 py-4"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      borderBottom: '1px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    <h3 className="text-base font-semibold text-white">Weekly Attendance</h3>
                    <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      Viewing attendance for {teamUsers[selectedUserIndex]?.employeeName || teamUsers[selectedUserIndex]?.name}
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                      <thead style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <tr>
                          <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Day</th>
                          <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Date</th>
                          <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Check In</th>
                          <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Check Out</th>
                          <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Total Hours</th>
                          <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Status</th>
                          <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamWeeklyAttendance.map((attendance) => {
                          const date = new Date(attendance.date);
                          const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                          const isSunday = date.getDay() === 0;
                          const isToday = date.toDateString() === currentTime.toDateString();
                          const hasAttendance = attendance.checkInTime;

                          return (
                            <tr
                              key={attendance.date}
                              style={{
                                background: isToday
                                  ? 'rgba(56,189,248,0.1)'
                                  : isSunday
                                    ? 'rgba(255,255,255,0.03)'
                                    : 'transparent',
                                borderBottom: '1px solid rgba(255,255,255,0.08)'
                              }}
                            >
                              <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-white">
                                {dayName}
                                {isToday && <span className="ml-2 text-xs text-cyan-400 font-semibold">(Today)</span>}
                              </td>
                              <td className="px-5 py-4 whitespace-nowrap text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                                {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </td>
                              <td className="px-5 py-4 whitespace-nowrap text-sm text-white">
                                {isSunday ? (
                                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>Rest Day</span>
                                ) : hasAttendance ? (
                                  formatPhilippineTime(attendance.checkInTime!)
                                ) : (
                                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>--</span>
                                )}
                              </td>
                              <td className="px-5 py-4 whitespace-nowrap text-sm text-white">
                                {isSunday ? (
                                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>Rest Day</span>
                                ) : hasAttendance && attendance.checkOutTime ? (
                                  formatPhilippineTime(attendance.checkOutTime)
                                ) : hasAttendance && !attendance.checkOutTime ? (
                                  <span className="text-green-400 font-medium">Working...</span>
                                ) : (
                                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>--</span>
                                )}
                              </td>
                              <td className="px-5 py-4 whitespace-nowrap text-sm font-semibold text-white" style={{ fontFamily: 'var(--font-geist-mono, monospace)' }}>
                                {isSunday ? (
                                  <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>--</span>
                                ) : hasAttendance ? (
                                  `${Math.round(attendance.totalHours * 10) / 10}h`
                                ) : (
                                  <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>0h</span>
                                )}
                              </td>
                              <td className="px-5 py-4 whitespace-nowrap">
                                {isSunday ? (
                                  <span
                                    className="px-2 py-1 text-xs font-medium rounded-full"
                                    style={{ background: 'rgba(234,179,8,0.2)', color: '#fbbf24' }}
                                  >
                                    Rest Day
                                  </span>
                                ) : hasAttendance ? (
                                  <span
                                    className="px-2 py-1 text-xs font-medium rounded-full"
                                    style={{ background: 'rgba(34,197,94,0.2)', color: '#4ade80' }}
                                  >
                                    Present
                                  </span>
                                ) : (
                                  <span
                                    className="px-2 py-1 text-xs font-medium rounded-full"
                                    style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}
                                  >
                                    Absent
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-4 whitespace-nowrap">
                                {!isSunday && (
                                  attendance.id ? (
                                    <button
                                      onClick={() => handleEditAttendance(attendance)}
                                      className="p-1.5 text-cyan-400 rounded-lg transition-colors"
                                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                      title="Edit time directly"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                      </svg>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleAddTeamAttendance(attendance.date)}
                                      className="p-1.5 text-green-400 rounded-lg transition-colors"
                                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                      title="Add attendance"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                      </svg>
                                    </button>
                                  )
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Attendance Edit Modal */}
      {editingAttendance && (
        <AttendanceEditModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditingAttendance(null);
          }}
          attendanceId={editingAttendance.id!}
          date={editingAttendance.date}
          currentCheckInTime={editingAttendance.checkInTime}
          currentCheckOutTime={editingAttendance.checkOutTime}
          currentBreakStartTime={editingAttendance.breakStartTime}
          currentBreakEndTime={editingAttendance.breakEndTime}
          isAdmin={isAdmin}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Export Scope Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Export Attendance</h3>
            <p className="text-sm text-gray-500 mb-4">Select the date range to export</p>
            <div className="space-y-3">
              <button
                onClick={() => handleExportWithScope('1week')}
                className="w-full px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 rounded-lg transition-colors"
              >
                Last 1 Week
              </button>
              <button
                onClick={() => handleExportWithScope('2weeks')}
                className="w-full px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 rounded-lg transition-colors"
              >
                Last 2 Weeks
              </button>
              <button
                onClick={() => handleExportWithScope('1month')}
                className="w-full px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 rounded-lg transition-colors"
              >
                Last 1 Month
              </button>
            </div>
            <button
              onClick={() => setShowExportModal(false)}
              className="w-full mt-3 px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
