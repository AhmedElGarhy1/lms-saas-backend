import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../enums/error-codes.enum';
import { I18nPath } from '@/generated/i18n.generated';
import { TranslationService } from '@/shared/services/translation.service';

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

/**
 * Interface for exceptions that support translation keys
 * This allows type-safe access to translationKey and translationArgs
 */
export interface TranslatableException {
  translationKey: I18nPath;
  translationArgs?: Record<string, any>;
}

export class ResourceNotFoundException extends HttpException {
  translationKey: I18nPath;
  translationArgs?: Record<string, any>;

  constructor(
    translationKey: I18nPath,
    translationArgs?: Record<string, any>,
  ) {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message: TranslationService.translateForLogging(translationKey, translationArgs),
        error: 'Not Found',
        code: ErrorCode.RESOURCE_NOT_FOUND,
        timestamp: new Date().toISOString(),
      } as EnhancedErrorResponse,
      HttpStatus.NOT_FOUND,
    );
    this.translationKey = translationKey;
    this.translationArgs = translationArgs;
  }
}

export class ResourceAlreadyExistsException extends HttpException {
  translationKey: I18nPath;
  translationArgs?: Record<string, any>;

  constructor(
    translationKey: I18nPath,
    translationArgs?: Record<string, any>,
  ) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message: TranslationService.translateForLogging(translationKey, translationArgs),
        error: 'Conflict',
        code: ErrorCode.RESOURCE_ALREADY_EXISTS,
        timestamp: new Date().toISOString(),
      } as EnhancedErrorResponse,
      HttpStatus.CONFLICT,
    );
    this.translationKey = translationKey;
    this.translationArgs = translationArgs;
  }
}

export class InsufficientPermissionsException extends HttpException {
  translationKey: I18nPath;
  translationArgs?: Record<string, any>;

  constructor(
    translationKey: I18nPath,
    translationArgs?: Record<string, any>,
  ) {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        message: TranslationService.translateForLogging(translationKey, translationArgs),
        error: 'Forbidden',
        code: ErrorCode.INSUFFICIENT_PERMISSIONS,
        timestamp: new Date().toISOString(),
      } as EnhancedErrorResponse,
      HttpStatus.FORBIDDEN,
    );
    this.translationKey = translationKey;
    this.translationArgs = translationArgs;
  }
}

export class ValidationFailedException extends HttpException {
  translationKey: I18nPath;
  translationArgs?: Record<string, any>;

  constructor(
    translationKey: I18nPath,
    details?: ErrorDetail[],
    translationArgs?: Record<string, any>,
  ) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: TranslationService.translateForLogging(translationKey, translationArgs),
        error: 'Bad Request',
        code: ErrorCode.VALIDATION_FAILED,
        timestamp: new Date().toISOString(),
        details,
      } as EnhancedErrorResponse,
      HttpStatus.BAD_REQUEST,
    );
    this.translationKey = translationKey;
    this.translationArgs = translationArgs;
  }
}

export class ResourceInUseException extends HttpException {
  translationKey: I18nPath;
  translationArgs?: Record<string, any>;

  constructor(
    translationKey: I18nPath,
    translationArgs?: Record<string, any>,
  ) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message: TranslationService.translateForLogging(translationKey, translationArgs),
        error: 'Conflict',
        code: ErrorCode.RESOURCE_IN_USE,
        timestamp: new Date().toISOString(),
      } as EnhancedErrorResponse,
      HttpStatus.CONFLICT,
    );
    this.translationKey = translationKey;
    this.translationArgs = translationArgs;
  }
}

export class InvalidOperationException extends HttpException {
  translationKey: I18nPath;
  translationArgs?: Record<string, any>;

  constructor(
    translationKey: I18nPath,
    translationArgs?: Record<string, any>,
  ) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: TranslationService.translateForLogging(translationKey, translationArgs),
        error: 'Bad Request',
        code: ErrorCode.INVALID_OPERATION,
        timestamp: new Date().toISOString(),
      } as EnhancedErrorResponse,
      HttpStatus.BAD_REQUEST,
    );
    this.translationKey = translationKey;
    this.translationArgs = translationArgs;
  }
}

