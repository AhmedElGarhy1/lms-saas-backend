import { applyDecorators, UseGuards, SetMetadata } from '@nestjs/common';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { RateLimitConfig } from '../interfaces/rate-limit-config.interface';

/**
 * Metadata key for rate limit configuration
 */
export const RATE_LIMIT_METADATA = 'rate-limit';

/**
 * Rate limit decorator
 * Replaces @Throttle() from @nestjs/throttler
 *
 * @example
 * ```ts
 * @RateLimit({ limit: 5, windowSeconds: 60 })
 * @Post('login')
 * async login() { ... }
 * ```
 *
 * @example
 * ```ts
 * @RateLimit({ limit: 10, windowSeconds: 60, failOpen: false })
 * @Post('sensitive-action')
 * async sensitiveAction() { ... }
 * ```
 */
export function RateLimit(config: Partial<RateLimitConfig>): MethodDecorator {
  return applyDecorators(
    SetMetadata(RATE_LIMIT_METADATA, config),
    UseGuards(RateLimitGuard),
  );
}
