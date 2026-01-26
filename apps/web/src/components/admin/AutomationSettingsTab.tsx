'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { AttendanceAutomationSettings, AttendanceAutomationFormData } from '@/types/attendance';
import UserAutomationModal from './UserAutomationModal';

interface Employee {
  id: number;
  name: string;
  employeeId: string;
  department: string;
}

interface UserAutomationStatus {
  userId: number;
  isEnabled: boolean;
  isCustom: boolean;
}

export default function AutomationSettingsTab() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [userStatuses, setUserStatuses] = useState<Map<number, UserAutomationStatus>>(new Map());
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalUserId, setModalUserId] = useState<number | null>(null);
  const [formData, setFormData] = useState<AttendanceAutomationFormData>({
    isEnabled: false,
    autoCheckInTime: '09:00',
    autoCheckOutTime: '18:00',
    autoBreakStartTime: '12:00',
    autoBreakDuration: 60,
    defaultWorkLocation: 'WFH',
    workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  });

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchGlobalSettings(), fetchEmployees()]);
    setLoading(false);
  };

  const fetchGlobalSettings = async () => {
    try {
      const response = await fetch('/api/admin/attendance/automation', {
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success && data.settings) {
        setFormData({
          isEnabled: data.settings.isEnabled,
          autoCheckInTime: data.settings.autoCheckInTime || '09:00',
          autoCheckOutTime: data.settings.autoCheckOutTime || '18:00',
          autoBreakStartTime: data.settings.autoBreakStartTime || '12:00',
          autoBreakDuration: data.settings.autoBreakDuration || 60,
          defaultWorkLocation: data.settings.defaultWorkLocation || 'WFH',
          workDays: data.settings.workDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        });
      }
    } catch (error) {
      logger.error('Failed to fetch global settings', error);
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
        // Fetch automation status for each user
        fetchUserStatuses(data.employees.map((e: Employee) => e.id));
      }
    } catch (error) {
      logger.error('Failed to fetch employees', error);
    }
  };

  const fetchUserStatuses = async (userIds: number[]) => {
    const statusMap = new Map<number, UserAutomationStatus>();

    try {
      const promises = userIds.map(userId =>
        fetch(`/api/admin/attendance/automation?userId=${userId}&effective=true`, {
          credentials: 'include'
        }).then(res => res.json())
      );

      const results = await Promise.all(promises);

      results.forEach((data, index) => {
        if (data.success && data.settings) {
          statusMap.set(userIds[index], {
            userId: userIds[index],
            isEnabled: data.settings.isEnabled,
            isCustom: data.settings.userId !== null
          });
        }
      });

      setUserStatuses(statusMap);
    } catch (error) {
      logger.error('Failed to fetch user statuses', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/attendance/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: null, // null = global settings
          settings: formData
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('Global automation settings saved successfully!');
        fetchGlobalSettings();
      } else {
        alert(`Failed to save: ${data.error}`);
      }
    } catch (error) {
      logger.error('Failed to save settings', error);
      alert('Failed to save settings');
    }
    setSaving(false);
  };

  const handleApplyToAll = async () => {
    if (!confirm('Apply these settings to ALL users? This will override any user-specific settings.')) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/attendance/automation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}) // Empty body = apply to all
      });

      const data = await response.json();

      if (data.success) {
        alert(`Applied settings to ${data.applied} users. ${data.failed} failed.`);
        fetchData(); // Refresh data
      } else {
        alert(`Failed: ${data.error}`);
      }
    } catch (error) {
      logger.error('Failed to apply to all', error);
      alert('Failed to apply settings to all users');
    }
    setSaving(false);
  };

  const handleBulkEnable = async () => {
    if (selectedUsers.length === 0) {
      alert('Please select users first');
      return;
    }

    if (!confirm(`Enable automation for ${selectedUsers.length} user(s)?`)) return;

    setSaving(true);
    try {
      const promises = selectedUsers.map(userId =>
        fetch('/api/admin/attendance/automation', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId, enabled: true })
        })
      );

      await Promise.all(promises);
      alert(`Enabled automation for ${selectedUsers.length} user(s)`);
      setSelectedUsers([]);
      fetchData(); // Refresh
    } catch (error) {
      logger.error('Failed to enable automation', error);
      alert('Failed to enable automation');
    }
    setSaving(false);
  };

  const handleBulkDisable = async () => {
    if (selectedUsers.length === 0) {
      alert('Please select users first');
      return;
    }

    if (!confirm(`Disable automation for ${selectedUsers.length} user(s)?`)) return;

    setSaving(true);
    try {
      const promises = selectedUsers.map(userId =>
        fetch('/api/admin/attendance/automation', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId, enabled: false })
        })
      );

      await Promise.all(promises);
      alert(`Disabled automation for ${selectedUsers.length} user(s)`);
      setSelectedUsers([]);
      fetchData(); // Refresh
    } catch (error) {
      logger.error('Failed to disable automation', error);
      alert('Failed to disable automation');
    }
    setSaving(false);
  };

  const handleApplyGlobalToSelected = async () => {
    if (selectedUsers.length === 0) {
      alert('Please select users first');
      return;
    }

    if (!confirm(`Apply global settings to ${selectedUsers.length} user(s)?`)) return;

    setSaving(true);
    try {
      const promises = selectedUsers.map(userId =>
        fetch('/api/admin/attendance/automation', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId })
        })
      );

      await Promise.all(promises);
      alert(`Applied global settings to ${selectedUsers.length} user(s)`);
      setSelectedUsers([]);
      fetchData(); // Refresh
    } catch (error) {
      logger.error('Failed to apply settings', error);
      alert('Failed to apply settings');
    }
    setSaving(false);
  };

  const toggleUserSelection = (userId: number) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === employees.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(employees.map(e => e.id));
    }
  };

  const toggleWorkDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      workDays: prev.workDays.includes(day)
        ? prev.workDays.filter(d => d !== day)
        : [...prev.workDays, day]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading automation settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Attendance Automation Settings</h2>
        <p className="text-blue-100">
          Configure automated check-in, check-out, and break schedules for all employees.
          These are the default settings that apply to all users unless overridden.
        </p>
      </div>

      {/* Employee List with Bulk Operations */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Employee Automation Status</h3>
            {selectedUsers.length > 0 && (
              <span className="text-sm text-gray-600">{selectedUsers.length} selected</span>
            )}
          </div>

          {/* Bulk Actions */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={handleBulkEnable}
                disabled={saving}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                Enable Selected
              </button>
              <button
                onClick={handleBulkDisable}
                disabled={saving}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                Disable Selected
              </button>
              <button
                onClick={handleApplyGlobalToSelected}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                Apply Global to Selected
              </button>
              <button
                onClick={() => setSelectedUsers([])}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === employees.length && employees.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Settings</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {employees.map((employee) => {
                const status = userStatuses.get(employee.id);
                return (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(employee.id)}
                        onChange={() => toggleUserSelection(employee.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{employee.name}</div>
                        <div className="text-sm text-gray-600">{employee.employeeId}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{employee.department || 'N/A'}</td>
                    <td className="px-6 py-4">
                      {status && (
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            status.isEnabled
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {status.isEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {status && (
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            status.isCustom
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {status.isCustom ? 'Custom' : 'Global'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setModalUserId(employee.id)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center space-x-1"
                      >
                        <span>⚙️</span>
                        <span>Configure</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Global Settings Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Global Default Schedule</h3>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">Enable Automation</span>
            <button
              onClick={() => setFormData(prev => ({ ...prev, isEnabled: !prev.isEnabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.isEnabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.isEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Check-in Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Auto Check-In Time
            </label>
            <input
              type="time"
              value={formData.autoCheckInTime}
              onChange={(e) => setFormData(prev => ({ ...prev, autoCheckInTime: e.target.value }))}
              disabled={!formData.isEnabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Check-out Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Auto Check-Out Time
            </label>
            <input
              type="time"
              value={formData.autoCheckOutTime}
              onChange={(e) => setFormData(prev => ({ ...prev, autoCheckOutTime: e.target.value }))}
              disabled={!formData.isEnabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Break Start Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Auto Break Start Time
            </label>
            <input
              type="time"
              value={formData.autoBreakStartTime}
              onChange={(e) => setFormData(prev => ({ ...prev, autoBreakStartTime: e.target.value }))}
              disabled={!formData.isEnabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Break Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Break Duration (minutes)
            </label>
            <input
              type="number"
              value={formData.autoBreakDuration}
              onChange={(e) => setFormData(prev => ({ ...prev, autoBreakDuration: parseInt(e.target.value) }))}
              disabled={!formData.isEnabled}
              min="0"
              max="180"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Work Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Work Location
            </label>
            <select
              value={formData.defaultWorkLocation}
              onChange={(e) => setFormData(prev => ({ ...prev, defaultWorkLocation: e.target.value as 'WFH' | 'Onsite' }))}
              disabled={!formData.isEnabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="WFH">Work From Home</option>
              <option value="Onsite">Onsite</option>
            </select>
          </div>
        </div>

        {/* Work Days */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Work Days
          </label>
          <div className="flex flex-wrap gap-2">
            {weekDays.map((day) => (
              <button
                key={day}
                onClick={() => toggleWorkDay(day)}
                disabled={!formData.isEnabled}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  formData.workDays.includes(day)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {day.substring(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3 mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Global Settings'}
          </button>
          <button
            onClick={handleApplyToAll}
            disabled={saving || !formData.isEnabled}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply to All Users
          </button>
          <button
            onClick={fetchGlobalSettings}
            disabled={saving}
            className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">ℹ️ How Automation Works</h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Global settings apply to all users by default</li>
          <li>Users can have individual custom schedules that override global settings</li>
          <li>Automation runs every minute via cron job</li>
          <li>Check-in/out times are based on server timezone (Philippine Time)</li>
          <li>Break duration automatically ends after the specified minutes</li>
        </ul>
      </div>

      {/* User Automation Modal */}
      {modalUserId && (
        <UserAutomationModal
          userId={modalUserId}
          userName={employees.find(e => e.id === modalUserId)?.name || ''}
          onClose={() => setModalUserId(null)}
          onSave={() => {
            setModalUserId(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