export class PasswordTooWeakException extends HttpException {
  translationKey: I18nPath;
  translationArgs?: Record<string, any>;

  constructor(
    translationKey: I18nPath,
    requirements?: string[],
    translationArgs?: Record<string, any>,
  ) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: TranslationService.translateForLogging(translationKey, translationArgs),
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
    this.translationKey = translationKey;
    this.translationArgs = translationArgs;
  }
}

export class UserAlreadyExistsException extends HttpException {
  translationKey: I18nPath;
  translationArgs?: Record<string, any>;

  constructor(
    fieldValue: string,
    translationKey: I18nPath,
    translationArgs?: Record<string, any>,
  ) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message: TranslationService.translateForLogging(translationKey, translationArgs),
        error: 'Conflict',
        code: ErrorCode.USER_ALREADY_EXISTS,
        timestamp: new Date().toISOString(),
        details: [
          {
            field: 'phone',
            value: fieldValue,
            message: 'Value already exists',
            code: 'USER_ALREADY_EXISTS',
          },
        ],
      } as EnhancedErrorResponse,
      HttpStatus.CONFLICT,
    );
    this.translationKey = translationKey;
    this.translationArgs = translationArgs;
  }
}

export class AuthenticationFailedException extends HttpException {
  translationKey: I18nPath;
  translationArgs?: Record<string, any>;

  constructor(
    translationKey: I18nPath,
    translationArgs?: Record<string, any>,
  ) {
    super(
      {
        statusCode: HttpStatus.UNAUTHORIZED,
        message: TranslationService.translateForLogging(translationKey, translationArgs),
        error: 'Unauthorized',
        code: ErrorCode.AUTHENTICATION_FAILED,
        timestamp: new Date().toISOString(),
      } as EnhancedErrorResponse,
      HttpStatus.UNAUTHORIZED,
    );
    this.translationKey = translationKey;
    this.translationArgs = translationArgs;
  }
}

export class AccessDeniedException extends HttpException {
  translationKey: I18nPath;
  translationArgs?: Record<string, any>;

  constructor(
    translationKey: I18nPath,
    translationArgs?: Record<string, any>,
  ) {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        message: TranslationService.translateForLogging(translationKey, translationArgs),
        error: 'Forbidden',
        code: ErrorCode.ACCESS_DENIED,
        timestamp: new Date().toISOString(),
      } as EnhancedErrorResponse,
      HttpStatus.FORBIDDEN,
    );
    this.translationKey = translationKey;
    this.translationArgs = translationArgs;
  }
}

export class BusinessLogicException extends HttpException {
  translationKey: I18nPath;
  translationArgs?: Record<string, any>;

  constructor(
    translationKey: I18nPath,
    translationArgs?: Record<string, any>,
  ) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: TranslationService.translateForLogging(translationKey, translationArgs),
        error: 'Bad Request',
        code: ErrorCode.BUSINESS_LOGIC_ERROR,
        timestamp: new Date().toISOString(),
      } as EnhancedErrorResponse,
      HttpStatus.BAD_REQUEST,
    );
    this.translationKey = translationKey;
    this.translationArgs = translationArgs;
  }
}

export class PhoneNotVerifiedException extends HttpException {
  translationKey: I18nPath;
  translationArgs?: Record<string, any>;

  constructor(
    translationKey: I18nPath,
    translationArgs?: Record<string, any>,
  ) {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        message: TranslationService.translateForLogging(translationKey, translationArgs),
        code: ErrorCode.PHONE_NOT_VERIFIED,
        timestamp: new Date().toISOString(),
      } as EnhancedErrorResponse,
      HttpStatus.FORBIDDEN,
    );
    this.translationKey = translationKey;
    this.translationArgs = translationArgs;
  }
}

export class OtpRequiredException extends HttpException {
  translationKey: I18nPath;
  translationArgs?: Record<string, any>;

