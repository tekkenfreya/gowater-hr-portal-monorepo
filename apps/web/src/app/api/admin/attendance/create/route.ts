import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getAttendanceService } from '@/lib/attendance';
import { logger } from '@/lib/logger';
import { hasStealthAttendanceAccess } from '@/lib/stealthAccess';

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

/**
 * POST /api/admin/attendance/create
 * Create attendance record for a user (admin only)
 * Used when admin needs to add attendance for an absent day
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    // Only admin (or stealth-access users) can create attendance for other users
    if (decoded.role !== 'admin' && !hasStealthAttendanceAccess(decoded.userId)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, date, checkInTime, checkOutTime, status, workLocation, notes } = body;

    // Validate required fields
    if (!userId || !date) {
      return NextResponse.json(
        { error: 'userId and date are required' },
        { status: 400 }
      );
    }

    const attendanceService = getAttendanceService();
    const result = await attendanceService.createAttendanceForUser(userId, date, {
      checkInTime,
      checkOutTime,
      status,
      workLocation,
      notes
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create attendance' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      attendanceId: result.attendanceId,
      message: 'Attendance record created successfully'
    });
  } catch (error) {
    logger.error('Admin create attendance error', error);
    return NextResponse.json(
      { error: 'Failed to create attendance record' },
      { status: 500 }
    );
  }
}
