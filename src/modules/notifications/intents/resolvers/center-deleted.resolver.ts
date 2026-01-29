import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationIntentResolver } from '../interfaces/notification-intent-resolver.interface';
import { BaseIntentResolver } from '../base/base-intent-resolver.abstract';
import { IntentForNotification } from '../../types/notification-intent.map';
import { AudienceIdForNotification } from '../../types/audience-id.types';
import { RecipientInfo } from '../../types/recipient-info.interface';
import { UserService } from '@/modules/user/services/user.service';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { CentersRepository } from '@/modules/centers/repositories/centers.repository';
import { ProfileRole } from '@/modules/access-control/entities/profile-role.entity';
import { DefaultRoles } from '@/modules/access-control/constants/roles';

/**
 * Resolver for CENTER_DELETED notification intent
 * Handles OWNERS audience. Center is soft-deleted; use findOneSoftDeletedById.
 */
@Injectable()
export class CenterDeletedResolver
  extends BaseIntentResolver
  implements NotificationIntentResolver<NotificationType.CENTER_DELETED>
{
  private readonly logger: Logger = new Logger(CenterDeletedResolver.name);

  constructor(
    private readonly userService: UserService,
    private readonly userProfileService: UserProfileService,
    private readonly centersRepository: CentersRepository,
    @InjectRepository(ProfileRole)
    private readonly profileRoleRepository: Repository<ProfileRole>,
  ) {
    super();
  }

  async resolveIntent(
    intent: IntentForNotification<NotificationType.CENTER_DELETED>,
    audience: AudienceIdForNotification<NotificationType.CENTER_DELETED>,
  ) {
    const center = await this.centersRepository.findOneSoftDeletedById(
      intent.centerId,
    );
    const centerName = center?.name ?? '';

    const actorProfile = await this.userProfileService.findOne(intent.actorId);
    const actorUser = actorProfile
      ? await this.userService.findOne(actorProfile.userId)
      : null;
    const actorName = actorUser?.name ?? '';

    const templateVariables = { centerName, actorName };

    const recipients: RecipientInfo[] = [];

    if (audience === 'OWNERS') {
      const owners = await this.getCenterOwners(intent.centerId);
      for (const owner of owners) {
        if (owner.id === intent.actorId) continue;
        const user = await this.userService.findOne(owner.userId);
        if (user) {
          recipients.push({
            userId: user.id,
            profileId: owner.id,
            profileType: owner.profileType,
            phone: user.getPhone(),
            email: null,
            locale: this.extractLocale(user),
          });
        }
      }
    }

    return { templateVariables, recipients };
  }

  private async getCenterOwners(centerId: string) {
    const profileRoles = await this.profileRoleRepository
      .createQueryBuilder('pr')
      .innerJoin('pr.role', 'role')
      .leftJoinAndSelect('pr.userProfile', 'userProfile')
      .where('pr.centerId = :centerId', { centerId })
      .andWhere('role.name = :roleName', { roleName: DefaultRoles.OWNER })
      .getMany();
    return profileRoles
      .map((pr) => pr.userProfile)
      .filter((p): p is NonNullable<typeof p> => p != null);
  }
}
