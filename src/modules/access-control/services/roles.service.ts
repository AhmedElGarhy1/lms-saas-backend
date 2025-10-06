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
import { UserRoleRepository } from '../repositories/user-role.repository';
import { RoleResponseDto } from '../dto/role-response.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly accessControlerHelperService: AccessControlHelperService,
    private readonly userRoleRepository: UserRoleRepository,
  ) {}

  async paginateRoles(
    query: PaginationQuery,
    userId: string,
    centerId?: string,
  ) {
    const filterCenterId = query.filter?.centerId as string | undefined;
    const targetUserId = query.filter?.targetUserId as string | undefined;
    delete query.filter?.targetUserId;
    const _centerId = filterCenterId ?? centerId;

    await this.accessControlerHelperService.validateAdminAndCenterAccess({
      userId,
      centerId: _centerId,
    });

    return this.rolesRepository.paginateRoles(query, _centerId, targetUserId);
  }

  async createRole(data: CreateRoleRequestDto, userId: string) {
    await this.accessControlerHelperService.validateAdminAndCenterAccess({
      userId,
      centerId: data.centerId,
    });

    return this.rolesRepository.create(data);
  }

  async updateRole(roleId: string, data: UpdateRoleRequestDto, userId: string) {
    await this.accessControlerHelperService.validateAdminAndCenterAccess({
      userId,
      centerId: data.centerId,
    });
    return this.rolesRepository.update(roleId, data);
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
    return this.rolesRepository.softRemove(roleId);
  }

  async assignRoleValidate(data: AssignRoleDto, createdBy: string) {
    await this.accessControlerHelperService.validateAdminAndCenterAccess({
      userId: createdBy,
      centerId: data.centerId,
    });

    await this.accessControlerHelperService.validateUserAccess({
      granterUserId: createdBy,
      targetUserId: data.userId,
      centerId: data.centerId,
    });
    return this.assignRole(data);
  }

  async assignRole(data: AssignRoleDto) {
    return this.userRoleRepository.assignUserRole(data);
  }

  async removeUserRole(data: AssignRoleDto) {
    return this.userRoleRepository.removeUserRole(data);
  }

  async removeUserRoleValidate(data: AssignRoleDto, createdBy: string) {
    await this.accessControlerHelperService.validateAdminAndCenterAccess({
      userId: createdBy,
      centerId: data.centerId,
    });

    await this.accessControlerHelperService.validateUserAccess({
      granterUserId: createdBy,
      targetUserId: data.userId,
      centerId: data.centerId,
    });

    return this.removeUserRole(data);
  }

  async findById(roleId: string) {
    return this.rolesRepository.findOne(roleId);
  }

  async findUserRole(userId: string, centerId?: string) {
    return this.userRoleRepository.getUserRole(userId, centerId);
  }

  async userHasRoleType(userId: string, type: string, centerId?: string) {
    return this.userRoleRepository.userHasRoleType(userId, type, centerId);
  }
}
