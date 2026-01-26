import { NextRequest, NextResponse } from 'next/server';
import { getAuthService } from '@/lib/auth';
import { getLeaveService } from '@/lib/leave';
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

    const leaveService = getLeaveService();
    const leaveBalance = await leaveService.getLeaveBalance(user.id);

    return NextResponse.json({
      success: true,
      data: leaveBalance
    });

  } catch (error) {
    logger.error('Get leave balance API error', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}