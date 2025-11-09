# Notifications Module - Comprehensive Refactoring Plan

**Date:** 2024  
**Status:** Ready for Implementation  
**Estimated Duration:** 2-3 weeks

---

## Executive Summary

This plan addresses:

1. **Observability Consolidation** - Merge tracer and metrics into unified monitoring service
2. **Runtime Validation** - Verify circuit breaker, DLQ, and idempotency actually work
3. **Code Splitting** - Refactor large files with clear boundaries and interaction patterns
4. **Test Updates** - Comprehensive test coverage for all changes

---

## Phase 1: Observability Consolidation

### 1.1 Merge Observability Services

**Goal:** Create `NotificationMonitoringService` that combines tracing and metrics

**Current State:**

- `NotificationTracerService` - Registered but unused
- `PrometheusMetricsService` - Registered but unused
- `NotificationMetricsService` - Used for Redis metrics

**Target State:**

- `NotificationMonitoringService` - Unified observability service
  - Tracing (from tracer service)
  - Prometheus metrics (from prometheus service)
  - Integration with existing `NotificationMetricsService`

**Implementation Steps:**

#### Step 1.1.1: Create NotificationMonitoringService

```typescript
// src/modules/notifications/observability/notification-monitoring.service.ts

import { Injectable } from '@nestjs/common';
import { LoggerService } from '@/shared/services/logger.service';
import { RequestContext } from '@/shared/common/context/request.context';
import { NotificationMetricsService } from '../services/notification-metrics.service';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationType } from '../enums/notification-type.enum';

/**
 * Span context for tracing notification operations
 */
export interface NotificationSpan {
  name: string;
  startTime: number;
  attributes: Record<string, string | number | boolean>;
  parent?: NotificationSpan;
}

/**
 * Unified monitoring service combining tracing and Prometheus metrics
 *
 * Features:
 * - Distributed tracing with correlation IDs
 * - Prometheus-compatible metrics
 * - Performance monitoring
 * - Error tracking
 */
@Injectable()
export class NotificationMonitoringService {
  constructor(
    private readonly logger: LoggerService,
    private readonly metricsService: NotificationMetricsService,
  ) {}

  // ========== Tracing Methods ==========

  /**
   * Start a new span for tracing
   */
  startSpan(
    name: string,
    attributes?: Record<string, string | number | boolean>,
  ): NotificationSpan {
    const correlationId = this.getCorrelationId();
    const span: NotificationSpan = {
      name,
      startTime: Date.now(),
      attributes: {
        correlationId,
        ...attributes,
      },
    };

    this.logger.debug(
      `[TRACE] Span started: ${name}`,
      'NotificationMonitoringService',
      {
        span: name,
        correlationId,
        attributes: span.attributes,
      },
    );

    return span;
  }

  /**
   * End a span and log the result
   */
  endSpan(
    span: NotificationSpan,
    success: boolean = true,
    error?: Error,
    additionalAttributes?: Record<string, string | number | boolean>,
  ): void {
    const duration = Date.now() - span.startTime;
    const finalAttributes: Record<string, string | number | boolean> = {
      ...span.attributes,
      ...additionalAttributes,
      duration,
      success,
    };

    if (error) {
      finalAttributes.error = error.message;
    }

    const logLevel = success ? 'debug' : 'error';
    this.logger[logLevel](
      `[TRACE] Span ended: ${span.name} (${duration}ms)`,
      error instanceof Error ? error.stack : undefined,
      'NotificationMonitoringService',
      {
        span: span.name,
        correlationId: String(span.attributes.correlationId),
        duration,
        success,
        ...finalAttributes,
      },
    );
  }

  /**
   * Execute a function within a span
   */
  async trace<T>(
    name: string,
    fn: (span: NotificationSpan) => Promise<T>,
    attributes?: Record<string, string | number | boolean>,
  ): Promise<T> {
    const span = this.startSpan(name, attributes);
    try {
      const result = await fn(span);
      this.endSpan(span, true);
      return result;
    } catch (error) {
      this.endSpan(
        span,
        false,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  // ========== Metrics Methods ==========

  /**
   * Record a notification event (sent, failed, retry)
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
      this.logger.warn(
        `Failed to record notification metric: ${status}`,
        'NotificationMonitoringService',
        {
          type,
          channel,
          status,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Record notification processing latency
   */
  async recordLatency(
    type: NotificationType,
    channel: NotificationChannel,
    latencyMs: number,
  ): Promise<void> {
    try {
      await this.metricsService.recordLatency(channel, latencyMs);
    } catch (error) {
      // Fail-open
      this.logger.warn(
        `Failed to record latency metric`,
        'NotificationMonitoringService',
        { type, channel, latencyMs },
      );
    }
  }

  /**
   * Get Prometheus-formatted metrics
   * Includes per-channel circuit breaker state gauges
   */
  async getPrometheusMetrics(): Promise<string> {
    try {
      const baseMetrics = await this.metricsService.getPrometheusMetrics();

      // Add circuit breaker state gauges
      const circuitBreakerMetrics = await this.getCircuitBreakerGauges();

      return baseMetrics + circuitBreakerMetrics;
    } catch (error) {
      return '# Error retrieving metrics\n';
    }
  }

  /**
   * Get circuit breaker state gauges in Prometheus format
   * Format: notification_circuit_breaker_state{channel="EMAIL"} 0
   * Values: 0=CLOSED, 1=HALF_OPEN, 2=OPEN
   */
  private async getCircuitBreakerGauges(): Promise<string> {
    try {
      // Get circuit breaker states from metrics service
      const states = await this.metricsService.getCircuitBreakerStates();

      let output = '# Circuit Breaker States\n';
      output += '# TYPE notification_circuit_breaker_state gauge\n';

      for (const [channel, state] of Object.entries(states)) {
        const stateValue =
          state === 'CLOSED' ? 0 : state === 'HALF_OPEN' ? 1 : 2; // OPEN

        output += `notification_circuit_breaker_state{channel="${channel}"} ${stateValue}\n`;
      }

      return output;
    } catch (error) {
      this.logger.warn(
        'Failed to get circuit breaker gauges',
        'NotificationMonitoringService',
      );
      return '';
    }
  }

  /**
   * Get summary metrics in JSON format
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
      const channels = Object.values(NotificationChannel);
      return {
        sent: Object.fromEntries(channels.map((c) => [c, 0])) as Record<
          NotificationChannel,
          number
        >,
        failed: Object.fromEntries(channels.map((c) => [c, 0])) as Record<
          NotificationChannel,
          number
        >,
        retry: Object.fromEntries(channels.map((c) => [c, 0])) as Record<
          NotificationChannel,
          number
        >,
        latency: Object.fromEntries(channels.map((c) => [c, 0])) as Record<
          NotificationChannel,
          number
        >,
        queueBacklog: 0,
        activeConnections: 0,
      };
    }
  }

  /**
   * Observe overall system health by aggregating results from all subsystems
   * Single health dashboard for operations team
   */
  async observeHealth(
    circuitBreakerService: NotificationCircuitBreakerService,
    dlqCleanupJob: NotificationDlqCleanupJob,
    idempotencyService: NotificationIdempotencyCacheService,
  ): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    circuitBreakers: Record<
      NotificationChannel,
      {
        state: string;
        isHealthy: boolean;
      }
    >;
    dlq: {
      totalFailed: number;
      lastCleanupRun: Date | null;
      isHealthy: boolean;
    };
    idempotency: {
      activeLocks: number;
      isHealthy: boolean;
    };
    timestamp: Date;
  }> {
    const health: any = {
      circuitBreakers: {},
      dlq: { totalFailed: 0, lastCleanupRun: null, isHealthy: true },
      idempotency: { activeLocks: 0, isHealthy: true },
      timestamp: new Date(),
    };

    try {
      // Circuit breaker health
      const cbHealth = await circuitBreakerService.getHealthStatus();
      for (const [channel, status] of Object.entries(cbHealth)) {
        health.circuitBreakers[channel] = {
          state: status.state,
          isHealthy: status.isHealthy,
        };
      }

      // DLQ health
      const dlqHealth = await dlqCleanupJob.getDlqHealthStatus();
      health.dlq = {
        totalFailed: dlqHealth.totalFailed,
        lastCleanupRun: dlqHealth.lastCleanupRun,
        isHealthy: dlqHealth.isHealthy,
      };

      // Idempotency health
      const idempotencyHealth = await idempotencyService.getHealthStatus();
      health.idempotency = {
        activeLocks: idempotencyHealth.activeLocks,
        isHealthy: idempotencyHealth.isHealthy,
      };

      // Determine overall health
      const hasUnhealthyCircuit = Object.values(health.circuitBreakers).some(
        (cb: any) => !cb.isHealthy,
      );
      const hasUnhealthyDlq = !health.dlq.isHealthy;
      const hasUnhealthyIdempotency = !health.idempotency.isHealthy;

      if (hasUnhealthyCircuit || hasUnhealthyDlq || hasUnhealthyIdempotency) {
        health.overall = 'unhealthy';
      } else if (
        health.dlq.totalFailed > 1000 ||
        health.idempotency.activeLocks > 500
      ) {
        health.overall = 'degraded';
      } else {
        health.overall = 'healthy';
      }
    } catch (error) {
      this.logger.error(
        'Failed to observe system health',
        error instanceof Error ? error.stack : undefined,
        'NotificationMonitoringService',
      );
      health.overall = 'unhealthy';
    }

    return health;
  }

  /**
   * Get correlation ID from request context or generate a new one
   */
  private getCorrelationId(): string {
    const context = RequestContext.get();
    return (
      context?.requestId ||
      context?.correlationId ||
      `monitor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    );
  }
}
```

#### Step 1.1.2: Update Module Registration

```typescript
// src/modules/notifications/notifications.module.ts

