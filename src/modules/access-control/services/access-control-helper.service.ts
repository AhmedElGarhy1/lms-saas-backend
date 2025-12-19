import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import {
  InsufficientPermissionsException,
  AdminScopeAccessDeniedException,
  CenterAccessDeniedException,
  CenterAccessInactiveException,
  InactiveCenterException,
} from '@/shared/common/exceptions/custom.exceptions';
import { In } from 'typeorm';
import { UserAccess } from '../entities/user-access.entity';
import { ProfileRoleRepository } from '../repositories/profile-role.repository';
import { UserAccessRepository } from '../repositories/user-access.repository';
import { CenterAccessRepository } from '../repositories/center-access.repository';
import { UserAccessDto } from '@/modules/user/dto/user-access.dto';
import { CenterAccessDto } from '../dto/center-access.dto';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { PermissionScope } from '../constants/permissions';
import { RolesService } from './roles.service';
import { CentersService } from '@/modules/centers/services/centers.service';
import { BranchAccessService } from '@/modules/centers/services/branch-access.service';
import { CenterAccess } from '../entities/center-access.entity';
import { BaseService } from '@/shared/common/services/base.service';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import {
  AccessControlCacheService,
  RolesCacheData,
} from '@/shared/common/services/access-control-cache.service';

@Injectable()
export class AccessControlHelperService extends BaseService {
  private readonly logger: Logger = new Logger(AccessControlHelperService.name);

  constructor(
    private readonly profileRoleRepository: ProfileRoleRepository,
    private readonly userAccessRepository: UserAccessRepository,
    private readonly centerAccessRepository: CenterAccessRepository,
    private readonly centersService: CentersService,
    private readonly rolesService: RolesService,
    private readonly userProfileService: UserProfileService,
    @Inject(forwardRef(() => BranchAccessService))
    private readonly branchAccessService: BranchAccessService,
  ) {
    super();
  }

  /**
   * Validate if the user has admin or super admin access or center access
   * @param userId - The user id
   * @param centerId - The center id
   * @returns void
   */
  async validateAdminAndCenterAccess({
    userProfileId,
    centerId,
  }: {
    userProfileId: string;
    centerId?: string;
  }) {
    if (centerId) {
      await this.validateCenterAccess(
        {
          userProfileId,
          centerId,
        },
        {
          includeDeleted: false,
          includeInactive: false,
          includeDeletedCenter: false,
          includeInactiveCenter: false,
        },
      );

      return;
    } else {
      await this.validateAdminAccess({ userProfileId });
      return;
    }

    // now it doesn't allow access to any user that doesn't have SUPER_ADMIN role or have center access
  }

  /**
   * Validate if the user has admin or super admin access
   * @param userId - The user id
   * @returns void
   */
  async validateAdminAccess({ userProfileId }: { userProfileId: string }) {
    const isSuperAdmin = await this.isSuperAdmin(userProfileId);
    if (isSuperAdmin) {
      return;
    }
    const haveAdminRole = await this.isAdmin(userProfileId);
    if (haveAdminRole) {
      return;
    }
    this.logger.warn('Admin access validation failed', { userProfileId });
    throw new AdminScopeAccessDeniedException('t.messages.accessDenied', {
      resource: 't.resources.adminScope',
    });
  }

  async getProfileRole(userProfileId: string, centerId?: string) {
    return this.profileRoleRepository.getProfileRole(userProfileId, centerId);
  }

