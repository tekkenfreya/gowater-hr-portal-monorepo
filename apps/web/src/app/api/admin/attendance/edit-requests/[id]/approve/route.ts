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
 * POST /api/admin/attendance/edit-requests/[id]/approve
 * Approve an edit request (admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAdmin(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const requestId = parseInt(id);

    if (isNaN(requestId)) {
      return NextResponse.json(
        { error: 'Invalid request ID' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { comments } = body;

    const token = request.cookies.get('auth-token')?.value;
    const decoded = jwt.verify(token!, process.env.JWT_SECRET!) as { userId: number };

    const attendanceService = getAttendanceService();
    const result = await attendanceService.approveEditRequest(
      requestId,
      decoded.userId,
      comments
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Edit request approved and changes applied'
    });
  } catch (error) {
    logger.error('Approve edit request API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
