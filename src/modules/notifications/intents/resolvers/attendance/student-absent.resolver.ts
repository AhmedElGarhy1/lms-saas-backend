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

/**
 * Resolver for STUDENT_ABSENT notification
 *
 * TARGET = student. PARENTS = stub (TODO: parent–student resolution).
 */
@Injectable()
export class StudentAbsentResolver
  extends BaseIntentResolver
  implements NotificationIntentResolver<NotificationType.STUDENT_ABSENT>
{
  private readonly logger: Logger = new Logger(StudentAbsentResolver.name);

  constructor(
    private readonly userService: UserService,
    private readonly userProfileService: UserProfileService,
    private readonly groupsRepository: GroupsRepository,
    private readonly centersRepository: CentersRepository,
  ) {
    super();
  }

  async resolveIntent(
    intent: IntentForNotification<NotificationType.STUDENT_ABSENT>,
    audience: AudienceIdForNotification<NotificationType.STUDENT_ABSENT>,
  ) {
    const group = await this.groupsRepository.findById(intent.groupId, [
      'class',
    ]);
    if (!group) {
      throw new Error(
        `STUDENT_ABSENT: Group not found: ${intent.groupId}`,
      );
    }

    const center = await this.centersRepository.findOne(intent.centerId);
    if (!center) {
      throw new Error(
        `STUDENT_ABSENT: Center not found: ${intent.centerId}`,
      );
    }

    const studentProfile = await this.userProfileService.findOne(
      intent.studentUserProfileId,
    );
    if (!studentProfile) {
      throw new Error(
        `STUDENT_ABSENT: Student profile not found: ${intent.studentUserProfileId}`,
      );
    }

    const studentUser = await this.userService.findOne(studentProfile.userId);
    if (!studentUser) {
      throw new Error(
        `STUDENT_ABSENT: Student user not found: ${studentProfile.userId}`,
      );
    }

    const actorProfile = await this.userProfileService.findOne(intent.actorId);
    const actorUser = actorProfile
      ? await this.userService.findOne(actorProfile.userId)
      : null;
    const actorName = actorUser?.name ?? '';

    const templateVariables = {
      studentName: studentUser.name,
      className: group.class?.name ?? '',
      groupName: group.name,
      centerName: center.name,
      actorName,
    };

    const recipients: RecipientInfo[] = [];

    switch (audience) {
      case 'TARGET':
        recipients.push({
          userId: studentUser.id,
          profileId: studentProfile.id,
          profileType: studentProfile.profileType,
          phone: studentUser.getPhone(),
          email: null,
          locale: this.extractLocale(studentUser),
        });
        break;
      case 'PARENTS':
        // TODO: Implement parent recipients based on parent–student relationship
        break;
    }

    return { templateVariables, recipients };
  }
}
