import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { RedisService } from '@/shared/modules/redis/redis.service';
import { LoggerService } from '@/shared/services/logger.service';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { Config } from '@/shared/config/config';

interface BatchEntry {
  key: string;
  increment: number;
  ttl: number;
}

interface LatencyEntry {
  key: string;
  score: number;
  member: string;
  ttl: number;
}

interface AvgLatencyEntry {
  key: string;
  count: number;
  sum: number;
  avg: number;
  ttl: number;
}

/**
 * Service for batching metrics updates to reduce Redis calls
 * Accumulates increments and flushes them periodically or when batch size is reached
 */
@Injectable()
export class MetricsBatchService implements OnModuleDestroy {
  private readonly redisKeyPrefix: string;
  private readonly METRIC_TTL = 30 * 24 * 60 * 60; // 30 days
  private readonly batchSize: number;
  private readonly flushIntervalMs: number;

  // Batch accumulators
  private counterBatch: Map<string, number> = new Map();
  private latencyBatch: LatencyEntry[] = [];
  private avgLatencyBatch: Map<string, { count: number; sum: number }> =
    new Map();
  private gaugeUpdates: Map<string, number> = new Map();

  private flushTimer?: NodeJS.Timeout;

  constructor(
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {
    this.redisKeyPrefix = Config.redis.keyPrefix;
    this.batchSize = Config.notification.metricsBatchSize;
    this.flushIntervalMs = Config.notification.metricsFlushIntervalMs;

    // Start periodic flush timer
    this.startPeriodicFlush();
  }

  /**
   * Queue counter increment for batch processing
   */
  queueIncrement(
    metric: 'sent' | 'failed' | 'retry',
    channel: NotificationChannel,
    type?: string,
  ): void {
    const key = this.getCounterKey(metric, channel, type);
    const current = this.counterBatch.get(key) || 0;
    this.counterBatch.set(key, current + 1);

    // Auto-flush if batch size reached
    if (this.counterBatch.size >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Queue latency recording for batch processing
   */
  queueLatency(channel: NotificationChannel, latencyMs: number): void {
    const key = this.getLatencyKey(channel);
    const member = `${Date.now()}:${latencyMs}`;
    this.latencyBatch.push({
      key,
      score: latencyMs,
      member,
      ttl: this.METRIC_TTL,
    });

    // Update average latency accumulator
    const avgKey = `${key}:avg`;
    const current = this.avgLatencyBatch.get(avgKey) || { count: 0, sum: 0 };
    this.avgLatencyBatch.set(avgKey, {
      count: current.count + 1,
      sum: current.sum + latencyMs,
    });

    // Auto-flush if batch size reached
    if (this.latencyBatch.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Queue gauge update for batch processing
   */
  queueGaugeUpdate(metric: string, value: number): void {
    this.gaugeUpdates.set(metric, value);
    // Gauges are immediately updated (no batching needed for latest value)
    this.flushGauges();
  }

  /**
   * Flush all batched metrics to Redis using pipeline
   */
  async flush(): Promise<void> {
    if (
      this.counterBatch.size === 0 &&
      this.latencyBatch.length === 0 &&
      this.avgLatencyBatch.size === 0
    ) {
      return; // Nothing to flush
    }

    const client = this.redisService.getClient();
    const pipeline = client.pipeline();

    try {
      // Flush counter increments
      for (const [key, increment] of this.counterBatch.entries()) {
        pipeline.incrby(key, increment);
        pipeline.expire(key, this.METRIC_TTL);
      }

      // Flush latency records (sorted set)
      for (const entry of this.latencyBatch) {
        pipeline.zadd(entry.key, entry.score, entry.member);
        pipeline.expire(entry.key, entry.ttl);
      }

      // Flush average latency updates
      for (const [key, { count, sum }] of this.avgLatencyBatch.entries()) {
        const avg = Math.round(sum / count);
        pipeline.set(key, `${count}:${sum}:${avg}`);
        pipeline.expire(key, this.METRIC_TTL);
      }

      // Execute pipeline
      await pipeline.exec();

      // Clear batches
      this.counterBatch.clear();
      this.latencyBatch = [];
      this.avgLatencyBatch.clear();

      this.logger.debug(
        `Flushed metrics batch to Redis`,
        'MetricsBatchService',
      );
    } catch (error) {
      this.logger.error(
        `Failed to flush metrics batch`,
        error instanceof Error ? error.stack : undefined,
        'MetricsBatchService',
        {
          counterBatchSize: this.counterBatch.size,
          latencyBatchSize: this.latencyBatch.length,
          avgLatencyBatchSize: this.avgLatencyBatch.size,
        },
      );
      // Don't clear batches on error - allow retry on next flush
    }
  }

  /**
   * Flush gauge updates immediately (gauges represent current state)
   */
  private async flushGauges(): Promise<void> {
    if (this.gaugeUpdates.size === 0) {
      return;
    }

    const client = this.redisService.getClient();
    const pipeline = client.pipeline();

    try {
      for (const [metric, value] of this.gaugeUpdates.entries()) {
        const key = this.getGaugeKey(metric);
        pipeline.set(key, value.toString());
        pipeline.expire(key, this.METRIC_TTL);
      }

      await pipeline.exec();
      this.gaugeUpdates.clear();
    } catch (error) {
      this.logger.error(
        `Failed to flush gauge updates`,
        error instanceof Error ? error.stack : undefined,
        'MetricsBatchService',
      );
    }
  }

  /**
   * Start periodic flush timer
   */
  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch((error) => {
        this.logger.error(
          `Periodic flush failed`,
          error instanceof Error ? error.stack : undefined,
          'MetricsBatchService',
        );
      });
    }, this.flushIntervalMs);
  }

  /**
   * Stop periodic flush timer (for cleanup)
   */
  onModuleDestroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    // Flush any remaining metrics before shutdown
    this.flush().catch((error) => {
      this.logger.error(
        `Final flush failed on shutdown`,
        error instanceof Error ? error.stack : undefined,
        'MetricsBatchService',
      );
    });
  }

  /**
   * Get current batch statistics
   */
  getBatchStats(): {
    counterBatchSize: number;
    latencyBatchSize: number;
    avgLatencyBatchSize: number;
    gaugeUpdatesSize: number;
  } {
    return {
      counterBatchSize: this.counterBatch.size,
      latencyBatchSize: this.latencyBatch.length,
      avgLatencyBatchSize: this.avgLatencyBatch.size,
      gaugeUpdatesSize: this.gaugeUpdates.size,
    };
  }

  private getCounterKey(
    metric: string,
    channel: NotificationChannel,
    type?: string,
  ): string {
    const parts = [
      this.redisKeyPrefix,
      'metrics',
      'counter',
      metric,
      channel.toLowerCase(),
    ];
    if (type) parts.push(type.toLowerCase());
    return parts.join(':');
  }

  private getLatencyKey(channel: NotificationChannel): string {
    return `${this.redisKeyPrefix}:metrics:latency:${channel.toLowerCase()}`;
  }

  private getGaugeKey(metric: string): string {
    return `${this.redisKeyPrefix}:metrics:gauge:${metric}`;
  }
}
