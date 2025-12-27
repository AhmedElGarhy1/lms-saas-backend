import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../enums/error-codes.enum';
import { I18nPath } from '@/generated/i18n.generated';
import { PathArgs, OptionalArgs } from '@/generated/i18n-type-map.generated';
import { TranslationMessage } from '@/generated/i18n-type-map.generated';

export interface ErrorDetail {
  field: string;
  value: unknown;
  message: TranslationMessage;
}

export interface EnhancedErrorResponse {
  statusCode: number;
  message: TranslationMessage;
  code: ErrorCode;
  timestamp: string;
  error?: string; // Optional HTTP error message
  path?: string;
  method?: string;
  details?: ErrorDetail[];
  debug?: any;
}

/**
 * Interface for exceptions that support translation keys
 * This allows type-safe access to translationKey and translationArgs
 * Uses OptionalArgs to make args required when the key needs them
 */
export interface TranslatableException<P extends I18nPath = I18nPath> {
  translationKey: P;
  translationArgs?: OptionalArgs<P>;
}

/**
 * Base class for all translatable exceptions
 * Reduces code duplication by providing common constructor logic
 *
 * Uses type-safe translation arguments that are required when the key needs them
 */
abstract class BaseTranslatableException<
  P extends I18nPath = I18nPath,
> extends HttpException {
  translationKey: P;
  translationArgs?: PathArgs<P>;

  constructor(
    statusCode: HttpStatus,
    errorCode: ErrorCode,
    errorMessage: string,
    translationKey: P,
    translationArgs?: OptionalArgs<P>,
    details?: ErrorDetail[],
  ) {
    const response: EnhancedErrorResponse = {
      statusCode,
      message: {
        key: translationKey,
        args: translationArgs,
      } as TranslationMessage<P> as TranslationMessage,
      error: errorMessage,
      code: errorCode,
      timestamp: new Date().toISOString(),
      details,
    };
    super(response, statusCode);
    this.translationKey = translationKey;
    this.translationArgs = translationArgs;
  }
}

export class ResourceNotFoundException<
  P extends I18nPath = I18nPath,
> extends BaseTranslatableException<P> {
  constructor(translationKey: P, translationArgs?: OptionalArgs<P>) {
    super(
      HttpStatus.NOT_FOUND,
      ErrorCode.RESOURCE_NOT_FOUND,
      'Not Found',
      translationKey,
      translationArgs,
    );
  }
}

export class ResourceAlreadyExistsException<
  P extends I18nPath = I18nPath,
> extends BaseTranslatableException<P> {
  constructor(translationKey: P, translationArgs?: OptionalArgs<P>) {
    super(
      HttpStatus.CONFLICT,
      ErrorCode.RESOURCE_ALREADY_EXISTS,
      'Conflict',
      translationKey,
      translationArgs,
    );
  }
}

export class InsufficientPermissionsException<
  P extends I18nPath = I18nPath,
> extends BaseTranslatableException<P> {
  constructor(translationKey: P, translationArgs?: OptionalArgs<P>) {
    super(
      HttpStatus.FORBIDDEN,
      ErrorCode.INSUFFICIENT_PERMISSIONS,
      'Forbidden',
      translationKey,
      translationArgs,
    );
  }
}

export class ValidationFailedException<
  P extends I18nPath = I18nPath,
> extends BaseTranslatableException<P> {
  constructor(
    translationKey: P,
    details?: ErrorDetail[],
    translationArgs?: OptionalArgs<P>,
  ) {
    super(
      HttpStatus.BAD_REQUEST,
      ErrorCode.VALIDATION_FAILED,
      'Bad Request',
      translationKey,
      translationArgs,
      details,
    );
  }
}

export class ResourceInUseException<
  P extends I18nPath = I18nPath,
> extends BaseTranslatableException<P> {
  constructor(translationKey: P, translationArgs?: OptionalArgs<P>) {
    super(
      HttpStatus.CONFLICT,
      ErrorCode.RESOURCE_IN_USE,
      'Conflict',
      translationKey,
      translationArgs,
    );
  }
}

export class InvalidOperationException<
  P extends I18nPath = I18nPath,
> extends BaseTranslatableException<P> {
  constructor(translationKey: P, translationArgs?: OptionalArgs<P>) {
    super(
      HttpStatus.BAD_REQUEST,
      ErrorCode.INVALID_OPERATION,
      'Bad Request',
      translationKey,
      translationArgs,
    );
  }
}

export class PasswordTooWeakException<
  P extends I18nPath = I18nPath,
