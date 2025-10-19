import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as fs from 'fs';
import { useContainer } from 'class-validator';
import { UserMiddleware } from './shared/common/middleware/user.middleware';
import { UserService } from './modules/user/services/user.service';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { TransactionPerformanceInterceptor } from './modules/health';

async function bootstrap() {
  initializeTransactionalContext();

  const app = await NestFactory.create(AppModule);

  // Add performance monitoring interceptor globally
  const transactionInterceptor = app.get(TransactionPerformanceInterceptor);
  app.useGlobalInterceptors(transactionInterceptor);

  // attach user to reqeust if only token exist (even if expired)
  app.use(
    new UserMiddleware(app.get(UserService)).use.bind(
      new UserMiddleware(app.get(UserService)),
    ),
  );

  // Configure class-validator to use NestJS container
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  // Use Helmet for secure HTTP headers
  app.use(helmet());

  // Validation is handled by CustomValidationPipe in app.module.ts

  // Enable CORS using NestJS built-in method
  app.enableCors({
    origin: ['http://localhost:3001', 'https://lms-saas-khaki.vercel.app'],
    credentials: true,
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
        description: 'Enter your JWT token',
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
      description: 'Scope type (ADMIN or CENTER)',
    })
    .addGlobalParameters({
      in: 'header',
      required: false,
      name: 'x-center-id',
      schema: {
        type: 'string',
        example: '550e8400-e29b-41d4-a716-446655440000',
      },
      description: 'Center ID (required if x-scope-type is CENTER)',
    })
    .addServer('http://localhost:3000', 'Development server')
    .addServer('https://api.lms-saas.com', 'Production server')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // Save as JSON in the same directory as this script
  fs.writeFileSync(
    `${__dirname}/openapi.json`,
    JSON.stringify(document, null, 2),
  );

  console.log('OpenAPI spec exported to', `${__dirname}/openapi.json`);

  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}

void bootstrap();
