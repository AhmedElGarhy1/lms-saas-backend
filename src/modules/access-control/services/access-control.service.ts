import { Inject, Injectable, forwardRef, Logger } from '@nestjs/common';
import { AccessControlErrors } from '../exceptions/access-control.errors';
import { CommonErrors } from '@/shared/common/exceptions/common.errors';
import { UserAccess } from '@/modules/access-control/entities/user-access.entity';
import { AccessControlHelperService } from './access-control-helper.service';
import { UserAccessRepository } from '../repositories/user-access.repository';
import { CenterAccessRepository } from '../repositories/center-access.repository';
import { CenterAccessDto } from '../dto/center-access.dto';
import { UserAccessDto } from '@/modules/user/dto/user-access.dto';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { AccessControlEvents } from '@/shared/events/access-control.events.enum';
import {
  ActivateCenterAccessEvent,
  DeactivateCenterAccessEvent,
} from '../events/access-control.events';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { BaseService } from '@/shared/common/services/base.service';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { RolesService } from './roles.service';
import { PERMISSIONS, PermissionScope } from '../constants/permissions';
import { UserProfilePermissionService } from './user-profile-permission.service';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { UserProfileErrors } from '@/modules/user-profile/exceptions/user-profile.errors';

@Injectable()
export class AccessControlService extends BaseService {
  private readonly logger: Logger = new Logger(AccessControlService.name);

  constructor(
    @Inject(forwardRef(() => AccessControlHelperService))
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly userAccessRepository: UserAccessRepository,
    private readonly centerAccessRepository: CenterAccessRepository,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
    @Inject(forwardRef(() => UserProfileService))
    private readonly userProfileService: UserProfileService,
    private readonly rolesService: RolesService,
    private readonly userProfilePermissionService: UserProfilePermissionService,
  ) {
    super();
  }

  async grantUserAccess(
    body: UserAccessDto,
    actor: ActorUser,
    skipExsitance: boolean = false,
  ): Promise<void> {
    const centerId = body.centerId ?? actor.centerId ?? '';
    body.centerId = centerId;

    await this.userProfilePermissionService.canGrantUserAccess(
      actor,
      body.targetUserProfileId,
      centerId,
    );

    const IHaveAccessToGranterUser =
      await this.accessControlHelperService.canUserAccess({
        granterUserProfileId: actor.userProfileId,
        targetUserProfileId: body.granterUserProfileId,
        centerId,
      });

    if (!IHaveAccessToGranterUser && !skipExsitance) {
      throw AccessControlErrors.cannotAccessGranterUser();
    }

    const IHaveAccessToTargetUser =
      await this.accessControlHelperService.canUserAccess({
        granterUserProfileId: actor.userProfileId,
        targetUserProfileId: body.targetUserProfileId,
        centerId,
      });

    if (!IHaveAccessToTargetUser && !skipExsitance) {
      throw AccessControlErrors.cannotAccessUserRecords();
    }

    const isGranterSuperAdmin =
      await this.accessControlHelperService.isSuperAdmin(
        body.granterUserProfileId,
      );
    if (isGranterSuperAdmin && !skipExsitance) {
      throw AccessControlErrors.cannotAccessUserRecords();
    }

    const canAccess = await this.accessControlHelperService.canUserAccess({
      granterUserProfileId: body.granterUserProfileId,
      targetUserProfileId: body.targetUserProfileId,
      centerId: body.centerId,
    });

    if (canAccess && !skipExsitance) {
      throw AccessControlErrors.userAlreadyHasAccess();
    }

    await this.userAccessRepository.grantUserAccess(body);
  }

  async revokeUserAccess(
    body: UserAccessDto,
    actor: ActorUser,
    skipExsitance: boolean = false,
  ): Promise<void> {
    const centerId = body.centerId ?? actor.centerId ?? '';
    body.centerId = centerId;

    await this.userProfilePermissionService.canGrantUserAccess(
      actor,
      body.targetUserProfileId,
      centerId,
    );

    await this.userProfilePermissionService.canGrantUserAccess(
      actor,
      body.targetUserProfileId,
      centerId,
    );

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
      throw AccessControlErrors.cannotAccessUserRecords();
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
      throw AccessControlErrors.cannotAccessTargetUser();
    }

