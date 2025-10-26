import {
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { ProfileRole } from '../entities/profile-role.entity';
import { BadRequestException } from '@nestjs/common';
import { RolesRepository } from '../repositories/roles.repository';
import { AccessControlHelperService } from '../services/access-control-helper.service';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

@EventSubscriber()
export class ProfileRoleSubscriber
  implements EntitySubscriberInterface<ProfileRole>
{
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {}

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

      const profile = await this.accessControlHelperService.findUserProfile(
        profileRole.userProfileId,
      );

      if (profile?.profileType === ProfileType.ADMIN && profileRole.centerId) {
        throw new BadRequestException(
          'Admin role cannot be associated with a center',
        );
      }
    }
  }
}
