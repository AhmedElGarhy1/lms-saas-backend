import { HttpException, HttpStatus } from '@nestjs/common';

export interface ErrorDetail {
  field: string;
  value: unknown;
  message: string;
  code: string;
  suggestion?: string;
}

export interface EnhancedErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path?: string;
  method?: string;
  userMessage?: string;
  actionRequired?: string;
  retryable?: boolean;
  details?: ErrorDetail[];
}

export class ResourceNotFoundException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message,
        error: 'Not Found',
        timestamp: new Date().toISOString(),
        userMessage: 'The requested resource was not found.',
        actionRequired: 'Please check the resource ID and try again.',
        retryable: false,
      } as EnhancedErrorResponse,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class ResourceAlreadyExistsException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message,
        error: 'Conflict',
        timestamp: new Date().toISOString(),
        userMessage: 'A resource with this information already exists.',
        actionRequired:
          'Please use different information or update the existing resource.',
        retryable: false,
      } as EnhancedErrorResponse,
      HttpStatus.CONFLICT,
    );
  }
}

export class InsufficientPermissionsException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        message,
        error: 'Forbidden',
        timestamp: new Date().toISOString(),
        userMessage: 'You do not have permission to perform this action.',
        actionRequired: 'Please contact an administrator for access.',
        retryable: false,
      } as EnhancedErrorResponse,
      HttpStatus.FORBIDDEN,
    );
  }
}

export class ValidationFailedException extends HttpException {
  constructor(message: string, details?: ErrorDetail[]) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message,
        error: 'Bad Request',
        timestamp: new Date().toISOString(),
        userMessage: 'Please check your input and try again.',
        actionRequired: 'Fix the highlighted errors below.',
        retryable: true,
        details,
      } as EnhancedErrorResponse,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class ResourceInUseException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message,
        error: 'Conflict',
        timestamp: new Date().toISOString(),
        userMessage:
          'This resource is currently in use and cannot be modified.',
        actionRequired: 'Please try again later or contact support.',
        retryable: true,
      } as EnhancedErrorResponse,
      HttpStatus.CONFLICT,
    );
  }
}

export class InvalidOperationException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message,
        error: 'Bad Request',
        timestamp: new Date().toISOString(),
        userMessage: 'This operation is not allowed.',
        actionRequired: 'Please check the operation parameters and try again.',
        retryable: false,
      } as EnhancedErrorResponse,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class PasswordTooWeakException extends HttpException {
  constructor(requirements?: string[]) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Password does not meet security requirements',
        error: 'Bad Request',
        timestamp: new Date().toISOString(),
        userMessage: 'Your password does not meet the security requirements',
        actionRequired: `Please ensure your password includes: ${requirements?.join(', ')}`,
        retryable: true,
        details: requirements?.map((req) => ({
          field: 'password',
          value: '',
          message: req,
          code: 'PASSWORD_REQUIREMENT',
        })),
      } as EnhancedErrorResponse,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class UserAlreadyExistsException extends HttpException {
  constructor(email: string) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message: `User with email '${email}' already exists`,
        error: 'Conflict',
        timestamp: new Date().toISOString(),
        userMessage: 'A user with this email address already exists',
        actionRequired:
          'Please use a different email address or try logging in',
        retryable: false,
        details: [
          {
            field: 'email',
            value: email,
            message: 'Email already exists',
            code: 'USER_ALREADY_EXISTS',
          },
        ],
      } as EnhancedErrorResponse,
      HttpStatus.CONFLICT,
    );
  }
}
