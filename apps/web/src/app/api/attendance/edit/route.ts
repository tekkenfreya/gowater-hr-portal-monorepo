import { NextRequest, NextResponse } from 'next/server';
import { getAuthService } from '@/lib/auth';
import { getAttendanceService } from '@/lib/attendance';
import { logger } from '@/lib/logger';
import jwt from 'jsonwebtoken';

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;

  const authService = getAuthService();
  return await authService.verifyToken(token);
}

/**
 * POST /api/attendance/edit
 * Creates an edit request (non-admin) or edits directly (admin)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      attendanceId,
      requestedCheckInTime,
      requestedCheckOutTime,
      requestedBreakStartTime,
      requestedBreakEndTime,
      reason
    } = body;

    if (!attendanceId) {
      return NextResponse.json(
        { error: 'Attendance ID is required' },
        { status: 400 }
      );
    }

    const attendanceService = getAttendanceService();

    // Get attendance record to check ownership
    const attendance = await attendanceService.getAttendanceById(attendanceId);

    if (!attendance) {
      return NextResponse.json(
        { error: 'Attendance record not found' },
        { status: 404 }
      );
    }

    // Check if user is admin
    const token = request.cookies.get('auth-token')?.value;
    const decoded = jwt.verify(token!, process.env.JWT_SECRET!) as { userId: number; role: string };
    const isAdmin = decoded.role === 'admin';

    if (isAdmin) {
      // Admin can edit directly
      const result = await attendanceService.updateAttendanceTimeDirect(
        attendanceId,
        decoded.userId,
        {
          checkInTime: requestedCheckInTime,
          checkOutTime: requestedCheckOutTime,
          breakStartTime: requestedBreakStartTime,
          breakEndTime: requestedBreakEndTime
        }
      );

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Attendance time updated successfully',
        directEdit: true
      });
    } else {
      // Non-admin creates an edit request
      if (!reason) {
        return NextResponse.json(
          { error: 'Reason is required for edit requests' },
          { status: 400 }
        );
      }

      // Verify user owns the attendance record
      if (attendance.userId !== decoded.userId) {
        return NextResponse.json(
          { error: 'You can only edit your own attendance records' },
          { status: 403 }
        );
      }

      const result = await attendanceService.createEditRequest(decoded.userId, {
        attendanceId,
        requestedCheckInTime,
        requestedCheckOutTime,
        requestedBreakStartTime,
        requestedBreakEndTime,
        reason
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Edit request submitted for approval',
        requestId: result.requestId,
        directEdit: false
      });
    }
  } catch (error) {
    logger.error('Attendance edit API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/attendance/edit
 * Get user's own edit requests
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = request.cookies.get('auth-token')?.value;
    const decoded = jwt.verify(token!, process.env.JWT_SECRET!) as { userId: number };

    const attendanceService = getAttendanceService();
    const requests = await attendanceService.getUserEditRequests(decoded.userId);

    return NextResponse.json({ requests });
  } catch (error) {
    logger.error('Get edit requests API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
