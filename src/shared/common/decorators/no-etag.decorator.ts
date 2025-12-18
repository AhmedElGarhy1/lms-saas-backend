import { SetMetadata } from '@nestjs/common';

export const NO_ETAG_KEY = 'no-etag';

/**
 * Decorator to skip ETag generation for a specific route or controller.
 * Use this when you want to disable browser caching for certain endpoints
 * (e.g., authentication endpoints, real-time data).
 *
 * @example
 * ```typescript
 * @Get('sensitive-data')
 * @NoETag()
 * getSensitiveData() {
 *   return this.service.getData();
 * }
 * ```
 */
export const NoETag = () => SetMetadata(NO_ETAG_KEY, true);
