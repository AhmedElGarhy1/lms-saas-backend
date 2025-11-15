import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_INTERCEPTOR, APP_FILTER, APP_PIPE, APP_GUARD } from '@nestjs/core';
import { Reflector } from '@nestjs/core';
import {
  AcceptLanguageResolver,
  I18nJsonLoader,
  I18nModule,
  QueryResolver,
} from 'nestjs-i18n';
import { AuthModule } from '@/modules/auth/auth.module';
import { UserModule } from '@/modules/user/user.module';
import { CentersModule } from '@/modules/centers/centers.module';
import { AccessControlModule } from '@/modules/access-control/access-control.module';
import { ActivityLogModule } from '@/shared/modules/activity-log/activity-log.module';
import { SharedModule } from '@/shared/shared.module';
import { SeederModule } from '@/database/seeder.module';
import { LocaleModule } from '@/modules/locale/locale.module';
import { ErrorInterceptor } from '@/shared/common/interceptors/error.interceptor';
import { PerformanceInterceptor } from '@/shared/common/interceptors/performance.interceptor';
import { GlobalExceptionFilter } from '@/shared/common/filters/global-exception.filter';
import { TypeOrmExceptionFilter } from '@/shared/common/filters/typeorm-exception.filter';
import { ResponseInterceptor } from '@/shared/common/interceptors/response.interceptor';
import { CustomValidationPipe } from '@/shared/common/pipes/validation.pipe';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { ContextGuard } from '@/shared/common/guards/context.guard';
import { PermissionsGuard } from '@/shared/common/guards/permissions.guard';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { DatabaseModule } from './shared/modules/database/database.module';
import { AccessControlHelperService } from './modules/access-control/services/access-control-helper.service';
import { ContextMiddleware } from './shared/common/middleware/context.middleware';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RolesService } from './modules/access-control/services/roles.service';
import { join } from 'path';
import { UserLocaleResolver } from './shared/resolvers/user-locale.resolver';
import { Locale } from './shared/common/enums/locale.enum';
import { HealthModule } from './modules/health';
import { UserProfileModule } from './modules/user-profile/user-profile.module';
import { StaffModule } from './modules/staff/staff.module';
import { AdminModule } from './modules/admin/admin.module';
import { ProfileGuard } from './shared/common/guards/profile.guard';
import { UserProfileService } from './modules/user-profile/services/user-profile.service';
import { NotificationModule } from './modules/notifications/notifications.module';
import { BullModule } from '@nestjs/bullmq';
import { RedisModule } from './shared/modules/redis/redis.module';
import { RedisService } from './shared/modules/redis/redis.service';
import { validateEnv } from './shared/config/env.validation';
import { ScheduleModule } from '@nestjs/schedule';
import { RateLimitModule } from './modules/rate-limit/rate-limit.module';
import { RateLimitStrategyType } from './modules/rate-limit/interfaces/rate-limit-config.interface';

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
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 50,
        },
      ],
    }),
    I18nModule.forRoot({
      fallbackLanguage: Locale.AR,
      loader: I18nJsonLoader,
      loaderOptions: {
        path: join(__dirname, '/i18n/'),
        watch: true,
        includeSubfolders: false,
      },
      typesOutputPath: join(__dirname, '../../src/generated/i18n.generated.ts'),
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        UserLocaleResolver,
        AcceptLanguageResolver,
      ],
    }),
    SharedModule,
    RedisModule,
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
    AdminModule,
    AccessControlModule,
    CentersModule,
    ActivityLogModule,
    SeederModule,
    LocaleModule,
    HealthModule,
    NotificationModule,
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
    {
      provide: APP_INTERCEPTOR,
      useClass: ErrorInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: TypeOrmExceptionFilter,
    },
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
      ) => new ContextGuard(reflector, accessControlHelperService),
      inject: [Reflector, AccessControlHelperService],
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
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
