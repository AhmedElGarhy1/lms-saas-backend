import { Injectable, Logger } from '@nestjs/common';
import { PermissionRepository } from '../repositories/permission.repository';
import { Permission } from '../entities/permission.entity';
import { BaseService } from '@/shared/common/services/base.service';
import { FindOptionsWhere, In } from 'typeorm';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { PermissionScope } from '../constants/permissions';

@Injectable()
export class PermissionService extends BaseService {
  private readonly logger: Logger = new Logger(PermissionService.name);

  constructor(private readonly permissionRepository: PermissionRepository) {
    super();
  }

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
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * Get permissions grouped by their group name
   * @param actor The user performing the action
   * @param scope Optional permission scope filter
   * @returns Permissions grouped by group name
   */
  async getPermissionsGrouped(
    actor: ActorUser,
    scope?: PermissionScope,
  ): Promise<Record<string, Permission[]>> {
    const permissions = await this.getPermissions(actor, scope);

    return permissions.reduce(
      (acc, permission) => {
        const group = permission.group || 'other';
        if (!acc[group]) {
          acc[group] = [];
        }
        acc[group].push(permission);
        return acc;
      },
      {} as Record<string, Permission[]>,
    );
  }
}
