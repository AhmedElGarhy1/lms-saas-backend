import {
  Controller,
  Get,
  Param,
  Post,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { AdminOnly } from '@/shared/common/decorators';
import { NotificationMetricsService } from '../services/notification-metrics.service';
import { NotificationCircuitBreakerService } from '../services/notification-circuit-breaker.service';
import { NotificationIdempotencyCacheService } from '../services/notification-idempotency-cache.service';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

/**
 * Admin-only controller for monitoring notification system health and metrics
 */
@Controller('notifications/admin')
@ApiTags('Notifications - Admin Monitoring')
@ApiBearerAuth()
@AdminOnly()
export class NotificationMonitoringController {
  constructor(
    private readonly metricsService: NotificationMetricsService,
    private readonly circuitBreakerService: NotificationCircuitBreakerService,
    private readonly idempotencyCache: NotificationIdempotencyCacheService,
    @InjectQueue('notifications')
    private readonly notificationsQueue: Queue,
    @InjectQueue('notification-triggers')
    private readonly triggersQueue: Queue,
  ) {}

  /**
   * Get comprehensive notification metrics
   * Returns sent, failed, retry counts, latency, and queue status
   */
  @Get('metrics')
  @ApiOperation({
    summary: 'Get notification system metrics',
    description:
      'Returns comprehensive metrics including sent/failed counts, latency, and queue status',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics retrieved successfully',
  })
  async getMetrics() {
    const summaryMetrics = await this.metricsService.getSummaryMetrics();
    const queueStatus = await this.getQueueStatus();

    return {
      ...summaryMetrics,
      queues: queueStatus,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get circuit breaker health status for all channels
   */
  @Get('health')
  @ApiOperation({
    summary: 'Get circuit breaker health status',
    description:
      'Returns health status for all notification channels including circuit breaker state, failure counts, and last failure time',
  })
  @ApiResponse({
    status: 200,
    description: 'Health status retrieved successfully',
  })
  async getHealth() {
    const healthStatus = await this.circuitBreakerService.getHealthStatus();

    return {
      channels: healthStatus,
      timestamp: new Date().toISOString(),
      overall: this.calculateOverallHealth(healthStatus),
    };
  }

  /**
   * Get idempotency cache statistics
   */
  @Get('idempotency/stats')
  @ApiOperation({
    summary: 'Get idempotency cache statistics',
    description:
      'Returns statistics about the idempotency cache including active locks and cache hit rate',
  })
  @ApiResponse({
    status: 200,
    description: 'Idempotency statistics retrieved successfully',
  })
  async getIdempotencyStats() {
    const stats = await this.idempotencyCache.getStats();
    const health = await this.idempotencyCache.getHealthStatus();

    return {
      ...stats,
      ...health,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get queue status for all notification queues
   */
  @Get('queues/status')
  @ApiOperation({
    summary: 'Get queue status',
    description:
      'Returns status for all notification queues including waiting, active, completed, and failed job counts',
  })
  @ApiResponse({
    status: 200,
    description: 'Queue status retrieved successfully',
  })
  async getQueueStatusEndpoint() {
    const status = await this.getQueueStatus();

    return {
      ...status,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reset circuit breaker for a specific channel
   */
  @Post('circuit-breaker/:channel/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset circuit breaker for a channel',
    description:
      'Manually resets the circuit breaker for a specific notification channel',
  })
  @ApiParam({
    name: 'channel',
    enum: NotificationChannel,
    description: 'Notification channel to reset',
  })
  @ApiResponse({
    status: 200,
    description: 'Circuit breaker reset successfully',
  })
  async resetCircuitBreaker(@Param('channel') channel: NotificationChannel) {
    await this.circuitBreakerService.reset(channel);

    return {
      message: `Circuit breaker reset for channel: ${channel}`,
      channel,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get detailed metrics for a specific channel
   */
  @Get('metrics/:channel')
  @ApiOperation({
    summary: 'Get metrics for a specific channel',
    description: 'Returns detailed metrics for a specific notification channel',
  })
  @ApiParam({
    name: 'channel',
    enum: NotificationChannel,
    description: 'Notification channel',
  })
  @ApiResponse({
    status: 200,
    description: 'Channel metrics retrieved successfully',
  })
  async getChannelMetrics(@Param('channel') channel: NotificationChannel) {
    const sent = await this.metricsService.getCounter('sent', channel);
    const failed = await this.metricsService.getCounter('failed', channel);
    const retry = await this.metricsService.getCounter('retry', channel);
    const avgLatency = await this.metricsService.getAverageLatency(channel);
    const health = await this.circuitBreakerService.getCircuitState(channel);
    const failureCount =
      await this.circuitBreakerService.getFailureCount(channel);

    return {
      channel,
      metrics: {
        sent,
        failed,
        retry,
        averageLatencyMs: avgLatency,
      },
      health: {
        circuitState: health,
        failureCount,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get queue status for all notification queues
   */
  private async getQueueStatus() {
    const [notificationsStatus, triggersStatus] = await Promise.all([
      this.getQueueMetrics(this.notificationsQueue, 'notifications'),
      this.getQueueMetrics(this.triggersQueue, 'notification-triggers'),
    ]);

    return {
      notifications: notificationsStatus,
      triggers: triggersStatus,
    };
  }

  /**
   * Get metrics for a specific queue
   */
  private async getQueueMetrics(queue: Queue, name: string) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      name,
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  /**
   * Calculate overall health from channel health status
   */
  private calculateOverallHealth(
    healthStatus: Record<
      NotificationChannel,
      {
        state: string;
        failureCount: number;
        lastFailureTime: Date | null;
        isHealthy: boolean;
      }
    >,
  ): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    healthyChannels: number;
    totalChannels: number;
    degradedChannels: NotificationChannel[];
    unhealthyChannels: NotificationChannel[];
  } {
    const channels = Object.keys(healthStatus) as NotificationChannel[];
    const healthyChannels = channels.filter(
      (ch) => healthStatus[ch].isHealthy,
    );
    const degradedChannels = channels.filter(
      (ch) =>
        !healthStatus[ch].isHealthy &&
        healthStatus[ch].state !== 'OPEN' &&
        healthStatus[ch].failureCount > 0,
    );
    const unhealthyChannels = channels.filter(
      (ch) => healthStatus[ch].state === 'OPEN',
    );

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyChannels.length > 0) {
      status = 'unhealthy';
    } else if (degradedChannels.length > 0) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return {
      status,
      healthyChannels: healthyChannels.length,
      totalChannels: channels.length,
      degradedChannels,
      unhealthyChannels,
    };
  }
}
