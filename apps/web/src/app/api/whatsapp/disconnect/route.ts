import { NextResponse } from 'next/server';
import { whatsappService } from '@/lib/whatsapp';

export async function POST() {
  try {
    await whatsappService.disconnect();
    (global as unknown as Record<string, unknown>).whatsappReady = false;
    (global as unknown as Record<string, unknown>).whatsappQR = null;
    (global as unknown as Record<string, unknown>).whatsappError = null;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to disconnect' },
      { status: 500 }
    );
  }
}