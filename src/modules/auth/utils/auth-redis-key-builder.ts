import { Config } from '@/shared/config/config';

/**
 * Builds consistent Redis keys for auth module
 */
export class AuthRedisKeyBuilder {
  /**
   * Build a key for failed login attempts
   * @param userId - User ID
   * @returns Formatted Redis key: {prefix}:auth:failed_login_attempts:{userId}
   */
  static failedLoginAttempts(userId: string): string {
    const prefix = Config.redis.keyPrefix;
    const normalizedUserId = userId
      .replace(/[^a-zA-Z0-9:_-]/g, '_')
      .replace(/_{2,}/g, '_');
    return `${prefix}:auth:failed_login_attempts:${normalizedUserId}`;
  }
}

