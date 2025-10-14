import { Injectable } from '@nestjs/common';
import {
  InsufficientPermissionsException,
  ResourceNotFoundException,
} from '@/shared/common/exceptions/custom.exceptions';
import { PaginationQuery } from '@/shared/common/utils/pagination.utils';
import { Pagination } from 'nestjs-typeorm-paginate';
import { RolesRepository } from '../repositories/roles.repository';
import { Role } from '../entities/roles/role.entity';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { AccessControlHelperService } from './access-control-helper.service';
import { CreateRoleRequestDto } from '../dto/create-role.dto';
import { AssignRoleDto } from '../dto/assign-role.dto';
import { UserRoleRepository } from '../repositories/user-role.repository';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { PaginateRolesDto } from '../dto/paginate-roles.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly accessControlerHelperService: AccessControlHelperService,
    private readonly userRoleRepository: UserRoleRepository,
  ) {}

  async paginateRoles(query: PaginateRolesDto, actor: ActorUser) {
    const centerId = query.centerId ?? actor.centerId;
    query.centerId = centerId;

    return this.rolesRepository.paginateRoles(query, actor.id);
  }

  async createRole(data: CreateRoleRequestDto, actor: ActorUser) {
    const centerId = data.centerId ?? actor.centerId;
    data.centerId = centerId;
    if (centerId) {
      data.type = RoleType.CENTER;
    } else {
      data.type = data.type ?? RoleType.ADMIN;
    }

    return this.rolesRepository.createRole(data);
  }

  async updateRole(
    roleId: string,
    data: CreateRoleRequestDto,
    actor: ActorUser,
  ) {
    const role = await this.rolesRepository.findOne(roleId);
    console.log(role, role?.centerId, actor.centerId);
    if (!role?.isSameScope(actor.centerId)) {
      throw new InsufficientPermissionsException(
        'You are not authorized to update this role',
      );
    }

    return this.rolesRepository.updateRole(roleId, data);
  }

  async deleteRole(roleId: string, actor: ActorUser) {
    const role = await this.rolesRepository.findOne(roleId);
    if (!role) {
      throw new ResourceNotFoundException('Role not found');
    }
    if (!role?.isSameScope(actor.centerId)) {
      throw new InsufficientPermissionsException(
        'You are not authorized to delete this role',
      );
    }

    return this.rolesRepository.softRemove(roleId);
  }

  async assignRoleValidate(data: AssignRoleDto, actor: ActorUser) {
    const centerId = data.centerId ?? actor.centerId;
    data.centerId = centerId;
    await this.accessControlerHelperService.validateUserAccess({
      granterUserId: actor.id,
      targetUserId: data.userId,
      centerId,
    });

    return this.assignRole(data);
  }

  async assignRole(data: AssignRoleDto) {
    return this.userRoleRepository.assignUserRole(data);
  }

  async removeUserRole(data: AssignRoleDto) {
    return this.userRoleRepository.removeUserRole(data);
  }

  async removeUserRoleValidate(data: AssignRoleDto, actor: ActorUser) {
    await this.accessControlerHelperService.validateUserAccess({
      granterUserId: actor.id,
      targetUserId: data.userId,
      centerId: data.centerId,
    });

    return this.removeUserRole(data);
  }

  async findById(roleId: string) {
    return this.rolesRepository.findRolePermissions(roleId);
  }

  async findUserRole(userId: string, centerId?: string) {
    return this.userRoleRepository.getUserRole(userId, centerId);
  }

  async restoreRole(roleId: string, actor: ActorUser): Promise<void> {
    // First check if the role exists
    const role = await this.rolesRepository.findOne(roleId);
    if (!role) {
      throw new ResourceNotFoundException('Role not found');
    }

    // Check if the role is already active (not deleted)
    if (!role.deletedAt) {
      throw new ResourceNotFoundException(
        'Role is not deleted and cannot be restored',
      );
    }

    // Check permissions - only allow restore if user has appropriate permissions
    await this.accessControlerHelperService.validateAdminAndCenterAccess({
      userId: actor.id,
      centerId: role.centerId,
    });

    // Restore the role
    await this.rolesRepository.restore(roleId);
  }
}
