import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_FILTER, APP_PIPE, APP_GUARD } from '@nestjs/core';
import { Reflector } from '@nestjs/core';
import { AuthModule } from '@/modules/auth/auth.module';
import { UserModule } from '@/modules/user/user.module';
import { CentersModule } from '@/modules/centers/centers.module';
import { LevelsModule } from '@/modules/levels/levels.module';
import { SubjectsModule } from '@/modules/subjects/subjects.module';
import { ClassesModule } from '@/modules/classes/classes.module';
import { SessionsModule } from '@/modules/sessions/sessions.module';
import { AttendanceModule } from '@/modules/attendance/attendance.module';
import { AccessControlModule } from '@/modules/access-control/access-control.module';
import { ActivityLogModule } from '@/shared/modules/activity-log/activity-log.module';
import { SharedModule } from '@/shared/shared.module';
import { SeederModule } from '@/database/seeder.module';
import { GlobalExceptionFilter } from '@/shared/common/filters/global-exception.filter';
import { ResponseInterceptor } from '@/shared/common/interceptors/response.interceptor';
import { ETagInterceptor } from '@/shared/common/interceptors/etag.interceptor';
import { CacheInterceptor } from '@/shared/common/interceptors/cache.interceptor';
import { CacheModule } from '@/shared/modules/cache/cache.module';
import { CustomValidationPipe } from '@/shared/common/pipes/validation.pipe';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { ContextGuard } from '@/shared/common/guards/context.guard';
import { PermissionsGuard } from '@/shared/common/guards/permissions.guard';
import { DatabaseModule } from './shared/modules/database/database.module';
import { AccessControlHelperService } from './modules/access-control/services/access-control-helper.service';
import { BranchAccessService } from './modules/centers/services/branch-access.service';
import { ContextMiddleware } from './shared/common/middleware/context.middleware';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RolesService } from './modules/access-control/services/roles.service';
import { CentersRepository } from './modules/centers/repositories/centers.repository';
import { HealthModule } from './modules/health';
import { UserProfileModule } from './modules/user-profile/user-profile.module';
import { StaffModule } from './modules/staff/staff.module';
import { StudentsModule } from './modules/students/students.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { RequestContextService } from './shared/common/services/request-context.service';
import { EnterpriseLoggerService } from './shared/common/services/enterprise-logger.service';
import { RequestLoggingInterceptor } from './shared/common/interceptors/request-logging.interceptor';
import { AdminModule } from './modules/admin/admin.module';
import { ProfileGuard } from './shared/common/guards/profile.guard';
import { PhoneVerificationGuard } from './shared/common/guards/phone-verification.guard';
import { UserProfileService } from './modules/user-profile/services/user-profile.service';
import { NotificationModule } from './modules/notifications/notifications.module';
import { BullModule } from '@nestjs/bullmq';
import { RedisModule } from './shared/modules/redis/redis.module';
import { RedisService } from './shared/modules/redis/redis.service';
import { validateEnv } from './shared/config/env.validation';
import { ScheduleModule } from '@nestjs/schedule';
import { RateLimitModule } from './modules/rate-limit/rate-limit.module';
import { RateLimitStrategyType } from './modules/rate-limit/interfaces/rate-limit-config.interface';
import { FinanceModule } from './modules/finance/finance.module';
import { StudentBillingModule } from './modules/student-billing/student-billing.module';
import { TeacherPayoutModule } from './modules/teacher-payouts/teacher-payouts.module';
import { R2Module } from './modules/r2/r2.module';
import { FileModule } from './modules/file/file.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { SettingsModule } from './modules/settings/settings.module';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 10,
      ignoreErrors: false,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),
    DatabaseModule,
    SharedModule,
    RedisModule,
    CacheModule,
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [RedisModule],
      useFactory: (redisService: RedisService) => ({
        connection: redisService.getClient(),
      }),
      inject: [RedisService],
    }),
    AuthModule,
    UserModule,
    UserProfileModule,
    StaffModule,
    StudentsModule,
    TeachersModule,
    AdminModule,
    AccessControlModule,
    CentersModule,
    LevelsModule,
    SubjectsModule,
    ClassesModule,
    SessionsModule,
    AttendanceModule,
    ActivityLogModule,
    SeederModule,
    HealthModule,
    NotificationModule,
    FinanceModule,
    StudentBillingModule,
    TeacherPayoutModule,
    ExpensesModule,
    SettingsModule,
    R2Module,
    FileModule,
    DashboardModule,
    RateLimitModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => ({
        default: {
          strategy: RateLimitStrategyType.SLIDING_WINDOW,
          limit: 50,
          windowSeconds: 60,
          failOpen: true,
          consumePoints: 1,
        },
        contexts: {
          http: {
            strategy: RateLimitStrategyType.FIXED_WINDOW,
            limit: 50,
            windowSeconds: 60,
            failOpen: true,
            consumePoints: 1,
          },
          websocket: {
            strategy: RateLimitStrategyType.SLIDING_WINDOW,
            limit: 100,
            windowSeconds: 60,
            failOpen: true,
            consumePoints: 1,
          },
          notification: {
            strategy: RateLimitStrategyType.SLIDING_WINDOW,
            limit: 100,
            windowSeconds: 60,
            failOpen: true,
            consumePoints: 1,
          },
        },
      }),
      inject: [],
    }),
  ],
  controllers: [],
  providers: [
    // Request context and enterprise logging services
    RequestContextService,
    EnterpriseLoggerService,

    {
      provide: APP_INTERCEPTOR,
      useFactory: (
        enterpriseLogger: EnterpriseLoggerService,
        requestContext: RequestContextService,
      ) => {
        return new RequestLoggingInterceptor(enterpriseLogger, requestContext);
      },
      inject: [EnterpriseLoggerService, RequestContextService],
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ETagInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
    // TypeORM filter must come first to convert database errors before global filter
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_PIPE,
      useClass: CustomValidationPipe,
    },
    {
      provide: APP_GUARD,
      useFactory: (reflector: Reflector) => new JwtAuthGuard(reflector),
      inject: [Reflector],
    },
    {
      provide: APP_GUARD,
      useFactory: (reflector: Reflector) =>
        new PhoneVerificationGuard(reflector),
      inject: [Reflector],
    },
    {
      provide: APP_GUARD,
      useFactory: (
        reflector: Reflector,
        userProfileService: UserProfileService,
      ) => new ProfileGuard(reflector, userProfileService),
      inject: [Reflector, UserProfileService],
    },
    {
      provide: APP_GUARD,
      useFactory: (
        reflector: Reflector,
        accessControlHelperService: AccessControlHelperService,
        centersRepository: CentersRepository,
        branchAccessService: BranchAccessService,
      ) =>
        new ContextGuard(
          reflector,
          accessControlHelperService,
          centersRepository,
          branchAccessService,
        ),
      inject: [
        Reflector,
        AccessControlHelperService,
        CentersRepository,
        BranchAccessService,
      ],
    },
    {
      provide: APP_GUARD,
      useFactory: (reflector: Reflector, rolesService: RolesService) =>
        new PermissionsGuard(reflector, rolesService),
      inject: [Reflector, RolesService],
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ContextMiddleware).forRoutes('*');
  }
}