  constructor(
    translationKey: I18nPath,
    translationArgs?: Record<string, any>,
  ) {
    super(
      {
        statusCode: HttpStatus.UNAUTHORIZED,
        message: TranslationService.translateForLogging(translationKey, translationArgs),
        error: 'Unauthorized',
        code: ErrorCode.OTP_REQUIRED,
        timestamp: new Date().toISOString(),
      } as EnhancedErrorResponse,
      HttpStatus.UNAUTHORIZED,
    );
    this.translationKey = translationKey;
    this.translationArgs = translationArgs;
  }
}

export class ServiceUnavailableException extends HttpException {
  translationKey: I18nPath;
  translationArgs?: Record<string, any>;

  constructor(
    translationKey: I18nPath,
    translationArgs?: Record<string, any>,
  ) {
    super(
      {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: TranslationService.translateForLogging(translationKey, translationArgs),
        error: 'Service Unavailable',
        code: ErrorCode.SERVICE_UNAVAILABLE,
        timestamp: new Date().toISOString(),
      } as EnhancedErrorResponse,
      HttpStatus.SERVICE_UNAVAILABLE,
    );
    this.translationKey = translationKey;
    this.translationArgs = translationArgs;
  }
}

export class CenterSelectionRequiredException extends HttpException {
  translationKey: I18nPath;
  translationArgs?: Record<string, any>;

  constructor(
    translationKey: I18nPath,
    translationArgs?: Record<string, any>,
  ) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: TranslationService.translateForLogging(translationKey, translationArgs),
        error: 'Center Selection Required',
        code: ErrorCode.CENTER_SELECTION_REQUIRED,
        timestamp: new Date().toISOString(),
      } as EnhancedErrorResponse,
      HttpStatus.BAD_REQUEST,
    );
    this.translationKey = translationKey;
    this.translationArgs = translationArgs;
  }
}

export class AdminScopeAccessDeniedException extends HttpException {
  translationKey: I18nPath;
  translationArgs?: Record<string, any>;

  constructor(
    translationKey: I18nPath,
    translationArgs?: Record<string, any>,
  ) {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        message: TranslationService.translateForLogging(translationKey, translationArgs),
        error: 'Admin Scope Access Denied',
        code: ErrorCode.ADMIN_SCOPE_ACCESS_DENIED,
        timestamp: new Date().toISOString(),
      } as EnhancedErrorResponse,
      HttpStatus.FORBIDDEN,
    );
    this.translationKey = translationKey;
    this.translationArgs = translationArgs;
  }
}

export class CenterAccessDeniedException extends HttpException {
  translationKey: I18nPath;
  translationArgs?: Record<string, any>;

  constructor(
    translationKey: I18nPath,
    translationArgs?: Record<string, any>,
  ) {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        message: TranslationService.translateForLogging(translationKey, translationArgs),
        error: 'Center Access Denied',
        code: ErrorCode.CENTER_ACCESS_DENIED,
        timestamp: new Date().toISOString(),
      } as EnhancedErrorResponse,
      HttpStatus.FORBIDDEN,
    );
    this.translationKey = translationKey;
    this.translationArgs = translationArgs;
  }
}

export class CenterAccessInactiveException extends HttpException {
  translationKey: I18nPath;
  translationArgs?: Record<string, any>;

  constructor(
    translationKey: I18nPath,
    translationArgs?: Record<string, any>,
  ) {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        message: TranslationService.translateForLogging(translationKey, translationArgs),
        error: 'Center Access Inactive',
        code: ErrorCode.CENTER_ACCESS_INACTIVE,
        timestamp: new Date().toISOString(),
      } as EnhancedErrorResponse,
      HttpStatus.FORBIDDEN,
    );
    this.translationKey = translationKey;
    this.translationArgs = translationArgs;
  }
}

export class InactiveCenterException extends HttpException {
  translationKey: I18nPath;
  translationArgs?: Record<string, any>;

