import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, hasScope } from '@/lib/authHelper';
import { getDb } from '@/lib/supabase';
import { logger } from '@/lib/logger';

/**
 * POST /api/attendance/slack-thread
 *
 * Called by n8n after posting the check-in message to Slack.
 * Saves the Slack message `ts` so subsequent events (break, checkout)
 * can thread their replies under the original check-in message.
 *
 * Body: { userId: number, date: string, slackThreadTs: string }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    if (!hasScope(auth, 'write')) {
      return NextResponse.json({ error: 'Insufficient scope' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, date, slackThreadTs } = body;

    if (!userId || !date || !slackThreadTs) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, date, slackThreadTs' },
        { status: 400 }
      );
    }

    const db = getDb();
    const record = await db.get('attendance', { user_id: userId, date });

    if (!record) {
      return NextResponse.json(
        { error: 'No attendance record found for this user and date' },
        { status: 404 }
      );
    }

    await db.update(
      'attendance',
      { slack_thread_ts: slackThreadTs, updated_at: new Date() },
      { id: record.id }
    );

    logger.info('Slack thread ts saved', { userId, date, slackThreadTs });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Save slack thread ts error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
