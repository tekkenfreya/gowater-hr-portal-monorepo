'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { AttendanceAutomationSettings, AttendanceAutomationFormData } from '@/types/attendance';

interface UserAutomationModalProps {
  userId: number;
  userName: string;
  onClose: () => void;
  onSave: () => void;
}

export default function UserAutomationModal({ userId, userName, onClose, onSave }: UserAutomationModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [useGlobal, setUseGlobal] = useState(true);
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
    fetchSettings();
  }, [userId]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/attendance/automation?userId=${userId}&effective=true`, {
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success && data.settings) {
        setUseGlobal(data.settings.userId === null);
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
      logger.error('Failed to fetch user settings', error);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (useGlobal) {
        // Delete user-specific settings
        const response = await fetch(`/api/admin/attendance/automation?userId=${userId}`, {
          method: 'DELETE',
          credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
          alert('User reverted to global settings');
          onSave();
          onClose();
        } else {
          alert(`Failed: ${data.error}`);
        }
      } else {
        // Save custom settings
        const response = await fetch('/api/admin/attendance/automation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            userId,
            settings: formData
          })
        });

        const data = await response.json();

        if (data.success) {
          alert('User automation settings saved!');
          onSave();
          onClose();
        } else {
          alert(`Failed: ${data.error}`);
        }
      }
    } catch (error) {
      logger.error('Failed to save settings', error);
      alert('Failed to save settings');
    }
    setSaving(false);
  };

  const toggleWorkDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      workDays: prev.workDays.includes(day)
        ? prev.workDays.filter(d => d !== day)
        : [...prev.workDays, day]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Automation Settings</h2>
              <p className="text-blue-100 mt-1">{userName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-600">Loading...</div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Settings Type Toggle */}
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  checked={useGlobal}
                  onChange={() => setUseGlobal(true)}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <span className="font-medium text-gray-900">Use Global Settings</span>
                  <p className="text-sm text-gray-500">This user will follow the default automation schedule</p>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  checked={!useGlobal}
                  onChange={() => setUseGlobal(false)}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <span className="font-medium text-gray-900">Custom Settings</span>
                  <p className="text-sm text-gray-500">Configure a unique schedule for this user</p>
                </div>
              </label>
            </div>

            {/* Custom Settings Form */}
            {!useGlobal && (
              <>
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-700">Enable Automation</span>
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Check-In Time</label>
                      <input
                        type="time"
                        value={formData.autoCheckInTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, autoCheckInTime: e.target.value }))}
                        disabled={!formData.isEnabled}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Check-Out Time</label>
                      <input
                        type="time"
                        value={formData.autoCheckOutTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, autoCheckOutTime: e.target.value }))}
                        disabled={!formData.isEnabled}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Break Start</label>
                      <input
                        type="time"
                        value={formData.autoBreakStartTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, autoBreakStartTime: e.target.value }))}
                        disabled={!formData.isEnabled}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Break Duration (min)</label>
                      <input
                        type="number"
                        value={formData.autoBreakDuration}
                        onChange={(e) => setFormData(prev => ({ ...prev, autoBreakDuration: parseInt(e.target.value) }))}
                        disabled={!formData.isEnabled}
                        min="0"
                        max="180"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Work Location</label>
                      <select
                        value={formData.defaultWorkLocation}
                        onChange={(e) => setFormData(prev => ({ ...prev, defaultWorkLocation: e.target.value as 'WFH' | 'Onsite' }))}
                        disabled={!formData.isEnabled}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      >
                        <option value="WFH">Work From Home</option>
                        <option value="Onsite">Onsite</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Work Days</label>
                    <div className="flex flex-wrap gap-2">
                      {weekDays.map((day) => (
                        <button
                          key={day}
                          onClick={() => toggleWorkDay(day)}
                          disabled={!formData.isEnabled}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
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
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
