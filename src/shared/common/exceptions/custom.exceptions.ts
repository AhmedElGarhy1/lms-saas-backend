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

export class InactiveCenterException extends HttpException {
  constructor(message: string = 'Center is inactive') {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        message,
        error: 'Inactive Center',
        code: ErrorCode.CENTER_INACTIVE,
        timestamp: new Date().toISOString(),
        userMessage: 'This center is currently inactive and cannot be accessed',
        actionRequired:
          'Please contact your administrator to activate the center',
        retryable: false,
      } as EnhancedErrorResponse,
      HttpStatus.FORBIDDEN,
    );
  }
}

export class InactiveProfileException extends HttpException {
  constructor(message: string = 'Profile is inactive') {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        message,
        error: 'Inactive Profile',
        code: ErrorCode.PROFILE_INACTIVE,
        timestamp: new Date().toISOString(),
        userMessage:
          'This profile is currently inactive and cannot be accessed',
        actionRequired:
          'Please contact your administrator to activate the profile',
        retryable: false,
      } as EnhancedErrorResponse,
      HttpStatus.FORBIDDEN,
    );
  }
}

export class SeederException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message,
        error: 'Seeder Error',
        code: ErrorCode.SEEDER_ERROR,
        timestamp: new Date().toISOString(),
        userMessage: 'Database seeding failed',
        actionRequired: 'Please contact system administrator',
        retryable: true,
      } as EnhancedErrorResponse,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class ExportFormatNotSupportedException extends HttpException {
  constructor(format: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Unsupported export format: ${format}`,
        error: 'Bad Request',
        code: ErrorCode.EXPORT_FORMAT_NOT_SUPPORTED,
        timestamp: new Date().toISOString(),
        userMessage: 'The requested export format is not supported',
        actionRequired: 'Please use a supported format (csv, xlsx, json)',
        retryable: false,
      } as EnhancedErrorResponse,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class ExportDataUnavailableException extends HttpException {
  constructor(message: string = 'No data available for export') {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message,
        error: 'Not Found',
        code: ErrorCode.EXPORT_DATA_UNAVAILABLE,
        timestamp: new Date().toISOString(),
        userMessage: 'No data is available for export',
        actionRequired: 'Please ensure there is data to export',
        retryable: false,
      } as EnhancedErrorResponse,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class ExportFailedException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message,
        error: 'Export Failed',
        code: ErrorCode.EXPORT_FAILED,
        timestamp: new Date().toISOString(),
        userMessage: 'Export operation failed',
        actionRequired: 'Please try again or contact support',
        retryable: true,
      } as EnhancedErrorResponse,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class TwoFactorGenerationFailedException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message,
        error: 'Two Factor Generation Failed',
        code: ErrorCode.TWO_FACTOR_GENERATION_FAILED,
        timestamp: new Date().toISOString(),
        userMessage: 'Failed to generate two-factor authentication token',
        actionRequired: 'Please try again or contact support',
        retryable: true,
      } as EnhancedErrorResponse,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class QrCodeGenerationFailedException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message,
        error: 'QR Code Generation Failed',
        code: ErrorCode.QR_CODE_GENERATION_FAILED,
        timestamp: new Date().toISOString(),
        userMessage: 'Failed to generate QR code for two-factor authentication',
        actionRequired: 'Please try again or contact support',
        retryable: true,
      } as EnhancedErrorResponse,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class MissingRequiredHeaderException extends HttpException {
  constructor(header: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Missing required header: ${header}`,
        error: 'Bad Request',
        code: ErrorCode.MISSING_REQUIRED_HEADER,
        timestamp: new Date().toISOString(),
        userMessage: 'A required header is missing from the request',
        actionRequired: `Please include the ${header} header in your request`,
        retryable: false,
      } as EnhancedErrorResponse,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class InvalidContentTypeException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message,
        error: 'Bad Request',
        code: ErrorCode.INVALID_CONTENT_TYPE,
        timestamp: new Date().toISOString(),
        userMessage: 'Invalid content type in request',
        actionRequired: 'Please use the correct content type',
        retryable: false,
      } as EnhancedErrorResponse,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class RequestBodyTooLargeException extends HttpException {
  constructor(message: string = 'Request body too large') {
    super(
      {
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        message,
        error: 'Payload Too Large',
        code: ErrorCode.REQUEST_BODY_TOO_LARGE,
        timestamp: new Date().toISOString(),
        userMessage: 'The request body is too large',
        actionRequired: 'Please reduce the size of your request',
        retryable: false,
      } as EnhancedErrorResponse,
      HttpStatus.PAYLOAD_TOO_LARGE,
    );
  }
}

export class UnsupportedContentTypeException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
        message,
        error: 'Unsupported Media Type',
        code: ErrorCode.UNSUPPORTED_CONTENT_TYPE,
        timestamp: new Date().toISOString(),
        userMessage: 'The content type is not supported',
        actionRequired: 'Please use a supported content type',
        retryable: false,
      } as EnhancedErrorResponse,
      HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    );
  }
}

export class SystemNotReadyException extends HttpException {
  constructor(message: string = 'System is not ready') {
    super(
      {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message,
        error: 'Service Unavailable',
        code: ErrorCode.SYSTEM_NOT_READY,
        timestamp: new Date().toISOString(),
        userMessage: 'The system is not ready to handle requests',
        actionRequired: 'Please try again later',
        retryable: true,
      } as EnhancedErrorResponse,
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

export class BranchAccessDeniedException extends HttpException {
  constructor(message: string = 'Branch access denied') {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        message,
        error: 'Branch Access Denied',
        code: ErrorCode.BRANCH_ACCESS_DENIED,
        timestamp: new Date().toISOString(),
        userMessage: 'You do not have access to this branch',
        actionRequired:
          'Please contact your administrator to request branch access',
        retryable: false,
      } as EnhancedErrorResponse,
      HttpStatus.FORBIDDEN,
    );
  }
}

export class ProfileSelectionRequiredException extends HttpException {
  constructor(message: string = 'Profile selection required') {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message,
        error: 'Profile Selection Required',
        code: ErrorCode.PROFILE_SELECTION_REQUIRED,
        timestamp: new Date().toISOString(),
        userMessage: 'Please select a profile to continue',
        actionRequired: 'Select a profile from the available options',
        retryable: false,
        details: [
          {
            field: 'profileId',
            value: null,
            message: 'Profile ID is required for this operation',
            code: ErrorCode.PROFILE_SELECTION_REQUIRED,
            suggestion:
              'Please select a profile from the dropdown or contact your administrator',
          },
        ],
      } as EnhancedErrorResponse,
      HttpStatus.BAD_REQUEST,
    );
  }
}
