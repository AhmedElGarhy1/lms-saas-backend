import { applyDecorators } from '@nestjs/common';
import {
  ApiResponse,
  ApiOperation,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiInternalServerErrorResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';

export interface ApiResponsesOptions {
  summary?: string;
  description?: string;
  successMessage?: string;
  includeValidation?: boolean;
  includeAuth?: boolean;
  includeNotFound?: boolean;
  includeConflict?: boolean;
  includeRateLimit?: boolean;
}

export function StandardApiResponses(options: ApiResponsesOptions = {}) {
  const {
    summary,
    description,
    successMessage = 'Operation completed successfully',
    includeValidation = true,
    includeAuth = true,
    includeNotFound = true,
    includeConflict = true,
    includeRateLimit = true,
  } = options;

  const decorators = [];

  // Add operation summary if provided
  if (summary) {
    decorators.push(
      ApiOperation({
        summary,
        description,
      }),
    );
  }

  // Standard success response
  decorators.push(
    ApiResponse({
      status: 200,
      description: successMessage,
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'object' },
          message: { type: 'string', example: successMessage },
          meta: {
            type: 'object',
            properties: {
              timestamp: { type: 'string', format: 'date-time' },
              requestId: { type: 'string' },
              version: { type: 'string', example: '1.0.0' },
              processingTime: { type: 'number' },
            },
          },
        },
      },
    }),
  );

  // Validation error response
  if (includeValidation) {
    decorators.push(
      ApiBadRequestResponse({
        description: 'Invalid input data',
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 400 },
            message: { type: 'string', example: 'Validation failed' },
            error: { type: 'string', example: 'Bad Request' },
            timestamp: { type: 'string', format: 'date-time' },
            userMessage: {
              type: 'string',
              example: 'Please check your input and try again',
            },
            actionRequired: {
              type: 'string',
              example: 'Fix the highlighted errors below',
            },
            retryable: { type: 'boolean', example: true },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  value: { type: 'string' },
                  message: { type: 'string' },
                  code: { type: 'string' },
                  suggestion: { type: 'string' },
                },
              },
            },
          },
        },
      }),
    );
  }

  // Authentication error response
  if (includeAuth) {
    decorators.push(
      ApiUnauthorizedResponse({
        description: 'Authentication required',
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 401 },
            message: { type: 'string', example: 'Authentication failed' },
            error: { type: 'string', example: 'Unauthorized' },
            timestamp: { type: 'string', format: 'date-time' },
            userMessage: {
              type: 'string',
              example: 'Please log in to continue',
            },
            actionRequired: {
              type: 'string',
              example: 'Please provide valid credentials',
            },
            retryable: { type: 'boolean', example: true },
          },
        },
      }),
    );
  }

  // Authorization error response
  if (includeAuth) {
    decorators.push(
      ApiForbiddenResponse({
        description: 'Insufficient permissions',
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 403 },
            message: { type: 'string', example: 'Access denied' },
            error: { type: 'string', example: 'Forbidden' },
            timestamp: { type: 'string', format: 'date-time' },
            userMessage: {
              type: 'string',
              example: 'You do not have permission to perform this action',
            },
            actionRequired: {
              type: 'string',
              example: 'Contact an administrator for access',
            },
            retryable: { type: 'boolean', example: false },
          },
        },
      }),
    );
  }

  // Not found error response
  if (includeNotFound) {
    decorators.push(
      ApiNotFoundResponse({
        description: 'Resource not found',
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 404 },
            message: { type: 'string', example: 'Resource not found' },
            error: { type: 'string', example: 'Not Found' },
            timestamp: { type: 'string', format: 'date-time' },
            userMessage: {
              type: 'string',
              example: 'The requested resource was not found',
            },
            actionRequired: {
              type: 'string',
              example: 'Check the resource ID and try again',
            },
            retryable: { type: 'boolean', example: false },
          },
        },
      }),
    );
  }

  // Conflict error response
  if (includeConflict) {
    decorators.push(
      ApiConflictResponse({
        description: 'Resource conflict',
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 409 },
            message: { type: 'string', example: 'Resource conflict' },
            error: { type: 'string', example: 'Conflict' },
            timestamp: { type: 'string', format: 'date-time' },
            userMessage: {
              type: 'string',
              example: 'This action conflicts with existing data',
            },
            actionRequired: {
              type: 'string',
              example: 'Use different information or update existing data',
            },
            retryable: { type: 'boolean', example: false },
          },
        },
      }),
    );
  }

  // Rate limit error response
  if (includeRateLimit) {
    decorators.push(
      ApiTooManyRequestsResponse({
        description: 'Rate limit exceeded',
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 429 },
            message: { type: 'string', example: 'Too many requests' },
            error: { type: 'string', example: 'Too Many Requests' },
            timestamp: { type: 'string', format: 'date-time' },
            userMessage: {
              type: 'string',
              example: 'Too many requests. Please try again later',
            },
            actionRequired: {
              type: 'string',
              example: 'Wait before making another request',
            },
            retryable: { type: 'boolean', example: true },
          },
        },
      }),
    );
  }

  // Internal server error response
  decorators.push(
    ApiInternalServerErrorResponse({
      description: 'Internal server error',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 500 },
          message: { type: 'string', example: 'Internal server error' },
          error: { type: 'string', example: 'Internal Server Error' },
          timestamp: { type: 'string', format: 'date-time' },
          userMessage: {
            type: 'string',
            example: 'An unexpected error occurred',
          },
          actionRequired: {
            type: 'string',
            example: 'Try again later or contact support',
          },
          retryable: { type: 'boolean', example: true },
        },
      },
    }),
  );

  return applyDecorators(...decorators);
}

// Convenience decorators for common operations
export function CreateApiResponses(summary: string, description?: string) {
  return StandardApiResponses({
    summary,
    description,
    successMessage: 'Resource created successfully',
  });
}

export function ReadApiResponses(summary: string, description?: string) {
  return StandardApiResponses({
    summary,
    description,
    successMessage: 'Data retrieved successfully',
    includeConflict: false,
  });
}

export function UpdateApiResponses(summary: string, description?: string) {
  return StandardApiResponses({
    summary,
    description,
    successMessage: 'Resource updated successfully',
  });
}

export function DeleteApiResponses(summary: string, description?: string) {
  return StandardApiResponses({
    summary,
    description,
    successMessage: 'Resource deleted successfully',
  });
}
