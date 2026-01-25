import {
  DomainException,
  BaseErrorHelpers,
} from '@/shared/common/exceptions/domain.exception';
import { UserErrorCode } from '../enums/user.codes';

/**
 * User-specific error helpers
 * Clean, simple, and maintainable error creation
 */
export class UserErrors extends BaseErrorHelpers {
  static userNotFound(): DomainException {
    return this.createNoDetails(UserErrorCode.USER_NOT_FOUND);
  }

  static userAlreadyExists(): DomainException {
    return this.createNoDetails(UserErrorCode.USER_ALREADY_EXISTS);
  }

  static emailAlreadyExists(email: string): DomainException {
    return this.createWithDetails(UserErrorCode.EMAIL_ALREADY_EXISTS, {
      field: 'email',
      value: email,
    });
  }

  static phoneAlreadyExists(phone: string): DomainException {
    return this.createWithDetails(UserErrorCode.PHONE_ALREADY_EXISTS, {
      field: 'phone',
      value: phone,
    });
  }

  static currentPasswordInvalid(): DomainException {
    return this.createNoDetails(UserErrorCode.CURRENT_PASSWORD_INVALID);
  }

  static userInactive(): DomainException {
    return this.createNoDetails(UserErrorCode.USER_INACTIVE);
  }

  static userDeleted(): DomainException {
    return this.createNoDetails(UserErrorCode.USER_DELETED);
  }

  static userSuspended(): DomainException {
    return this.createNoDetails(UserErrorCode.USER_SUSPENDED);
  }

  static userDeletionForbidden(): DomainException {
    return this.createNoDetails(UserErrorCode.USER_DELETION_FORBIDDEN);
  }

  static userRestorationForbidden(): DomainException {
    return this.createNoDetails(UserErrorCode.USER_RESTORATION_FORBIDDEN);
  }

  static userCreationForbidden(): DomainException {
    return this.createNoDetails(UserErrorCode.USER_CREATION_FORBIDDEN);
  }

  // Password reset operations
  static passwordResetExpired(): DomainException {
    return this.createNoDetails(UserErrorCode.PASSWORD_RESET_EXPIRED);
  }

  // Profile operations
  static profileUpdateForbidden(): DomainException {
    return this.createNoDetails(UserErrorCode.PROFILE_UPDATE_FORBIDDEN);
  }

  static profileIncomplete(): DomainException {
    return this.createNoDetails(UserErrorCode.PROFILE_INCOMPLETE);
  }

  // Role and permissions
  static roleAssignmentForbidden(): DomainException {
    return this.createNoDetails(UserErrorCode.ROLE_ASSIGNMENT_FORBIDDEN);
  }

  static roleChangeForbidden(): DomainException {
    return this.createNoDetails(UserErrorCode.ROLE_CHANGE_FORBIDDEN);
  }

  // User import operations
  static userImportFailed(): DomainException {
    return this.createNoDetails(UserErrorCode.USER_IMPORT_FAILED);
  }

  // Settings and preferences
  static userSettingsInvalid(): DomainException {
    return this.createNoDetails(UserErrorCode.USER_SETTINGS_INVALID);
  }

  static preferenceUpdateFailed(): DomainException {
    return this.createNoDetails(UserErrorCode.PREFERENCE_UPDATE_FAILED);
  }

  // Validation
  static userDataInvalid(): DomainException {
    return this.createNoDetails(UserErrorCode.USER_DATA_INVALID);
  }

  // Access control
  static userInfoNotFound(): DomainException {
    return this.createNoDetails(UserErrorCode.USER_INFO_NOT_FOUND);
  }

  static userCenterRequired(): DomainException {
    return this.createNoDetails(UserErrorCode.USER_CENTER_REQUIRED);
  }
}
