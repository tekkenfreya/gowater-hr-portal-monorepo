import { Client, LocalAuth, Message, GroupChat } from 'whatsapp-web.js';
import { logger } from './logger';

export interface WhatsAppConfig {
  sessionName: string;
  headless: boolean;
  defaultRecipients: string[]; // Phone numbers or group IDs
}

export interface WhatsAppMessage {
  to: string; // Phone number (with country code) or group ID
  message: string;
  type: 'start-report' | 'eod-report' | 'weekly-summary' | 'leave-notification';
}

class WhatsAppService {
  private client: Client | null = null;
  private isReady = false;
  private isConnecting = false;
  private qrCode: string | null = null;
  private config: WhatsAppConfig;
  private eventHandlers: {
    onQR: (qr: string) => void;
    onReady: () => void;
    onDisconnected: () => void;
    onAuthFailure: (error: string) => void;
  } | null = null;

  constructor(config: WhatsAppConfig) {
    this.config = config;
  }

  // Initialize WhatsApp Client
  async initialize(handlers: {
    onQR: (qr: string) => void;
    onReady: () => void;
    onDisconnected: () => void;
    onAuthFailure: (error: string) => void;
  }) {
    if (this.isConnecting) {
      throw new Error('WhatsApp is already connecting...');
    }

    this.eventHandlers = handlers;
    this.isConnecting = true;

    try {
      // Create WhatsApp client with local authentication
      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: this.config.sessionName
        }),
        puppeteer: {
          headless: this.config.headless,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        }
      });

      // Set up event listeners
      this.setupEventListeners();

      // Initialize the client
      await this.client.initialize();

      logger.info('WhatsApp client initialized');

    } catch (error) {
      logger.error('Failed to initialize WhatsApp client', error);
      this.isConnecting = false;
      throw error;
    }
  }

  private setupEventListeners() {
    if (!this.client || !this.eventHandlers) return;

    // QR Code generation
    this.client.on('qr', (qr) => {
      logger.info('QR Code received, please scan with your WhatsApp mobile app');
      this.qrCode = qr;
      this.eventHandlers!.onQR(qr);
    });

    // Client ready
    this.client.on('ready', () => {
      logger.info('WhatsApp client is ready!');
      this.isReady = true;
      this.isConnecting = false;
      this.eventHandlers!.onReady();
    });

    // Authentication failure
    this.client.on('auth_failure', (error) => {
      logger.error('WhatsApp authentication failed', error);
      this.isConnecting = false;
      this.eventHandlers!.onAuthFailure(error.toString());
    });

    // Client disconnected
    this.client.on('disconnected', (reason) => {
      logger.info('WhatsApp client disconnected:', reason);
      this.isReady = false;
      this.isConnecting = false;
      this.eventHandlers!.onDisconnected();
    });

    // Message received (optional - for logging)
    this.client.on('message', async (message: Message) => {
      if (message.body === '!ping') {
        // Respond to ping for testing
        await message.reply('pong');
      }
    });
  }

  // Send message to a specific contact or group
  async sendMessage(messageData: WhatsAppMessage): Promise<boolean> {
    if (!this.isReady || !this.client) {
      throw new Error('WhatsApp client is not ready. Please connect first.');
    }

    try {
      // Format phone number (ensure it includes country code)
      const chatId = this.formatChatId(messageData.to);
      
      // Send the message
      const message = await this.client.sendMessage(chatId, messageData.message);

      logger.debug(`Message sent to ${messageData.to}:`, {
        id: message.id._serialized,
        timestamp: message.timestamp,
        type: messageData.type
      });

      return true;

    } catch (error) {
      logger.error('Failed to send WhatsApp message', error);
      throw error;
    }
  }

  // Send message to multiple recipients
  async sendBulkMessage(recipients: string[], message: string, type: WhatsAppMessage['type']): Promise<{
    successful: string[];
    failed: { recipient: string; error: string }[];
  }> {
    const results = {
      successful: [] as string[],
      failed: [] as { recipient: string; error: string }[]
    };

    for (const recipient of recipients) {
      try {
        await this.sendMessage({
          to: recipient,
          message,
          type
        });
        results.successful.push(recipient);
        
        // Add small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        results.failed.push({
          recipient,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  // Get all chats (contacts and groups)
  async getChats() {
    if (!this.isReady || !this.client) {
      throw new Error('WhatsApp client is not ready');
    }

    try {
      const chats = await this.client.getChats();
      return chats.map(chat => ({
        id: chat.id._serialized,
        name: chat.name,
        isGroup: chat.isGroup,
        participants: chat.isGroup ? (chat as GroupChat).participants?.length ?? 0 : 0,
        lastMessage: chat.lastMessage?.body?.substring(0, 50) || ''
      }));
    } catch (error) {
      logger.error('Failed to get chats', error);
      throw error;
    }
  }

  // Get contacts
  async getContacts() {
    if (!this.isReady || !this.client) {
      throw new Error('WhatsApp client is not ready');
    }

    try {
      const contacts = await this.client.getContacts();
      return contacts
        .filter(contact => contact.id.user && contact.name)
        .map(contact => ({
          id: contact.id._serialized,
          name: contact.name || contact.pushname || 'Unknown',
          number: contact.number,
          isBlocked: contact.isBlocked
        }));
    } catch (error) {
      logger.error('Failed to get contacts', error);
      throw error;
    }
  }

  // Format chat ID for WhatsApp (ensure proper format)
  private formatChatId(identifier: string): string {
    // If it's already a serialized chat ID, return as is
    if (identifier.includes('@')) {
      return identifier;
    }

    // If it's a phone number, format it properly
    // Remove any non-digit characters
    const cleanNumber = identifier.replace(/[^\d]/g, '');
    
    // Add country code if not present (assuming international format)
    const formattedNumber = cleanNumber.startsWith('1') ? cleanNumber : `1${cleanNumber}`;
    
    return `${formattedNumber}@c.us`;
  }

  // Check if client is ready
  isClientReady(): boolean {
    return this.isReady;
  }

  // Get current QR code
  getCurrentQRCode(): string | null {
    return this.qrCode;
  }

  // Disconnect client
  async disconnect() {
    if (this.client) {
      await this.client.destroy();
      this.client = null;
      this.isReady = false;
      this.isConnecting = false;
      logger.info('WhatsApp client disconnected');
    }
  }

  // Get client info
  async getClientInfo() {
    if (!this.isReady || !this.client) {
      return null;
    }

    try {
      const info = this.client.info;
      return {
        wid: info?.wid?.user,
        phone: info?.wid?._serialized,
        name: info?.pushname,
        platform: info?.platform
      };
    } catch (error) {
      logger.error('Failed to get client info', error);
      return null;
    }
  }
}

// Create singleton instance
export const whatsappService = new WhatsAppService({
  sessionName: 'gowater-attendance-bot',
  headless: false, // Set to true for production
  defaultRecipients: [] // Will be configured by user
});

export default WhatsAppService;