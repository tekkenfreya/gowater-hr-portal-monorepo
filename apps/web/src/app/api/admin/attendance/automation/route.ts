import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getAttendanceAutomationService } from '@/lib/attendanceAutomation';
import { getPermissionsService } from '@/lib/permissions';
import { logger } from '@/lib/logger';
import { AttendanceAutomationFormData } from '@/types/attendance';

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

/**
 * GET /api/admin/attendance/automation
 * Get automation settings for a user or global settings
 * Query params:
 * - userId (optional): specific user ID, if not provided returns global settings
 * - effective (optional): if true, returns effective settings for user (with fallback to global)
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
    const userId = searchParams.get('userId') ? parseInt(searchParams.get('userId')!) : undefined;
    const effective = searchParams.get('effective') === 'true';

    const automationService = getAttendanceAutomationService();

    let settings;
    if (effective && userId) {
      settings = await automationService.getEffectiveSettings(userId);
    } else {
      settings = await automationService.getAutomationSettings(userId);
    }

    if (!settings) {
      return NextResponse.json(
        { error: 'No automation settings found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      settings
    });
  } catch (error) {
    logger.error('Get automation settings error', error);
    return NextResponse.json(
      { error: 'Failed to fetch automation settings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/attendance/automation
 * Create or update automation settings
 * Body:
 * - userId (optional): null for global settings, number for user-specific
 * - settings: AttendanceAutomationFormData
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
    const { userId, settings } = body as {
      userId: number | null;
      settings: AttendanceAutomationFormData;
    };

    // Validate settings
    if (!settings) {
      return NextResponse.json(
        { error: 'Settings are required' },
        { status: 400 }
      );
    }

    // Validate time formats (HH:mm)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

    if (settings.autoCheckInTime && !timeRegex.test(settings.autoCheckInTime)) {
      return NextResponse.json(
        { error: 'Invalid check-in time format. Use HH:mm (e.g., 09:00)' },
        { status: 400 }
      );
    }

    if (settings.autoCheckOutTime && !timeRegex.test(settings.autoCheckOutTime)) {
      return NextResponse.json(
        { error: 'Invalid check-out time format. Use HH:mm (e.g., 18:00)' },
        { status: 400 }
      );
    }

    if (settings.autoBreakStartTime && !timeRegex.test(settings.autoBreakStartTime)) {
      return NextResponse.json(
        { error: 'Invalid break start time format. Use HH:mm (e.g., 12:00)' },
        { status: 400 }
      );
    }

    // Validate work days
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    if (!settings.workDays || settings.workDays.length === 0) {
      return NextResponse.json(
        { error: 'At least one work day is required' },
        { status: 400 }
      );
    }

    for (const day of settings.workDays) {
      if (!validDays.includes(day)) {
        return NextResponse.json(
          { error: `Invalid work day: ${day}` },
          { status: 400 }
        );
      }
    }

    const automationService = getAttendanceAutomationService();
    const result = await automationService.updateAutomationSettings(userId, settings);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update automation settings' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: userId ? 'User automation settings updated' : 'Global automation settings updated'
    });
  } catch (error) {
    logger.error('Update automation settings error', error);
    return NextResponse.json(
      { error: 'Failed to update automation settings' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/attendance/automation
 * Enable or disable automation for a user
 * Body:
 * - userId: number | null
 * - enabled: boolean
 * Admin only
 */
export async function PATCH(request: NextRequest) {
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
    const { userId, enabled } = body as {
      userId: number | null;
      enabled: boolean;
    };

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled field is required and must be boolean' },
        { status: 400 }
      );
    }

    const automationService = getAttendanceAutomationService();
    const result = await automationService.enableAutomation(userId, enabled);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update automation status' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Automation ${enabled ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    logger.error('Enable automation error', error);
    return NextResponse.json(
      { error: 'Failed to update automation status' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/attendance/automation
 * Delete user-specific automation settings (revert to global)
 * Query param: userId
 * Admin only
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
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const automationService = getAttendanceAutomationService();
    const result = await automationService.deleteAutomationSettings(parseInt(userId));

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete automation settings' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Automation settings deleted. User will now use global settings.'
    });
  } catch (error) {
    logger.error('Delete automation settings error', error);
    return NextResponse.json(
      { error: 'Failed to delete automation settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/attendance/automation
 * Apply global settings to all users or specific user
 * Body:
 * - userId (optional): if provided, apply to specific user; otherwise apply to all
 * Admin only
 */
export async function PUT(request: NextRequest) {
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
    const { userId } = body as { userId?: number };

    const automationService = getAttendanceAutomationService();

    if (userId) {
      // Apply to specific user
      const result = await automationService.applyGlobalSettingsToUser(userId);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to apply settings' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Global settings applied to user successfully'
      });
    } else {
      // Apply to all users
      const result = await automationService.applyGlobalSettingsToAllUsers();

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to apply settings' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Global settings applied to ${result.applied} users. ${result.failed} failed.`,
        applied: result.applied,
        failed: result.failed
      });
    }
  } catch (error) {
    logger.error('Apply global settings error', error);
    return NextResponse.json(
      { error: 'Failed to apply global settings' },
      { status: 500 }
    );
  }
}