> extends BaseTranslatableException<P> {
  constructor(
    translationKey: P,
    requirements?: string[],
    translationArgs?: OptionalArgs<P>,
  ) {
    const details: ErrorDetail[] | undefined = requirements?.map((req) => ({
      field: 'password',
      value: '',
      message: {
        key: 't.messages.errorWithMessage',
        args: { message: req },
      },
    }));
    super(
      HttpStatus.BAD_REQUEST,
      ErrorCode.PASSWORD_TOO_WEAK,
      'Bad Request',
      translationKey,
      translationArgs,
      details,
    );
  }
}

export class UserAlreadyExistsException<
  P extends I18nPath = I18nPath,
> extends BaseTranslatableException<P> {
  constructor(
    fieldValue: string,
    translationKey: P,
    translationArgs?: OptionalArgs<P>,
  ) {
    const details: ErrorDetail[] = [
      {
        field: 'phone',
        value: fieldValue,
        message: { key: 't.messages.duplicateField', args: { field: 'phone' } },
      },
    ];
    super(
      HttpStatus.CONFLICT,
      ErrorCode.USER_ALREADY_EXISTS,
      'Conflict',
      translationKey,
      translationArgs,
      details,
    );
  }
}

export class AuthenticationFailedException<
  P extends I18nPath = I18nPath,
> extends BaseTranslatableException<P> {
  constructor(translationKey: P, translationArgs?: OptionalArgs<P>) {
    super(
      HttpStatus.UNAUTHORIZED,
      ErrorCode.AUTHENTICATION_FAILED,
      'Unauthorized',
      translationKey,
      translationArgs,
    );
  }
}

export class AccessDeniedException<
  P extends I18nPath = I18nPath,
> extends BaseTranslatableException<P> {
  constructor(translationKey: P, translationArgs?: OptionalArgs<P>) {
    super(
      HttpStatus.FORBIDDEN,
      ErrorCode.ACCESS_DENIED,
      'Forbidden',
      translationKey,
      translationArgs,
    );
  }
}

export class BusinessLogicException<
  P extends I18nPath = I18nPath,
> extends BaseTranslatableException<P> {
  constructor(
    translationKey: P,
    translationArgs?: OptionalArgs<P>,
    details?: ErrorDetail[],
  ) {
    super(
      HttpStatus.BAD_REQUEST,
      ErrorCode.BUSINESS_LOGIC_ERROR,
      'Bad Request',
      translationKey,
      translationArgs,
      details,
    );
  }
}

export class InsufficientFundsException<
  P extends I18nPath = I18nPath,
> extends BaseTranslatableException<P> {
  constructor(translationKey: P, translationArgs?: OptionalArgs<P>) {
    super(
      HttpStatus.BAD_REQUEST,
      ErrorCode.INSUFFICIENT_FUNDS,
      'Insufficient Funds',
      translationKey,
      translationArgs,
    );
  }
}

export class ScheduleConflictException<
  P extends I18nPath = I18nPath,
> extends BaseTranslatableException<P> {
  constructor(
    translationKey: P,
    details?: ErrorDetail[],
    translationArgs?: OptionalArgs<P>,
  ) {
    super(
      HttpStatus.BAD_REQUEST,
      ErrorCode.SCHEDULE_CONFLICT_ERROR,
      'Bad Request',
      translationKey,
      translationArgs,
      details,
    );
  }
}

export class PhoneNotVerifiedException<
  P extends I18nPath = I18nPath,
> extends BaseTranslatableException<P> {
  constructor(translationKey: P, translationArgs?: OptionalArgs<P>) {
    super(
      HttpStatus.FORBIDDEN,
      ErrorCode.PHONE_NOT_VERIFIED,
      'Forbidden',
      translationKey,
      translationArgs,
    );
  }
}

export class OtpRequiredException<
  P extends I18nPath = I18nPath,
> extends BaseTranslatableException<P> {
  constructor(translationKey: P, translationArgs?: OptionalArgs<P>) {
    super(
      HttpStatus.UNAUTHORIZED,
      ErrorCode.OTP_REQUIRED,
      'Unauthorized',
      translationKey,
      translationArgs,
    );
  }
}

export class ServiceUnavailableException<
  P extends I18nPath = I18nPath,
> extends BaseTranslatableException<P> {
  constructor(translationKey: P, translationArgs?: OptionalArgs<P>) {
    super(
      HttpStatus.SERVICE_UNAVAILABLE,
      ErrorCode.SERVICE_UNAVAILABLE,
      'Service Unavailable',
      translationKey,
      translationArgs,
    );
  }
}

