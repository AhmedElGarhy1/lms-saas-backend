/**
 * WhatsApp template message structure
 */
export interface WhatsAppTemplateMessage {
  /** Pre-approved WhatsApp Business API template name */
  templateName: string;
  /**
   * Template language code (e.g., 'en', 'ar')
   * Will be mapped to WhatsApp format (e.g., 'en' → 'en_US', 'ar' → 'ar')
   * See WhatsApp Business API documentation for supported language codes
   */
  templateLanguage: string;
  /**
   * Template parameters extracted from event data
   * Can be empty array for templates without parameters (e.g., hello_world template)
   * When empty, components field will be omitted from API request
   */
  templateParameters: Array<{
    type: 'text';
    text: string;
  }>;
}

/**
 * Result of sending a WhatsApp message
 */
export interface WhatsAppSendResult {
  /** WhatsApp message ID from Meta (e.g., "wamid.xxx") */
  messageId: string;
}

/**
 * Interface for WhatsApp message providers
 * Supports WhatsApp Business API template messages
 */
export interface WhatsAppProvider {
  /**
   * Send a WhatsApp template message
   * @param phoneNumber Recipient phone number (E.164 format)
   * @param templateMessage Template message structure with name, language, and parameters
   * @returns Promise that resolves with message ID when message is sent
   * @throws Error if message fails to send after all retries
   */
  sendMessage(
    phoneNumber: string,
    templateMessage: WhatsAppTemplateMessage,
  ): Promise<WhatsAppSendResult>;

  /**
   * Check if provider is configured and ready
   */
  isConfigured(): boolean;

  /**
   * Get provider name for logging/debugging
   */
  getProviderName(): string;
}