    // Check if access exists
    const canAccess = await this.accessControlHelperService.canUserAccess(body);

    if (!canAccess && !skipExsitance) {
      throw AccessControlErrors.cannotAccessUserRecords();
    }

    await this.userAccessRepository.revokeUserAccess(body);
  }

  // Center Access Management Methods

  async grantCenterAccess(
    dto: CenterAccessDto,
    actor: ActorUser,
    skipExsitance: boolean = false,
    skipUserAccessValidation: boolean = false,
  ) {
    // i have access to the center
    await this.accessControlHelperService.validateCenterAccess({
      userProfileId: actor.userProfileId,
      centerId: dto.centerId ?? actor.centerId,
    });
    // i have access to the target user
    if (!skipUserAccessValidation) {
      await this.accessControlHelperService.validateUserAccess({
        granterUserProfileId: actor.userProfileId,
        targetUserProfileId: dto.userProfileId,
        centerId: dto.centerId ?? actor.centerId,
      });
    }
    // Check if access exists
    const canCenterAccess =
      await this.accessControlHelperService.canCenterAccess({
        userProfileId: dto.userProfileId,
        centerId: dto.centerId ?? actor.centerId,
      });

    if (canCenterAccess && !skipExsitance) {
      throw AccessControlErrors.centerAccessAlreadyExists();
    }

    return await this.centerAccessRepository.grantCenterAccess(dto);
  }

  async revokeCenterAccess(
    dto: CenterAccessDto,
    actor: ActorUser,
    skipExsitance: boolean = false,
  ) {
    // i have access to the center
    await this.accessControlHelperService.validateCenterAccess({
      userProfileId: actor.userProfileId,
      centerId: dto.centerId ?? actor.centerId,
    });

    // Validate that actor has permission to grant center access for the target profile type
    await this.userProfilePermissionService.canGrantCenterAccess(
      actor,
      dto.userProfileId,
      dto.centerId ?? actor.centerId,
    );

    // i have access to the target user
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: dto.userProfileId,
      centerId: dto.centerId ?? actor.centerId,
    });

    // Check if access exists
    const canCenterAccess =
      await this.accessControlHelperService.canCenterAccess({
        userProfileId: dto.userProfileId,
        centerId: dto.centerId ?? actor.centerId,
      });

    if (!canCenterAccess && !skipExsitance) {
      throw AccessControlErrors.centerAccessNotFound();
    }

    return await this.centerAccessRepository.revokeCenterAccess(dto);
  }

  // Additional methods needed by other services

  async getAccessibleProfileIds(profileId: string): Promise<string[]> {
    const userAccesses =
      await this.userAccessRepository.listUserAccesses(profileId);
    return userAccesses.map((access: UserAccess) => access.targetUserProfileId);
  }

  async softRemoveCenterAccess(
    body: CenterAccessDto,
    actor: ActorUser,
  ): Promise<void> {
    const centerId = body.centerId ?? actor.centerId ?? '';

    // Validate actor has center access
    await this.accessControlHelperService.validateCenterAccess({
      userProfileId: actor.userProfileId,
      centerId,
    });

    const profile = await this.userProfileService.findOne(body.userProfileId);
    if (!profile) {
      throw UserProfileErrors.userProfileNotFound();
    }

    let requiredPermission: { action: string; scope: PermissionScope };
    if (profile.profileType === ProfileType.STAFF) {
      requiredPermission = PERMISSIONS.STAFF.DELETE_CENTER_ACCESS;
    } else if (profile.profileType === ProfileType.STUDENT) {
      requiredPermission = PERMISSIONS.STUDENT.DELETE_CENTER_ACCESS;
    } else if (profile.profileType === ProfileType.TEACHER) {
      requiredPermission = PERMISSIONS.TEACHER.DELETE_CENTER_ACCESS;
    } else {
      throw AccessControlErrors.unsupportedProfileTypeForCenterAccess();
    }

    const hasPermission = await this.rolesService.hasPermission(
      actor.userProfileId,
      requiredPermission.action,
      requiredPermission.scope,
      centerId,
    );

    if (!hasPermission) {
      throw AccessControlErrors.cannotAccessUserRecords();
    }

    // Check if target user is an admin - prevent deletion of admin center access
    const isTargetAdmin = await this.accessControlHelperService.isAdmin(
      body.userProfileId,
    );
    if (isTargetAdmin) {
      throw AccessControlErrors.cannotDeleteAdminCenterAccess();
    }

    const centerAccess =
      await this.accessControlHelperService.findCenterAccess(body);
    if (!centerAccess) {
      throw AccessControlErrors.centerAccessNotFound();
    }
    if (centerAccess.deletedAt) {
      throw AccessControlErrors.centerAccessAlreadyDeleted();
    }

    await this.centerAccessRepository.softRemove(centerAccess.id);
  }

  async restoreCenterAccess(
    body: CenterAccessDto,
    actor: ActorUser,
  ): Promise<void> {
    const centerId = body.centerId ?? actor.centerId ?? '';

    // Validate actor has center access
    await this.accessControlHelperService.validateCenterAccess({
      userProfileId: actor.userProfileId,
      centerId,
    });

    const profile = await this.userProfileService.findOne(body.userProfileId);
    if (!profile) {
      throw UserProfileErrors.userProfileNotFound();
    }

    let requiredPermission: { action: string; scope: PermissionScope };
    if (profile.profileType === ProfileType.STAFF) {
      requiredPermission = PERMISSIONS.STAFF.RESTORE_CENTER_ACCESS;
    } else if (profile.profileType === ProfileType.STUDENT) {
      requiredPermission = PERMISSIONS.STUDENT.RESTORE_CENTER_ACCESS;
    } else if (profile.profileType === ProfileType.TEACHER) {
      requiredPermission = PERMISSIONS.TEACHER.RESTORE_CENTER_ACCESS;
    } else {
      throw AccessControlErrors.unsupportedProfileTypeForCenterAccess();
    }

    const hasPermission = await this.rolesService.hasPermission(
      actor.userProfileId,
      requiredPermission.action,
      requiredPermission.scope,
      centerId,
    );

    if (!hasPermission) {
      throw AccessControlErrors.cannotAccessUserRecords();
    }

    const centerAccess = await this.accessControlHelperService.findCenterAccess(
      body,
      true,
    );
    if (!centerAccess) {
      throw AccessControlErrors.centerAccessNotFound();
    }
    if (!centerAccess.deletedAt) {
      throw AccessControlErrors.cannotRestoreActiveCenterAccess();
    }
    await this.centerAccessRepository.restore(centerAccess.id);
  }

  async activateCenterAccess(
    body: CenterAccessDto,
    isActive: boolean,
    actor: ActorUser,
  ): Promise<void> {
    const centerId = body.centerId ?? actor.centerId ?? '';

    // Validate actor has center access
    await this.accessControlHelperService.validateCenterAccess({
      userProfileId: actor.userProfileId,
      centerId,
    });

    const profile = await this.userProfileService.findOne(body.userProfileId);
    if (!profile) {
      throw UserProfileErrors.userProfileNotFound();
    }

    let requiredPermission: { action: string; scope: PermissionScope };
    if (profile.profileType === ProfileType.STAFF) {
      requiredPermission = PERMISSIONS.STAFF.ACTIVATE_CENTER_ACCESS;
    } else if (profile.profileType === ProfileType.STUDENT) {
      requiredPermission = PERMISSIONS.STUDENT.ACTIVATE_CENTER_ACCESS;
    } else if (profile.profileType === ProfileType.TEACHER) {
      requiredPermission = PERMISSIONS.TEACHER.ACTIVATE_CENTER_ACCESS;
    } else {
      throw AccessControlErrors.unsupportedProfileTypeForCenterAccess();
    }

    const hasPermission = await this.rolesService.hasPermission(
      actor.userProfileId,
      requiredPermission.action,
      requiredPermission.scope,
      centerId,
    );

    if (!hasPermission) {
      throw AccessControlErrors.cannotAccessUserRecords();
    }

    // Check if target user is an admin - prevent deactivation of admin center access
    if (!isActive) {
      const isTargetAdmin = await this.accessControlHelperService.isAdmin(
        body.userProfileId,
      );
      if (isTargetAdmin) {
        throw AccessControlErrors.cannotModifyAdminCenterAccess();
      }
    }

    const centerAccess =
      await this.accessControlHelperService.findCenterAccess(body);
    if (!centerAccess) {
      throw AccessControlErrors.centerAccessNotFound();
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
