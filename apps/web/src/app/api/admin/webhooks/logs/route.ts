import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getWebhookService } from '@/lib/webhooks';
import { logger } from '@/lib/logger';

// ============================================================
// WEBHOOK DELIVERY LOGS ENDPOINT
// ============================================================
// GET /api/admin/webhooks/logs
//
// Returns a paginated list of webhook delivery attempts.
// Each log entry shows: which webhook was called, what event
// triggered it, the HTTP response status, timing info, and
// any error messages.
//
// This is the primary debugging tool when a Zapier zap or
// n8n workflow stops receiving events.
//
// QUERY PARAMETERS:
//   webhookId  - Filter by specific webhook (optional)
//   event      - Filter by event name (optional)
//   success    - Filter by success status: "true" or "false" (optional)
//   startDate  - ISO date string, logs after this date (optional)
//   endDate    - ISO date string, logs before this date (optional)
//   page       - Page number, default 1 (optional)
//   limit      - Items per page, default 50 (optional)
//
// Example:
//   GET /api/admin/webhooks/logs?webhookId=5&success=false&page=1
// ============================================================

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

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

    const { searchParams } = new URL(request.url);

    const filters = {
      webhookId: searchParams.get('webhookId')
        ? parseInt(searchParams.get('webhookId')!)
        : undefined,
      event: searchParams.get('event') || undefined,
      success: searchParams.get('success') !== null
        ? searchParams.get('success') === 'true'
        : undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      page: searchParams.get('page')
        ? parseInt(searchParams.get('page')!)
        : 1,
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!)
        : 50
    };

    const webhookService = getWebhookService();
    const result = await webhookService.getWebhookLogs(filters);

    return NextResponse.json({
      ...result,
      message: 'Webhook logs retrieved successfully'
    });
  } catch (error) {
    logger.error('Get webhook logs API error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
