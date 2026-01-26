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

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0];

    const attendanceService = getAttendanceService();
    const weeklyAttendance = await attendanceService.getWeeklyAttendance(user.id, startDate);
    
    // Calculate end date for summary
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    
    const summary = await attendanceService.getAttendanceSummary(
      user.id, 
      startDate, 
      endDate.toISOString().split('T')[0]
    );

    return NextResponse.json({
      attendance: weeklyAttendance,
      weeklyAttendance,
      summary
    });
  } catch (error) {
    logger.error('Get weekly attendance API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}