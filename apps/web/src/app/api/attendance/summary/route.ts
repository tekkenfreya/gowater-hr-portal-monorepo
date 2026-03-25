import { NextRequest, NextResponse } from 'next/server';
import { getAuthService } from '@/lib/auth';
import { getAttendanceService } from '@/lib/attendance';
import { getPhilippineDateString } from '@/lib/timezone';
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
    const period = searchParams.get('period') || 'week';

    let startDate: string;
    let endDate: string;
    const today = new Date();

    if (period === 'week') {
      const currentDay = today.getDay();
      const sunday = new Date(today);
      sunday.setDate(today.getDate() - currentDay);
      startDate = getPhilippineDateString(sunday);

      const saturday = new Date(sunday);
      saturday.setDate(sunday.getDate() + 6);
      endDate = getPhilippineDateString(saturday);
    } else if (period === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      startDate = getPhilippineDateString(firstDay);

      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      endDate = getPhilippineDateString(lastDay);
    } else if (period === 'year') {
      const firstDay = new Date(today.getFullYear(), 0, 1);
      startDate = getPhilippineDateString(firstDay);

      const lastDay = new Date(today.getFullYear(), 11, 31);
      endDate = getPhilippineDateString(lastDay);
    } else {
      return NextResponse.json(
        { error: 'Invalid period. Use: week, month, or year' },
        { status: 400 }
      );
    }

    const attendanceService = getAttendanceService();
    const summary = await attendanceService.getAttendanceSummary(
      user.id,
      startDate,
      endDate
    );

    return NextResponse.json({
      summary,
      period,
      startDate,
      endDate
    });
  } catch (error) {
    logger.error('Get attendance summary API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
