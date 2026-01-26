import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getLeadService } from '@/lib/leads';
import { getPermissionsService } from '@/lib/permissions';
import { logger } from '@/lib/logger';

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
  name: string;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    // Check permission to access activity monitor
    const permissionsService = getPermissionsService();
    const hasPermission = await permissionsService.hasPermission(decoded.userId, 'can_view_activity_monitor');

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to access activity monitor' },
        { status: 403 }
      );
    }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const staleDaysThreshold = parseInt(searchParams.get('staleDaysThreshold') || '30');
    const activityLimit = parseInt(searchParams.get('activityLimit') || '50');

    const leadService = getLeadService();

    // Fetch all activity monitor data
    const [
      employeeBreakdown,
      recentActivities,
      staleLeadsData,
      assignmentOverview
    ] = await Promise.all([
      leadService.getEmployeeActivityBreakdown(startDate, endDate),
      leadService.getRecentActivitiesForAllLeads(activityLimit),
      leadService.getStaleLeads(staleDaysThreshold),
      leadService.getLeadAssignmentOverview(),
    ]);

    // Calculate summary stats
    const totalActivities = employeeBreakdown.reduce((sum, emp) => sum + emp.total_activities, 0);
    const activitiesToday = employeeBreakdown.reduce((sum, emp) => sum + emp.activities_today, 0);
    const activeEmployees = employeeBreakdown.filter(emp => emp.total_activities > 0).length;

    const data = {
      summary: {
        total_activities: totalActivities,
        activities_today: activitiesToday,
        active_employees: activeEmployees,
        total_employees: employeeBreakdown.length,
        stale_leads_count: staleLeadsData.total_stale,
      },
      employee_breakdown: employeeBreakdown,
      recent_activities: recentActivities,
      stale_leads: staleLeadsData,
      assignment_overview: assignmentOverview,
    };

    return NextResponse.json({
      data,
      message: 'Activity monitor data fetched successfully',
      filters: {
        startDate,
        endDate,
        staleDaysThreshold,
        activityLimit,
      }
    });
  } catch (error) {
    logger.error('Error fetching activity monitor data', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity monitor data' },
      { status: 500 }
    );
  }
}
