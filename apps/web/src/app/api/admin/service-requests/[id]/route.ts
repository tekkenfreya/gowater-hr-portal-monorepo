import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isAdmin } from '@/lib/authHelper';
import { getUnitsService } from '@/lib/units';
import { logger } from '@/lib/logger';

const VALID_STATUSES = ['in_progress', 'resolved'] as const;
type UpdateStatus = typeof VALID_STATUSES[number];

function isValidStatus(value: string): value is UpdateStatus {
  return (VALID_STATUSES as readonly string[]).includes(value);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    if (!isAdmin(auth)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const requestId = parseInt(id, 10);
    if (isNaN(requestId)) {
      return NextResponse.json(
        { error: 'Invalid request ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status } = body as { status?: string };

    if (!status || !isValidStatus(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: in_progress, resolved' },
        { status: 400 }
      );
    }

    const updates: { status: string; resolvedBy?: number } = { status };

    if (status === 'resolved' && auth.userId) {
      updates.resolvedBy = auth.userId;
    }

    const unitsService = getUnitsService();
    const result = await unitsService.updateServiceRequest(requestId, updates);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    logger.audit('Service request updated', auth.userId!, {
      requestId,
      newStatus: status,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Admin update service request error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
