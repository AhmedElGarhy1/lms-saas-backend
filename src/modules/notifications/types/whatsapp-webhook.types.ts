/**
 * WhatsApp Webhook Types
 * Type definitions for Meta WhatsApp Business API webhook events
 */

/**
 * WhatsApp webhook event structure
 */
export interface WhatsAppWebhookEvent {
  object: string; // Should be "whatsapp_business_account"
  entry: WhatsAppWebhookEntry[];
}

/**
 * Webhook entry containing changes
 */
export interface WhatsAppWebhookEntry {
  id: string; // Phone number ID
  changes: WhatsAppWebhookChange[];
}

/**
 * Webhook change object
 */
export interface WhatsAppWebhookChange {
  value: WhatsAppWebhookValue;
  field: string; // e.g., "messages", "message_status"
}

/**
 * Webhook value containing statuses or messages
 */
export interface WhatsAppWebhookValue {
  messaging_product: string;
  metadata: {
    phone_number_id: string;
    display_phone_number: string;
  };
  statuses?: WhatsAppStatus[];
  messages?: WhatsAppIncomingMessage[];
}

/**
 * WhatsApp message status
 */
export interface WhatsAppStatus {
  id: string; // Message ID from Meta (e.g., "wamid.xxx")
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: WhatsAppError[];
}

/**
 * WhatsApp error object
 */
export interface WhatsAppError {
  code: number;
  title: string;
  message?: string;
  error_data?: Record<string, any>;
}

/**
 * Incoming WhatsApp message (for 2-way messaging)
 */
export interface WhatsAppIncomingMessage {
  from: string; // Sender phone number
  id: string; // Message ID
  timestamp: string;
  type: string; // text, image, etc.
  text?: {
    body: string;
  };
}

/**
 * Webhook verification request (GET)
 */
export interface WhatsAppWebhookVerification {
  'hub.mode': string; // Should be "subscribe"
  'hub.verify_token': string;
  'hub.challenge': string;
}
