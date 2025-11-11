import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  ErrorDetail,
  EnhancedErrorResponse,
} from '../exceptions/custom.exceptions';
import { ErrorCode } from '../enums/error-codes.enum';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';
import { LoggerService } from '@/shared/services/logger.service';

@Injectable()
export class CustomValidationPipe implements PipeTransform<any> {
  constructor(
    private readonly i18n: I18nService<I18nTranslations>,
    private readonly logger: LoggerService,
  ) {}

  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToClass(metatype, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      const validationErrors: ErrorDetail[] =
        this.flattenValidationErrors(errors);

      this.logger.warn('Validation failed', 'CustomValidationPipe', {
        errors: validationErrors,
        metatype: metatype.name,
        errorCount: errors.length,
      });

      const errorResponse: EnhancedErrorResponse = {
        statusCode: 400,
        message: this.i18n.translate('errors.VALIDATION_FAILED'),
        error: 'Bad Request',
        code: ErrorCode.VALIDATION_FAILED,
        timestamp: new Date().toISOString(),
        userMessage: this.i18n.translate('userMessages.validationFailed'),
        actionRequired: this.i18n.translate('actions.fixErrors'),
        retryable: true,
        details: validationErrors,
      };

      throw new BadRequestException(errorResponse);
    }

    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private flattenValidationErrors(errors: ValidationError[]): ErrorDetail[] {
    const result: ErrorDetail[] = [];

    for (const error of errors) {
      if (error.constraints) {
        const constraintKey = Object.keys(error.constraints)[0];
        // Use the non-type-safe version for dynamic constraint keys
        const translatedMessage = this.getValidationMessage(
          error.property,
          constraintKey,
        );

        result.push({
          field: error.property,
          value: error.value,
          message: translatedMessage,
          code: ErrorCode.VALIDATION_ERROR,
          suggestion: this.getValidationSuggestion(
            error.property,
            error.constraints,
          ),
        });
      }

      // Handle nested validation errors
      if (error.children && error.children.length > 0) {
        const nestedErrors = this.flattenValidationErrors(error.children);
        // Prefix nested field names with parent field
        const prefixedErrors = nestedErrors.map((nestedError) => ({
          ...nestedError,
          field: `${error.property}.${nestedError.field}`,
        }));
        result.push(...prefixedErrors);
      }
    }

    return result;
  }

  private getValidationMessage(field: string, constraintKey: string): string {
    // Try type-safe validation first
    const validConstraintKeys = [
      'required',
      'invalid',
      'minLength',
      'maxLength',
      'email',
      'phone',
      'password',
      'confirmPassword',
      'unique',
      'exists',
      'format',
      'range',
      'pattern',
    ];

    if (validConstraintKeys.includes(constraintKey)) {
      return this.i18n.translate(`validation.${constraintKey}` as any);
    }

    // Fallback for unknown constraint keys
    return `${field.charAt(0).toUpperCase() + field.slice(1)} ${constraintKey}`;
  }

  private getValidationSuggestion(
    field: string,
    constraints: Record<string, any>,
  ): string {
    const constraintKey = Object.keys(constraints)[0];

    // Try to get translated suggestion first
    const suggestionKey = `validation.${field}.${constraintKey}.suggestion`;
    const translatedSuggestion = this.i18n.translate(suggestionKey as any, {
      args: { field },
    });
    if (translatedSuggestion && translatedSuggestion !== suggestionKey) {
      return translatedSuggestion;
    }

    // Fallback to common validation suggestions
    const suggestions: Record<string, string> = {
      isEmail: this.i18n.translate('validation.email.suggestion' as any, {
        args: { field },
      }),
      isNotEmpty: this.i18n.translate('validation.required.suggestion' as any, {
        args: { field },
      }),
      minLength: this.i18n.translate('validation.minLength.suggestion' as any, {
        args: { field },
      }),
      maxLength: this.i18n.translate('validation.maxLength.suggestion' as any, {
        args: { field },
      }),
      isPhoneNumber: this.i18n.translate('validation.phone.suggestion' as any, {
        args: { field },
      }),
      isStrongPassword: this.i18n.translate(
        'validation.password.suggestion' as any,
        {
          args: { field },
        },
      ),
    };

    return (
      suggestions[constraintKey] ||
      this.i18n.translate('validation.default.suggestion' as any, {
        args: { field },
      })
    );
  }
}