  async getAccessibleProfilesIdsForUser(
    userProfileId: string,
    targetProfileIds: string[],
    centerId?: string,
    profileType?: ProfileType,
  ): Promise<string[]> {
    // Early return: if empty array, return []
    if (targetProfileIds.length === 0) {
      return [];
    }

    // Batch load: Use findManyUserAccess to load all records in one query
    const userAccesses = await this.userAccessRepository.findManyUserAccess(
      userProfileId,
      targetProfileIds,
      centerId,
      profileType,
    );

    // Cache results: Store each in user access cache (including nulls)
    const accessibleSet = new Set<string>();
    const processedProfileIds = new Set<string>();

    for (const userAccess of userAccesses) {
      accessibleSet.add(userAccess.targetUserProfileId);
      processedProfileIds.add(userAccess.targetUserProfileId);
      // Cache the user access
      AccessControlCacheService.setUserAccess(
        userAccess.granterUserProfileId,
        userAccess.targetUserProfileId,
        userAccess.centerId ?? null,
        {
          userAccess,
          hasUserAccess: true,
        },
      );
    }

    // Cache nulls for profiles that don't have user access
    for (const targetProfileId of targetProfileIds) {
      if (!processedProfileIds.has(targetProfileId)) {
        AccessControlCacheService.setUserAccess(
          userProfileId,
          targetProfileId,
          centerId ?? null,
          {
            userAccess: null,
            hasUserAccess: false,
          },
        );
      }
    }

    // Build accessible set: Include profiles with bypass access (single cached check for granter)
    // If granter has bypass access (super admin, center owner, or admin with center access),
    // all target profiles are accessible regardless of user access records
    const bypassAccess = await this.bypassCenterInternalAccess(
      userProfileId,
      centerId,
    );

    const results: string[] = [];
    for (const targetProfileId of targetProfileIds) {
      if (accessibleSet.has(targetProfileId)) {
        results.push(targetProfileId);
      } else if (bypassAccess) {
        // Granter has bypass access, so all targets are accessible
        results.push(targetProfileId);
      }
    }

    return results;
  }

  async getAccessibleProfilesIdsForCenter(
    centerId: string,
    targetProfileIds: string[],
  ): Promise<string[]> {
    // Early return: if empty array, return []
    if (targetProfileIds.length === 0) {
      return [];
    }

    // Batch load: Use findManyCenterAccess to load all records in one query
    const centerAccesses =
      await this.centerAccessRepository.findManyCenterAccess(
        targetProfileIds,
        centerId,
      );

    // Cache results: Store each in center access cache (including nulls)
    const accessibleSet = new Set<string>();
    const processedProfileIds = new Set<string>();

    for (const centerAccess of centerAccesses) {
      accessibleSet.add(centerAccess.userProfileId);
      processedProfileIds.add(centerAccess.userProfileId);
      // Cache the center access
      const currentCache =
        AccessControlCacheService.getCenterAccess(
          centerAccess.userProfileId,
          centerAccess.centerId,
        ) ?? {};
      AccessControlCacheService.setCenterAccess(
        centerAccess.userProfileId,
        centerAccess.centerId,
        {
          ...currentCache,
          centerAccess,
          hasCenterAccess: true,
        },
      );
    }

    // Cache nulls for profiles that don't have center access
    for (const targetProfileId of targetProfileIds) {
      if (!processedProfileIds.has(targetProfileId)) {
        const currentCache =
          AccessControlCacheService.getCenterAccess(
            targetProfileId,
            centerId,
          ) ?? {};
        AccessControlCacheService.setCenterAccess(targetProfileId, centerId, {
          ...currentCache,
          centerAccess: null,
          hasCenterAccess: false,
        });
      }
    }

    // Build accessible set: Include super admins (single cached check for all)
    // Check if any of the target profiles are super admins
    const results: string[] = [];
    for (const targetProfileId of targetProfileIds) {
      if (accessibleSet.has(targetProfileId)) {
        results.push(targetProfileId);
      } else {
        // Check if super admin (cached)
        const isSuperAdmin = await this.isSuperAdmin(targetProfileId);
        if (isSuperAdmin) {
          results.push(targetProfileId);
        }
      }
    }

    return results;
  }

  /**
   * Get accessible profile IDs for a branch.
   * Delegates to BranchAccessService to maintain module boundaries.
   *
   * @param branchId - The branch ID
   * @param targetProfileIds - Array of profile IDs to check
   * @param centerId - The center ID
   * @returns Array of profile IDs that have branch access
   */
  async getAccessibleProfilesIdsForBranch(
    branchId: string,
    targetProfileIds: string[],
    centerId: string,
  ): Promise<string[]> {
    return this.branchAccessService.getAccessibleProfilesIdsForBranch(
      branchId,
      targetProfileIds,
      centerId,
    );
  }

  async getAccessibleProfilesIdsForRole(
    roleId: string,
    targetProfileIds: string[],
    centerId?: string,
  ): Promise<string[]> {
    const result = await this.profileRoleRepository.findMany({
      where: [
        {
          roleId,
          ...(centerId ? { centerId } : {}),
          userProfileId: In(targetProfileIds),
        },
      ],
    });
    return result.map((result) => result.userProfileId);
  }

