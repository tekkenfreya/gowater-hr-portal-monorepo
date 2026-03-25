import { getDb } from './supabase';
import { logger } from './logger';
import { getPhilippineDateString } from './timezone';
import { getWebhookService } from './webhooks';
import {
  AttendanceManagementFilters,
  AttendanceRecordWithUser,
  AttendanceManagementResponse,
  BulkAttendanceOperation,
  AttendanceEditRequest,
  AttendanceEditRequestWithUser,
  CreateAttendanceEditRequestData,
  AttendanceEditRequestFilters,
  AttendanceEditRequestsResponse
} from '@/types/attendance';

export interface AttendanceRecord {
  id: number;
  userId: number;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  breakStartTime?: string;
  breakEndTime?: string;
  breakDuration: number;
  totalHours: number;
  status: 'present' | 'absent';
  workLocation?: 'WFH' | 'Onsite' | 'Field';
  notes?: string;
}

export interface AttendanceSummary {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  totalHours: number;
}

export class AttendanceService {
  private db = getDb();

  async checkIn(userId: number, notes?: string, workLocation?: 'WFH' | 'Onsite' | 'Field', photoUrl?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const today = getPhilippineDateString();

      // Check if already checked in today (without checkout)
      const existing = await this.db.get('attendance', { user_id: userId, date: today });

      if (existing && existing.check_in_time && !existing.check_out_time) {
        return { success: false, error: 'Already checked in. Please check out first.' };
      }

      const checkInTime = new Date().toISOString();
      const status = 'present';

      // IMPORTANT: Check for BOTH check_in_time AND check_out_time for completed session
      // This prevents incorrectly treating records with only check_out_time as completed sessions
      if (existing && existing.check_in_time && existing.check_out_time) {
        // Already checked out today - this is a new session
        // Add previous session to sessions array
        const sessions = existing.sessions ?
          (typeof existing.sessions === 'string' ? JSON.parse(existing.sessions) : existing.sessions) :
          [];
        sessions.push({
          checkIn: existing.check_in_time,
          checkOut: existing.check_out_time
        });

        // Reset check_in_time for new session, but keep accumulated total_hours and sessions
        const result = await this.db.update('attendance', {
          check_in_time: checkInTime,
          check_out_time: null, // Clear checkout for new session
          work_location: workLocation || 'WFH',
          notes: notes ? `${existing.notes || ''}\n${notes}` : existing.notes,
          sessions: JSON.stringify(sessions),
          photo_url: photoUrl || existing.photo_url,
          updated_at: new Date()
        }, { id: existing.id });

        // Verify update was successful
        if (!result || (Array.isArray(result) && result.length === 0)) {
          logger.error('Check-in update failed - no rows affected', { userId, attendanceId: existing.id });
          return { success: false, error: 'Failed to update attendance record' };
        }
      } else if (existing && !existing.check_in_time) {
        // Existing record with no check-in (admin pre-created record or blank record) - update it
        // This also handles invalid records that have check_out_time but no check_in_time
        logger.info('Updating existing record without check-in time', {
          userId,
          attendanceId: existing.id,
          hasCheckOut: !!existing.check_out_time
        });

        const result = await this.db.update('attendance', {
          check_in_time: checkInTime,
          check_out_time: null, // Clear any invalid check_out_time
          status,
          work_location: workLocation || existing.work_location || 'WFH',
          notes: notes ? `${existing.notes || ''}\n${notes}` : existing.notes,
          photo_url: photoUrl || existing.photo_url,
          updated_at: new Date()
        }, { id: existing.id });

        // Verify update was successful
        if (!result || (Array.isArray(result) && result.length === 0)) {
          logger.error('Check-in update failed - no rows affected', { userId, attendanceId: existing.id });
          return { success: false, error: 'Failed to update attendance record' };
        }
      } else if (!existing) {
        // First check-in of the day - no existing record
        const result = await this.db.insert('attendance', {
          user_id: userId,
          date: today,
          check_in_time: checkInTime,
          status,
          work_location: workLocation || 'WFH',
          notes,
          photo_url: photoUrl,
          total_hours: 0
        });

        // Verify insert was successful
        if (!result || !result.id) {
          logger.error('Check-in insert failed', { userId, date: today });
          return { success: false, error: 'Failed to create attendance record' };
        }
      }

      // Fire webhook event so n8n/Zapier/GHL can react to check-ins
      const webhookUser = await this.db.get('users', { id: userId });
      const userTasks = await this.db.executeRawSQL<{ title: string; status: string; sub_tasks?: string | unknown[] }>(
        `SELECT title, status, sub_tasks FROM tasks WHERE user_id = $1 AND status IN ('in_progress', 'pending') ORDER BY created_at DESC`,
        [userId]
      );
      getWebhookService().fireEvent('attendance.checked_in', {
        userId,
        employeeId: webhookUser?.employee_id || null,
        employeeName: webhookUser?.employee_name || webhookUser?.name || null,
        date: today,
        workLocation: workLocation || 'WFH',
        notes: notes || null,
        photoUrl: photoUrl || null,
        tasks: (userTasks || []).map((t) => ({
          title: t.title,
          status: t.status,
          subTasks: typeof t.sub_tasks === 'string' ? JSON.parse(t.sub_tasks) : (t.sub_tasks || [])
        }))
      });

      return { success: true };
    } catch (error) {
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        // Handle Supabase error objects
        const err = error as { message?: string; code?: string; details?: string; hint?: string };
        errorMessage = err.message || err.details || err.hint || JSON.stringify(error);
      } else {
        errorMessage = String(error);
      }
      logger.error('Check-in error', { error: errorMessage, userId, workLocation });
      return { success: false, error: `Failed to check in: ${errorMessage}` };
    }
  }

  async checkOut(userId: number, notes?: string, photoUrl?: string, tasks?: { title: string; status: string; subTasks: { title: string; completed: boolean; status?: string }[] }[]): Promise<{ success: boolean; error?: string; totalHours?: number }> {
    try {
      const today = getPhilippineDateString();

      const record = await this.db.get('attendance', { user_id: userId, date: today });

      if (!record || !record.check_in_time) {
        return { success: false, error: 'No check-in found for today' };
      }

      if (record.check_out_time) {
        return { success: false, error: 'Already checked out for this session' };
      }

      const checkOutTime = new Date().toISOString();
      const checkInTime = new Date(record.check_in_time);
      const sessionHours = (new Date(checkOutTime).getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

      // Auto-end active break if user checks out while on break
      let totalBreakDuration = record.break_duration || 0;
      if (record.break_start_time && !record.break_end_time) {
        const activeBreakSeconds = Math.floor(
          (new Date(checkOutTime).getTime() - new Date(record.break_start_time).getTime()) / 1000
        );
        totalBreakDuration += activeBreakSeconds;

        // Update break fields in the same checkout update below
        await this.db.update('attendance', {
          break_end_time: checkOutTime,
          break_duration: totalBreakDuration,
          updated_at: new Date()
        }, { id: record.id });

        // Fire break_ended webhook so Slack thread gets the break end message
        const breakWebhookUser = await this.db.get('users', { id: userId });
        getWebhookService().fireEvent('attendance.break_ended', {
          userId,
          employeeId: breakWebhookUser?.employee_id || null,
          employeeName: breakWebhookUser?.employee_name || breakWebhookUser?.name || null,
          date: today,
          breakDurationSeconds: activeBreakSeconds,
          totalBreakDuration,
          slackThreadTs: record.slack_thread_ts || null
        });

        // Re-read the record to get updated break_duration
        const updatedRecord = await this.db.get('attendance', { id: record.id });
        if (updatedRecord) {
          totalBreakDuration = updatedRecord.break_duration || totalBreakDuration;
        }
      }

      // Subtract break time from session hours
      const breakDurationHours = totalBreakDuration / 3600; // Convert seconds to hours
      const workingSessionHours = sessionHours - breakDurationHours;

      // Add current session working hours to existing total_hours (accumulate)
      const previousTotalHours = record.total_hours || 0;
      const newTotalHours = previousTotalHours + workingSessionHours;

      await this.db.update('attendance', {
        check_out_time: checkOutTime,
        total_hours: newTotalHours, // Accumulate hours (excluding break time)
        notes: notes ? `${record.notes || ''}\n${notes}` : record.notes,
        checkout_photo_url: photoUrl || record.checkout_photo_url,
        updated_at: new Date()
      }, { id: record.id });

      // Fire webhook event so workflow tools can react to check-outs
      const webhookUser = await this.db.get('users', { id: userId });

      // Use tasks passed from mobile (matches check-in tasks) or fall back to DB query
      let webhookTasks: { title: string; status: string; subTasks: { title: string; completed: boolean; status?: string }[] }[];
      if (tasks && tasks.length > 0) {
        webhookTasks = tasks;
      } else {
        const userTasks = await this.db.executeRawSQL<{ title: string; status: string; sub_tasks?: string | unknown[] }>(
          `SELECT title, status, sub_tasks FROM tasks WHERE user_id = $1 AND status IN ('in_progress', 'pending') ORDER BY created_at DESC`,
          [userId]
        );
        webhookTasks = (userTasks || []).map((t) => ({
          title: t.title,
          status: t.status,
          subTasks: typeof t.sub_tasks === 'string' ? JSON.parse(t.sub_tasks) : (t.sub_tasks || [])
        }));
      }

      getWebhookService().fireEvent('attendance.checked_out', {
        userId,
        employeeId: webhookUser?.employee_id || null,
        employeeName: webhookUser?.employee_name || webhookUser?.name || null,
        date: today,
        totalHours: newTotalHours,
        checkOutTime,
        breakDuration: totalBreakDuration,
        photoUrl: photoUrl || null,
        slackThreadTs: record.slack_thread_ts || null,
        tasks: webhookTasks
      });

      return { success: true, totalHours: newTotalHours };
    } catch (error) {
      logger.error('Check-out error', error);
      return { success: false, error: 'Failed to check out' };
    }
  }

  async getTodayAttendance(userId: number): Promise<AttendanceRecord | null> {
    try {
      const today = getPhilippineDateString();
      
      const record = await this.db.get('attendance', { user_id: userId, date: today });

      if (!record) return null;

      return {
        id: record.id,
        userId: record.user_id,
        date: record.date,
        checkInTime: record.check_in_time,
        checkOutTime: record.check_out_time,
        breakStartTime: record.break_start_time,
        breakEndTime: record.break_end_time,
        breakDuration: record.break_duration || 0,
        totalHours: record.total_hours || 0,
        status: record.status,
        workLocation: record.work_location as 'WFH' | 'Onsite' | 'Field',
        notes: record.notes
      };
    } catch (error) {
      logger.error('Get today attendance error', error);
      return null;
    }
  }

  async getWeeklyAttendance(userId: number, startDate: string): Promise<AttendanceRecord[]> {
    try {
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      
      const records = await this.db.all('attendance', {
        user_id: userId,
        date_range: [startDate, endDate.toISOString().split('T')[0]]
      }, 'date');

      return records.map(record => ({
        id: record.id,
        userId: record.user_id,
        date: record.date,
        checkInTime: record.check_in_time,
        checkOutTime: record.check_out_time,
        breakStartTime: record.break_start_time,
        breakEndTime: record.break_end_time,
        breakDuration: record.break_duration || 0,
        totalHours: record.total_hours || 0,
        status: record.status,
        workLocation: record.work_location as 'WFH' | 'Onsite' | 'Field',
        notes: record.notes
      }));
    } catch (error) {
      logger.error('Get weekly attendance error', error);
      return [];
    }
  }

  async getAttendanceSummary(userId: number, startDate: string, endDate: string): Promise<AttendanceSummary> {
    try {
      const summaryResult = await this.db.executeRawSQL(`
        SELECT
          COUNT(*) as totalDays,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as presentDays,
          SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absentDays,
          SUM(total_hours) as totalHours
        FROM attendance
        WHERE user_id = $1 AND date BETWEEN $2 AND $3
      `, [userId, startDate, endDate]);

      const summary = summaryResult[0];

      return {
        totalDays: parseInt(summary?.totaldays) || 0,
        presentDays: parseInt(summary?.presentdays) || 0,
        absentDays: parseInt(summary?.absentdays) || 0,
        totalHours: parseFloat(summary?.totalhours) || 0
      };
    } catch (error) {
      logger.error('Get attendance summary error', error);
      return {
        totalDays: 0,
        presentDays: 0,
        absentDays: 0,
        totalHours: 0
      };
    }
  }

  async deleteTodayAttendance(userId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const today = getPhilippineDateString();
      
      const existing = await this.db.get('attendance', { user_id: userId, date: today });
      
      if (!existing) {
        return { success: false, error: 'No attendance record found for today' };
      }

      await this.db.delete('attendance', { id: existing.id });
      
      return { success: true };
    } catch (error) {
      logger.error('Delete attendance error', error);
      return { success: false, error: 'Failed to delete attendance record' };
    }
  }

  async startBreak(userId: number, photoUrl?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const today = getPhilippineDateString();

      const record = await this.db.get('attendance', { user_id: userId, date: today });

      if (!record) {
        return { success: false, error: 'No attendance record found for today' };
      }

      if (!record.check_in_time) {
        return { success: false, error: 'Must check in before taking a break' };
      }

      if (record.break_start_time && !record.break_end_time) {
        return { success: false, error: 'Break already in progress' };
      }

      const breakStartTime = new Date().toISOString();

      const updateData: Record<string, unknown> = {
        break_start_time: breakStartTime,
        break_end_time: null,
        updated_at: new Date()
      };
      if (photoUrl) updateData.break_start_photo_url = photoUrl;

      await this.db.update('attendance', updateData, { id: record.id });

      // Fire webhook for break started
      const webhookUser = await this.db.get('users', { id: userId });
      getWebhookService().fireEvent('attendance.break_started', {
        userId,
        employeeId: webhookUser?.employee_id || null,
        employeeName: webhookUser?.employee_name || webhookUser?.name || null,
        date: today,
        breakStartTime,
        photoUrl: photoUrl || null,
        slackThreadTs: record.slack_thread_ts || null
      });

      return { success: true };
    } catch (error) {
      logger.error('Start break error', error);
      return { success: false, error: 'Failed to start break' };
    }
  }

  async endBreak(userId: number, photoUrl?: string): Promise<{ success: boolean; error?: string; breakDuration?: number }> {
    try {
      const today = getPhilippineDateString();

      const record = await this.db.get('attendance', { user_id: userId, date: today });

      if (!record) {
        return { success: false, error: 'No attendance record found for today' };
      }

      if (!record.break_start_time || record.break_end_time) {
        return { success: false, error: 'No active break to end' };
      }

      const breakEndTime = new Date().toISOString();
      const breakStartTime = new Date(record.break_start_time);
      const breakDurationSeconds = Math.floor((new Date(breakEndTime).getTime() - breakStartTime.getTime()) / 1000);
      const totalBreakDuration = (record.break_duration || 0) + breakDurationSeconds;

      const updateData: Record<string, unknown> = {
        break_end_time: breakEndTime,
        break_duration: totalBreakDuration,
        updated_at: new Date()
      };
      if (photoUrl) updateData.break_end_photo_url = photoUrl;

      await this.db.update('attendance', updateData, { id: record.id });

      // Fire webhook for break ended
      const webhookUser = await this.db.get('users', { id: userId });
      getWebhookService().fireEvent('attendance.break_ended', {
        userId,
        employeeId: webhookUser?.employee_id || null,
        employeeName: webhookUser?.employee_name || webhookUser?.name || null,
        date: today,
        breakDurationSeconds,
        totalBreakDuration,
        photoUrl: photoUrl || null,
        slackThreadTs: record.slack_thread_ts || null
      });

      return { success: true, breakDuration: breakDurationSeconds };
    } catch (error) {
      logger.error('End break error', error);
      return { success: false, error: 'Failed to end break' };
    }
  }

  /**
   * ADMIN METHODS
   * Methods below are for admin attendance management
   */

  /**
   * Get all users' attendance records with filters and pagination
   */
  async getAllUsersAttendance(filters: AttendanceManagementFilters = {}): Promise<AttendanceManagementResponse> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const offset = (page - 1) * limit;

      // Build WHERE clause
      const conditions: string[] = ['1=1'];
      const params: (string | number)[] = [];
      let paramIndex = 1;

      if (filters.userId) {
        conditions.push(`a.user_id = $${paramIndex++}`);
        params.push(filters.userId);
      }

      if (filters.startDate) {
        conditions.push(`a.date >= $${paramIndex++}`);
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        conditions.push(`a.date <= $${paramIndex++}`);
        params.push(filters.endDate);
      }

      if (filters.status) {
        conditions.push(`a.status = $${paramIndex++}`);
        params.push(filters.status);
      }

      if (filters.workLocation) {
        conditions.push(`a.work_location = $${paramIndex++}`);
        params.push(filters.workLocation);
      }

      const whereClause = conditions.join(' AND ');

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM attendance a
        WHERE ${whereClause}
      `;

      const countResult = await this.db.executeRawSQL(countQuery, params);
      const total = parseInt(countResult[0]?.total || '0');

      // Get paginated records with user details
      const recordsQuery = `
        SELECT
          a.id,
          a.user_id,
          u.name as user_name,
          u.email as user_email,
          u.department as user_department,
          a.date,
          a.check_in_time,
          a.check_out_time,
          a.break_start_time,
          a.break_end_time,
          a.break_duration,
          a.total_hours,
          a.status,
          a.work_location,
          a.notes,
          CASE
            WHEN a.notes LIKE '%Automated%' THEN true
            ELSE false
          END as is_automated
        FROM attendance a
        JOIN users u ON a.user_id = u.id
        WHERE ${whereClause}
        ORDER BY a.date DESC, a.check_in_time DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;

      const records = await this.db.executeRawSQL(recordsQuery, [...params, limit, offset]);

      const mappedRecords: AttendanceRecordWithUser[] = records.map((r: {
        id: number;
        user_id: number;
        user_name: string;
        user_email: string;
        user_department: string;
        date: string;
        check_in_time?: string;
        check_out_time?: string;
        break_start_time?: string;
        break_end_time?: string;
        break_duration?: number;
        total_hours: number;
        status: 'present' | 'absent';
        work_location?: 'WFH' | 'Onsite' | 'Field';
        notes?: string;
        is_automated: boolean;
      }) => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        userEmail: r.user_email,
        userDepartment: r.user_department,
        date: r.date,
        checkInTime: r.check_in_time,
        checkOutTime: r.check_out_time,
        breakStartTime: r.break_start_time,
        breakEndTime: r.break_end_time,
        breakDuration: r.break_duration || 0,
        totalHours: r.total_hours || 0,
        status: r.status,
        workLocation: r.work_location,
        notes: r.notes,
        isAutomated: r.is_automated
      }));

      return {
        records: mappedRecords,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Get all users attendance error', error);
      return {
        records: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0
      };
    }
  }

  /**
   * Bulk update or delete attendance records (admin only)
   */
  async bulkUpdateAttendance(operation: BulkAttendanceOperation): Promise<{ success: boolean; affected: number; error?: string }> {
    try {
      if (operation.attendanceIds.length === 0) {
        return { success: false, affected: 0, error: 'No attendance IDs provided' };
      }

      if (operation.type === 'delete') {
        // Delete multiple records
        for (const id of operation.attendanceIds) {
          await this.db.delete('attendance', { id });
        }

        return { success: true, affected: operation.attendanceIds.length };
      } else if (operation.type === 'update' && operation.updates) {
        // Update multiple records
        const updateData: Record<string, unknown> = {
          updated_at: new Date()
        };

        if (operation.updates.status) {
          updateData.status = operation.updates.status;
        }

        if (operation.updates.workLocation) {
          updateData.work_location = operation.updates.workLocation;
        }

        if (operation.updates.notes) {
          updateData.notes = operation.updates.notes;
        }

        for (const id of operation.attendanceIds) {
          await this.db.update('attendance', updateData, { id });
        }

        return { success: true, affected: operation.attendanceIds.length };
      }

      return { success: false, affected: 0, error: 'Invalid operation type' };
    } catch (error) {
      logger.error('Bulk update attendance error', error);
      return { success: false, affected: 0, error: 'Failed to perform bulk operation' };
    }
  }

  /**
   * Delete a specific attendance record (admin only)
   */
  async deleteAttendanceRecord(attendanceId: number, adminId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const record = await this.db.get('attendance', { id: attendanceId });

      if (!record) {
        return { success: false, error: 'Attendance record not found' };
      }

      await this.db.delete('attendance', { id: attendanceId });

      logger.info(`Attendance record ${attendanceId} deleted by admin ${adminId}`);

      return { success: true };
    } catch (error) {
      logger.error('Delete attendance record error', error);
      return { success: false, error: 'Failed to delete attendance record' };
    }
  }

  /**
   * Get attendance statistics for admin dashboard
   */
  async getAttendanceStatistics(startDate?: string, endDate?: string): Promise<{
    totalRecords: number;
    presentCount: number;
    absentCount: number;
    averageHours: number;
    automatedCount: number;
  }> {
    try {
      const conditions: string[] = ['1=1'];
      const params: string[] = [];
      let paramIndex = 1;

      if (startDate) {
        conditions.push(`date >= $${paramIndex++}`);
        params.push(startDate);
      }

      if (endDate) {
        conditions.push(`date <= $${paramIndex++}`);
        params.push(endDate);
      }

      const whereClause = conditions.join(' AND ');

      const query = `
        SELECT
          COUNT(*) as total_records,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
          SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count,
          AVG(total_hours) as average_hours,
          SUM(CASE WHEN notes LIKE '%Automated%' THEN 1 ELSE 0 END) as automated_count
        FROM attendance
        WHERE ${whereClause}
      `;

      const result = await this.db.executeRawSQL(query, params);
      const stats = result[0] || {};

      return {
        totalRecords: parseInt(stats.total_records) || 0,
        presentCount: parseInt(stats.present_count) || 0,
        absentCount: parseInt(stats.absent_count) || 0,
        averageHours: parseFloat(stats.average_hours) || 0,
        automatedCount: parseInt(stats.automated_count) || 0
      };
    } catch (error) {
      logger.error('Get attendance statistics error', error);
      return {
        totalRecords: 0,
        presentCount: 0,
        absentCount: 0,
        averageHours: 0,
        automatedCount: 0
      };
    }
  }

  // =====================================================
  // ATTENDANCE TIME EDIT REQUEST METHODS
  // =====================================================

  /**
   * Create an attendance time edit request (for non-admin users)
   */
  async createEditRequest(
    userId: number,
    data: CreateAttendanceEditRequestData
  ): Promise<{ success: boolean; requestId?: number; error?: string }> {
    try {
      // Get the attendance record to snapshot original times
      const attendance = await this.db.get('attendance', { id: data.attendanceId });

      if (!attendance) {
        return { success: false, error: 'Attendance record not found' };
      }

      // Verify the user owns this attendance record
      if (attendance.user_id !== userId) {
        return { success: false, error: 'You can only edit your own attendance records' };
      }

      // Check if there's already a pending request for this attendance
      const existingRequest = await this.db.get('attendance_edit_requests', {
        attendance_id: data.attendanceId,
        status: 'pending'
      });

      if (existingRequest) {
        return { success: false, error: 'A pending edit request already exists for this attendance record' };
      }

      // Create the edit request
      const result = await this.db.insert('attendance_edit_requests', {
        attendance_id: data.attendanceId,
        user_id: userId,
        original_check_in_time: attendance.check_in_time,
        original_check_out_time: attendance.check_out_time,
        original_break_start_time: attendance.break_start_time,
        original_break_end_time: attendance.break_end_time,
        requested_check_in_time: data.requestedCheckInTime || null,
        requested_check_out_time: data.requestedCheckOutTime || null,
        requested_break_start_time: data.requestedBreakStartTime || null,
        requested_break_end_time: data.requestedBreakEndTime || null,
        reason: data.reason,
        status: 'pending'
      });

      logger.info(`Edit request created for attendance ${data.attendanceId} by user ${userId}`);

      return { success: true, requestId: result?.id };
    } catch (error) {
      logger.error('Create edit request error', error);
      return { success: false, error: 'Failed to create edit request' };
    }
  }

  /**
   * Create attendance record for a user (admin only)
   * Used when admin needs to add attendance for an absent day
   */
  async createAttendanceForUser(
    userId: number,
    date: string,
    data: {
      checkInTime?: string;
      checkOutTime?: string;
      status?: 'present' | 'absent';
      workLocation?: 'WFH' | 'Onsite' | 'Field';
      notes?: string;
    }
  ): Promise<{ success: boolean; attendanceId?: number; error?: string }> {
    try {
      // Check if attendance already exists for this user and date
      const existing = await this.db.get('attendance', { user_id: userId, date });

      if (existing) {
        return { success: false, error: 'Attendance record already exists for this date' };
      }

      // Calculate total hours if both check-in and check-out provided
      let totalHours = 0;
      if (data.checkInTime && data.checkOutTime) {
        const checkIn = new Date(data.checkInTime);
        const checkOut = new Date(data.checkOutTime);
        totalHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
      }

      const result = await this.db.insert('attendance', {
        user_id: userId,
        date,
        check_in_time: data.checkInTime || null,
        check_out_time: data.checkOutTime || null,
        status: data.status || 'present',
        work_location: data.workLocation || 'Onsite',
        total_hours: totalHours,
        notes: data.notes || 'Added by admin'
      });

      return { success: true, attendanceId: result?.id };
    } catch (error) {
      logger.error('Create attendance for user error', error);
      return { success: false, error: 'Failed to create attendance record' };
    }
  }

  /**
   * Update attendance time directly (for admin users)
   */
  async updateAttendanceTimeDirect(
    attendanceId: number,
    adminId: number,
    updates: {
      checkInTime?: string;
      checkOutTime?: string;
      breakStartTime?: string;
      breakEndTime?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const attendance = await this.db.get('attendance', { id: attendanceId });

      if (!attendance) {
        return { success: false, error: 'Attendance record not found' };
      }

      const updateData: Record<string, unknown> = {
        updated_at: new Date()
      };

      if (updates.checkInTime !== undefined) {
        updateData.check_in_time = updates.checkInTime;
      }

      if (updates.checkOutTime !== undefined) {
        updateData.check_out_time = updates.checkOutTime;
      }

      if (updates.breakStartTime !== undefined) {
        updateData.break_start_time = updates.breakStartTime;
      }

      if (updates.breakEndTime !== undefined) {
        updateData.break_end_time = updates.breakEndTime;
      }

      // Recalculate break_duration if break times were updated
      const newBreakStart = updates.breakStartTime !== undefined ? updates.breakStartTime : attendance.break_start_time;
      const newBreakEnd = updates.breakEndTime !== undefined ? updates.breakEndTime : attendance.break_end_time;
      let breakDurationSeconds = attendance.break_duration || 0;

      if (newBreakStart && newBreakEnd) {
        breakDurationSeconds = Math.max(0, Math.floor((new Date(newBreakEnd).getTime() - new Date(newBreakStart).getTime()) / 1000));
        updateData.break_duration = breakDurationSeconds;
      }

      // Recalculate total hours if check-in or check-out times changed
      const newCheckIn = updates.checkInTime || attendance.check_in_time;
      const newCheckOut = updates.checkOutTime || attendance.check_out_time;

      if (newCheckIn && newCheckOut) {
        const checkInDate = new Date(newCheckIn);
        const checkOutDate = new Date(newCheckOut);
        const sessionHours = (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60);
        const breakDurationHours = breakDurationSeconds / 3600;
        updateData.total_hours = Math.max(0, sessionHours - breakDurationHours);
      }

      await this.db.update('attendance', updateData, { id: attendanceId });

      logger.info(`Attendance ${attendanceId} time updated directly by admin ${adminId}`);

      return { success: true };
    } catch (error) {
      logger.error('Update attendance time direct error', error);
      return { success: false, error: 'Failed to update attendance time' };
    }
  }

  /**
   * Get edit requests with filters (for admin)
   */
  async getEditRequests(filters: AttendanceEditRequestFilters = {}): Promise<AttendanceEditRequestsResponse> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const offset = (page - 1) * limit;

      const conditions: string[] = ['1=1'];
      const params: (string | number)[] = [];
      let paramIndex = 1;

      if (filters.userId) {
        conditions.push(`r.user_id = $${paramIndex++}`);
        params.push(filters.userId);
      }

      if (filters.status) {
        conditions.push(`r.status = $${paramIndex++}`);
        params.push(filters.status);
      }

      if (filters.startDate) {
        conditions.push(`a.date >= $${paramIndex++}`);
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        conditions.push(`a.date <= $${paramIndex++}`);
        params.push(filters.endDate);
      }

      const whereClause = conditions.join(' AND ');

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM attendance_edit_requests r
        JOIN attendance a ON r.attendance_id = a.id
        WHERE ${whereClause}
      `;

      const countResult = await this.db.executeRawSQL(countQuery, params);
      const total = parseInt(countResult[0]?.total || '0');

      // Get paginated records
      const recordsQuery = `
        SELECT
          r.id,
          r.attendance_id,
          r.user_id,
          r.original_check_in_time,
          r.original_check_out_time,
          r.original_break_start_time,
          r.original_break_end_time,
          r.requested_check_in_time,
          r.requested_check_out_time,
          r.requested_break_start_time,
          r.requested_break_end_time,
          r.reason,
          r.status,
          r.approver_id,
          r.approved_at,
          r.comments,
          r.created_at,
          r.updated_at,
          u.name as user_name,
          u.email as user_email,
          u.department as user_department,
          a.date as attendance_date,
          approver.name as approver_name
        FROM attendance_edit_requests r
        JOIN users u ON r.user_id = u.id
        JOIN attendance a ON r.attendance_id = a.id
        LEFT JOIN users approver ON r.approver_id = approver.id
        WHERE ${whereClause}
        ORDER BY r.created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;

      const records = await this.db.executeRawSQL(recordsQuery, [...params, limit, offset]);

      const mappedRecords: AttendanceEditRequestWithUser[] = records.map((r: Record<string, unknown>) => ({
        id: r.id as number,
        attendanceId: r.attendance_id as number,
        userId: r.user_id as number,
        originalCheckInTime: r.original_check_in_time as string | undefined,
        originalCheckOutTime: r.original_check_out_time as string | undefined,
        originalBreakStartTime: r.original_break_start_time as string | undefined,
        originalBreakEndTime: r.original_break_end_time as string | undefined,
        requestedCheckInTime: r.requested_check_in_time as string | undefined,
        requestedCheckOutTime: r.requested_check_out_time as string | undefined,
        requestedBreakStartTime: r.requested_break_start_time as string | undefined,
        requestedBreakEndTime: r.requested_break_end_time as string | undefined,
        reason: r.reason as string,
        status: r.status as 'pending' | 'approved' | 'rejected',
        approverId: r.approver_id as number | undefined,
        approvedAt: r.approved_at as string | undefined,
        comments: r.comments as string | undefined,
        createdAt: r.created_at as string,
        updatedAt: r.updated_at as string,
        userName: r.user_name as string,
        userEmail: r.user_email as string,
        userDepartment: r.user_department as string,
        attendanceDate: r.attendance_date as string,
        approverName: r.approver_name as string | undefined
      }));

      return {
        requests: mappedRecords,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Get edit requests error', error);
      return {
        requests: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0
      };
    }
  }

  /**
   * Get user's own edit requests
   */
  async getUserEditRequests(userId: number): Promise<AttendanceEditRequestWithUser[]> {
    try {
      const query = `
        SELECT
          r.id,
          r.attendance_id,
          r.user_id,
          r.original_check_in_time,
          r.original_check_out_time,
          r.original_break_start_time,
          r.original_break_end_time,
          r.requested_check_in_time,
          r.requested_check_out_time,
          r.requested_break_start_time,
          r.requested_break_end_time,
          r.reason,
          r.status,
          r.approver_id,
          r.approved_at,
          r.comments,
          r.created_at,
          r.updated_at,
          u.name as user_name,
          u.email as user_email,
          u.department as user_department,
          a.date as attendance_date,
          approver.name as approver_name
        FROM attendance_edit_requests r
        JOIN users u ON r.user_id = u.id
        JOIN attendance a ON r.attendance_id = a.id
        LEFT JOIN users approver ON r.approver_id = approver.id
        WHERE r.user_id = $1
        ORDER BY r.created_at DESC
      `;

      const records = await this.db.executeRawSQL(query, [userId]);

      return records.map((r: Record<string, unknown>) => ({
        id: r.id as number,
        attendanceId: r.attendance_id as number,
        userId: r.user_id as number,
        originalCheckInTime: r.original_check_in_time as string | undefined,
        originalCheckOutTime: r.original_check_out_time as string | undefined,
        originalBreakStartTime: r.original_break_start_time as string | undefined,
        originalBreakEndTime: r.original_break_end_time as string | undefined,
        requestedCheckInTime: r.requested_check_in_time as string | undefined,
        requestedCheckOutTime: r.requested_check_out_time as string | undefined,
        requestedBreakStartTime: r.requested_break_start_time as string | undefined,
        requestedBreakEndTime: r.requested_break_end_time as string | undefined,
        reason: r.reason as string,
        status: r.status as 'pending' | 'approved' | 'rejected',
        approverId: r.approver_id as number | undefined,
        approvedAt: r.approved_at as string | undefined,
        comments: r.comments as string | undefined,
        createdAt: r.created_at as string,
        updatedAt: r.updated_at as string,
        userName: r.user_name as string,
        userEmail: r.user_email as string,
        userDepartment: r.user_department as string,
        attendanceDate: r.attendance_date as string,
        approverName: r.approver_name as string | undefined
      }));
    } catch (error) {
      logger.error('Get user edit requests error', error);
      return [];
    }
  }

  /**
   * Approve an edit request and apply the changes (admin only)
   */
  async approveEditRequest(
    requestId: number,
    adminId: number,
    comments?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const request = await this.db.get('attendance_edit_requests', { id: requestId });

      if (!request) {
        return { success: false, error: 'Edit request not found' };
      }

      if (request.status !== 'pending') {
        return { success: false, error: 'This request has already been processed' };
      }

      // Apply the requested changes to the attendance record
      const updateData: Record<string, unknown> = {
        updated_at: new Date()
      };

      if (request.requested_check_in_time) {
        updateData.check_in_time = request.requested_check_in_time;
      }

      if (request.requested_check_out_time) {
        updateData.check_out_time = request.requested_check_out_time;
      }

      if (request.requested_break_start_time) {
        updateData.break_start_time = request.requested_break_start_time;
      }

      if (request.requested_break_end_time) {
        updateData.break_end_time = request.requested_break_end_time;
      }

      // Get the attendance record for recalculation
      const attendance = await this.db.get('attendance', { id: request.attendance_id });

      if (attendance) {
        // Recalculate break_duration if break times changed
        const newBreakStart = request.requested_break_start_time || attendance.break_start_time;
        const newBreakEnd = request.requested_break_end_time || attendance.break_end_time;
        let breakDurationSeconds = attendance.break_duration || 0;

        if (newBreakStart && newBreakEnd) {
          breakDurationSeconds = Math.max(0, Math.floor((new Date(newBreakEnd).getTime() - new Date(newBreakStart).getTime()) / 1000));
          updateData.break_duration = breakDurationSeconds;
        }

        // Recalculate total hours
        const newCheckIn = request.requested_check_in_time || attendance.check_in_time;
        const newCheckOut = request.requested_check_out_time || attendance.check_out_time;

        if (newCheckIn && newCheckOut) {
          const checkInDate = new Date(newCheckIn);
          const checkOutDate = new Date(newCheckOut);
          const sessionHours = (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60);
          const breakDurationHours = breakDurationSeconds / 3600;
          updateData.total_hours = Math.max(0, sessionHours - breakDurationHours);
        }

        await this.db.update('attendance', updateData, { id: request.attendance_id });
      }

      // Update the request status
      await this.db.update('attendance_edit_requests', {
        status: 'approved',
        approver_id: adminId,
        approved_at: new Date().toISOString(),
        comments: comments || null,
        updated_at: new Date()
      }, { id: requestId });

      logger.info(`Edit request ${requestId} approved by admin ${adminId}`);

      return { success: true };
    } catch (error) {
      logger.error('Approve edit request error', error);
      return { success: false, error: 'Failed to approve edit request' };
    }
  }

  /**
   * Reject an edit request (admin only)
   */
  async rejectEditRequest(
    requestId: number,
    adminId: number,
    comments: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const request = await this.db.get('attendance_edit_requests', { id: requestId });

      if (!request) {
        return { success: false, error: 'Edit request not found' };
      }

      if (request.status !== 'pending') {
        return { success: false, error: 'This request has already been processed' };
      }

      await this.db.update('attendance_edit_requests', {
        status: 'rejected',
        approver_id: adminId,
        approved_at: new Date().toISOString(),
        comments: comments,
        updated_at: new Date()
      }, { id: requestId });

      logger.info(`Edit request ${requestId} rejected by admin ${adminId}`);

      return { success: true };
    } catch (error) {
      logger.error('Reject edit request error', error);
      return { success: false, error: 'Failed to reject edit request' };
    }
  }

  /**
   * Get a single attendance record by ID
   */
  async getAttendanceById(attendanceId: number): Promise<AttendanceRecord | null> {
    try {
      const record = await this.db.get('attendance', { id: attendanceId });

      if (!record) return null;

      return {
        id: record.id,
        userId: record.user_id,
        date: record.date,
        checkInTime: record.check_in_time,
        checkOutTime: record.check_out_time,
        breakStartTime: record.break_start_time,
        breakEndTime: record.break_end_time,
        breakDuration: record.break_duration || 0,
        totalHours: record.total_hours || 0,
        status: record.status,
        workLocation: record.work_location as 'WFH' | 'Onsite' | 'Field',
        notes: record.notes
      };
    } catch (error) {
      logger.error('Get attendance by ID error', error);
      return null;
    }
  }
}

let attendanceServiceInstance: AttendanceService | null = null;

export function getAttendanceService(): AttendanceService {
  if (!attendanceServiceInstance) {
    attendanceServiceInstance = new AttendanceService();
  }
  return attendanceServiceInstance;
}