import { registerDecorator, ValidationOptions } from 'class-validator';
import { BelongsToCenterConstraint } from '../validators/belongs-to-center.constraint';

export function BelongsToCenter(
  entityClass: any,
  validationOptionsOrIncludeDeleted?: ValidationOptions | boolean,
  validationOptions?: ValidationOptions,
) {
  // Handle backward compatibility: if second parameter is ValidationOptions, includeDeleted is false
  // If second parameter is boolean, it's includeDeleted, and third parameter is ValidationOptions
  let includeDeleted = false;
  let options = validationOptions;

  if (typeof validationOptionsOrIncludeDeleted === 'boolean') {
    includeDeleted = validationOptionsOrIncludeDeleted;
  } else {
    options = validationOptionsOrIncludeDeleted;
  }

  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: options,
      constraints: [entityClass, includeDeleted],
      validator: BelongsToCenterConstraint,
    });
  };
}
