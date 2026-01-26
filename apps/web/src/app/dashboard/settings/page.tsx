'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  employeeName: string;
  avatar?: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  taskReminders: boolean;
  leaveApprovals: boolean;
  timeTracking: boolean;
  reports: boolean;
}

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timeZone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
}

interface SecuritySettings {
  twoFactorAuth: boolean;
  sessionTimeout: number;
  loginAlerts: boolean;
}

interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [profile, setProfile] = useState<UserProfile>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    employeeName: ''
  });

  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    taskReminders: true,
    leaveApprovals: true,
    timeTracking: false,
    reports: true
  });

  const [appearance, setAppearance] = useState<AppearanceSettings>({
    theme: 'light',
    language: 'en',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h'
  });

  const [security, setSecurity] = useState<SecuritySettings>({
    twoFactorAuth: false,
    sessionTimeout: 30,
    loginAlerts: true
  });

  const [passwordChange, setPasswordChange] = useState<PasswordChangeData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [passwordLoading, setPasswordLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && user === null) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  // Load user data into profile
  useEffect(() => {
    if (user) {
      const nameParts = user.name?.split(' ') || ['', ''];
      setProfile({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: user.email || '',
        phone: '', // Would come from additional user data if available
        position: user.position || '',
        department: user.department || '',
        employeeName: user.employeeName || user.name || '',
        avatar: user.avatar
      });
    }
  }, [user]);

  const handleProfileSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let avatarUrl = profile.avatar;

      // Upload avatar file if there's a new one
      if (avatarFile) {
        setUploadingAvatar(true);
        const formData = new FormData();
        formData.append('file', avatarFile);

        const uploadResponse = await fetch('/api/files', {
          method: 'POST',
          body: formData
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          avatarUrl = uploadData.publicUrl || uploadData.filePath;
        } else {
          throw new Error('Failed to upload avatar');
        }
        setUploadingAvatar(false);
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${profile.firstName} ${profile.lastName}`.trim(),
          department: profile.department,
          employeeName: profile.employeeName,
          position: profile.position,
          avatar: avatarUrl
        }),
      });

      if (response.ok) {
        setSuccess('Profile updated successfully!');
        setAvatarFile(null); // Clear the file after successful upload
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update profile. Please try again.');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
      setUploadingAvatar(false);
    }
  };

  const handleNotificationsSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // In a real app, this would call an API to update notification settings
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess('Notification settings updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to update notification settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppearanceSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // In a real app, this would call an API to update appearance settings
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess('Appearance settings updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to update appearance settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSecuritySave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // In a real app, this would call an API to update security settings
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess('Security settings updated successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to update security settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordChange.currentPassword || !passwordChange.newPassword || !passwordChange.confirmPassword) {
      setError('All password fields are required');
      return;
    }

    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordChange.newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }

    setPasswordLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(passwordChange),
      });

      const data = await response.json();

      if (!data.success) {
        // Show specific error message from the API
        const errorMessage = data.error || 'Failed to change password';
        console.error('Password change failed:', {
          error: errorMessage,
          response: data,
          statusCode: response.status
        });
        setError(errorMessage);
        return;
      }

      setSuccess('Password changed successfully!');
      setPasswordChange({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      // Enhanced error logging for debugging
      console.error('Password change request failed:', error);
      setError(`Failed to change password: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setPasswordLoading(false);
    }
  };

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <UserIcon /> },
    { id: 'notifications', label: 'Notifications', icon: <BellIcon /> },
    { id: 'appearance', label: 'Appearance', icon: <PaletteIcon /> },
    { id: 'security', label: 'Security', icon: <LockIcon /> }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
          {/* Header Section */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-800">Manage your account settings and preferences</p>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded text-sm">
              {success}
            </div>
          )}

          <div className="rounded-xl border border-gray-200 overflow-hidden">
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-800 hover:text-gray-900 hover:border-gray-300'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>

                  {/* Profile Photo Upload */}
                  <div className="flex items-center space-x-6 pb-6 border-b border-gray-200">
                    <div className="relative">
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                        {profile.avatar ? (
                          <img src={profile.avatar} alt="Profile" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="text-white font-bold text-3xl">
                            {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'U'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-2">Profile Photo</h3>
                      <div className="flex space-x-3">
                        <label className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50 transition-colors">
                          Upload Photo
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                // Validate file size (max 2MB)
                                if (file.size > 2 * 1024 * 1024) {
                                  setError('File size must be less than 2MB');
                                  return;
                                }

                                // Store the file for upload
                                setAvatarFile(file);

                                // Show preview
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setProfile({...profile, avatar: reader.result as string});
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                        {profile.avatar && (
                          <button
                            onClick={() => {
                              setProfile({...profile, avatar: undefined});
                              setAvatarFile(null);
                            }}
                            className="bg-white border border-gray-300 text-red-600 px-4 py-2 rounded text-sm font-medium hover:bg-red-50 transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">JPG, PNG or GIF. Max size 2MB.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">First Name</label>
                      <input
                        type="text"
                        value={profile.firstName}
                        onChange={(e) => setProfile({...profile, firstName: e.target.value})}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={profile.lastName}
                        onChange={(e) => setProfile({...profile, lastName: e.target.value})}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">Email</label>
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({...profile, email: e.target.value})}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => setProfile({...profile, phone: e.target.value})}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">Position</label>
                      <input
                        type="text"
                        value={profile.position}
                        onChange={(e) => setProfile({...profile, position: e.target.value})}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">Department</label>
                      <input
                        type="text"
                        value={profile.department}
                        onChange={(e) => setProfile({...profile, department: e.target.value})}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-800 mb-1">Employee Display Name (for reports)</label>
                      <input
                        type="text"
                        value={profile.employeeName}
                        onChange={(e) => setProfile({...profile, employeeName: e.target.value})}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
                        placeholder="Name shown in WhatsApp reports"
                      />
                      <p className="text-sm text-gray-800 mt-1">This name will appear in your start and EOD reports sent to WhatsApp</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleProfileSave}
                      disabled={loading || uploadingAvatar}
                      className="bg-p3-cyan hover:bg-p3-cyan-dark text-p3-navy-darkest px-4 py-2 rounded-lg font-bold disabled:opacity-50 shadow-md hover:shadow-lg transition-all"
                    >
                      {uploadingAvatar ? 'Uploading photo...' : loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
                  <div className="space-y-4">
                    {Object.entries(notifications).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </h3>
                          <p className="text-sm text-gray-800">
                            Receive notifications for {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => setNotifications({...notifications, [key]: e.target.checked})}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleNotificationsSave}
                      disabled={loading}
                      className="bg-p3-cyan hover:bg-p3-cyan-dark text-p3-navy-darkest px-4 py-2 rounded-lg font-bold disabled:opacity-50 shadow-md hover:shadow-lg transition-all"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900">Appearance Settings</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">Theme</label>
                      <select
                        value={appearance.theme}
                        onChange={(e) => setAppearance({...appearance, theme: e.target.value as 'light' | 'dark' | 'system'})}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
                      >
                        <option value="light" style={{ color: '#000000' }}>Light</option>
                        <option value="dark" style={{ color: '#000000' }}>Dark</option>
                        <option value="system" style={{ color: '#000000' }}>System</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">Language</label>
                      <select
                        value={appearance.language}
                        onChange={(e) => setAppearance({...appearance, language: e.target.value})}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
                      >
                        <option value="en" style={{ color: '#000000' }}>English</option>
                        <option value="es" style={{ color: '#000000' }}>Spanish</option>
                        <option value="fr" style={{ color: '#000000' }}>French</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">Time Zone</label>
                      <input
                        type="text"
                        value={appearance.timeZone}
                        onChange={(e) => setAppearance({...appearance, timeZone: e.target.value})}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">Date Format</label>
                      <select
                        value={appearance.dateFormat}
                        onChange={(e) => setAppearance({...appearance, dateFormat: e.target.value})}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
                      >
                        <option value="MM/DD/YYYY" style={{ color: '#000000' }}>MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY" style={{ color: '#000000' }}>DD/MM/YYYY</option>
                        <option value="YYYY-MM-DD" style={{ color: '#000000' }}>YYYY-MM-DD</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">Time Format</label>
                      <select
                        value={appearance.timeFormat}
                        onChange={(e) => setAppearance({...appearance, timeFormat: e.target.value as '12h' | '24h'})}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
                      >
                        <option value="12h" style={{ color: '#000000' }}>12 Hour</option>
                        <option value="24h" style={{ color: '#000000' }}>24 Hour</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleAppearanceSave}
                      disabled={loading}
                      className="bg-p3-cyan hover:bg-p3-cyan-dark text-p3-navy-darkest px-4 py-2 rounded-lg font-bold disabled:opacity-50 shadow-md hover:shadow-lg transition-all"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-6">Change Password</h2>
                    <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-800 mb-1">Current Password</label>
                        <div className="relative">
                          <input
                            type={showCurrentPassword ? "text" : "password"}
                            value={passwordChange.currentPassword}
                            onChange={(e) => setPasswordChange({...passwordChange, currentPassword: e.target.value})}
                            className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
                            placeholder="Enter your current password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                            tabIndex={-1}
                          >
                            {showCurrentPassword ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-800 mb-1">New Password</label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            value={passwordChange.newPassword}
                            onChange={(e) => setPasswordChange({...passwordChange, newPassword: e.target.value})}
                            className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
                            placeholder="Enter your new password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                            tabIndex={-1}
                          >
                            {showNewPassword ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-gray-800 mt-1">Password must be at least 8 characters with uppercase, lowercase, and numbers</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-800 mb-1">Confirm New Password</label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={passwordChange.confirmPassword}
                            onChange={(e) => setPasswordChange({...passwordChange, confirmPassword: e.target.value})}
                            className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
                            placeholder="Confirm your new password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                            tabIndex={-1}
                          >
                            {showConfirmPassword ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={handlePasswordChange}
                          disabled={passwordLoading}
                          className="bg-p3-cyan hover:bg-p3-cyan-dark disabled:bg-cyan-300 text-p3-navy-darkest px-4 py-2 rounded-lg font-bold shadow-md hover:shadow-lg transition-all duration-200 flex items-center space-x-2"
                        >
                          {passwordLoading && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-p3-navy-darkest"></div>
                          )}
                          <span>{passwordLoading ? 'Changing Password...' : 'Change Password'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h2>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h3>
                          <p className="text-sm text-gray-800">Add an extra layer of security to your account</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={security.twoFactorAuth}
                            onChange={(e) => setSecurity({...security, twoFactorAuth: e.target.checked})}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-800 mb-1">Session Timeout (minutes)</label>
                        <input
                          type="number"
                          value={security.sessionTimeout}
                          onChange={(e) => setSecurity({...security, sessionTimeout: parseInt(e.target.value)})}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-p3-cyan focus:border-p3-cyan text-gray-900 bg-white transition-all duration-200"
                          min="5"
                          max="120"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Login Alerts</h3>
                          <p className="text-sm text-gray-800">Get notified when someone logs into your account</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={security.loginAlerts}
                            onChange={(e) => setSecurity({...security, loginAlerts: e.target.checked})}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={handleSecuritySave}
                          disabled={loading}
                          className="bg-p3-cyan hover:bg-p3-cyan-dark text-p3-navy-darkest px-4 py-2 rounded-lg font-bold disabled:opacity-50 shadow-md hover:shadow-lg transition-all"
                        >
                          {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
    </div>
  );
}

// Icon Components
function UserIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.868 19.462A17.976 17.976 0 0112 16c2.739 0 5.3.748 7.505 2.053L12 22l-7.132-2.538z" />
    </svg>
  );
}

function PaletteIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 0 00-8 0v4h8z" />
    </svg>
  );
}
