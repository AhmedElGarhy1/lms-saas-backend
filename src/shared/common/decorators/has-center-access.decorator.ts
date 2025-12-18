import { registerDecorator, ValidationOptions } from 'class-validator';
import { HasCenterAccessConstraint } from '../validators/has-center-access.constraint';

export function HasCenterAccess(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: HasCenterAccessConstraint,
    });
  };
}
