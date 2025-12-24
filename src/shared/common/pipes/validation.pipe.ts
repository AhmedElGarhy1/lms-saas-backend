import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  ErrorDetail,
  EnhancedErrorResponse,
} from '../exceptions/custom.exceptions';
import { ErrorCode } from '../enums/error-codes.enum';
import { I18nPath } from '@/generated/i18n.generated';
import { PathArgs } from '@/generated/i18n-type-map.generated';
import { TranslationMessage } from '../types/translation.types';
import { TimezoneService } from '../services/timezone.service';

/**
 * Custom validation pipe that transforms class-validator errors
 * into structured error responses with i18n support.
 */
@Injectable()
export class CustomValidationPipe implements PipeTransform {
  /**
   * Transforms and validates the incoming value.
   *
   * @param value The value to validate
   * @param metadata Argument metadata containing type information
   * @returns The validated and transformed object
   * @throws BadRequestException if validation fails
   */
  async transform(
    value: unknown,
    { metatype }: ArgumentMetadata,
  ): Promise<unknown> {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const object = plainToInstance(metatype, value);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const errors = await validate(object);

    if (errors.length > 0) {
      const validationErrors: ErrorDetail[] =
        this.flattenValidationErrors(errors);

      const errorResponse: EnhancedErrorResponse = {
        statusCode: 400,
        message: { key: 't.messages.validationFailed' } as TranslationMessage,
        code: ErrorCode.VALIDATION_FAILED,
        timestamp: TimezoneService.getUtcNow().toISOString(),
        details: validationErrors,
      };

      throw new BadRequestException(errorResponse);
    }

    return object;
  }

  /**
   * Checks if the metatype should be validated.
   *
   * @param metatype The type to check
   * @returns True if the type should be validated
   */
  private toValidate(metatype: new (...args: unknown[]) => unknown): boolean {
    const types: (new (...args: unknown[]) => unknown)[] = [
      String,
      Boolean,
      Number,
      Array,
      Object,
    ];
    return !types.includes(metatype);
  }

  /**
   * Flattens nested validation errors into a flat array.
   *
   * @param errors Array of validation errors
   * @returns Flattened array of error details
   */
  private flattenValidationErrors(errors: ValidationError[]): ErrorDetail[] {
    const result: ErrorDetail[] = [];

    for (const error of errors) {
      // Process all constraints, not just the first one
      if (error.constraints) {
        const constraintKeys = Object.keys(error.constraints);
        for (const constraintKey of constraintKeys) {
          const translatedMessage = this.getValidationMessage(
            error.property,
            constraintKey,
          );

          const args = this.getValidationMessageArgs(
            error.property,
            constraintKey,
            error.constraints,
          );

          const errorDetail: ErrorDetail = {
            field: error.property,
            value: error.value,
            message: {
              key: translatedMessage,
              args: args as PathArgs<I18nPath>,
            },
          };
          result.push(errorDetail);
        }
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

  /**
   * Maps class-validator constraint keys to i18n translation keys.
   *
   * @param field The field name
   * @param constraintKey The constraint key from class-validator
   * @returns The i18n translation key
   */
  private getValidationMessage(field: string, constraintKey: string): I18nPath {
    // Map class-validator constraint keys to translation keys
    const constraintMap: Record<string, I18nPath> = {
      isNotEmpty: 't.validation.required.message',
      isEmail: 't.validation.email.invalid',
      isPhoneNumber: 't.validation.phone.invalid',
      isStrongPassword: 't.validation.password.invalid',
      matches: 't.validation.invalid.message', // Generic invalid message, not password-specific
      minLength: 't.validation.minLength.message',
      maxLength: 't.validation.maxLength.message',
      arrayMinSize: 't.validation.arrayMinSize.message',
      arrayMaxSize: 't.validation.arrayMaxSize.message',
      isUuid: 't.validation.isUuid.message',
      isString: 't.validation.isString.message',
      isBoolean: 't.validation.isBoolean.message',
      isEnum: 't.validation.isEnum.message',
      isDateString: 't.validation.isDateString.message',
      isIso8601OrDate: 't.validation.isIso8601.message',
      isISO8601: 't.validation.isIso8601.message',
      isArray: 't.validation.isArray.message',
      isNumber: 't.validation.isNumber.message',
      isInt: 't.validation.isInt.message',
      min: 't.validation.min.message',
      max: 't.validation.max.message',
    };

    return (
      constraintMap[constraintKey] ||
      ('t.validation.invalid.message' as I18nPath)
    );
  }

  /**
   * Gets the arguments for validation message translation.
   *
   * @param field The field name
   * @param constraintKey The constraint key
   * @param constraints All constraints for the field
   * @returns Arguments object for the translation, or undefined
   */
  private getValidationMessageArgs(
    field: string,
    constraintKey: string,
    constraints: Record<string, string>,
  ): Record<string, string | number> | undefined {
    const constraintValue = constraints[constraintKey];
    const fieldLabelKey = `t.resources.${field}`;

    // Safely extract numeric constraint values
    const getNumericValue = (): number => {
      if (typeof constraintValue === 'number') {
        return constraintValue;
      }
      if (typeof constraintValue === 'string') {
        const parsed = Number.parseFloat(constraintValue);
        return Number.isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };

    // Map constraint keys to their required args
    const argsMap: Record<string, () => Record<string, string | number>> = {
      isNotEmpty: () => ({ field: fieldLabelKey as I18nPath }),
      minLength: () => ({
        field: fieldLabelKey as I18nPath,
        min: getNumericValue(),
      }),
      maxLength: () => ({
        field: fieldLabelKey as I18nPath,
        max: getNumericValue(),
      }),
      arrayMinSize: () => {
        const baseField = field.replace(/[Ii]ds?$/, '');
        const itemLabelKey = `t.resources.${baseField}`;
        return {
          min: getNumericValue() || 1,
          item: itemLabelKey as I18nPath,
        };
      },
      arrayMaxSize: () => {
        const baseField = field.replace(/[Ii]ds?$/, '');
        const itemLabelKey = `t.resources.${baseField}`;
        return {
          max: getNumericValue() || 100,
          item: itemLabelKey as I18nPath,
        };
      },
      isUuid: () => {
        const baseField = field.replace(/[Ii]ds?$/, '');
        const itemLabelKey = `t.resources.${baseField}`;
        return { item: itemLabelKey as I18nPath };
      },
      isString: () => ({ field: fieldLabelKey }),
      isBoolean: () => ({ field: fieldLabelKey }),
      isEnum: () => ({ field: fieldLabelKey }),
      isDateString: () => ({ field: fieldLabelKey }),
      isArray: () => ({ field: fieldLabelKey }),
      isNumber: () => ({ field: fieldLabelKey }),
      isInt: () => ({ field: fieldLabelKey }),
      min: () => ({
        field: fieldLabelKey as I18nPath,
        min: getNumericValue(),
      }),
      max: () => ({
        field: fieldLabelKey as I18nPath,
        max: getNumericValue(),
      }),
    };

    const handler = argsMap[constraintKey];
    return handler ? handler() : { field: fieldLabelKey as I18nPath };
  }
}
