import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getDb } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { hasStealthAttendanceAccess } from '@/lib/stealthAccess';

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

interface InternSummaryRow {
  id: number;
  name: string | null;
  employee_name: string | null;
  employee_id: string | null;
  department: string | null;
  position: string | null;
  hire_date: string | null;
  avatar: string | null;
  days_worked: string | number;
  total_hours: string | number | null;
  last_check_in: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    if (decoded.role !== 'admin' && !hasStealthAttendanceAccess(decoded.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getDb();

    const rows = await db.executeRawSQL<InternSummaryRow>(
      `SELECT
         u.id,
         u.name,
         u.employee_name,
         u.employee_id,
         u.department,
         u.position,
         u.hire_date,
         u.avatar,
         COALESCE(COUNT(DISTINCT a.date) FILTER (WHERE a.total_hours > 0), 0) AS days_worked,
         COALESCE(SUM(a.total_hours), 0) AS total_hours,
         MAX(a.check_in_time) AS last_check_in
       FROM users u
       LEFT JOIN attendance a
         ON a.user_id = u.id
         AND (u.hire_date IS NULL OR a.date >= u.hire_date)
       WHERE u.role = 'intern' AND u.status = 'active'
       GROUP BY u.id
       ORDER BY total_hours DESC, u.name ASC`
    );

    const interns = rows.map((r) => ({
      id: r.id,
      name: r.employee_name || r.name || '',
      employeeId: r.employee_id,
      department: r.department,
      position: r.position,
      hireDate: r.hire_date,
      avatar: r.avatar,
      daysWorked: Number(r.days_worked) || 0,
      totalHours: Math.round((Number(r.total_hours) || 0) * 10) / 10,
      lastCheckIn: r.last_check_in,
    }));

    const aggregate = interns.reduce(
      (acc, intern) => {
        acc.totalHours += intern.totalHours;
        acc.totalDays += intern.daysWorked;
        return acc;
      },
      { totalInterns: interns.length, totalHours: 0, totalDays: 0 }
    );

    aggregate.totalHours = Math.round(aggregate.totalHours * 10) / 10;

    return NextResponse.json({ success: true, interns, aggregate });
  } catch (error) {
    logger.error('Interns summary API error', error);
    return NextResponse.json({ error: 'Failed to fetch interns summary' }, { status: 500 });
  }
}