export class CenterSelectionRequiredException<
  P extends I18nPath = I18nPath,
> extends BaseTranslatableException<P> {
  constructor(translationKey: P, translationArgs?: OptionalArgs<P>) {
    super(
      HttpStatus.BAD_REQUEST,
      ErrorCode.CENTER_SELECTION_REQUIRED,
      'Center Selection Required',
      translationKey,
      translationArgs,
    );
  }
}

export class AdminScopeAccessDeniedException<
  P extends I18nPath = I18nPath,
> extends BaseTranslatableException<P> {
  constructor(translationKey: P, translationArgs?: OptionalArgs<P>) {
    super(
      HttpStatus.FORBIDDEN,
      ErrorCode.ADMIN_SCOPE_ACCESS_DENIED,
      'Admin Scope Access Denied',
      translationKey,
      translationArgs,
    );
  }
}

export class CenterAccessDeniedException<
  P extends I18nPath = I18nPath,
> extends BaseTranslatableException<P> {
  constructor(translationKey: P, translationArgs?: OptionalArgs<P>) {
    super(
      HttpStatus.FORBIDDEN,
      ErrorCode.CENTER_ACCESS_DENIED,
      'Center Access Denied',
      translationKey,
      translationArgs,
    );
  }
}

export class CenterAccessInactiveException<
  P extends I18nPath = I18nPath,
> extends BaseTranslatableException<P> {
  constructor(translationKey: P, translationArgs?: OptionalArgs<P>) {
    super(
      HttpStatus.FORBIDDEN,
      ErrorCode.CENTER_ACCESS_INACTIVE,
      'Center Access Inactive',
      translationKey,
      translationArgs,
    );
  }
}

export class InactiveCenterException<
  P extends I18nPath = I18nPath,
> extends BaseTranslatableException<P> {
  constructor(translationKey: P, translationArgs?: OptionalArgs<P>) {
    super(
      HttpStatus.FORBIDDEN,
      ErrorCode.CENTER_INACTIVE,
      'Inactive Center',
      translationKey,
      translationArgs,
    );
  }
}

export class InactiveProfileException<
  P extends I18nPath = I18nPath,
> extends BaseTranslatableException<P> {
  constructor(translationKey: P, translationArgs?: OptionalArgs<P>) {
    super(
      HttpStatus.FORBIDDEN,
      ErrorCode.PROFILE_INACTIVE,
      'Inactive Profile',
      translationKey,
      translationArgs,
    );
  }
}

export class SeederException<
  P extends I18nPath = I18nPath,
> extends BaseTranslatableException<P> {
  constructor(translationKey: P, translationArgs?: OptionalArgs<P>) {
    super(
      HttpStatus.INTERNAL_SERVER_ERROR,
      ErrorCode.SEEDER_ERROR,
      'Seeder Error',
      translationKey,
      translationArgs,
    );
  }
}

export class ExportFormatNotSupportedException<
  P extends I18nPath = I18nPath,
> extends BaseTranslatableException<P> {
  constructor(
    format: string,
    translationKey: P,
    translationArgs?: OptionalArgs<P>,
  ) {
    super(
      HttpStatus.BAD_REQUEST,
      ErrorCode.EXPORT_FORMAT_NOT_SUPPORTED,
      'Bad Request',
      translationKey,
      translationArgs,
    );
  }
}

export class ExportDataUnavailableException<
  P extends I18nPath = I18nPath,
> extends BaseTranslatableException<P> {
  constructor(translationKey: P, translationArgs?: OptionalArgs<P>) {
    super(
      HttpStatus.NOT_FOUND,
      ErrorCode.EXPORT_DATA_UNAVAILABLE,
      'Not Found',
      translationKey,
      translationArgs,
    );
  }
}

export class ExportFailedException<
  P extends I18nPath = I18nPath,
> extends BaseTranslatableException<P> {
  constructor(translationKey: P, translationArgs?: OptionalArgs<P>) {
    super(
      HttpStatus.INTERNAL_SERVER_ERROR,
      ErrorCode.EXPORT_FAILED,
      'Export Failed',
      translationKey,
      translationArgs,
    );
  }
}

export class MissingRequiredHeaderException<
  P extends I18nPath = I18nPath,
> extends BaseTranslatableException<P> {
  constructor(
    header: string,
    translationKey: P,
    translationArgs?: OptionalArgs<P>,
  ) {
    super(
      HttpStatus.BAD_REQUEST,
      ErrorCode.MISSING_REQUIRED_HEADER,
      'Bad Request',
      translationKey,
      translationArgs,
    );
  }
}

