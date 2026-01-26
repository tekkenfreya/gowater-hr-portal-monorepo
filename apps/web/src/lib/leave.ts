import { getDb } from './supabase';
import { getAttendanceService } from './attendance';
import { getNotificationService } from './notifications';
import { logger } from './logger';

export interface LeaveRequest {
  id: number;
  user_id: number;
  start_date: string;
  end_date: string;
  leave_type: 'vacation' | 'sick' | 'absent' | 'offset';
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approver_id?: number;
  approved_at?: Date;
  comments?: string;
  created_at: Date;
  updated_at: Date;
}

export interface LeaveRequestWithDetails extends LeaveRequest {
  employee_name: string;
  employee_email: string;
  employee_department?: string;
  approver_name?: string;
  approver_email?: string;
}

export interface CreateLeaveRequestData {
  user_id: number;
  start_date: string;
  end_date: string;
  leave_type: 'vacation' | 'sick' | 'absent' | 'offset';
  reason: string;
}

export interface LeaveBalance {
  vacation: { used: number; total: number };
  sick: { used: number; total: number };
  absent: { count: number };
  offset: { available: number };
}

export class LeaveService {
  private db = getDb();
  private attendanceService = getAttendanceService();
  private notificationService = getNotificationService();

  async createLeaveRequest(data: CreateLeaveRequestData): Promise<{ success: boolean; leaveRequestId?: number; error?: string }> {
    try {
      // Validate dates
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (startDate < today) {
        return { success: false, error: 'Leave start date cannot be in the past' };
      }

      if (endDate < startDate) {
        return { success: false, error: 'Leave end date cannot be before start date' };
      }

      // Check for overlapping leave requests
      const overlappingLeave = await this.db.executeRawSQL(`
        SELECT COUNT(*) as count
        FROM leave_requests
        WHERE user_id = $1
          AND status IN ('pending', 'approved')
          AND (
            (start_date <= $2 AND end_date >= $2) OR
            (start_date <= $3 AND end_date >= $3) OR
            (start_date >= $2 AND end_date <= $3)
          )
      `, [data.user_id, data.start_date, data.end_date]);

      if (overlappingLeave && overlappingLeave[0]?.count > 0) {
        return { success: false, error: 'You already have a leave request for these dates' };
      }

      // Get user's manager for auto-assignment
      const user = await this.db.get('users', { id: data.user_id });
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Create leave request (only use columns that exist in the database)
      const leaveRequest = await this.db.insert('leave_requests', {
        user_id: data.user_id,
        start_date: data.start_date,
        end_date: data.end_date,
        leave_type: data.leave_type,
        reason: data.reason,
        status: 'pending',
        approver_id: user.manager_id || null,
        created_at: new Date(),
        updated_at: new Date()
      });

      // Create notification for manager if exists (and not self)
      if (user.manager_id && user.manager_id !== data.user_id) {
        await this.notificationService.createNotification({
          user_id: user.manager_id,
          type: 'leave_request',
          title: 'New Leave Request',
          message: `${user.name} has submitted a leave request for ${data.leave_type} leave`,
          data: { leave_request_id: leaveRequest.id, employee_name: user.name }
        });
      }

      // Notify all admins (excluding the requesting user if they are admin)
      const admins = await this.db.all('users', { role: 'admin', status: 'active' });
      for (const admin of admins) {
        // Skip if admin is the one filing the leave request
        if (admin.id === data.user_id) continue;

        await this.notificationService.createNotification({
          user_id: admin.id,
          type: 'leave_request',
          title: 'New Leave Request',
          message: `${user.name} has submitted a leave request for ${data.leave_type} leave`,
          data: { leave_request_id: leaveRequest.id, employee_name: user.name }
        });
      }

      return { success: true, leaveRequestId: leaveRequest.id };
    } catch (error) {
      logger.error('Create leave request error', error);
      return { success: false, error: 'Failed to create leave request' };
    }
  }

