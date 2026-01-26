import { getDb } from './supabase';
import { getAttendanceService } from './attendance';
import { logger } from './logger';
import {
  AttendanceAutomationSettings,
  AttendanceAutomationFormData,
  AutomationExecutionResult
} from '@/types/attendance';

export class AttendanceAutomationService {
  private db = getDb();

  /**
   * Get automation settings for a specific user or global settings
   */
  async getAutomationSettings(userId?: number): Promise<AttendanceAutomationSettings | null> {
    try {
      const query = userId
        ? { user_id: userId }
        : { user_id: null };

      const settings = await this.db.get('attendance_automation_settings', query);

      if (!settings) {
        // If no settings found for user, return global settings
        if (userId) {
          return this.getAutomationSettings(); // Recursive call for global settings
        }
        return null;
      }

      return this.mapDbToSettings(settings);
    } catch (error) {
      logger.error('Get automation settings error', error);
      return null;
    }
  }

  /**
   * Get effective settings for a user (user-specific or falls back to global)
   */
  async getEffectiveSettings(userId: number): Promise<AttendanceAutomationSettings | null> {
    try {
      // Try to get user-specific settings first
      const userSettings = await this.db.get('attendance_automation_settings', { user_id: userId });

      if (userSettings) {
        return this.mapDbToSettings(userSettings);
      }

      // Fall back to global settings
      const globalSettings = await this.db.get('attendance_automation_settings', { user_id: null });

      if (globalSettings) {
        return this.mapDbToSettings(globalSettings);
      }

      return null;
    } catch (error) {
      logger.error('Get effective settings error', error);
      return null;
    }
  }

