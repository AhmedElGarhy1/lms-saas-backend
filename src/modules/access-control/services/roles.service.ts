import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { AccessControlErrors } from '../exceptions/access-control.errors';
import { RolesRepository } from '../repositories/roles.repository';
import { AccessControlHelperService } from './access-control-helper.service';
import { CreateRoleRequestDto } from '../dto/create-role.dto';
import { AssignRoleDto } from '../dto/assign-role.dto';
import { ProfileRoleRepository } from '../repositories/profile-role.repository';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { PaginateRolesDto } from '../dto/paginate-roles.dto';
import { PermissionScope } from '../constants/permissions';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { RoleEvents } from '@/shared/events/role.events.enum';
import {
  CreateRoleEvent,
  UpdateRoleEvent,
  DeleteRoleEvent,
  RestoreRoleEvent,
} from '../events/role.events';
import { BaseService } from '@/shared/common/services/base.service';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { UserProfileErrors } from '@/modules/user-profile/exceptions/user-profile.errors';
import { CentersService } from '@/modules/centers/services/centers.service';
import { CentersErrors } from '@/modules/centers/exceptions/centers.errors';
import { SelfProtectionService } from '@/shared/common/services/self-protection.service';
import { RoleHierarchyService } from '@/shared/common/services/role-hierarchy.service';

@Injectable()
export class RolesService extends BaseService {
  private readonly logger: Logger = new Logger(RolesService.name);

  constructor(
    private readonly rolesRepository: RolesRepository,
    @Inject(forwardRef(() => AccessControlHelperService))
    private readonly accessControlerHelperService: AccessControlHelperService,
    private readonly profileRoleRepository: ProfileRoleRepository,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
    private readonly centersService: CentersService,
    private readonly selfProtectionService: SelfProtectionService,
    private readonly roleHierarchyService: RoleHierarchyService,
  ) {
    super();
  }

  async getMyPermissions(actor: ActorUser) {
    return this.profileRoleRepository.getProfilePermissions(
      actor.userProfileId,
      actor.centerId,
    );
  }

  async paginateRoles(query: PaginateRolesDto, actor: ActorUser) {
    const centerId = query.centerId ?? actor.centerId;
    query.centerId = centerId;

    return this.rolesRepository.paginateRoles(query);
  }

  async createRole(data: CreateRoleRequestDto, actor: ActorUser) {
    const centerId = data.centerId ?? actor.centerId;
    data.centerId = centerId;

    const role = await this.rolesRepository.createRole(data);

    // Emit event after work is done
    await this.typeSafeEventEmitter.emitAsync(
      RoleEvents.CREATED,
      new CreateRoleEvent(role, actor),
    );

    return role;
  }

  async updateRole(
    roleId: string,
    data: CreateRoleRequestDto,
    actor: ActorUser,
  ) {
    const role = await this.rolesRepository.findOne(roleId);
    if (!role) {
      throw AccessControlErrors.roleNotFound();
    }
    if (role.readOnly) {
      throw AccessControlErrors.cannotModifySystemRole();
    }
    if (!role.isSameScope(actor.centerId)) {
      this.logger.warn('Role update failed - insufficient permissions', {
        roleId,
        actorId: actor.userProfileId,
        centerId: actor.centerId,
      });
      throw AccessControlErrors.missingPermission('MANAGE_ROLES');
    }

    const updatedRole = await this.rolesRepository.updateRole(roleId, data);

    // Emit event after work is done
    await this.typeSafeEventEmitter.emitAsync(
      RoleEvents.UPDATED,
      new UpdateRoleEvent(roleId, data, actor),
    );

    return updatedRole;
  }

  async deleteRole(roleId: string, actor: ActorUser) {
    const role = await this.rolesRepository.findOne(roleId);
    if (!role) {
      throw AccessControlErrors.roleNotFound();
    }
    if (role.readOnly) {
      throw AccessControlErrors.cannotModifySystemRole();
    }
    if (!role?.isSameScope(actor.centerId)) {
      this.logger.warn('Role deletion failed - insufficient permissions', {
        roleId,
        actorId: actor.userProfileId,
        centerId: actor.centerId,
      });
      throw AccessControlErrors.missingPermission('MANAGE_ROLES');
    }

    await this.rolesRepository.softRemove(roleId);

    // Emit event after work is done
    await this.typeSafeEventEmitter.emitAsync(
      RoleEvents.DELETED,
      new DeleteRoleEvent(roleId, actor),
    );
  }

