import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { In, IsNull, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { ProfileRole } from '../entities/profile-role.entity';
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
export class ProfileRoleRepository extends BaseRepository<ProfileRole> {
  constructor(
    @InjectRepository(ProfileRole)
    private readonly profileRoleRepository: Repository<ProfileRole>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    protected readonly logger: LoggerService,
    private readonly permissionRepository: PermissionRepository,
  ) {
    super(profileRoleRepository, logger);
  }

  async getProfilePermissions(
    userProfileId: string,
    centerId?: string,
  ): Promise<Permission[]> {
    let profileRole: ProfileRole | null = null;

    const isSuperAdmin = await this.isSuperAdmin(userProfileId);
    if (isSuperAdmin) {
      return this.permissionRepository.findMany();
    }

    if (centerId) {
      const isOwner = await this.isCenterOwner(userProfileId, centerId);
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
      profileRole = await this.profileRoleRepository.findOne({
        where: { userProfileId, centerId },
        relations: [
          'role',
          'role.rolePermissions',
          'role.rolePermissions.permission',
        ],
      });
    }

    if (!profileRole && !centerId) {
      profileRole = await this.profileRoleRepository.findOne({
        where: { userProfileId, centerId: IsNull() },
        relations: [
          'role',
          'role.rolePermissions',
          'role.rolePermissions.permission',
        ],
      });
    }
    if (profileRole && profileRole.role.rolePermissions.length > 0) {
      return profileRole.role.rolePermissions.map((rp) => {
        const data = rp.permission;
        data.scope = rp.permissionScope;
        return data;
      });
    }

    return [];
  }

  async getProfileRoles(
    userProfileId: string,
    centerId?: string,
  ): Promise<ProfileRole[]> {
    return this.profileRoleRepository.find({
      where: [
        {
          userProfileId,
          centerId: IsNull(),
        },
        centerId
          ? {
              userProfileId,
              centerId,
            }
          : {},
      ],
      relations: ['role'],
    });
  }

  async getProfileRoleWithFallback(
    userProfileId: string,
    centerId?: string,
  ): Promise<ProfileRole | null> {
    if (centerId) {
      const profileRole = await this.getProfileRole(userProfileId, centerId);
      if (profileRole) {
        return profileRole;
      }
    }
    return this.getProfileRole(userProfileId, undefined);
  }

  async getProfileRole(
    userProfileId: string,
    centerId?: string,
  ): Promise<ProfileRole | null> {
    return this.profileRoleRepository.findOne({
      where: {
        userProfileId,
        centerId: centerId || IsNull(),
      },
      relations: ['role'],
    });
  }

  async hasAdminRole(userProfileId: string): Promise<boolean> {
    const profileRole = await this.profileRoleRepository.findOne({
      where: {
        userProfileId,
        centerId: IsNull(),
        role: {
          type: RoleType.ADMIN,
        },
      },
    });
    return !!profileRole;
  }

  async hasUserRole(userProfileId: string): Promise<boolean> {
    const profileRole = await this.profileRoleRepository.findOne({
      where: { userProfileId, role: { type: RoleType.CENTER } },
    });
    return !!profileRole;
  }

  async isSuperAdmin(userProfileId: string): Promise<boolean> {
    const profileRole = await this.profileRoleRepository.findOne({
      where: {
        userProfileId,
        role: {
          name: DefaultRoles.SUPER_ADMIN,
        },
      },
    });
    return !!profileRole;
  }

  async isCenterOwner(
    userProfileId: string,
    centerId: string,
  ): Promise<boolean> {
    const profileRole = await this.profileRoleRepository.findOne({
      where: {
        userProfileId,
        centerId,
        role: {
          name: 'Owner',
        },
      },
    });
    return !!profileRole;
  }

  async findProfileRoles(
    userProfileId: string,
    centerId?: string,
  ): Promise<ProfileRole[]> {
    return this.profileRoleRepository.find({
      where: { userProfileId, centerId: centerId || IsNull() },
      relations: ['role'],
    });
  }

  async findProfileRolesByRoleId(roleId: string): Promise<ProfileRole[]> {
    return this.profileRoleRepository.find({
      where: { roleId },
      relations: ['role', 'userProfile'],
    });
  }

  @Transactional()
  async assignProfileRole(data: AssignRoleDto): Promise<ProfileRole> {
    const existingProfileRole = await this.getProfileRole(
      data.userProfileId,
      data.centerId,
    );

    if (existingProfileRole) {
      await this.removeProfileRole(existingProfileRole, true);
    }

    const role = await this.roleRepository.findOneBy({ id: data.roleId });

    if (!role?.isSameScope(data.centerId)) {
      throw new ForbiddenException(
        'You are not authorized to assign this role',
      );
    }

    const profileRole = this.profileRoleRepository.create({
      userProfileId: data.userProfileId,
      roleId: data.roleId,
      centerId: data.centerId,
    });

    return this.profileRoleRepository.save(profileRole);
  }

  async removeProfileRole(
    data: AssignRoleDto,
    isReAssign: boolean = false,
  ): Promise<void> {
    const existingProfileRole = await this.getProfileRole(
      data.userProfileId,
      data.centerId,
    );
    if (!existingProfileRole) {
      throw new BadRequestException(
        'Profile does not have a role in this scope',
      );
    }

    if (!existingProfileRole.role.isSameScope(data.centerId)) {
      throw new ForbiddenException(
        'You are not authorized to remove this role',
      );
    }
    if (!isReAssign) {
      if (existingProfileRole.role.type !== RoleType.CENTER) {
        throw new ForbiddenException(`Profile must have global role`);
      }
    }
    await this.remove(existingProfileRole.id);
  }

  async hasPermission(
    userProfileId: string,
    permission: string,
    scope: PermissionScope,
    centerId?: string,
  ) {
    const profileRole = await this.profileRoleRepository.findOne({
      where: {
        userProfileId,
        ...(centerId && { centerId }),
        role: {
          rolePermissions: {
            permissionScope: In([scope, PermissionScope.BOTH]),
            permission: { action: permission },
          },
        },
      },
    });

    return !!profileRole;
  }
}
