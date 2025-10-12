import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as fs from 'fs';
import { useContainer } from 'class-validator';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure class-validator to use NestJS container
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  // Use Helmet for secure HTTP headers
  app.use(helmet());

  // Validation is handled by CustomValidationPipe in app.module.ts

  // Enable CORS using NestJS built-in method
  app.enableCors({
    origin: ['http://localhost:3001'], // TODO: Replace with your trusted frontend origins
    credentials: true,
  });

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('LMS SaaS API')
    .setDescription(
      `
# LMS SaaS Platform API Documentation

This API provides comprehensive functionality for managing a Learning Management System (LMS) SaaS platform.

## Features

- **User Management**: Create, update, and manage users with different roles
- **Role-Based Access Control**: Comprehensive permission system with role hierarchy
- **Center Management**: Multi-tenant center management with access control
- **Soft Delete**: All entities support soft delete for data integrity
- **Pagination**: All list endpoints support pagination, search, and filtering
- **Authentication**: JWT-based authentication with refresh tokens
- **Two-Factor Authentication**: Enhanced security with 2FA support

## Authentication

All endpoints require authentication using Bearer tokens. Include the token in the Authorization header:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## Scope Management

The API supports multi-scope access control:

- **ADMIN Scope**: System-wide access for administrators
- **CENTER Scope**: Center-specific access for center administrators

Use the following headers to specify scope:

- \`x-scope-type\`: ADMIN or CENTER
- \`x-center-id\`: Center UUID (required for CENTER scope)

## Pagination

List endpoints support pagination with the following query parameters:

- \`page\`: Page number (default: 1)
- \`limit\`: Items per page (default: 10, max: 100)
- \`search\`: Search term across searchable fields
- \`sortBy\`: Sort field (e.g., "name:ASC", "createdAt:DESC")
- \`filter\`: Exact field filtering (e.g., "isActive:true")

## Error Handling

The API uses standard HTTP status codes:

- \`200\`: Success
- \`201\`: Created
- \`400\`: Bad Request
- \`401\`: Unauthorized
- \`403\`: Forbidden
- \`404\`: Not Found
- \`500\`: Internal Server Error

## Rate Limiting

API requests are rate-limited to prevent abuse. Limits are applied per IP address.
    `,
    )
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