  async getAccessibleCentersIdsForProfile(
    userProfileId: string,
    targetCenterIds: string[],
  ): Promise<string[]> {
    // Early return: if empty array, return []
    if (targetCenterIds.length === 0) {
      return [];
    }

    // Check super admin first: Single cached check - if true, return all centerIds
    const isSuperAdmin = await this.isSuperAdmin(userProfileId);
    if (isSuperAdmin) {
      return targetCenterIds;
    }

    // Batch load: Use findManyCenterAccess with userProfileId (loads all center accesses in one query)
    const centerAccesses =
      await this.centerAccessRepository.findManyCenterAccess([userProfileId]);

    // Cache results: Store each in center access cache
    const accessibleCenterIds = new Set<string>();
    for (const centerAccess of centerAccesses) {
      accessibleCenterIds.add(centerAccess.centerId);
      const currentCache =
        AccessControlCacheService.getCenterAccess(
          centerAccess.userProfileId,
          centerAccess.centerId,
        ) ?? {};
      AccessControlCacheService.setCenterAccess(
        centerAccess.userProfileId,
        centerAccess.centerId,
        {
          ...currentCache,
          centerAccess,
          hasCenterAccess: true,
        },
      );
    }

    // Filter: Return centerIds that exist in cached results
    return targetCenterIds.filter((centerId) =>
      accessibleCenterIds.has(centerId),
    );
  }

  async getAccessibleRolesIdsForProfile(
    userProfileId: string,
    centerId?: string,
  ): Promise<string[]> {
    const profileRoles = await this.profileRoleRepository.findProfileRoles(
      userProfileId,
      centerId,
    );
    return profileRoles.map((profileRole) => profileRole.roleId);
  }

  // user access methods
  async findUserAccess(data: UserAccessDto): Promise<UserAccess | null> {
    const { granterUserProfileId, targetUserProfileId, centerId } = data;
    // Defensive check: verify cache exists
    const cached = AccessControlCacheService.getUserAccess(
      granterUserProfileId,
      targetUserProfileId,
      centerId ?? null,
    );
    if (cached !== undefined && cached.userAccess !== undefined) {
      return cached.userAccess;
    }

    // Not cached - query repository
    const userAccess = await this.userAccessRepository.findUserAccess(data);

    // Cache null values explicitly to avoid repeated queries for non-existent records
    AccessControlCacheService.setUserAccess(
      granterUserProfileId,
      targetUserProfileId,
      centerId ?? null,
      {
        ...cached,
        userAccess,
      },
    );

    return userAccess;
  }

  async canUserAccess(data: UserAccessDto): Promise<boolean> {
    const { granterUserProfileId, targetUserProfileId, centerId } = data;
    if (granterUserProfileId === targetUserProfileId) {
      return true;
    }
    const bypassUserAccess = await this.bypassCenterInternalAccess(
      granterUserProfileId,
      centerId,
    );
    if (bypassUserAccess) {
      return true;
    }
    const userAccess = await this.findUserAccess(data);
    return !!userAccess;
  }

  async validateUserAccess(data: UserAccessDto): Promise<void> {
    const userAccess = await this.canUserAccess(data);
    if (!userAccess) {
      this.logger.warn('User access validation failed', {
        granterUserProfileId: data.granterUserProfileId,
        targetUserProfileId: data.targetUserProfileId,
        centerId: data.centerId,
      });
      throw new InsufficientPermissionsException(
        't.messages.accessDeniedToResource',
        {
          resource: 't.resources.user',
        },
      );
    }
  }

  // center access methods

  async findCenterAccess(
    data: CenterAccessDto,
    isDeleted?: boolean,
  ): Promise<CenterAccess | null> {
    const { userProfileId, centerId } = data;
    // Defensive check: verify cache exists, fall back to direct query if missing
    // Note: We only cache non-deleted records. If isDeleted=true, skip cache and query directly.
    if (!isDeleted) {
      const cached = AccessControlCacheService.getCenterAccess(
        userProfileId,
        centerId,
      );
      if (cached !== undefined && cached.centerAccess !== undefined) {
        return cached.centerAccess;
      }
    }

    // Not cached or isDeleted=true - query repository
    const centerAccess = await this.centerAccessRepository.findCenterAccess(
      data,
      isDeleted,
    );

    // Cache null values explicitly to avoid repeated queries for non-existent records
    // Only cache if not deleted
    if (!isDeleted) {
      const currentCache =
        AccessControlCacheService.getCenterAccess(userProfileId, centerId) ??
        {};
      AccessControlCacheService.setCenterAccess(userProfileId, centerId, {
        ...currentCache,
        centerAccess,
      });
    }

    return centerAccess;
  }