  constructor(
    translationKey: I18nPath,
    translationArgs?: Record<string, any>,
  ) {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        message: TranslationService.translateForLogging(translationKey, translationArgs),
        error: 'Inactive Center',
        code: ErrorCode.CENTER_INACTIVE,
        timestamp: new Date().toISOString(),
      } as EnhancedErrorResponse,
      HttpStatus.FORBIDDEN,
    );
    this.translationKey = translationKey;
    this.translationArgs = translationArgs;
  }
}

export class InactiveProfileException extends HttpException {
  translationKey: I18nPath;
  translationArgs?: Record<string, any>;

  constructor(
    translationKey: I18nPath,
    translationArgs?: Record<string, any>,
  ) {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        message: TranslationService.translateForLogging(translationKey, translationArgs),
        error: 'Inactive Profile',
        code: ErrorCode.PROFILE_INACTIVE,
        timestamp: new Date().toISOString(),
      } as EnhancedErrorResponse,
      HttpStatus.FORBIDDEN,
    );
    this.translationKey = translationKey;
    this.translationArgs = translationArgs;
  }
}

export class SeederException extends HttpException {
  translationKey: I18nPath;
  translationArgs?: Record<string, any>;

  constructor(
    translationKey: I18nPath,
    translationArgs?: Record<string, any>,
  ) {
    super(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: TranslationService.translateForLogging(translationKey, translationArgs),
        error: 'Seeder Error',
        code: ErrorCode.SEEDER_ERROR,
        timestamp: new Date().toISOString(),
      } as EnhancedErrorResponse,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    this.translationKey = translationKey;
    this.translationArgs = translationArgs;
  }
}

export class ExportFormatNotSupportedException extends HttpException {
  translationKey: I18nPath;
  translationArgs?: Record<string, any>;

  constructor(
    format: string,
    translationKey: I18nPath,
    translationArgs?: Record<string, any>,
  ) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: TranslationService.translateForLogging(translationKey, translationArgs),
        error: 'Bad Request',
        code: ErrorCode.EXPORT_FORMAT_NOT_SUPPORTED,
        timestamp: new Date().toISOString(),
      } as EnhancedErrorResponse,
      HttpStatus.BAD_REQUEST,
    );
    this.translationKey = translationKey;
    this.translationArgs = translationArgs;
  }
}

export class ExportDataUnavailableException extends HttpException {
  translationKey: I18nPath;
  translationArgs?: Record<string, any>;

  constructor(
    translationKey: I18nPath,
    translationArgs?: Record<string, any>,
  ) {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message: TranslationService.translateForLogging(translationKey, translationArgs),
        error: 'Not Found',
        code: ErrorCode.EXPORT_DATA_UNAVAILABLE,
        timestamp: new Date().toISOString(),
      } as EnhancedErrorResponse,
      HttpStatus.NOT_FOUND,
    );
    this.translationKey = translationKey;
    this.translationArgs = translationArgs;
  }
}

export class ExportFailedException extends HttpException {
  translationKey: I18nPath;
  translationArgs?: Record<string, any>;

  constructor(
    translationKey: I18nPath,
    translationArgs?: Record<string, any>,
  ) {
    super(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: TranslationService.translateForLogging(translationKey, translationArgs),
        error: 'Export Failed',
        code: ErrorCode.EXPORT_FAILED,
        timestamp: new Date().toISOString(),
      } as EnhancedErrorResponse,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    this.translationKey = translationKey;
    this.translationArgs = translationArgs;
  }
}

export class MissingRequiredHeaderException extends HttpException {
  translationKey: I18nPath;
  translationArgs?: Record<string, any>;

  constructor(
    header: string,
    translationKey: I18nPath,
    translationArgs?: Record<string, any>,
  ) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: TranslationService.translateForLogging(translationKey, translationArgs),
        error: 'Bad Request',
        code: ErrorCode.MISSING_REQUIRED_HEADER,
        timestamp: new Date().toISOString(),
      } as EnhancedErrorResponse,
      HttpStatus.BAD_REQUEST,
    );
    this.translationKey = translationKey;
    this.translationArgs = translationArgs;
  }
}

export class InvalidContentTypeException extends HttpException {
  translationKey: I18nPath;
  translationArgs?: Record<string, any>;

