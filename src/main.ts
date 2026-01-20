import { NestFactory } from '@nestjs/core';
import { RequestMethod } from '@nestjs/common';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { useContainer } from 'class-validator';
import * as express from 'express';
import { UserMiddleware } from './shared/common/middleware/user.middleware';
import { UserService } from './modules/user/services/user.service';
import { TransactionPerformanceInterceptor } from './modules/health';
import { RedisIoAdapter } from './modules/notifications/adapters/redis-io.adapter';
import { RedisService } from './shared/modules/redis/redis.service';
import { RateLimitService } from './modules/rate-limit/services/rate-limit.service';
import { Config } from './shared/config/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
    rawBody: false,
  });

  // Configure body size limit (1MB)
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Optional: interceptor to measure performance
  const transactionInterceptor = app.get(TransactionPerformanceInterceptor);
  app.useGlobalInterceptors(transactionInterceptor);

  // Attach user middleware
  app.use(
    new UserMiddleware(app.get(UserService)).use.bind(
      new UserMiddleware(app.get(UserService)),
    ),
  );

  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  app.use(helmet());

  app.enableCors({
    origin: Config.auth.corsOrigins,
  });

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('LMS SaaS API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addSecurityRequirements('bearer')
    .addGlobalParameters({
      in: 'header',
      required: false,
      name: 'x-scope-type',
      schema: {
        type: 'string',
        enum: ['ADMIN', 'CENTER'],
        default: 'ADMIN',
        example: 'ADMIN',
      },
    })
    .addGlobalParameters(
      {
        in: 'header',
        required: false,
        name: 'x-center-id',
        schema: {
          type: 'string',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
      },
      {
        in: 'header',
        required: false,
        name: 'x-user-profile-id',
        schema: {
          type: 'string',
          example: '550e8400-e29b-41d4-a716-446655440002',
        },
      },
    )
    .addServer('http://localhost:3000/api/v1', 'Development server')
    .addServer(
      'lms-saas-backend-production-5e39.up.railway.app/api/v1',
      'Production server',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // fs.writeFileSync(
  //   `${__dirname}/openapi.json`,
  //   JSON.stringify(document, null, 2),
  // );

  // console.log('OpenAPI spec exported to', `${__dirname}/openapi.json`);

  // Set global prefix for API versioning
  app.setGlobalPrefix('/api/v1', {
    // Exclude routes that don't need the prefix (like metrics, health checks, etc.)
    exclude: [
      { path: 'metrics', method: RequestMethod.GET },
      { path: 'health', method: RequestMethod.GET },
      { path: 'health/(.*)', method: RequestMethod.ALL }, // All health-related routes
      { path: 'docs', method: RequestMethod.GET },
      { path: 'docs/(.*)', method: RequestMethod.GET }, // Swagger docs paths
    ],
  });

  // Configure Redis adapter for Socket.IO (horizontal scaling)
  const redisService = app.get(RedisService);
  const rateLimitService = app.get(RateLimitService);
  app.useWebSocketAdapter(
    new RedisIoAdapter(redisService, app, rateLimitService),
  );

  await app.listen(3000);
  console.log(`🚀 App running on: ${await app.getUrl()}`);
}

void bootstrap();
