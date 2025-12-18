import { registerDecorator, ValidationOptions } from 'class-validator';
import { BelongsToBranchConstraint } from '../validators/belongs-to-branch.constraint';

export function BelongsToBranch(
  entityClass: any,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [entityClass],
      validator: BelongsToBranchConstraint,
    });
  };
}
