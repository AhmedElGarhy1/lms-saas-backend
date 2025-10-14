import {
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { UserRole } from '../entities/user-role.entity';
import { RoleType } from '@/shared/common/enums/role-type.enum';
import { BadRequestException } from '@nestjs/common';
import { RolesRepository } from '../repositories/roles.repository';

@EventSubscriber()
export class UserRoleSubscriber implements EntitySubscriberInterface<UserRole> {
  constructor(private readonly rolesRepository: RolesRepository) {}

  listenTo() {
    return UserRole;
  }

  async beforeInsert(event: InsertEvent<UserRole>): Promise<void> {
    await this.validateUserRole(event.entity);
  }

  async beforeUpdate(event: UpdateEvent<UserRole>): Promise<void> {
    if (event.entity) {
      await this.validateUserRole(event.entity as UserRole);
    }
  }

  private async validateUserRole(userRole: UserRole) {
    if (userRole.roleId) {
      const role = await this.rolesRepository.findOne(userRole.roleId);
      if (!role) throw new BadRequestException('Role not found');

      if (userRole.role.type !== RoleType.CENTER && userRole.centerId) {
        throw new BadRequestException(
          'Admin and system role cannot be associated with a center',
        );
      }
    }
  }
}
