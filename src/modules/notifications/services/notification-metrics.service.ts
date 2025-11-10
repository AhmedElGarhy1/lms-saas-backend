import { Injectable } from '@nestjs/common';
import { RedisService } from '@/shared/modules/redis/redis.service';
import { notificationKeys } from '../utils/notification-redis-key-builder';
import { LoggerService } from '@/shared/services/logger.service';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationStatus } from '../enums/notification-status.enum';
import { MetricsBatchService } from './metrics-batch.service';
import { METRICS_CONSTANTS, REDIS_CONSTANTS } from '../constants/notification.constants';
import { NotificationConfig } from '../config/notification.config';

/**
 * Service for tracking notification metrics (Prometheus-compatible)
 * Stores metrics in Redis for scalability
 *
 * Error Handling Strategy: FAIL_OPEN
 * - Metrics failures should never block notifications
 * - Metrics are for observability, not business logic
 * - Errors are logged but do not propagate
 * - Batching ensures failures don't affect notification flow
 *
 * @see ERROR_HANDLING_CONFIG.METRICS
 */
@Injectable()
export class NotificationMetricsService {
  private readonly METRIC_TTL = METRICS_CONSTANTS.METRIC_TTL_SECONDS;

  constructor(
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
    private readonly batchService: MetricsBatchService,
  ) {}

  /**
   * Increment counter for sent notifications (batched)
   */
  async incrementSent(
    channel: NotificationChannel,
    type?: string,
  ): Promise<void> {
    this.batchService.queueIncrement('sent', channel, type);
  }

  /**
   * Increment counter for failed notifications (batched)
   */
  async incrementFailed(
    channel: NotificationChannel,
    type?: string,
  ): Promise<void> {
    this.batchService.queueIncrement('failed', channel, type);
  }

  /**
   * Increment counter for retries (batched)
   */
  async incrementRetry(channel: NotificationChannel): Promise<void> {
    this.batchService.queueIncrement('retry', channel);
  }

  /**
   * Record delivery latency (in milliseconds) - batched
   */
  async recordLatency(
    channel: NotificationChannel,
    latencyMs: number,
  ): Promise<void> {
    this.batchService.queueLatency(channel, latencyMs);
  }

  /**
   * Update queue backlog size (gauges are updated immediately)
   */
  async setQueueBacklog(size: number): Promise<void> {
    this.batchService.queueGaugeUpdate('queue_backlog', size);
  }

  /**
   * Update active socket connections count (gauges are updated immediately)
   */
  async setActiveConnections(count: number): Promise<void> {
    this.batchService.queueGaugeUpdate('active_connections', count);
  }

  /**
   * Get counter value
   */
  async getCounter(
    metric: 'sent' | 'failed' | 'retry',
    channel: NotificationChannel,
    type?: string,
  ): Promise<number> {
    const key = this.getCounterKey(metric, channel, type);
    const value = await this.redisService.getClient().get(key);
    return value ? parseInt(value, 10) : 0;
  }

  /**
   * Get average latency
   */
  async getAverageLatency(channel: NotificationChannel): Promise<number> {
    const key = `${this.getLatencyKey(channel)}:avg`;
    const value = await this.redisService.getClient().get(key);
    if (value) {
      const [, , avg] = value.split(':').map(Number);
      return avg;
    }
    return 0;
  }

  /**
   * Get queue backlog size
   */
  async getQueueBacklog(): Promise<number> {
    const key = this.getGaugeKey('queue_backlog');
    const value = await this.redisService.getClient().get(key);
    return value ? parseInt(value, 10) : 0;
  }

  /**
   * Get active connections count
   */
  async getActiveConnections(): Promise<number> {
    const key = this.getGaugeKey('active_connections');
    const value = await this.redisService.getClient().get(key);
    return value ? parseInt(value, 10) : 0;
  }

  /**
   * Get all metrics as Prometheus-compatible format
   */
  async getPrometheusMetrics(): Promise<string> {
    const lines: string[] = [];
    const channels = Object.values(NotificationChannel);

    // Counters
    for (const channel of channels) {
      const sent = await this.getCounter('sent', channel);
      const failed = await this.getCounter('failed', channel);
      const retry = await this.getCounter('retry', channel);

      lines.push(
        `# TYPE notification_sent_total counter`,
        `notification_sent_total{channel="${channel}"} ${sent}`,
        `# TYPE notification_failed_total counter`,
        `notification_failed_total{channel="${channel}"} ${failed}`,
        `# TYPE notification_retry_total counter`,
        `notification_retry_total{channel="${channel}"} ${retry}`,
      );

      const latency = await this.getAverageLatency(channel);
      lines.push(
        `# TYPE notification_latency_ms gauge`,
        `notification_latency_ms{channel="${channel}"} ${latency}`,
      );
    }

    // Gauges
    const queueBacklog = await this.getQueueBacklog();
    const activeConnections = await this.getActiveConnections();

    lines.push(
      `# TYPE notification_queue_backlog gauge`,
      `notification_queue_backlog ${queueBacklog}`,
      `# TYPE notification_active_connections gauge`,
      `notification_active_connections ${activeConnections}`,
    );

    return lines.join('\n');
  }

  /**
   * Get summary metrics (JSON format)
   */
  async getSummaryMetrics(): Promise<{
    sent: Record<NotificationChannel, number>;
    failed: Record<NotificationChannel, number>;
    retry: Record<NotificationChannel, number>;
    latency: Record<NotificationChannel, number>;
    queueBacklog: number;
    activeConnections: number;
  }> {
    const channels = Object.values(NotificationChannel);
    const sent: Record<string, number> = {};
    const failed: Record<string, number> = {};
    const retry: Record<string, number> = {};
    const latency: Record<string, number> = {};

    for (const channel of channels) {
      sent[channel] = await this.getCounter('sent', channel);
      failed[channel] = await this.getCounter('failed', channel);
      retry[channel] = await this.getCounter('retry', channel);
      latency[channel] = await this.getAverageLatency(channel);
    }

    return {
      sent: sent as Record<NotificationChannel, number>,
      failed: failed as Record<NotificationChannel, number>,
      retry: retry as Record<NotificationChannel, number>,
      latency: latency as Record<NotificationChannel, number>,
      queueBacklog: await this.getQueueBacklog(),
      activeConnections: await this.getActiveConnections(),
    };
  }

  /**
   * Reset all metrics (for testing)
   */
  async resetMetrics(): Promise<void> {
    const pattern = notificationKeys.metricsPattern();
    let cursor = '0';
    const keysToDelete: string[] = [];

    do {
      const [nextCursor, keys] = await this.redisService
        .getClient()
        .scan(cursor, 'MATCH', pattern, 'COUNT', REDIS_CONSTANTS.SCAN_BATCH_SIZE);
      cursor = nextCursor;
      keysToDelete.push(...keys);
    } while (cursor !== '0');

    if (keysToDelete.length > 0) {
      await this.redisService.getClient().del(...keysToDelete);
      this.logger.debug(`Reset ${keysToDelete.length} metric keys`);
    }
  }

  private getCounterKey(
    metric: string,
    channel: NotificationChannel,
    type?: string,
  ): string {
    return notificationKeys.metricsCounter(metric, channel, type);
  }

  private getLatencyKey(channel: NotificationChannel): string {
    return notificationKeys.metricsLatency(channel);
  }

  private getGaugeKey(metric: string): string {
    return notificationKeys.metricsGauge(metric);
  }
}
