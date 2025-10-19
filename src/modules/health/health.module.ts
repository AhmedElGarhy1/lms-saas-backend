import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { HealthController } from './controllers/health.controller';
import { PerformanceController } from './controllers/performance.controller';
import { HealthService } from './services/health.service';
import { DatabasePerformanceService } from './services/database-performance.service';
import { PerformanceAlertsService } from './services/performance-alerts.service';
import { TransactionPerformanceInterceptor } from './interceptors/transaction-performance.interceptor';

@Module({
  imports: [EventEmitterModule],
  controllers: [HealthController, PerformanceController],
  providers: [
    HealthService,
    DatabasePerformanceService,
    PerformanceAlertsService,
    TransactionPerformanceInterceptor,
  ],
  exports: [
    HealthService,
    DatabasePerformanceService,
    PerformanceAlertsService,
    TransactionPerformanceInterceptor,
  ],
})
export class HealthModule {}
