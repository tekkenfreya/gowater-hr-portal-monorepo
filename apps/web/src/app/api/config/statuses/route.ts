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

interface StatusConfig {
  id: number;
  status_key: string;
  display_name: string;
  display_tag: string | null;
  color_class: string | null;
  sort_order: number;
  is_active: boolean;
  entity_type: string;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/config/statuses
 * Get all status configurations or filter by entity_type
 * Query params: entity_type (optional) - e.g., 'task', 'subtask', 'report'
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entity_type');

    const db = getDb();

    let statuses: StatusConfig[];

    if (entityType) {
      // Filter by entity type
      statuses = await db.all(
        'status_config',
        { entity_type: entityType, is_active: true },
        'sort_order'
      ) as StatusConfig[];
    } else {
      // Get all active statuses
      statuses = await db.all(
        'status_config',
        { is_active: true },
        'entity_type, sort_order'
      ) as StatusConfig[];
    }

    return NextResponse.json({
      statuses,
      message: 'Status configurations fetched successfully'
    });
  } catch (error) {
    logger.error('Error fetching status config', error);
    return NextResponse.json(
      { error: 'Failed to fetch status configurations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/config/statuses
 * Create a new status configuration (admin only)
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
    const { status_key, display_name, display_tag, color_class, sort_order, entity_type } = body;

    // Validation
    if (!status_key || !display_name || !entity_type) {
      return NextResponse.json(
        { error: 'Missing required fields: status_key, display_name, entity_type' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if status_key already exists
    const existing = await db.get('status_config', { status_key });
    if (existing) {
      return NextResponse.json(
        { error: 'Status key already exists' },
        { status: 409 }
      );
    }

    // Insert new status config
    const newStatus = {
      status_key,
      display_name,
      display_tag: display_tag || null,
      color_class: color_class || null,
      sort_order: sort_order || 0,
      is_active: true,
      entity_type,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.insert('status_config', newStatus as Record<string, unknown>);

    return NextResponse.json({
      status: newStatus,
      message: 'Status configuration created successfully'
    }, { status: 201 });
  } catch (error) {
    logger.error('Error creating status config', error);
    return NextResponse.json(
      { error: 'Failed to create status configuration' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/config/statuses
 * Update a status configuration (admin only)
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
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Status config ID is required' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Add updated_at timestamp
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    await db.update('status_config', updateData, { id });

    return NextResponse.json({
      message: 'Status configuration updated successfully'
    });
  } catch (error) {
    logger.error('Error updating status config', error);
    return NextResponse.json(
      { error: 'Failed to update status configuration' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/config/statuses
 * Soft delete a status configuration (admin only)
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
        { error: 'Status config ID is required' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Soft delete by setting is_active = false
    await db.update('status_config', {
      is_active: false,
      updated_at: new Date().toISOString(),
    }, { id: parseInt(id) });

    return NextResponse.json({
      message: 'Status configuration deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting status config', error);
    return NextResponse.json(
      { error: 'Failed to delete status configuration' },
      { status: 500 }
    );
  }
}
