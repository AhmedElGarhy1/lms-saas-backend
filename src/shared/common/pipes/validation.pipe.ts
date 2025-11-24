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
        message: this.i18n.translate('t.errors.validationFailed'),
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
        const constraintValue = error.constraints[constraintKey];
        // Use the non-type-safe version for dynamic constraint keys
        const translatedMessage = this.getValidationMessage(
          error.property,
          constraintKey,
          error.constraints,
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

  private getValidationMessage(
    field: string,
    constraintKey: string,
    constraints: Record<string, any>,
  ): string {
    // Get field label from translations, fallback to capitalized field name
    const fieldLabel = this.getFieldLabel(field);

    // Map class-validator constraint keys to our translation keys
    const constraintMapping: Record<string, string> = {
      isNotEmpty: 'required',
      isEmail: 'email',
      isPhoneNumber: 'phone',
      isStrongPassword: 'password',
      minLength: 'minLength',
      maxLength: 'maxLength',
      matches: 'passwordMismatch',
    };

    const mappedKey = constraintMapping[constraintKey] || constraintKey;

    // Handle special cases with specific message paths
    if (mappedKey === 'email') {
      return this.i18n.translate('t.validation.email.invalid' as I18nPath);
    }

    if (mappedKey === 'phone') {
      return this.i18n.translate('t.validation.phone.invalid' as I18nPath);
    }

    if (mappedKey === 'passwordMismatch') {
      return this.i18n.translate('t.validation.password.mismatch' as I18nPath);
    }

    // Handle dynamic patterns with field interpolation
    if (mappedKey === 'required') {
      return this.i18n.translate('t.validation.required.message' as I18nPath, {
        args: { field: fieldLabel },
      });
    }

    if (mappedKey === 'minLength') {
      // Extract min value from constraint message or use default
      const minValue = this.extractConstraintValue(constraints[constraintKey], 'min') || 0;
      return this.i18n.translate('t.validation.minLength.message' as I18nPath, {
        args: { field: fieldLabel, min: minValue },
      });
    }

    if (mappedKey === 'maxLength') {
      // Extract max value from constraint message or use default
      const maxValue = this.extractConstraintValue(constraints[constraintKey], 'max') || 0;
      return this.i18n.translate('t.validation.maxLength.message' as I18nPath, {
        args: { field: fieldLabel, max: maxValue },
      });
    }

    // Fallback to invalid format
    return this.i18n.translate('t.validation.invalid.message' as I18nPath, {
      args: { field: fieldLabel },
    });
  }

  private getFieldLabel(field: string): string {
    // Try to get translated field label
    const labelKey = `t.common.labels.${field}` as I18nPath;
    const translatedLabel = this.i18n.translate(labelKey);

    // If translation exists and is different from the key, use it
    if (
      translatedLabel &&
      typeof translatedLabel === 'string' &&
      translatedLabel !== labelKey
    ) {
      return translatedLabel;
    }

    // Fallback to capitalized field name
    return field.charAt(0).toUpperCase() + field.slice(1);
  }

  private extractConstraintValue(
    constraintMessage: string,
    type: 'min' | 'max',
  ): number | null {
    // Try to extract numeric value from constraint message
    // Constraint messages often contain values like "must be at least 5 characters"
    if (typeof constraintMessage === 'string') {
      const match = constraintMessage.match(/\d+/);
      if (match) {
        return parseInt(match[0], 10);
      }
    }
    return null;
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
      isEmail: this.i18n.translate('t.validation.email.suggestion', {
        args: { field },
      }),
      isNotEmpty: this.i18n.translate('t.validation.required.suggestion', {
        args: { field },
      }),
      minLength: this.i18n.translate('t.validation.minLength.suggestion', {
        args: { field },
      }),
      maxLength: this.i18n.translate('t.validation.maxLength.suggestion', {
        args: { field },
      }),
      isPhoneNumber: this.i18n.translate('t.validation.phone.suggestion', {
        args: { field },
      }),
      isStrongPassword: this.i18n.translate(
        't.validation.password.suggestion',
        {
          args: { field },
        },
      ),
    };

    return (
      suggestions[constraintKey] ||
      this.i18n.translate('t.validation.default.suggestion', {
        args: { field },
      })
    );
  }
}
