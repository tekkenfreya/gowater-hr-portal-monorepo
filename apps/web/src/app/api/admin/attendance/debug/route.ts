import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/supabase';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/attendance/debug
 * Debug endpoint to check attendance data
 */
export async function GET(request: NextRequest) {
  const db = getDb();
  const debugInfo: Record<string, unknown> = {};

  try {
    // Step 1: Check total records
    logger.info('Debug: Checking total records');
    const totalQuery = 'SELECT COUNT(*) as total FROM attendance';
    const totalResult = await db.executeRawSQL(totalQuery, []);
    debugInfo.step1_total = { success: true, result: totalResult[0] };
  } catch (error) {
    logger.error('Debug step 1 failed', error);
    debugInfo.step1_total = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      errorType: typeof error,
      errorDetails: JSON.stringify(error, Object.getOwnPropertyNames(error))
    };
  }

  try {
    // Step 2: Check date range
    logger.info('Debug: Checking date range');
    const dateRangeQuery = `
      SELECT
        MIN(date) as earliest_date,
        MAX(date) as latest_date,
        COUNT(*) as total_records
      FROM attendance
    `;
    const dateRangeResult = await db.executeRawSQL(dateRangeQuery, []);
    debugInfo.step2_dateRange = { success: true, result: dateRangeResult[0] };
  } catch (error) {
    logger.error('Debug step 2 failed', error);
    debugInfo.step2_dateRange = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      errorType: typeof error,
      errorDetails: JSON.stringify(error, Object.getOwnPropertyNames(error))
    };
  }

  try {
    // Step 3: Check sample records (simplified query)
    logger.info('Debug: Checking sample records');
    const sampleQuery = `
      SELECT
        a.id,
        a.user_id,
        u.name,
        a.date,
        a.check_in_time,
        a.status,
        a.work_location
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 10
    `;
    const sampleResult = await db.executeRawSQL(sampleQuery, []);
    debugInfo.step3_sample = { success: true, count: sampleResult.length, records: sampleResult };
  } catch (error) {
    logger.error('Debug step 3 failed', error);
    debugInfo.step3_sample = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      errorType: typeof error,
      errorDetails: JSON.stringify(error, Object.getOwnPropertyNames(error))
    };
  }

  try {
    // Step 4: Test filtered query
    logger.info('Debug: Testing filtered query');
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || '2025-11-08';
    const endDate = searchParams.get('endDate') || '2025-11-24';

    const filteredQuery = `
      SELECT
        a.id,
        a.user_id,
        u.name,
        a.date,
        a.check_in_time,
        a.status
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE a.date >= $1 AND a.date <= $2
      ORDER BY a.created_at DESC
      LIMIT 10
    `;
    const filteredResult = await db.executeRawSQL(filteredQuery, [startDate, endDate]);
    debugInfo.step4_filtered = {
      success: true,
      startDate,
      endDate,
      count: filteredResult.length,
      records: filteredResult
    };
  } catch (error) {
    logger.error('Debug step 4 failed', error);
    debugInfo.step4_filtered = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      errorType: typeof error,
      errorDetails: JSON.stringify(error, Object.getOwnPropertyNames(error))
    };
  }

  return NextResponse.json({
    success: true,
    debug: debugInfo
  });
}
