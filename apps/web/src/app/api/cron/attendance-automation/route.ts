import { NextRequest, NextResponse } from 'next/server';
import { getAttendanceAutomationService } from '@/lib/attendanceAutomation';
import { logger } from '@/lib/logger';

/**
 * POST /api/cron/attendance-automation
 * Execute automated attendance actions
 *
 * This endpoint should be called by a cron service every minute
 * to process automated check-ins, check-outs, and breaks
 *
 * Security: This endpoint should be protected by:
 * 1. Authorization header with CRON_SECRET
 * 2. Or using Vercel Cron configuration
 * 3. Or IP whitelist for external cron services
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (for security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // If CRON_SECRET is set, require authorization
    if (cronSecret) {
      if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
        logger.warn('Unauthorized cron attempt', {
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        });
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Get current time in Philippine timezone
    const currentTime = new Date();

    logger.info('Running attendance automation cron', {
      time: currentTime.toISOString(),
      hour: currentTime.getHours(),
      minute: currentTime.getMinutes()
    });

    // Execute automation
    const automationService = getAttendanceAutomationService();
    const results = await automationService.processAutomatedAttendance(currentTime);

    // Log results
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    logger.info('Attendance automation completed', {
      total: results.length,
      successful: successCount,
      failed: failedCount,
      results: results.map(r => ({
        userId: r.userId,
        action: r.action,
        success: r.success,
        error: r.error
      }))
    });

    return NextResponse.json({
      success: true,
      timestamp: currentTime.toISOString(),
      processed: results.length,
      successful: successCount,
      failed: failedCount,
      results: results.map(r => ({
        userId: r.userId,
        action: r.action,
        success: r.success,
        error: r.error
      }))
    });
  } catch (error) {
    logger.error('Attendance automation cron error', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute attendance automation',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/attendance-automation
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Attendance automation cron endpoint is active',
    timestamp: new Date().toISOString()
  });
}
