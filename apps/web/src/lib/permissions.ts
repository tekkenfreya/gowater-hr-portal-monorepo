/**
 * Permissions Service
 *
 * Handles all permission-related operations for the granular access control system.
 * Replaces the old boss role with flexible permission-based access.
 */

import { getDb } from './supabase';
import { logger } from './logger';
import type { Permission, UserPermission } from '@/types/auth';

// ================================================================
// PERMISSION SERVICE CLASS
// ================================================================

export class PermissionsService {
  private db = getDb();

  async initialize() {
    await this.db.initialize();
  }

  // ================================================================
  // CHECK PERMISSIONS
  // ================================================================

  /**
   * Check if a user has a specific permission
   * Admins automatically have all permissions
   *
   * @param userId - User ID to check
   * @param permissionKey - Permission key (e.g., 'can_view_analytics')
   * @returns True if user has permission, false otherwise
   */
  async hasPermission(userId: number, permissionKey: string): Promise<boolean> {
    try {
      // Check if user is admin (admins have all permissions)
      const user = await this.db.get('users', { id: userId, status: 'active' });
      if (!user) {
        logger.warn('Permission check for non-existent user', { userId });
        return false;
      }

      if (user.role === 'admin') {
        return true; // Admins have all permissions
      }

      // Use database function for permission check
      const result = await this.db.executeRawSQL<{ has_permission: boolean }>(
        'SELECT user_has_permission($1, $2) as has_permission',
        [userId, permissionKey]
      );

      return result[0]?.has_permission ?? false;
    } catch (error) {
      logger.error('Error checking permission', { userId, permissionKey, error });
      return false;
    }
  }

