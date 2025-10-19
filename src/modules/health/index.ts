export { HealthModule } from './health.module';
export { HealthController } from './controllers/health.controller';
export { PerformanceController } from './controllers/performance.controller';
export { HealthService } from './services/health.service';
export { DatabasePerformanceService } from './services/database-performance.service';
export { PerformanceAlertsService } from './services/performance-alerts.service';
export { TransactionPerformanceInterceptor } from './interceptors/transaction-performance.interceptor';

// Export types
export type { HealthStatus } from './services/health.service';
export type { PerformanceAlert } from './services/performance-alerts.service';
export type { QueryPerformanceMetrics } from './services/database-performance.service';