export class InvalidContentTypeException<
  P extends I18nPath = I18nPath,
> extends BaseTranslatableException<P> {
  constructor(translationKey: P, translationArgs?: OptionalArgs<P>) {
    super(
      HttpStatus.BAD_REQUEST,
      ErrorCode.INVALID_CONTENT_TYPE,
      'Bad Request',
      translationKey,
      translationArgs,
    );
  }
}

export class RequestBodyTooLargeException<
  P extends I18nPath = I18nPath,
> extends BaseTranslatableException<P> {
  constructor(translationKey: P, translationArgs?: OptionalArgs<P>) {
    super(
      HttpStatus.PAYLOAD_TOO_LARGE,
      ErrorCode.REQUEST_BODY_TOO_LARGE,
      'Payload Too Large',
      translationKey,
      translationArgs,
    );
  }
}

export class UnsupportedContentTypeException<
  P extends I18nPath = I18nPath,
> extends BaseTranslatableException<P> {
  constructor(translationKey: P, translationArgs?: OptionalArgs<P>) {
    super(
      HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      ErrorCode.UNSUPPORTED_CONTENT_TYPE,
      'Unsupported Media Type',
      translationKey,
      translationArgs,
    );
  }
}

export class SystemNotReadyException<
  P extends I18nPath = I18nPath,
> extends BaseTranslatableException<P> {
  constructor(translationKey: P, translationArgs?: OptionalArgs<P>) {
    super(
      HttpStatus.SERVICE_UNAVAILABLE,
      ErrorCode.SYSTEM_NOT_READY,
      'Service Unavailable',
      translationKey,
      translationArgs,
    );
  }
}

export class BranchAccessDeniedException<
  P extends I18nPath = I18nPath,
> extends BaseTranslatableException<P> {
  constructor(translationKey: P, translationArgs?: OptionalArgs<P>) {
    super(
      HttpStatus.FORBIDDEN,
      ErrorCode.BRANCH_ACCESS_DENIED,
      'Branch Access Denied',
      translationKey,
      translationArgs,
    );
  }
}

export class ProfileSelectionRequiredException<
  P extends I18nPath = I18nPath,
> extends BaseTranslatableException<P> {
  constructor(translationKey: P, translationArgs?: OptionalArgs<P>) {
    const details: ErrorDetail[] = [
      {
        field: 'profileId',
        value: null,
        message: {
          key: 't.messages.fieldRequired',
          args: {
            field: 't.resources.profile',
          },
        },
      },
    ];
    super(
      HttpStatus.BAD_REQUEST,
      ErrorCode.PROFILE_SELECTION_REQUIRED,
      'Profile Selection Required',
      translationKey,
      translationArgs,
      details,
    );
  }
}

/**
 * Internal exception for invalid operations (uses plain string, not translation key)
 * Used for background/internal errors that don't reach users
 */
export class InternalInvalidOperationException extends HttpException {
  constructor(message: string) {
    const response: EnhancedErrorResponse = {
      statusCode: HttpStatus.BAD_REQUEST,
      message: {
        key: 't.messages.errorWithMessage',
        args: { message },
      } as TranslationMessage,
      error: 'Bad Request',
      code: ErrorCode.INVALID_OPERATION,
      timestamp: new Date().toISOString(),
    };
    super(response, HttpStatus.BAD_REQUEST);
  }
}

/**
 * Internal exception for service unavailable (uses plain string, not translation key)
 * Used for background/internal errors that don't reach users
 */
export class InternalServiceUnavailableException extends HttpException {
  constructor(message: string) {
    const response: EnhancedErrorResponse = {
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message: {
        key: 't.messages.serviceUnavailable',
      } as TranslationMessage,
      error: 'Service Unavailable',
      code: ErrorCode.SERVICE_UNAVAILABLE,
      timestamp: new Date().toISOString(),
    };
    super(response, HttpStatus.SERVICE_UNAVAILABLE);
  }
}

/**
 * Internal exception for business logic errors (uses plain string, not translation key)
 * Used for background/internal errors that don't reach users
 */
export class InternalBusinessLogicException extends HttpException {
  constructor(message: string) {
    const response: EnhancedErrorResponse = {
      statusCode: HttpStatus.BAD_REQUEST,
      message: {
        key: 't.messages.businessLogicError',
      } as TranslationMessage,
      error: 'Bad Request',
      code: ErrorCode.BUSINESS_LOGIC_ERROR,
      timestamp: new Date().toISOString(),
    };
    super(response, HttpStatus.BAD_REQUEST);
  }
}
