import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from './supabase';
import { logger } from './logger';
import { getPermissionsService } from './permissions';
import { getWebhookService } from './webhooks';

// Enforce JWT_SECRET environment variable - no fallback for security
const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'CRITICAL: JWT_SECRET environment variable is required and must be at least 32 characters long. ' +
      'Application cannot start without it for security reasons.'
    );
  }
  return secret;
})();

const JWT_EXPIRES_IN = '365d';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  employeeId?: string;
  role: 'admin' | 'employee' | 'manager';
  position?: string;
  department?: string;
  employeeName?: string;
  avatar?: string;
  force_password_reset?: boolean;
  last_password_change?: string;
  password_expires_at?: string;
  password_expiry_days?: number;
}

export interface LoginResult {
  success: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  employeeId?: string;
  role?: 'admin' | 'employee' | 'manager';
  position?: string;
  department?: string;
  employeeName?: string;
}

export class AuthService {
  private db = getDb();

  async initialize() {
    await this.db.initialize();
    await this.createDefaultAdmin();
  }

  private async createDefaultAdmin() {
    try {
      // Check if admin already exists by role OR by email
      const existingAdmin = await this.db.get('users', { role: 'admin' });
      const existingEmail = await this.db.get('users', { email: 'admin@gowater.com' });

      if (!existingAdmin && !existingEmail) {
        // Security: Generate a secure random password instead of hardcoded default
        const crypto = await import('crypto');
        const randomPassword = crypto.randomBytes(16).toString('hex');
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        await this.db.insert('users', {
          email: 'admin@gowater.com',
          password_hash: hashedPassword,
          name: 'System Administrator',
          role: 'admin',
          department: 'IT',
          status: 'active'
        });

        // IMPORTANT: Log the password ONLY during first-time setup IN DEVELOPMENT
        // In production, admin must use password reset flow
        logger.info('Default admin account created: admin@gowater.com');
        logger.debug('\n' + '='.repeat(60));
        logger.debug('🔒 FIRST-TIME SETUP - DEFAULT ADMIN ACCOUNT CREATED');
        logger.debug('='.repeat(60));
        logger.debug('Email:    admin@gowater.com');
        logger.debug('Password:', randomPassword);
        logger.debug('='.repeat(60));
        logger.debug('⚠️  SAVE THIS PASSWORD IMMEDIATELY!');
        logger.debug('⚠️  CHANGE IT AFTER YOUR FIRST LOGIN!');
        logger.debug('⚠️  This password will NOT be shown again.');
        logger.debug('='.repeat(60) + '\n');
      }
    } catch (error: unknown) {
      // Ignore duplicate key error - admin already exists
      const pgError = error as { code?: string };
      if (pgError.code === '23505') {
        logger.debug('Default admin already exists, skipping creation');
      } else {
        logger.error('Error creating default admin', error);
      }
    }
  }

