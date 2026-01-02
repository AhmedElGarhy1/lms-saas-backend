import {
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
  DataSource,
} from 'typeorm';
import { ProfileRole } from '../entities/profile-role.entity';
import { AccessControlErrors } from '../exceptions/access-control.errors';
import { UserProfileErrors } from '@/modules/user-profile/exceptions/user-profile.errors';
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
        throw AccessControlErrors.roleNotFound();

      const profile = await this.accessControlHelperService.findUserProfile(
        profileRole.userProfileId,
      );
      if (!profile)
        throw UserProfileErrors.userProfileNotFound();

      if (profileRole.centerId) {
        if (profile?.profileType === ProfileType.ADMIN) {
          throw AccessControlErrors.invalidProfileType();
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
