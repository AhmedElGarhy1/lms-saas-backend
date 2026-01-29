import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { NotificationLog } from './entities/notification-log.entity';
import { Notification } from './entities/notification.entity';
import { NotificationService } from './services/notification.service';
import { NotificationSenderService } from './services/notification-sender.service';
import { NotificationTemplateService } from './services/notification-template.service';
import { NotificationTranslationService } from './services/notification-translation.service';
import { NotificationProcessor } from './processors/notification.processor';
import { NotificationTriggerProcessor } from './processors/notification-trigger.processor';
import { NotificationLogRepository } from './repositories/notification-log.repository';
import { NotificationListener } from './listeners/notification.listener';
import {
  EmailAdapter,
  SmsAdapter,
  WhatsAppAdapter,
  InAppAdapter,
  PushAdapter,
} from './adapters';
import { MetaWhatsAppProvider } from './adapters/providers/meta-whatsapp.provider';
import { FcmProviderImpl } from './adapters/providers/fcm.provider';
import { RedisService } from '@/shared/modules/redis/redis.service';
import { RedisModule } from '@/shared/modules/redis/redis.module';
import { NotificationHistoryController } from './controllers/notification-history.controller';
import { InAppNotificationController } from './controllers/in-app-notification.controller';
import { NotificationMonitoringController } from './controllers/notification-monitoring.controller';
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
import { PushTokenResolverService } from './services/push-token-resolver.service';
import { PushTokenInvalidListener } from './listeners/push-token-invalid.listener';
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
import { CenterDeletedResolver } from './intents/resolvers/center-deleted.resolver';
import { CenterRestoredResolver } from './intents/resolvers/center-restored.resolver';
import { BranchCreatedResolver } from './intents/resolvers/branches/branch-created.resolver';
import { BranchUpdatedResolver } from './intents/resolvers/branches/branch-updated.resolver';
import { BranchDeletedResolver } from './intents/resolvers/branches/branch-deleted.resolver';
import { BranchRestoredResolver } from './intents/resolvers/branches/branch-restored.resolver';
import { StudentAbsentResolver } from './intents/resolvers/attendance/student-absent.resolver';
import { NewDeviceLoginResolver } from './intents/resolvers/new-device-login.resolver';
import { PasswordChangedResolver } from './intents/resolvers/password-changed.resolver';
import { LoginFailedResolver } from './intents/resolvers/login-failed.resolver';
import { TwoFaDisabledResolver } from './intents/resolvers/two-fa-disabled.resolver';
import { CenterAccessActivatedResolver } from './intents/resolvers/access-control/center-access-activated.resolver';
import { CenterAccessDeactivatedResolver } from './intents/resolvers/access-control/center-access-deactivated.resolver';
import { CenterAccessGrantedResolver } from './intents/resolvers/access-control/center-access-granted.resolver';
import { CenterAccessRevokedResolver } from './intents/resolvers/access-control/center-access-revoked.resolver';
import { RoleAssignedResolver } from './intents/resolvers/access-control/role-assigned.resolver';
import { RoleRevokedResolver } from './intents/resolvers/access-control/role-revoked.resolver';
import { NotificationIntentResolverRegistryService } from './intents/notification-intent-resolver-registry.service';
import { NotificationIntentService } from './services/notification-intent.service';
import { ProfileRole } from '@/modules/access-control/entities/profile-role.entity';
import { Role } from '@/modules/access-control/entities/role.entity';
import { UserProfileModule } from '@/modules/user-profile/user-profile.module';

// Session resolvers
import { SessionCreatedResolver } from './intents/resolvers/sessions/session-created.resolver';
import { SessionUpdatedResolver } from './intents/resolvers/sessions/session-updated.resolver';
import { SessionCanceledResolver } from './intents/resolvers/sessions/session-canceled.resolver';
import { SessionFinishedResolver } from './intents/resolvers/sessions/session-finished.resolver';
import { SessionDeletedResolver } from './intents/resolvers/sessions/session-deleted.resolver';
import { SessionCheckedInResolver } from './intents/resolvers/sessions/session-checked-in.resolver';
import { SessionConflictDetectedResolver } from './intents/resolvers/sessions/session-conflict-detected.resolver';

// Class resolvers
import { ClassCreatedResolver } from './intents/resolvers/classes/class-created.resolver';
import { ClassUpdatedResolver } from './intents/resolvers/classes/class-updated.resolver';
import { ClassDeletedResolver } from './intents/resolvers/classes/class-deleted.resolver';
import { ClassStatusChangedResolver } from './intents/resolvers/classes/class-status-changed.resolver';
import { StaffAssignedToClassResolver } from './intents/resolvers/classes/staff-assigned-to-class.resolver';
import { StaffRemovedFromClassResolver } from './intents/resolvers/classes/staff-removed-from-class.resolver';

// Group resolvers
import { GroupCreatedResolver } from './intents/resolvers/groups/group-created.resolver';
import { GroupUpdatedResolver } from './intents/resolvers/groups/group-updated.resolver';
import { GroupDeletedResolver } from './intents/resolvers/groups/group-deleted.resolver';
import { StudentAddedToGroupResolver } from './intents/resolvers/groups/student-added-to-group.resolver';
import { StudentRemovedFromGroupResolver } from './intents/resolvers/groups/student-removed-from-group.resolver';

// Student billing resolvers
import { ChargeCompletedResolver } from './intents/resolvers/student-billing/charge-completed.resolver';
import { ChargeInstallmentPaidResolver } from './intents/resolvers/student-billing/charge-installment-paid.resolver';
import { ChargeRefundedResolver } from './intents/resolvers/student-billing/charge-refunded.resolver';