// Remove:
// import { NotificationTracerService } from './observability/notification-tracer.service';
// import { PrometheusMetricsService } from './observability/prometheus-metrics.service';

// Add:
import { NotificationMonitoringService } from './observability/notification-monitoring.service';

@Module({
  // ...
  providers: [
    // ... existing providers
    NotificationMonitoringService, // Unified observability service
    // Remove: NotificationTracerService
    // Remove: PrometheusMetricsService
  ],
})
```

#### Step 1.1.3: Integrate into Services

**Update NotificationService:**

```typescript
// Inject monitoring service
constructor(
  // ... existing
  private readonly monitoringService: NotificationMonitoringService,
) {}

// Use in methods:
async trigger(eventName: NotificationType, event: NotificationEvent): Promise<void> {
  return this.monitoringService.trace(
    'notification.trigger',
    async (span) => {
      // ... existing logic
      this.monitoringService.addAttributes(span, {
        eventName,
        recipientCount: recipients.length,
      });
      // ... rest of method
    },
    { eventName },
  );
}
```

**Update NotificationRouterService:**

```typescript
async route(context: NotificationProcessingContext): Promise<void> {
  return this.monitoringService.trace(
    'notification.route',
    async (span => {
      // ... existing logic
      await this.monitoringService.recordNotification(
        context.eventName,
        channel,
        success ? 'sent' : 'failed',
      );
    },
    { eventName: context.eventName },
  );
}
```

#### Step 1.1.4: Update NotificationMetricsService

Add method to expose circuit breaker states:

```typescript
// src/modules/notifications/services/notification-metrics.service.ts

/**
 * Get circuit breaker states for all channels
 * Used for Prometheus gauge export
 */
async getCircuitBreakerStates(): Promise<Record<NotificationChannel, string>> {
  // This should be called from NotificationMonitoringService
  // and requires access to NotificationCircuitBreakerService
  // Consider dependency injection or event-based updates
}
```

**Alternative:** Store circuit breaker states in Redis and read from metrics service:

```typescript
/**
 * Update circuit breaker state gauge
 */
async setCircuitBreakerState(
  channel: NotificationChannel,
  state: 'CLOSED' | 'HALF_OPEN' | 'OPEN',
): Promise<void> {
  const key = `${this.redisKeyPrefix}:metrics:gauge:circuit_breaker:${channel}`;
  const value = state === 'CLOSED' ? 0 : state === 'HALF_OPEN' ? 1 : 2;
  await this.redisService.getClient().set(key, value.toString(), 'EX', this.METRIC_TTL);
}

/**
 * Get all circuit breaker states
 */
async getCircuitBreakerStates(): Promise<Record<NotificationChannel, string>> {
  const client = this.redisService.getClient();
  const states: Record<NotificationChannel, string> = {} as any;

  for (const channel of Object.values(NotificationChannel)) {
    const key = `${this.redisKeyPrefix}:metrics:gauge:circuit_breaker:${channel}`;
    const value = await client.get(key);
    const stateValue = value ? parseInt(value, 10) : 0;
    states[channel] = stateValue === 0 ? 'CLOSED'
      : stateValue === 1 ? 'HALF_OPEN'
      : 'OPEN';
  }

  return states;
}
```

#### Step 1.1.5: Delete Old Files

```bash
# After integration is complete
rm src/modules/notifications/observability/notification-tracer.service.ts
rm src/modules/notifications/observability/prometheus-metrics.service.ts
```

**Test Updates:**

- Create `notification-monitoring.service.spec.ts`
- Test tracing methods
- Test metrics integration
- Test fail-open behavior
- Test `observeHealth()` aggregation
- Test circuit breaker gauge export

---

## Phase 2: Runtime Validation

### 2.1 Circuit Breaker Validation

**Goal:** Verify circuit breaker actually opens/closes under failure conditions

**Current State:**

- Circuit breaker exists and is used in `NotificationSenderService`
- But no explicit validation that it actually works

**Implementation:**

#### Step 2.1.1: Add Circuit Breaker Health Check

```typescript
// src/modules/notifications/services/notification-circuit-breaker.service.ts

/**
 * Get health status for all channels
 */
async getHealthStatus(): Promise<Record<NotificationChannel, {
  state: CircuitState;
  failureCount: number;
  lastFailureTime: Date | null;
  isHealthy: boolean;
}>> {
  const status: Record<NotificationChannel, any> = {} as any;

  for (const channel of Object.values(NotificationChannel)) {
    const state = await this.getCircuitState(channel);
    const failureKey = this.getFailureKey(channel);
    const client = this.redisService.getClient();

    // Get failure count in window
    const now = Date.now();
    const windowStart = now - (this.windowSeconds * 1000);
    const failures = await client.zrangebyscore(
      failureKey,
      windowStart,
      now,
    );

    const lastFailure = failures.length > 0
      ? new Date(parseInt(failures[failures.length - 1] as string))
      : null;

    status[channel] = {
      state,
      failureCount: failures.length,
      lastFailureTime: lastFailure,
      isHealthy: state === CircuitState.CLOSED && failures.length < this.errorThreshold,
    };
  }

  return status;
}

/**
 * Explicitly check if circuit is open (for monitoring)
 */
async isOpen(channel: NotificationChannel): Promise<boolean> {
  const state = await this.getCircuitState(channel);
  return state === CircuitState.OPEN;
}
```

#### Step 2.1.2: Add Monitoring Integration

```typescript
// In NotificationMonitoringService

/**
 * Monitor circuit breaker health
 */
async monitorCircuitBreakers(
  circuitBreakerService: NotificationCircuitBreakerService,
): Promise<void> {
  const health = await circuitBreakerService.getHealthStatus();

  for (const [channel, status] of Object.entries(health)) {
    if (!status.isHealthy) {
      this.logger.warn(
        `Circuit breaker unhealthy for ${channel}`,
        'NotificationMonitoringService',
        {
          channel,
          state: status.state,
          failureCount: status.failureCount,
          lastFailureTime: status.lastFailureTime,
        },
      );
    }

    // Record metric as gauge for Prometheus
    await this.recordCircuitBreakerGauge(
      channel as NotificationChannel,
      status.state,
    );
  }
}

/**
 * Record circuit breaker state as Prometheus gauge
 * Allows Grafana visualization of circuit states
 */
private async recordCircuitBreakerGauge(
  channel: NotificationChannel,
  state: CircuitState,
): Promise<void> {
  try {
    // Map state to numeric value for gauge
    const stateValue = state === CircuitState.CLOSED ? 0
      : state === CircuitState.HALF_OPEN ? 1
      : 2; // OPEN

    // Store in metrics service as gauge
    // This will be exposed in Prometheus format
    await this.metricsService.setGauge(
      'notification_circuit_breaker_state',
      stateValue,
      { channel },
    );
  } catch (error) {
    // Fail-open
    this.logger.warn(
      'Failed to record circuit breaker gauge',
      'NotificationMonitoringService',
      { channel, state },
    );
  }
}
```

#### Step 2.1.3: Add Integration Test

```typescript
// src/modules/notifications/services/notification-circuit-breaker.integration.spec.ts

describe('Circuit Breaker Integration', () => {
  it('should open circuit after threshold failures', async () => {
    const service = module.get(NotificationCircuitBreakerService);
    const channel = NotificationChannel.EMAIL;

    // Record failures up to threshold
    for (let i = 0; i < 5; i++) {
      await service.recordFailure(channel);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Wait for state update
    await waitFor(
      async () => {
        const state = await service.getCircuitState(channel);
        return state === CircuitState.OPEN;
      },
      { timeout: 2000 },
    );

    // Verify circuit is open
    const isOpen = await service.isOpen(channel);
    expect(isOpen).toBe(true);

    // Verify execution is blocked
    await expect(
      service.executeWithCircuitBreaker(channel, async () => 'success'),
    ).rejects.toThrow('Circuit breaker is OPEN');
  });

  it('should close circuit after successful recovery', async () => {
    // ... test recovery logic
  });

  it('should transition from OPEN to HALF_OPEN after reset timeout', async () => {
    const service = module.get(NotificationCircuitBreakerService);
    const channel = NotificationChannel.EMAIL;

    // Open the circuit
    for (let i = 0; i < 5; i++) {
      await service.recordFailure(channel);
    }

    // Wait for OPEN state
    await waitFor(
      async () => {
        const state = await service.getCircuitState(channel);
        return state === CircuitState.OPEN;
      },
      { timeout: 2000 },
    );

    // Fast-forward time to reset timeout (use jest.useFakeTimers or similar)
    // In real test, you might need to manually set Redis timestamp
    const resetTimeout =
      NotificationConfig.circuitBreaker.resetTimeoutSeconds * 1000;

    // Simulate time passing (adjust based on your test setup)
    // For integration tests, you may need to manually manipulate Redis timestamps

    // Verify HALF_OPEN state
    await waitFor(
      async () => {
        const state = await service.getCircuitState(channel);
        return state === CircuitState.HALF_OPEN;
      },
      { timeout: resetTimeout + 1000 },
    );

    const state = await service.getCircuitState(channel);
    expect(state).toBe(CircuitState.HALF_OPEN);
  });

  it('should close circuit after successful HALF_OPEN test', async () => {
    const service = module.get(NotificationCircuitBreakerService);
    const channel = NotificationChannel.EMAIL;

    // Get to HALF_OPEN state (from previous test or setup)
    // ... setup code ...

    // Execute successful operation
    const result = await service.executeWithCircuitBreaker(
      channel,
      async () => 'success',
    );

    expect(result).toBe('success');

    // Verify circuit is now CLOSED
    const state = await service.getCircuitState(channel);
    expect(state).toBe(CircuitState.CLOSED);
  });
});
```

### 2.2 DLQ Validation

**Goal:** Verify DLQ cleanup job actually runs and processes failed notifications

**Current State:**

- DLQ cleanup job exists and is scheduled
- But no validation that it's connected to the queue

**Implementation:**

#### Step 2.2.1: Add DLQ Health Check

```typescript
// src/modules/notifications/jobs/notification-dlq-cleanup.job.ts

/**
 * Get DLQ health status
 */
async getDlqHealthStatus(): Promise<{
  totalFailed: number;
  oldestFailedDate: Date | null;
  entriesToBeDeleted: number;
  lastCleanupRun: Date | null;
  isHealthy: boolean;
}> {
  const stats = await this.getRetentionStats();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

  // Get last cleanup run timestamp from Redis/metrics
  const lastCleanupRun = await this.getLastCleanupRun();

  // Check if DLQ is growing too large (warning threshold)
  const isHealthy = stats.totalFailed < 10000; // Configurable threshold

  // Check if cleanup job is stalling (should run daily)
  const hoursSinceLastRun = lastCleanupRun
    ? (Date.now() - lastCleanupRun.getTime()) / (1000 * 60 * 60)
    : Infinity;
  const isStalling = hoursSinceLastRun > 25; // More than 25 hours = stalling

  return {
    ...stats,
    lastCleanupRun,
    isHealthy: isHealthy && !isStalling,
  };
}

/**
 * Get last cleanup run timestamp from Redis
 */
private async getLastCleanupRun(): Promise<Date | null> {
  try {
    // Store in Redis with key: ${prefix}:notification:dlq:last_cleanup
    const redisService = this.app.get(RedisService);
    const client = redisService.getClient();
    const key = `${Config.redis.keyPrefix}:notification:dlq:last_cleanup`;
    const timestamp = await client.get(key);

    if (timestamp) {
      return new Date(parseInt(timestamp, 10));
    }
    return null;
  } catch (error) {
    this.logger.warn(
      'Failed to get last cleanup run timestamp',
      'NotificationDlqCleanupJob',
    );
    return null;
  }
}

/**
 * Persist cleanup run timestamp to Redis
 */
private async persistCleanupRun(): Promise<void> {
  try {
    const redisService = this.app.get(RedisService);
    const client = redisService.getClient();
    const key = `${Config.redis.keyPrefix}:notification:dlq:last_cleanup`;
    await client.set(key, Date.now().toString(), 'EX', 7 * 24 * 60 * 60); // 7 days TTL
  } catch (error) {
    this.logger.warn(
      'Failed to persist cleanup run timestamp',
      'NotificationDlqCleanupJob',
    );
  }
}
```

#### Step 2.2.2: Verify Queue Connection

```typescript
// src/modules/notifications/processors/notification.processor.ts

/**
 * Verify DLQ is properly configured
 */
private async verifyDlqConfiguration(): Promise<void> {
  const queue = this.queue;
  const failedJobs = await queue.getFailed();

  this.logger.debug(
    `DLQ verification: ${failedJobs.length} failed jobs in queue`,
    'NotificationProcessor',
    {
      failedCount: failedJobs.length,
      queueName: queue.name,
    },
  );

  // Verify failed jobs are being moved to DLQ
  if (failedJobs.length > 0) {
    const oldestFailed = failedJobs[0];
    const age = Date.now() - oldestFailed.timestamp;

    if (age > 24 * 60 * 60 * 1000) { // 24 hours
      this.logger.warn(
        `Old failed jobs detected in DLQ (${age}ms old)`,
        'NotificationProcessor',
        {
          oldestJobId: oldestFailed.id,
          age,
        },
      );
    }
  }
}
```

#### Step 2.2.3: Add Integration Test

```typescript
// src/modules/notifications/jobs/notification-dlq-cleanup.integration.spec.ts

describe('DLQ Cleanup Integration', () => {
  it('should cleanup old failed notifications', async () => {
    const job = module.get(NotificationDlqCleanupJob);
    const repository = module.get(NotificationLogRepository);

    // Create old failed notification
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 8); // 8 days ago

    await repository.create({
      status: NotificationStatus.FAILED,
      createdAt: oldDate,
      // ... other fields
    });

    // Run cleanup
    await job.cleanupOldFailedJobs();

    // Verify deletion
    const remaining = await repository.findMany({
      where: { status: NotificationStatus.FAILED },
    });

    expect(remaining.length).toBe(0);
  });
});
```

### 2.3 Idempotency Validation

**Goal:** Verify idempotency prevents duplicate sends under race conditions

**Current State:**

- Idempotency service exists
- But no validation of race condition handling

**Implementation:**

#### Step 2.3.1: Add Race Condition Test

```typescript
// src/modules/notifications/services/notification-idempotency-cache.race-condition.spec.ts

describe('Idempotency Race Condition Tests', () => {
  it('should prevent duplicate sends under concurrent requests', async () => {
    const service = module.get(NotificationIdempotencyCacheService);
    const correlationId = 'test-race-' + Date.now();
    const type = NotificationType.OTP;
    const channel = NotificationChannel.EMAIL;
    const recipient = 'test@example.com';

    // Simulate 10 concurrent requests
    const promises = Array.from({ length: 10 }, async () => {
      const result = await service.checkAndLock(
        correlationId,
        type,
        channel,
        recipient,
      );
      return result;
    });

    const results = await Promise.all(promises);

    // Only one should succeed
    const successful = results.filter((r) => r.shouldProceed);
    expect(successful.length).toBe(1);

    // Others should be blocked
    const blocked = results.filter((r) => !r.shouldProceed);
    expect(blocked.length).toBe(9);
  });

  it('should handle lock timeout correctly', async () => {
    // Test lock acquisition timeout
  });

  it('should release lock after send completion', async () => {
    // Test lock release
  });

  it('should handle lock expiry correctly', async () => {
    const service = module.get(NotificationIdempotencyCacheService);
    const correlationId = 'test-expiry-' + Date.now();
    const type = NotificationType.OTP;
    const channel = NotificationChannel.EMAIL;
    const recipient = 'test@example.com';

    // Acquire lock
    const lockAcquired = await service.acquireLock(
      correlationId,
      type,
      channel,
      recipient,
    );
    expect(lockAcquired).toBe(true);

    // Wait for lock to expire (lockTtlSeconds)
    const lockTtl = NotificationConfig.idempotency.lockTtlSeconds * 1000;
    await new Promise((resolve) => setTimeout(resolve, lockTtl + 100));

    // Lock should have expired, can acquire again
    const lockAcquiredAgain = await service.acquireLock(
      correlationId,
      type,
      channel,
      recipient,
    );
    expect(lockAcquiredAgain).toBe(true);
  });

  it('should handle Redis reconnect gracefully', async () => {
    const service = module.get(NotificationIdempotencyCacheService);
    const correlationId = 'test-reconnect-' + Date.now();
    const type = NotificationType.OTP;
    const channel = NotificationChannel.EMAIL;
    const recipient = 'test@example.com';

    // Simulate Redis disconnection
    const redisService = module.get(RedisService);
    const client = redisService.getClient();

    // Disconnect Redis (in test environment)
    // This depends on your test setup - you might mock the client

    // Attempt idempotency check (should fail-open)
    const result = await service.checkAndLock(
      correlationId,
      type,
      channel,
      recipient,
    );

    // Should fail-open (allow notification) if Redis is unavailable
    expect(result.shouldProceed).toBe(true);

    // Reconnect Redis
    // ... reconnect logic ...

    // Verify service recovers
    const resultAfterReconnect = await service.checkAndLock(
      correlationId + '-new',
      type,
      channel,
      recipient,
    );
    expect(resultAfterReconnect.shouldProceed).toBe(true);
  });
});
```

#### Step 2.3.2: Add Health Check

```typescript
// src/modules/notifications/services/notification-idempotency-cache.service.ts

/**
 * Get idempotency health status
 */
async getHealthStatus(): Promise<{
  activeLocks: number;
  cacheHitRate: number;
  isHealthy: boolean;
}> {
  // Count active locks (keys with lock prefix)
  const client = this.redisService.getClient();
  const pattern = `${this.redisKeyPrefix}:notification:lock:*`;

  // Use SCAN to count locks (non-blocking)
  let activeLocks = 0;
  let cursor = '0';

  do {
    const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    activeLocks += keys.length;
  } while (cursor !== '0');

  return {
    activeLocks,
    cacheHitRate: 0, // TODO: Track cache hits/misses
    isHealthy: activeLocks < 1000, // Configurable threshold
  };
}
```

---

## Phase 3: Code Splitting with Clear Boundaries

### 3.1 Split NotificationService (1369 lines)

**Goal:** Extract pure, side-effect-free services

**Current Structure:**

```
NotificationService (1369 lines)
├── Recipient resolution logic
├── Template preparation logic
├── Channel selection logic
├── Multi-recipient processing
└── Orchestration
```

**Target Structure:**

```
NotificationService (orchestrator, ~300 lines)
├── RecipientResolutionService (pure, ~200 lines)
├── TemplatePreparationService (pure, ~150 lines)
├── ChannelSelectionService (already exists, keep)
└── MultiRecipientProcessor (pure, ~200 lines)
```

#### Step 3.1.1: Create RecipientResolutionService

```typescript
// src/modules/notifications/services/recipient-resolution.service.ts

import { Injectable } from '@nestjs/common';
import { RecipientInfo } from '../types/recipient-info.interface';
import { NotificationEvent } from '../types/notification-event.types';
import { NotificationType } from '../enums/notification-type.enum';
import { UserService } from '@/modules/user/services/user.service';
import { CentersModule } from '@/modules/centers/centers.module';

/**
 * Pure service for resolving recipients from events
 * No side effects, only data transformation
 */
@Injectable()
export class RecipientResolutionService {
  constructor(
    private readonly userService: UserService,
    // ... other dependencies
  ) {}

  /**
   * Resolve recipients from event data
   * Pure function - no side effects
   */
  async resolveRecipients(
    event: NotificationEvent,
    eventName: NotificationType,
  ): Promise<RecipientInfo[]> {
    // Extract recipient logic from NotificationService
    // Returns array of RecipientInfo
  }

  /**
   * Resolve single recipient
   */
  async resolveRecipient(
    userId: string,
    event: NotificationEvent,
  ): Promise<RecipientInfo | null> {
    // Single recipient resolution
  }

  /**
   * Batch resolve recipients
   */
  async batchResolveRecipients(
    userIds: string[],
    event: NotificationEvent,
  ): Promise<Map<string, RecipientInfo>> {
    // Batch resolution for performance
  }
}
```

**Interaction Pattern:**

```typescript
// In NotificationService
async trigger(eventName: NotificationType, event: NotificationEvent): Promise<void> {
  // 1. Resolve recipients (pure)
  const recipients = await this.recipientResolver.resolveRecipients(event, eventName);

  // 2. Process each recipient
  for (const recipient of recipients) {
    await this.processRecipient(recipient, event, eventName);
  }
}
```

#### Step 3.1.2: Create TemplatePreparationService

```typescript
// src/modules/notifications/services/template-preparation.service.ts

import { Injectable } from '@nestjs/common';
import { NotificationTemplateData } from '../types/template-data.types';
import { NotificationEvent } from '../types/notification-event.types';
import { RecipientInfo } from '../types/recipient-info.interface';

/**
 * Pure service for preparing template data
 * No side effects, only data transformation
 */
@Injectable()
export class TemplatePreparationService {
  /**
   * Prepare template data from event and recipient
   * Pure function - no side effects
   */
  prepareTemplateData(
    event: NotificationEvent,
    recipient: RecipientInfo,
  ): NotificationTemplateData {
    // Extract template preparation logic
    // Returns prepared template data
  }

  /**
   * Merge event data with recipient data
   */
  mergeEventAndRecipientData(
    event: NotificationEvent,
    recipient: RecipientInfo,
  ): Record<string, unknown> {
    // Merge logic
  }
}
```

**Interaction Pattern:**

```typescript
// In NotificationService
private async processRecipient(
  recipient: RecipientInfo,
  event: NotificationEvent,
  eventName: NotificationType,
): Promise<void> {
  // 1. Prepare template data (pure)
  const templateData = this.templatePrep.prepareTemplateData(event, recipient);

  // 2. Continue with processing
  // ...
}
```

#### Step 3.1.3: Create MultiRecipientProcessor

```typescript
// src/modules/notifications/services/multi-recipient-processor.service.ts

import { Injectable } from '@nestjs/common';
import { RecipientInfo } from '../types/recipient-info.interface';
import { NotificationEvent } from '../types/notification-event.types';
import { NotificationType } from '../enums/notification-type.enum';
import pLimit from 'p-limit';

/**
 * Pure service for processing multiple recipients
 * Handles concurrency and batching
 */
@Injectable()
export class MultiRecipientProcessor {
  private readonly concurrencyLimit: ReturnType<typeof pLimit>;

  constructor(private readonly notificationConfig: NotificationConfig) {
    // Configurable concurrency limit from config service
    const limit =
      this.notificationConfig.concurrency?.maxRecipientsPerBatch || 10;
    this.concurrencyLimit = pLimit(limit);
  }

  /**
   * Get current concurrency limit (for monitoring)
   */
  getConcurrencyLimit(): number {
    return (
      this.concurrencyLimit.activeCount + this.concurrencyLimit.pendingCount
    );
  }

  /**
   * Process multiple recipients with concurrency control
   * Pure orchestration - delegates to callback
   */
  async processRecipients<T>(
    recipients: RecipientInfo[],
    processor: (recipient: RecipientInfo) => Promise<T>,
  ): Promise<Array<{ recipient: RecipientInfo; result: T | Error }>> {
    const results = await Promise.allSettled(
      recipients.map((recipient) =>
        this.concurrencyLimit(() => processor(recipient)),
      ),
    );

    return results.map((result, index) => ({
      recipient: recipients[index],
      result:
        result.status === 'fulfilled'
          ? result.value
          : new Error(result.reason?.message || 'Unknown error'),
    }));
  }
}
```

**Interaction Pattern:**

```typescript
// In NotificationService
async trigger(eventName: NotificationType, event: NotificationEvent): Promise<void> {
  const recipients = await this.recipientResolver.resolveRecipients(event, eventName);

  // Process with concurrency control
  const results = await this.multiRecipientProcessor.processRecipients(
    recipients,
    async (recipient) => {
      return this.processRecipient(recipient, event, eventName);
    },
  );

  // Handle results
  // ...
}
```

#### Step 3.1.4: Refactored NotificationService

```typescript
// src/modules/notifications/services/notification.service.ts (refactored, ~300 lines)

@Injectable()
export class NotificationService {
  constructor(
    @InjectQueue('notifications') private readonly queue: Queue,
    private readonly recipientResolver: RecipientResolutionService,
    private readonly templatePrep: TemplatePreparationService,
    private readonly multiRecipientProcessor: MultiRecipientProcessor,
    private readonly channelSelectionService: ChannelSelectionService,
    private readonly pipelineService: NotificationPipelineService,
    private readonly routerService: NotificationRouterService,
    private readonly monitoringService: NotificationMonitoringService,
    // ... other dependencies
  ) {}

  /**
   * Main entry point - orchestrates the flow
   */
  async trigger(
    eventName: NotificationType,
    event: NotificationEvent,
  ): Promise<void> {
    return this.monitoringService.trace(
      'notification.trigger',
      async (span) => {
        // 1. Resolve recipients (pure)
        const recipients = await this.recipientResolver.resolveRecipients(
          event,
          eventName,
        );

        this.monitoringService.addAttributes(span, {
          recipientCount: recipients.length,
        });

        // 2. Process recipients with concurrency control
        const results = await this.multiRecipientProcessor.processRecipients(
          recipients,
          async (recipient) => {
            return this.processRecipient(recipient, event, eventName);
          },
        );

        // 3. Handle results
        this.handleProcessingResults(results, eventName);
      },
      { eventName },
    );
  }

  /**
   * Process single recipient
   */
  private async processRecipient(
    recipient: RecipientInfo,
    event: NotificationEvent,
    eventName: NotificationType,
  ): Promise<void> {
    // 1. Prepare template data (pure)
    const templateData = this.templatePrep.prepareTemplateData(
      event,
      recipient,
    );

    // 2. Create processing context
    const context = await this.pipelineService.process(
      { eventName, event, recipient, templateData },
      recipient,
    );

    // 3. Route to channels
    await this.routerService.route(context);
  }

  // ... rest of methods (much smaller now)
}
```

### 3.2 Split NotificationRouterService (870 lines)

**Goal:** Extract recipient validation and payload building

**Target Structure:**

```
NotificationRouterService (orchestrator, ~300 lines)
├── RecipientValidationService (pure, ~200 lines)
└── PayloadBuilderService (pure, ~150 lines)
```

#### Step 3.2.1: Create RecipientValidationService

```typescript
// src/modules/notifications/services/recipient-validation.service.ts

import { Injectable } from '@nestjs/common';
import { NotificationChannel } from '../enums/notification-channel.enum';
import {
  isValidEmail,
  isValidE164,
  normalizePhone,
} from '../utils/recipient-validator.util';

/**
 * Pure service for recipient validation
 * No side effects, only validation logic
 */
@Injectable()
export class RecipientValidationService {
  /**
   * Determine and validate recipient for channel
   * Pure function - no side effects
   */
  determineAndValidateRecipient(
    channel: NotificationChannel,
    email: string | null,
    phone: string | null,
    userId: string,
  ): string | null {
    if (channel === NotificationChannel.EMAIL) {
      if (!email || !isValidEmail(email)) {
        return null;
      }
      return email;
    }

    if (
      channel === NotificationChannel.SMS ||
      channel === NotificationChannel.WHATSAPP
    ) {
      if (!phone) {
        return null;
      }
      const normalized = normalizePhone(phone);
      if (!normalized || !isValidE164(normalized)) {
        return null;
      }
      return normalized;
    }

    if (
      channel === NotificationChannel.IN_APP ||
      channel === NotificationChannel.PUSH
    ) {
      return userId; // Use userId for in-app/push
    }

    return null;
  }
}
```

#### Step 3.2.2: Create PayloadBuilderService

```typescript
// src/modules/notifications/services/payload-builder.service.ts

import { Injectable } from '@nestjs/common';
import { NotificationPayload } from '../types/notification-payload.interface';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationType } from '../enums/notification-type.enum';
import { RenderedNotification } from '../manifests/types/manifest.types';

