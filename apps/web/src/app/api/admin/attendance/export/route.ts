import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getAttendanceService } from '@/lib/attendance';
import { getPermissionsService } from '@/lib/permissions';
import { logger } from '@/lib/logger';
import { formatPhilippineTime } from '@/lib/timezone';

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

/**
 * GET /api/admin/attendance/export
 * Export attendance data as CSV
 * Query params:
 * - startDate (optional)
 * - endDate (optional)
 * - userId (optional)
 * - format: csv (default)
 * Admin only
 */
export async function GET(request: NextRequest) {
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
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const userId = searchParams.get('userId') ? parseInt(searchParams.get('userId')!) : undefined;
    const format = searchParams.get('format') || 'csv';

    if (format !== 'csv') {
      return NextResponse.json(
        { error: 'Only CSV format is currently supported' },
        { status: 400 }
      );
    }

    // Fetch all attendance data (without pagination for export)
    const attendanceService = getAttendanceService();
    const result = await attendanceService.getAllUsersAttendance({
      userId,
      startDate,
      endDate,
      limit: 10000 // Large limit for export
    });

    // Generate CSV
    const csvHeaders = [
      'Date',
      'User Name',
      'Email',
      'Department',
      'Check In',
      'Check Out',
      'Break Duration (min)',
      'Total Hours',
      'Status',
      'Work Location',
      'Automated',
      'Notes'
    ];

    const csvRows = result.records.map(record => [
      record.date,
      record.userName,
      record.userEmail,
      record.userDepartment || 'N/A',
      record.checkInTime ? formatPhilippineTime(record.checkInTime) : 'N/A',
      record.checkOutTime ? formatPhilippineTime(record.checkOutTime) : 'N/A',
      record.breakDuration ? Math.round(record.breakDuration / 60).toString() : '0',
      record.totalHours.toFixed(2),
      record.status,
      record.workLocation || 'N/A',
      record.isAutomated ? 'Yes' : 'No',
      record.notes ? record.notes.replace(/"/g, '""') : '' // Escape quotes for CSV
    ]);

    // Build CSV content
    const csvContent = [
      csvHeaders.map(h => `"${h}"`).join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Set filename
    const filename = `attendance-export-${startDate || 'all'}-to-${endDate || 'all'}-${Date.now()}.csv`;

    // Return CSV response
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    logger.error('Export attendance error', error);
    return NextResponse.json(
      { error: 'Failed to export attendance data' },
      { status: 500 }
    );
  }
}