  async login(username: string, password: string): Promise<LoginResult> {
    try {
      // Try to find user by email or employee_id
      let user = await this.db.get('users', { email: username, status: 'active' });

      // If not found by email, try by employee_id
      if (!user) {
        user = await this.db.get('users', { employee_id: username, status: 'active' });
      }

      if (!user) {
        return { success: false, error: 'Invalid username or password' };
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return { success: false, error: 'Invalid username or password' };
      }

      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        employeeId: user.employee_id,
        role: user.role,
        position: user.position,
        department: user.department,
        employeeName: user.employee_name,
        avatar: user.avatar,
        force_password_reset: user.force_password_reset,
        last_password_change: user.last_password_change,
        password_expires_at: user.password_expires_at,
        password_expiry_days: user.password_expiry_days,
      };

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return { success: true, user: authUser, token };
    } catch (error) {
      logger.error('Login error', error);
      logger.security('Failed login attempt', { username });
      return { success: false, error: 'Login failed. Please try again.' };
    }
  }

  async createUser(userData: CreateUserData): Promise<{ success: boolean; error?: string; userId?: number }> {
    try {
      // Check if user already exists by email
      const existingUser = await this.db.get('users', { email: userData.email });
      if (existingUser) {
        return { success: false, error: 'User with this email already exists' };
      }

      // Check if employee_id already exists (if provided)
      if (userData.employeeId) {
        const existingEmployeeId = await this.db.get('users', { employee_id: userData.employeeId });
        if (existingEmployeeId) {
          return { success: false, error: 'User with this employee ID already exists' };
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Insert user
      const newUser = await this.db.insert('users', {
        email: userData.email,
        password_hash: hashedPassword,
        name: userData.name,
        employee_id: userData.employeeId,
        role: userData.role || 'employee',
        position: userData.position,
        department: userData.department,
        employee_name: userData.employeeName,
        status: 'active'
      });

      // Fire webhook for user created
      getWebhookService().fireEvent('user.created', {
        userId: newUser?.id,
        email: userData.email,
        name: userData.name,
        role: userData.role || 'employee',
        department: userData.department
      });

      return { success: true, userId: newUser?.id };
    } catch (error) {
      logger.error('Create user error', error);
      return { success: false, error: 'Failed to create user account' };
    }
  }

  async verifyToken(token: string): Promise<AuthUser | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      
      const user = await this.db.get('users', { id: decoded.userId, status: 'active' });

      if (!user) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        employeeId: user.employee_id,
        role: user.role,
        position: user.position,
        department: user.department,
        employeeName: user.employee_name,
        avatar: user.avatar,
        force_password_reset: user.force_password_reset,
        last_password_change: user.last_password_change,
        password_expires_at: user.password_expires_at,
        password_expiry_days: user.password_expiry_days,
      };
    } catch (error) {
      logger.error('Token verification error', error);
      return null;
    }
  }

  async getAllUsers(): Promise<AuthUser[]> {
    try {
      const users = await this.db.all('users', { status: 'active' }, 'created_at');

      return users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        employeeId: user.employee_id,
        role: user.role,
        position: user.position,
        department: user.department,
        employeeName: user.employee_name,
        avatar: user.avatar
      }));
    } catch (error) {
      logger.error('Get all users error', error);
      return [];
    }
  }

  async updateUserStatus(userId: number, status: 'active' | 'inactive'): Promise<boolean> {
    try {
      await this.db.update('users', { status, updated_at: new Date() }, { id: userId });
      return true;
    } catch (error) {
      logger.error('Update user status error', error);
      return false;
    }
  }

  async deleteUser(userId: number): Promise<boolean> {
    try {
      // Get current user data to modify email
      const user = await this.db.get('users', { id: userId });
      if (!user) {
        return false;
      }

      // Append timestamp to email to make it unique and allow reuse of original email
      const deletedEmail = `${user.email}_deleted_${Date.now()}`;

      await this.db.update('users', {
        status: 'inactive',
        email: deletedEmail,
        updated_at: new Date()
      }, { id: userId });
      return true;
    } catch (error) {
      logger.error('Delete user error', error);
      return false;
    }
  }

  async updateUserProfile(userId: number, profileData: {
    name?: string;
    department?: string;
    employeeName?: string;
    employeeId?: string;
    role?: string;
    position?: string;
    avatar?: string;
    password?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if employee_id already exists (if provided and different from current user)
      if (profileData.employeeId) {
        const existingEmployeeId = await this.db.get('users', { employee_id: profileData.employeeId });
        if (existingEmployeeId && existingEmployeeId.id !== userId) {
          return { success: false, error: 'User with this employee ID already exists' };
        }
      }

      // Validate password if provided
      if (profileData.password) {
        // Check password length
        if (profileData.password.length < 8) {
          return { success: false, error: 'Password must be at least 8 characters long' };
        }

        // Check password complexity
        const hasUpperCase = /[A-Z]/.test(profileData.password);
        const hasLowerCase = /[a-z]/.test(profileData.password);
        const hasNumbers = /\d/.test(profileData.password);

        if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
          return {
            success: false,
            error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
          };
        }

        // Check against common passwords
        const commonPasswords = ['password', '12345678', 'qwerty123', 'admin123', 'password123'];
        if (commonPasswords.includes(profileData.password.toLowerCase())) {
          return { success: false, error: 'Password is too common. Please choose a stronger password' };
        }
      }

      const updateData: Record<string, unknown> = {
        updated_at: new Date()
      };

      if (profileData.name !== undefined) updateData.name = profileData.name;
      if (profileData.department !== undefined) updateData.department = profileData.department;
      if (profileData.employeeName !== undefined) updateData.employee_name = profileData.employeeName;
      if (profileData.employeeId !== undefined) updateData.employee_id = profileData.employeeId;
      if (profileData.role !== undefined) updateData.role = profileData.role;
      if (profileData.position !== undefined) updateData.position = profileData.position;
      if (profileData.avatar !== undefined) updateData.avatar = profileData.avatar;

      // Hash password if provided
      if (profileData.password !== undefined) {
        updateData.password_hash = await bcrypt.hash(profileData.password, 10);
        updateData.last_password_change = new Date();
        updateData.force_password_reset = false;
      }

      await this.db.update('users', updateData, { id: userId });
      return { success: true };
    } catch (error) {
      logger.error('Update user profile error', error);
      return { success: false, error: 'Failed to update profile' };
    }
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current user
      const user = await this.db.get('users', { id: userId, status: 'active' });
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        return { success: false, error: 'Current password is incorrect' };
      }

      // Security: Enhanced password validation
      if (newPassword.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters long' };
      }

      // Check password complexity
      const hasUpperCase = /[A-Z]/.test(newPassword);
      const hasLowerCase = /[a-z]/.test(newPassword);
      const hasNumbers = /\d/.test(newPassword);

      if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
        return {
          success: false,
          error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        };
      }

      // Check against common passwords
      const commonPasswords = ['password', '12345678', 'qwerty123', 'admin123', 'password123'];
      if (commonPasswords.includes(newPassword.toLowerCase())) {
        return { success: false, error: 'Password is too common. Please choose a stronger password' };
      }

      // Ensure new password is different from current
      const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
      if (isSamePassword) {
        return { success: false, error: 'New password must be different from current password' };
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update password and clear force_password_reset flag
      await this.db.update('users', {
        password_hash: hashedNewPassword,
        force_password_reset: false,
        last_password_change: new Date(),
        updated_at: new Date()
      }, { id: userId });

      logger.audit('password_changed', userId);
      return { success: true };
    } catch (error) {
      // Enhanced error logging with more context
      logger.error('Change password error', {
        userId,
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        // @ts-expect-error - Supabase error may have code property
        errorCode: error?.code,
        // @ts-expect-error - Supabase error may have details property
        errorDetails: error?.details,
        // @ts-expect-error - Supabase error may have hint property
        errorHint: error?.hint,
      });
      logger.audit('password_change_failed', userId);

      // Return specific error message if available
      const errorMessage = error instanceof Error ? error.message : 'Failed to change password';
      return {
        success: false,
        error: errorMessage.includes('violates row-level security')
          ? 'Permission denied. Please contact your administrator.'
          : errorMessage
      };
    }
  }
}

// Singleton instance
let authServiceInstance: AuthService | null = null;

export function getAuthService(): AuthService {
  if (!authServiceInstance) {
    authServiceInstance = new AuthService();
  }
  return authServiceInstance;
}