  async getLeaveRequests(userId: number): Promise<LeaveRequestWithDetails[]> {
    try {
      const leaveRequests = await this.db.executeRawSQL<LeaveRequestWithDetails>(`
        SELECT lr.*,
               u.name as employee_name,
               u.email as employee_email,
               u.department as employee_department,
               a.name as approver_name,
               a.email as approver_email
        FROM leave_requests lr
        JOIN users u ON lr.user_id = u.id
        LEFT JOIN users a ON lr.approver_id = a.id
        WHERE lr.user_id = $1
        ORDER BY lr.created_at DESC
      `, [userId]);

      return leaveRequests || [];
    } catch (error) {
      logger.error('Get leave requests error', error);
      return [];
    }
  }

  async getTeamLeaveRequests(managerId: number, status?: 'pending' | 'approved' | 'rejected' | 'cancelled'): Promise<LeaveRequestWithDetails[]> {
    try {
      let query = `
        SELECT lr.*, u.name as employee_name, u.email as employee_email, u.department as employee_department,
               a.name as approver_name, a.email as approver_email,
               (lr.end_date - lr.start_date + 1) as total_days
        FROM leave_requests lr
        JOIN users u ON lr.user_id = u.id
        LEFT JOIN users a ON lr.approver_id = a.id
        WHERE u.manager_id = $1
      `;

      const params: (number | string)[] = [managerId];

      if (status) {
        query += ` AND lr.status = $2`;
        params.push(status);
      }

      query += ` ORDER BY lr.created_at DESC`;

      const leaveRequests = await this.db.executeRawSQL<LeaveRequestWithDetails>(query, params);
      return leaveRequests || [];
    } catch (error) {
      logger.error('Get team leave requests error', error);
      return [];
    }
  }