  async assignRoleValidate(data: AssignRoleDto, actor: ActorUser) {
    data.centerId = data.centerId ?? actor.centerId;

    // Self-protection check - applies to ALL operations
    this.selfProtectionService.validateNotSelf(
      actor.userProfileId,
      data.userProfileId,
    );

    // Role hierarchy check (use data.centerId or actor.centerId, can be undefined)
    await this.roleHierarchyService.validateCanOperateOnUser(
      actor.userProfileId,
      data.userProfileId,
      data.centerId, // Optional - use from data or actor, can be undefined for global operations
    );

    // Validate actor has user access to target user (centerId is optional)
    await this.accessControlerHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: data.userProfileId,
      centerId: data.centerId, // Optional - can be undefined
    });

    const profile = await this.accessControlerHelperService.findUserProfile(
      data.userProfileId,
    );
    if (!profile) {
      throw UserProfileErrors.userProfileNotFound();
    }

    if (
      profile.profileType !== ProfileType.STAFF &&
      profile.profileType !== ProfileType.ADMIN
    ) {
      throw AccessControlErrors.invalidProfileTypeForRoleAssignment();
    }

    return this.assignRole(data);
  }

  async assignRole(data: AssignRoleDto) {
    // Validate user profile is active
    const userProfile = await this.accessControlerHelperService.findUserProfile(
      data.userProfileId,
    );
    if (!userProfile) {
      throw UserProfileErrors.userProfileNotFound();
    }
    if (!userProfile.isActive) {
      throw UserProfileErrors.userProfileInactive();
    }

    // Validate center is active if centerId is provided
    if (data.centerId) {
      const center = await this.centersService.findCenterById(
        data.centerId,
        undefined,
      );
      if (!center.isActive) {
        throw CentersErrors.centerInactive();
      }
    }

    const result = await this.profileRoleRepository.assignProfileRole(data);

    return result;
  }

  async removeUserRole(data: AssignRoleDto) {
    const result = await this.profileRoleRepository.removeProfileRole(data);

    return result;
  }

  async removeUserRoleValidate(data: AssignRoleDto, actor: ActorUser) {
    data.centerId = data.centerId ?? actor.centerId;

    // Self-protection check - applies to ALL operations
    this.selfProtectionService.validateNotSelf(
      actor.userProfileId,
      data.userProfileId,
    );

    // Role hierarchy check (use data.centerId or actor.centerId, can be undefined)
    await this.roleHierarchyService.validateCanOperateOnUser(
      actor.userProfileId,
      data.userProfileId,
      data.centerId, // Optional - use from data or actor, can be undefined for global operations
    );

    // Validate actor has user access to target user (centerId is optional)
    await this.accessControlerHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: data.userProfileId,
      centerId: data.centerId, // Optional - can be undefined
    });

    return this.removeUserRole(data);
  }

  async findById(roleId: string, actor?: ActorUser, includeDeleted = false) {
    const role = await this.rolesRepository.findRolePermissions(
      roleId,
      includeDeleted,
    );

    // If actor is provided, validate scope access
    if (actor) {
      if (!role.isSameScope(actor.centerId)) {
        this.logger.warn('Role access failed - insufficient permissions', {
          roleId,
          actorId: actor.userProfileId,
          centerId: actor.centerId,
        });
        throw AccessControlErrors.missingPermission('MANAGE_ROLES');
      }
    }

    return role;
  }

  async findUserRole(userProfileId: string, centerId?: string) {
    return this.profileRoleRepository.getProfileRole(userProfileId, centerId);
  }

  async restoreRole(roleId: string, actor: ActorUser): Promise<void> {
    // First check if the role exists
    const role = await this.rolesRepository.findOneSoftDeleted({ id: roleId });
    if (!role) {
      throw AccessControlErrors.roleNotFound();
    }

    // Check if the role is already active (not deleted)
    if (!role.deletedAt) {
      throw AccessControlErrors.roleAlreadyActive();
    }

    // Restore the role
    await this.rolesRepository.restore(roleId);

    // Emit event after work is done
    await this.typeSafeEventEmitter.emitAsync(
      RoleEvents.RESTORED,
      new RestoreRoleEvent(roleId, actor),
    );
  }

  async hasPermission(
    userProfileId: string,
    permission: string,
    scope: PermissionScope,
    centerId?: string,
  ) {
    const isSuperAdmin =
      await this.accessControlerHelperService.isSuperAdmin(userProfileId);

    if (isSuperAdmin) {
      return true;
    }

    if (centerId) {
      const isCenterOwner =
        await this.accessControlerHelperService.isCenterOwner(
          userProfileId,
          centerId,
        );
      if (
        isCenterOwner &&
        (scope === PermissionScope.CENTER || scope === PermissionScope.BOTH)
      ) {
        return true;
      }
    }
    return this.profileRoleRepository.hasPermission(
      userProfileId,
      permission,
      scope,
      centerId,
    );
  }
}
