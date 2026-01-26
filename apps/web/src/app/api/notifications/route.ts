import { NextRequest, NextResponse } from 'next/server';
import { getAuthService } from '@/lib/auth';
import { getNotificationService } from '@/lib/notifications';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, title, message, taskId, userId, userName } = body;

    if (!type || !title || !message) {
      return NextResponse.json(
        { success: false, error: 'Type, title, and message are required' },
        { status: 400 }
      );
    }

    // Get user from token
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const authService = getAuthService();
    const user = await authService.verifyToken(token);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get all admin users to send notification to
    const allUsers = await authService.getAllUsers();
    const adminUsers = allUsers.filter(u => u.role === 'admin');

    if (adminUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No admin users to notify'
      });
    }

    const notificationService = getNotificationService();

    // Create notification for each admin user
    const results = await Promise.all(
      adminUsers.map(admin =>
        notificationService.createNotification({
          user_id: admin.id,
          type,
          title,
          message,
          data: {
            taskId,
            requestedBy: userId,
            requestedByName: userName,
            link: taskId ? `/dashboard/tasks?taskId=${taskId}` : undefined
          }
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${adminUsers.length} admin(s)`,
      notificationIds: results.map(r => r.notificationId).filter(Boolean)
    });

  } catch (error) {
    logger.error('Create notification API error', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    // Get user from token
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const authService = getAuthService();
    const user = await authService.verifyToken(token);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const notificationService = getNotificationService();
    const notifications = await notificationService.getUserNotifications(user.id, unreadOnly);

    return NextResponse.json({
      success: true,
      data: notifications
    });

  } catch (error) {
    logger.error('Get notifications API error', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { notificationId, action } = await request.json();

    if (!notificationId || !action) {
      return NextResponse.json(
        { success: false, error: 'Notification ID and action are required' },
        { status: 400 }
      );
    }

    if (!['read', 'readAll'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be "read" or "readAll"' },
        { status: 400 }
      );
    }

    // Get user from token
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const authService = getAuthService();
    const user = await authService.verifyToken(token);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const notificationService = getNotificationService();
    let result;

    if (action === 'read') {
      result = await notificationService.markAsRead(parseInt(notificationId), user.id);
    } else {
      result = await notificationService.markAllAsRead(user.id);
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: action === 'read' ? 'Notification marked as read' : 'All notifications marked as read'
    });

  } catch (error) {
    logger.error('Update notifications API error', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    // Get user from token
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const authService = getAuthService();
    const user = await authService.verifyToken(token);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const notificationService = getNotificationService();
    const result = await notificationService.deleteNotification(parseInt(notificationId), user.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    logger.error('Delete notification API error', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}