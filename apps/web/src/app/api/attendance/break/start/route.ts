import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getAttendanceService } from '@/lib/attendance';
import { getPermissionsService } from '@/lib/permissions';
import { logger } from '@/lib/logger';

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    const body = await request.json().catch(() => ({}));
    const { userId: requestedUserId } = body;

    // Determine target userId (support admin override)
    let targetUserId = decoded.userId; // Default to authenticated user

    if (requestedUserId && requestedUserId !== decoded.userId) {
      // Admin override requested - check permission
      const permissionsService = getPermissionsService();
      const hasPermission = decoded.role === 'admin' || await permissionsService.hasPermission(
        decoded.userId,
        'can_manage_attendance'
      );

      if (hasPermission) {
        targetUserId = requestedUserId;
      } else {
        return NextResponse.json(
          { error: 'You do not have permission to manage other users\' attendance' },
          { status: 403 }
        );
      }
    }

    const attendanceService = getAttendanceService();
    const result = await attendanceService.startBreak(targetUserId);

    if (result.success) {
      return NextResponse.json({ 
        message: 'Break started successfully' 
      });
    } else {
      return NextResponse.json({ 
        error: result.error 
      }, { status: 400 });
    }

  } catch (error) {
    logger.error('Start break API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}