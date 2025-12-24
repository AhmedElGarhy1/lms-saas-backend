import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { isValidTimezone } from '../constants/timezone.constants';

/**
 * Custom validator to ensure timezone is a valid IANA timezone identifier
 */
export function IsTimezone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isTimezone',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          // Allow undefined/null for optional fields
          if (value === undefined || value === null || value === '') {
            return true; // Let @IsOptional handle this
          }

          // Must be a string
          if (typeof value !== 'string') {
            return false;
          }

          // Validate using IANA timezone validation
          return isValidTimezone(value);
        },
        defaultMessage(args: ValidationArguments): string {
          if (validationOptions?.message) {
            return typeof validationOptions.message === 'string'
              ? validationOptions.message
              : validationOptions.message(args);
          }
          return 'timezone must be a valid IANA timezone identifier (e.g., Africa/Cairo, America/New_York)';
        },
      },
    });
  };
}
