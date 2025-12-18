import { registerDecorator, ValidationOptions } from 'class-validator';
import { HasBranchAccessConstraint } from '../validators/has-branch-access.constraint';

export function HasBranchAccess(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: HasBranchAccessConstraint,
    });
  };
}
