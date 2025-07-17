import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';

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
    }),
  );

  // Enable CORS using NestJS built-in method
  app.enableCors({
    origin: ['http://localhost:3000'], // TODO: Replace with your trusted frontend origins
    credentials: true,
  });

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('LMS SaaS API')
    .setDescription('API documentation for the LMS SaaS platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}

void bootstrap();
