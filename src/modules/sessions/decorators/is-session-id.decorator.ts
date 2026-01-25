import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { isUUID } from 'class-validator';
import { isVirtualSessionId } from '../utils/virtual-session-id.util';

/**
 * Validator constraint for session ID (UUID or virtual ID)
 */
@ValidatorConstraint({ name: 'isSessionId', async: false })
export class IsSessionIdConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    // Check if UUID format
    if (isUUID(value)) {
      return true;
    }
    // Check if virtual ID format
    return isVirtualSessionId(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return 'Session ID must be a valid UUID or virtual session ID';
  }
}

/**
 * Decorator to validate session ID (UUID or virtual ID format)
 *
 * @param validationOptions - Optional validation options
 * @returns Property decorator
 */
export function IsSessionId(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSessionId',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsSessionIdConstraint,
    });
  };
}