/**
 * Pure service for building notification payloads
 * No side effects, only data transformation
 */
@Injectable()
export class PayloadBuilderService {
  /**
   * Build payload for channel
   * Pure function - no side effects
   */
  buildPayload(
    channel: NotificationChannel,
    type: NotificationType,
    recipient: string,
    rendered: RenderedNotification,
    metadata: {
      correlationId: string;
      userId?: string;
      centerId?: string;
      profileType?: string;
      profileId?: string;
    },
  ): NotificationPayload {
    const base = {
      channel,
      type,
      recipient,
      correlationId: metadata.correlationId,
    };

    switch (channel) {
      case NotificationChannel.EMAIL:
        return {
          ...base,
          subject: rendered.subject,
          body: rendered.body,
          html: rendered.html,
        } as EmailNotificationPayload;

      case NotificationChannel.SMS:
        return {
          ...base,
          message: rendered.body,
        } as SmsNotificationPayload;

      // ... other channels
    }
  }
}
```

#### Step 3.2.3: Refactored NotificationRouterService

```typescript
// src/modules/notifications/services/routing/notification-router.service.ts (refactored, ~300 lines)

@Injectable()
export class NotificationRouterService {
  constructor(
    // ... existing
    private readonly recipientValidator: RecipientValidationService,
    private readonly payloadBuilder: PayloadBuilderService,
    private readonly rateLimitService: ChannelRateLimitService,
    private readonly retryStrategyService: ChannelRetryStrategyService,
  ) {}

