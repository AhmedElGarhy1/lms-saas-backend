import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { AccessControlErrors } from '@/modules/access-control/exceptions/access-control.errors';

enum RoleLevel {
  SUPER_ADMIN = 4,
  ADMIN = 3,
  OWNER = 2,
  STAFF = 1,
  OTHER = 0,
}

@Injectable()
export class RoleHierarchyService {
  constructor(
    @Inject(forwardRef(() => AccessControlHelperService))
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {}

  /**
   * Checks if actor has sufficient privileges to operate on target user
   * @param actorUserProfileId - The actor's user profile ID
   * @param targetUserProfileId - The target user profile ID
   * @param centerId - Optional center ID for owner checks (only used when checking owner status)
   * @throws AccessControlErrors if actor cannot operate on target
   */
  async validateCanOperateOnUser(
    actorUserProfileId: string,
    targetUserProfileId: string,
    centerId?: string,
  ): Promise<void> {
    // Get actor's level (centerId is optional - owner check only happens if provided)
    const actorLevel = await this.getUserLevel(actorUserProfileId, centerId);

    // Get target's level (centerId is optional - owner check only happens if provided)
    const targetLevel = await this.getUserLevel(targetUserProfileId, centerId);

    // Compare levels - actor must be higher than or equal to target
    if (!this.canOperate(actorLevel, targetLevel)) {
      throw AccessControlErrors.cannotOperateOnHigherRole();
    }
  }

  private async getUserLevel(
    userProfileId: string,
    centerId?: string,
  ): Promise<RoleLevel> {
    // Check superAdmin first (highest, global, no centerId needed)
    const isSuperAdmin =
      await this.accessControlHelperService.isSuperAdmin(userProfileId);
    if (isSuperAdmin) {
      return RoleLevel.SUPER_ADMIN;
    }

    // Check admin profile type (global, no centerId needed)
    const isAdmin =
      await this.accessControlHelperService.isAdmin(userProfileId);
    if (isAdmin) {
      return RoleLevel.ADMIN;
    }

    // Check owner (center-specific, only if centerId is provided)
    // If centerId is not provided, we skip owner check and continue to staff
    if (centerId) {
      const isOwner = await this.accessControlHelperService.isCenterOwner(
        userProfileId,
        centerId,
      );
      if (isOwner) {
        return RoleLevel.OWNER;
      }
    }

    // Check staff profile type (global, no centerId needed)
    const isStaff =
      await this.accessControlHelperService.isStaff(userProfileId);
    if (isStaff) {
      return RoleLevel.STAFF;
    }

    // Default to lowest level for other profile types (student, teacher, parent)
    return RoleLevel.OTHER;
  }

  private canOperate(actorLevel: RoleLevel, targetLevel: RoleLevel): boolean {
    // superAdmin can operate on anyone
    if (actorLevel === RoleLevel.SUPER_ADMIN) {
      return true;
    }

    // admin can operate on admin, owner, staff, other
    if (actorLevel === RoleLevel.ADMIN) {
      return targetLevel !== RoleLevel.SUPER_ADMIN;
    }

    // owner can operate on owner, staff, other
    if (actorLevel === RoleLevel.OWNER) {
      return (
        targetLevel === RoleLevel.OWNER ||
        targetLevel === RoleLevel.STAFF ||
        targetLevel === RoleLevel.OTHER
      );
    }

    // staff can operate on staff, other
    if (actorLevel === RoleLevel.STAFF) {
      return targetLevel === RoleLevel.STAFF || targetLevel === RoleLevel.OTHER;
    }

    // Others cannot operate on any protected levels
    return false;
  }
}
