import {
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { ProfileRole } from '../entities/profile-role.entity';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { BadRequestException } from '@nestjs/common';
import { RolesRepository } from '../repositories/roles.repository';

@EventSubscriber()
export class ProfileRoleSubscriber
  implements EntitySubscriberInterface<ProfileRole>
{
  constructor(private readonly rolesRepository: RolesRepository) {}

  listenTo() {
    return ProfileRole;
  }

  async beforeInsert(event: InsertEvent<ProfileRole>): Promise<void> {
    await this.validateProfileRole(event.entity);
  }

  async beforeUpdate(event: UpdateEvent<ProfileRole>): Promise<void> {
    if (event.entity) {
      await this.validateProfileRole(event.entity as ProfileRole);
    }
  }

  private async validateProfileRole(profileRole: ProfileRole) {
    if (profileRole.roleId) {
      const role = await this.rolesRepository.findOne(profileRole.roleId);
      if (!role) throw new BadRequestException('Role not found');

      if (profileRole.role.type !== RoleType.CENTER && profileRole.centerId) {
        throw new BadRequestException(
          'Admin and system role cannot be associated with a center',
        );
      }
    }
  }
}