  async canCenterAccess(
    data: CenterAccessDto,
    isDeleted: boolean = true,
  ): Promise<boolean> {
    const { userProfileId } = data;
    const isSuperAdmin = await this.isSuperAdmin(userProfileId);
    if (isSuperAdmin) {
      return true;
    }

    const centerAccess = await this.findCenterAccess(data, isDeleted);
    return !!centerAccess;
  }

  async validateCenterAccess(
    data: CenterAccessDto,
    config: {
      includeDeleted?: boolean;
      includeInactive?: boolean;
      includeDeletedCenter?: boolean;
      includeInactiveCenter?: boolean;
    } = {
      includeDeleted: true,
      includeInactive: true,
      includeDeletedCenter: true,
      includeInactiveCenter: true,
    },
  ): Promise<void> {
    // Check if center exists (and is active if not deleted)
    const center = await this.centersService.findCenterById(
      data.centerId,
      undefined,
      config.includeDeletedCenter,
    );

    // Only check if center is active if:
    // 1. Center is not deleted
    // 2. includeInactiveCenter is false (by default allows inactive centers)
    if (
      !config.includeDeletedCenter &&
      !center.isActive &&
      !config.includeInactiveCenter
    ) {
      this.logger.warn(
        'Center validation failed - the center itself is inactive',
        {
          userProfileId: data.userProfileId,
          centerId: data.centerId,
          centerName: center.name,
        },
      );
      throw new InactiveCenterException('t.messages.inactive', {
        resource: 't.resources.center',
      });
    }

    // Check if user has access to the center
    const canAccess = await this.canCenterAccess(data, config.includeDeleted);
    if (!canAccess) {
      this.logger.warn('Center access validation failed', {
        userProfileId: data.userProfileId,
        centerId: data.centerId,
      });
      throw new CenterAccessDeniedException('t.messages.accessDenied', {
        resource: 't.resources.centerAccess',
      });
    }

    // Retrieve from cache if available (only cached for non-deleted records)
    // If not cached (because includeDeleted=true was used), query directly
    let centerAccess =
      AccessControlCacheService.getCenterAccess(
        data.userProfileId,
        data.centerId,
      )?.centerAccess ?? null;

    // If not in cache (because includeDeleted=true doesn't cache), query directly
    if (!centerAccess && config.includeDeleted) {
      centerAccess = await this.findCenterAccess(data, config.includeDeleted);
    }

    // If still null (super admin case or no access record), return early
    if (!centerAccess) return;

    // Check if the user's access to the center is active
    if (!centerAccess.isActive && !config.includeInactive) {
      this.logger.warn('Center access validation failed - access is inactive', {
        userProfileId: data.userProfileId,
        centerId: data.centerId,
      });
      throw new CenterAccessInactiveException('t.messages.inactive', {
        resource: 't.resources.centerAccess',
      });
    }
  }

  /**
   * Load and cache all role data for a user profile.
   * This is called when any role check misses cache to batch-load all role data efficiently.
   * @private
   */
  private async loadAndCacheRoles(
    userProfileId: string,
  ): Promise<RolesCacheData> {
    const [isSuperAdmin, isAdmin, isStaff, userProfile] = await Promise.all([
      this.profileRoleRepository.isSuperAdmin(userProfileId),
      this.userProfileService.isAdmin(userProfileId),
      this.userProfileService.isStaff(userProfileId),
      this.userProfileService.findOne(userProfileId).catch(() => null),
    ]);

    const rolesData: RolesCacheData = {
      isSuperAdmin,
      isAdmin,
      isStaff,
      profileType: userProfile?.profileType,
    };

    AccessControlCacheService.setRoles(userProfileId, rolesData);
    return rolesData;
  }

  async isSuperAdmin(userProfileId: string): Promise<boolean> {
    // Defensive check: if cache not available, fall back to direct query
    const cached = AccessControlCacheService.getRoles(userProfileId);
    if (cached !== undefined) {
      return cached.isSuperAdmin;
    }

    // Not cached - load and cache all role data
    const rolesData = await this.loadAndCacheRoles(userProfileId);
    return rolesData.isSuperAdmin;
  }

