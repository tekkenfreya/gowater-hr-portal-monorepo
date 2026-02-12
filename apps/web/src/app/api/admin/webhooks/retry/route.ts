import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getWebhookService } from '@/lib/webhooks';
import { logger } from '@/lib/logger';

// ============================================================
// WEBHOOK MANUAL RETRY ENDPOINT
// ============================================================
// POST /api/admin/webhooks/retry
//
// Re-sends a previously failed webhook delivery using the
// stored payload from the log entry. Admins use this to
// manually recover from transient failures without waiting
// for the next event.
//
// Example request:
//   POST /api/admin/webhooks/retry
//   { "logId": 42 }
//
// Example response:
//   { "success": true, "statusCode": 200 }
// ============================================================

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

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
    const { logId } = body;

    if (!logId) {
      return NextResponse.json({ error: 'Log ID is required' }, { status: 400 });
    }

    const webhookService = getWebhookService();
    const result = await webhookService.retryDelivery(logId);

    return NextResponse.json({
      success: result.success,
      statusCode: result.statusCode,
      error: result.error
    });
  } catch (error) {
    logger.error('Webhook retry API error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
