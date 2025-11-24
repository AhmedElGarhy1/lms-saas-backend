import {
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
  DataSource,
} from 'typeorm';
import { RolePermission } from '../entities/role-permission.entity';
import { BadRequestException } from '@nestjs/common';
import { PermissionRepository } from '../repositories/permission.repository';
import { PermissionScope } from '../constants/permissions';
import { InjectDataSource } from '@nestjs/typeorm';
import { RequestContext } from '@/shared/common/context/request.context';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';

@EventSubscriber()
export class RolePermissionSubscriber
  implements EntitySubscriberInterface<RolePermission>
{
  constructor(
    private readonly permissionRepository: PermissionRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly i18n: I18nService<I18nTranslations>,
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
      if (!permission)
        throw new BadRequestException(
          this.i18n.translate('errors.permissionNotFound'),
        );

      if (centerId) {
        if (
          rolePermission.permissionScope === PermissionScope.ADMIN ||
          rolePermission.permissionScope === PermissionScope.BOTH
        ) {
          throw new BadRequestException(
            'Admin scope is not allowed for center',
          );
        }
      }

      // TODO: recheck this logic
      if (
        permission.scope !== rolePermission.permissionScope &&
        permission.scope !== PermissionScope.BOTH
      ) {
        throw new BadRequestException(
          this.i18n.translate('errors.permissionScopeDoesNotMatch'),
        );
      }
    }
  }
}
