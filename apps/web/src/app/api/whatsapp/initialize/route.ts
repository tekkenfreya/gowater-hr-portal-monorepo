import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/lib/whatsapp';
import { getAuthService } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
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

    // Security: Require admin role for initializing WhatsApp
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions - admin role required' },
        { status: 403 }
      );
    }

    logger.info(`WhatsApp initialization requested by user ${user.id} (${user.email})`);

    await whatsappService.initialize({
      onQR: (qr: string) => {
        // Store QR code for retrieval
        (global as unknown as Record<string, unknown>).whatsappQR = qr;
      },
      onReady: () => {
        (global as unknown as Record<string, unknown>).whatsappReady = true;
      },
      onDisconnected: () => {
        (global as unknown as Record<string, unknown>).whatsappReady = false;
      },
      onAuthFailure: (error: string) => {
        (global as unknown as Record<string, unknown>).whatsappError = error;
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initialize WhatsApp' },
      { status: 500 }
    );
  }
}