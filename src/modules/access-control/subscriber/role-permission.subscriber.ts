import {
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
  In,
} from 'typeorm';
import { RolePermission } from '../entities';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { BadRequestException } from '@nestjs/common';
import { PermissionRepository } from '../repositories/permission.repository';
import { PermissionScope } from '../constants/permissions';

@EventSubscriber()
export class RolePermissionSubscriber
  implements EntitySubscriberInterface<RolePermission>
{
  constructor(private readonly permissionRepository: PermissionRepository) {}

  listenTo() {
    return RolePermission;
  }

  async beforeInsert(event: InsertEvent<RolePermission>): Promise<void> {
    await this.validate(event.entity);
  }

  async beforeUpdate(event: UpdateEvent<RolePermission>): Promise<void> {
    if (event.entity) {
      await this.validate(event.entity as RolePermission);
    }
  }

  private async validate(rolePermission: RolePermission) {
    if (rolePermission.roleId) {
      const permission = await this.permissionRepository.findOne(
        rolePermission.permissionId,
      );
      if (!permission) throw new BadRequestException('Permission not found');

      if (
        permission.scope !== rolePermission.permissionScope &&
        permission.scope !== PermissionScope.BOTH
      )
        throw new BadRequestException('Permission scope does not match');
    }
  }
}
