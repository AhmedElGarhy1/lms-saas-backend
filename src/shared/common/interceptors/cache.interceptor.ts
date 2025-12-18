import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { CacheKeyBuilderService } from '../services/cache-key-builder.service';
import { CACHEABLE_KEY, NO_CACHE_KEY } from '../decorators/cache.decorator';

/**
 * Cache Interceptor
 *
 * Implements server-side caching for GET requests using Redis.
 * Cache keys are scoped per user using userId + userProfileId + centerId combination.
 *
 * Features:
 * - Automatic caching for GET requests (unless @NoCache() is applied)
 * - User-scoped cache keys (data isolation between users)
 * - Configurable TTL per route (via @Cacheable(ttl))
 * - Cache hit/miss handling
 *
 * @example
 * ```typescript
 * // Default caching (60s TTL)
 * @Get('users')
 * getUsers() {
 *   return this.service.findAll();
 * }
 *
 * // Custom TTL
 * @Get('users')
 * @Cacheable(300) // 5 minutes
 * getUsers() {
 *   return this.service.findAll();
 * }
 *
 * // Disable caching
 * @Get('realtime-data')
 * @NoCache()
 * getRealtimeData() {
 *   return this.service.getRealtimeData();
 * }
 * ```
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly cacheKeyBuilder: CacheKeyBuilderService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();

    // Only process GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Check if caching is disabled for this route
    const noCache = this.reflector.getAllAndOverride<boolean>(NO_CACHE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (noCache) {
      return next.handle();
    }

    // Get cache configuration (TTL) from @Cacheable decorator
    const cacheable = this.reflector.getAllAndOverride<{ ttl: number }>(
      CACHEABLE_KEY,
      [context.getHandler(), context.getClass()],
    );
    const defaultTtl = 0 * 1000;
    const ttl = cacheable?.ttl ? cacheable.ttl * 1000 : defaultTtl; // Convert to milliseconds

    // If TTL is 0, caching is disabled - skip all cache operations
    if (ttl <= 0) {
      return next.handle();
    }

    // Build cache key from request context
    let cacheKey: string;
    try {
      const query = request.query as Record<string, any>;
      cacheKey = this.cacheKeyBuilder.buildKey(request.path, query);
    } catch {
      // If cache key generation fails (e.g., no userId), skip caching
      // This ensures we don't break the request flow
      return next.handle();
    }

    // Try to get cached response
    let cachedResponse: any;
    try {
      cachedResponse = await this.cacheManager.get(cacheKey);
    } catch (error) {
      // If cache read fails, log but continue with normal flow
      // This ensures cache failures don't break the request
      console.warn('Failed to read from cache:', error);
      return next.handle();
    }

    if (cachedResponse !== undefined && cachedResponse !== null) {
      // Cache hit - return cached response immediately
      // The cached response is already formatted by ResponseInterceptor/ETagInterceptor
      // so it can be returned directly
      return of(cachedResponse);
    }

    // Cache miss - execute handler and cache the response
    return next.handle().pipe(
      tap((data) => {
        // Store response in cache with TTL (fire and forget)
        // Only cache successful responses (non-null/non-undefined)
        if (data !== null && data !== undefined) {
          // Use void to explicitly ignore the promise
          // This prevents RxJS from waiting for async operations
          void (async () => {
            try {
              await this.cacheManager.set(cacheKey, data, ttl);
            } catch (error) {
              // If cache write fails, log but don't break the request
              // This ensures cache failures don't affect application functionality
              console.warn('Failed to cache response:', error);
            }
          })();
        }
      }),
    );
  }
}
