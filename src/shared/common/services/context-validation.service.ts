import { Injectable } from '@nestjs/common';
import { AccessControlService } from '@/modules/access-control/services/access-control.service';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { ScopeEnum } from '../constants/role-scope.enum';

@Injectable()
export class ContextValidationService {
  constructor(private readonly accessControlService: AccessControlService) {}

  async validateAdminScope(userId: string): Promise<boolean> {
    const hasAdminRole = await this.accessControlService.userHasRoleType(
      userId,
      RoleType.ADMIN,
    );
    const hasSuperAdminRole = await this.accessControlService.userHasRoleType(
      userId,
      RoleType.SUPER_ADMIN,
    );

    if (hasAdminRole || hasSuperAdminRole) {
      return true;
    }

    throw new Error(
      'User does not have ADMIN or SUPER_ADMIN role for ADMIN scope',
    );
  }

  async validateCenterScope(
    userId: string,
    centerId: string,
  ): Promise<boolean> {
    if (!centerId) {
      throw new Error('Center ID is required for CENTER scope');
    }

    // Check if user has ADMIN or SUPER_ADMIN role (they can access any center)
    const hasAdminRole = await this.accessControlService.userHasRoleType(
      userId,
      RoleType.ADMIN,
    );
    const hasSuperAdminRole = await this.accessControlService.userHasRoleType(
      userId,
      RoleType.SUPER_ADMIN,
    );

    if (hasSuperAdminRole) {
      return true; // SuperAdmin can access any center
    }

    if (hasAdminRole) {
      // TODO: Implement proper AdminCenterAccess check when the relationship is properly defined
      return true; // For now, ADMIN users can access any center
    }

    // For regular users, check UserOnCenter membership
    const hasCenterAccess = await this.accessControlService.checkCenterAccess(
      userId,
      centerId,
    );

    if (!hasCenterAccess) {
      throw new Error('User is not a member of this center');
    }

    return true;
  }

  async validateContext(
    userId: string,
    scopeType: ScopeEnum,
    centerId?: string,
  ): Promise<boolean> {
    if (scopeType === ScopeEnum.ADMIN) {
      return await this.validateAdminScope(userId);
    } else if (scopeType === ScopeEnum.CENTER) {
      if (!centerId) {
        throw new Error('Center ID is required for CENTER scope');
      }
      return await this.validateCenterScope(userId, centerId);
    }

    return true;
  }
}
