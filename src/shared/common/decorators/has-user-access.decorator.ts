import { registerDecorator, ValidationOptions } from 'class-validator';
import { HasUserAccessConstraint } from '../validators/has-user-access.constraint';

export function HasUserAccess(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: HasUserAccessConstraint,
    });
  };
}
