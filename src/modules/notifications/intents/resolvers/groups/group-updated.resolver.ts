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
import { GroupStudentsRepository } from '@/modules/classes/repositories/group-students.repository';

/**
 * Resolver for GROUP_UPDATED notification
 *
 * Schedule changes get Push - otherwise In-App only
 */
@Injectable()
export class GroupUpdatedResolver
  extends BaseIntentResolver
  implements NotificationIntentResolver<NotificationType.GROUP_UPDATED>
{
  private readonly logger: Logger = new Logger(GroupUpdatedResolver.name);

  constructor(
    private readonly userService: UserService,
    private readonly userProfileService: UserProfileService,
    private readonly groupsRepository: GroupsRepository,
    private readonly centersRepository: CentersRepository,
    private readonly classStaffRepository: ClassStaffRepository,
    private readonly groupStudentsRepository: GroupStudentsRepository,
  ) {
    super();
  }

  async resolveIntent(
    intent: IntentForNotification<NotificationType.GROUP_UPDATED>,
    audience: AudienceIdForNotification<NotificationType.GROUP_UPDATED>,
  ) {
    const group = await this.groupsRepository.findById(intent.groupId, ['class']);
    if (!group) {
      throw new Error(`GROUP_UPDATED: Group not found: ${intent.groupId}`);
    }

    const center = await this.centersRepository.findOne(intent.centerId);
    if (!center) {
      throw new Error(`GROUP_UPDATED: Center not found: ${intent.centerId}`);
    }

    const actor = await this.userProfileService.findOne(intent.actorId);
    const actorUser = actor ? await this.userService.findOne(actor.userId) : null;

    const templateVariables = {
      groupName: group.name,
      className: group.class?.name || '',
      centerName: center.name,
      actorName: actorUser?.name || '',
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
      case 'STUDENTS':
        await this.addStudentRecipients(recipients, intent.groupId);
        break;
      case 'PARENTS':
        // TODO: Implement parent recipients based on parent-student relationship
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

  private async addStudentRecipients(recipients: RecipientInfo[], groupId: string) {
    const groupStudents = await this.groupStudentsRepository.findByGroupId(groupId);
    for (const gs of groupStudents) {
      await this.addRecipient(recipients, gs.studentUserProfileId);
    }
  }
}
