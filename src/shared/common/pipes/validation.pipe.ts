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
import { TranslationService } from '@/shared/services/translation.service';
import { I18nPath } from '@/generated/i18n.generated';

@Injectable()
export class CustomValidationPipe implements PipeTransform<any> {
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
        message: TranslationService.translate('t.errors.validationFailed'),
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

        result.push({
          field: error.property,
          value: error.value,
          message: translatedMessage,
          code: ErrorCode.VALIDATION_ERROR,
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
    const constraintValue = constraints[constraintKey];
    const fieldLabel = this.getFieldLabel(field);

    // Map class-validator constraint keys to translation keys
    const constraintMap: Record<string, () => string> = {
      isNotEmpty: () =>
        TranslationService.translate('t.validation.required.message', {
          field: fieldLabel,
        }),
      isEmail: () => TranslationService.translate('t.validation.email.invalid'),
      isPhoneNumber: () =>
        TranslationService.translate('t.validation.phone.invalid'),
      isStrongPassword: () =>
        TranslationService.translate('t.validation.password.invalid'),
      matches: () =>
        TranslationService.translate('t.validation.password.mismatch'),
      minLength: () =>
        TranslationService.translate('t.validation.minLength.message', {
          field: fieldLabel,
          min: constraintValue || 0,
        }),
      maxLength: () =>
        TranslationService.translate('t.validation.maxLength.message', {
          field: fieldLabel,
          max: constraintValue || 0,
        }),
      arrayMinSize: () => {
        const itemLabel = this.getItemLabel(field);
        return TranslationService.translate(
          't.validation.arrayMinSize.message',
          {
            min: constraintValue || 1,
            item: itemLabel,
          },
        );
      },
      arrayMaxSize: () => {
        const itemLabel = this.getItemLabel(field);
        return TranslationService.translate(
          't.validation.arrayMaxSize.message',
          {
            max: constraintValue || 100,
            item: itemLabel,
          },
        );
      },
      isUuid: () => {
        const itemLabel = this.getItemLabel(field);
        return TranslationService.translate('t.validation.isUuid.message', {
          item: itemLabel,
        });
      },
      isString: () =>
        TranslationService.translate('t.validation.isString.message', {
          field: fieldLabel,
        }),
      isBoolean: () =>
        TranslationService.translate('t.validation.isBoolean.message', {
          field: fieldLabel,
        }),
      isEnum: () =>
        TranslationService.translate('t.validation.isEnum.message', {
          field: fieldLabel,
        }),
      isDateString: () =>
        TranslationService.translate('t.validation.isDateString.message', {
          field: fieldLabel,
        }),
      isArray: () =>
        TranslationService.translate('t.validation.isArray.message', {
          field: fieldLabel,
        }),
      isNumber: () =>
        TranslationService.translate('t.validation.isNumber.message', {
          field: fieldLabel,
        }),
      isInt: () =>
        TranslationService.translate('t.validation.isInt.message', {
          field: fieldLabel,
        }),
      min: () =>
        TranslationService.translate('t.validation.min.message', {
          field: fieldLabel,
          min: constraintValue || 0,
        }),
      max: () =>
        TranslationService.translate('t.validation.max.message', {
          field: fieldLabel,
          max: constraintValue || 0,
        }),
    };

    const handler = constraintMap[constraintKey];
    if (handler) {
      return handler();
    }

    // Fallback for unknown constraints
    return TranslationService.translate('t.validation.invalid.message', {
      field: fieldLabel,
    });
  }

  private getItemLabel(field: string): string {
    // Convert array field names (e.g., "branchIds", "userProfileIds") to readable labels
    // Remove 'Ids' suffix and get base label, then format for arrays
    const baseField = field.replace(/[Ii]ds?$/, '');
    const baseLabel = this.getFieldLabel(baseField);
    return baseLabel.toLowerCase() + ' ID';
  }

  private getFieldLabel(field: string): string {
    // Try to get translated field label
    const labelKey = `t.common.labels.${field}`;
    const translatedLabel = TranslationService.translate(labelKey as I18nPath);

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
}
