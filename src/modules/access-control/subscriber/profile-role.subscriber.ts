import {
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
  DataSource,
} from 'typeorm';
import { ProfileRole } from '../entities/profile-role.entity';
import { BusinessLogicException } from '@/shared/common/exceptions/custom.exceptions';
import { RolesRepository } from '../repositories/roles.repository';
import { AccessControlHelperService } from '../services/access-control-helper.service';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { InjectDataSource } from '@nestjs/typeorm';

@EventSubscriber()
export class ProfileRoleSubscriber
  implements EntitySubscriberInterface<ProfileRole>
{
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly accessControlHelperService: AccessControlHelperService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.dataSource.subscribers.push(this);
  }

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
      if (!role)
        throw new BusinessLogicException('Role not found', 't.errors.roleNotFound');

      const profile = await this.accessControlHelperService.findUserProfile(
        profileRole.userProfileId,
      );
      if (!profile)
        throw new BusinessLogicException(
          'User profile not found',
          't.errors.userProfileNotFound',
        );

      if (profileRole.centerId) {
        if (profile?.profileType === ProfileType.ADMIN) {
          throw new BusinessLogicException(
            'Admin role cannot be associated with a center',
            't.errors.adminRoleCannotBeAssociatedWithCenter',
          );
        } else if (profile?.profileType === ProfileType.STAFF) {
          // check center access
          await this.accessControlHelperService.validateCenterAccess({
            userProfileId: profile.id,
            centerId: profileRole.centerId,
          });
        }
      } else {
        await this.accessControlHelperService.validateAdminAccess({
          userProfileId: profile?.id,
        });
      }
    }
  }
}
