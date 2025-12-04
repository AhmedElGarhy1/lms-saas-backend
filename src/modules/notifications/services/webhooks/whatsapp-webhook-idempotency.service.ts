import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/shared/modules/redis/redis.service';
import { Config } from '@/shared/config/config';
import { TIME_CONSTANTS } from '../../constants/notification.constants';

/**
 * Service for handling webhook event idempotency
 * Prevents duplicate processing of the same status update
 */
@Injectable()
export class WhatsAppWebhookIdempotencyService {
  private readonly logger = new Logger(WhatsAppWebhookIdempotencyService.name);
  private readonly ttlSeconds = TIME_CONSTANTS.SEVEN_DAYS_SECONDS;

  constructor(private readonly redisService: RedisService) {}

  /**
   * Check if status update has already been processed
   * @param messageId WhatsApp message ID
   * @param status Status value (sent, delivered, read, failed)
   * @returns true if already processed, false if new
   */
  async isProcessed(messageId: string, status: string): Promise<boolean> {
    const key = this.getKey(messageId, status);
    const client = this.redisService.getClient();

    try {
      const exists = await client.exists(key);
      return exists === 1;
    } catch (error) {
      // Fail open - allow processing if Redis fails
      this.logger.error(
        `Failed to check idempotency for ${messageId}:${status}`,
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }

  /**
   * Check if status update is already processed and mark as processed if not
   * Atomic operation: returns true if already processed, false if new (and marks it)
   * @param messageId WhatsApp message ID
   * @param status Status value (sent, delivered, read, failed)
   * @returns true if already processed, false if new (now marked as processed)
   */
  async checkAndMarkProcessed(
    messageId: string,
    status: string,
  ): Promise<boolean> {
    const key = this.getKey(messageId, status);
    const client = this.redisService.getClient();

    try {
      // Use SET with NX (only if not exists) and EX (expire) for atomic operation
      // Returns 'OK' if key was set (new), null if key already exists (duplicate)
      const result = await client.set(
        key,
        Date.now().toString(), // Store timestamp for debugging
        'EX',
        this.ttlSeconds,
        'NX', // Only set if not exists
      );

      // If result is null, key already exists (duplicate)
      // If result is 'OK', key was set (new)
      return result === null;
    } catch (error) {
      // Fail open - allow processing if Redis fails
      this.logger.error(
        `Failed to check and mark idempotency for ${messageId}:${status}`,
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }

  /**
   * Mark status update as processed
   * @param messageId WhatsApp message ID
   * @param status Status value
   */
  async markProcessed(messageId: string, status: string): Promise<void> {
    const key = this.getKey(messageId, status);
    const client = this.redisService.getClient();

    try {
      await client.set(key, Date.now().toString(), 'EX', this.ttlSeconds);
    } catch (error) {
      // Fail open - log but don't throw
      this.logger.error(
        `Failed to mark idempotency for ${messageId}:${status}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Get Redis key for idempotency check
   * @param messageId WhatsApp message ID
   * @param status Status value
   * @returns Redis key
   */
  private getKey(messageId: string, status: string): string {
    const prefix = Config.redis.keyPrefix;
    return `${prefix}:whatsapp:status:${messageId}:${status}`;
  }
}
