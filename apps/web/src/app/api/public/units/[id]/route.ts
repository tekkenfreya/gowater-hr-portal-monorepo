import { NextRequest, NextResponse } from 'next/server';
import { getUnitsService } from '@/lib/units';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Public, unauthenticated endpoint for QR-code scans.
 * Returns a filtered subset of unit fields — excludes internal notes,
 * creator/verifier IDs, and the updated_at audit field.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const unitId = parseInt(id, 10);
    if (isNaN(unitId)) {
      return NextResponse.json({ error: 'Invalid unit ID' }, { status: 400 });
    }

    const unit = await getUnitsService().getUnitById(unitId);
    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    const publicUnit = {
      id: unit.id,
      serialNumber: unit.serialNumber,
      unitType: unit.unitType,
      modelName: unit.modelName,
      destination: unit.destination,
      status: unit.status,
      dispatchedAt: unit.dispatchedAt,
      verifiedAt: unit.verifiedAt,
      verifiedByName: unit.verifiedByName,
      createdAt: unit.createdAt,
      notes: null,
      createdBy: 0,
      updatedAt: unit.updatedAt,
    };

    return NextResponse.json(
      { unit: publicUnit },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, must-revalidate',
        },
      },
    );
  } catch (error) {
    logger.error('Public unit info API error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
