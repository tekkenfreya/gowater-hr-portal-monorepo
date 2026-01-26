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

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdminAuth(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const authService = getAuthService();
    const users = await authService.getAllUsers();

    return NextResponse.json({ success: true, users, employees: users });
  } catch (error) {
    logger.error('Get users API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdminAuth(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { email, password, name, role, department } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    if (role && !['admin', 'employee', 'manager', 'intern'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role specified' },
        { status: 400 }
      );
    }

    const authService = getAuthService();
    const result = await authService.createUser(
      { email, password, name, role: role || 'employee', department }
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    logger.audit('User created', admin.id, { createdUserId: result.userId, email });

    return NextResponse.json(
      { message: 'User created successfully', userId: result.userId },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Create user API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}