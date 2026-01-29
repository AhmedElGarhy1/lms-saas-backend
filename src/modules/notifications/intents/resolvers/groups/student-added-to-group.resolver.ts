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
 * Resolver for STUDENT_ADDED_TO_GROUP notification (OPERATIONAL)
 *
 * Enrollment confirmation - Push + In-App for student and parents
 */
@Injectable()
export class StudentAddedToGroupResolver
  extends BaseIntentResolver
  implements NotificationIntentResolver<NotificationType.STUDENT_ADDED_TO_GROUP>
{
  private readonly logger: Logger = new Logger(StudentAddedToGroupResolver.name);

  constructor(
    private readonly userService: UserService,
    private readonly userProfileService: UserProfileService,
    private readonly groupsRepository: GroupsRepository,
    private readonly centersRepository: CentersRepository,
  ) {
    super();
  }

  async resolveIntent(
    intent: IntentForNotification<NotificationType.STUDENT_ADDED_TO_GROUP>,
    audience: AudienceIdForNotification<NotificationType.STUDENT_ADDED_TO_GROUP>,
  ) {
    const group = await this.groupsRepository.findById(intent.groupId, ['class']);
    if (!group) {
      throw new Error(
        `STUDENT_ADDED_TO_GROUP: Group not found: ${intent.groupId}`,
      );
    }

    const center = await this.centersRepository.findOne(intent.centerId);
    if (!center) {
      throw new Error(
        `STUDENT_ADDED_TO_GROUP: Center not found: ${intent.centerId}`,
      );
    }

    const studentProfile = await this.userProfileService.findOne(
      intent.studentUserProfileId,
    );
    if (!studentProfile) {
      throw new Error(
        `STUDENT_ADDED_TO_GROUP: Student profile not found: ${intent.studentUserProfileId}`,
      );
    }

    const studentUser = await this.userService.findOne(studentProfile.userId);
    if (!studentUser) {
      throw new Error(
        `STUDENT_ADDED_TO_GROUP: Student user not found: ${studentProfile.userId}`,
      );
    }

    const templateVariables = {
      studentName: studentUser.name,
      groupName: group.name,
      className: group.class?.name || '',
      centerName: center.name,
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
        // TODO: Implement parent recipients based on parent-student relationship
        break;
    }

    return { templateVariables, recipients };
  }
}
