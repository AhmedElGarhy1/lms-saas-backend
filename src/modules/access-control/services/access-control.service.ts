import {
  Inject,
  Injectable,
  forwardRef,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import {
  BusinessLogicException,
  InsufficientPermissionsException,
  ResourceNotFoundException,
  ValidationFailedException,
} from '@/shared/common/exceptions/custom.exceptions';
import { I18nPath } from '@/generated/i18n.generated';
import { UserAccess } from '@/modules/access-control/entities/user-access.entity';
import { AccessControlHelperService } from './access-control-helper.service';
import { UserAccessRepository } from '../repositories/user-access.repository';
import { CenterAccessRepository } from '../repositories/center-access.repository';
import { CenterAccessDto } from '../dto/center-access.dto';
import { UserAccessDto } from '@/modules/user/dto/user-access.dto';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { BranchAccessDto } from '../dto/branch-access.dto';
import { BranchAccessRepository } from '../repositories/branch-access.repository';
import { AccessControlEvents } from '@/shared/events/access-control.events.enum';
import {
  ActivateCenterAccessEvent,
  DeactivateCenterAccessEvent,
} from '../events/access-control.events';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { BaseService } from '@/shared/common/services/base.service';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { RolesService } from './roles.service';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { PERMISSIONS } from '../constants/permissions';

@Injectable()
export class AccessControlService extends BaseService {
  private readonly logger: Logger = new Logger(AccessControlService.name);

  constructor(
    @Inject(forwardRef(() => AccessControlHelperService))
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly userAccessRepository: UserAccessRepository,
    private readonly centerAccessRepository: CenterAccessRepository,
    private readonly branchAccessRepository: BranchAccessRepository,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
    @Inject(forwardRef(() => UserProfileService))
    private readonly userProfileService: UserProfileService,
    private readonly rolesService: RolesService,
  ) {
    super();
  }

  async grantUserAccess(body: UserAccessDto): Promise<void> {
    await this.userAccessRepository.grantUserAccess(body);
  }

  async grantUserAccessInternal(body: UserAccessDto): Promise<void> {
    await this.userAccessRepository.grantUserAccess(body);
  }

  async revokeUserAccess(body: UserAccessDto): Promise<void> {
    await this.userAccessRepository.revokeUserAccess(body);
  }

  /**
   * Validates that the actor has permission to grant/revoke user access based on target profile type
   * @param actor The user performing the action
   * @param targetUserProfileId The target user profile ID to check profile type
   * @param centerId Optional center ID for permission scope
   */
  private async validateUserAccessPermission(
    actor: ActorUser,
    targetUserProfileId: string,
    centerId?: string,
  ): Promise<void> {
    // Get target user profile to determine profile type
    const targetProfile =
      await this.userProfileService.findOne(targetUserProfileId);
    if (!targetProfile) {
      throw new ResourceNotFoundException('t.errors.userProfileNotFound');
    }

    // Determine which permission to check based on target profile type
    let requiredPermission;
    if (targetProfile.profileType === ProfileType.STAFF) {
      requiredPermission = PERMISSIONS.STAFF.GRANT_USER_ACCESS;
    } else if (targetProfile.profileType === ProfileType.ADMIN) {
      // For admin profiles, use GRANT_ADMIN_ACCESS as it's the equivalent permission
      requiredPermission = PERMISSIONS.ADMIN.GRANT_ADMIN_ACCESS;
    } else {
      throw new ValidationFailedException('t.errors.validationFailed');
    }

    // Check if actor has the required permission
    const hasPermission = await this.rolesService.hasPermission(
      actor.userProfileId,
      requiredPermission.action,
      requiredPermission.scope,
      centerId ?? actor.centerId,
    );

    if (!hasPermission) {
      throw new InsufficientPermissionsException(
        't.errors.insufficientPermissions' as I18nPath,
        {
          action: requiredPermission.action,
          profileType: targetProfile.profileType,
        },
      );
    }
  }

  async grantUserAccessValidate(
    body: UserAccessDto,
    actor: ActorUser,
  ): Promise<void> {
    const centerId = body.centerId ?? actor.centerId ?? '';
    body.centerId = centerId;

    // Validate that actor has permission to grant user access for the target profile type
    await this.validateUserAccessPermission(
      actor,
      body.targetUserProfileId,
      centerId,
    );

    // Check user already have access
    const IHaveAccessToGranterUser =
      await this.accessControlHelperService.canUserAccess({
        granterUserProfileId: actor.userProfileId,
        targetUserProfileId: body.granterUserProfileId,
        centerId,
      });

    if (!IHaveAccessToGranterUser) {
      throw new InsufficientPermissionsException(
        't.errors.noAccessToGranterUser',
      );
    }

    const IHaveAccessToTargetUser =
      await this.accessControlHelperService.canUserAccess({
        granterUserProfileId: actor.userProfileId,
        targetUserProfileId: body.targetUserProfileId,
        centerId,
      });

    if (!IHaveAccessToTargetUser) {
      throw new InsufficientPermissionsException(
        't.errors.noAccessToTargetUser',
      );
    }

    // check if target user have height role
    const isGranterSuperAdmin =
      await this.accessControlHelperService.isSuperAdmin(
        body.granterUserProfileId,
      );
    if (isGranterSuperAdmin) {
      throw new InsufficientPermissionsException(
        't.errors.superAdminCanAccessAnyUser',
      );
    }

    // Check if access already exists
    const canAccess = await this.accessControlHelperService.canUserAccess({
      granterUserProfileId: body.granterUserProfileId,
      targetUserProfileId: body.targetUserProfileId,
      centerId: body.centerId,
    });

    if (canAccess) {
      throw new BusinessLogicException('t.errors.userAlreadyHasAccess');
    }

    await this.grantUserAccess(body);
  }

  async revokeUserAccessValidate(
    body: UserAccessDto,
    actor: ActorUser,
  ): Promise<void> {
    const centerId = body.centerId ?? actor.centerId ?? '';
    body.centerId = centerId;

    // Validate that actor has permission to revoke user access for the target profile type
    await this.validateUserAccessPermission(
      actor,
      body.targetUserProfileId,
      centerId,
    );

    // Check user already have access
    const IHaveAccessToGranterUser =
      await this.accessControlHelperService.canUserAccess({
        granterUserProfileId: actor.userProfileId,
        targetUserProfileId: body.granterUserProfileId,
        centerId,
      });

    if (!IHaveAccessToGranterUser) {
      this.logger.warn(
        'Revoke user access failed - no access to granter user',
        {
          granterUserProfileId: body.granterUserProfileId,
          actorId: actor.userProfileId,
          centerId,
        },
      );
      throw new InsufficientPermissionsException(
        't.errors.noAccessToGranterUser',
      );
    }

    const IHaveAccessToTargetUser =
      await this.accessControlHelperService.canUserAccess({
        granterUserProfileId: actor.userProfileId,
        targetUserProfileId: body.targetUserProfileId,
        centerId,
      });

    if (!IHaveAccessToTargetUser) {
      this.logger.warn('Revoke user access failed - no access to target user', {
        targetUserProfileId: body.targetUserProfileId,
        actorId: actor.userProfileId,
        centerId,
      });
      throw new InsufficientPermissionsException(
        't.errors.noAccessToTargetUser',
      );
    }

    // Check if access exists
    const canAccess = await this.accessControlHelperService.canUserAccess(body);

    if (!canAccess) {
      throw new InsufficientPermissionsException(
        't.errors.userDoesNotHaveAccess',
      );
    }

    await this.revokeUserAccess(body);
  }

  // Center Access Management Methods

  async grantCenterAccess(dto: CenterAccessDto, actor: ActorUser) {
    // Validate that the granter has permission to grant access
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: dto.userProfileId,
      centerId: dto.centerId,
    });

    const result = await this.centerAccessRepository.grantCenterAccess(dto);

    return result;
  }

  async grantCenterAccessAndValidatePermission(
    dto: CenterAccessDto,
    actor: ActorUser,
  ) {
    // Get target user profile
    const targetProfile = await this.userProfileService.findOne(
      dto.userProfileId,
    );
    if (!targetProfile) {
      throw new ResourceNotFoundException('t.errors.userProfileNotFound');
    }

    // Determine which permission to check based on target profile type
    let requiredPermission;
    if (targetProfile.profileType === ProfileType.STAFF) {
      requiredPermission = PERMISSIONS.STAFF.GRANT_CENTER_ACCESS;
    } else if (targetProfile.profileType === ProfileType.ADMIN) {
      requiredPermission = PERMISSIONS.ADMIN.GRANT_CENTER_ACCESS;
    } else {
      throw new ValidationFailedException(
        't.errors.invalidProfileTypeForCenterAccess',
      );
    }

    // Check if actor has the required permission
    const hasPermission = await this.rolesService.hasPermission(
      actor.userProfileId,
      requiredPermission.action,
      requiredPermission.scope,
      dto.centerId ?? actor.centerId,
    );

    if (!hasPermission) {
      throw new ForbiddenException('t.errors.insufficientPermissions');
    }

    // Grant center access (this will also validate user access)
    return await this.grantCenterAccess(dto, actor);
  }

  async revokeCenterAccess(dto: CenterAccessDto, actor: ActorUser) {
    // Validate that the granter has permission to revoke access
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: dto.userProfileId,
      centerId: dto.centerId,
    });

    const result = await this.centerAccessRepository.revokeCenterAccess(dto);

    return result;
  }

  // Additional methods needed by other services

  async getAccessibleProfileIds(profileId: string): Promise<string[]> {
    const userAccesses =
      await this.userAccessRepository.listUserAccesses(profileId);
    return userAccesses.map((access: UserAccess) => access.targetUserProfileId);
  }

  async assignProfileToBranch(data: BranchAccessDto, actor: ActorUser) {
    const centerId = data.centerId ?? actor.centerId ?? '';

    // Validate access (can actor manage this profile?)
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: data.userProfileId,
      centerId,
    });

    const canAccess =
      await this.accessControlHelperService.canBranchAccess(data);
    if (canAccess) {
      throw new BusinessLogicException(
        't.errors.profileAlreadyAssignedToBranch',
      );
    }

    // Create new assignment
    const branchAccess =
      await this.branchAccessRepository.grantBranchAccess(data);

    return branchAccess;
  }

  async removeUserFromBranch(data: BranchAccessDto, actor: ActorUser) {
    const centerId = data.centerId ?? actor.centerId ?? '';

    // Validate access (can actor manage this profile?)
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: data.userProfileId,
      centerId,
    });

    await this.accessControlHelperService.validateBranchAccess(data);

    const result = await this.branchAccessRepository.revokeBranchAccess(data);

    return result;
  }

  async softRemoveCenterAccess(
    body: CenterAccessDto,
    actor: ActorUser,
  ): Promise<void> {
    const centerId = body.centerId ?? actor.centerId ?? '';

    // Check permission
    const hasPermission = await this.rolesService.hasPermission(
      actor.userProfileId,
      PERMISSIONS.STAFF.DELETE_CENTER_ACCESS.action,
      PERMISSIONS.STAFF.DELETE_CENTER_ACCESS.scope,
      centerId,
    );

    if (!hasPermission) {
      throw new InsufficientPermissionsException(
        't.errors.insufficientPermissions' as I18nPath,
        {
          action: PERMISSIONS.STAFF.DELETE_CENTER_ACCESS.action,
        },
      );
    }

    // Check if target user is an admin - prevent deletion of admin center access
    const isTargetAdmin = await this.accessControlHelperService.isAdmin(
      body.userProfileId,
    );
    if (isTargetAdmin) {
      throw new BusinessLogicException(
        't.errors.cannotDeleteAdminCenterAccess',
      );
    }

    // Validate access (can actor manage this profile?)
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: body.userProfileId,
      centerId,
    });

    const centerAccess =
      await this.accessControlHelperService.findCenterAccess(body);
    if (!centerAccess) {
      throw new ResourceNotFoundException('t.errors.centerAccessNotFound');
    }
    if (centerAccess.deletedAt) {
      throw new BusinessLogicException('t.errors.centerAccessAlreadyDeleted');
    }

    await this.centerAccessRepository.softRemove(centerAccess.id);
  }

  async restoreCenterAccess(
    body: CenterAccessDto,
    actor: ActorUser,
  ): Promise<void> {
    const centerId = body.centerId ?? actor.centerId ?? '';

    // Check permission
    const hasPermission = await this.rolesService.hasPermission(
      actor.userProfileId,
      PERMISSIONS.STAFF.RESTORE_CENTER_ACCESS.action,
      PERMISSIONS.STAFF.RESTORE_CENTER_ACCESS.scope,
      centerId,
    );

    if (!hasPermission) {
      throw new InsufficientPermissionsException(
        't.errors.insufficientPermissions' as I18nPath,
        {
          action: PERMISSIONS.STAFF.RESTORE_CENTER_ACCESS.action,
        },
      );
    }

    // Validate access (can actor manage this profile?)
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: body.userProfileId,
      centerId,
    });

    const centerAccess = await this.accessControlHelperService.findCenterAccess(
      body,
      true,
    );
    if (!centerAccess) {
      throw new ResourceNotFoundException('t.errors.centerAccessNotFound');
    }
    if (!centerAccess.deletedAt) {
      throw new BusinessLogicException('t.errors.centerAccessNotDeleted');
    }
    await this.centerAccessRepository.restore(centerAccess.id);
  }

  async activateCenterAccess(
    body: CenterAccessDto,
    isActive: boolean,
    actor: ActorUser,
  ): Promise<void> {
    const centerId = body.centerId ?? actor.centerId ?? '';

    // Check permission
    const hasPermission = await this.rolesService.hasPermission(
      actor.userProfileId,
      PERMISSIONS.STAFF.ACTIVATE_CENTER_ACCESS.action,
      PERMISSIONS.STAFF.ACTIVATE_CENTER_ACCESS.scope,
      centerId,
    );

    if (!hasPermission) {
      throw new InsufficientPermissionsException(
        't.errors.insufficientPermissions' as I18nPath,
        {
          action: PERMISSIONS.STAFF.ACTIVATE_CENTER_ACCESS.action,
        },
      );
    }

    // Check if target user is an admin - prevent deactivation of admin center access
    if (!isActive) {
      const isTargetAdmin = await this.accessControlHelperService.isAdmin(
        body.userProfileId,
      );
      if (isTargetAdmin) {
        throw new BusinessLogicException(
          't.errors.cannotDeactivateAdminCenterAccess',
        );
      }
    }

    // Validate access (can actor manage this profile?)
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: body.userProfileId,
      centerId,
    });

    const centerAccess =
      await this.accessControlHelperService.findCenterAccess(body);
    if (!centerAccess) {
      throw new ResourceNotFoundException('t.errors.centerAccessNotFound');
    }
    await this.centerAccessRepository.update(centerAccess.id, { isActive });

    // Emit event for activity logging
    // targetUserId can be omitted - ActivityLogService will resolve it from userProfileId in event metadata
    if (isActive) {
      await this.typeSafeEventEmitter.emitAsync(
        AccessControlEvents.ACTIVATE_CENTER_ACCESS,
        new ActivateCenterAccessEvent(
          body.userProfileId,
          body.centerId,
          isActive,
          actor,
          undefined, // Let ActivityLogService resolve from metadata
        ),
      );
    } else {
      await this.typeSafeEventEmitter.emitAsync(
        AccessControlEvents.DEACTIVATE_CENTER_ACCESS,
        new DeactivateCenterAccessEvent(
          body.userProfileId,
          body.centerId,
          isActive,
          actor,
          undefined, // Let ActivityLogService resolve from metadata
        ),
      );
    }
  }
}
