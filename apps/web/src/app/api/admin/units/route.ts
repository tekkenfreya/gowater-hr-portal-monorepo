import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/authHelper';
import { hasUnitManageAccess } from '@/lib/stealthAccess';
import { getUnitsService } from '@/lib/units';
import { createUnitSchema } from '@/lib/validations/units';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? undefined;
    const unitType = searchParams.get('type') ?? undefined;
    const search = searchParams.get('search') ?? undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20));

    const unitsService = getUnitsService();
    const { units, total } = await unitsService.getAllUnits({
      status,
      unitType,
      search,
      page,
      limit,
    });

    return NextResponse.json({ success: true, units, total });
  } catch (error) {
    logger.error('List units API error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasUnitManageAccess(auth.role, auth.email)) {
      return NextResponse.json({ error: 'Only admins or authorized users can create units' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createUnitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const unitsService = getUnitsService();
    const result = await unitsService.createUnit(parsed.data, auth.userId!);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    logger.audit('Unit created', auth.userId!, {
      unitId: result.unit!.id,
      serialNumber: result.unit!.serialNumber,
    });

    return NextResponse.json({ success: true, unit: result.unit }, { status: 201 });
  } catch (error) {
    logger.error('Create unit API error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
