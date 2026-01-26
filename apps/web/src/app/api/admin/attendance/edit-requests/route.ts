import { NextRequest, NextResponse } from 'next/server';
import { getAuthService } from '@/lib/auth';
import { getAttendanceService } from '@/lib/attendance';
import { logger } from '@/lib/logger';
import jwt from 'jsonwebtoken';

async function verifyAdmin(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number; role: string };
    if (decoded.role !== 'admin') return null;

    const authService = getAuthService();
    return await authService.verifyToken(token);
  } catch {
    return null;
  }
}

/**
 * GET /api/admin/attendance/edit-requests
 * Get all edit requests with filters (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdmin(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');

    const attendanceService = getAttendanceService();
    const result = await attendanceService.getEditRequests({
      userId: userId ? parseInt(userId) : undefined,
      status: status || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Get edit requests API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
