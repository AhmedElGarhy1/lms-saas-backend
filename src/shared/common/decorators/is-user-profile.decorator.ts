import { registerDecorator, ValidationOptions } from 'class-validator';
import { IsUserProfileConstraint } from '../validators/is-user-profile.constraint';
import { ProfileType } from '../enums/profile-type.enum';

export function IsUserProfile(
  profileType?: ProfileType,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [profileType],
      validator: IsUserProfileConstraint,
    });
  };
}
