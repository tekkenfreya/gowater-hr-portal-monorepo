import { NextRequest, NextResponse } from 'next/server';
import { getUnitsService } from '@/lib/units';
import { logger } from '@/lib/logger';

const SERIAL_PATTERN = /^[a-zA-Z0-9\-_]+$/;

interface RouteParams {
  params: Promise<{ serial: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
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
    const unit = await unitsService.getUnitBySerial(serial);

    if (!unit) {
      return NextResponse.json({
        found: false,
        message: 'This unit is not registered in our system',
      });
    }

    if (unit.status === 'decommissioned') {
      return NextResponse.json({
        found: true,
        status: unit.status,
        unitType: unit.unitType,
        modelName: unit.modelName,
        message: 'This unit has been retired',
      });
    }

    return NextResponse.json({
      found: true,
      status: unit.status,
      unitType: unit.unitType,
      modelName: unit.modelName,
      dispatchedAt: unit.dispatchedAt,
      message: unit.status === 'verified'
        ? 'This unit has already been verified as authentic.'
        : 'This is a genuine GoWater unit',
    });
  } catch (error) {
    logger.error('Verify unit API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
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

    const body = await request.json().catch(() => ({})) as { customerName?: string };

    const unitsService = getUnitsService();
    const result = await unitsService.verifyUnit(serial, body.customerName);

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Confirm verification API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
