import {
  DomainException,
  BaseErrorHelpers,
} from '@/shared/common/exceptions/domain.exception';
import { UserProfileErrorCode } from '../enums/user-profile.codes';

/**
 * User Profile module error helpers
 * Clean, simple, and maintainable error creation
 */
export class UserProfileErrors extends BaseErrorHelpers {
  // User profile errors
  static userProfileNotFound(): DomainException {
    return this.createNoDetails(UserProfileErrorCode.USER_PROFILE_NOT_FOUND);
  }

  static userProfileInvalidData(): DomainException {
    return this.createNoDetails(UserProfileErrorCode.USER_PROFILE_INVALID_DATA);
  }

  static userProfileSelectionRequired(): DomainException {
    return this.createNoDetails(
      UserProfileErrorCode.USER_PROFILE_SELECTION_REQUIRED,
    );
  }

  static userProfileInactive(): DomainException {
    return this.createNoDetails(UserProfileErrorCode.USER_PROFILE_INACTIVE);
  }

  static userProfileAlreadyExists(): DomainException {
    return this.createNoDetails(
      UserProfileErrorCode.USER_PROFILE_ALREADY_EXISTS,
    );
  }

  static userProfileAlreadyExistsWithCenterAccess(): DomainException {
    return this.createNoDetails(
      UserProfileErrorCode.USER_PROFILE_ALREADY_EXISTS_WITH_CENTER_ACCESS,
    );
  }
}
