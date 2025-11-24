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
  code: ErrorCode;
  timestamp: string;
  path?: string;
  method?: string;
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
      } as EnhancedErrorResponse,
      HttpStatus.FORBIDDEN,
    );
  }
}

export class BusinessLogicException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message,
        error: 'Bad Request',
        code: ErrorCode.BUSINESS_LOGIC_ERROR,
        timestamp: new Date().toISOString(),
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
      } as EnhancedErrorResponse,
      HttpStatus.FORBIDDEN,
    );
  }
}

export class CenterAccessInactiveException extends HttpException {
  constructor(message: string = 'Center access is inactive') {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        message,
        error: 'Center Access Inactive',
        code: ErrorCode.CENTER_ACCESS_INACTIVE,
        timestamp: new Date().toISOString(),
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
