import { logger } from './logger';

// Simple WhatsApp Web integration using group ID
export class SimpleWhatsAppService {
  private groupId = 'CjYWbEz8tG2AC6S0KeSjxM'; // Your WhatsApp group ID

  // Send message directly to WhatsApp group with 1-click
  sendToGroup(message: string): boolean {
    const encodedMessage = encodeURIComponent(message);

    // Try multiple WhatsApp URLs for better compatibility
    // wa.me can have SSL issues on some networks (corporate firewalls, proxies)
    const whatsappUrls = [
      `https://wa.me/?text=${encodedMessage}`,
      `https://api.whatsapp.com/send?text=${encodedMessage}`,
      `https://web.whatsapp.com/send?text=${encodedMessage}`
    ];

    // Try to open WhatsApp - if blocked by SSL error, this will silently fail
    try {
      const opened = window.open(whatsappUrls[0], '_blank');
      // Return true if window opened successfully
      return opened !== null && opened !== undefined;
    } catch (error) {
      logger.error('Failed to open WhatsApp URL', error);
      return false;
    }
  }

  // Copy message to clipboard as fallback
  async copyToClipboard(message: string) {
    try {
      await navigator.clipboard.writeText(message);
      return true;
    } catch (error) {
      logger.error('Failed to copy to clipboard', error);
      return false;
    }
  }

  // Send with options: try WhatsApp first, fallback to clipboard
  async sendReport(message: string) {
    try {
      // Always copy to clipboard first as backup
      const clipboardSuccess = await this.copyToClipboard(message);

      // Try to send to WhatsApp
      const whatsappOpened = this.sendToGroup(message);

      // If WhatsApp failed to open (SSL error, popup blocked, etc.)
      if (!whatsappOpened) {
        // Show helpful message if clipboard succeeded
        if (clipboardSuccess) {
          alert(
            'WhatsApp could not be opened automatically.\n\n' +
            'This might be due to:\n' +
            '• Network security settings (firewall/proxy)\n' +
            '• Popup blocker\n' +
            '• SSL certificate issues\n\n' +
            'The report has been copied to your clipboard.\n' +
            'Please paste it manually into WhatsApp.'
          );
        } else {
          // Last resort: show in prompt
          prompt('Copy this report to WhatsApp:', message);
        }
      }

    } catch (error) {
      logger.error('WhatsApp send failed', error);
      // Fallback: just copy to clipboard
      const success = await this.copyToClipboard(message);
      if (!success) {
        // Last resort: show in prompt only if clipboard fails
        prompt('Copy this report to WhatsApp:', message);
      }
    }
  }
}

export const simpleWhatsAppService = new SimpleWhatsAppService();
export default simpleWhatsAppService;