  async route(context: NotificationProcessingContext): Promise<void> {
    for (const channel of context.finalChannels) {
      // IMPORTANT: Order of operations must be:
      // 1. Rate limit check (before any processing)
      // 2. Recipient validation (pure)
      // 3. Idempotency check
      // 4. Retry strategy (determine retry config)
      // 5. Render template
      // 6. Build payload (pure)
      // 7. Send/enqueue with retry

      // Step 1: Rate limit check (FIRST - prevents resource waste)
      const rateLimitResult = await this.rateLimitService.checkRateLimit(
        channel,
        context.userId,
      );
      if (!rateLimitResult.allowed) {
        this.logger.warn(
          `Rate limit exceeded for channel ${channel}`,
          'NotificationRouterService',
          { channel, userId: context.userId },
        );
        continue; // Skip this channel
      }

      // Step 2: Validate recipient (pure)
      const channelRecipient =
        this.recipientValidator.determineAndValidateRecipient(
          channel,
          context.recipient,
          context.phone,
          context.userId,
        );

      if (!channelRecipient) {
        continue;
      }

      // Step 3: Check idempotency
      const idempotencyResult = await this.checkIdempotency(/* ... */);
      if (!idempotencyResult.shouldProceed) {
        continue;
      }

      // Step 4: Get retry strategy (BEFORE sending)
      const retryConfig = this.retryStrategyService.getRetryConfig(channel);

      // Step 5: Render template
      const rendered = await this.renderer.render(/* ... */);

      // Step 6: Build payload (pure)
      const payload = this.payloadBuilder.buildPayload(
        channel,
        context.mapping.type,
        channelRecipient,
        rendered,
        {
          correlationId: context.correlationId,
          userId: context.userId,
          // ...
        },
      );

      // Step 7: Send/enqueue with retry strategy
      await this.sendOrEnqueueWithRetry(payload, retryConfig);
    }
  }

