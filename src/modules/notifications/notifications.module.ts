import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { NotificationLog } from './entities/notification-log.entity';
import { Notification } from './entities/notification.entity';
import { NotificationService } from './services/notification.service';
import { NotificationSenderService } from './services/notification-sender.service';
import { NotificationTemplateService } from './services/notification-template.service';
import { NotificationProcessor } from './processors/notification.processor';
import { NotificationLogRepository } from './repositories/notification-log.repository';
import { NotificationListener } from './listeners/notification.listener';
import {
  EmailAdapter,
  SmsAdapter,
  WhatsAppAdapter,
  InAppAdapter,
} from './adapters';
import { TwilioWhatsAppProvider } from './adapters/providers/twilio-whatsapp.provider';
import { MetaWhatsAppProvider } from './adapters/providers/meta-whatsapp.provider';
import { RedisService } from '@/shared/modules/redis/redis.service';
import { RedisModule } from '@/shared/modules/redis/redis.module';
import { NotificationHistoryController } from './controllers/notification-history.controller';
import { InAppNotificationController } from './controllers/in-app-notification.controller';
import { NotificationRepository } from './repositories/notification.repository';
import { InAppNotificationService } from './services/in-app-notification.service';
import { NotificationGateway } from './gateways/notification.gateway';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '@/modules/auth/auth.module';
import { UserModule } from '../user/user.module';
import { CentersModule } from '@/modules/centers/centers.module';
import { RedisCleanupJob } from './jobs/redis-cleanup.job';
import { TemplateCacheService } from './services/template-cache.service';
import { RedisTemplateCacheService } from './services/redis-template-cache.service';
import { NotificationMetricsService } from './services/notification-metrics.service';
import { MetricsBatchService } from './services/metrics-batch.service';
import { ChannelRateLimitService } from './services/channel-rate-limit.service';
import { ChannelRetryStrategyService } from './services/channel-retry-strategy.service';
import { ChannelSelectionService } from './services/channel-selection.service';
import { RecipientResolverService } from './services/recipient-resolver.service';
import { NotificationManifestResolver } from './manifests/registry/notification-manifest-resolver.service';
import { NotificationRenderer } from './renderer/notification-renderer.service';
import { NotificationValidator } from './validator/notification-validator.service';
import { NotificationIdempotencyCacheService } from './services/notification-idempotency-cache.service';
import { NotificationCircuitBreakerService } from './services/notification-circuit-breaker.service';
import { TimeoutConfigService } from './config/timeout.config';
import { NotificationDlqCleanupJob } from './jobs/notification-dlq-cleanup.job';
import { NotificationAlertService } from './services/notification-alert.service';
import { QUEUE_CONSTANTS } from './constants/notification.constants';
import { TemplateHotReloadService } from './services/template-hot-reload.service';
import { NotificationPipelineService } from './services/pipeline/notification-pipeline.service';
import { NotificationRouterService } from './services/routing/notification-router.service';
import { NotificationTracerService } from './observability/notification-tracer.service';
import { PrometheusMetricsService } from './observability/prometheus-metrics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationLog, Notification]),
    UserModule,
    CentersModule,
    JwtModule,
    AuthModule,
    BullModule.registerQueueAsync({
      name: 'notifications',
      imports: [RedisModule],
      useFactory: (redisService: RedisService) => ({
        connection: redisService.getClient(),
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: {
            age: QUEUE_CONSTANTS.COMPLETED_JOB_AGE_SECONDS,
          },
          removeOnFail: {
            age: QUEUE_CONSTANTS.FAILED_JOB_AGE_SECONDS,
          },
        },
      }),
      inject: [RedisService],
    }),
  ],
  providers: [
    NotificationService,
    NotificationSenderService,
    NotificationTemplateService,
    NotificationProcessor,
    NotificationLogRepository,
    NotificationRepository,
    NotificationListener,
    EmailAdapter,
    SmsAdapter,
    WhatsAppAdapter,
    InAppAdapter,
    TwilioWhatsAppProvider,
    MetaWhatsAppProvider,
    InAppNotificationService,
    NotificationGateway,
    RedisCleanupJob,
    NotificationDlqCleanupJob, // Cleanup job for old failed notifications
    TemplateCacheService, // Legacy - can be removed after migration
    RedisTemplateCacheService, // New Redis-based template cache
    MetricsBatchService,
    ChannelRateLimitService,
    ChannelRetryStrategyService,
    NotificationMetricsService,
    ChannelSelectionService,
    RecipientResolverService,
    NotificationManifestResolver, // Resolves manifests for renderer
    NotificationRenderer, // Renders notifications using manifests
    NotificationValidator, // Validates manifests on module init
    NotificationIdempotencyCacheService, // Idempotency cache for preventing duplicate sends
    NotificationCircuitBreakerService, // Circuit breaker with sliding window for preventing false positives
    TimeoutConfigService, // Provider-specific timeout configuration
    NotificationAlertService, // Alert service for queue backlog and system health
    TemplateHotReloadService, // Hot reload templates in development
    NotificationPipelineService, // Pipeline service for processing steps
    NotificationRouterService, // Router service for channel routing
    NotificationTracerService, // Tracing service for observability
    PrometheusMetricsService, // Prometheus metrics wrapper service
  ],
  controllers: [NotificationHistoryController, InAppNotificationController],
  exports: [
    NotificationService,
    InAppNotificationService, // Export for use in UserProfileService
    NotificationManifestResolver, // Export for use in other modules
    NotificationRenderer, // Export for use in other modules
  ],
})
export class NotificationModule {}
