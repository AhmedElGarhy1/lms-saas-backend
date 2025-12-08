import { Inject, Injectable, forwardRef, Logger } from '@nestjs/common';
import {
  BusinessLogicException,
  InsufficientPermissionsException,
  ResourceNotFoundException,
} from '@/shared/common/exceptions/custom.exceptions';
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

  async grantUserAccess(body: UserAccessDto): Promise<void> {
    await this.userAccessRepository.grantUserAccess(body);
  }

  async grantUserAccessInternal(body: UserAccessDto): Promise<void> {
    await this.userAccessRepository.grantUserAccess(body);
  }

  async revokeUserAccess(body: UserAccessDto): Promise<void> {
    await this.userAccessRepository.revokeUserAccess(body);
  }

  async grantUserAccessValidate(
    body: UserAccessDto,
    actor: ActorUser,
  ): Promise<void> {
    const centerId = body.centerId ?? actor.centerId ?? '';
    body.centerId = centerId;

    // Validate that actor has permission to grant user access for the target profile type
    await this.userProfilePermissionService.canGrantUserAccess(
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
        't.messages.accessDeniedToResource',
        {
          resource: 't.resources.user',
        },
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
        't.messages.accessDeniedToResource',
        {
          resource: 't.resources.user',
        },
      );
    }

    // check if target user have height role
    const isGranterSuperAdmin =
      await this.accessControlHelperService.isSuperAdmin(
        body.granterUserProfileId,
      );
    if (isGranterSuperAdmin) {
      throw new InsufficientPermissionsException(
        't.messages.accessDeniedToResource',
        {
          resource: 't.resources.user',
        },
      );
    }

    // Check if access already exists
    const canAccess = await this.accessControlHelperService.canUserAccess({
      granterUserProfileId: body.granterUserProfileId,
      targetUserProfileId: body.targetUserProfileId,
      centerId: body.centerId,
    });

    if (canAccess) {
      throw new BusinessLogicException('t.messages.alreadyHas', {
        resource: 't.resources.user',
        what: 't.resources.access',
      });
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
    await this.userProfilePermissionService.canGrantUserAccess(
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
        't.messages.accessDeniedToResource',
        {
          resource: 't.resources.user',
        },
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
        't.messages.accessDeniedToResource',
        {
          resource: 't.resources.user',
        },
      );
    }

    // Check if access exists
    const canAccess = await this.accessControlHelperService.canUserAccess(body);

    if (!canAccess) {
      throw new InsufficientPermissionsException(
        't.messages.accessDeniedToResource',
        {
          resource: 't.resources.access',
        },
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
    // Validate that actor has permission to grant center access for the target profile type
    await this.userProfilePermissionService.canGrantCenterAccess(
      actor,
      dto.userProfileId,
      dto.centerId ?? actor.centerId,
    );

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

  async softRemoveCenterAccess(
    body: CenterAccessDto,
    actor: ActorUser,
  ): Promise<void> {
    const centerId = body.centerId ?? actor.centerId ?? '';

    // Get profile type to determine which permission to check
    const profile = await this.userProfileService.findOne(body.userProfileId);
    if (!profile) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.profile',
        identifier: 't.resources.identifier',
        value: body.userProfileId,
      });
    }

    // Check permission based on profile type
    let requiredPermission: {
      action: string;
      scope: PermissionScope;
    };
    if (profile.profileType === ProfileType.STAFF) {
      requiredPermission = PERMISSIONS.STAFF.DELETE_CENTER_ACCESS as {
        action: string;
        scope: PermissionScope;
      };
    } else if (profile.profileType === ProfileType.STUDENT) {
      requiredPermission = PERMISSIONS.STUDENT.DELETE_CENTER_ACCESS as {
        action: string;
        scope: PermissionScope;
      };
    } else if (profile.profileType === ProfileType.TEACHER) {
      requiredPermission = PERMISSIONS.TEACHER.DELETE_CENTER_ACCESS as {
        action: string;
        scope: PermissionScope;
      };
    } else {
      throw new BusinessLogicException('t.messages.actionNotAllowed', {
        action: 't.buttons.delete',
        resource: 't.resources.centerAccess',
        reason: 'Unsupported profile type',
      });
    }

    const hasPermission = await this.rolesService.hasPermission(
      actor.userProfileId,
      requiredPermission.action,
      requiredPermission.scope,
      centerId,
    );

    if (!hasPermission) {
      throw new InsufficientPermissionsException(
        't.messages.insufficientPermissions',
      );
    }

    // Check if target user is an admin - prevent deletion of admin center access
    const isTargetAdmin = await this.accessControlHelperService.isAdmin(
      body.userProfileId,
    );
    if (isTargetAdmin) {
      throw new BusinessLogicException('t.messages.actionNotAllowed', {
        action: 't.buttons.delete',
        resource: 't.resources.centerAccess',
        reason: 'Admin users cannot have center access deleted',
      });
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
      throw new ResourceNotFoundException('t.messages.notFound', {
        resource: 't.resources.centerAccess',
      });
    }
    if (centerAccess.deletedAt) {
      throw new BusinessLogicException('t.messages.alreadyDeleted', {
        resource: 't.resources.centerAccess',
      });
    }

    await this.centerAccessRepository.softRemove(centerAccess.id);
  }

  async restoreCenterAccess(
    body: CenterAccessDto,
    actor: ActorUser,
  ): Promise<void> {
    const centerId = body.centerId ?? actor.centerId ?? '';

    // Get profile type to determine which permission to check
    const profile = await this.userProfileService.findOne(body.userProfileId);
    if (!profile) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.profile',
        identifier: 't.resources.identifier',
        value: body.userProfileId,
      });
    }

    // Check permission based on profile type
    let requiredPermission: {
      action: string;
      scope: PermissionScope;
    };
    if (profile.profileType === ProfileType.STAFF) {
      requiredPermission = PERMISSIONS.STAFF.RESTORE_CENTER_ACCESS;
    } else if (profile.profileType === ProfileType.STUDENT) {
      requiredPermission = PERMISSIONS.STUDENT.RESTORE_CENTER_ACCESS;
    } else if (profile.profileType === ProfileType.TEACHER) {
      requiredPermission = PERMISSIONS.TEACHER.RESTORE_CENTER_ACCESS;
    } else {
      throw new BusinessLogicException('t.messages.actionNotAllowed', {
        action: 't.buttons.restore',
        resource: 't.resources.centerAccess',
        reason: 'Unsupported profile type',
      });
    }

    const hasPermission = await this.rolesService.hasPermission(
      actor.userProfileId,
      requiredPermission.action,
      requiredPermission.scope,
      centerId,
    );

    if (!hasPermission) {
      throw new InsufficientPermissionsException(
        't.messages.insufficientPermissions',
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
      throw new ResourceNotFoundException('t.messages.notFound', {
        resource: 't.resources.centerAccess',
      });
    }
    if (!centerAccess.deletedAt) {
      throw new BusinessLogicException('t.messages.actionNotAllowed', {
        action: 't.buttons.restore',
        resource: 't.resources.centerAccess',
        reason: 't.messages.notDeleted',
      });
    }
    await this.centerAccessRepository.restore(centerAccess.id);
  }

  async activateCenterAccess(
    body: CenterAccessDto,
    isActive: boolean,
    actor: ActorUser,
  ): Promise<void> {
    const centerId = body.centerId ?? actor.centerId ?? '';

    // Get profile type to determine which permission to check
    const profile = await this.userProfileService.findOne(body.userProfileId);
    if (!profile) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.profile',
        identifier: 't.resources.identifier',
        value: body.userProfileId,
      });
    }

    // Check permission based on profile type
    let requiredPermission: {
      action: string;
      scope: PermissionScope;
    };
    if (profile.profileType === ProfileType.STAFF) {
      requiredPermission = PERMISSIONS.STAFF.ACTIVATE_CENTER_ACCESS;
    } else if (profile.profileType === ProfileType.STUDENT) {
      requiredPermission = PERMISSIONS.STUDENT.ACTIVATE_CENTER_ACCESS;
    } else if (profile.profileType === ProfileType.TEACHER) {
      requiredPermission = PERMISSIONS.TEACHER.ACTIVATE_CENTER_ACCESS;
    } else {
      throw new BusinessLogicException('t.messages.actionNotAllowed', {
        action: isActive ? 't.buttons.enable' : 't.buttons.disable',
        resource: 't.resources.centerAccess',
        reason: 'Unsupported profile type',
      });
    }

    const hasPermission = await this.rolesService.hasPermission(
      actor.userProfileId,
      requiredPermission.action,
      requiredPermission.scope,
      centerId,
    );

    if (!hasPermission) {
      throw new InsufficientPermissionsException(
        't.messages.insufficientPermissions',
      );
    }

    // Check if target user is an admin - prevent deactivation of admin center access
    if (!isActive) {
      const isTargetAdmin = await this.accessControlHelperService.isAdmin(
        body.userProfileId,
      );
      if (isTargetAdmin) {
        throw new BusinessLogicException('t.messages.actionNotAllowed', {
          action: 't.buttons.disable',
          resource: 't.resources.centerAccess',
          reason: 'Admin users cannot have center access deactivated',
        });
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
      throw new ResourceNotFoundException('t.messages.notFound', {
        resource: 't.resources.centerAccess',
      });
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
