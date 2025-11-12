import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/shared/modules/redis/redis.service';
import { notificationKeys } from '../utils/notification-redis-key-builder';
import { BaseService } from '@/shared/common/services/base.service';
import {
  CACHE_CONSTANTS,
  REDIS_CONSTANTS,
} from '../constants/notification.constants';
import { NotificationConfig } from '../config/notification.config';
import * as Handlebars from 'handlebars';

/**
 * Redis-based template cache service
 *
 * Caches template source code (not compiled functions) since Handlebars
 * compiled templates cannot be serialized. This provides:
 * - Distributed caching across multiple instances
 * - Automatic expiration
 * - Memory efficiency (only stores strings, not functions)
 *
 * Performance: Compiling Handlebars is fast (~1-5ms), so caching the source
 * and compiling on-demand is more efficient than trying to serialize functions.
 */
/**
 * Redis-based template caching service with two-level caching
 *
 * Error Handling Strategy: FAIL_OPEN
 * - If Redis fails, templates are loaded directly from filesystem
 * - Cache is a performance optimization, not a critical dependency
 * - System continues to work even if Redis is unavailable
 * - Errors are logged but do not block template loading
 *
 * @see ERROR_HANDLING_CONFIG.TEMPLATE_CACHE
 */
@Injectable()
export class RedisTemplateCacheService extends BaseService {
  private readonly logger: Logger = new Logger(RedisTemplateCacheService.name);
  private readonly CACHE_TTL: number;

  // In-memory cache for compiled templates (per-instance)
  // This is a small optimization to avoid recompiling within the same instance
  private readonly compiledCache: Map<string, HandlebarsTemplateDelegate> =
    new Map();
  private readonly MAX_COMPILED_CACHE_SIZE =
    CACHE_CONSTANTS.MAX_COMPILED_CACHE_SIZE;

  constructor(private readonly redisService: RedisService) {
    super();
    // Get TTL from NotificationConfig
    this.CACHE_TTL = NotificationConfig.templateCacheTtlSeconds;
  }

  /**
   * Get template source from Redis cache, or load and cache it
   * @param cacheKey - Unique cache key (e.g., "en:EMAIL:auth/otp-sent")
   * @param loadFn - Function to load template source if cache miss
   * @returns Template source code
   */
  async getTemplateSource(
    cacheKey: string,
    loadFn: () => Promise<string>,
  ): Promise<string> {
    const redisKey = notificationKeys.templateSource(cacheKey);
    const client = this.redisService.getClient();

    try {
      // Try to get from Redis cache
      const cached = await client.get(redisKey);
      if (cached) {
        return cached;
      }

      // Cache miss - load and store
      const source = await loadFn();

      // Store in Redis with TTL
      await client.setex(redisKey, this.CACHE_TTL, source);

      return source;
    } catch (error) {
      // Fail-open: if Redis fails, load anyway
      this.logger.warn(
        `Redis template cache failed, loading without cache: ${cacheKey}`,
        {
          error: error instanceof Error ? error.message : String(error),
          cacheKey,
        },
      );
      return loadFn();
    }
  }

  /**
   * Get compiled template with two-level caching:
   * 1. In-memory cache (fast, per-instance)
   * 2. Compile from cached source (Redis)
   *
   * @param cacheKey - Unique cache key
   * @param compileFn - Function to compile template (gets source from Redis cache internally)
   * @returns Compiled Handlebars template
   */
  async getCompiledTemplate(
    cacheKey: string,
    compileFn: () => Promise<HandlebarsTemplateDelegate>,
  ): Promise<HandlebarsTemplateDelegate> {
    // Check in-memory cache first (fastest)
    if (this.compiledCache.has(cacheKey)) {
      return this.compiledCache.get(cacheKey)!;
    }

    // Compile template (compileFn will get source from Redis cache)
    const compiled = await compileFn();

    // Store in in-memory cache (with size limit)
    if (this.compiledCache.size >= this.MAX_COMPILED_CACHE_SIZE) {
      // Remove oldest entry (simple FIFO)
      const firstKey = this.compiledCache.keys().next().value;
      this.compiledCache.delete(firstKey);
    }
    this.compiledCache.set(cacheKey, compiled);

    return compiled;
  }

  /**
   * Clear template cache for a specific template or all templates
   * @param templatePath - Optional template path to clear specific template
   */
  async clearTemplateCache(templatePath?: string): Promise<void> {
    const client = this.redisService.getClient();
    const pattern = templatePath
      ? notificationKeys.templateSourcePatternWithFilter(templatePath)
      : notificationKeys.templateSourcePattern();

    try {
      let cursor = '0';
      let deletedCount = 0;

      do {
        const [nextCursor, keys] = await client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          REDIS_CONSTANTS.SCAN_BATCH_SIZE,
        );
        cursor = nextCursor;

        if (keys.length > 0) {
          const deleted = await client.del(...keys);
          deletedCount += deleted;
        }
      } while (cursor !== '0');

      // Also clear compiled cache if specific template
      if (templatePath) {
        // Clear in-memory cache entries matching pattern
        for (const key of this.compiledCache.keys()) {
          if (key.includes(templatePath)) {
            this.compiledCache.delete(key);
          }
        }
      } else {
        // Clear all in-memory cache
        this.compiledCache.clear();
      }
    } catch (error) {
      this.logger.error(
        `Failed to clear template cache - templatePath: ${templatePath}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    redisKeys: number;
    memoryCacheSize: number;
    ttl: number;
  }> {
    const client = this.redisService.getClient();
    const pattern = notificationKeys.templateSourcePattern();

    try {
      let cursor = '0';
      let keyCount = 0;

      do {
        const [nextCursor, keys] = await client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          REDIS_CONSTANTS.SCAN_BATCH_SIZE,
        );
        cursor = nextCursor;
        keyCount += keys.length;
      } while (cursor !== '0');

      return {
        redisKeys: keyCount,
        memoryCacheSize: this.compiledCache.size,
        ttl: this.CACHE_TTL,
      };
    } catch (error) {
      this.logger.warn(`Failed to get cache stats`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        redisKeys: 0,
        memoryCacheSize: this.compiledCache.size,
        ttl: this.CACHE_TTL,
      };
    }
  }

  /**
   * Clear in-memory compiled cache (useful for testing or memory management)
   */
  clearMemoryCache(): void {
    this.compiledCache.clear();
    this.logger.debug('Cleared in-memory compiled template cache');
  }
}
