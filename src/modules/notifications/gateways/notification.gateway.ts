import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { RedisService } from '@/shared/modules/redis/redis.service';
import { notificationKeys } from '../utils/notification-redis-key-builder';
import { Notification } from '../entities/notification.entity';
import { NotificationMetricsService } from '../services/notification-metrics.service';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { SlidingWindowRateLimiter } from '../utils/sliding-window-rate-limit';
import {
  notificationGatewayConfig,
  NotificationGatewayConfig,
} from '../config/notification-gateway.config';
import { SocketData } from '../types/websocket.types';
import { retryOperation } from '../utils/retry.util';

/**
 * Maximum keys to process per reconciliation cycle to prevent blocking
 */
const MAX_RECONCILE_KEYS = 1000;

/**
 * Maximum connections to process per reconciliation cycle
 */
const MAX_RECONCILE_CONNECTIONS = 10000;

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3001', 'https://lms-saas-khaki.vercel.app'],
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly config: NotificationGatewayConfig;
  private readonly removeSocketScript: string;
  private readonly connectionsCounterKey: string;
  private readonly rateLimiter: SlidingWindowRateLimiter;
  private readonly loggerService: Logger;

  constructor(
    private readonly redisService: RedisService,
    private readonly metricsService: NotificationMetricsService,
  ) {
    // Use class name as context
    const context = this.constructor.name;
    this.loggerService = new Logger(context);

    // Load configuration from factory
    this.config = notificationGatewayConfig();

    // Counter key for active connections
    this.connectionsCounterKey = notificationKeys.connectionCounterActive();

    // Initialize sliding window rate limiter
    this.rateLimiter = new SlidingWindowRateLimiter(
      this.redisService,
    );

    // Lua script for atomic socket removal: SREM + SCARD + DEL if empty
    this.removeSocketScript = `
      local removed = redis.call('SREM', KEYS[1], ARGV[1])
      local count = redis.call('SCARD', KEYS[1])
      if count == 0 then
        redis.call('DEL', KEYS[1])
      end
      return {removed, count}
    `;
  }

  async handleConnection(client: Socket) {
    const socketData = client.data as SocketData;
    const userId = socketData.userId;
    if (!userId || typeof userId !== 'string') {
      this.loggerService.warn('Connection attempt without userId');
      client.disconnect();
      return;
    }

    try {
      // Add socket to Redis SET for this user with environment prefix
      const socketId = client.id;
      await this.addSocketToRedis(userId, socketId);

      // Join user-specific room for potential future use
      void client.join(`user:${userId}`);

      // Update active connections metric (non-blocking)
      void this.updateActiveConnectionsMetric();
    } catch (error: unknown) {
      const socketDataError = client.data as SocketData;
      this.loggerService.error(
        `Failed to handle WebSocket connection - userId: ${socketDataError.userId}, socketId: ${client.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      client.disconnect();
      // Don't throw - already handled by disconnect
    }
  }

  async handleDisconnect(client: Socket) {
    const socketData = client.data as SocketData;
    const userId = socketData.userId;
    if (!userId || typeof userId !== 'string') {
      return;
    }

    try {
      const socketId = client.id;
      await this.removeSocketFromRedis(userId, socketId);

      // Update active connections metric (non-blocking)
      void this.updateActiveConnectionsMetric();
    } catch (error) {
      const socketDataError = client.data as SocketData;
      this.loggerService.error(
        `Failed to handle WebSocket disconnect - userId: ${socketDataError.userId}, socketId: ${client.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      // Don't throw - graceful degradation
    }
  }

  /**
   * Send notification to a specific user via their active connections
   */
  async sendToUser(userId: string, notification: Notification): Promise<void> {
    try {
      // Check per-user rate limit
      const userWithinLimit = await this.checkUserRateLimit(userId);
      if (!userWithinLimit) {
        this.handleRateLimitExceeded(userId);
        return; // Skip delivery, notification remains in DB
      }

      // Get active sockets for user
      const socketIds = await this.getActiveSockets(userId);

      if (socketIds.length === 0) {
        this.loggerService.debug(
          `No active connections for user, notification will be available on next fetch - userId: ${userId}`,
        );
        return;
      }

      // Refresh TTL on activity to prevent unexpected expiration
      await this.refreshConnectionTTL(userId);

      // Emit notification to user's sockets
      this.emitNotification(userId, notification);

      // Track successful delivery (non-blocking)
      void this.metricsService.incrementSent(
        NotificationChannel.IN_APP,
        notification.type,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Track failed delivery (non-blocking)
      void this.metricsService
        .incrementFailed(NotificationChannel.IN_APP, notification.type)
        .catch((metricsError) => {
          // Don't fail on metrics error
          if (metricsError instanceof Error) {
            this.loggerService.warn(
              `Failed to track delivery metrics - error: ${metricsError.message}`,
            );
          } else {
            this.loggerService.warn(
              `Failed to track delivery metrics - error: ${String(metricsError)}`,
            );
          }
        });

      this.loggerService.error(
        `Failed to send WebSocket notification - userId: ${userId}, notificationId: ${notification.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      // Don't throw - graceful failure
    }
  }

  /**
   * Get all active socket IDs for a user (for debugging/monitoring)
   */
  async getUserSockets(userId: string): Promise<string[]> {
    return this.getActiveSockets(userId);
  }

  /**
   * Handle read acknowledgment (optional - for future use)
   */
  @SubscribeMessage('notification:read')
  handleReadAcknowledgment(
    client: Socket,
    data: { notificationId: string },
  ): void {
    // This is just acknowledgment - actual read status is updated via API
  }

  /**
   * Helper: Get active sockets for a user
   */
  private async getActiveSockets(userId: string): Promise<string[]> {
    const key = notificationKeys.connection(userId);
    return this.redisService.getClient().smembers(key);
  }

  /**
   * Helper: Emit notification to user's sockets
   */
  private emitNotification(userId: string, notification: Notification): void {
    const notificationData = {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      priority: notification.priority,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    };

    // Emit to user's room (all their sockets)
    this.server.to(`user:${userId}`).emit('notification:new', notificationData);
  }

  /**
   * Helper: Handle rate limit exceeded - emit throttled event to client
   * Note: This event is for debugging/monitoring only, not required for client implementation
   */
  private handleRateLimitExceeded(userId: string): void {
    const limit = this.config.rateLimit.user;

    this.loggerService.warn(
      `Rate limit exceeded for user, skipping notification delivery - userId: ${userId}, limit: ${limit}, window: 1 minute`,
    );

    // Emit throttled event to client for debugging/monitoring (optional - debug-only)
    this.server.to(`user:${userId}`).emit('notification:throttled', {
      reason: 'rate-limit',
      type: 'user',
      limit,
      window: '1 minute',
    });
  }


  /**
   * Add socket to Redis SET for user (atomic operation)
   */
  private async addSocketToRedis(
    userId: string,
    socketId: string,
  ): Promise<void> {
    await retryOperation(
      async () => {
        const key = notificationKeys.connection(userId);
        const client = this.redisService.getClient();

        // Add socket to SET and set TTL atomically using pipeline
        const pipeline = client.pipeline();
        pipeline.sadd(key, socketId);
        pipeline.expire(key, this.config.connectionTTL);
        // Increment active connections counter
        pipeline.incr(this.connectionsCounterKey);
        pipeline.expire(this.connectionsCounterKey, this.config.connectionTTL);
        await pipeline.exec();
      },
      {
        maxAttempts: this.config.retry.maxAttempts,
        baseDelayMs: this.config.retry.baseDelayMs,
        operationName: 'addSocketToRedis',
        logger: this.loggerService,
        context: { userId, socketId },
      },
    );
  }

  /**
   * Remove socket from Redis SET atomically using Lua script
   * Returns removal result and remaining connection count
   */
  private async removeSocketFromRedis(
    userId: string,
    socketId: string,
  ): Promise<{ removed: number; remainingCount: number }> {
    return retryOperation(
      async () => {
        const key = notificationKeys.connection(userId);
        const client = this.redisService.getClient();

        // Execute Lua script atomically
        const result = (await client.eval(
          this.removeSocketScript,
          1,
          key,
          socketId,
        )) as [number, number];

        // Decrement counter if socket was actually removed
        if (result[0] > 0) {
          const pipeline = client.pipeline();
          pipeline.decr(this.connectionsCounterKey);
          pipeline.expire(
            this.connectionsCounterKey,
            this.config.connectionTTL,
          );
          await pipeline.exec();
        }

        return {
          removed: result[0],
          remainingCount: result[1],
        };
      },
      {
        maxAttempts: this.config.retry.maxAttempts,
        baseDelayMs: this.config.retry.baseDelayMs,
        operationName: 'removeSocketFromRedis',
        logger: this.loggerService,
        context: { userId, socketId },
      },
    );
  }

  /**
   * Refresh TTL on connection key
   */
  private async refreshConnectionTTL(userId: string): Promise<void> {
    const key = notificationKeys.connection(userId);
    await this.redisService.getClient().expire(key, this.config.connectionTTL);
  }

  /**
   * Check if user has exceeded rate limit using sliding window algorithm
   */
  private async checkUserRateLimit(userId: string): Promise<boolean> {
    return this.rateLimiter.checkRateLimit(
      `user:${userId}`,
      this.config.rateLimit.user,
      this.config.rateLimit.ttl,
    );
  }

  /**
   * Update active connections metric using Redis counter
   * Falls back to scanning if counter is unavailable
   */
  private async updateActiveConnectionsMetric(): Promise<void> {
    try {
      // Try to read from counter first (fast path)
      const counterValue = await this.redisService
        .getClient()
        .get(this.connectionsCounterKey);
      const count = counterValue ? parseInt(counterValue, 10) : null;

      if (count !== null && count >= 0) {
        // Use counter value (non-blocking)
        void this.metricsService.setActiveConnections(count);
      } else {
        // Fallback to scanning if counter is missing or invalid
        // This can happen on first startup or if counter was reset
        void this.reconcileActiveConnectionsMetric();
      }
    } catch (error) {
      this.loggerService.warn(
        `Failed to update active connections metric - error: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Fallback to scanning on error (non-blocking)
      void this.reconcileActiveConnectionsMetric().catch((reconcileError) => {
        if (reconcileError instanceof Error) {
          this.loggerService.warn(
            `Failed to reconcile active connections metric - error: ${reconcileError.message}`,
          );
        } else {
          this.loggerService.warn(
            `Failed to reconcile active connections metric - error: ${String(reconcileError)}`,
          );
        }
      });
    }
  }

  /**
   * Reconcile active connections by scanning all connection keys
   * Used as fallback when counter is unavailable
   * Optimized with limits to prevent blocking at scale
   */
  private async reconcileActiveConnectionsMetric(): Promise<void> {
    const pattern = notificationKeys.connectionPattern();
    let cursor = '0';
    let totalConnections = 0;
    let keysProcessed = 0;
    let connectionsProcessed = 0;

    do {
      const [nextCursor, keys] = await this.redisService
        .getClient()
        .scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;

      // Limit total keys processed per cycle
      if (keys.length > 0 && keysProcessed < MAX_RECONCILE_KEYS) {
        const keysToProcess = keys.slice(0, MAX_RECONCILE_KEYS - keysProcessed);
        keysProcessed += keysToProcess.length;

        // Use pipeline for batch SCARD operations
        const pipeline = this.redisService.getClient().pipeline();
        for (const key of keysToProcess) {
          pipeline.scard(key);
        }
        const results = await pipeline.exec();
        if (results) {
          for (const result of results) {
            if (result[1] && typeof result[1] === 'number') {
              const connectionCount = result[1];
              totalConnections += connectionCount;
              connectionsProcessed += connectionCount;

              // Limit total connections processed per cycle
              if (connectionsProcessed >= MAX_RECONCILE_CONNECTIONS) {
                this.loggerService.warn(
                  'Reconciliation limit reached, stopping scan',
                  { connectionsProcessed },
                );
                cursor = '0'; // Force exit
                break;
              }
            }
          }
        }
      }
    } while (cursor !== '0' && keysProcessed < MAX_RECONCILE_KEYS);

    // Update counter with reconciled value
    await this.redisService
      .getClient()
      .set(this.connectionsCounterKey, totalConnections.toString());
    await this.redisService
      .getClient()
      .expire(this.connectionsCounterKey, this.config.connectionTTL);

    await this.metricsService.setActiveConnections(totalConnections);

    // Only log reconciliation if it processed significant data or found issues
    if (keysProcessed > 0 || totalConnections > 0) {
      this.loggerService.log(
        `Reconciled active connections - totalConnections: ${totalConnections}, keysProcessed: ${keysProcessed}, connectionsProcessed: ${connectionsProcessed}`,
      );
    }
  }
}
