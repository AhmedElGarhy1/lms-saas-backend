import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { RequestContext } from '../context/request.context';
import { Config } from '../../config/config';

/**
 * Service for building cache keys scoped per user or for public endpoints.
 * Cache keys are generated using a hash of:
 * - userId (optional - for public endpoints, omitted)
 * - userProfileId (optional - included if available)
 * - centerId (optional - included if available)
 * - route path and query parameters
 *
 * This ensures cache isolation between different users and contexts.
 * Public endpoints share the same cache (no userId in key).
 */
@Injectable()
export class CacheKeyBuilderService {
  /**
   * Builds a cache key from request context and route information.
   *
   * @param path - Request path (e.g., '/api/users')
   * @param query - Query parameters object (optional)
   * @returns Cache key in format: cache:resource:<hash>
   *
   * @example
   * ```typescript
   * // Public endpoint (no user)
   * buildKey('/api/public/centers', {})
   * // Returns: cache:resource:<hash(/api/public/centers)>
   *
   * // User only
   * buildKey('/api/users', { page: '1' })
   * // Returns: cache:resource:<hash(userId + /api/users + page=1)>
   *
   * // User + Profile + Center
   * buildKey('/api/centers', {})
   * // Returns: cache:resource:<hash(userId + userProfileId + centerId + /api/centers)>
   * ```
   */
  buildKey(path: string, query?: Record<string, any>): string {
    const context = RequestContext.get();

    // Build key segments array
    // userId is optional (for public endpoints)
    const segments: string[] = [];

    // Add userId if available (for authenticated endpoints)
    if (context.userId) {
      segments.push(context.userId);
    }

    // Add userProfileId if available
    if (context.userProfileId) {
      segments.push(context.userProfileId);
    }

    // Add centerId if available
    if (context.centerId) {
      segments.push(context.centerId);
    }

    // Add path
    segments.push(path);

    // Add query parameters (sorted for consistency)
    if (query && Object.keys(query).length > 0) {
      const sortedQuery = this.sortAndStringifyQuery(query);
      if (sortedQuery) {
        segments.push(sortedQuery);
      }
    }

    // Generate hash from all segments
    const keyString = segments.join(':');
    const hash = createHash('sha256').update(keyString).digest('hex');

    // Return cache key with prefix
    return `${Config.redis.keyPrefix}:cache:resource:${hash.substring(0, 16)}`;
  }

  /**
   * Sort query parameters and convert to string for consistent cache keys.
   * Handles arrays, objects, and primitive values.
   *
   * @param query - Query parameters object
   * @returns Sorted query string (e.g., "page=1&sort=name")
   * @private
   */
  private sortAndStringifyQuery(query: Record<string, any>): string {
    const entries = Object.entries(query)
      .filter(([, value]) => value !== undefined && value !== null)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, value]) => {
        // Handle arrays and objects by JSON stringifying
        if (
          Array.isArray(value) ||
          (typeof value === 'object' && value !== null)
        ) {
          return `${key}=${JSON.stringify(value)}`;
        }
        return `${key}=${String(value)}`;
      });

    return entries.join('&');
  }

  /**
   * Builds a cache key pattern for invalidation.
   * Useful for clearing all cache entries for a specific user/context.
   *
   * @param userId - User ID (optional, for public endpoints)
   * @param userProfileId - User profile ID (optional)
   * @param centerId - Center ID (optional)
   * @returns Cache key pattern (e.g., "cache:resource:*" for specific user or public)
   */
  buildPattern(
    userId?: string,
    userProfileId?: string,
    centerId?: string,
  ): string {
    const context = RequestContext.get();
    const uid = userId || context.userId;

    const segments: string[] = [Config.redis.keyPrefix, 'cache', 'resource'];

    // Add userId if available
    if (uid) {
      segments.push(uid);
    }

    if (userProfileId || context.userProfileId) {
      segments.push(userProfileId || context.userProfileId || '');
    }

    if (centerId || context.centerId) {
      segments.push(centerId || context.centerId || '');
    }

    return `${segments.join(':')}*`;
  }
}
