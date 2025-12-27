import { Module } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { MetricsController } from './controllers/metrics.controller';

@Module({
  imports: [
    PrometheusModule.register({
      defaultLabels: {
        service: 'lms-metrics',
        version: process.env.npm_package_version || '1.0.0',
      },
      defaultMetrics: {
        enabled: true,
        config: {
          prefix: 'lms_',
        },
      },
    }),
  ],
  controllers: [MetricsController],
  exports: [PrometheusModule],
})
export class MetricsModule {}
