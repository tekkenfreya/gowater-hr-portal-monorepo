import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getWebhookService } from '@/lib/webhooks';
import { logger } from '@/lib/logger';

// ============================================================
// WEBHOOK MANAGEMENT API ROUTES
// ============================================================
// Admin-only endpoints for creating, listing, updating, and
// deleting webhook subscriptions.
//
// These are used by the admin dashboard to manage integrations.
// The actual webhook deliveries happen automatically when events
// fire inside other services (attendance, tasks, etc.).
//
// ENDPOINTS:
//   GET    /api/admin/webhooks          - List all webhooks
//   POST   /api/admin/webhooks          - Create new webhook
//   PUT    /api/admin/webhooks          - Update existing webhook
//   DELETE /api/admin/webhooks?id=123   - Delete a webhook
// ============================================================

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

// ----------------------------------------------------------
// GET: List all webhook subscriptions
// ----------------------------------------------------------
// Returns all webhooks with their event subscriptions.
// Admin-only because webhooks can contain sensitive URLs/secrets.
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const webhookService = getWebhookService();
    const webhooks = await webhookService.getWebhooks();

    return NextResponse.json({
      webhooks,
      message: 'Webhooks retrieved successfully'
    });
  } catch (error) {
    logger.error('Get webhooks API error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ----------------------------------------------------------
// POST: Create a new webhook subscription
// ----------------------------------------------------------
// Admin provides: name, URL, events to subscribe to, and
// optionally a shared secret for HMAC signature verification.
//
// Example request body:
// {
//   "name": "n8n Attendance Alerts",
//   "url": "https://your-n8n.com/webhook/abc123",
//   "events": ["attendance.checked_in", "attendance.checked_out"],
//   "secret": "my-shared-secret-for-hmac",
//   "headers": { "X-Custom-Header": "value" }
// }
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, url, events, secret, headers } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Webhook name is required' }, { status: 400 });
    }
    if (!url?.trim()) {
      return NextResponse.json({ error: 'Webhook URL is required' }, { status: 400 });
    }
    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'At least one event is required' }, { status: 400 });
    }

    const webhookService = getWebhookService();
    const result = await webhookService.createWebhook(decoded.userId, {
      name,
      url,
      events,
      secret,
      headers
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      webhook: result.webhook,
      message: 'Webhook created successfully'
    });
  } catch (error) {
    logger.error('Create webhook API error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ----------------------------------------------------------
// PUT: Update an existing webhook
// ----------------------------------------------------------
// Can update any field: name, url, events, secret, headers,
// is_active. Partial updates are supported.
export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Webhook ID is required' }, { status: 400 });
    }

    const webhookService = getWebhookService();
    const result = await webhookService.updateWebhook(id, updateData);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ message: 'Webhook updated successfully' });
  } catch (error) {
    logger.error('Update webhook API error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ----------------------------------------------------------
// DELETE: Remove a webhook and all its delivery logs
// ----------------------------------------------------------
// Logs are cascade-deleted thanks to ON DELETE CASCADE in the schema.
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const url = new URL(request.url);
    const webhookId = url.searchParams.get('id');

    if (!webhookId) {
      return NextResponse.json({ error: 'Webhook ID is required' }, { status: 400 });
    }

    const webhookService = getWebhookService();
    const result = await webhookService.deleteWebhook(parseInt(webhookId));

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ message: 'Webhook deleted successfully' });
  } catch (error) {
    logger.error('Delete webhook API error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
