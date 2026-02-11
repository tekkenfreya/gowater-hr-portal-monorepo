import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getWebhookService } from '@/lib/webhooks';
import { logger } from '@/lib/logger';

// ============================================================
// WEBHOOK TEST ENDPOINT
// ============================================================
// POST /api/admin/webhooks/test
//
// Sends a test event to a specific webhook to verify it's
// reachable and responding correctly. Used by admins when
// setting up a new integration.
//
// Returns the HTTP status code and response body from the
// target URL so the admin can debug connection issues.
//
// Example request:
//   POST /api/admin/webhooks/test
//   { "webhookId": 5 }
//
// Example response:
//   { "success": true, "statusCode": 200, "responseBody": "OK" }
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
    const { webhookId } = body;

    if (!webhookId) {
      return NextResponse.json({ error: 'Webhook ID is required' }, { status: 400 });
    }

    const webhookService = getWebhookService();
    const result = await webhookService.testWebhook(webhookId);

    return NextResponse.json({
      success: result.success,
      statusCode: result.statusCode,
      responseBody: result.responseBody,
      error: result.error,
      message: result.success
        ? 'Webhook test successful'
        : `Webhook test failed: ${result.error}`
    });
  } catch (error) {
    logger.error('Test webhook API error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
