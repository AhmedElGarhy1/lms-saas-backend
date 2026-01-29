import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import {
  FcmProvider,
  FcmMessage,
  FcmSendResult,
} from './fcm-provider.interface';
import { Config } from '@/shared/config/config';

/**
 * Firebase Cloud Messaging Provider
 * Implements FCM using Firebase Admin SDK
 *
 * Uses Singleton pattern - initialized once at server startup via OnModuleInit
 * Provides cold start protection - server won't crash if credentials are invalid
 */
@Injectable()
export class FcmProviderImpl implements FcmProvider, OnModuleInit {
  private firebaseApp: admin.app.App | null = null;
  private readonly logger: Logger = new Logger(FcmProviderImpl.name);

  /**
   * Initialize Firebase Admin SDK on module initialization
   * Singleton pattern - only initialized once at server startup
   */
  onModuleInit(): void {
    this.initializeFirebase();
    this.validateConfiguration();
  }

  /**
   * Initialize Firebase Admin SDK with service account key
   * Cold start protection - wrapped in try-catch to prevent server crash
   */
  private initializeFirebase(): void {
    // Config.fcm is always defined (added in config.ts)
    // Type assertion needed due to 'as const' in Config definition
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const serviceAccountKey = Config.fcm.serviceAccountKey as string;
    if (
      !serviceAccountKey ||
      typeof serviceAccountKey !== 'string' ||
      serviceAccountKey.trim() === ''
    ) {
      this.logger.warn(
        'FCM service account key not configured. Push notifications will be disabled.',
      );
      return;
    }

    try {
      // Parse JSON and handle newlines in private_key
      // Some environment systems don't read \n correctly
      const parsed = JSON.parse(serviceAccountKey) as {
        project_id?: string;
        private_key?: string;
        client_email?: string;
        [key: string]: unknown;
      };

      // Handle newlines in private_key (credential.cert accepts the parsed object directly)
      if (parsed.private_key && typeof parsed.private_key === 'string') {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }

      // Check if Firebase app already exists (prevent duplicate initialization)
      if (admin.apps.length === 0) {
        // credential.cert accepts the parsed JSON object directly
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(parsed as admin.ServiceAccount),
        });
        this.logger.log('Firebase Admin SDK initialized successfully');
      } else {
        // Use existing app if already initialized
        this.firebaseApp = admin.app();
        this.logger.log('Using existing Firebase Admin SDK instance');
      }
    } catch (error) {
      // Cold start protection - don't crash server if credentials are invalid
      this.logger.error(
        'Failed to initialize Firebase Admin SDK. Push notifications will be disabled.',
        error instanceof Error ? error.stack : String(error),
      );
      this.firebaseApp = null;
    }
  }

  /**
   * Validate configuration in production/staging environments
   */
  private validateConfiguration(): void {
    const nodeEnv = Config.app.nodeEnv;
    const isProduction = nodeEnv === 'production';

    if (isProduction && !this.isConfigured()) {
      this.logger.error(
        'CRITICAL: FCM is not configured in production/staging environment. Push notifications will fail silently.',
      );
      // Don't throw - allow app to start, but log critical error
    }
  }

  /**
   * Check if FCM provider is configured and ready
   */
  isConfigured(): boolean {
    return this.firebaseApp !== null;
  }

  /**
   * Build FCM message payload from FcmMessage interface
   * Returns a partial TokenMessage (token will be added in sendMessage)
   */
  private buildFcmMessage(
    message: FcmMessage,
  ): Omit<admin.messaging.TokenMessage, 'token'> {
    const fcmMessage: Omit<admin.messaging.TokenMessage, 'token'> = {
      notification: {
        title: message.title,
        body: message.body,
      },
      data: message.data || {},
    };

    // Add Android-specific configuration
    if (message.android) {
      fcmMessage.android = {
        priority: message.android.priority || 'high',
        notification: message.android.notification
          ? {
              sound: message.android.notification.sound,
              clickAction: message.android.notification.clickAction,
            }
          : undefined,
      };
    }

    // Add iOS (APNS) specific configuration
    if (message.apns) {
      // Ensure aps is always defined in APNS payload
      const aps: admin.messaging.Aps = {
        sound: message.apns.payload?.aps?.sound,
        contentAvailable:
          message.apns.payload?.aps?.['content-available'] === 1
            ? true
            : undefined,
      };

      fcmMessage.apns = {
        payload: {
          aps,
        },
      };
    }

    // Add sound if provided (applies to both platforms)
    if (message.sound) {
      if (!fcmMessage.android) {
        fcmMessage.android = {};
      }
      if (!fcmMessage.android.notification) {
        fcmMessage.android.notification = {};
      }
      fcmMessage.android.notification.sound = message.sound;

      // Ensure APNS payload has aps defined
      if (!fcmMessage.apns) {
        fcmMessage.apns = {
          payload: {
            aps: {},
          },
        };
      } else if (!fcmMessage.apns.payload) {
        fcmMessage.apns.payload = {
          aps: {},
        };
      } else if (!fcmMessage.apns.payload.aps) {
        fcmMessage.apns.payload.aps = {};
      }
      // TypeScript now knows payload and aps are defined
      if (fcmMessage.apns.payload) {
        fcmMessage.apns.payload.aps.sound = message.sound;
      }
    }

    // Add TTL if provided (for future use)
    if (message.ttl !== undefined) {
      fcmMessage.android = fcmMessage.android || {};
      fcmMessage.android.ttl = message.ttl * 1000; // Convert seconds to milliseconds
    }

    return fcmMessage;
  }

  /**
   * Extract error code from Firebase error
   */
  private extractErrorCode(error: unknown): string | undefined {
    if (error && typeof error === 'object' && 'code' in error) {
      const code = (error as { code?: unknown }).code;
      return typeof code === 'string' ? code : undefined;
    }
    return undefined;
  }

  /**
   * Send push notification via FCM
   * @param deviceToken - FCM device token (registration token)
   * @param message - FCM message payload
   * @returns Promise resolving to send result with message ID
   */
  async sendMessage(
    deviceToken: string,
    message: FcmMessage,
  ): Promise<FcmSendResult> {
    if (!this.isConfigured()) {
      throw new Error('FCM is not configured');
    }

    const startTime = Date.now();
    try {
      const fcmMessagePartial = this.buildFcmMessage(message);

      // Build complete TokenMessage with token
      const tokenMessage: admin.messaging.TokenMessage = {
        ...fcmMessagePartial,
        token: deviceToken,
      };

      // Send message via Firebase Admin SDK
      const response = await admin
        .messaging(this.firebaseApp!)
        .send(tokenMessage);

      const latency = Date.now() - startTime;
      this.logger.debug(
        `FCM message sent successfully (${latency}ms) - messageId: ${response}, token: ${deviceToken.substring(0, 20)}...`,
      );

      return {
        messageId: response,
        success: true,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorCode = this.extractErrorCode(error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Failed to send FCM message (${latency}ms): ${errorMessage} - token: ${deviceToken.substring(0, 20)}..., code: ${errorCode || 'unknown'}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Preserve error code for adapter to handle invalid tokens
      const enhancedError = new Error(errorMessage);
      if (errorCode) {
        (enhancedError as Error & { code?: string }).code = errorCode;
      }
      throw enhancedError;
    }
  }
}
