import { NextRequest, NextResponse } from 'next/server';
import { getAuthService } from '@/lib/auth';
import { getAttendanceService } from '@/lib/attendance';
import { getPermissionsService } from '@/lib/permissions';
import { logger } from '@/lib/logger';
import jwt from 'jsonwebtoken';

async function verifyAuth(request: NextRequest) {
  // Check cookies first (web), then Authorization header (mobile)
  let token = request.cookies.get('auth-token')?.value;

  if (!token) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

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
    const { notes, userId: requestedUserId, photoUrl, tasks } = body;

    // Determine target userId (support admin override)
    let targetUserId = user.id; // Default to authenticated user

    if (requestedUserId && requestedUserId !== user.id) {
      // Admin override requested - check permission
      let token = request.cookies.get('auth-token')?.value;
      if (!token) {
        const authHeader = request.headers.get('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }
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
    const result = await attendanceService.checkOut(targetUserId, notes, photoUrl, tasks);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      message: 'Checked out successfully',
      totalHours: result.totalHours 
    });
  } catch (error) {
    logger.error('Check-out API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}