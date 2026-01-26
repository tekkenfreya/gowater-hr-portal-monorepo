import { NextResponse } from 'next/server';
import { getDb } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export async function POST() {
  try {
    logger.info('Starting user migration - setting status to active...');

    const db = getDb();
    await db.initialize();

    // Update all users that don't have a status or have NULL status to 'active'
    const result = await db.executeRawSQL(`
      UPDATE users
      SET status = 'active', updated_at = CURRENT_TIMESTAMP
      WHERE status IS NULL OR status = ''
    `);

    logger.info('Migration result:', result);

    // Verify the update
    const allUsers = await db.all('users', {});
    logger.debug('All users after migration:', allUsers);

    return NextResponse.json({
      message: 'Users migrated successfully',
      timestamp: new Date().toISOString(),
      usersUpdated: result
    });
  } catch (error) {
    logger.error('User migration error', error);
    return NextResponse.json(
      { error: 'Failed to migrate users', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to migrate users and set status to active',
    endpoint: '/api/migrate-users'
  });
}
