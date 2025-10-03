import { ForbiddenException, Injectable } from '@nestjs/common';
import { PermissionRepository } from '../repositories/permission.repository';
import { Permission } from '../entities/permission.entity';
import { LoggerService } from '@/shared/services/logger.service';
import { UserRoleRepository } from '../repositories/user-role.repository';
import { FindOptionsWhere } from 'typeorm';
import { AccessControlHelperService } from './access-control-helper.service';
import { RoleType } from '@/shared/common/enums/role-type.enum';

@Injectable()
export class PermissionService {
  constructor(
    private readonly permissionRepository: PermissionRepository,
    private readonly userRoleRepository: UserRoleRepository,
    private readonly logger: LoggerService,
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {}

  /**
   * Get all permissions from database
   */
  async getPermissions(
    type: 'admin' | 'user' | 'all' = 'all',
    userId: string,
  ): Promise<Permission[]> {
    const where: FindOptionsWhere<Permission> = {};

    const userHighestRole =
      await this.accessControlHelperService.getUserRole(userId);

    const roleType = userHighestRole?.role?.type;

    if (type === 'admin') {
      if (roleType === RoleType.ADMIN || roleType === RoleType.SUPER_ADMIN) {
        where.isAdmin = true;
      } else throw new ForbiddenException("You can't view admin permissions");
    } else if (type === 'user') {
      where.isAdmin = false;
    } else if (type === 'all') {
      if (roleType !== RoleType.SUPER_ADMIN && roleType !== RoleType.ADMIN) {
        where.isAdmin = false;
      }
    }

    return await this.permissionRepository.findMany({ where });
  }

  /**
   * Get permission by action from database
   */
  async getPermissionByAction(action: string): Promise<Permission | null> {
    try {
      const permissions = await this.permissionRepository.findMany({
        where: { action },
      });
      return permissions.length > 0 ? permissions[0] : null;
    } catch (error) {
      this.logger.error(
        `Failed to fetch permission by action: ${action}`,
        error,
      );
      throw error;
    }
  }
}
