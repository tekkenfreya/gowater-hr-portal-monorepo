'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';

interface AttendanceContextType {
  isTimedIn: boolean;
  isOnBreak: boolean;
  workDuration: number;
  breakDuration: number;
  accumulatedBreakDuration: number; // Total break time from database (in seconds)
  checkInTime: Date | null;
  breakStartTime: Date | null;
  handleTimeIn: (workLocation?: 'WFH' | 'Onsite' | 'Field') => Promise<void>;
  handleTimeOut: (tasks?: { title: string; status: string; subTasks: { title: string; completed: boolean }[] }[]) => Promise<void>;
  handleStartBreak: () => Promise<void>;
  handleEndBreak: () => Promise<void>;
  fetchTodayAttendance: () => Promise<void>;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export function AttendanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isTimedIn, setIsTimedIn] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [workDuration, setWorkDuration] = useState(0);
  const [breakDuration, setBreakDuration] = useState(0);
  const [accumulatedBreakDuration, setAccumulatedBreakDuration] = useState(0); // Total break time from DB
  const [workInterval, setWorkInterval] = useState<NodeJS.Timeout | null>(null);
  const [breakInterval, setBreakInterval] = useState<NodeJS.Timeout | null>(null);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [breakStartTime, setBreakStartTime] = useState<Date | null>(null);

  // Fetch attendance when user is available
  useEffect(() => {
    if (user) {
      fetchTodayAttendance();
    }
  }, [user]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (workInterval) clearInterval(workInterval);
      if (breakInterval) clearInterval(breakInterval);
    };
  }, [workInterval, breakInterval]);

  const fetchTodayAttendance = async () => {
    try {
      // Clear existing intervals to prevent duplicates
      if (workInterval) {
        clearInterval(workInterval);
        setWorkInterval(null);
      }
      if (breakInterval) {
        clearInterval(breakInterval);
        setBreakInterval(null);
      }

      const response = await fetch('/api/attendance');
      if (response.ok) {
        const data = await response.json();
        const attendance = data.attendance;

        if (attendance && attendance.checkInTime && !attendance.checkOutTime) {
          setIsTimedIn(true);
          const checkIn = new Date(attendance.checkInTime);
          setCheckInTime(checkIn);
          const currentTime = new Date();

          // Set accumulated break duration from database
          setAccumulatedBreakDuration(attendance.breakDuration || 0);

          // Check break state first
          if (attendance.breakStartTime && !attendance.breakEndTime) {
            // User is on break - calculate work duration excluding current break
            const breakStart = new Date(attendance.breakStartTime);
            const durationUntilBreak = Math.floor((breakStart.getTime() - checkIn.getTime()) / 1000);
            // Subtract previous breaks from work duration
            const previousBreaks = attendance.breakDuration || 0;
            setWorkDuration(Math.max(0, durationUntilBreak - previousBreaks));

            setIsOnBreak(true);
            setBreakStartTime(breakStart);
            const currentBreakDuration = Math.floor((currentTime.getTime() - breakStart.getTime()) / 1000);
            setBreakDuration(currentBreakDuration);

            // Only start break interval, NOT work interval
            const breakInt = setInterval(() => {
              setBreakDuration(prev => prev + 1);
            }, 1000);
            setBreakInterval(breakInt);
          } else {
            // Not on break - calculate work duration minus total breaks
            const totalDuration = Math.floor((currentTime.getTime() - checkIn.getTime()) / 1000);
            const totalBreaks = attendance.breakDuration || 0;
            setWorkDuration(Math.max(0, totalDuration - totalBreaks));
            setBreakDuration(0);

            // Start work interval
            const interval = setInterval(() => {
              setWorkDuration(prev => prev + 1);
            }, 1000);
            setWorkInterval(interval);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to fetch attendance', error);
    }
  };

  const handleTimeIn = async (workLocation: 'WFH' | 'Onsite' | 'Field' = 'WFH') => {
    try {
      const response = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workLocation })
      });

      if (response.ok) {
        setIsTimedIn(true);
        setCheckInTime(new Date());
        setWorkDuration(0);
        const interval = setInterval(() => {
          setWorkDuration(prev => prev + 1);
        }, 1000);
        setWorkInterval(interval);
      } else {
        const errorData = await response.json();
        logger.error('Failed to time in', errorData);
      }
    } catch (error) {
      logger.error('Failed to time in', error);
    }
  };

  const handleTimeOut = async (tasks?: { title: string; status: string; subTasks: { title: string; completed: boolean }[] }[]) => {
    try {
      const response = await fetch('/api/attendance/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: '', tasks })
      });

      if (response.ok) {
        setIsTimedIn(false);
        if (workInterval) clearInterval(workInterval);
        setWorkDuration(0);
        setCheckInTime(null);
      } else {
        const errorData = await response.json();
        logger.error('Failed to time out', errorData);
      }
    } catch (error) {
      logger.error('Failed to time out', error);
    }
  };

  const handleStartBreak = async () => {
    try {
      const response = await fetch('/api/attendance/break/start', {
        method: 'POST'
      });

      if (response.ok) {
        setIsOnBreak(true);
        setBreakStartTime(new Date());
        setBreakDuration(0);
        if (workInterval) clearInterval(workInterval);
        const breakInt = setInterval(() => {
          setBreakDuration(prev => prev + 1);
        }, 1000);
        setBreakInterval(breakInt);
      }
    } catch (error) {
      logger.error('Failed to start break', error);
    }
  };

  const handleEndBreak = async () => {
    try {
      const response = await fetch('/api/attendance/break/end', {
        method: 'POST'
      });

      if (response.ok) {
        setIsOnBreak(false);
        setBreakStartTime(null);
        setBreakDuration(0); // Reset live timer

        if (breakInterval) clearInterval(breakInterval);

        // Fetch updated attendance - this will recalculate work duration and start work interval
        await fetchTodayAttendance();
      }
    } catch (error) {
      logger.error('Failed to end break', error);
    }
  };

  const value: AttendanceContextType = {
    isTimedIn,
    isOnBreak,
    workDuration,
    breakDuration,
    accumulatedBreakDuration,
    checkInTime,
    breakStartTime,
    handleTimeIn,
    handleTimeOut,
    handleStartBreak,
    handleEndBreak,
    fetchTodayAttendance
  };

  return (
    <AttendanceContext.Provider value={value}>
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance() {
  const context = useContext(AttendanceContext);
  if (context === undefined) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
}
