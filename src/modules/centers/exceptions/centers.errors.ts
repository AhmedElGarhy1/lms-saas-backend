import {
  DomainException,
  BaseErrorHelpers,
} from '@/shared/common/exceptions/domain.exception';
import { CentersErrorCode } from '../enums/centers.codes';

/**
 * Centers-specific error helpers
 * Clean, simple, and maintainable error creation for centers and branches
 */
export class CentersErrors extends BaseErrorHelpers {
  // Branch errors
  static branchNotFound(): DomainException {
    return this.createNoDetails(CentersErrorCode.BRANCH_NOT_FOUND);
  }


  // Center errors
  static centerNotFound(): DomainException {
    return this.createNoDetails(CentersErrorCode.CENTER_NOT_FOUND);
  }

  static centerAlreadyExists(): DomainException {
    return this.createNoDetails(CentersErrorCode.CENTER_ALREADY_EXISTS);
  }

  static centerAlreadyActive(): DomainException {
    return this.createNoDetails(CentersErrorCode.CENTER_ALREADY_ACTIVE);
  }

  // Branch access errors
  static branchAccessNotFound(): DomainException {
    return this.createNoDetails(CentersErrorCode.BRANCH_ACCESS_NOT_FOUND);
  }

  static branchAccessDenied(): DomainException {
    return this.createNoDetails(CentersErrorCode.BRANCH_ACCESS_DENIED);
  }

  static branchAccessAlreadyGranted(): DomainException {
    return this.createNoDetails(CentersErrorCode.BRANCH_ACCESS_ALREADY_GRANTED);
  }

  static branchAccessNotGranted(): DomainException {
    return this.createNoDetails(CentersErrorCode.BRANCH_ACCESS_NOT_GRANTED);
  }

  // Profile/assignment errors
  static profileInvalidTypeForBranchAccess(): DomainException {
    return this.createNoDetails(
      CentersErrorCode.PROFILE_INVALID_TYPE_FOR_BRANCH_ACCESS,
    );
  }

  static profileAlreadyHasBranchAccess(): DomainException {
    return this.createNoDetails(
      CentersErrorCode.PROFILE_ALREADY_HAS_BRANCH_ACCESS,
    );
  }

  // Validation errors
  static branchValidationFailed(): DomainException {
    return this.createNoDetails(CentersErrorCode.BRANCH_VALIDATION_FAILED);
  }

  static centerValidationFailed(): DomainException {
    return this.createNoDetails(CentersErrorCode.CENTER_VALIDATION_FAILED);
  }
}