// Teacher payout resolvers
import { PayoutCreatedResolver } from './intents/resolvers/teacher-payout/payout-created.resolver';
import { PayoutPaidResolver } from './intents/resolvers/teacher-payout/payout-paid.resolver';
import { PayoutInstallmentPaidResolver } from './intents/resolvers/teacher-payout/payout-installment-paid.resolver';

// Expense resolvers
import { ExpenseCreatedResolver } from './intents/resolvers/expenses/expense-created.resolver';
import { ExpenseRefundedResolver } from './intents/resolvers/expenses/expense-refunded.resolver';

// User profile resolvers
import { UserProfileActivatedResolver } from './intents/resolvers/user-profile/user-profile-activated.resolver';
import { UserProfileDeactivatedResolver } from './intents/resolvers/user-profile/user-profile-deactivated.resolver';
import { UserProfileDeletedResolver } from './intents/resolvers/user-profile/user-profile-deleted.resolver';
import { UserProfileRestoredResolver } from './intents/resolvers/user-profile/user-profile-restored.resolver';
import { UserProfileCreatedResolver } from './intents/resolvers/user-profile/user-profile-created.resolver';

// Session and Classes modules for repositories
import { SessionsModule } from '@/modules/sessions/sessions.module';
import { ClassesModule } from '@/modules/classes/classes.module';
import { StudentBillingModule } from '@/modules/student-billing/student-billing.module';
import { TeacherPayoutModule } from '@/modules/teacher-payouts/teacher-payouts.module';
import { ExpensesModule } from '@/modules/expenses/expenses.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationLog,
      Notification,
      ProfileRole,
      Role,
    ]),
    UserModule, // Needed for intent resolvers (UserService)
    CentersModule, // Needed for intent resolvers (CentersRepository)
    UserProfileModule, // Needed for intent resolvers (UserProfileService)
    SessionsModule, // Needed for session resolvers (SessionsRepository)
    ClassesModule, // Needed for session resolvers (GroupsRepository, GroupStudentsRepository, ClassStaffRepository, ClassesRepository)
    StudentBillingModule, // Needed for charge resolvers (StudentChargesRepository)
    TeacherPayoutModule, // Needed for payout resolvers (TeacherPayoutRecordsRepository)
    ExpensesModule, // Needed for expense resolvers (ExpenseRepository)
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
    NotificationTranslationService,
    NotificationProcessor,
    NotificationTriggerProcessor,
    NotificationLogRepository,
    NotificationRepository,
    NotificationListener,
    PushTokenInvalidListener,
    // Intent system
    NotificationIntentService,
    NotificationIntentResolverRegistryService,
    CenterCreatedResolver,
    CenterUpdatedResolver,
    CenterDeletedResolver,
    CenterRestoredResolver,
    BranchCreatedResolver,
    BranchUpdatedResolver,
    BranchDeletedResolver,
    BranchRestoredResolver,
    StudentAbsentResolver,
    OtpResolver,
    PhoneVerifiedResolver,
    NewDeviceLoginResolver,
    PasswordChangedResolver,
    LoginFailedResolver,
    TwoFaDisabledResolver,
    CenterAccessActivatedResolver,
    CenterAccessDeactivatedResolver,
    CenterAccessGrantedResolver,
    CenterAccessRevokedResolver,
    RoleAssignedResolver,
    RoleRevokedResolver,
    // Session resolvers
    SessionCreatedResolver,
    SessionUpdatedResolver,
    SessionCanceledResolver,
    SessionFinishedResolver,
    SessionDeletedResolver,
    SessionCheckedInResolver,
    SessionConflictDetectedResolver,
    // Class resolvers
    ClassCreatedResolver,
    ClassUpdatedResolver,
    ClassDeletedResolver,
    ClassStatusChangedResolver,
    StaffAssignedToClassResolver,
    StaffRemovedFromClassResolver,
    // Group resolvers
    GroupCreatedResolver,
    GroupUpdatedResolver,
    GroupDeletedResolver,
    StudentAddedToGroupResolver,
    StudentRemovedFromGroupResolver,
    // Student billing resolvers
    ChargeCompletedResolver,
    ChargeInstallmentPaidResolver,
    ChargeRefundedResolver,
    // Teacher payout resolvers
    PayoutCreatedResolver,
    PayoutPaidResolver,
    PayoutInstallmentPaidResolver,
    // Expense resolvers
    ExpenseCreatedResolver,
    ExpenseRefundedResolver,
    // User profile resolvers
    UserProfileActivatedResolver,
    UserProfileDeactivatedResolver,
    UserProfileDeletedResolver,
    UserProfileRestoredResolver,
    UserProfileCreatedResolver,
    //
    EmailAdapter,
    SmsAdapter,
    WhatsAppAdapter,
    InAppAdapter,
    PushAdapter,
    MetaWhatsAppProvider,
    FcmProviderImpl, // FCM provider for push notifications
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
    NotificationIdempotencyCacheService, // Idempotency cache for preventing duplicate sends
    NotificationCircuitBreakerService, // Circuit breaker with sliding window for preventing false positives
    TimeoutConfigService, // Provider-specific timeout configuration
    TemplateHotReloadService, // Hot reload templates in development
    NotificationPipelineService, // Pipeline service for processing steps
    NotificationRouterService, // Router service for channel routing
    MultiRecipientProcessor, // Multi-recipient processing with concurrency control
    RecipientValidationService, // Pure service for recipient validation
    PayloadBuilderService, // Pure service for payload building
    PushTokenResolverService, // Resolves FCM tokens for PUSH routing
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
    NotificationMonitoringController,
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
