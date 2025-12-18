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
export class HasCenterAccessConstraint implements ValidatorConstraintInterface {
  constructor(
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {}

  async validate(value: any, args: ValidationArguments): Promise<boolean> {
    const centerId = RequestContext.get()?.centerId;

    if (!value) return true;
    if (!centerId) return false;

    try {
      return await this.accessControlHelperService.canCenterAccess({
        userProfileId: value,
        centerId,
      });
    } catch (error) {
      console.error('Error in HasCenterAccessConstraint:', error);
      return false;
    }
  }

  defaultMessage(args: ValidationArguments): string {
    return `UserProfile with id "${args.value}" does not have access to the current center`;
  }
}
