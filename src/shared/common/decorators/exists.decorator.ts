import { registerDecorator, ValidationOptions } from 'class-validator';
import { ExistsConstraint } from '../validators/exists.constraint';

export function Exists(
  entityClass: any,
  column: string = 'id',
  includeDeleted: boolean = false,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [entityClass, column, includeDeleted],
      validator: ExistsConstraint,
    });
  };
}