  /**
   * Check if a user has ANY of the specified permissions
   *
   * @param userId - User ID to check
   * @param permissionKeys - Array of permission keys
   * @returns True if user has at least one permission
   */
  async hasAnyPermission(userId: number, permissionKeys: string[]): Promise<boolean> {
    for (const key of permissionKeys) {
      if (await this.hasPermission(userId, key)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a user has ALL of the specified permissions
   *
   * @param userId - User ID to check
   * @param permissionKeys - Array of permission keys
   * @returns True if user has all permissions
   */
  async hasAllPermissions(userId: number, permissionKeys: string[]): Promise<boolean> {
    for (const key of permissionKeys) {
      if (!(await this.hasPermission(userId, key))) {
        return false;
      }
    }
    return true;
  }

  // ================================================================
  // GET PERMISSIONS
  // ================================================================

  /**
   * Get all permissions for a user (with details)
   *
   * @param userId - User ID
   * @returns Array of user permissions with details
   */
  async getUserPermissions(userId: number): Promise<UserPermission[]> {
    try {
      // Use database function that handles admin check
      const permissions = await this.db.executeRawSQL<{
        permission_key: string;
        display_name: string;
        description: string | null;
        category: string | null;
      }>(
        'SELECT * FROM get_user_permissions($1)',
        [userId]
      );

      // Get user_permissions for granted_at and granted_by info
      const userPermissions = await this.db.executeRawSQL<UserPermission>(`
        SELECT
          up.id,
          up.user_id,
          up.permission_id,
          p.permission_key,
          p.display_name,
          p.category,
          up.granted_at,
          up.granted_by
        FROM user_permissions up
        JOIN permissions p ON up.permission_id = p.id
        WHERE up.user_id = $1
        ORDER BY p.category, p.display_name
      `, [userId]);

      // For admin users, create synthetic UserPermission objects
      const user = await this.db.get('users', { id: userId });
      if (user?.role === 'admin') {
        // Admins have all permissions
        return permissions.map((p, index) => ({
          id: -(index + 1), // Negative IDs for synthetic records
          user_id: userId,
          permission_id: 0,
          permission_key: p.permission_key,
          display_name: p.display_name,
          category: p.category || undefined,
          granted_at: user.created_at,
          granted_by: userId, // Self-granted for admins
        }));
      }

      return userPermissions;
    } catch (error) {
      logger.error('Error getting user permissions', { userId, error });
      return [];
    }
  }

  /**
   * Get all available permissions in the system
   *
   * @returns Array of all permissions
   */
  async getAllPermissions(): Promise<Permission[]> {
    try {
      const permissions = await this.db.all<Permission>('permissions', { is_active: true }, 'category, display_name');
      return permissions;
    } catch (error) {
      logger.error('Error getting all permissions', error);
      return [];
    }
  }

  /**
   * Get permissions by category
   *
   * @param category - Permission category
   * @returns Array of permissions in that category
   */
  async getPermissionsByCategory(category: string): Promise<Permission[]> {
    try {
      const permissions = await this.db.all<Permission>('permissions', {
        category,
        is_active: true,
      }, 'display_name');
      return permissions;
    } catch (error) {
      logger.error('Error getting permissions by category', { category, error });
      return [];
    }
  }

  // ================================================================
  // MODIFY PERMISSIONS
  // ================================================================

  /**
   * Grant a permission to a user
   *
   * @param userId - User to grant permission to
   * @param permissionKey - Permission key to grant
   * @param grantedBy - User ID who is granting the permission
   * @returns True if successful
   */
  async grantPermission(userId: number, permissionKey: string, grantedBy: number): Promise<boolean> {
    try {
      // Get permission ID
      const permission = await this.db.get<Permission>('permissions', {
        permission_key: permissionKey,
        is_active: true,
      });

      if (!permission) {
        logger.warn('Attempted to grant non-existent permission', { permissionKey });
        return false;
      }

      // Check if user already has this permission
      const existing = await this.db.get('user_permissions', {
        user_id: userId,
        permission_id: permission.id,
      });

      if (existing) {
        logger.info('User already has permission', { userId, permissionKey });
        return true; // Already has it, consider this success
      }

      // Grant the permission
      await this.db.insert('user_permissions', {
        user_id: userId,
        permission_id: permission.id,
        granted_by: grantedBy,
        granted_at: new Date(),
      });

      logger.audit('permission_granted', grantedBy, {
        target_user_id: userId,
        permission_key: permissionKey,
      });

      return true;
    } catch (error) {
      logger.error('Error granting permission', { userId, permissionKey, error });
      return false;
    }
  }

  /**
   * Revoke a permission from a user
   *
   * @param userId - User to revoke permission from
   * @param permissionKey - Permission key to revoke
   * @returns True if successful
   */
  async revokePermission(userId: number, permissionKey: string): Promise<boolean> {
    try {
      // Get permission ID
      const permission = await this.db.get<Permission>('permissions', {
        permission_key: permissionKey,
      });

      if (!permission) {
        logger.warn('Attempted to revoke non-existent permission', { permissionKey });
        return false;
      }

      // Delete the user_permission record
      await this.db.delete('user_permissions', {
        user_id: userId,
        permission_id: permission.id,
      });

      logger.audit('permission_revoked', userId, {
        permission_key: permissionKey,
      });

      return true;
    } catch (error) {
      logger.error('Error revoking permission', { userId, permissionKey, error });
      return false;
    }
  }

  /**
   * Update all permissions for a user (replaces existing permissions)
   *
   * @param userId - User ID
   * @param permissionKeys - Array of permission keys to set
   * @param grantedBy - User ID who is updating permissions
   * @returns True if successful
   */
  async updateUserPermissions(
    userId: number,
    permissionKeys: string[],
    grantedBy: number
  ): Promise<boolean> {
    try {
      // Get all permission IDs
      const permissions = await this.db.all<Permission>('permissions', {
        is_active: true,
      });

      const permissionMap = new Map(
        permissions.map(p => [p.permission_key, p.id])
      );

      const permissionIds = permissionKeys
        .map(key => permissionMap.get(key))
        .filter((id): id is number => id !== undefined);

      // Delete all existing permissions for this user
      await this.db.executeRawSQL(
        'DELETE FROM user_permissions WHERE user_id = $1',
        [userId]
      );

      // Insert new permissions
      for (const permissionId of permissionIds) {
        await this.db.insert('user_permissions', {
          user_id: userId,
          permission_id: permissionId,
          granted_by: grantedBy,
          granted_at: new Date(),
        });
      }

      logger.audit('permissions_updated', grantedBy, {
        target_user_id: userId,
        permission_count: permissionIds.length,
      });

      return true;
    } catch (error) {
      logger.error('Error updating user permissions', { userId, error });
      return false;
    }
  }

  // ================================================================
  // BULK OPERATIONS
  // ================================================================

  /**
   * Grant default permissions based on user role
   *
   * @param userId - User ID
   * @param role - User role
   * @param grantedBy - User ID who is granting permissions
   * @returns True if successful
   */
  async grantDefaultPermissions(
    userId: number,
    role: 'admin' | 'employee' | 'manager' | 'intern',
    grantedBy: number
  ): Promise<boolean> {
    try {
      const defaultPermissions: { [key: string]: string[] } = {
        admin: [], // Admins get all permissions automatically
        manager: [
          'can_manage_tasks',
          'can_manage_attendance',
          'can_approve_leaves',
          'can_view_all_leads',
        ],
        employee: [], // Employees get no default permissions
        intern: [], // Interns have same permissions as employees (none by default)
      };

      const permissions = defaultPermissions[role] || [];

      for (const permissionKey of permissions) {
        await this.grantPermission(userId, permissionKey, grantedBy);
      }

      logger.info('Granted default permissions', { userId, role, permissionCount: permissions.length });

      return true;
    } catch (error) {
      logger.error('Error granting default permissions', { userId, role, error });
      return false;
    }
  }
}

// ================================================================
// SINGLETON INSTANCE
// ================================================================

let permissionsServiceInstance: PermissionsService | null = null;

export function getPermissionsService(): PermissionsService {
  if (!permissionsServiceInstance) {
    permissionsServiceInstance = new PermissionsService();
  }
  return permissionsServiceInstance;
}
