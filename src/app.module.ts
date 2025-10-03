import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { Profile } from '@/modules/user/entities/profile.entity';
import { Role } from '@/modules/access-control/entities/roles/role.entity';
import { Permission } from '@/modules/access-control/entities/permission.entity';
import { UserRole } from '@/modules/access-control/entities/roles/user-role.entity';
import { UserAccess } from '@/modules/user/entities/user-access.entity';
import { UserCenter } from '@/modules/access-control/entities/user-center.entity';
import { RefreshToken } from '@/modules/auth/entities/refresh-token.entity';
import { EmailVerification } from '@/modules/auth/entities/email-verification.entity';
import { PasswordResetToken } from '@/modules/auth/entities/password-reset-token.entity';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { APP_INTERCEPTOR, APP_FILTER, APP_PIPE, APP_GUARD } from '@nestjs/core';
import { Reflector } from '@nestjs/core';
import { AuthModule } from '@/modules/auth/auth.module';
import { UserModule } from '@/modules/user/user.module';
import { CentersModule } from '@/modules/centers/centers.module';
import { AccessControlModule } from '@/modules/access-control/access-control.module';
import { ActivityLogModule } from '@/shared/modules/activity-log/activity-log.module';
import { SharedModule } from '@/shared/shared.module';
import { SeederModule } from '@/database/seeder.module';

import { ErrorInterceptor } from '@/shared/common/interceptors/error.interceptor';
import { PerformanceInterceptor } from '@/shared/common/interceptors/performance.interceptor';
import { ResponseTransformInterceptor } from '@/shared/common/interceptors/response-transform.interceptor';
import { HttpExceptionFilter } from '@/shared/common/filters/http-exception.filter';
import { CustomValidationPipe } from '@/shared/common/pipes/validation.pipe';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { ContextGuard } from '@/shared/common/guards/context.guard';
import { PermissionsGuard } from '@/shared/common/guards/permissions.guard';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { DatabaseModule } from './shared/modules/database/database.module';
import { AccessControlHelperService } from './modules/access-control/services/access-control-helper.service';
import { ContextMiddleware } from './shared/common/middleware/context.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.simple(),
          ),
        }),
      ],
    }),
    DatabaseModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: process.env.NODE_ENV === 'test' ? 1 : 60000,
          limit: process.env.NODE_ENV === 'test' ? 1000 : 100000, // Temporarily increased for testing
        },
      ],
    }),
    SharedModule,
    AuthModule,
    UserModule,
    AccessControlModule,
    CentersModule,
    ActivityLogModule,
    SeederModule,
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
      useClass: ResponseTransformInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
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
      useFactory: (reflector: Reflector) => new PermissionsGuard(reflector),
      inject: [Reflector],
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ContextMiddleware).forRoutes('*');
  }
}
