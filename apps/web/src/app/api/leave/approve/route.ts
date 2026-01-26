import { NextRequest, NextResponse } from 'next/server';
import { getAuthService } from '@/lib/auth';
import { getLeaveService } from '@/lib/leave';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { leaveRequestId, action, comments } = await request.json();

    // Validate input
    if (!leaveRequestId || !action) {
      return NextResponse.json(
        { success: false, error: 'Leave request ID and action are required' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    if (action === 'reject' && !comments) {
      return NextResponse.json(
        { success: false, error: 'Comments are required when rejecting a leave request' },
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

    // Check if user has manager role or is admin
    if (user.role !== 'manager' && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to approve/reject leave requests' },
        { status: 403 }
      );
    }

    const leaveService = getLeaveService();
    let result;

    if (action === 'approve') {
      result = await leaveService.approveLeaveRequest(parseInt(leaveRequestId), user.id, comments);
    } else {
      result = await leaveService.rejectLeaveRequest(parseInt(leaveRequestId), user.id, comments);
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Leave request ${action}d successfully`
    });

  } catch (error) {
    logger.error('Approve/reject leave request API error', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}