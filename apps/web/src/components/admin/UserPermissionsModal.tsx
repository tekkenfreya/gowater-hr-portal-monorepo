'use client';

import { useState, useEffect } from 'react';
import { Permission, UserPermission } from '@/types/auth';
import { logger } from '@/lib/logger';
import { X, Shield, Check } from 'lucide-react';

interface UserPermissionsModalProps {
  userId: number;
  userName: string;
  userRole: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UserPermissionsModal({
  userId,
  userName,
  userRole,
  onClose,
  onSuccess
}: UserPermissionsModalProps) {
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all available permissions
      const permissionsResponse = await fetch('/api/admin/permissions');
      const permissionsData = await permissionsResponse.json();

      if (permissionsResponse.ok) {
        setAllPermissions(permissionsData.permissions);
      }

      // Fetch user's current permissions
      const userPermsResponse = await fetch(`/api/admin/permissions?userId=${userId}`);
      const userPermsData = await userPermsResponse.json();

      if (userPermsResponse.ok) {
        setUserPermissions(userPermsData.permissions);
        const permKeys = new Set<string>(userPermsData.permissions.map((p: UserPermission) => p.permission_key));
        setSelectedPermissions(permKeys);
      }
    } catch (error) {
      logger.error('Error fetching permissions', error);
      alert('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permissionKey: string) => {
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permissionKey)) {
      newSelected.delete(permissionKey);
    } else {
      newSelected.add(permissionKey);
    }
    setSelectedPermissions(newSelected);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const response = await fetch('/api/admin/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          permissionKeys: Array.from(selectedPermissions)
        }),
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await response.json();
        alert(`Failed to update permissions: ${data.error}`);
      }
    } catch (error) {
      logger.error('Error saving permissions', error);
      alert('An error occurred while saving permissions');
    } finally {
      setSaving(false);
    }
  };

  // Group permissions by category
  const permissionsByCategory: Record<string, Permission[]> = {};
  allPermissions.forEach(permission => {
    const category = permission.category || 'Other';
    if (!permissionsByCategory[category]) {
      permissionsByCategory[category] = [];
    }
    permissionsByCategory[category].push(permission);
  });

  const isAdmin = userRole === 'admin';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#E1DFDD] px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#E6F3FF] rounded-lg">
                <Shield className="w-5 h-5 text-[#0078D4]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[#323130]">Manage Permissions</h2>
                <p className="text-sm text-[#605E5C]">{userName} ({userRole})</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-[#605E5C] hover:text-[#323130] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#0078D4]"></div>
              <p className="mt-4 text-[#605E5C] text-sm">Loading permissions...</p>
            </div>
          ) : isAdmin ? (
            <div className="py-8 text-center">
              <Shield className="w-12 h-12 text-[#0078D4] mx-auto mb-3" />
              <p className="text-[#323130] font-semibold mb-2">Admin User</p>
              <p className="text-[#605E5C] text-sm">
                Admin users automatically have all permissions.
                <br />
                Permissions cannot be modified for admin users.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                <div key={category} className="border border-[#E1DFDD] rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-[#323130] uppercase tracking-wide mb-3">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {permissions.map(permission => (
                      <label
                        key={permission.id}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#F3F2F1] cursor-pointer transition-colors"
                      >
                        <div className="flex items-center h-5">
                          <input
                            type="checkbox"
                            checked={selectedPermissions.has(permission.permission_key)}
                            onChange={() => togglePermission(permission.permission_key)}
                            className="w-4 h-4 text-[#0078D4] border-[#C8C6C4] rounded focus:ring-[#0078D4] focus:ring-2"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[#323130]">
                              {permission.display_name}
                            </span>
                            {selectedPermissions.has(permission.permission_key) && (
                              <Check className="w-4 h-4 text-[#107C10]" />
                            )}
                          </div>
                          {permission.description && (
                            <p className="text-xs text-[#605E5C] mt-0.5">
                              {permission.description}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !isAdmin && (
          <div className="sticky bottom-0 bg-[#F3F2F1] border-t border-[#E1DFDD] px-6 py-4 rounded-b-lg flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-[#C8C6C4] text-[#323130] rounded font-medium hover:bg-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-[#0078D4] text-white rounded font-semibold hover:bg-[#005A9E] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                'Save Permissions'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
