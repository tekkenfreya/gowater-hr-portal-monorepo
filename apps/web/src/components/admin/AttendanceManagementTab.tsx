'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { AttendanceRecordWithUser, AttendanceManagementFilters } from '@/types/attendance';
import EditRequestsApprovalSection from './EditRequestsApprovalSection';

interface AttendanceStats {
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  averageHours: number;
  automatedCount: number;
}

interface Employee {
  id: number;
  name: string;
  employeeId: string;
  department: string;
}

export default function AttendanceManagementTab() {
  const [records, setRecords] = useState<AttendanceRecordWithUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<AttendanceManagementFilters>({
    page: 1,
    limit: 20
  });
  const [totalPages, setTotalPages] = useState(1);
  const [selectedRecords, setSelectedRecords] = useState<number[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.userId) params.append('userId', filters.userId.toString());
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.status) params.append('status', filters.status);
      if (filters.workLocation) params.append('workLocation', filters.workLocation);
      params.append('page', filters.page?.toString() || '1');
      params.append('limit', filters.limit?.toString() || '20');

      const response = await fetch(`/api/admin/attendance?${params}`, {
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success) {
        setRecords(data.records);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      logger.error('Failed to fetch attendance', error);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      // Stats endpoint would need to be implemented
      // For now, we'll skip this or calculate from records
    } catch (error) {
      logger.error('Failed to fetch stats', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success && data.employees) {
        setEmployees(data.employees);
      }
    } catch (error) {
      logger.error('Failed to fetch employees', error);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchAttendance();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.userId, filters.startDate, filters.endDate, filters.status, filters.workLocation, filters.page, filters.limit]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.userId) params.append('userId', filters.userId.toString());

      window.location.href = `/api/admin/attendance/export?${params}`;
    } catch (error) {
      logger.error('Failed to export', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRecords.length === 0) {
      alert('Please select records to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedRecords.length} records?`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'delete',
          attendanceIds: selectedRecords
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`Successfully deleted ${data.affected} records`);
        setSelectedRecords([]);
        fetchAttendance();
      } else {
        alert(`Failed to delete: ${data.error}`);
      }
    } catch (error) {
      logger.error('Failed to delete records', error);
      alert('Failed to delete records');
    }
  };

  const handleManualCheckIn = async () => {
    if (selectedUsers.length === 0) {
      alert('Please select users first');
      return;
    }

    if (!confirm(`Check in ${selectedUsers.length} user(s)?`)) return;

    try {
      const promises = selectedUsers.map(userId =>
        fetch('/api/attendance/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId, workLocation: 'WFH', notes: 'Manual check-in by admin' })
        })
      );

      await Promise.all(promises);
      alert(`Successfully checked in ${selectedUsers.length} user(s)`);
      setSelectedUsers([]);
      fetchAttendance();
    } catch (error) {
      logger.error('Failed to check in users', error);
      alert('Failed to check in users');
    }
  };

  const handleManualCheckOut = async () => {
    if (selectedUsers.length === 0) {
      alert('Please select users first');
      return;
    }

    if (!confirm(`Check out ${selectedUsers.length} user(s)?`)) return;

    try {
      const promises = selectedUsers.map(userId =>
        fetch('/api/attendance/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId, notes: 'Manual check-out by admin' })
        })
      );

      await Promise.all(promises);
      alert(`Successfully checked out ${selectedUsers.length} user(s)`);
      setSelectedUsers([]);
      fetchAttendance();
    } catch (error) {
      logger.error('Failed to check out users', error);
      alert('Failed to check out users');
    }
  };

  const handleStartBreak = async () => {
    if (selectedUsers.length === 0) {
      alert('Please select users first');
      return;
    }

    if (!confirm(`Start break for ${selectedUsers.length} user(s)?`)) return;

    try {
      const promises = selectedUsers.map(userId =>
        fetch('/api/attendance/break/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId })
        })
      );

      await Promise.all(promises);
      alert(`Successfully started break for ${selectedUsers.length} user(s)`);
      setSelectedUsers([]);
      fetchAttendance();
    } catch (error) {
      logger.error('Failed to start break', error);
      alert('Failed to start break');
    }
  };

  const handleEndBreak = async () => {
    if (selectedUsers.length === 0) {
      alert('Please select users first');
      return;
    }

    if (!confirm(`End break for ${selectedUsers.length} user(s)?`)) return;

    try {
      const promises = selectedUsers.map(userId =>
        fetch('/api/attendance/break/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId })
        })
      );

      await Promise.all(promises);
      alert(`Successfully ended break for ${selectedUsers.length} user(s)`);
      setSelectedUsers([]);
      fetchAttendance();
    } catch (error) {
      logger.error('Failed to end break', error);
      alert('Failed to end break');
    }
  };

  const toggleSelectRecord = (id: number) => {
    setSelectedRecords(prev =>
      prev.includes(id)
        ? prev.filter(recordId => recordId !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRecords.length === records.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(records.map(r => r.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Time Edit Requests Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <EditRequestsApprovalSection />
      </div>

      {/* Manual Attendance Controls - Full Width */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-900">Manual Attendance Controls</h3>
          <p className="text-sm text-gray-600 mt-1">Select employees and perform attendance actions</p>
        </div>

        <div className="flex gap-6">
          {/* Left: Employee selector */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-2">Select Employees</label>
            <select
              multiple
              value={selectedUsers.map(String)}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                setSelectedUsers(selected);
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[120px] bg-gray-50 transition-colors"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employeeId})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-600 mt-1">Hold Ctrl/Cmd to select multiple</p>
          </div>

          {/* Right: Action buttons (horizontal 2x2 grid) */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-2">Actions</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleManualCheckIn}
                disabled={selectedUsers.length === 0}
                className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500 flex items-center justify-center space-x-2 shadow-sm hover:shadow-md"
              >
                <CheckIcon />
                <span>In ({selectedUsers.length})</span>
              </button>
              <button
                onClick={handleManualCheckOut}
                disabled={selectedUsers.length === 0}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500 flex items-center justify-center space-x-2 shadow-sm hover:shadow-md"
              >
                <ArrowRightIcon />
                <span>Out ({selectedUsers.length})</span>
              </button>
              <button
                onClick={handleStartBreak}
                disabled={selectedUsers.length === 0}
                className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500 flex items-center justify-center space-x-2 shadow-sm hover:shadow-md"
              >
                <CoffeeIcon />
                <span>Break ({selectedUsers.length})</span>
              </button>
              <button
                onClick={handleEndBreak}
                disabled={selectedUsers.length === 0}
                className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500 flex items-center justify-center space-x-2 shadow-sm hover:shadow-md"
              >
                <RefreshIcon />
                <span>Resume ({selectedUsers.length})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar for Attendance Records */}
      {selectedRecords.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertIcon />
            </div>
            <span className="text-red-900 font-semibold text-base">
              {selectedRecords.length} record(s) selected
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSelectedRecords([])}
              className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition-all duration-200 shadow-sm"
            >
              Clear Selection
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md flex items-center space-x-2"
            >
              <TrashIcon />
              <span>Delete Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* Attendance Records with Filters Inside */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {/* Filters Section (no title, integrated) */}
        <div className="px-8 py-6 border-b border-gray-200 bg-gray-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Start Date</label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">End Date</label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value, page: 1 })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Employee</label>
              <select
                value={filters.userId || ''}
                onChange={(e) => setFilters({ ...filters, userId: e.target.value ? parseInt(e.target.value) : undefined, page: 1 })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employeeId})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as typeof filters.status, page: 1 })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">All</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Work Location</label>
              <select
                value={filters.workLocation || ''}
                onChange={(e) => setFilters({ ...filters, workLocation: e.target.value as typeof filters.workLocation, page: 1 })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">All</option>
                <option value="WFH">WFH</option>
                <option value="Onsite">Onsite</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-4 mt-4">
            <button
              onClick={() => setFilters({ page: 1, limit: 20 })}
              className="px-5 py-2.5 text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg font-medium transition-all duration-200 border border-gray-200 shadow-sm"
            >
              Clear Filters
            </button>
            <button
              onClick={handleExport}
              className="px-5 py-2.5 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 border border-blue-200 shadow-sm"
            >
              <DownloadIcon />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Table Header */}
        <div className="px-8 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Attendance Records</h2>
            <p className="text-sm text-gray-600 mt-1">Manage employee attendance and time tracking</p>
          </div>
          <span className="text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-lg font-medium">
            Page {filters.page} of {totalPages}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading attendance...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No attendance records found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-8 py-4 text-left">
                      <input
                        type="checkbox"
                        checked={selectedRecords.length === records.length && records.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-8 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="px-8 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Employee</th>
                    <th className="px-8 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Check In</th>
                    <th className="px-8 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Check Out</th>
                    <th className="px-8 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Hours</th>
                    <th className="px-8 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-8 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {records.map((record) => (
                    <tr key={record.id} className="hover:bg-blue-50/30 transition-colors duration-150">
                      <td className="px-8 py-5">
                        <input
                          type="checkbox"
                          checked={selectedRecords.includes(record.id)}
                          onChange={() => toggleSelectRecord(record.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap text-sm text-gray-900">
                        {new Date(record.date).toLocaleDateString()}
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{record.userName}</div>
                        <div className="text-sm text-gray-600">{record.userDepartment}</div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap text-sm text-gray-900">
                        {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString() : '-'}
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap text-sm text-gray-900">
                        {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString() : '-'}
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap text-sm text-gray-900">
                        {record.totalHours.toFixed(2)}h
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            record.status === 'present'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {record.status === 'present' ? 'Present' : 'Absent'}
                          </span>
                          {record.isAutomated && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700" title="Automated">
                              Auto
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap text-sm text-gray-900">
                        {record.workLocation || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-8 py-5 border-t-2 border-gray-200 bg-gray-50/50 flex items-center justify-between">
              <button
                onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
                disabled={(filters.page || 1) <= 1}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 transition-all duration-200 flex items-center space-x-2 shadow-sm"
              >
                <ChevronLeftIcon />
                <span>Previous</span>
              </button>
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700 bg-white px-4 py-2 rounded-lg border border-gray-200">
                  Page <span className="font-semibold text-blue-600">{filters.page || 1}</span> of <span className="font-semibold">{totalPages}</span>
                </span>
              </div>
              <button
                onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
                disabled={(filters.page || 1) >= totalPages}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 transition-all duration-200 flex items-center space-x-2 shadow-sm"
              >
                <span>Next</span>
                <ChevronRightIcon />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Icon Components
function DownloadIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  );
}

function CoffeeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
