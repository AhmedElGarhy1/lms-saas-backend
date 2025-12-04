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
import { I18nPath } from '@/generated/i18n.generated';
import { PathArgs } from '@/generated/i18n-type-map.generated';

@Injectable()
export class CustomValidationPipe implements PipeTransform<any> {
  constructor() {}
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
        message: { key: 't.errors.validationFailed' },
        code: ErrorCode.VALIDATION_FAILED,
        timestamp: new Date().toISOString(),
        details: validationErrors,
      };

      throw new BadRequestException(errorResponse);
    }

    return object;
  }

  private toValidate(metatype: new (...args: any[]) => any): boolean {
    const types: (new (...args: any[]) => any)[] = [
      String,
      Boolean,
      Number,
      Array,
      Object,
    ];
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
          error.constraints,
        );

        // Get args if there are any (for nested translation keys)
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
  ): I18nPath {
    // Map class-validator constraint keys to translation keys
    const constraintMap: Record<string, string> = {
      isNotEmpty: 't.validation.required.message',
      isEmail: 't.validation.email.invalid',
      isPhoneNumber: 't.validation.phone.invalid',
      isStrongPassword: 't.validation.password.invalid',
      matches: 't.validation.password.mismatch',
      minLength: 't.validation.minLength.message',
      maxLength: 't.validation.maxLength.message',
      arrayMinSize: 't.validation.arrayMinSize.message',
      arrayMaxSize: 't.validation.arrayMaxSize.message',
      isUuid: 't.validation.isUuid.message',
      isString: 't.validation.isString.message',
      isBoolean: 't.validation.isBoolean.message',
      isEnum: 't.validation.isEnum.message',
      isDateString: 't.validation.isDateString.message',
      isArray: 't.validation.isArray.message',
      isNumber: 't.validation.isNumber.message',
      isInt: 't.validation.isInt.message',
      min: 't.validation.min.message',
      max: 't.validation.max.message',
    };

    return (constraintMap[constraintKey] ||
      't.validation.invalid.message') as I18nPath;
  }

  private getValidationMessageArgs(
    field: string,
    constraintKey: string,
    constraints: Record<string, any>,
  ): Record<string, any> | undefined {
    const constraintValue = constraints[constraintKey];
    const fieldLabelKey = `t.common.labels.${field}`;

    // Map constraint keys to their required args
    const argsMap: Record<string, () => Record<string, string | number>> = {
      isNotEmpty: () => ({ field: fieldLabelKey as I18nPath }),
      minLength: () => ({
        field: fieldLabelKey as I18nPath,
        min: constraintValue || 0,
      }),
      maxLength: () => ({
        field: fieldLabelKey as I18nPath,
        max: constraintValue || 0,
      }),
      arrayMinSize: () => {
        const baseField = field.replace(/[Ii]ds?$/, '');
        const itemLabelKey = `t.common.labels.${baseField}`;
        return { min: constraintValue || 1, item: itemLabelKey as I18nPath };
      },
      arrayMaxSize: () => {
        const baseField = field.replace(/[Ii]ds?$/, '');
        const itemLabelKey = `t.common.labels.${baseField}`;
        return { max: constraintValue || 100, item: itemLabelKey as I18nPath };
      },
      isUuid: () => {
        const baseField = field.replace(/[Ii]ds?$/, '');
        const itemLabelKey = `t.common.labels.${baseField}`;
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
        min: constraintValue || 0,
      }),
      max: () => ({
        field: fieldLabelKey as I18nPath,
        max: constraintValue || 0,
      }),
    };

    const handler = argsMap[constraintKey];
    return handler ? handler() : { field: fieldLabelKey as I18nPath };
  }
}
