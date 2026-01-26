// Client-side WhatsApp service that communicates with API routes
export interface ContactInfo {
  id: string;
  name: string;
  number?: string;
  isGroup?: boolean;
  participants?: number;
}

export interface WhatsAppStatus {
  isReady: boolean;
  qrCode?: string | null;
  error?: string | null;
}

export interface SendMessageResult {
  success: boolean;
  results?: {
    successful: string[];
    failed: { recipient: string; error: string }[];
  };
  error?: string;
}

class WhatsAppClientService {
  
  // Initialize WhatsApp connection
  async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/whatsapp/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize WhatsApp');
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to initialize WhatsApp' 
      };
    }
  }

  // Get WhatsApp status
  async getStatus(): Promise<WhatsAppStatus> {
    try {
      const response = await fetch('/api/whatsapp/status');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get status');
      }

      return data;
    } catch (error) {
      return {
        isReady: false,
        error: error instanceof Error ? error.message : 'Failed to get status'
      };
    }
  }

  // Get contacts and groups
  async getContacts(): Promise<{ contacts: ContactInfo[]; error?: string }> {
    try {
      const response = await fetch('/api/whatsapp/contacts');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get contacts');
      }

      return { contacts: data.contacts };
    } catch (error) {
      return {
        contacts: [],
        error: error instanceof Error ? error.message : 'Failed to get contacts'
      };
    }
  }

  // Send bulk message
  async sendBulkMessage(
    recipients: string[], 
    message: string, 
    type: string
  ): Promise<SendMessageResult> {
    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipients, message, type }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message'
      };
    }
  }

  // Disconnect WhatsApp
  async disconnect(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to disconnect');
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to disconnect' 
      };
    }
  }
}

// Create singleton instance
export const whatsappClientService = new WhatsAppClientService();
export default whatsappClientService;