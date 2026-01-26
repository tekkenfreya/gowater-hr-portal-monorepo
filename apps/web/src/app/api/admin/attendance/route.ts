import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getAttendanceService } from '@/lib/attendance';
import { getPermissionsService } from '@/lib/permissions';
import { logger } from '@/lib/logger';
import { AttendanceManagementFilters, BulkAttendanceOperation } from '@/types/attendance';

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

/**
 * GET /api/admin/attendance
 * Fetch all users' attendance records with filters and pagination
 * Admin only
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      logger.error('No token found in cookies', {
        cookies: request.cookies.getAll(),
        headers: Object.fromEntries(request.headers.entries())
      });
      return NextResponse.json(
        { error: 'Unauthorized: No token found' },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    // Check if user has can_manage_attendance permission or is admin
    const permissionsService = getPermissionsService();
    const hasPermission = decoded.role === 'admin' || await permissionsService.hasPermission(
      decoded.userId,
      'can_manage_attendance'
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to manage attendance' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const filters: AttendanceManagementFilters = {
      userId: searchParams.get('userId') ? parseInt(searchParams.get('userId')!) : undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      status: (searchParams.get('status') as 'present' | 'absent' | 'late' | 'on_duty' | 'leave') || undefined,
      workLocation: (searchParams.get('workLocation') as 'WFH' | 'Onsite') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
    };

    const attendanceService = getAttendanceService();
    const result = await attendanceService.getAllUsersAttendance(filters);

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Admin attendance GET error', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance records' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/attendance
 * Bulk operations on attendance records (update or delete)
 * Admin only
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

    // Check if user has can_manage_attendance permission or is admin
    const permissionsService = getPermissionsService();
    const hasPermission = decoded.role === 'admin' || await permissionsService.hasPermission(
      decoded.userId,
      'can_manage_attendance'
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to manage attendance' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const operation: BulkAttendanceOperation = body;

    // Validate operation
    if (!operation.type || !operation.attendanceIds || operation.attendanceIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid operation: type and attendanceIds are required' },
        { status: 400 }
      );
    }

    if (operation.type === 'update' && !operation.updates) {
      return NextResponse.json(
        { error: 'Invalid operation: updates are required for update type' },
        { status: 400 }
      );
    }

    const attendanceService = getAttendanceService();
    const result = await attendanceService.bulkUpdateAttendance(operation);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Bulk operation failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      affected: result.affected,
      message: `Successfully ${operation.type === 'delete' ? 'deleted' : 'updated'} ${result.affected} records`
    });
  } catch (error) {
    logger.error('Admin attendance POST error', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/attendance
 * Delete a specific attendance record
 * Admin only
 * Query param: attendanceId
 */
export async function DELETE(request: NextRequest) {
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

    // Check if user has can_manage_attendance permission or is admin
    const permissionsService = getPermissionsService();
    const hasPermission = decoded.role === 'admin' || await permissionsService.hasPermission(
      decoded.userId,
      'can_manage_attendance'
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to manage attendance' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const attendanceId = searchParams.get('attendanceId');

    if (!attendanceId) {
      return NextResponse.json(
        { error: 'Attendance ID is required' },
        { status: 400 }
      );
    }

    const attendanceService = getAttendanceService();
    const result = await attendanceService.deleteAttendanceRecord(
      parseInt(attendanceId),
      decoded.userId
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete record' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Attendance record deleted successfully'
    });
  } catch (error) {
    logger.error('Admin attendance DELETE error', error);
    return NextResponse.json(
      { error: 'Failed to delete attendance record' },
      { status: 500 }
    );
  }
}
