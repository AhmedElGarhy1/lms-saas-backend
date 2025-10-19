import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface PerformanceAlert {
  id: string;
  type:
    | 'slow_transaction'
    | 'high_error_rate'
    | 'memory_usage'
    | 'connection_pool';
  severity: 'warning' | 'critical';
  message: string;
  metrics: Record<string, any>;
  timestamp: Date;
  resolved?: boolean;
}

@Injectable()
export class PerformanceAlertsService {
  private readonly logger = new Logger(PerformanceAlertsService.name);
  private readonly alerts: Map<string, PerformanceAlert> = new Map();
  private readonly alertThresholds = {
    slowTransaction: 2000, // 2 seconds
    highErrorRate: 0.1, // 10% error rate
    memoryUsage: 0.8, // 80% memory usage
    connectionPool: 0.9, // 90% connection pool usage
  };

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Check for slow transactions and create alerts
   */
  checkSlowTransaction(
    className: string,
    methodName: string,
    duration: number,
  ): void {
    if (duration > this.alertThresholds.slowTransaction) {
      const alertId = `slow_transaction_${className}_${methodName}`;
      const alert: PerformanceAlert = {
        id: alertId,
        type: 'slow_transaction',
        severity: duration > 5000 ? 'critical' : 'warning',
        message: `Slow transaction detected: ${className}.${methodName} took ${duration}ms`,
        metrics: {
          className,
          methodName,
          duration,
          threshold: this.alertThresholds.slowTransaction,
        },
        timestamp: new Date(),
      };

      this.createAlert(alert);
    }
  }

  /**
   * Check for high error rates
   */
  checkErrorRate(
    className: string,
    methodName: string,
    errorCount: number,
    totalCount: number,
  ): void {
    const errorRate = errorCount / totalCount;
    if (errorRate > this.alertThresholds.highErrorRate) {
      const alertId = `high_error_rate_${className}_${methodName}`;
      const alert: PerformanceAlert = {
        id: alertId,
        type: 'high_error_rate',
        severity: errorRate > 0.2 ? 'critical' : 'warning',
        message: `High error rate detected: ${className}.${methodName} has ${(errorRate * 100).toFixed(1)}% error rate`,
        metrics: {
          className,
          methodName,
          errorCount,
          totalCount,
          errorRate,
          threshold: this.alertThresholds.highErrorRate,
        },
        timestamp: new Date(),
      };

      this.createAlert(alert);
    }
  }

  /**
   * Check system memory usage
   */
  checkMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal;
    const usedMem = memUsage.heapUsed;
    const usageRatio = usedMem / totalMem;

    if (usageRatio > this.alertThresholds.memoryUsage) {
      const alertId = 'high_memory_usage';
      const alert: PerformanceAlert = {
        id: alertId,
        type: 'memory_usage',
        severity: usageRatio > 0.9 ? 'critical' : 'warning',
        message: `High memory usage detected: ${(usageRatio * 100).toFixed(1)}% of heap used`,
        metrics: {
          heapUsed: usedMem,
          heapTotal: totalMem,
          usageRatio,
          threshold: this.alertThresholds.memoryUsage,
        },
        timestamp: new Date(),
      };

      this.createAlert(alert);
    }
  }

  /**
   * Create and emit alert
   */
  private createAlert(alert: PerformanceAlert): void {
    this.alerts.set(alert.id, alert);

    // Log the alert
    if (alert.severity === 'critical') {
      this.logger.error(`CRITICAL ALERT: ${alert.message}`, alert.metrics);
    } else {
      this.logger.warn(`WARNING: ${alert.message}`, alert.metrics);
    }

    // Emit event for external monitoring systems
    this.eventEmitter.emit('performance.alert', alert);

    // Auto-resolve after 5 minutes for non-critical alerts
    if (alert.severity === 'warning') {
      setTimeout(
        () => {
          this.resolveAlert(alert.id);
        },
        5 * 60 * 1000,
      );
    }
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      this.logger.log(`Alert resolved: ${alert.message}`);
      this.eventEmitter.emit('performance.alert.resolved', alert);
    }
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.alerts.values()).filter((alert) => !alert.resolved);
  }

  /**
   * Get alert statistics
   */
  getAlertStats(): {
    total: number;
    active: number;
    critical: number;
    warning: number;
  } {
    const allAlerts = Array.from(this.alerts.values());
    const activeAlerts = allAlerts.filter((alert) => !alert.resolved);

    return {
      total: allAlerts.length,
      active: activeAlerts.length,
      critical: activeAlerts.filter((alert) => alert.severity === 'critical')
        .length,
      warning: activeAlerts.filter((alert) => alert.severity === 'warning')
        .length,
    };
  }

  /**
   * Update alert thresholds
   */
  updateThresholds(thresholds: Partial<typeof this.alertThresholds>): void {
    Object.assign(this.alertThresholds, thresholds);
    this.logger.log('Alert thresholds updated', this.alertThresholds);
  }
}
