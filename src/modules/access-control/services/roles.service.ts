import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaginationQuery } from '@/shared/common/utils/pagination.utils';
import { Pagination } from 'nestjs-typeorm-paginate';
import { RolesRepository } from '../repositories/roles.repository';
import { Role } from '../entities/roles/role.entity';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { AccessControlHelperService } from './access-control-helper.service';
import { UpdateRoleRequestDto } from '../dto/update-role.dto';
import { CreateRoleRequestDto } from '../dto/create-role.dto';
import { AssignRoleDto } from '../dto/assign-role.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly accessControlerHelperService: AccessControlHelperService,
  ) {}

  async paginateRoles(
    query: PaginationQuery,
    userId: string,
  ): Promise<Pagination<Role>> {
    const centerId = query.filter?.centerId as string | undefined;
    const targetUserId = query.filter?.targetUserId as string | undefined;
    delete query.filter?.targetUserId;

    await this.accessControlerHelperService.validateAdminAndCenterAccess({
      userId,
      centerId,
    });

    return this.rolesRepository.paginateRoles(query, centerId, targetUserId);
  }

  async getRolesByType(type: RoleType) {
    return this.rolesRepository.getRolesByType(type);
  }

  async createRole(data: CreateRoleRequestDto, userId: string) {
    await this.accessControlerHelperService.validateAdminAndCenterAccess({
      userId,
      centerId: data.centerId,
    });

    return this.rolesRepository.createRole(data);
  }

  async updateRole(roleId: string, data: UpdateRoleRequestDto, userId: string) {
    await this.accessControlerHelperService.validateAdminAndCenterAccess({
      userId,
      centerId: data.centerId,
    });
    return this.rolesRepository.updateRole(roleId, data);
  }

  async deleteRole(roleId: string, userId: string) {
    const role = await this.rolesRepository.findOne(roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    await this.accessControlerHelperService.validateAdminAndCenterAccess({
      userId: userId,
      centerId: role.centerId,
    });
    return this.rolesRepository.deleteRole(roleId);
  }

  async assignRoleValidate(data: AssignRoleDto, createdBy: string) {
    await this.accessControlerHelperService.validateAdminAndCenterAccess({
      userId: createdBy,
      centerId: data.centerId,
    });
    if (data.centerId) {
      await this.accessControlerHelperService.validateCenterAccess({
        userId: data.userId,
        centerId: data.centerId,
      });
    }
    await this.accessControlerHelperService.validateUserAccess({
      granterUserId: createdBy,
      targetUserId: data.userId,
      centerId: data.centerId,
    });
    // TODO: make it more efficient
    const userRoles = await this.rolesRepository.getUserRoles(data.userId);
    if (userRoles.some((ur) => ur.roleId === data.roleId)) {
      throw new BadRequestException('User already assigned to the role');
    }
    return this.assignRole(data);
  }

  async assignRole(data: AssignRoleDto) {
    return this.rolesRepository.assignRole(data);
  }

  async removeUserRole(data: AssignRoleDto) {
    return this.rolesRepository.removeUserRole(data);
  }

  async removeUserRoleValidate(data: AssignRoleDto, createdBy: string) {
    await this.accessControlerHelperService.validateAdminAndCenterAccess({
      userId: createdBy,
      centerId: data.centerId,
    });
    if (data.centerId) {
      await this.accessControlerHelperService.validateCenterAccess({
        userId: data.userId,
        centerId: data.centerId,
      });
    }
    await this.accessControlerHelperService.validateUserAccess({
      granterUserId: createdBy,
      targetUserId: data.userId,
      centerId: data.centerId,
    });
    // TODO: make it more efficient
    const userRoles = await this.rolesRepository.getUserRoles(data.userId);
    if (!userRoles.some((ur) => ur.roleId === data.roleId)) {
      throw new BadRequestException('User not assigned to the role');
    }
    return this.removeUserRole(data);
  }

  async getUserRoles(userId: string) {
    return this.rolesRepository.getUserRoles(userId);
  }

  async getUserRolesForScope(userId: string, scope: string, centerId?: string) {
    return this.rolesRepository.getUserRolesForScope(userId, scope, centerId);
  }

  async getUserRolesForCenter(userId: string, centerId: string) {
    return this.rolesRepository.getUserRolesForScope(
      userId,
      'CENTER',
      centerId,
    );
  }

  async getUsersByRoleType(type: string, centerId?: string) {
    return this.rolesRepository.getUsersByRoleType(type, centerId);
  }

  async findUserRolesByType(
    userId: string,
    roleType: string,
    centerId?: string,
  ) {
    return this.rolesRepository.findUserRolesByType(userId, roleType, centerId);
  }

  async findUserRolesByRoleId(roleId: string) {
    return this.rolesRepository.findUserRolesByRoleId(roleId);
  }

  async findById(roleId: string) {
    return this.rolesRepository.findWithRelations(roleId);
  }

  async userHasRoleType(userId: string, type: string, centerId?: string) {
    return this.rolesRepository.userHasRoleType(userId, type, centerId);
  }

  async updateRolePermissions(roleId: string, permissionIds: string[]) {
    return this.rolesRepository.updateRolePermissions(roleId, permissionIds);
  }

  async getRolePermissions(roleId: string) {
    return this.rolesRepository.getRolePermissions(roleId);
  }

  async findUserRolesByRoleIds(roleIds: string[], centerId?: string) {
    return this.rolesRepository.findUserRolesByRoleIds(roleIds, centerId);
  }

  async getUserCountByRoleId(roleId: string) {
    return this.rolesRepository.getUserCountByRoleId(roleId);
  }

  async findCenterAdmins(centerId: string): Promise<string[]> {
    const userRoles = await this.rolesRepository.getUserRolesForScope(
      '',
      'CENTER',
      centerId,
    );
    const centerAdminRoles = userRoles.filter(
      (ur) => ur.role.type === RoleType.CENTER_ADMIN,
    );
    return centerAdminRoles.map((ur) => ur.userId);
  }
}
