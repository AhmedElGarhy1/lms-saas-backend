import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '../../../enums/notification-type.enum';
import { NotificationIntentResolver } from '../../interfaces/notification-intent-resolver.interface';
import { BaseIntentResolver } from '../../base/base-intent-resolver.abstract';
import { IntentForNotification } from '../../../types/notification-intent.map';
import { AudienceIdForNotification } from '../../../types/audience-id.types';
import { RecipientInfo } from '../../../types/recipient-info.interface';
import { UserService } from '@/modules/user/services/user.service';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { GroupsRepository } from '@/modules/classes/repositories/groups.repository';
import { CentersRepository } from '@/modules/centers/repositories/centers.repository';
import { ClassStaffRepository } from '@/modules/classes/repositories/class-staff.repository';

/**
 * Resolver for GROUP_CREATED notification (INFORMATIONAL)
 *
 * In-App only for audit trail
 * Multi-audience support:
 * - TEACHER: In-App only
 * - STAFF: In-App only
 */
@Injectable()
export class GroupCreatedResolver
  extends BaseIntentResolver
  implements NotificationIntentResolver<NotificationType.GROUP_CREATED>
{
  private readonly logger: Logger = new Logger(GroupCreatedResolver.name);

  constructor(
    private readonly userService: UserService,
    private readonly userProfileService: UserProfileService,
    private readonly groupsRepository: GroupsRepository,
    private readonly centersRepository: CentersRepository,
    private readonly classStaffRepository: ClassStaffRepository,
  ) {
    super();
  }

  async resolveIntent(
    intent: IntentForNotification<NotificationType.GROUP_CREATED>,
    audience: AudienceIdForNotification<NotificationType.GROUP_CREATED>,
  ) {
    const group = await this.groupsRepository.findById(intent.groupId, ['class']);
    if (!group) {
      throw new Error(`GROUP_CREATED: Group not found: ${intent.groupId}`);
    }

    const center = await this.centersRepository.findOne(intent.centerId);
    if (!center) {
      throw new Error(`GROUP_CREATED: Center not found: ${intent.centerId}`);
    }

    const templateVariables = {
      groupName: group.name,
      className: group.class?.name || '',
      centerName: center.name,
    };

    const recipients: RecipientInfo[] = [];

    switch (audience) {
      case 'TEACHER':
        if (group.class?.teacherUserProfileId) {
          await this.addRecipient(recipients, group.class.teacherUserProfileId);
        }
        break;
      case 'STAFF':
        await this.addStaffRecipients(recipients, intent.classId, intent.centerId);
        break;
    }

    return { templateVariables, recipients };
  }

  private async addRecipient(recipients: RecipientInfo[], profileId: string) {
    const profile = await this.userProfileService.findOne(profileId);
    if (profile) {
      const user = await this.userService.findOne(profile.userId);
      if (user) {
        recipients.push({
          userId: user.id,
          profileId: profile.id,
          profileType: profile.profileType,
          phone: user.getPhone(),
          email: null,
          locale: this.extractLocale(user),
        });
      }
    }
  }

  private async addStaffRecipients(
    recipients: RecipientInfo[],
    classId: string,
    centerId: string,
  ) {
    const classStaffList = await this.classStaffRepository.findByClassId(classId);
    for (const cs of classStaffList) {
      if (cs.centerId === centerId) {
        await this.addRecipient(recipients, cs.userProfileId);
      }
    }
  }
}
