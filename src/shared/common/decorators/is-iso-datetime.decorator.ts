import { applyDecorators } from '@nestjs/common';
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { isISO8601 } from 'class-validator';

/**
 * Custom validator that accepts both ISO 8601 strings and Date objects
 * (Date objects are valid after transformation)
 */
function IsIso8601OrDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isIso8601OrDate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (value === null || value === undefined) {
            return true; // Let @IsOptional handle this
          }

          // If already a Date (after transformation), it's valid
          if (value instanceof Date) {
            return !isNaN(value.getTime());
          }

          // If string, validate as ISO 8601
          if (typeof value === 'string') {
            return isISO8601(value);
          }

          return false;
        },
        defaultMessage(args: ValidationArguments): string {
          if (validationOptions?.message) {
            return typeof validationOptions.message === 'string'
              ? validationOptions.message
              : validationOptions.message(args);
          }
          return `${String(args.property)} must be a valid ISO 8601 string (e.g., 2025-12-24T16:20:00Z)`;
        },
      },
    });
  };
}

export function IsoUtcDate(validationOptions?: ValidationOptions) {
  return applyDecorators(
    // 1. Validate ISO 8601 string OR Date object (handles both before and after transform)
    IsIso8601OrDate(validationOptions),

    // 2. Transform the validated string into a cleaned UTC Date
    Transform(({ value }: { value: unknown }): unknown => {
      if (value === null || value === undefined) return value;

      // If already a Date, just normalize milliseconds
      if (value instanceof Date) {
        const date = new Date(value);
        date.setMilliseconds(0);
        return date;
      }

      // If string, parse and normalize
      if (typeof value === 'string') {
        const date = new Date(value);

        // Check if parsing failed
        if (isNaN(date.getTime())) return value;

        // CRITICAL: Normalize milliseconds to 0 for exact DB matching
        date.setMilliseconds(0);

        return date;
      }

      return value;
    }),
  );
}