  constructor(
    translationKey: I18nPath,
    translationArgs?: Record<string, any>,
  ) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: TranslationService.translateForLogging(translationKey, translationArgs),
        error: 'Bad Request',
        code: ErrorCode.INVALID_CONTENT_TYPE,
        timestamp: new Date().toISOString(),
      } as EnhancedErrorResponse,
      HttpStatus.BAD_REQUEST,
    );
    this.translationKey = translationKey;
    this.translationArgs = translationArgs;
  }
}

export class RequestBodyTooLargeException extends HttpException {
  translationKey: I18nPath;
  translationArgs?: Record<string, any>;

  constructor(
    translationKey: I18nPath,
    translationArgs?: Record<string, any>,
  ) {
    super(
      {
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        message: TranslationService.translateForLogging(translationKey, translationArgs),
        error: 'Payload Too Large',
        code: ErrorCode.REQUEST_BODY_TOO_LARGE,
        timestamp: new Date().toISOString(),
      } as EnhancedErrorResponse,
      HttpStatus.PAYLOAD_TOO_LARGE,
    );
    this.translationKey = translationKey;
    this.translationArgs = translationArgs;
  }
}

export class UnsupportedContentTypeException extends HttpException {
  translationKey: I18nPath;
  translationArgs?: Record<string, any>;

  constructor(
    translationKey: I18nPath,
    translationArgs?: Record<string, any>,
  ) {
    super(
      {
        statusCode: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
        message: TranslationService.translateForLogging(translationKey, translationArgs),
        error: 'Unsupported Media Type',
        code: ErrorCode.UNSUPPORTED_CONTENT_TYPE,
        timestamp: new Date().toISOString(),
      } as EnhancedErrorResponse,
      HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    );
    this.translationKey = translationKey;
    this.translationArgs = translationArgs;
  }
}

export class SystemNotReadyException extends HttpException {
  translationKey: I18nPath;
  translationArgs?: Record<string, any>;

  constructor(
    translationKey: I18nPath,
    translationArgs?: Record<string, any>,
  ) {
    super(
      {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: TranslationService.translateForLogging(translationKey, translationArgs),
        error: 'Service Unavailable',
        code: ErrorCode.SYSTEM_NOT_READY,
        timestamp: new Date().toISOString(),
      } as EnhancedErrorResponse,
      HttpStatus.SERVICE_UNAVAILABLE,
    );
    this.translationKey = translationKey;
    this.translationArgs = translationArgs;
  }
}

export class BranchAccessDeniedException extends HttpException {
  translationKey: I18nPath;
  translationArgs?: Record<string, any>;

  constructor(
    translationKey: I18nPath,
    translationArgs?: Record<string, any>,
  ) {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        message: TranslationService.translateForLogging(translationKey, translationArgs),
        error: 'Branch Access Denied',
        code: ErrorCode.BRANCH_ACCESS_DENIED,
        timestamp: new Date().toISOString(),
      } as EnhancedErrorResponse,
      HttpStatus.FORBIDDEN,
    );
    this.translationKey = translationKey;
    this.translationArgs = translationArgs;
  }
}

export class ProfileSelectionRequiredException extends HttpException {
  translationKey: I18nPath;
  translationArgs?: Record<string, any>;

  constructor(
    translationKey: I18nPath,
    translationArgs?: Record<string, any>,
  ) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: TranslationService.translateForLogging(translationKey, translationArgs),
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
    this.translationKey = translationKey;
    this.translationArgs = translationArgs;
  }
}

/**
 * Internal exception for invalid operations (uses plain string, not translation key)
 * Used for background/internal errors that don't reach users
 */
export class InternalInvalidOperationException extends HttpException {
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

/**
 * Internal exception for service unavailable (uses plain string, not translation key)
 * Used for background/internal errors that don't reach users
 */
export class InternalServiceUnavailableException extends HttpException {
  constructor(message: string) {
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

/**
 * Internal exception for business logic errors (uses plain string, not translation key)
 * Used for background/internal errors that don't reach users
 */
export class InternalBusinessLogicException extends HttpException {
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
