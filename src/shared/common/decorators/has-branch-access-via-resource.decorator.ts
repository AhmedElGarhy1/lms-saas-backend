import { registerDecorator, ValidationOptions } from 'class-validator';
import { HasBranchAccessViaResourceConstraint } from '../validators/has-branch-access-via-resource.constraint';

export function HasBranchAccessViaResource(
  entityClass: any,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [entityClass],
      validator: HasBranchAccessViaResourceConstraint,
    });
  };
}
