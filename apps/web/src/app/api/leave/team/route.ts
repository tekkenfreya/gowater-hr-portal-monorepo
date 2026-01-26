import { NextRequest, NextResponse } from 'next/server';
import { getAuthService } from '@/lib/auth';
import { getLeaveService } from '@/lib/leave';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | null;

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

    // Check if user has manager role or is admin
    if (user.role !== 'manager' && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to view team leave requests' },
        { status: 403 }
      );
    }

    const leaveService = getLeaveService();
    const teamLeaveRequests = await leaveService.getTeamLeaveRequests(user.id, status || undefined);

    return NextResponse.json({
      success: true,
      data: teamLeaveRequests
    });

  } catch (error) {
    logger.error('Get team leave requests API error', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}