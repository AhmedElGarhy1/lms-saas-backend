import { createRedisKeyBuilder } from '@/shared/modules/redis/redis-key-builder';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationType } from '../enums/notification-type.enum';

const baseKeys = createRedisKeyBuilder('notification');

/**
 * Notification-specific Redis key builder
 * A const object with methods to build notification module Redis keys
 *
 * @example
 * ```typescript
 * import { notificationKeys } from './utils/notification-redis-key-builder';
 * const idempotencyKey = notificationKeys.idempotency(correlationId, type, channel, recipient);
 * const pattern = notificationKeys.idempotencyPattern();
 * ```
 */
export const notificationKeys = {
  /**
   * Build idempotency cache key
   * Pattern: {prefix}:notification:idempotency:{correlationId}:{type}:{channel}:{recipient}
   */
  idempotency(
    correlationId: string,
    type: NotificationType,
    channel: NotificationChannel,
    recipient: string,
  ): string {
    const recipientHash =
      recipient.length > 50
        ? Buffer.from(recipient).toString('base64').slice(0, 50)
        : recipient;

    return baseKeys.buildKey(
      'idempotency',
      correlationId,
      type,
      channel,
      recipientHash,
    );
  },

  /**
   * Build pattern for scanning idempotency keys
   * Pattern: {prefix}:notification:idempotency:*
   */
  idempotencyPattern(): string {
    return baseKeys.buildPattern('idempotency');
  },

  /**
   * Build distributed lock key
   * Pattern: {prefix}:notification:lock:{correlationId}:{type}:{channel}:{recipient}
   */
  lock(
    correlationId: string,
    type: NotificationType,
    channel: NotificationChannel,
    recipient: string,
  ): string {
    const recipientHash =
      recipient.length > 50
        ? Buffer.from(recipient).toString('base64').slice(0, 50)
        : recipient;

    return baseKeys.buildKey(
      'lock',
      correlationId,
      type,
      channel,
      recipientHash,
    );
  },

  /**
   * Build pattern for scanning lock keys
   * Pattern: {prefix}:notification:lock:*
   */
  lockPattern(): string {
    return baseKeys.buildPattern('lock');
  },

  /**
   * Build template source cache key
   * Pattern: {prefix}:notification:template:source:{cacheKey}
   */
  templateSource(cacheKey: string): string {
    return baseKeys.buildKey('template', 'source', cacheKey);
  },

  /**
   * Build template compiled cache key
   * Pattern: {prefix}:notification:template:compiled:{cacheKey}
   */
  templateCompiled(cacheKey: string): string {
    return baseKeys.buildKey('template', 'compiled', cacheKey);
  },

  /**
   * Build pattern for scanning template keys
   * Pattern: {prefix}:notification:template:source:*
   */
  templateSourcePattern(): string {
    return `${baseKeys.buildKey('template', 'source')}:*`;
  },

  /**
   * Build pattern for scanning template keys with optional filter
   * Pattern: {prefix}:notification:template:source:*{filter}*
   */
  templateSourcePatternWithFilter(filter: string): string {
    return `${baseKeys.buildKey('template', 'source')}:*${filter}*`;
  },

  /**
   * Build rate limit key
   * Pattern: {prefix}:notification:rate:{key}
   */
  rateLimit(key: string): string {
    return baseKeys.rateLimit(key);
  },

  /**
   * Build pattern for scanning rate limit keys
   * Pattern: {prefix}:notification:rate:*
   */
  rateLimitPattern(): string {
    return baseKeys.buildPattern('rate');
  },

  /**
   * Build circuit breaker state key
   * Pattern: {prefix}:notification:circuit:state:{channel}
   */
  circuitBreakerState(channel: NotificationChannel): string {
    return baseKeys.circuitBreaker('state', channel);
  },

  /**
   * Build circuit breaker failures key
   * Pattern: {prefix}:notification:circuit:failures:{channel}
   */
  circuitBreakerFailures(channel: NotificationChannel): string {
    return baseKeys.circuitBreaker('failures', channel);
  },

  /**
   * Build pattern for scanning circuit breaker keys
   * Pattern: {prefix}:notification:circuit:*
   */
  circuitBreakerPattern(): string {
    return baseKeys.buildPattern('circuit');
  },

  /**
   * Build WebSocket connection key
   * Pattern: {prefix}:notification:connection:{userId}
   */
  connection(userId: string): string {
    return baseKeys.connection(userId);
  },

  /**
   * Build pattern for scanning connection keys
   * Pattern: {prefix}:notification:connection:*
   */
  connectionPattern(): string {
    return baseKeys.buildPattern('connection');
  },

  /**
   * Build metrics counter key
   * Pattern: {prefix}:notification:metrics:counter:{metric}:{channel}:{type?}
   */
  metricsCounter(
    metric: string,
    channel: NotificationChannel,
    type?: string,
  ): string {
    if (type) {
      return baseKeys.metrics(
        'counter',
        metric,
        channel.toLowerCase(),
        type.toLowerCase(),
      );
    }
    return baseKeys.metrics('counter', metric, channel.toLowerCase());
  },

  /**
   * Build metrics latency key
   * Pattern: {prefix}:notification:metrics:latency:{channel}
   */
  metricsLatency(channel: NotificationChannel): string {
    return baseKeys.metrics('latency', channel.toLowerCase());
  },

  /**
   * Build metrics gauge key
   * Pattern: {prefix}:notification:metrics:gauge:{metric}
   */
  metricsGauge(metric: string): string {
    return baseKeys.metrics('gauge', metric);
  },

  /**
   * Build pattern for scanning metrics keys
   * Pattern: {prefix}:notification:metrics:*
   */
  metricsPattern(): string {
    return baseKeys.buildPattern('metrics');
  },

  /**
   * Build DLQ last cleanup timestamp key
   * Pattern: {prefix}:notification:dlq:last_cleanup
   */
  dlqLastCleanup(): string {
    return baseKeys.buildKey('dlq', 'last_cleanup');
  },

  /**
   * Build connection rate limit key for IP
   * Pattern: {prefix}:notification:connection:rate:ip:{ip}
   */
  connectionRateLimitIp(ip: string): string {
    return baseKeys.connectionRateLimitIp(ip);
  },

  /**
   * Build connection rate limit key for user
   * Pattern: {prefix}:notification:connection:rate:user:{userId}
   */
  connectionRateLimitUser(userId: string): string {
    return baseKeys.connectionRateLimitUser(userId);
  },

  /**
   * Build connection rate limit metric key
   * Pattern: {prefix}:notification:metrics:connection_rate_limit:{type}:total
   */
  connectionRateLimitMetric(type: string): string {
    return baseKeys.connectionRateLimitMetric(type);
  },

  /**
   * Build active connections counter key
   * Pattern: {prefix}:notification:connection:counter:active
   */
  connectionCounterActive(): string {
    return baseKeys.connectionCounterActive();
  },
};
