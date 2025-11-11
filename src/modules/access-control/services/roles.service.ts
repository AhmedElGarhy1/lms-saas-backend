import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import {
  InsufficientPermissionsException,
  ResourceNotFoundException,
} from '@/shared/common/exceptions/custom.exceptions';
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

@Injectable()
export class RolesService extends BaseService {
  private readonly logger: Logger;

  constructor(
    private readonly rolesRepository: RolesRepository,
    @Inject(forwardRef(() => AccessControlHelperService))
    private readonly accessControlerHelperService: AccessControlHelperService,
    private readonly profileRoleRepository: ProfileRoleRepository,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
  ) {
    super();
    const context = this.constructor.name;
    this.logger = new Logger(context);
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

    return this.rolesRepository.paginateRoles(query, actor);
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
      throw new ResourceNotFoundException('Role not found');
    }
    if (!role.isSameScope(actor.centerId)) {
      this.logger.warn('Role update failed - insufficient permissions', {
        roleId,
        actorId: actor.userProfileId,
        centerId: actor.centerId,
      });
      throw new InsufficientPermissionsException(
        'You are not authorized to update this role',
      );
    }

    const updatedRole = await this.rolesRepository.updateRole(
      roleId,
      data,
      actor,
    );

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
      throw new ResourceNotFoundException('Role not found');
    }
    if (!role?.isSameScope(actor.centerId)) {
      this.logger.warn('Role deletion failed - insufficient permissions', {
        roleId,
        actorId: actor.userProfileId,
        centerId: actor.centerId,
      });
      throw new InsufficientPermissionsException(
        'You are not authorized to delete this role',
      );
    }

    await this.rolesRepository.softRemove(roleId);

    // Emit event after work is done
    await this.typeSafeEventEmitter.emitAsync(
      RoleEvents.DELETED,
      new DeleteRoleEvent(roleId, actor),
    );
  }

  async assignRoleValidate(data: AssignRoleDto, actor: ActorUser) {
    const centerId = data.centerId ?? actor.centerId;
    data.centerId = centerId;
    await this.accessControlerHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: data.userProfileId,
      centerId,
    });

    return this.assignRole(data, actor);
  }

  async assignRole(data: AssignRoleDto, actor?: ActorUser) {
    const result = await this.profileRoleRepository.assignProfileRole(data);

    return result;
  }

  async removeUserRole(data: AssignRoleDto, actor?: ActorUser) {
    const result = await this.profileRoleRepository.removeProfileRole(data);

    return result;
  }

  async removeUserRoleValidate(data: AssignRoleDto, actor: ActorUser) {
    await this.accessControlerHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: data.userProfileId,
      centerId: data.centerId,
    });

    return this.removeUserRole(data, actor);
  }

  async findById(roleId: string) {
    return this.rolesRepository.findRolePermissions(roleId);
  }

  async findUserRole(userProfileId: string, centerId?: string) {
    return this.profileRoleRepository.getProfileRole(userProfileId, centerId);
  }

  async restoreRole(roleId: string, actor: ActorUser): Promise<void> {
    // First check if the role exists
    const role = await this.rolesRepository.findOneSoftDeleted({ id: roleId });
    if (!role) {
      throw new ResourceNotFoundException('Role not found');
    }

    // Check if the role is already active (not deleted)
    if (!role.deletedAt) {
      throw new ResourceNotFoundException(
        'Role is not deleted and cannot be restored',
      );
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
      if (isCenterOwner && scope === PermissionScope.CENTER) {
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
