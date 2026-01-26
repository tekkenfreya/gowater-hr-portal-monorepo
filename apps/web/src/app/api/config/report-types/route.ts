import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getDb } from '@/lib/supabase';
import { logger } from '@/lib/logger';

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
  name: string;
}

interface ReportTypeConfig {
  id: number;
  type_key: string;
  display_name: string;
  description: string | null;
  filter_logic: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/config/report-types
 * Get all report type configurations
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    const db = getDb();

    // Get all active report types
    const reportTypes = await db.all(
      'report_type_config',
      { is_active: true },
      'type_key'
    ) as ReportTypeConfig[];

    // Parse filter_logic JSON strings to objects
    const parsedReportTypes = reportTypes.map(rt => ({
      ...rt,
      filter_logic: typeof rt.filter_logic === 'string'
        ? JSON.parse(rt.filter_logic as string)
        : rt.filter_logic
    }));

    return NextResponse.json({
      reportTypes: parsedReportTypes,
      message: 'Report type configurations fetched successfully'
    });
  } catch (error) {
    logger.error('Error fetching report type config', error);
    return NextResponse.json(
      { error: 'Failed to fetch report type configurations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/config/report-types
 * Create a new report type configuration (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    // Check if user is admin
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { type_key, display_name, description, filter_logic } = body;

    // Validation
    if (!type_key || !display_name) {
      return NextResponse.json(
        { error: 'Missing required fields: type_key, display_name' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if type_key already exists
    const existing = await db.get('report_type_config', { type_key });
    if (existing) {
      return NextResponse.json(
        { error: 'Report type key already exists' },
        { status: 409 }
      );
    }

    // Insert new report type config
    const newReportType = {
      type_key,
      display_name,
      description: description || null,
      filter_logic: filter_logic ? JSON.stringify(filter_logic) : null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.insert('report_type_config', newReportType as Record<string, unknown>);

    return NextResponse.json({
      reportType: {
        ...newReportType,
        filter_logic: filter_logic || null
      },
      message: 'Report type configuration created successfully'
    }, { status: 201 });
  } catch (error) {
    logger.error('Error creating report type config', error);
    return NextResponse.json(
      { error: 'Failed to create report type configuration' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/config/report-types
 * Update a report type configuration (admin only)
 */
export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    // Check if user is admin
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { id, filter_logic, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Report type config ID is required' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Prepare update data
    const updateData: Record<string, unknown> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Handle filter_logic separately (needs JSON stringification)
    if (filter_logic !== undefined) {
      updateData.filter_logic = JSON.stringify(filter_logic);
    }

    await db.update('report_type_config', updateData, { id });

    return NextResponse.json({
      message: 'Report type configuration updated successfully'
    });
  } catch (error) {
    logger.error('Error updating report type config', error);
    return NextResponse.json(
      { error: 'Failed to update report type configuration' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/config/report-types
 * Soft delete a report type configuration (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    // Check if user is admin
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Report type config ID is required' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Soft delete by setting is_active = false
    await db.update('report_type_config', {
      is_active: false,
      updated_at: new Date().toISOString(),
    }, { id: parseInt(id) });

    return NextResponse.json({
      message: 'Report type configuration deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting report type config', error);
    return NextResponse.json(
      { error: 'Failed to delete report type configuration' },
      { status: 500 }
    );
  }
}
