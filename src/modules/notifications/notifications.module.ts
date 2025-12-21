import {
  Module,
  NestModule,
  MiddlewareConsumer,
  OnModuleInit,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { NotificationLog } from './entities/notification-log.entity';
import { Notification } from './entities/notification.entity';
import { NotificationService } from './services/notification.service';
import { NotificationSenderService } from './services/notification-sender.service';
import { NotificationTemplateService } from './services/notification-template.service';
import { NotificationProcessor } from './processors/notification.processor';
import { NotificationTriggerProcessor } from './processors/notification-trigger.processor';
import { NotificationLogRepository } from './repositories/notification-log.repository';
import { NotificationListener } from './listeners/notification.listener';
import {
  EmailAdapter,
  SmsAdapter,
  WhatsAppAdapter,
  InAppAdapter,
} from './adapters';
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
import { InMemoryTemplateCacheService } from './services/in-memory-template-cache.service';
import { NotificationMetricsService } from './services/notification-metrics.service';
import { MetricsBatchService } from './services/metrics-batch.service';
import { ChannelRateLimitService } from './services/channel-rate-limit.service';
import { ChannelRetryStrategyService } from './services/channel-retry-strategy.service';
import { ChannelSelectionService } from './services/channel-selection.service';
import { NotificationManifestResolver } from './manifests/registry/notification-manifest-resolver.service';
import { NotificationRenderer } from './renderer/notification-renderer.service';
import { NotificationValidator } from './validator/notification-validator.service';
import { NotificationIdempotencyCacheService } from './services/notification-idempotency-cache.service';
import { NotificationCircuitBreakerService } from './services/notification-circuit-breaker.service';
import { TimeoutConfigService } from './config/timeout.config';
import { NotificationDlqCleanupJob } from './jobs/notification-dlq-cleanup.job';
import { QUEUE_CONSTANTS } from './constants/notification.constants';
import { TemplateHotReloadService } from './services/template-hot-reload.service';
import { NotificationPipelineService } from './services/pipeline/notification-pipeline.service';
import { NotificationRouterService } from './services/routing/notification-router.service';
import { MultiRecipientProcessor } from './services/multi-recipient-processor.service';
import { RecipientValidationService } from './services/recipient-validation.service';
import { PayloadBuilderService } from './services/payload-builder.service';
import { WhatsAppWebhookController } from './controllers/whatsapp-webhook.controller';
import { WhatsAppWebhookService } from './services/webhooks/whatsapp-webhook.service';
import { WhatsAppWebhookSignatureService } from './services/webhooks/whatsapp-webhook-signature.service';
import { WhatsAppWebhookIdempotencyService } from './services/webhooks/whatsapp-webhook-idempotency.service';
import { WhatsAppWebhookMetricsService } from './services/webhooks/whatsapp-webhook-metrics.service';
import { WhatsAppWebhookProcessor } from './processors/whatsapp-webhook.processor';
import { TIME_CONSTANTS } from './constants/notification.constants';
import { RawBodyMiddleware } from './middleware/raw-body.middleware';
import { CenterUpdatedResolver } from './intents/resolvers/center-updated.resolver';
import { OtpResolver } from './intents/resolvers/otp.resolver';
import { PhoneVerifiedResolver } from './intents/resolvers/phone-verified.resolver';
import { CenterCreatedResolver } from './intents/resolvers/center-created.resolver';
import { NotificationIntentResolverRegistryService } from './intents/notification-intent-resolver-registry.service';
import { NotificationIntentService } from './services/notification-intent.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationLog, Notification]),
    UserModule, // Needed for intent resolvers (UserService)
    CentersModule, // Needed for intent resolvers (CentersRepository)
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
    BullModule.registerQueueAsync({
      name: 'notification-triggers',
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
    BullModule.registerQueueAsync({
      name: 'whatsapp-webhooks',
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
            age: TIME_CONSTANTS.SEVEN_DAYS_SECONDS,
          },
          removeOnFail: {
            age: TIME_CONSTANTS.THIRTY_DAYS_SECONDS,
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
    NotificationTriggerProcessor,
    NotificationLogRepository,
    NotificationRepository,
    NotificationListener,
    // Intent system
    NotificationIntentService,
    NotificationIntentResolverRegistryService,
    CenterCreatedResolver,
    CenterUpdatedResolver,
    OtpResolver,
    PhoneVerifiedResolver,
    EmailAdapter,
    SmsAdapter,
    WhatsAppAdapter,
    InAppAdapter,
    MetaWhatsAppProvider,
    InAppNotificationService,
    NotificationGateway,
    RedisCleanupJob,
    NotificationDlqCleanupJob, // Cleanup job for old failed notifications
    InMemoryTemplateCacheService, // In-memory template cache
    MetricsBatchService,
    ChannelRateLimitService,
    ChannelRetryStrategyService,
    NotificationMetricsService,
    ChannelSelectionService,
    NotificationManifestResolver, // Resolves manifests for renderer
    NotificationRenderer, // Renders notifications using manifests
    NotificationValidator, // Validates manifests on module init
    NotificationIdempotencyCacheService, // Idempotency cache for preventing duplicate sends
    NotificationCircuitBreakerService, // Circuit breaker with sliding window for preventing false positives
    TimeoutConfigService, // Provider-specific timeout configuration
    TemplateHotReloadService, // Hot reload templates in development
    NotificationPipelineService, // Pipeline service for processing steps
    NotificationRouterService, // Router service for channel routing
    MultiRecipientProcessor, // Multi-recipient processing with concurrency control
    RecipientValidationService, // Pure service for recipient validation
    PayloadBuilderService, // Pure service for payload building
    // WhatsApp Webhook Services
    WhatsAppWebhookService, // Service for processing webhook events
    WhatsAppWebhookSignatureService, // Service for signature verification
    WhatsAppWebhookIdempotencyService, // Service for idempotency checks
    WhatsAppWebhookMetricsService, // Service for webhook metrics
    WhatsAppWebhookProcessor, // BullMQ processor for webhook events
  ],
  controllers: [
    NotificationHistoryController,
    InAppNotificationController,
    WhatsAppWebhookController,
  ],
  exports: [
    NotificationService,
    InAppNotificationService, // Export for use in UserProfileService
    NotificationManifestResolver, // Export for use in other modules
    NotificationRenderer, // Export for use in other modules
  ],
})
export class NotificationModule implements NestModule {
  constructor() {}

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RawBodyMiddleware)
      .forRoutes('notifications/webhooks/whatsapp');
  }
}
