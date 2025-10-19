import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DatabasePerformanceService } from '../services/database-performance.service';
import { TransactionPerformanceInterceptor } from '../interceptors/transaction-performance.interceptor';
import { Permissions } from '@/shared/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/access-control/constants/permissions';
import { PerformanceAlertsService } from '../services/performance-alerts.service';
import { Public } from '@/shared/common/decorators/public.decorator';

@ApiTags('Health - Performance Monitoring')
@Controller('health/performance')
@Public()
export class PerformanceController {
  constructor(
    private readonly databasePerformanceService: DatabasePerformanceService,
    private readonly alertsService: PerformanceAlertsService,
    private readonly transactionInterceptor: TransactionPerformanceInterceptor,
  ) {}

  @Get('database')
  @ApiOperation({ summary: 'Get database performance metrics' })
  @ApiResponse({
    status: 200,
    description: 'Database performance metrics retrieved successfully',
  })
  @Permissions(PERMISSIONS.USER.READ) // Only allow admins to view performance data
  getDatabasePerformance() {
    return this.databasePerformanceService.getPerformanceStats();
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get transaction performance metrics' })
  @ApiResponse({
    status: 200,
    description: 'Transaction performance metrics retrieved successfully',
  })
  @Permissions(PERMISSIONS.USER.READ)
  getTransactionPerformance() {
    return this.databasePerformanceService.getTransactionMetrics();
  }

  @Get('health')
  @ApiOperation({ summary: 'Get system health status' })
  @ApiResponse({
    status: 200,
    description: 'System health status retrieved successfully',
  })
  getSystemHealth() {
    const dbStats = this.databasePerformanceService.getPerformanceStats();
    const alertStats = this.alertsService.getAlertStats();
    const transactionStats = this.transactionInterceptor.getPerformanceStats();

    return {
      status:
        alertStats.critical > 0
          ? 'critical'
          : alertStats.warning > 0
            ? 'warning'
            : 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        status: 'connected',
        averageQueryTime: `${dbStats.averageDuration}ms`,
        slowQueries: dbStats.slowQueries,
        totalQueries: dbStats.totalQueries,
      },
      transactions: {
        status: 'operational',
        totalMethods: Object.keys(transactionStats).length,
        errorRate: this.calculateOverallErrorRate(transactionStats),
      },
      alerts: alertStats,
    };
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get active performance alerts' })
  @ApiResponse({
    status: 200,
    description: 'Active alerts retrieved successfully',
  })
  @Permissions(PERMISSIONS.USER.READ)
  getActiveAlerts() {
    return this.alertsService.getActiveAlerts();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get comprehensive performance statistics' })
  @ApiResponse({
    status: 200,
    description: 'Performance statistics retrieved successfully',
  })
  @Permissions(PERMISSIONS.USER.READ)
  getPerformanceStats() {
    return {
      database: this.databasePerformanceService.getPerformanceStats(),
      transactions: this.transactionInterceptor.getPerformanceStats(),
      alerts: this.alertsService.getAlertStats(),
      system: {
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        nodeVersion: process.version,
      },
    };
  }

  @Post('alerts/resolve/:alertId')
  @ApiOperation({ summary: 'Resolve a performance alert' })
  @ApiResponse({
    status: 200,
    description: 'Alert resolved successfully',
  })
  @Permissions(PERMISSIONS.USER.READ)
  resolveAlert(@Body('alertId') alertId: string) {
    this.alertsService.resolveAlert(alertId);
    return { message: 'Alert resolved successfully' };
  }

  private calculateOverallErrorRate(
    transactionStats: Record<
      string,
      { success: number; error: number; total: number; errorRate: number }
    >,
  ): number {
    const methods = Object.values(transactionStats);
    if (methods.length === 0) return 0;

    const totalErrors = methods.reduce(
      (sum: number, method) => sum + method.error,
      0,
    );
    const totalCalls = methods.reduce(
      (sum: number, method) => sum + method.total,
      0,
    );

    return totalCalls > 0 ? totalErrors / totalCalls : 0;
  }
}
