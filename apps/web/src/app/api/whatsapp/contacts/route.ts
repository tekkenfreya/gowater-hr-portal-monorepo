import { NextResponse } from 'next/server';
import { whatsappService } from '@/lib/whatsapp';

export async function GET() {
  try {
    if (!whatsappService.isClientReady()) {
      return NextResponse.json(
        { error: 'WhatsApp client is not ready' },
        { status: 400 }
      );
    }

    const [contacts, chats] = await Promise.all([
      whatsappService.getContacts(),
      whatsappService.getChats()
    ]);

    // Combine contacts and chats (groups)
    const allContacts = [
      ...contacts.map(contact => ({
        id: contact.id,
        name: contact.name,
        number: contact.number,
        isGroup: false
      })),
      ...chats
        .filter(chat => chat.isGroup)
        .map(chat => ({
          id: chat.id,
          name: chat.name || 'Unknown Group',
          isGroup: true,
          participants: chat.participants
        }))
    ];

    return NextResponse.json({ contacts: allContacts });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get contacts' },
      { status: 500 }
    );
  }
}