  async isCenterOwner(
    userProfileId: string,
    centerId: string,
  ): Promise<boolean> {
    // ⚠️ CRITICAL: This is center-scoped, NOT global role - must use center layer cache
    // Defensive check: verify cache exists
    const cached = AccessControlCacheService.getCenterAccess(
      userProfileId,
      centerId,
    );
    if (cached !== undefined && cached.isOwner !== undefined) {
      return cached.isOwner;
    }

    // Not cached - query repository
    const isOwner = await this.profileRoleRepository.isCenterOwner(
      userProfileId,
      centerId,
    );

    // Cache result in center layer (NOT roles layer)
    // Preserve existing cache data if present
    AccessControlCacheService.setCenterAccess(userProfileId, centerId, {
      ...cached,
      isOwner,
    });

    return isOwner;
  }

  async isAdmin(userProfileId: string): Promise<boolean> {
    // Check cache first
    const cached = AccessControlCacheService.getRoles(userProfileId);
    if (cached !== undefined) {
      return cached.isAdmin;
    }

    // Not cached - load and cache all role data
    const rolesData = await this.loadAndCacheRoles(userProfileId);
    return rolesData.isAdmin;
  }

  async isStaff(userProfileId: string): Promise<boolean> {
    // Reuse roles cache (global role), similar to isAdmin
    const cached = AccessControlCacheService.getRoles(userProfileId);
    if (cached !== undefined) {
      return cached.isStaff;
    }

    // Not cached - load and cache all role data
    const rolesData = await this.loadAndCacheRoles(userProfileId);
    return rolesData.isStaff;
  }

  async bypassCenterInternalAccess(
    userProfileId: string,
    centerId?: string,
  ): Promise<boolean> {
    // All underlying calls are now cached (isSuperAdmin, isCenterOwner, findCenterAccess, isAdmin)
    const isSuperAdmin = await this.isSuperAdmin(userProfileId);
    if (isSuperAdmin) {
      return true;
    }
    if (centerId) {
      const isCenterOwner = await this.isCenterOwner(userProfileId, centerId);
      if (isCenterOwner) {
        return true;
      }
      // Use service method (cached) instead of direct repository call
      const centerAccess = await this.findCenterAccess({
        userProfileId,
        centerId,
      });
      if (centerAccess) {
        const haveAdminRole = await this.isAdmin(userProfileId);
        if (haveAdminRole) {
          return true;
        }
      }
    }
    return false;
  }
  async findUserProfile(userProfileId: string) {
    return this.userProfileService.findOne(userProfileId);
  }

  async hasPermission(
    userProfileId: string,
    permission: string,
    scope: PermissionScope,
    centerId?: string,
  ) {
    return this.rolesService.hasPermission(
      userProfileId,
      permission,
      scope,
      centerId,
    );
  }

  /**
   * Validates if a profile can be assigned to a class (e.g., as teacher)
   * Checks profile type, center access, and optionally user access
   *
   * @param targetUserProfileId - The profile to validate
   * @param centerId - The center ID
   * @param requiredProfileType - Required profile type (e.g., ProfileType.TEACHER)
   * @param actorUserProfileId - Optional actor profile ID for user access check
   * @param checkUserAccess - Whether to validate user access (default: false)
   * @returns boolean - true if valid, false otherwise
   */
  async canAssignProfileToClass(
    targetUserProfileId: string,
    centerId: string,
    requiredProfileType: ProfileType,
    actorUserProfileId?: string,
    checkUserAccess: boolean = false,
  ): Promise<boolean> {
    // Fetch UserProfile by ID
    const profile = await this.userProfileService.findOne(targetUserProfileId);
    if (!profile) {
      return false;
    }

    // Check profile type matches requiredProfileType
    if (profile.profileType !== requiredProfileType) {
      return false;
    }

    // Check center access using canCenterAccess
    const hasCenterAccess = await this.canCenterAccess({
      userProfileId: targetUserProfileId,
      centerId,
    });
    if (!hasCenterAccess) {
      return false;
    }

    // If checkUserAccess and actorUserProfileId provided, check user access
    if (checkUserAccess && actorUserProfileId) {
      const hasUserAccess = await this.canUserAccess({
        granterUserProfileId: actorUserProfileId,
        targetUserProfileId,
        centerId,
      });
      if (!hasUserAccess) {
        return false;
      }
    }

    return true;
  }
}
