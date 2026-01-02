import {
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
  DataSource,
} from 'typeorm';
import { RolePermission } from '../entities/role-permission.entity';
import { PermissionRepository } from '../repositories/permission.repository';
import { PermissionScope } from '../constants/permissions';
import { AccessControlErrors } from '../exceptions/access-control.errors';
import { InjectDataSource } from '@nestjs/typeorm';
import { RequestContext } from '@/shared/common/context/request.context';

@EventSubscriber()
export class RolePermissionSubscriber
  implements EntitySubscriberInterface<RolePermission>
{
  constructor(
    private readonly permissionRepository: PermissionRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.dataSource.subscribers.push(this);
  }

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
    const centerId = RequestContext.get().centerId;

    if (rolePermission.roleId) {
      const permission = await this.permissionRepository.findOne(
        rolePermission.permissionId,
      );
      if (!permission) throw AccessControlErrors.permissionNotFound();

      if (centerId) {
        if (
          rolePermission.permissionScope === PermissionScope.ADMIN ||
          rolePermission.permissionScope === PermissionScope.BOTH
        ) {
          throw AccessControlErrors.invalidProfileType();
        }
      }

      // TODO: recheck this logic
      if (
        permission.scope !== rolePermission.permissionScope &&
        permission.scope !== PermissionScope.BOTH
      ) {
        throw AccessControlErrors.invalidProfileType();
      }
    }
  }
}
