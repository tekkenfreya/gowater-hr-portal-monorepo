import { NextRequest, NextResponse } from 'next/server';
import { getAuthService } from '@/lib/auth';
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

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json({ profile: user });
  } catch (error) {
    logger.error('Get profile API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { name, department, employeeName, position, avatar } = await request.json();

    const authService = getAuthService();
    const result = await authService.updateUserProfile(user.id, {
      name,
      department,
      employeeName,
      position,
      avatar
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      message: 'Profile updated successfully',
      success: true 
    });
  } catch (error) {
    logger.error('Update profile API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}