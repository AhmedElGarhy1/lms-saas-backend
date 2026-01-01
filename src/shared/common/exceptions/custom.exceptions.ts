import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../enums/error-codes.enum';

export interface ErrorDetail {
  field: string;
  value: unknown;
  message: string;
}

export interface EnhancedErrorResponse {
  statusCode: number;
  message: string;
  code: ErrorCode;
  timestamp: string;
  error?: string; // Optional HTTP error message
  path?: string;
  method?: string;
  details?: ErrorDetail[];
  debug?: any;
}

/**
 * Base class for all exceptions
 * Reduces code duplication by providing common constructor logic
 */
abstract class BaseException extends HttpException {
  constructor(
    statusCode: HttpStatus,
    errorCode: ErrorCode,
    errorMessage: string,
    message: string,
    details?: ErrorDetail[],
  ) {
    const response: EnhancedErrorResponse = {
      statusCode,
      message,
      error: errorMessage,
      code: errorCode,
      timestamp: new Date().toISOString(),
      details,
    };
    super(response, statusCode);
  }
}

export class ResourceNotFoundException extends BaseException {
  constructor(message: string = 'Resource not found', details?: ErrorDetail[]) {
    super(
      HttpStatus.NOT_FOUND,
      ErrorCode.RESOURCE_NOT_FOUND,
      'Not Found',
      message,
      details,
    );
  }
}

export class ResourceAlreadyExistsException extends BaseException {
  constructor(
    message: string = 'Resource already exists',
    details?: ErrorDetail[],
  ) {
    super(
      HttpStatus.CONFLICT,
      ErrorCode.RESOURCE_ALREADY_EXISTS,
      'Conflict',
      message,
      details,
    );
  }
}

export class InsufficientPermissionsException extends BaseException {
  constructor(
    message: string = 'Insufficient permissions',
    details?: ErrorDetail[],
  ) {
    super(
      HttpStatus.FORBIDDEN,
      ErrorCode.INSUFFICIENT_PERMISSIONS,
      'Forbidden',
      message,
      details,
    );
  }
}

export class ValidationFailedException extends BaseException {
  constructor(message: string = 'Validation failed', details?: ErrorDetail[]) {
    super(
      HttpStatus.BAD_REQUEST,
      ErrorCode.VALIDATION_FAILED,
      'Bad Request',
      message,
      details,
    );
  }
}

export class ResourceInUseException extends BaseException {
  constructor(message: string = 'Resource is in use', details?: ErrorDetail[]) {
    super(
      HttpStatus.CONFLICT,
      ErrorCode.RESOURCE_IN_USE,
      'Conflict',
      message,
      details,
    );
  }
}

export class InvalidOperationException extends BaseException {
  constructor(message: string = 'Invalid operation', details?: ErrorDetail[]) {
    super(
      HttpStatus.BAD_REQUEST,
      ErrorCode.INVALID_OPERATION,
      'Bad Request',
      message,
      details,
    );
  }
}

export class PasswordTooWeakException extends BaseException {
  constructor(
    message: string = 'Password is too weak',
    requirements?: string[],
  ) {
    const details: ErrorDetail[] | undefined = requirements?.map((req) => ({
      field: 'password',
      value: '',
      message: req,
    }));
    super(
      HttpStatus.BAD_REQUEST,
      ErrorCode.PASSWORD_TOO_WEAK,
      'Bad Request',
      message,
      details,
    );
  }
}

export class UserAlreadyExistsException extends BaseException {
  constructor(fieldValue: string, message: string = 'User already exists') {
    const details: ErrorDetail[] = [
      {
        field: 'phone',
        value: fieldValue,
        message: 'Phone number already exists',
      },
    ];
    super(
      HttpStatus.CONFLICT,
      ErrorCode.USER_ALREADY_EXISTS,
      'Conflict',
      message,
      details,
    );
  }
}

export class AuthenticationFailedException extends BaseException {
  constructor(
    message: string = 'Authentication failed',
    details?: ErrorDetail[],
  ) {
    super(
      HttpStatus.UNAUTHORIZED,
      ErrorCode.AUTHENTICATION_FAILED,
      'Unauthorized',
      message,
      details,
    );
  }
}

export class AccessDeniedException extends BaseException {
  constructor(message: string = 'Access denied', details?: ErrorDetail[]) {
    super(
      HttpStatus.FORBIDDEN,
      ErrorCode.ACCESS_DENIED,
      'Forbidden',
      message,
      details,
    );
  }
}

