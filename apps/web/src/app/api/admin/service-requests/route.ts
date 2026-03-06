import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isAdmin } from '@/lib/authHelper';
import { getUnitsService } from '@/lib/units';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(auth)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));

    const unitsService = getUnitsService();
    const { requests, total } = await unitsService.getServiceRequests({
      status,
      page,
      limit,
    });

    return NextResponse.json({ success: true, requests, total });
  } catch (error) {
    logger.error('Admin get service requests error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
