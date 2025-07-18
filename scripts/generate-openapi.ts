import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fs from 'fs';

async function generateOpenAPISpec() {
  const app = await NestFactory.create(AppModule);
  const config = new DocumentBuilder()
    .setTitle('LMS SaaS API')
    .setDescription('API documentation for the LMS SaaS platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  // Save as JSON in the same directory as this script
  fs.writeFileSync(
    `${__dirname}/openapi.json`,
    JSON.stringify(document, null, 2),
  );

  await app.close();
  console.log('OpenAPI spec exported to', `${__dirname}/openapi.json`);
}

generateOpenAPISpec();