export class BusinessLogicException extends BaseException {
  constructor(
    message: string = 'Business logic error',
    details?: ErrorDetail[],
  ) {
    super(
      HttpStatus.BAD_REQUEST,
      ErrorCode.BUSINESS_LOGIC_ERROR,
      'Bad Request',
      message,
      details,
    );
  }
}

export class InsufficientFundsException extends BaseException {
  constructor(message: string = 'Insufficient funds', details?: ErrorDetail[]) {
    super(
      HttpStatus.BAD_REQUEST,
      ErrorCode.INSUFFICIENT_FUNDS,
      'Insufficient Funds',
      message,
      details,
    );
  }
}

export class ScheduleConflictException extends BaseException {
  constructor(
    message: string = 'Schedule conflict detected',
    details?: ErrorDetail[],
  ) {
    super(
      HttpStatus.BAD_REQUEST,
      ErrorCode.SCHEDULE_CONFLICT_ERROR,
      'Bad Request',
      message,
      details,
    );
  }
}

export class PhoneNotVerifiedException extends BaseException {
  constructor(message: string = 'Phone not verified', details?: ErrorDetail[]) {
    super(
      HttpStatus.FORBIDDEN,
      ErrorCode.PHONE_NOT_VERIFIED,
      'Forbidden',
      message,
      details,
    );
  }
}

export class OtpRequiredException extends BaseException {
  constructor(message: string = 'OTP required', details?: ErrorDetail[]) {
    super(
      HttpStatus.UNAUTHORIZED,
      ErrorCode.OTP_REQUIRED,
      'Unauthorized',
      message,
      details,
    );
  }
}

export class ServiceUnavailableException extends BaseException {
  constructor(
    message: string = 'Service unavailable',
    details?: ErrorDetail[],
  ) {
    super(
      HttpStatus.SERVICE_UNAVAILABLE,
      ErrorCode.SERVICE_UNAVAILABLE,
      'Service Unavailable',
      message,
      details,
    );
  }
}

export class CenterSelectionRequiredException extends BaseException {
  constructor(
    message: string = 'Center selection required',
    details?: ErrorDetail[],
  ) {
    super(
      HttpStatus.BAD_REQUEST,
      ErrorCode.CENTER_SELECTION_REQUIRED,
      'Center Selection Required',
      message,
      details,
    );
  }
}

export class AdminScopeAccessDeniedException extends BaseException {
  constructor(
    message: string = 'Admin scope access denied',
    details?: ErrorDetail[],
  ) {
    super(
      HttpStatus.FORBIDDEN,
      ErrorCode.ADMIN_SCOPE_ACCESS_DENIED,
      'Admin Scope Access Denied',
      message,
      details,
    );
  }
}

export class CenterAccessDeniedException extends BaseException {
  constructor(
    message: string = 'Center access denied',
    details?: ErrorDetail[],
  ) {
    super(
      HttpStatus.FORBIDDEN,
      ErrorCode.CENTER_ACCESS_DENIED,
      'Center Access Denied',
      message,
      details,
    );
  }
}

export class CenterAccessInactiveException extends BaseException {
  constructor(
    message: string = 'Center access inactive',
    details?: ErrorDetail[],
  ) {
    super(
      HttpStatus.FORBIDDEN,
      ErrorCode.CENTER_ACCESS_INACTIVE,
      'Center Access Inactive',
      message,
      details,
    );
  }
}

export class InactiveCenterException extends BaseException {
  constructor(message: string = 'Center is inactive', details?: ErrorDetail[]) {
    super(
      HttpStatus.FORBIDDEN,
      ErrorCode.CENTER_INACTIVE,
      'Inactive Center',
      message,
      details,
    );
  }
}

export class InactiveProfileException extends BaseException {
  constructor(
    message: string = 'Profile is inactive',
    details?: ErrorDetail[],
  ) {
    super(
      HttpStatus.FORBIDDEN,
      ErrorCode.PROFILE_INACTIVE,
      'Inactive Profile',
      message,
      details,
    );
  }
}

export class SeederException extends BaseException {
  constructor(
    message: string = 'Seeder error occurred',
    details?: ErrorDetail[],
  ) {
    super(
      HttpStatus.INTERNAL_SERVER_ERROR,
      ErrorCode.SEEDER_ERROR,
      'Seeder Error',
      message,
      details,
    );
  }
}

export class ExportFormatNotSupportedException extends BaseException {
  constructor(
    format: string,
    message: string = `Export format '${format}' is not supported`,
  ) {
    super(
      HttpStatus.BAD_REQUEST,
      ErrorCode.EXPORT_FORMAT_NOT_SUPPORTED,
      'Bad Request',
      message,
    );
  }
}

