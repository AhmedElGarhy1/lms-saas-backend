import { Injectable } from '@nestjs/common';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { ProfileType } from '../enums/profile-type.enum';

@ValidatorConstraint({ async: true })
@Injectable()
export class IsProfileTypeConstraint implements ValidatorConstraintInterface {
  constructor(private readonly userProfileService: UserProfileService) {}

  async validate(value: any, args: ValidationArguments): Promise<boolean> {
    if (!value) return true;

    const [expectedProfileType] = args.constraints as [ProfileType];

    if (!expectedProfileType) {
      console.error(
        'IsProfileTypeConstraint: expectedProfileType not provided',
      );
      return false;
    }

    try {
      const profile = await this.userProfileService.findOne(value);
      if (!profile) {
        return false;
      }

      return profile.profileType === expectedProfileType;
    } catch (error) {
      console.error('Error in IsProfileTypeConstraint:', error);
      return false;
    }
  }

  defaultMessage(args: ValidationArguments): string {
    const [expectedProfileType] = args.constraints as [ProfileType];
    return `UserProfile with id "${args.value}" must be of type "${expectedProfileType}"`;
  }
}
