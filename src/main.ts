import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { useContainer } from 'class-validator';
import { UserMiddleware } from './shared/common/middleware/user.middleware';
import { UserService } from './modules/user/services/user.service';
import { TransactionPerformanceInterceptor } from './modules/health';
import { RedisIoAdapter } from './modules/notifications/adapters/redis-io.adapter';
import { RedisService } from './shared/modules/redis/redis.service';
import { RateLimitService } from './modules/rate-limit/services/rate-limit.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
    origin: ['http://localhost:3001', 'https://lms-saas-khaki.vercel.app'],
  });

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('LMS SaaS API')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'JWT-auth',
    )
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
    .addGlobalParameters({
      in: 'header',
      required: false,
      name: 'x-center-id',
      schema: {
        type: 'string',
        example: '550e8400-e29b-41d4-a716-446655440000',
      },
    })
    .addServer('http://localhost:3000', 'Development server')
    .addServer('https://api.lms-saas.com', 'Production server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // fs.writeFileSync(
  //   `${__dirname}/openapi.json`,
  //   JSON.stringify(document, null, 2),
  // );

  // console.log('OpenAPI spec exported to', `${__dirname}/openapi.json`);

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
