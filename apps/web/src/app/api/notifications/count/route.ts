import { NextRequest, NextResponse } from 'next/server';
import { getAuthService } from '@/lib/auth';
import { getNotificationService } from '@/lib/notifications';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
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
    const unreadCount = await notificationService.getUnreadCount(user.id);

    return NextResponse.json({
      success: true,
      data: { unreadCount }
    });

  } catch (error) {
    logger.error('Get notification count API error', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}