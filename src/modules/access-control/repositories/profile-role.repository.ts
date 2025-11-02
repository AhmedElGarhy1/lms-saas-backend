import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { In, IsNull } from 'typeorm';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { ProfileRole } from '../entities/profile-role.entity';
import { Role } from '../entities/role.entity';
import { LoggerService } from '@/shared/services/logger.service';
import { DefaultRoles } from '../constants/roles';
import { AssignRoleDto } from '../dto/assign-role.dto';
import { Permission } from '../entities/permission.entity';
import { PermissionRepository } from './permission.repository';
import { PermissionScope } from '../constants/permissions';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

@Injectable()
export class ProfileRoleRepository extends BaseRepository<ProfileRole> {
  constructor(
    protected readonly logger: LoggerService,
    private readonly permissionRepository: PermissionRepository,
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(logger, txHost);
  }

  protected getEntityClass(): typeof ProfileRole {
    return ProfileRole;
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
      profileRole = await this.getRepository().findOne({
        where: { userProfileId, centerId },
        relations: [
          'role',
          'role.rolePermissions',
          'role.rolePermissions.permission',
        ],
      });
    }

    if (!profileRole && !centerId) {
      profileRole = await this.getRepository().findOne({
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
    return this.getRepository().find({
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
    return this.getRepository().findOne({
      where: {
        userProfileId,
        centerId: centerId || IsNull(),
      },
      relations: ['role'],
    });
  }

  async isSuperAdmin(userProfileId: string): Promise<boolean> {
    const profileRole = await this.getRepository().findOne({
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
    const profileRole = await this.getRepository().findOne({
      where: {
        userProfileId,
        centerId,
        role: {
          name: DefaultRoles.OWNER,
        },
      },
    });
    return !!profileRole;
  }

  async findProfileRoles(
    userProfileId: string,
    centerId?: string,
  ): Promise<ProfileRole[]> {
    return this.getRepository().find({
      where: { userProfileId, centerId: centerId || IsNull() },
      relations: ['role'],
    });
  }

  async findProfileRolesByRoleId(roleId: string): Promise<ProfileRole[]> {
    return this.getRepository().find({
      where: { roleId },
    });
  }

  async assignProfileRole(data: AssignRoleDto): Promise<ProfileRole> {
    const existingProfileRole = await this.getProfileRole(
      data.userProfileId,
      data.centerId,
    );

    if (existingProfileRole) {
      await this.removeProfileRole(existingProfileRole);
    }

    const roleRepo = this.getEntityManager().getRepository(Role);
    const role = await roleRepo.findOneBy({ id: data.roleId });

    if (!role?.isSameScope(data.centerId)) {
      throw new ForbiddenException(
        'You are not authorized to assign this role',
      );
    }

    const repo = this.getRepository();
    const profileRole = repo.create({
      userProfileId: data.userProfileId,
      roleId: data.roleId,
      centerId: data.centerId,
    });

    return repo.save(profileRole);
  }

  async removeProfileRole(data: AssignRoleDto): Promise<void> {
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

    await this.remove(existingProfileRole.id);
  }

  async hasPermission(
    userProfileId: string,
    permission: string,
    scope: PermissionScope,
    centerId?: string,
  ) {
    const profileRole = await this.getRepository().findOne({
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
