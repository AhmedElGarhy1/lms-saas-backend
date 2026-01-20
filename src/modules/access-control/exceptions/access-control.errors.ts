import {
  DomainException,
  BaseErrorHelpers,
} from '@/shared/common/exceptions/domain.exception';
import { AccessControlErrorCode } from '../enums/access-control.codes';
import { UserProfileErrors } from '@/modules/user-profile/exceptions/user-profile.errors';

/**
 * Access control-specific error helpers
 * Clean, simple, and maintainable error creation for roles, permissions, and access control
 */
export class AccessControlErrors extends BaseErrorHelpers {

  static userAccessNotFound(): DomainException {
    return this.createNoDetails(AccessControlErrorCode.USER_ACCESS_NOT_FOUND);
  }

  static userAlreadyHasAccess(): DomainException {
    return this.createNoDetails(AccessControlErrorCode.USER_ALREADY_HAS_ACCESS);
  }

  // Center access errors
  static centerAccessNotFound(): DomainException {
    return this.createNoDetails(AccessControlErrorCode.CENTER_ACCESS_NOT_FOUND);
  }

  static centerAccessAlreadyExists(): DomainException {
    return this.createNoDetails(
      AccessControlErrorCode.CENTER_ACCESS_ALREADY_EXISTS,
    );
  }

  static centerAccessAlreadyDeleted(): DomainException {
    return this.createNoDetails(
      AccessControlErrorCode.CENTER_ACCESS_ALREADY_DELETED,
    );
  }

  static centerAccessAlreadyInactive(): DomainException {
    return this.createNoDetails(
      AccessControlErrorCode.CENTER_ACCESS_ALREADY_INACTIVE,
    );
  }

  // Role and permission errors
  static roleNotFound(): DomainException {
    return this.createNoDetails(AccessControlErrorCode.ROLE_NOT_FOUND);
  }

  static roleAlreadyExists(): DomainException {
    return this.createNoDetails(AccessControlErrorCode.ROLE_ALREADY_EXISTS);
  }

  static permissionNotFound(): DomainException {
    return this.createNoDetails(AccessControlErrorCode.PERMISSION_NOT_FOUND);
  }

  static permissionAlreadyAssigned(): DomainException {
    return this.createNoDetails(
      AccessControlErrorCode.PERMISSION_ALREADY_ASSIGNED,
    );
  }

  // Assignment and management errors
  static cannotAssignRoleToSelf(): DomainException {
    return this.createNoDetails(
      AccessControlErrorCode.CANNOT_ASSIGN_ROLE_TO_SELF,
    );
  }

  static userAlreadyHasRole(): DomainException {
    return this.createNoDetails(AccessControlErrorCode.USER_ALREADY_HAS_ROLE);
  }

  static userDoesNotHaveRole(): DomainException {
    return this.createNoDetails(AccessControlErrorCode.USER_DOES_NOT_HAVE_ROLE);
  }

  // Status and state errors
  static cannotModifySystemRole(): DomainException {
    return this.createNoDetails(
      AccessControlErrorCode.CANNOT_MODIFY_SYSTEM_ROLE,
    );
  }

  
  static invalidProfileTypeForRoleAssignment(): DomainException {
    return this.createNoDetails(
      AccessControlErrorCode.INVALID_PROFILE_TYPE_FOR_ROLE_ASSIGNMENT,
    );
  }

  static roleAlreadyActive(): DomainException {
    return this.createNoDetails(AccessControlErrorCode.ROLE_ALREADY_ACTIVE);
  }

  static unsupportedProfileTypeForCenterAccess(): DomainException {
    return this.createNoDetails(
      AccessControlErrorCode.UNSUPPORTED_PROFILE_TYPE_FOR_CENTER_ACCESS,
    );
  }

  static cannotDeleteAdminCenterAccess(): DomainException {
    return this.createNoDetails(
      AccessControlErrorCode.CANNOT_DELETE_ADMIN_CENTER_ACCESS,
    );
  }

  static cannotRestoreActiveCenterAccess(): DomainException {
    return this.createNoDetails(
      AccessControlErrorCode.CANNOT_RESTORE_ACTIVE_CENTER_ACCESS,
    );
  }

  static cannotModifyAdminCenterAccess(): DomainException {
    return this.createNoDetails(
      AccessControlErrorCode.CANNOT_MODIFY_ADMIN_CENTER_ACCESS,
    );
  }

  static invalidProfileType(): DomainException {
    return this.createNoDetails(AccessControlErrorCode.INVALID_PROFILE_TYPE);
  }

  // Access control errors
  static cannotAccessGranterUser(): DomainException {
    return this.createNoDetails(
      AccessControlErrorCode.CANNOT_ACCESS_GRANTER_USER,
    );
  }

  static cannotAccessTargetUser(): DomainException {
    return this.createNoDetails(
      AccessControlErrorCode.CANNOT_ACCESS_TARGET_USER,
    );
  }

  static cannotRevokeUserAccess(): DomainException {
    return this.createNoDetails(
      AccessControlErrorCode.CANNOT_REVOKE_USER_ACCESS,
    );
  }

  static cannotAccessUserRecords(): DomainException {
    return this.createNoDetails(
      AccessControlErrorCode.CANNOT_ACCESS_USER_RECORDS,
    );
  }

  static missingPermission(permission: string): DomainException {
    return this.createWithDetails(AccessControlErrorCode.MISSING_PERMISSION, {
      permission,
    });
  }
}