  /**
   * Send or enqueue with retry strategy
   * Ensures retry coordination with rate limiting
   */
  private async sendOrEnqueueWithRetry(
    payload: NotificationPayload,
    retryConfig: ChannelRetryConfig,
  ): Promise<void> {
    // Retry logic respects rate limits
    // If rate limited during retry, back off
    for (let attempt = 0; attempt < retryConfig.maxAttempts; attempt++) {
      try {
        // Check rate limit before each retry attempt
        const rateLimitResult = await this.rateLimitService.checkRateLimit(
          payload.channel,
          payload.userId || 'unknown',
        );

        if (!rateLimitResult.allowed && attempt > 0) {
          // Rate limited during retry - back off
          const backoffDelay = retryConfig.backoffDelay * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
          continue;
        }

        await this.sendOrEnqueue(payload);
        return; // Success
      } catch (error) {
        if (attempt === retryConfig.maxAttempts - 1) {
          throw error; // Last attempt failed
        }
        // Calculate backoff delay
        const delay =
          retryConfig.backoffType === 'exponential'
            ? retryConfig.backoffDelay * Math.pow(2, attempt)
            : retryConfig.backoffDelay;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}
```

#### Step 3.2.4: Add Coordination Order Verification Test

```typescript
// src/modules/notifications/services/routing/notification-router.coordination.spec.ts

describe('NotificationRouterService - Coordination Order', () => {
  it('should check rate limit before processing', async () => {
    const router = module.get(NotificationRouterService);
    const rateLimitService = module.get(ChannelRateLimitService);

    // Mock rate limit to reject
    jest.spyOn(rateLimitService, 'checkRateLimit').mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 60000,
    });

    // Verify recipient validator is NOT called
    const recipientValidator = module.get(RecipientValidationService);
    const validateSpy = jest.spyOn(
      recipientValidator,
      'determineAndValidateRecipient',
    );

    await router.route(mockContext);

    // Rate limit should be checked
    expect(rateLimitService.checkRateLimit).toHaveBeenCalled();
    // Recipient validation should NOT be called (early exit)
    expect(validateSpy).not.toHaveBeenCalled();
  });

  it('should apply retry strategy after rate limit check', async () => {
    const router = module.get(NotificationRouterService);
    const rateLimitService = module.get(ChannelRateLimitService);
    const retryStrategyService = module.get(ChannelRetryStrategyService);

    // Allow rate limit
    jest.spyOn(rateLimitService, 'checkRateLimit').mockResolvedValue({
      allowed: true,
      remaining: 100,
      resetAt: Date.now() + 60000,
    });

    // Mock retry strategy
    const retryConfig = {
      maxAttempts: 3,
      backoffType: 'exponential',
      backoffDelay: 1000,
    };
    jest
      .spyOn(retryStrategyService, 'getRetryConfig')
      .mockReturnValue(retryConfig);

    // Verify order: rate limit -> retry strategy
    const rateLimitSpy = jest.spyOn(rateLimitService, 'checkRateLimit');
    const retrySpy = jest.spyOn(retryStrategyService, 'getRetryConfig');

    await router.route(mockContext);

    // Rate limit should be checked first
    expect(rateLimitSpy).toHaveBeenCalledBefore(retrySpy as any);
  });

  it('should respect rate limits during retry attempts', async () => {
    const router = module.get(NotificationRouterService);
    const rateLimitService = module.get(ChannelRateLimitService);

    // First attempt: allowed, second: rate limited
    let callCount = 0;
    jest
      .spyOn(rateLimitService, 'checkRateLimit')
      .mockImplementation(async () => {
        callCount++;
        return {
          allowed: callCount === 1,
          remaining: callCount === 1 ? 100 : 0,
          resetAt: Date.now() + 60000,
        };
      });

    // Mock send to fail on first attempt
    const sendSpy = jest
      .spyOn(router as any, 'sendOrEnqueue')
      .mockRejectedValueOnce(new Error('Send failed'));

    await router.route(mockContext);

    // Should check rate limit before retry
    expect(rateLimitService.checkRateLimit).toHaveBeenCalledTimes(2);
  });
});
```

---

## Phase 4: Test Updates

### 4.1 Test Structure

**New Test Files:**

```
services/
├── notification-monitoring.service.spec.ts (NEW)
├── recipient-resolution.service.spec.ts (NEW)
├── template-preparation.service.spec.ts (NEW)
├── multi-recipient-processor.service.spec.ts (NEW)
├── recipient-validation.service.spec.ts (NEW)
├── payload-builder.service.spec.ts (NEW)
├── notification-circuit-breaker.integration.spec.ts (NEW)
├── notification-idempotency-cache.race-condition.spec.ts (NEW)
└── notification.service.spec.ts (UPDATE - test orchestrator only)
```

### 4.2 Test Patterns

#### Pure Service Tests (No Mocks Needed)

```typescript
describe('RecipientValidationService', () => {
  it('should validate email recipient', () => {
    const service = new RecipientValidationService();
    const result = service.determineAndValidateRecipient(
      NotificationChannel.EMAIL,
      'test@example.com',
      null,
      'user-123',
    );
    expect(result).toBe('test@example.com');
  });
});
```

#### Integration Tests (Real Dependencies)

```typescript
describe('NotificationService Integration', () => {
  it('should process notification end-to-end', async () => {
    const service = module.get(NotificationService);
    await service.trigger(NotificationType.OTP, mockEvent);
    // Verify notification was sent
  });
});
```

#### Race Condition Tests

```typescript
describe('Idempotency Race Conditions', () => {
  it('should prevent duplicates under concurrency', async () => {
    // Test with 100 concurrent requests
  });
});
```

---

## Implementation Timeline

### Week 1: Observability Consolidation

- Day 1-2: Create NotificationMonitoringService
- Day 3: Integrate into existing services
- Day 4: Update tests
- Day 5: Remove old files, verify

### Week 2: Runtime Validation

- Day 1-2: Circuit breaker validation
- Day 3: DLQ validation
- Day 4: Idempotency validation
- Day 5: Integration tests

### Week 3: Code Splitting

- Day 1-2: Split NotificationService
- Day 3: Split NotificationRouterService
- Day 4: Update all tests
- Day 5: Integration testing and cleanup

---

## Success Criteria

✅ **Observability:**

- Single monitoring service replaces two unused services
- Tracing and metrics integrated into all flows
- Health checks available

✅ **Runtime Validation:**

- Circuit breaker opens/closes verified
- DLQ cleanup verified
- Idempotency race conditions tested

✅ **Code Quality:**

- No file > 500 lines
- Pure services (no side effects)
- Clear interaction patterns
- 100% test coverage for new services

✅ **Maintainability:**

- Clear boundaries between services
- Easy to test in isolation
- Easy to extend

---

## Risk Mitigation

1. **Breaking Changes:**
   - Keep old services until new ones are fully tested
   - Feature flags for gradual rollout

2. **Performance:**
   - Benchmark before/after
   - Monitor metrics during rollout

3. **Test Coverage:**
   - Require tests before merging
   - Integration tests for critical paths

---

**Next Steps:**

1. Review and approve plan
2. Create feature branch
3. Start with Phase 1 (lowest risk)
4. Incremental PRs for each phase
