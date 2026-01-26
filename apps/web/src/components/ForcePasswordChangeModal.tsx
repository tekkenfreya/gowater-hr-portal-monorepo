'use client';

import { useState } from 'react';
import { AlertTriangle, Lock, Eye, EyeOff } from 'lucide-react';

interface ForcePasswordChangeModalProps {
  onPasswordChanged: () => void;
}

export default function ForcePasswordChangeModal({ onPasswordChanged }: ForcePasswordChangeModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to change password');
        setLoading(false);
        return;
      }

      // Success - notify parent component
      onPasswordChanged();
    } catch (err) {
      setError('Failed to change password. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Warning Banner */}
        <div className="bg-gradient-to-r from-[#F59B00] to-[#FFA500] p-4 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="text-[#F59B00]" size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Password Change Required</h2>
              <p className="text-sm text-white/90">You must change your password to continue</p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6">
          <div className="mb-6 p-4 bg-[#FFF4E5] border border-[#F59B00] rounded-lg">
            <div className="flex items-start gap-2">
              <Lock className="text-[#F59B00] flex-shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-[#323130]">
                For security reasons, all users must update their passwords.
                Please choose a strong password that you haven&apos;t used before.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-[#323130] mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130] bg-white"
                  placeholder="Enter your current password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#605E5C] hover:text-[#323130] transition-colors"
                  tabIndex={-1}
                >
                  {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-[#323130] mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130] bg-white"
                  placeholder="Enter your new password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#605E5C] hover:text-[#323130] transition-colors"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-[#605E5C] mt-1">
                Minimum 8 characters with uppercase, lowercase, and numbers
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-[#323130] mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0078D4] focus:border-transparent text-[#323130] bg-white"
                  placeholder="Confirm your new password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#605E5C] hover:text-[#323130] transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0078D4] hover:bg-[#106EBE] disabled:bg-[#C8C6C4] text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              <span>{loading ? 'Changing Password...' : 'Change Password & Continue'}</span>
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-[#605E5C] text-center">
              This is a mandatory security update. You cannot access the application without changing your password.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
