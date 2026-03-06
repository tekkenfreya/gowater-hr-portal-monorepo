import { NextRequest, NextResponse } from 'next/server';
import { getUnitsService } from '@/lib/units';
import { logger } from '@/lib/logger';

const SERIAL_PATTERN = /^[a-zA-Z0-9\-_]+$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ serial: string }> }
) {
  try {
    const resolvedParams = await params;
    const serial = resolvedParams.serial.trim();

    if (!serial || serial.length > 100 || !SERIAL_PATTERN.test(serial)) {
      return NextResponse.json(
        { error: 'Invalid serial number format' },
        { status: 400 }
      );
    }

    const unitsService = getUnitsService();
    const result = await unitsService.verifyUnit(serial);

    if (!result.found) {
      return NextResponse.json({
        found: false,
        message: 'This unit is not registered in our system',
      });
    }

    if (result.status === 'decommissioned') {
      return NextResponse.json({
        found: true,
        status: result.status,
        unitType: result.unitType,
        modelName: result.modelName,
        message: 'This unit has been retired',
      });
    }

    return NextResponse.json({
      found: true,
      status: result.status,
      unitType: result.unitType,
      modelName: result.modelName,
      dispatchedAt: result.dispatchedAt,
      message: 'This is a genuine GoWater unit',
    });
  } catch (error) {
    logger.error('Verify unit API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
