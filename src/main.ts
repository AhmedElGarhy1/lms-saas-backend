import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Use Helmet for secure HTTP headers
  app.use(helmet());

  // Use global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enable CORS using NestJS built-in method
  app.enableCors({
    origin: ['http://localhost:3001'], // TODO: Replace with your trusted frontend origins
    credentials: true,
  });

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('LMS SaaS API')
    .setDescription('API documentation for the LMS SaaS platform.')
    .setVersion('1.0')
    .addBearerAuth()
    .addGlobalParameters({
      in: 'header',
      required: false,
      name: 'x-scope-type',
      schema: {
        type: 'string',
        enum: ['GLOBAL', 'CENTER'],
        default: 'GLOBAL',
        example: 'GLOBAL',
      },
      description: 'Scope type (GLOBAL or CENTER)',
    })
    .addGlobalParameters({
      in: 'header',
      required: false,
      name: 'x-scope-id',
      schema: {
        type: 'string',
        example: 'center-uuid',
      },
      description: 'Scope ID (center UUID, required if x-scope-type is CENTER)',
    })
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
