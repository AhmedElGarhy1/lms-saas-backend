import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  ErrorDetail,
  EnhancedErrorResponse,
} from '../exceptions/custom.exceptions';
import { ErrorCode } from '../enums/error-codes.enum';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations, I18nPath } from '@/generated/i18n.generated';

@Injectable()
export class CustomValidationPipe implements PipeTransform<any> {
  private readonly logger: Logger = new Logger(CustomValidationPipe.name);

  constructor(
    private readonly i18n: I18nService<I18nTranslations>,
    private readonly moduleRef: ModuleRef,
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

      const errorResponse: EnhancedErrorResponse = {
        statusCode: 400,
        message: this.i18n.translate('errors.validationFailed'),
        error: 'Bad Request',
        code: ErrorCode.VALIDATION_FAILED,
        timestamp: new Date().toISOString(),
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
      return this.i18n.translate(`validation.${constraintKey}` as I18nPath);
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
    const translatedSuggestion = this.i18n.translate(
      suggestionKey as I18nPath,
      {
        args: { field },
      },
    );
    if (
      translatedSuggestion &&
      typeof translatedSuggestion === 'string' &&
      translatedSuggestion !== suggestionKey
    ) {
      return translatedSuggestion;
    }

    // Fallback to common validation suggestions
    const suggestions: Record<string, string> = {
      isEmail: this.i18n.translate('validation.email.suggestion', {
        args: { field },
      }),
      isNotEmpty: this.i18n.translate('validation.required.suggestion', {
        args: { field },
      }),
      minLength: this.i18n.translate('validation.minLength.suggestion', {
        args: { field },
      }),
      maxLength: this.i18n.translate('validation.maxLength.suggestion', {
        args: { field },
      }),
      isPhoneNumber: this.i18n.translate('validation.phone.suggestion', {
        args: { field },
      }),
      isStrongPassword: this.i18n.translate('validation.password.suggestion', {
        args: { field },
      }),
    };

    return (
      suggestions[constraintKey] ||
      this.i18n.translate('validation.default.suggestion', {
        args: { field },
      })
    );
  }
}
