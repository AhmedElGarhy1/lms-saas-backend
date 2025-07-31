import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { APP_INTERCEPTOR, APP_FILTER, APP_PIPE, APP_GUARD } from '@nestjs/core';
import { Reflector } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '@/modules/auth/auth.module';
import { UserModule } from '@/modules/user/user.module';
import { CentersModule } from '@/modules/centers/centers.module';
import { AccessControlModule } from '@/modules/access-control/access-control.module';
import { ActivityLogModule } from '@/shared/modules/activity-log/activity-log.module';
import { SharedModule } from '@/shared/shared.module';
import { SeederModule } from '@/database/seeder.module';
import { ErrorInterceptor } from '@/common/interceptors/error.interceptor';
import { PerformanceInterceptor } from '@/common/interceptors/performance.interceptor';
import { ResponseTransformInterceptor } from '@/common/interceptors/response-transform.interceptor';
import { ScopeInterceptor } from '@/common/interceptors/scope.interceptor';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { CustomValidationPipe } from '@/common/pipes/validation.pipe';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { ContextGuard } from '@/common/guards/context.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { ContextValidationService } from '@/common/services/context-validation.service';
import { typeOrmConfig } from '@/shared/config/database.config';

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
    TypeOrmModule.forRoot(typeOrmConfig),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: process.env.NODE_ENV === 'test' ? 1 : 60000,
          limit: process.env.NODE_ENV === 'test' ? 1000 : 10,
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
  controllers: [AppController],
  providers: [
    AppService,
    ContextValidationService,
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
      useClass: ResponseTransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ScopeInterceptor,
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
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useFactory: (
        contextValidationService: ContextValidationService,
        reflector: Reflector,
      ) => new ContextGuard(contextValidationService, reflector),
      inject: [ContextValidationService, Reflector],
    },
    {
      provide: APP_GUARD,
      useFactory: (reflector: Reflector) => new PermissionsGuard(reflector),
      inject: [Reflector],
    },
  ],
})
export class AppModule {}
