import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PerformanceAlertsService } from '../services/performance-alerts.service';

@Injectable()
export class TransactionPerformanceInterceptor implements NestInterceptor {
  private readonly performanceCounters = new Map<
    string,
    { success: number; error: number }
  >();
  private readonly logger: Logger = new Logger(
    TransactionPerformanceInterceptor.name,
  );

  constructor(
    private readonly alertsService: PerformanceAlertsService,
    private readonly moduleRef: ModuleRef,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const className = context.getClass().name;
    const methodName = context.getHandler().name;
    const isTransactional = this.hasTransactionalDecorator(context);

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logTransactionPerformance(
            className,
            methodName,
            duration,
            isTransactional,
            'success',
          );

          // Update performance counters
          this.updatePerformanceCounters(className, methodName, 'success');

          // Check for slow transactions
          void this.alertsService.checkSlowTransaction(
            className,
            methodName,
            duration,
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logTransactionPerformance(
            className,
            methodName,
            duration,
            isTransactional,
            'error',
            (error as Error)?.message || 'Unknown error',
          );

          // Update performance counters
          this.updatePerformanceCounters(className, methodName, 'error');

          // Check for slow transactions even on error
          void this.alertsService.checkSlowTransaction(
            className,
            methodName,
            duration,
          );
        },
      }),
    );
  }

  private hasTransactionalDecorator(context: ExecutionContext): boolean {
    const handler = context.getHandler();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const metadata = Reflect.getMetadata('__transactional__', handler);
    return !!metadata;
  }

  private logTransactionPerformance(
    className: string,
    methodName: string,
    duration: number,
    isTransactional: boolean,
    status: 'success' | 'error',
    errorMessage?: string,
  ): void {
    const logData: {
      className: string;
      methodName: string;
      duration: string;
      isTransactional: boolean;
      status: 'success' | 'error';
      timestamp: string;
      error?: string;
    } = {
      className,
      methodName,
      duration: `${duration}ms`,
      isTransactional,
      status,
      timestamp: new Date().toISOString(),
    };

    if (status === 'error' && errorMessage) {
      logData.error = errorMessage;
    }

    // Log slow transactions (>1000ms)
    if (duration > 1000) {
      this.logger.warn('Slow transaction detected', {
        ...logData,
        duration,
      });
    } else {
      this.logger.log('Transaction completed', {
        ...logData,
        duration,
      });
    }

    // Send to external monitoring systems
    this.sendToExternalMonitoring();

    // You can also send metrics to external monitoring services here
    // Example: this.sendToPrometheus(className, methodName, duration, status);
  }

  // Example method for sending metrics to external services
  private sendToPrometheus(
    className: string,
    methodName: string,
    duration: number,
    status: string,
  ): void {
    // Implementation for Prometheus, DataDog, New Relic, etc.
    // Example:
    // this.metricsService.increment('transaction_count', { class: className, method: methodName, status });
    // this.metricsService.histogram('transaction_duration', duration, { class: className, method: methodName });

    // Suppress unused parameter warnings for example method
    void className;
    void methodName;
    void duration;
    void status;
  }

  private updatePerformanceCounters(
    className: string,
    methodName: string,
    result: 'success' | 'error',
  ): void {
    const key = `${className}.${methodName}`;
    const counter = this.performanceCounters.get(key) || {
      success: 0,
      error: 0,
    };

    if (result === 'success') {
      counter.success++;
    } else {
      counter.error++;
    }

    this.performanceCounters.set(key, counter);

    // Check for high error rates every 10 calls
    const total = counter.success + counter.error;
    if (total % 10 === 0 && total > 0) {
      void this.alertsService.checkErrorRate(
        className,
        methodName,
        counter.error,
        total,
      );
    }
  }

  /**
   * Get performance statistics for all methods
   */
  getPerformanceStats(): Record<
    string,
    { success: number; error: number; total: number; errorRate: number }
  > {
    const stats: Record<
      string,
      { success: number; error: number; total: number; errorRate: number }
    > = {};

    for (const [key, counter] of this.performanceCounters.entries()) {
      const total = counter.success + counter.error;
      stats[key] = {
        ...counter,
        total,
        errorRate: total > 0 ? counter.error / total : 0,
      };
    }

    return stats;
  }

  private sendToExternalMonitoring(): void {
    // Implementation for Prometheus, DataDog, New Relic, etc.
    // Example:
    // this.metricsService.increment('transaction_count', { class: className, method: methodName, status });
    // this.metricsService.histogram('transaction_duration', duration, { class: className, method: methodName });
  }
}
