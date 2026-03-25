'use client';

import { useState, useEffect } from 'react';
import { formatPhilippineTime } from '@/lib/timezone';

interface AttendanceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendanceId: number;
  date: string;
  currentCheckInTime?: string;
  currentCheckOutTime?: string;
  currentBreakStartTime?: string;
  currentBreakEndTime?: string;
  isAdmin: boolean;
  onSuccess: () => void;
}

export default function AttendanceEditModal({
  isOpen,
  onClose,
  attendanceId,
  date,
  currentCheckInTime,
  currentCheckOutTime,
  currentBreakStartTime,
  currentBreakEndTime,
  isAdmin,
  onSuccess
}: AttendanceEditModalProps) {
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [breakStartTime, setBreakStartTime] = useState('');
  const [breakEndTime, setBreakEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to extract time from ISO string
  const extractTime = (isoString?: string): string => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '';
      return date.toTimeString().slice(0, 5); // HH:mm format
    } catch {
      return '';
    }
  };

  // Initialize form with current values
  useEffect(() => {
    if (isOpen) {
      setCheckInTime(extractTime(currentCheckInTime));
      setCheckOutTime(extractTime(currentCheckOutTime));
      setBreakStartTime(extractTime(currentBreakStartTime));
      setBreakEndTime(extractTime(currentBreakEndTime));
      setReason('');
      setError(null);
    }
  }, [isOpen, currentCheckInTime, currentCheckOutTime, currentBreakStartTime, currentBreakEndTime]);

  // Helper to combine date and time into ISO string
  const combineDateTime = (dateStr: string, timeStr: string): string | undefined => {
    if (!timeStr) return undefined;
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      // Append T00:00:00 if date string doesn't include time to avoid UTC parsing
      const safeDateStr = dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00';
      const dateObj = new Date(safeDateStr);
      if (isNaN(dateObj.getTime())) return undefined;
      dateObj.setHours(hours, minutes, 0, 0);
      return dateObj.toISOString();
    } catch {
      return undefined;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate that at least one time is being changed
      const hasCheckInChange = checkInTime !== extractTime(currentCheckInTime);
      const hasCheckOutChange = checkOutTime !== extractTime(currentCheckOutTime);
      const hasBreakStartChange = breakStartTime !== extractTime(currentBreakStartTime);
      const hasBreakEndChange = breakEndTime !== extractTime(currentBreakEndTime);

      if (!hasCheckInChange && !hasCheckOutChange && !hasBreakStartChange && !hasBreakEndChange) {
        setError('Please make at least one change to the times');
        setIsSubmitting(false);
        return;
      }

      // Non-admin requires a reason
      if (!isAdmin && !reason.trim()) {
        setError('Please provide a reason for the edit request');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch('/api/attendance/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceId,
          requestedCheckInTime: hasCheckInChange ? combineDateTime(date, checkInTime) : undefined,
          requestedCheckOutTime: hasCheckOutChange ? combineDateTime(date, checkOutTime) : undefined,
          requestedBreakStartTime: hasBreakStartChange ? combineDateTime(date, breakStartTime) : undefined,
          requestedBreakEndTime: hasBreakEndChange ? combineDateTime(date, breakEndTime) : undefined,
          reason: reason.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to submit edit');
        setIsSubmitting(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError('An error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Edit Attendance Time
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Date:</span> {(() => {
              try {
                const d = new Date(date + (date.includes('T') ? '' : 'T00:00:00'));
                return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
              } catch { return date; }
            })()}
          </p>
          {!isAdmin && (
            <p className="text-xs text-blue-600 mt-1">
              Your edit request will be sent for admin approval.
            </p>
          )}
          {isAdmin && (
            <p className="text-xs text-green-600 mt-1">
              As admin, your changes will be applied immediately.
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current vs New Times */}
          <div className="grid grid-cols-2 gap-4">
            {/* Check-in Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Check-in Time
              </label>
              <div className="text-xs text-gray-500 mb-1">
                Current: {currentCheckInTime ? formatPhilippineTime(currentCheckInTime) : '--'}
              </div>
              <input
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Check-out Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Check-out Time
              </label>
              <div className="text-xs text-gray-500 mb-1">
                Current: {currentCheckOutTime ? formatPhilippineTime(currentCheckOutTime) : '--'}
              </div>
              <input
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Break Start Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Break Start
              </label>
              <div className="text-xs text-gray-500 mb-1">
                Current: {currentBreakStartTime ? formatPhilippineTime(currentBreakStartTime) : '--'}
              </div>
              <input
                type="time"
                value={breakStartTime}
                onChange={(e) => setBreakStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Break End Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Break End
              </label>
              <div className="text-xs text-gray-500 mb-1">
                Current: {currentBreakEndTime ? formatPhilippineTime(currentBreakEndTime) : '--'}
              </div>
              <input
                type="time"
                value={breakEndTime}
                onChange={(e) => setBreakEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Reason (required for non-admin) */}
          {!isAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Edit <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please explain why you need to edit this attendance record..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                required
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : (isAdmin ? 'Update Now' : 'Submit Request')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
