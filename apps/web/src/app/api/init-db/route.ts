import { NextRequest, NextResponse } from 'next/server';
import { getAuthService } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Security: Disable endpoint in production environment
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Database initialization is disabled in production' },
        { status: 403 }
      );
    }

    // Security: Require initialization secret key
    const initKey = request.headers.get('x-init-key');
    const expectedKey = process.env.DB_INIT_SECRET;

    if (!expectedKey) {
      return NextResponse.json(
        { error: 'Database initialization is not configured' },
        { status: 500 }
      );
    }

    if (initKey !== expectedKey) {
      logger.security('Failed database initialization attempt - invalid key');
      return NextResponse.json(
        { error: 'Unauthorized - invalid initialization key' },
        { status: 401 }
      );
    }

    logger.info('Starting database initialization...');

    const authService = getAuthService();
    await authService.initialize();

    logger.info('Database initialized successfully');

    return NextResponse.json({
      message: 'Database initialized successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Database initialization error', error);
    return NextResponse.json(
      { error: 'Failed to initialize database' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Use POST to initialize database',
    endpoint: '/api/init-db'
  });
}