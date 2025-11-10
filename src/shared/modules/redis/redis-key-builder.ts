import { Config } from '../../config/config';

/**
 * Creates a Redis key builder for a specific module
 * Returns a const object with methods to build Redis keys
 *
 * @example
 * ```typescript
 * const keys = createRedisKeyBuilder('notification');
 * const cacheKey = keys.buildKey('cache', userId); // lms:notification:cache:123
 * const pattern = keys.buildPattern('session'); // lms:notification:session:*
 * ```
 */
export function createRedisKeyBuilder(
  module: string,
  prefix?: string,
): {
  buildKey: (...segments: string[]) => string;
  buildPattern: (category: string) => string;
  buildPatternWithFilter: (category: string, filter: string) => string;
  cache: (category: string, ...identifiers: string[]) => string;
  lock: (category: string, ...identifiers: string[]) => string;
  rateLimit: (identifier: string) => string;
  circuitBreaker: (category: string, identifier: string) => string;
  connection: (identifier: string) => string;
  metrics: (type: string, ...identifiers: string[]) => string;
  connectionRateLimitIp: (ip: string) => string;
  connectionRateLimitUser: (userId: string) => string;
  connectionRateLimitMetric: (type: string) => string;
  connectionCounterActive: () => string;
} {
  const keyPrefix = prefix || Config.redis.keyPrefix;

  return {
    buildKey(...segments: string[]): string {
      return [keyPrefix, module, ...segments].join(':');
    },

    buildPattern(category: string): string {
      return `${keyPrefix}:${module}:${category}:*`;
    },

    buildPatternWithFilter(category: string, filter: string): string {
      return `${keyPrefix}:${module}:${category}:*${filter}*`;
    },

    cache(category: string, ...identifiers: string[]): string {
      return [keyPrefix, module, 'cache', category, ...identifiers].join(':');
    },

    lock(category: string, ...identifiers: string[]): string {
      return [keyPrefix, module, 'lock', category, ...identifiers].join(':');
    },

    rateLimit(identifier: string): string {
      return [keyPrefix, module, 'rate', identifier].join(':');
    },

    circuitBreaker(category: string, identifier: string): string {
      return [keyPrefix, module, 'circuit', category, identifier].join(':');
    },

    connection(identifier: string): string {
      return [keyPrefix, module, 'connection', identifier].join(':');
    },

    metrics(type: string, ...identifiers: string[]): string {
      return [keyPrefix, module, 'metrics', type, ...identifiers].join(':');
    },

    connectionRateLimitIp(ip: string): string {
      return [keyPrefix, module, 'connection', 'rate', 'ip', ip].join(':');
    },

    connectionRateLimitUser(userId: string): string {
      return [keyPrefix, module, 'connection', 'rate', 'user', userId].join(
        ':',
      );
    },

    connectionRateLimitMetric(type: string): string {
      return [
        keyPrefix,
        module,
        'metrics',
        'connection_rate_limit',
        type,
        'total',
      ].join(':');
    },

    connectionCounterActive(): string {
      return [keyPrefix, module, 'connection', 'counter', 'active'].join(':');
    },
  };
}
