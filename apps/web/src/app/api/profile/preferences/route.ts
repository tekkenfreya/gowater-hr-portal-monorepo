import { NextRequest, NextResponse } from 'next/server';
import { getAuthService } from '@/lib/auth';
import { getDb } from '@/lib/supabase';
import { logger } from '@/lib/logger';

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    return null;
  }

  const authService = getAuthService();
  const user = await authService.verifyToken(token);

  return user;
}

/**
 * GET /api/profile/preferences
 * Get user preferences
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const db = getDb();
    const result = await db.get('users', { id: user.id });

    if (!result) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      preferences: result.preferences || {}
    });
  } catch (error) {
    logger.error('Get preferences API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/profile/preferences
 * Update user preferences (merges with existing)
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const updates = await request.json();

    const db = getDb();

    // Get current preferences
    const currentUser = await db.get('users', { id: user.id });
    const currentPreferences = currentUser?.preferences || {};

    // Merge new preferences with existing
    const newPreferences = {
      ...currentPreferences,
      ...updates
    };

    // Update in database
    await db.update(
      'users',
      { preferences: newPreferences },
      { id: user.id }
    );

    logger.info(`User ${user.id} updated preferences`, { updates });

    return NextResponse.json({
      message: 'Preferences updated successfully',
      success: true,
      preferences: newPreferences
    });
  } catch (error) {
    logger.error('Update preferences API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
