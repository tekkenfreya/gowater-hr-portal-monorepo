import { NextRequest, NextResponse } from 'next/server';
import { getAuthService } from '@/lib/auth';
import { getAttendanceService } from '@/lib/attendance';
import { logger } from '@/lib/logger';

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;

  const authService = getAuthService();
  return await authService.verifyToken(token);
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const attendanceService = getAttendanceService();
    const todayAttendance = await attendanceService.getTodayAttendance(user.id);

    return NextResponse.json({ 
      attendance: todayAttendance || {
        userId: user.id,
        date: new Date().toISOString().split('T')[0],
        checkInTime: null,
        checkOutTime: null,
        totalHours: 0,
        status: 'absent',
        notes: null
      }
    });
  } catch (error) {
    logger.error('Get today attendance API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}