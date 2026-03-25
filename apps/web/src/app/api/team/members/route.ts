import { NextRequest, NextResponse } from 'next/server';
import { getAuthService } from '@/lib/auth';
import { getDb } from '@/lib/supabase';
import { getPhilippineDateString } from '@/lib/timezone';

/**
 * GET /api/team/members
 * Get all team members with today's attendance status (available to all authenticated users)
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user is authenticated
    const authService = getAuthService();
    const user = await authService.verifyToken(token);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get all active users with today's attendance status
    const db = getDb();
    const today = getPhilippineDateString();

    const query = `
      SELECT
        u.id, u.email, u.name, u.role, u.department, u.position,
        u.employee_name, u.employee_id, u.avatar,
        a.check_in_time,
        a.check_out_time,
        a.break_start_time,
        a.break_end_time
      FROM users u
      LEFT JOIN attendance a ON u.id = a.user_id AND a.date = $1
      WHERE u.status = 'active'
      ORDER BY u.name ASC
    `;

    const results = await db.executeRawSQL(query, [today]);

    // Map to user objects with attendance status
    const users = results.map((r: {
      id: number;
      email: string;
      name: string;
      role: string;
      department?: string;
      position?: string;
      employee_name?: string;
      employee_id?: string;
      avatar?: string;
      check_in_time?: string;
      check_out_time?: string;
      break_start_time?: string;
      break_end_time?: string;
    }) => {
      const hasCheckedIn = !!r.check_in_time;
      const hasCheckedOut = !!r.check_out_time;
      const isOnBreak = !!r.break_start_time && !r.break_end_time;
      const isWorking = hasCheckedIn && !hasCheckedOut && !isOnBreak;

      return {
        id: r.id,
        email: r.email,
        name: r.name,
        role: r.role,
        department: r.department,
        position: r.position,
        employeeName: r.employee_name,
        employeeId: r.employee_id,
        avatar: r.avatar,
        isWorking,
        isOnBreak,
        checkInTime: r.check_in_time
      };
    });

    return NextResponse.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Get team members error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}
