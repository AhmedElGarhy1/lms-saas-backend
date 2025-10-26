import { Injectable } from '@nestjs/common';
import { PermissionRepository } from '../repositories/permission.repository';
import { Permission } from '../entities/permission.entity';
import { LoggerService } from '@/shared/services/logger.service';
import { FindOptionsWhere, In } from 'typeorm';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { PermissionScope } from '../constants/permissions';

@Injectable()
export class PermissionService {
  constructor(
    private readonly permissionRepository: PermissionRepository,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Get all permissions from database
   */
  async getPermissions(
    actor: ActorUser,
    scope?: PermissionScope,
  ): Promise<Permission[]> {
    const where: FindOptionsWhere<Permission> = {};

    if (actor.centerId) {
      where.scope = scope || In([PermissionScope.CENTER, PermissionScope.BOTH]);
    } else {
      where.scope =
        scope ||
        In([
          PermissionScope.ADMIN,
          PermissionScope.BOTH,
          PermissionScope.CENTER,
        ]);
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
