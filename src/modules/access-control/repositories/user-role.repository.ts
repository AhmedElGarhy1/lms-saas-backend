import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { In, IsNull, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { UserRole } from '../entities/user-role.entity';
import { Role } from '../entities/role.entity';
import { LoggerService } from '@/shared/services/logger.service';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { DefaultRoles } from '../constants/roles';
import { AssignRoleDto } from '../dto/assign-role.dto';
import { Permission } from '../entities/permission.entity';
import { PermissionRepository } from './permission.repository';
import { PermissionScope } from '../constants/permissions';
import { Transactional } from 'typeorm-transactional';

@Injectable()
export class UserRoleRepository extends BaseRepository<UserRole> {
  constructor(
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    protected readonly logger: LoggerService,
    private readonly permissionRepository: PermissionRepository,
  ) {
    super(userRoleRepository, logger);
  }

  async getUserPermissions(
    userId: string,
    centerId?: string,
    profileId?: string,
  ): Promise<Permission[]> {
    let userRole: UserRole | null = null;

    const isSuperAdmin = await this.isSuperAdmin(userId);
    if (isSuperAdmin) {
      return this.permissionRepository.findMany();
    }

    if (centerId) {
      const isOwner = await this.isCenterOwner(userId, centerId);
      if (isOwner) {
        const centerPermissions = await this.permissionRepository.findMany({
          where: {
            scope: In([PermissionScope.CENTER, PermissionScope.BOTH]),
          },
        });
        return centerPermissions.map((cp) => ({
          ...cp,
          scope: PermissionScope.CENTER,
        }));
      }
      userRole = await this.userRoleRepository.findOne({
        where: { userId, centerId, profileId },
        relations: [
          'role',
          'role.rolePermissions',
          'role.rolePermissions.permission',
        ],
      });
    }

    if (!userRole && !centerId) {
      userRole = await this.userRoleRepository.findOne({
        where: { userId, centerId: IsNull() },
        relations: [
          'role',
          'role.rolePermissions',
          'role.rolePermissions.permission',
        ],
      });
    }
    if (userRole && userRole.role.rolePermissions.length > 0) {
      return userRole.role.rolePermissions.map((rp) => {
        const data = rp.permission;
        data.scope = rp.permissionScope;
        return data;
      });
    }

    return [];
  }

  async getUserRoles(userId: string, centerId?: string): Promise<UserRole[]> {
    return this.userRoleRepository.find({
      where: [
        {
          userId,
          centerId: IsNull(),
        },
        centerId
          ? {
              userId,
              centerId,
            }
          : {},
      ],
      relations: ['role'],
    });
  }

  async getUserRoleWithFallback(
    userId: string,
    centerId?: string,
  ): Promise<UserRole | null> {
    if (centerId) {
      const userRole = await this.getUserRole(userId, centerId);
      if (userRole) {
        return userRole;
      }
    }
    return this.getUserRole(userId, undefined);
  }

  async getUserRole(
    userId: string,
    centerId?: string,
  ): Promise<UserRole | null> {
    return this.userRoleRepository.findOne({
      where: {
        userId,
        centerId: centerId || IsNull(),
      },
      relations: ['role'],
    });
  }

  async hasAdminRole(userId: string): Promise<boolean> {
    const userRole = await this.userRoleRepository.findOne({
      where: {
        userId,
        centerId: IsNull(),
        role: {
          type: RoleType.ADMIN,
        },
      },
    });
    return !!userRole;
  }

  async hasUserRole(userId: string): Promise<boolean> {
    const userRole = await this.userRoleRepository.findOne({
      where: { userId, role: { type: RoleType.CENTER } },
    });
    return !!userRole;
  }

  async isSuperAdmin(userId: string): Promise<boolean> {
    const userRole = await this.userRoleRepository.findOne({
      where: {
        userId,
        role: {
          name: DefaultRoles.SUPER_ADMIN,
        },
      },
    });
    return !!userRole;
  }

  async isCenterOwner(userId: string, centerId: string): Promise<boolean> {
    const userRole = await this.userRoleRepository.findOne({
      where: {
        userId,
        centerId,
        role: {
          name: 'Owner',
        },
      },
    });
    return !!userRole;
  }

  async findUserRoles(userId: string, centerId?: string): Promise<UserRole[]> {
    return this.userRoleRepository.find({
      where: { userId, centerId: centerId || IsNull() },
      relations: ['role'],
    });
  }

  async findUserRolesByRoleId(roleId: string): Promise<UserRole[]> {
    return this.userRoleRepository.find({
      where: { roleId },
      relations: ['role', 'user'],
    });
  }

  @Transactional()
  async assignUserRole(data: AssignRoleDto): Promise<UserRole> {
    const existingUserRole = await this.getUserRole(data.userId, data.centerId);

    if (existingUserRole) {
      await this.removeUserRole(existingUserRole, true);
    }

    const role = await this.roleRepository.findOneBy({ id: data.roleId });

    if (!role?.isSameScope(data.centerId)) {
      throw new ForbiddenException(
        'You are not authorized to assign this role',
      );
    }

    const userRole = this.userRoleRepository.create({
      userId: data.userId,
      roleId: data.roleId,
      centerId: data.centerId,
    });

    return this.userRoleRepository.save(userRole);
  }

  async removeUserRole(
    data: AssignRoleDto,
    isReAssign: boolean = false,
  ): Promise<void> {
    const existingUserRole = await this.getUserRole(data.userId, data.centerId);
    if (!existingUserRole) {
      throw new BadRequestException('User does not have a role in this scope');
    }

    if (!existingUserRole.role.isSameScope(data.centerId)) {
      throw new ForbiddenException(
        'You are not authorized to remove this role',
      );
    }
    if (!isReAssign) {
      if (existingUserRole.role.type !== RoleType.CENTER) {
        throw new ForbiddenException(`User must have global role`);
      }
    }
    await this.remove(existingUserRole.id);
  }

  async hasPermission(
    userId: string,
    permission: string,
    scope: PermissionScope,
    centerId?: string,
  ) {
    const userRole = await this.userRoleRepository.findOne({
      where: {
        userId,
        ...(centerId && { centerId }),
        role: {
          rolePermissions: {
            permissionScope: In([scope, PermissionScope.BOTH]),
            permission: { action: permission },
          },
        },
      },
    });

    return !!userRole;
  }
}
