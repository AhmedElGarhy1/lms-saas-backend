/**
 * FCM Provider Interface
 *
 * Defines the contract for Firebase Cloud Messaging providers
 * Similar to WhatsAppProvider pattern for consistency
 */

export interface FcmProvider {
  /**
   * Check if FCM provider is configured and ready to send messages
   */
  isConfigured(): boolean;

  /**
   * Send a push notification message via FCM
   * @param deviceToken - FCM device token (registration token)
   * @param message - FCM message payload
   * @returns Promise resolving to send result with message ID
   */
  sendMessage(deviceToken: string, message: FcmMessage): Promise<FcmSendResult>;
}

/**
 * FCM Message payload structure
 */
export interface FcmMessage {
  title: string;
  body: string;
  data?: Record<string, string>; // Deep links, custom data
  sound?: string; // Custom sound for notifications (e.g., financial vs chat)
  android?: FcmAndroidConfig;
  apns?: FcmApnsConfig;
  ttl?: number; // Time to live in seconds (optional, for future use)
}

/**
 * Android-specific FCM configuration
 */
export interface FcmAndroidConfig {
  priority?: 'normal' | 'high';
  notification?: {
    sound?: string;
    clickAction?: string; // Deep link
  };
}

/**
 * iOS (APNS) specific FCM configuration
 */
export interface FcmApnsConfig {
  payload?: {
    aps?: {
      sound?: string;
      'content-available'?: number;
    };
  };
}

/**
 * Result of FCM send operation
 */
export interface FcmSendResult {
  messageId: string;
  success: boolean;
}
