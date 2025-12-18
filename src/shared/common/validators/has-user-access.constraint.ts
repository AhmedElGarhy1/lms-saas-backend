import { Injectable } from '@nestjs/common';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { RequestContext } from '../context/request.context';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';

@ValidatorConstraint({ async: true })
@Injectable()
export class HasUserAccessConstraint implements ValidatorConstraintInterface {
  constructor(
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {}

  async validate(value: any, args: ValidationArguments): Promise<boolean> {
    const context = RequestContext.get();
    const centerId = context?.centerId;
    const actorUserProfileId = context?.userProfileId;

    if (!value) return true;
    if (!centerId || !actorUserProfileId) return false;

    try {
      return await this.accessControlHelperService.canUserAccess({
        granterUserProfileId: actorUserProfileId,
        targetUserProfileId: value,
        centerId,
      });
    } catch (error) {
      console.error('Error in HasUserAccessConstraint:', error);
      return false;
    }
  }

  defaultMessage(args: ValidationArguments): string {
    return `Actor does not have user access to UserProfile with id "${args.value}"`;
  }
}
