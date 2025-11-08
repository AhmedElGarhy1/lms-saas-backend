import { Injectable } from '@nestjs/common';
import { NotificationMetricsService } from '../services/notification-metrics.service';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationType } from '../enums/notification-type.enum';

/**
 * Prometheus metrics service wrapper
 * 
 * Currently uses NotificationMetricsService for Prometheus-compatible output.
 * Can be upgraded to use prom-client library later without breaking changes.
 * 
 * This service provides a clean interface for Prometheus metrics while
 * leveraging the existing Redis-based metrics infrastructure.
 */
@Injectable()
export class PrometheusMetricsService {
  constructor(
    private readonly metricsService: NotificationMetricsService,
  ) {}

  /**
   * Record a notification event (sent, failed, etc.)
   * @param type - Notification type
   * @param channel - Notification channel
   * @param status - Status (sent, failed, retry)
   */
  async recordNotification(
    type: NotificationType,
    channel: NotificationChannel,
    status: 'sent' | 'failed' | 'retry',
  ): Promise<void> {
    try {
      switch (status) {
        case 'sent':
          await this.metricsService.incrementSent(channel, type);
          break;
        case 'failed':
          await this.metricsService.incrementFailed(channel, type);
          break;
        case 'retry':
          await this.metricsService.incrementRetry(channel);
          break;
      }
    } catch (error) {
      // Fail-open: metrics should never block operations
      // Error is silently ignored (already logged by NotificationMetricsService)
    }
  }

  /**
   * Record notification processing latency
   * @param type - Notification type
   * @param channel - Notification channel
   * @param latencySeconds - Latency in seconds
   */
  async recordLatency(
    type: NotificationType,
    channel: NotificationChannel,
    latencySeconds: number,
  ): Promise<void> {
    try {
      // Convert seconds to milliseconds for existing service
      const latencyMs = latencySeconds * 1000;
      await this.metricsService.recordLatency(channel, latencyMs);
    } catch (error) {
      // Fail-open: metrics should never block operations
    }
  }

  /**
   * Get Prometheus-formatted metrics
   * Returns metrics in Prometheus text format for scraping
   * @returns Prometheus metrics in text format
   */
  async getMetrics(): Promise<string> {
    try {
      return await this.metricsService.getPrometheusMetrics();
    } catch (error) {
      // Return empty metrics on error (fail-open)
      return '# Error retrieving metrics\n';
    }
  }

  /**
   * Get summary metrics in JSON format
   * Useful for API endpoints or dashboards
   */
  async getSummary(): Promise<{
    sent: Record<NotificationChannel, number>;
    failed: Record<NotificationChannel, number>;
    retry: Record<NotificationChannel, number>;
    latency: Record<NotificationChannel, number>;
    queueBacklog: number;
    activeConnections: number;
  }> {
    try {
      return await this.metricsService.getSummaryMetrics();
    } catch (error) {
      // Return empty summary on error (fail-open)
      const channels = Object.values(NotificationChannel);
      return {
        sent: Object.fromEntries(channels.map((c) => [c, 0])) as Record<NotificationChannel, number>,
        failed: Object.fromEntries(channels.map((c) => [c, 0])) as Record<NotificationChannel, number>,
        retry: Object.fromEntries(channels.map((c) => [c, 0])) as Record<NotificationChannel, number>,
        latency: Object.fromEntries(channels.map((c) => [c, 0])) as Record<NotificationChannel, number>,
        queueBacklog: 0,
        activeConnections: 0,
      };
    }
  }
}


