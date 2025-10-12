import { registerDecorator, ValidationOptions } from 'class-validator';
import { ExistsConstraint } from '../validators/exists.constraint';

export function Exists(
  entityClass: any,
  column: string = 'id',
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [entityClass, column],
      validator: ExistsConstraint,
    });
  };
}
