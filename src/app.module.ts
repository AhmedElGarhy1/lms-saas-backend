import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
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
import { UserService } from './modules/user/services/user.service';
import { Locale } from './shared/common/enums/locale.enum';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 10,
    }),
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
    I18nModule.forRoot({
      fallbackLanguage: Locale.EN,
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
    AuthModule,
    UserModule,
    AccessControlModule,
    CentersModule,
    ActivityLogModule,
    SeederModule,
    LocaleModule,
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
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: TypeOrmExceptionFilter,
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
