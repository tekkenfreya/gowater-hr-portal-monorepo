'use client';

import React, { useState, useEffect } from 'react';
import { whatsappClientService, ContactInfo } from '@/lib/whatsapp-client';
import { logger } from '@/lib/logger';

interface WhatsAppConnectionProps {
  onConnectionChange: (connected: boolean) => void;
}


export default function WhatsAppConnection({ onConnectionChange }: WhatsAppConnectionProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [qrCode, setQRCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [testMessage, setTestMessage] = useState('');
  const [showContactSelector, setShowContactSelector] = useState(false);
  const [contactSearchTerm, setContactSearchTerm] = useState('');

  const checkConnectionStatus = async () => {
    const status = await whatsappClientService.getStatus();
    if (status.isReady) {
      setIsConnected(true);
      onConnectionChange(true);
      loadContacts();
    } else if (status.qrCode) {
      setQRCode(status.qrCode);
      setIsConnecting(true);
    }
  };

  useEffect(() => {
    // Check if already connected
    checkConnectionStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectWhatsApp = async () => {
    setIsConnecting(true);
    setError(null);
    setQRCode(null);

    try {
      const result = await whatsappClientService.initialize();
      if (!result.success) {
        throw new Error(result.error || 'Failed to initialize WhatsApp');
      }

      // Start polling for status updates
      const statusInterval = setInterval(async () => {
        const status = await whatsappClientService.getStatus();

        if (status.qrCode && status.qrCode !== qrCode) {
          setQRCode(status.qrCode);
          logger.info('QR Code received. Please scan with your WhatsApp mobile app.');
        }
        
        if (status.isReady) {
          setIsConnected(true);
          setIsConnecting(false);
          setQRCode(null);
          onConnectionChange(true);
          await loadContacts();
          clearInterval(statusInterval);
        }
        
        if (status.error) {
          setError(`Authentication failed: ${status.error}`);
          setIsConnecting(false);
          setQRCode(null);
          clearInterval(statusInterval);
        }
      }, 2000); // Poll every 2 seconds

      // Clear interval after 5 minutes to prevent infinite polling
      setTimeout(() => {
        clearInterval(statusInterval);
        if (isConnecting) {
          setError('Connection timeout. Please try again.');
          setIsConnecting(false);
        }
      }, 300000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to WhatsApp');
      setIsConnecting(false);
    }
  };

  const disconnectWhatsApp = async () => {
    try {
      const result = await whatsappClientService.disconnect();
      if (result.success) {
        setIsConnected(false);
        setContacts([]);
        onConnectionChange(false);
      } else {
        setError(result.error || 'Failed to disconnect from WhatsApp');
      }
    } catch (err) {
      setError('Failed to disconnect from WhatsApp');
    }
  };

  const loadContacts = async () => {
    try {
      const result = await whatsappClientService.getContacts();
      if (result.error) {
        logger.error('Failed to load contacts', new Error(result.error));
        setError(result.error);
      } else {
        setContacts(result.contacts);
      }
    } catch (err) {
      logger.error('Failed to load contacts', err);
      setError('Failed to load contacts');
    }
  };

  const sendTestMessage = async () => {
    if (!testMessage.trim() || selectedRecipients.length === 0) {
      setError('Please select recipients and enter a test message');
      return;
    }

    try {
      const result = await whatsappClientService.sendBulkMessage(
        selectedRecipients,
        testMessage,
        'test-message'
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to send message');
      }

      const results = result.results!;

      if (results.successful.length > 0) {
        alert(`Message sent successfully to ${results.successful.length} recipient(s)`);
        setTestMessage('');
      }

      if (results.failed.length > 0) {
        logger.error('Failed to send to some recipients', { failed: results.failed });
        setError(`Failed to send to ${results.failed.length} recipient(s)`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test message');
    }
  };

  const toggleRecipient = (contactId: string) => {
    setSelectedRecipients(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
    (contact.number && contact.number.includes(contactSearchTerm))
  );

  // Save selected recipients to localStorage for persistence
  useEffect(() => {
    if (selectedRecipients.length > 0) {
      localStorage.setItem('whatsapp-recipients', JSON.stringify(selectedRecipients));
    }
  }, [selectedRecipients]);

  // Load saved recipients on mount
  useEffect(() => {
    const saved = localStorage.getItem('whatsapp-recipients');
    if (saved) {
      try {
        setSelectedRecipients(JSON.parse(saved));
      } catch (err) {
        logger.error('Failed to load saved recipients', err);
      }
    }
  }, []);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">WhatsApp Integration</h3>
        <div className="flex items-center space-x-2">
          {isConnected && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
              Connected
            </span>
          )}
        </div>
      </div>

      {!isConnected && !isConnecting && (
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <WhatsAppIcon />
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">Connect to WhatsApp</h4>
          <p className="text-gray-800 mb-6">
            Connect your WhatsApp to send real attendance reports to your contacts or groups.
          </p>
          <button
            onClick={connectWhatsApp}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2 mx-auto"
          >
            <WhatsAppIcon />
            <span>Connect WhatsApp</span>
          </button>
        </div>
      )}

      {isConnecting && (
        <div className="text-center py-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">Connecting to WhatsApp...</h4>
          {qrCode && (
            <div className="mt-6">
              <p className="text-gray-800 mb-4">
                Scan this QR code with your WhatsApp mobile app:
              </p>
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`}
                  alt="WhatsApp QR Code"
                  className="mx-auto"
                />
              </div>
              <p className="text-xs text-gray-800 mt-2">
                Open WhatsApp → Settings → Linked Devices → Link a Device
              </p>
            </div>
          )}
        </div>
      )}

      {isConnected && (
        <div className="space-y-6">
          {/* Recipient Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-800">
                Select Recipients ({selectedRecipients.length} selected)
              </label>
              <button
                onClick={() => setShowContactSelector(!showContactSelector)}
                className="text-blue-600 hover:text-blue-500 text-sm font-medium"
              >
                {showContactSelector ? 'Hide' : 'Show'} Contacts
              </button>
            </div>

            {showContactSelector && (
              <div className="border border-gray-200 rounded-lg p-4">
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={contactSearchTerm}
                  onChange={(e) => setContactSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-3"
                />
                
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {filteredContacts.map(contact => (
                    <label
                      key={contact.id}
                      className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRecipients.includes(contact.id)}
                        onChange={() => toggleRecipient(contact.id)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {contact.name}
                          {contact.isGroup && (
                            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                              Group ({contact.participants})
                            </span>
                          )}
                        </p>
                        {contact.number && (
                          <p className="text-xs text-gray-800">{contact.number}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Test Message */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Test Message
            </label>
            <div className="flex space-x-3">
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Enter test message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <button
                onClick={sendTestMessage}
                disabled={!testMessage.trim() || selectedRecipients.length === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Send Test
              </button>
            </div>
          </div>

          {/* Disconnect */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={disconnectWhatsApp}
              className="text-red-600 hover:text-red-500 text-sm font-medium"
            >
              Disconnect WhatsApp
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
    </div>
  );
}

// WhatsApp Icon Component
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || "w-6 h-6"}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.700"/>
    </svg>
  );
}