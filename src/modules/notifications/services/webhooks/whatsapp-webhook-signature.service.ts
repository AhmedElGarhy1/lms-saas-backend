import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';
import { Config } from '@/shared/config/config';

/**
 * Service for verifying Meta WhatsApp webhook signatures
 * Verifies X-Hub-Signature-256 header to ensure webhook is from Meta
 */
@Injectable()
export class WhatsAppWebhookSignatureService {
  private readonly logger = new Logger(WhatsAppWebhookSignatureService.name);
  private readonly appSecret: string;

  constructor() {
    this.appSecret = Config.whatsapp.webhookAppSecret || '';
    if (!this.appSecret) {
      this.logger.warn(
        'WhatsApp webhook app secret not configured. Signature verification will fail.',
      );
    }
  }

  /**
   * Verify webhook signature
   * @param payload Raw request body as string
   * @param signature X-Hub-Signature-256 header value (format: "sha256=<hash>")
   * @returns true if signature is valid, false otherwise
   */
  verifySignature(payload: string, signature: string | undefined): boolean {
    if (!signature) {
      this.logger.warn('Webhook signature header missing');
      return false;
    }

    if (!this.appSecret) {
      this.logger.error(
        'Cannot verify signature: app secret not configured',
      );
      return false;
    }

    try {
      // Extract hash from signature header (format: "sha256=<hash>")
      const signatureHash = signature.replace('sha256=', '');
      if (!signatureHash) {
        this.logger.warn('Invalid signature format: missing hash');
        return false;
      }

      // Generate expected signature
      const expectedSignature = createHmac('sha256', this.appSecret)
        .update(payload)
        .digest('hex');

      // Compare signatures using constant-time comparison to prevent timing attacks
      const isValid = this.constantTimeCompare(
        expectedSignature,
        signatureHash,
      );

      if (!isValid) {
        this.logger.warn('Webhook signature verification failed');
      }

      return isValid;
    } catch (error) {
      this.logger.error(
        'Error verifying webhook signature',
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   * @param a First string
   * @param b Second string
   * @returns true if strings are equal, false otherwise
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}