  async approveLeaveRequest(leaveRequestId: number, approverId: number, comments?: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get leave request details
      const leaveRequest = await this.db.get<LeaveRequest>('leave_requests', { id: leaveRequestId });
      if (!leaveRequest) {
        return { success: false, error: 'Leave request not found' };
      }

      if (leaveRequest.status !== 'pending') {
        return { success: false, error: 'Leave request has already been processed' };
      }

      // Update leave request status
      await this.db.update('leave_requests', {
        status: 'approved',
        approver_id: approverId,
        approved_at: new Date(),
        comments: comments || null,
        updated_at: new Date()
      }, { id: leaveRequestId });

      // Create attendance records for approved leave dates
      await this.markAttendanceAsLeave(leaveRequest.user_id, leaveRequest.start_date, leaveRequest.end_date);

      // Get employee details for notification
      const employee = await this.db.get('users', { id: leaveRequest.user_id });

      // Create notification for employee
      if (employee) {
        await this.notificationService.createNotification({
          user_id: leaveRequest.user_id,
          type: 'leave_approved',
          title: 'Leave Request Approved',
          message: `Your ${leaveRequest.leave_type} leave request has been approved`,
          data: { leave_request_id: leaveRequestId, comments }
        });
      }

      return { success: true };
    } catch (error) {
      logger.error('Approve leave request error', error);
      return { success: false, error: 'Failed to approve leave request' };
    }
  }

  async rejectLeaveRequest(leaveRequestId: number, approverId: number, comments: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get leave request details
      const leaveRequest = await this.db.get<LeaveRequest>('leave_requests', { id: leaveRequestId });
      if (!leaveRequest) {
        return { success: false, error: 'Leave request not found' };
      }

      if (leaveRequest.status !== 'pending') {
        return { success: false, error: 'Leave request has already been processed' };
      }

      // Update leave request status
      await this.db.update('leave_requests', {
        status: 'rejected',
        approver_id: approverId,
        approved_at: new Date(),
        comments: comments,
        updated_at: new Date()
      }, { id: leaveRequestId });

      // Create notification for employee
      await this.notificationService.createNotification({
        user_id: leaveRequest.user_id,
        type: 'leave_rejected',
        title: 'Leave Request Rejected',
        message: `Your ${leaveRequest.leave_type} leave request has been rejected`,
        data: { leave_request_id: leaveRequestId, comments }
      });

      return { success: true };
    } catch (error) {
      logger.error('Reject leave request error', error);
      return { success: false, error: 'Failed to reject leave request' };
    }
  }

  async getLeaveBalance(userId: number): Promise<LeaveBalance> {
    try {
      // Get approved leave requests for current year
      const currentYear = new Date().getFullYear();
      const leaveRequests = await this.db.executeRawSQL(`
        SELECT leave_type, SUM(end_date - start_date + 1) as total_days
        FROM leave_requests
        WHERE user_id = $1
          AND status = 'approved'
          AND EXTRACT(YEAR FROM start_date) = $2
        GROUP BY leave_type
      `, [userId, currentYear]);

      const usedLeave = {
        vacation: 0,
        sick: 0
      };

      leaveRequests?.forEach(leave => {
        if (leave.leave_type === 'vacation' || leave.leave_type === 'annual') {
          usedLeave.vacation += parseInt(leave.total_days) || 0;
        } else if (leave.leave_type === 'sick') {
          usedLeave.sick += parseInt(leave.total_days) || 0;
        }
      });

      // Get absent count from attendance records (status='absent')
      const absentResult = await this.db.executeRawSQL(`
        SELECT COUNT(*) as count
        FROM attendance
        WHERE user_id = $1
          AND status = 'absent'
          AND EXTRACT(YEAR FROM date) = $2
      `, [userId, currentYear]);
      const absentCount = parseInt(absentResult?.[0]?.count) || 0;

      // Get offset credits (TODO: implement offset tracking table)
      // For now return 0, will need offsets table to track holiday work credits
      const offsetCredits = 0;

      // Standard leave allocations
      return {
        vacation: { used: usedLeave.vacation, total: 10 },
        sick: { used: usedLeave.sick, total: 5 },
        absent: { count: absentCount },
        offset: { available: offsetCredits }
      };
    } catch (error) {
      logger.error('Get leave balance error', error);
      return {
        vacation: { used: 0, total: 10 },
        sick: { used: 0, total: 5 },
        absent: { count: 0 },
        offset: { available: 0 }
      };
    }
  }

  private async markAttendanceAsLeave(userId: number, startDate: string, endDate: string): Promise<void> {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Create attendance records for each leave day
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];

        // Check if attendance record exists
        const existingAttendance = await this.db.get('attendance', {
          user_id: userId,
          date: dateStr
        });

        if (existingAttendance) {
          // Update existing record
          await this.db.update('attendance', {
            status: 'leave',
            total_hours: 8, // Standard work day
            updated_at: new Date()
          }, { user_id: userId, date: dateStr });
        } else {
          // Create new attendance record
          await this.db.insert('attendance', {
            user_id: userId,
            date: dateStr,
            status: 'leave',
            total_hours: 8,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      }
    } catch (error) {
      logger.error('Mark attendance as leave error', error);
    }
  }


  async deleteLeaveRequest(leaveRequestId: number, userId: number): Promise<{ success: boolean; error?: string }> {
    try {
      // Get leave request to verify ownership and status
      const leaveRequest = await this.db.get<LeaveRequest>('leave_requests', { id: leaveRequestId });

      if (!leaveRequest) {
        return { success: false, error: 'Leave request not found' };
      }

      if (leaveRequest.user_id !== userId) {
        return { success: false, error: 'Unauthorized to delete this leave request' };
      }

      if (leaveRequest.status !== 'pending') {
        return { success: false, error: 'Cannot delete processed leave request' };
      }

      await this.db.delete('leave_requests', { id: leaveRequestId });
      return { success: true };
    } catch (error) {
      logger.error('Delete leave request error', error);
      return { success: false, error: 'Failed to delete leave request' };
    }
  }
}

// Singleton instance
let leaveServiceInstance: LeaveService | null = null;

export function getLeaveService(): LeaveService {
  if (!leaveServiceInstance) {
    leaveServiceInstance = new LeaveService();
  }
  return leaveServiceInstance;
}