import { NextRequest, NextResponse } from 'next/server';
import { getAuthService } from '@/lib/auth';
import { getAttendanceService } from '@/lib/attendance';
import { getPermissionsService } from '@/lib/permissions';
import { logger } from '@/lib/logger';
import jwt from 'jsonwebtoken';

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;

  const authService = getAuthService();
  return await authService.verifyToken(token);
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { notes, workLocation, userId: requestedUserId } = body;

    // Determine target userId (support admin override)
    let targetUserId = user.id; // Default to authenticated user

    if (requestedUserId && requestedUserId !== user.id) {
      // Admin override requested - check permission
      const token = request.cookies.get('auth-token')?.value;
      if (!token) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number; role: string };

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
    const result = await attendanceService.checkIn(targetUserId, notes, workLocation);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: 'Checked in successfully' });
  } catch (error) {
    logger.error('Check-in API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}