export class ExportDataUnavailableException extends BaseException {
  constructor(
    message: string = 'Export data is unavailable',
    details?: ErrorDetail[],
  ) {
    super(
      HttpStatus.NOT_FOUND,
      ErrorCode.EXPORT_DATA_UNAVAILABLE,
      'Not Found',
      message,
      details,
    );
  }
}

export class ExportFailedException extends BaseException {
  constructor(message: string = 'Export failed', details?: ErrorDetail[]) {
    super(
      HttpStatus.INTERNAL_SERVER_ERROR,
      ErrorCode.EXPORT_FAILED,
      'Export Failed',
      message,
      details,
    );
  }
}

export class MissingRequiredHeaderException extends BaseException {
  constructor(
    header: string,
    message: string = `Required header '${header}' is missing`,
  ) {
    super(
      HttpStatus.BAD_REQUEST,
      ErrorCode.MISSING_REQUIRED_HEADER,
      'Bad Request',
      message,
    );
  }
}

export class InvalidContentTypeException extends BaseException {
  constructor(
    message: string = 'Invalid content type',
    details?: ErrorDetail[],
  ) {
    super(
      HttpStatus.BAD_REQUEST,
      ErrorCode.INVALID_CONTENT_TYPE,
      'Bad Request',
      message,
      details,
    );
  }
}

export class RequestBodyTooLargeException extends BaseException {
  constructor(
    message: string = 'Request body is too large',
    details?: ErrorDetail[],
  ) {
    super(
      HttpStatus.PAYLOAD_TOO_LARGE,
      ErrorCode.REQUEST_BODY_TOO_LARGE,
      'Payload Too Large',
      message,
      details,
    );
  }
}

export class UnsupportedContentTypeException extends BaseException {
  constructor(
    message: string = 'Unsupported content type',
    details?: ErrorDetail[],
  ) {
    super(
      HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      ErrorCode.UNSUPPORTED_CONTENT_TYPE,
      'Unsupported Media Type',
      message,
      details,
    );
  }
}

export class SystemNotReadyException extends BaseException {
  constructor(
    message: string = 'System is not ready',
    details?: ErrorDetail[],
  ) {
    super(
      HttpStatus.SERVICE_UNAVAILABLE,
      ErrorCode.SYSTEM_NOT_READY,
      'Service Unavailable',
      message,
      details,
    );
  }
}

export class BranchAccessDeniedException extends BaseException {
  constructor(
    message: string = 'Branch access denied',
    details?: ErrorDetail[],
  ) {
    super(
      HttpStatus.FORBIDDEN,
      ErrorCode.BRANCH_ACCESS_DENIED,
      'Branch Access Denied',
      message,
      details,
    );
  }
}

export class ProfileSelectionRequiredException extends BaseException {
  constructor(message: string = 'Profile selection is required') {
    const details: ErrorDetail[] = [
      {
        field: 'profileId',
        value: null,
        message: 'Profile selection is required',
      },
    ];
    super(
      HttpStatus.BAD_REQUEST,
      ErrorCode.PROFILE_SELECTION_REQUIRED,
      'Profile Selection Required',
      message,
      details,
    );
  }
}

/**
 * Internal exception for invalid operations
 * Used for background/internal errors that don't reach users
 */
export class InternalInvalidOperationException extends HttpException {
  constructor(message: string) {
    const response: EnhancedErrorResponse = {
      statusCode: HttpStatus.BAD_REQUEST,
      message,
      error: 'Bad Request',
      code: ErrorCode.INVALID_OPERATION,
      timestamp: new Date().toISOString(),
    };
    super(response, HttpStatus.BAD_REQUEST);
  }
}

/**
 * Internal exception for service unavailable
 * Used for background/internal errors that don't reach users
 */
export class InternalServiceUnavailableException extends HttpException {
  constructor(message: string) {
    const response: EnhancedErrorResponse = {
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message,
      error: 'Service Unavailable',
      code: ErrorCode.SERVICE_UNAVAILABLE,
      timestamp: new Date().toISOString(),
    };
    super(response, HttpStatus.SERVICE_UNAVAILABLE);
  }
}

/**
 * Internal exception for business logic errors
 * Used for background/internal errors that don't reach users
 */
export class InternalBusinessLogicException extends HttpException {
  constructor(message: string) {
    const response: EnhancedErrorResponse = {
      statusCode: HttpStatus.BAD_REQUEST,
      message,
      error: 'Bad Request',
      code: ErrorCode.BUSINESS_LOGIC_ERROR,
      timestamp: new Date().toISOString(),
    };
    super(response, HttpStatus.BAD_REQUEST);
  }
}
