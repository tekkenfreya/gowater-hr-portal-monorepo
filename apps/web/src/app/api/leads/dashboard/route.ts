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

    // Check permission to access analytics
    const permissionsService = getPermissionsService();
    const hasPermission = await permissionsService.hasPermission(decoded.userId, 'can_view_analytics');

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to access dashboard analytics' },
        { status: 403 }
      );
    }

    const leadService = getLeadService();
    const stats = await leadService.getDashboardStats();

    return NextResponse.json({ stats, message: 'Dashboard stats fetched successfully' });
  } catch (error) {
    logger.error('Error fetching dashboard stats', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
