import { registerDecorator, ValidationOptions } from 'class-validator';
import { NotExistsConstraint } from '../validators/not-exists.constraint';

export function NotExists(
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
      validator: NotExistsConstraint,
    });
  };
}
