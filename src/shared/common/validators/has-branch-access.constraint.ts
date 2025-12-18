import { Injectable } from '@nestjs/common';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { RequestContext } from '../context/request.context';
import { BranchAccessService } from '@/modules/centers/services/branch-access.service';

@ValidatorConstraint({ async: true })
@Injectable()
export class HasBranchAccessConstraint implements ValidatorConstraintInterface {
  constructor(private readonly branchAccessService: BranchAccessService) {}

  async validate(value: any, args: ValidationArguments): Promise<boolean> {
    const context = RequestContext.get();
    const centerId = context?.centerId;
    const userProfileId = context?.userProfileId;

    if (!value) return true;
    if (!centerId || !userProfileId) return false;

    try {
      return await this.branchAccessService.canBranchAccess({
        userProfileId,
        centerId,
        branchId: value,
      });
    } catch (error) {
      console.error('Error in HasBranchAccessConstraint:', error);
      return false;
    }
  }

  defaultMessage(args: ValidationArguments): string {
    return `Actor does not have branch access to branch with id "${args.value}"`;
  }
}
