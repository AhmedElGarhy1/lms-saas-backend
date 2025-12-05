import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { RedisService } from '@/shared/modules/redis/redis.service';
import { notificationKeys } from '../utils/notification-redis-key-builder';
import { BaseService } from '@/shared/common/services/base.service';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationConfig } from '../config/notification.config';

interface LatencyEntry {
  key: string;
  score: number;
  member: string;
  ttl: number;
}

/**
 * Service for batching metrics updates to reduce Redis calls
 * Accumulates increments and flushes them periodically or when batch size is reached
 */
@Injectable()
export class MetricsBatchService
  extends BaseService
  implements OnModuleDestroy
{
  private readonly logger: Logger = new Logger(MetricsBatchService.name);
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

  constructor(private readonly redisService: RedisService) {
    super();
    this.batchSize = NotificationConfig.metricsBatchSize;
    this.flushIntervalMs = NotificationConfig.metricsFlushIntervalMs;

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
      void this.flush();
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
      void this.flush();
    }
  }

  /**
   * Queue gauge update for batch processing
   */
  queueGaugeUpdate(metric: string, value: number): void {
    this.gaugeUpdates.set(metric, value);
    // Gauges are immediately updated (no batching needed for latest value)
    void this.flushGauges();
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
    } catch (error) {
      this.logger.error(
        `Failed to flush metrics batch - counterBatchSize: ${this.counterBatch.size}, latencyBatchSize: ${this.latencyBatch.length}, avgLatencyBatchSize: ${this.avgLatencyBatch.size}`,
        error instanceof Error ? error.stack : String(error),
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
      this.logger.error(`Failed to flush gauge updates`, error);
    }
  }

  /**
   * Start periodic flush timer
   */
  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch((error) => {
        this.logger.error(`Periodic flush failed`, error);
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
      this.logger.error(`Final flush failed on shutdown`, error);
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
    return notificationKeys.metricsCounter(metric, channel, type);
  }

  private getLatencyKey(channel: NotificationChannel): string {
    return notificationKeys.metricsLatency(channel);
  }

  private getGaugeKey(metric: string): string {
    return notificationKeys.metricsGauge(metric);
  }
}
