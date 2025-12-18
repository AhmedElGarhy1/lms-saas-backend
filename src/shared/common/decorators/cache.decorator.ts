import { SetMetadata } from '@nestjs/common';

export const CACHEABLE_KEY = 'cacheable';
export const NO_CACHE_KEY = 'no-cache';

/**
 * Decorator to enable caching for a specific route.
 * When applied, the route response will be cached in Redis.
 *
 * @param ttl - Time to live in seconds (default: 60 seconds)
 *
 * @example
 * ```typescript
 * @Get('users')
 * @Cacheable(300) // Cache for 5 minutes
 * getUsers() {
 *   return this.userService.findAll();
 * }
 * ```
 */
export const Cacheable = (ttl?: number) =>
  SetMetadata(CACHEABLE_KEY, { ttl: ttl ?? 60 });

/**
 * Decorator to disable caching for a specific route.
 * Use this for sensitive data, real-time endpoints, or endpoints that should not be cached.
 *
 * @example
 * ```typescript
 * @Get('sensitive-data')
 * @NoCache()
 * getSensitiveData() {
 *   return this.service.getData();
 * }
 * ```
 */
export const NoCache = () => SetMetadata(NO_CACHE_KEY, true);
