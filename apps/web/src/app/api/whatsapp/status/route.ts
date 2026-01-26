import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/lib/whatsapp';
import { getAuthService } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Security: Require authentication
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const authService = getAuthService();
    const user = await authService.verifyToken(token);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Security: Require admin or manager role
    if (user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json(
        { error: 'Insufficient permissions - admin or manager role required' },
        { status: 403 }
      );
    }

    const isReady = whatsappService.isClientReady();
    const qrCode = whatsappService.getCurrentQRCode();
    
    return NextResponse.json({
      isReady,
      qrCode,
      error: (global as unknown as Record<string, unknown>).whatsappError || null
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get status' },
      { status: 500 }
    );
  }
}