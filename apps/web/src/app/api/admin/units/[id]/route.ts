import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isAdmin } from '@/lib/authHelper';
import { getUnitsService } from '@/lib/units';
import { updateUnitSchema } from '@/lib/validations/units';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdmin(auth)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const unitId = parseInt(id, 10);
    if (isNaN(unitId)) {
      return NextResponse.json({ error: 'Invalid unit ID' }, { status: 400 });
    }

    const unitsService = getUnitsService();
    const unit = await unitsService.getUnitById(unitId);

    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    const { requests } = await unitsService.getServiceRequests({ unitId });

    return NextResponse.json({ success: true, unit, serviceRequests: requests });
  } catch (error) {
    logger.error('Get unit detail API error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdmin(auth)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const unitId = parseInt(id, 10);
    if (isNaN(unitId)) {
      return NextResponse.json({ error: 'Invalid unit ID' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateUnitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const unitsService = getUnitsService();
    const result = await unitsService.updateUnit(unitId, parsed.data);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    logger.audit('Unit updated', auth.userId!, {
      unitId,
      updates: Object.keys(parsed.data),
    });

    return NextResponse.json({ success: true, unit: result.unit });
  } catch (error) {
    logger.error('Update unit API error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdmin(auth)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const unitId = parseInt(id, 10);
    if (isNaN(unitId)) {
      return NextResponse.json({ error: 'Invalid unit ID' }, { status: 400 });
    }

    const unitsService = getUnitsService();
    const result = await unitsService.deleteUnit(unitId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    logger.audit('Unit deleted', auth.userId!, { unitId });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Delete unit API error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
