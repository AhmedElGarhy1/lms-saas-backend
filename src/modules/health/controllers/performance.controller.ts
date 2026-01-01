import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DatabasePerformanceService } from '../services/database-performance.service';
import { TransactionPerformanceInterceptor } from '../interceptors/transaction-performance.interceptor';
import { PerformanceAlertsService } from '../services/performance-alerts.service';
import { Public } from '@/shared/common/decorators/public.decorator';
import { ControllerResponse } from '@/shared/common/dto/controller-response.dto';

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
  getDatabasePerformance() {
    const result = this.databasePerformanceService.getPerformanceStats();
    return ControllerResponse.success(result, 'Performance metrics retrieved successfully');
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get transaction performance metrics' })
  @ApiResponse({
    status: 200,
    description: 'Transaction performance metrics retrieved successfully',
  })
  getTransactionPerformance() {
    const result = this.databasePerformanceService.getTransactionMetrics();
    return ControllerResponse.success(result, 'Performance metrics retrieved successfully');
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

    const result = {
      status:
        alertStats.critical > 0
          ? 'critical'
          : alertStats.warning > 0
            ? 'warning'
            : 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        slowQueries: dbStats.slowQueries,
        totalQueries: dbStats.totalQueries,
      },
      transactions: "Transaction performance metrics",
      alerts: alertStats,
    };
    return ControllerResponse.success(result, 'Performance metrics retrieved successfully');
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get active performance alerts' })
  @ApiResponse({
    status: 200,
    description: 'Active alerts retrieved successfully',
  })
  async getActiveAlerts() {
    const result = this.alertsService.getActiveAlerts();
    return ControllerResponse.success(result, 'Performance metrics retrieved successfully');
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get comprehensive performance statistics' })
  @ApiResponse({
    status: 200,
    description: 'Performance statistics retrieved successfully',
  })
  async getPerformanceStats() {
    const result = {
      database: this.databasePerformanceService.getPerformanceStats(),
      transactions: this.transactionInterceptor.getPerformanceStats(),
      alerts: this.alertsService.getAlertStats(),
      system: {
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        nodeVersion: process.version,
      },
    };
    return ControllerResponse.success(result, 'Performance metrics retrieved successfully');
  }

  @Post('alerts/resolve/:alertId')
  @ApiOperation({ summary: 'Resolve a performance alert' })
  @ApiResponse({
    status: 200,
    description: 'Alert resolved successfully',
  })
  async resolveAlert(@Body('alertId') alertId: string) {
    await this.alertsService.resolveAlert(alertId);
    return ControllerResponse.message('Alert resolved successfully');
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
