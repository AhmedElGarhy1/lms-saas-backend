import { registerDecorator, ValidationOptions } from 'class-validator';
import { CannotTargetSelfConstraint } from '../validators/cannot-target-self.constraint';

export function CannotTargetSelf(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: CannotTargetSelfConstraint,
    });
  };
}
