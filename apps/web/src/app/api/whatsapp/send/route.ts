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

    // Security: Require admin or manager role for sending WhatsApp messages
    if (user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json(
        { error: 'Insufficient permissions - admin or manager role required' },
        { status: 403 }
      );
    }

    if (!whatsappService.isClientReady()) {
      return NextResponse.json(
        { error: 'WhatsApp client is not ready' },
        { status: 400 }
      );
    }

    const { recipients, message, type } = await request.json();

    // Security: Log the action for audit trail
    logger.audit('WhatsApp message sent', user.id, { recipientCount: recipients?.length || 0 });

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: 'Recipients array is required' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const results = await whatsappService.sendBulkMessage(recipients, message, type || 'manual');

    return NextResponse.json({
      success: true,
      results: {
        successful: results.successful,
        failed: results.failed
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send message' },
      { status: 500 }
    );
  }
}