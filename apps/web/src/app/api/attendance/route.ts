import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getAttendanceService } from '@/lib/attendance';
import { logger } from '@/lib/logger';

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    const userId = decoded.userId;

    const attendanceService = getAttendanceService();
    const todayAttendance = await attendanceService.getTodayAttendance(userId);

    return NextResponse.json({ 
      attendance: todayAttendance,
      message: 'Attendance retrieved successfully' 
    });

  } catch (error) {
    logger.error('Get attendance API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    const userId = decoded.userId;

    const body = await request.json();
    const { action, notes, workLocation } = body;

    const attendanceService = getAttendanceService();

    if (action === 'checkin') {
      const result = await attendanceService.checkIn(userId, notes, workLocation);
      
      if (result.success) {
        return NextResponse.json({ 
          message: 'Checked in successfully'
        });
      } else {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    } else if (action === 'checkout') {
      const result = await attendanceService.checkOut(userId, notes);
      
      if (result.success) {
        return NextResponse.json({ 
          message: 'Checked out successfully',
          totalHours: result.totalHours
        });
      } else {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    } else if (action === 'delete') {
      const result = await attendanceService.deleteTodayAttendance(userId);
      
      if (result.success) {
        return NextResponse.json({ 
          message: 'Today\'s attendance record deleted successfully'
        });
      } else {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    logger.error('Attendance API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}