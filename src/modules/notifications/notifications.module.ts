import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
  PushAdapter,
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
import { WebSocketAuthGuard } from './guards/websocket-auth.guard';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '@/modules/auth/auth.module';
import { UserModule } from '../user/user.module';
import { RedisCleanupJob } from './jobs/redis-cleanup.job';
import { TemplateCacheService } from './services/template-cache.service';
import { NotificationMetricsService } from './services/notification-metrics.service';
import { MetricsBatchService } from './services/metrics-batch.service';
import { ChannelRateLimitService } from './services/channel-rate-limit.service';
import { ChannelRetryStrategyService } from './services/channel-retry-strategy.service';
import { ChannelSelectionService } from './services/channel-selection.service';
import { RecipientResolverService } from './services/recipient-resolver.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationLog,
      Notification,
    ]),
    UserModule,
    JwtModule,
    AuthModule,
    BullModule.registerQueueAsync({
      name: 'notifications',
      imports: [ConfigModule, RedisModule],
      useFactory: (
        configService: ConfigService,
        redisService: RedisService,
      ) => ({
        connection: redisService.getClient(),
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: {
            age: 24 * 3600, // 24 hours
          },
          removeOnFail: {
            age: 7 * 24 * 3600, // 7 days
          },
        },
      }),
      inject: [ConfigService, RedisService],
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
    PushAdapter,
    InAppAdapter,
    TwilioWhatsAppProvider,
    MetaWhatsAppProvider,
    InAppNotificationService,
    NotificationGateway,
    WebSocketAuthGuard,
    RedisCleanupJob,
    TemplateCacheService,
    MetricsBatchService,
    ChannelRateLimitService,
    ChannelRetryStrategyService,
    NotificationMetricsService,
    ChannelSelectionService,
    RecipientResolverService,
  ],
  controllers: [
    NotificationHistoryController,
    InAppNotificationController,
  ],
  exports: [
    NotificationService,
    EmailAdapter, // Export for backward compatibility during migration
    InAppNotificationService, // Export for use in UserProfileService
  ],
})
export class NotificationModule {}
