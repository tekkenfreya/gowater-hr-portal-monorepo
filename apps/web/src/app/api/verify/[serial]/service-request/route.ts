import { NextRequest, NextResponse } from 'next/server';
import { getUnitsService } from '@/lib/units';
import { serviceRequestSchema } from '@/lib/validations/units';
import { logger } from '@/lib/logger';

const SERIAL_PATTERN = /^[a-zA-Z0-9\-_]+$/;

export async function POST(
  request: NextRequest,
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

    const body: unknown = await request.json();
    const parsed = serviceRequestSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return NextResponse.json(
        { error: firstError?.message ?? 'Invalid request body' },
        { status: 400 }
      );
    }

    const input = {
      customerName: parsed.data.customerName.trim(),
      contactNumber: parsed.data.contactNumber.trim(),
      email: parsed.data.email?.trim() || undefined,
      issueDescription: parsed.data.issueDescription.trim(),
    };

    const unitsService = getUnitsService();
    const unit = await unitsService.getUnitBySerial(serial);

    if (!unit) {
      return NextResponse.json(
        { error: 'Unit not found' },
        { status: 404 }
      );
    }

    const result = await unitsService.createServiceRequest(unit.id, input);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? 'Failed to create service request' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, requestId: result.requestId },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Create service request API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