  /**
   * Update automation settings for a user or global
   */
  async updateAutomationSettings(
    userId: number | null,
    settings: AttendanceAutomationFormData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const existing = await this.db.get('attendance_automation_settings', { user_id: userId });

      const data = {
        is_enabled: settings.isEnabled,
        auto_check_in_time: settings.autoCheckInTime || null,
        auto_check_out_time: settings.autoCheckOutTime || null,
        auto_break_start_time: settings.autoBreakStartTime || null,
        auto_break_duration: settings.autoBreakDuration,
        default_work_location: settings.defaultWorkLocation,
        work_days: JSON.stringify(settings.workDays),
        updated_at: new Date()
      };

      if (existing) {
        // Update existing settings
        await this.db.update('attendance_automation_settings', data, { id: existing.id });
      } else {
        // Create new settings
        await this.db.insert('attendance_automation_settings', {
          user_id: userId,
          ...data,
          created_at: new Date()
        });
      }

      return { success: true };
    } catch (error) {
      logger.error('Update automation settings error', error);
      return { success: false, error: 'Failed to update automation settings' };
    }
  }

  /**
   * Enable or disable automation for a user
   */
  async enableAutomation(userId: number | null, enabled: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      const existing = await this.db.get('attendance_automation_settings', { user_id: userId });

      if (!existing) {
        return { success: false, error: 'No automation settings found' };
      }

      await this.db.update('attendance_automation_settings', {
        is_enabled: enabled,
        updated_at: new Date()
      }, { id: existing.id });

      return { success: true };
    } catch (error) {
      logger.error('Enable automation error', error);
      return { success: false, error: 'Failed to update automation status' };
    }
  }

  /**
   * Delete automation settings for a user (keeps global settings)
   */
  async deleteAutomationSettings(userId: number): Promise<{ success: boolean; error?: string }> {
    try {
      if (!userId) {
        return { success: false, error: 'Cannot delete global settings' };
      }

      await this.db.delete('attendance_automation_settings', { user_id: userId });
      return { success: true };
    } catch (error) {
      logger.error('Delete automation settings error', error);
      return { success: false, error: 'Failed to delete automation settings' };
    }
  }

  /**
   * Get all users with automation enabled
   */
  async getEnabledAutomations(): Promise<AttendanceAutomationSettings[]> {
    try {
      const results = await this.db.all('attendance_automation_settings', {
        is_enabled: true,
        // Exclude global settings for this query
      });

      return results
        .filter((r: { user_id: number | null }) => r.user_id !== null)
        .map((r: unknown) => this.mapDbToSettings(r));
    } catch (error) {
      logger.error('Get enabled automations error', error);
      return [];
    }
  }

  /**
   * Process automated attendance - called by cron job
   * Checks current time and executes matching automations
   */
  async processAutomatedAttendance(currentTime: Date): Promise<AutomationExecutionResult[]> {
    const results: AutomationExecutionResult[] = [];
    const attendanceService = getAttendanceService();

    try {
      // Get all enabled automation settings
      const automations = await this.getEnabledAutomations();

      // Get current time components in Philippine timezone
      const currentHour = currentTime.getHours();
      const currentMinute = currentTime.getMinutes();
      const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

      // Get current day name
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDay = dayNames[currentTime.getDay()];

      for (const automation of automations) {
        // Check if today is a work day
        if (!automation.workDays.includes(currentDay)) {
          continue;
        }

        // Check in automation
        if (automation.autoCheckInTime && this.isTimeMatch(currentTimeStr, automation.autoCheckInTime)) {
          const result = await attendanceService.checkIn(
            automation.userId!,
            'Automated check-in',
            automation.defaultWorkLocation
          );

          results.push({
            success: result.success,
            userId: automation.userId!,
            action: 'check-in',
            timestamp: currentTime,
            error: result.error
          });
        }

        // Check out automation
        if (automation.autoCheckOutTime && this.isTimeMatch(currentTimeStr, automation.autoCheckOutTime)) {
          const result = await attendanceService.checkOut(
            automation.userId!,
            'Automated check-out'
          );

          results.push({
            success: result.success,
            userId: automation.userId!,
            action: 'check-out',
            timestamp: currentTime,
            error: result.error
          });
        }

        // Break start automation
        if (automation.autoBreakStartTime && this.isTimeMatch(currentTimeStr, automation.autoBreakStartTime)) {
          const result = await attendanceService.startBreak(automation.userId!);

          results.push({
            success: result.success,
            userId: automation.userId!,
            action: 'break-start',
            timestamp: currentTime,
            error: result.error
          });

          // Schedule break end (if break duration is set)
          // Note: This would need a more sophisticated scheduling mechanism
          // For now, we rely on the cron running again at the end time
        }
      }

      logger.info(`Processed ${results.length} automation actions`, { results });
      return results;
    } catch (error) {
      logger.error('Process automated attendance error', error);
      return results;
    }
  }

  /**
   * Apply global settings to a specific user
   */
  async applyGlobalSettingsToUser(userId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const globalSettings = await this.getAutomationSettings(); // Gets global settings (userId = null)

      if (!globalSettings) {
        return { success: false, error: 'No global settings found' };
      }

      const formData: AttendanceAutomationFormData = {
        isEnabled: globalSettings.isEnabled,
        autoCheckInTime: globalSettings.autoCheckInTime || '',
        autoCheckOutTime: globalSettings.autoCheckOutTime || '',
        autoBreakStartTime: globalSettings.autoBreakStartTime || '',
        autoBreakDuration: globalSettings.autoBreakDuration,
        defaultWorkLocation: globalSettings.defaultWorkLocation,
        workDays: globalSettings.workDays
      };

      return await this.updateAutomationSettings(userId, formData);
    } catch (error) {
      logger.error('Apply global settings to user error', error);
      return { success: false, error: 'Failed to apply global settings' };
    }
  }

  /**
   * Apply global settings to all users (bulk operation)
   */
  async applyGlobalSettingsToAllUsers(): Promise<{ success: boolean; applied: number; failed: number; error?: string }> {
    try {
      const globalSettings = await this.getAutomationSettings();

      if (!globalSettings) {
        return { success: false, applied: 0, failed: 0, error: 'No global settings found' };
      }

      // Get all users
      const users = await this.db.all('users', { status: 'active' });

      let applied = 0;
      let failed = 0;

      for (const user of users) {
        const result = await this.applyGlobalSettingsToUser(user.id);
        if (result.success) {
          applied++;
        } else {
          failed++;
        }
      }

      return { success: true, applied, failed };
    } catch (error) {
      logger.error('Apply global settings to all users error', error);
      return { success: false, applied: 0, failed: 0, error: 'Failed to apply global settings' };
    }
  }

  /**
   * Helper: Map database record to AttendanceAutomationSettings
   */
  private mapDbToSettings(dbRecord: unknown): AttendanceAutomationSettings {
    const record = dbRecord as {
      id: number;
      user_id: number | null;
      is_enabled: boolean;
      auto_check_in_time: string | null;
      auto_check_out_time: string | null;
      auto_break_start_time: string | null;
      auto_break_duration: number;
      default_work_location: 'WFH' | 'Onsite';
      work_days: string | string[];
      created_at: Date;
      updated_at: Date;
    };

    // Parse work_days if it's a JSON string
    let workDays: string[];
    if (typeof record.work_days === 'string') {
      try {
        workDays = JSON.parse(record.work_days);
      } catch {
        workDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      }
    } else {
      workDays = record.work_days as string[];
    }

    return {
      id: record.id,
      userId: record.user_id,
      isEnabled: record.is_enabled,
      autoCheckInTime: record.auto_check_in_time,
      autoCheckOutTime: record.auto_check_out_time,
      autoBreakStartTime: record.auto_break_start_time,
      autoBreakDuration: record.auto_break_duration,
      defaultWorkLocation: record.default_work_location,
      workDays,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at)
    };
  }

  /**
   * Helper: Check if two times match (within 1 minute tolerance)
   */
  private isTimeMatch(time1: string, time2: string): boolean {
    // Both times should be in HH:mm format
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);

    const minutes1 = h1 * 60 + m1;
    const minutes2 = h2 * 60 + m2;

    // Allow 1 minute tolerance
    return Math.abs(minutes1 - minutes2) <= 1;
  }
}

// Singleton instance
let attendanceAutomationServiceInstance: AttendanceAutomationService | null = null;

export function getAttendanceAutomationService(): AttendanceAutomationService {
  if (!attendanceAutomationServiceInstance) {
    attendanceAutomationServiceInstance = new AttendanceAutomationService();
  }
  return attendanceAutomationServiceInstance;
}
