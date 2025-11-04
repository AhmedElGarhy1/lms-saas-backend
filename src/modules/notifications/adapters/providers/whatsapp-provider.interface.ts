/**
 * Interface for WhatsApp message providers
 * Allows abstraction over different providers (Twilio, Meta Business API, etc.)
 */
export interface WhatsAppProvider {
  /**
   * Send a WhatsApp message
   * @param phoneNumber Recipient phone number
   * @param message Message content
   * @returns Promise that resolves when message is sent
   * @throws Error if message fails to send after all retries
   */
  sendMessage(phoneNumber: string, message: string): Promise<void>;

  /**
   * Check if provider is configured and ready
   */
  isConfigured(): boolean;

  /**
   * Get provider name for logging/debugging
   */
  getProviderName(): string;
}
