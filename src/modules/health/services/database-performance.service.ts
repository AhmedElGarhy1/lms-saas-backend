import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface QueryPerformanceMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  parameters?: any[];
  error?: string;
}

@Injectable()
export class DatabasePerformanceService {
  private readonly logger = new Logger(DatabasePerformanceService.name);
  private readonly slowQueryThreshold = 1000; // 1 second
  private readonly queryMetrics: QueryPerformanceMetrics[] = [];

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    this.setupQueryLogging();
  }

  private setupQueryLogging(): void {
    // Enable query logging for performance monitoring
    this.dataSource.setOptions({
      logging: ['query', 'error', 'warn'],
      logger: 'advanced-console',
    });

    // Hook into query execution
    const originalQuery = this.dataSource.query.bind(this.dataSource);
    this.dataSource.query = async (query: string, parameters?: any[]) => {
      const startTime = Date.now();

      try {
        const result = await originalQuery(query, parameters);
        const duration = Date.now() - startTime;

        this.recordQueryMetrics({
          query,
          duration,
          timestamp: new Date(),
          parameters,
        });

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        this.recordQueryMetrics({
          query,
          duration,
          timestamp: new Date(),
          parameters,
          error: error.message,
        });

        throw error;
      }
    };
  }

  private recordQueryMetrics(metrics: QueryPerformanceMetrics): void {
    // Store metrics (in production, you might want to use a proper metrics store)
    this.queryMetrics.push(metrics);

    // Keep only last 1000 queries to prevent memory issues
    if (this.queryMetrics.length > 1000) {
      this.queryMetrics.shift();
    }

    // Log slow queries
    if (metrics.duration > this.slowQueryThreshold) {
      this.logger.warn(`SLOW QUERY DETECTED: ${metrics.duration}ms`, {
        query: this.sanitizeQuery(metrics.query),
        duration: metrics.duration,
        parameters: metrics.parameters,
        error: metrics.error,
      });
    }
  }

  private sanitizeQuery(query: string): string {
    // Remove sensitive data from query logs
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password='***'")
      .replace(/token\s*=\s*'[^']*'/gi, "token='***'")
      .replace(/secret\s*=\s*'[^']*'/gi, "secret='***'");
  }

  // Get performance statistics
  getPerformanceStats(): {
    totalQueries: number;
    averageDuration: number;
    slowQueries: number;
    recentSlowQueries: QueryPerformanceMetrics[];
  } {
    const totalQueries = this.queryMetrics.length;
    const averageDuration =
      totalQueries > 0
        ? this.queryMetrics.reduce((sum, m) => sum + m.duration, 0) /
          totalQueries
        : 0;
    const slowQueries = this.queryMetrics.filter(
      (m) => m.duration > this.slowQueryThreshold,
    ).length;
    const recentSlowQueries = this.queryMetrics
      .filter((m) => m.duration > this.slowQueryThreshold)
      .slice(-10); // Last 10 slow queries

    return {
      totalQueries,
      averageDuration: Math.round(averageDuration),
      slowQueries,
      recentSlowQueries,
    };
  }

  // Get transaction-specific metrics
  getTransactionMetrics(): {
    activeTransactions: number;
    transactionDuration: number;
  } {
    // This would require more sophisticated tracking
    // For now, return basic info
    return {
      activeTransactions: 0, // Would need to track this
      transactionDuration: 0, // Would need to track this
    };
  }
}
