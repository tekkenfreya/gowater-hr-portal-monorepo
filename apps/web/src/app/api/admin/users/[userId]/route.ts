import { NextRequest, NextResponse } from 'next/server';
import { getAuthService } from '@/lib/auth';
import { logger } from '@/lib/logger';

async function verifyAdminAuth(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    return null;
  }

  const authService = getAuthService();
  const user = await authService.verifyToken(token);
  
  if (!user || user.role !== 'admin') {
    return null;
  }
  
  return user;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await verifyAdminAuth(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.userId);
    const profileData = await request.json();

    const authService = getAuthService();
    const result = await authService.updateUserProfile(userId, profileData);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update user profile' },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: 'User profile updated successfully' });
  } catch (error) {
    logger.error('Update user profile API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await verifyAdminAuth(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.userId);
    const { status } = await request.json();

    if (!['active', 'inactive'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "active" or "inactive"' },
        { status: 400 }
      );
    }

    const authService = getAuthService();
    const success = await authService.updateUserStatus(userId, status);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update user status' },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: 'User status updated successfully' });
  } catch (error) {
    logger.error('Update user status API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await verifyAdminAuth(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.userId);
    
    // Prevent admin from deleting themselves
    if (userId === admin.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    const authService = getAuthService();
    const success = await authService.deleteUser(userId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 400 }
      );
    }

    logger.audit('User deleted', admin.id, { deletedUserId: userId });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Delete user API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}