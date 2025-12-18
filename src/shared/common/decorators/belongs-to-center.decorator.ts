import { registerDecorator, ValidationOptions } from 'class-validator';
import { BelongsToCenterConstraint } from '../validators/belongs-to-center.constraint';

export function BelongsToCenter(
  entityClass: any,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [entityClass],
      validator: BelongsToCenterConstraint,
    });
  };
}
