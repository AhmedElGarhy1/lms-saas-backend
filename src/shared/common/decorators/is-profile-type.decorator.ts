import { registerDecorator, ValidationOptions } from 'class-validator';
import { IsProfileTypeConstraint } from '../validators/is-profile-type.constraint';
import { ProfileType } from '../enums/profile-type.enum';

export function IsProfileType(
  profileType: ProfileType,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [profileType],
      validator: IsProfileTypeConstraint,
    });
  };
}
