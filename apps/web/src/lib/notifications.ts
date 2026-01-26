import { getDb } from './supabase';
import { logger } from './logger';

export interface Notification {
  id: number;
  user_id: number;
  type: 'leave_request' | 'leave_approved' | 'leave_rejected' | 'attendance_alert' | 'task_assigned' | 'system_update';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read_at?: Date;
  created_at: Date;
}

export interface CreateNotificationData {
  user_id: number;
  type: Notification['type'];
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export class NotificationService {
  private db = getDb();

  async createNotification(data: CreateNotificationData): Promise<{ success: boolean; notificationId?: number; error?: string }> {
    try {
      const notification = await this.db.insert('notifications', {
        user_id: data.user_id,
        type: data.type,
        title: data.title,
        message: data.message,
        data: JSON.stringify(data.data || {}),
        created_at: new Date()
      });

      return { success: true, notificationId: notification.id };
    } catch (error) {
      logger.error('Create notification error', error);
      return { success: false, error: 'Failed to create notification' };
    }
  }

  async getUserNotifications(userId: number, unreadOnly: boolean = false): Promise<Notification[]> {
    try {
      const conditions: Record<string, unknown> = { user_id: userId };

      if (unreadOnly) {
        conditions.read_at = null;
      }

      const notifications = await this.db.all<Notification>(
        'notifications',
        conditions,
        'created_at DESC'
      );

      return notifications || [];
    } catch (error) {
      logger.error('Get user notifications error', error);
      return [];
    }
  }

  async markAsRead(notificationId: number, userId: number): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify notification belongs to user
      const notification = await this.db.get('notifications', {
        id: notificationId,
        user_id: userId
      });

      if (!notification) {
        return { success: false, error: 'Notification not found' };
      }

      await this.db.update('notifications', {
        read_at: new Date()
      }, { id: notificationId });

      return { success: true };
    } catch (error) {
      logger.error('Mark notification as read error', error);
      return { success: false, error: 'Failed to mark notification as read' };
    }
  }

  async markAllAsRead(userId: number): Promise<{ success: boolean; error?: string }> {
    try {
      await this.db.executeRawSQL(`
        UPDATE notifications
        SET read_at = NOW()
        WHERE user_id = $1 AND read_at IS NULL
      `, [userId]);

      return { success: true };
    } catch (error) {
      logger.error('Mark all notifications as read error', error);
      return { success: false, error: 'Failed to mark all notifications as read' };
    }
  }

  async getUnreadCount(userId: number): Promise<number> {
    try {
      const result = await this.db.executeRawSQL(`
        SELECT COUNT(*) as count
        FROM notifications
        WHERE user_id = $1 AND read_at IS NULL
      `, [userId]);

      return parseInt(result?.[0]?.count) || 0;
    } catch (error) {
      logger.error('Get unread count error', error);
      return 0;
    }
  }

  async deleteNotification(notificationId: number, userId: number): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify notification belongs to user
      const notification = await this.db.get('notifications', {
        id: notificationId,
        user_id: userId
      });

      if (!notification) {
        return { success: false, error: 'Notification not found' };
      }

      await this.db.delete('notifications', { id: notificationId });
      return { success: true };
    } catch (error) {
      logger.error('Delete notification error', error);
      return { success: false, error: 'Failed to delete notification' };
    }
  }
}

// Singleton instance
let notificationServiceInstance: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationService();
  }
  return notificationServiceInstance;
}