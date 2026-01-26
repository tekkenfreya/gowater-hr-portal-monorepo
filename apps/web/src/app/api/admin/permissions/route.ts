import { NextRequest, NextResponse } from 'next/server';
import { getPermissionsService } from '@/lib/permissions';
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

/**
 * GET /api/admin/permissions
 *
 * Query params:
 * - userId: Get permissions for specific user
 * - (no params): Get all available permissions
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdminAuth(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    const permissionsService = getPermissionsService();

    if (userId) {
      // Get permissions for specific user
      const userPermissions = await permissionsService.getUserPermissions(parseInt(userId));
      return NextResponse.json({
        permissions: userPermissions,
        message: 'User permissions fetched successfully'
      });
    } else {
      // Get all available permissions
      const allPermissions = await permissionsService.getAllPermissions();
      return NextResponse.json({
        permissions: allPermissions,
        message: 'All permissions fetched successfully'
      });
    }
  } catch (error) {
    logger.error('Get permissions API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/permissions
 *
 * Body:
 * - userId: User to grant permission to
 * - permissionKey: Permission key to grant
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdminAuth(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { userId, permissionKey } = await request.json();

    if (!userId || !permissionKey) {
      return NextResponse.json(
        { error: 'userId and permissionKey are required' },
        { status: 400 }
      );
    }

    const permissionsService = getPermissionsService();
    const success = await permissionsService.grantPermission(
      parseInt(userId),
      permissionKey,
      admin.id
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to grant permission' },
        { status: 400 }
      );
    }

    logger.audit('Permission granted', admin.id, { userId, permissionKey });

    return NextResponse.json(
      { message: 'Permission granted successfully' },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Grant permission API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/permissions
 *
 * Body:
 * - userId: User to update permissions for
 * - permissionKeys: Array of permission keys to set (replaces all existing)
 */
export async function PUT(request: NextRequest) {
  try {
    const admin = await verifyAdminAuth(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { userId, permissionKeys } = await request.json();

    if (!userId || !Array.isArray(permissionKeys)) {
      return NextResponse.json(
        { error: 'userId and permissionKeys array are required' },
        { status: 400 }
      );
    }

    const permissionsService = getPermissionsService();
    const success = await permissionsService.updateUserPermissions(
      parseInt(userId),
      permissionKeys,
      admin.id
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update permissions' },
        { status: 400 }
      );
    }

    logger.audit('Permissions updated', admin.id, {
      userId,
      permissionCount: permissionKeys.length
    });

    return NextResponse.json(
      { message: 'Permissions updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Update permissions API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/permissions
 *
 * Body:
 * - userId: User to revoke permission from
 * - permissionKey: Permission key to revoke
 */
export async function DELETE(request: NextRequest) {
  try {
    const admin = await verifyAdminAuth(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { userId, permissionKey } = await request.json();

    if (!userId || !permissionKey) {
      return NextResponse.json(
        { error: 'userId and permissionKey are required' },
        { status: 400 }
      );
    }

    const permissionsService = getPermissionsService();
    const success = await permissionsService.revokePermission(
      parseInt(userId),
      permissionKey
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to revoke permission' },
        { status: 400 }
      );
    }

    logger.audit('Permission revoked', admin.id, { userId, permissionKey });

    return NextResponse.json(
      { message: 'Permission revoked successfully' },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Revoke permission API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
