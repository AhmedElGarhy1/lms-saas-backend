import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../enums/error-codes.enum';

export interface ErrorDetail {
  field: string;
  value: unknown;
  message: string;
  code: ErrorCode;
  suggestion?: string;
}

export interface EnhancedErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  code: ErrorCode;
  timestamp: string;
  path?: string;
  method?: string;
  userMessage?: string;
  actionRequired?: string;
  retryable?: boolean;
  details?: ErrorDetail[];
  debug?: any;
}

export class ResourceNotFoundException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message,
        error: 'Not Found',
        code: ErrorCode.RESOURCE_NOT_FOUND,
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
        code: ErrorCode.RESOURCE_ALREADY_EXISTS,
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
        code: ErrorCode.INSUFFICIENT_PERMISSIONS,
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
        code: ErrorCode.VALIDATION_FAILED,
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
        code: ErrorCode.RESOURCE_IN_USE,
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
        code: ErrorCode.INVALID_OPERATION,
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
        code: ErrorCode.PASSWORD_TOO_WEAK,
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
        code: ErrorCode.USER_ALREADY_EXISTS,
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

export class AuthenticationFailedException extends HttpException {
  constructor(message: string = 'Authentication failed') {
    super(
      {
        statusCode: HttpStatus.UNAUTHORIZED,
        message,
        error: 'Unauthorized',
        code: ErrorCode.AUTHENTICATION_FAILED,
        timestamp: new Date().toISOString(),
        userMessage: 'Invalid credentials provided',
        actionRequired: 'Please check your credentials and try again',
        retryable: true,
      } as EnhancedErrorResponse,
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class AccessDeniedException extends HttpException {
  constructor(message: string = 'Access denied') {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        message,
        error: 'Forbidden',
        code: ErrorCode.ACCESS_DENIED,
        timestamp: new Date().toISOString(),
        userMessage: 'You do not have permission to access this resource',
        actionRequired: 'Please contact an administrator for access',
        retryable: false,
      } as EnhancedErrorResponse,
      HttpStatus.FORBIDDEN,
    );
  }
}

export class BusinessLogicException extends HttpException {
  constructor(message: string, userMessage?: string, actionRequired?: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message,
        error: 'Bad Request',
        code: ErrorCode.BUSINESS_LOGIC_ERROR,
        timestamp: new Date().toISOString(),
        userMessage: userMessage || 'The operation could not be completed',
        actionRequired:
          actionRequired || 'Please check your input and try again',
        retryable: true,
      } as EnhancedErrorResponse,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class ServiceUnavailableException extends HttpException {
  constructor(message: string = 'Service temporarily unavailable') {
    super(
      {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message,
        error: 'Service Unavailable',
        code: ErrorCode.SERVICE_UNAVAILABLE,
        timestamp: new Date().toISOString(),
        userMessage: 'The service is temporarily unavailable',
        actionRequired: 'Please try again later',
        retryable: true,
      } as EnhancedErrorResponse,
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

export class CenterSelectionRequiredException extends HttpException {
  constructor(message: string = 'Center selection required') {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message,
        error: 'Center Selection Required',
        code: ErrorCode.CENTER_SELECTION_REQUIRED,
        timestamp: new Date().toISOString(),
        userMessage: 'Please select a center to continue',
        actionRequired: 'Select a center from the available options',
        retryable: false,
        details: [
          {
            field: 'centerId',
            value: null,
            message: 'Center ID is required for this operation',
            code: ErrorCode.CENTER_SELECTION_REQUIRED,
            suggestion:
              'Please select a center from the dropdown or contact your administrator',
          },
        ],
      } as EnhancedErrorResponse,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class AdminScopeAccessDeniedException extends HttpException {
  constructor(message: string = 'Admin scope access denied') {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        message,
        error: 'Admin Scope Access Denied',
        code: ErrorCode.ADMIN_SCOPE_ACCESS_DENIED,
        timestamp: new Date().toISOString(),
        userMessage: 'You do not have access to admin scope',
        actionRequired:
          'Please select a center to access center-specific resources',
        retryable: false,
      } as EnhancedErrorResponse,
      HttpStatus.FORBIDDEN,
    );
  }
}

export class CenterAccessDeniedException extends HttpException {
  constructor(message: string = 'Center access denied') {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        message,
        error: 'Center Access Denied',
        code: ErrorCode.CENTER_ACCESS_DENIED,
        timestamp: new Date().toISOString(),
        userMessage: 'You do not have access to this center',
        actionRequired:
          'Please contact your administrator to request center access',
        retryable: false,
      } as EnhancedErrorResponse,
      HttpStatus.FORBIDDEN,
    );
  }
}
