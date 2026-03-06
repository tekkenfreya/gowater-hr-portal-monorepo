import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isAdmin } from '@/lib/authHelper';
import { getUnitsService } from '@/lib/units';
import { logger } from '@/lib/logger';
import type { BulkImportRow } from '@/types/units';

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdmin(auth)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const rows = body.rows as BulkImportRow[] | undefined;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: 'Request body must include a non-empty "rows" array' },
        { status: 400 }
      );
    }

    if (rows.length > 500) {
      return NextResponse.json(
        { error: 'Maximum 500 rows per import' },
        { status: 400 }
      );
    }

    const unitsService = getUnitsService();
    const result = await unitsService.bulkCreateUnits(rows, auth.userId!);

    logger.audit('Bulk unit import', auth.userId!, {
      created: result.created,
      errorCount: result.errors.length,
    });

    return NextResponse.json({
      success: true,
      created: result.created,
      errors: result.errors,
    });
  } catch (error) {
    logger.error('Bulk import units API error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
