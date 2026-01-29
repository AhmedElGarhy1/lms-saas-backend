import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '../../../enums/notification-type.enum';
import { NotificationIntentResolver } from '../../interfaces/notification-intent-resolver.interface';
import { BaseIntentResolver } from '../../base/base-intent-resolver.abstract';
import { IntentForNotification } from '../../../types/notification-intent.map';
import { AudienceIdForNotification } from '../../../types/audience-id.types';
import { RecipientInfo } from '../../../types/recipient-info.interface';
import { UserService } from '@/modules/user/services/user.service';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { CentersRepository } from '@/modules/centers/repositories/centers.repository';

/**
 * Resolver for STUDENT_REMOVED_FROM_GROUP notification (OPERATIONAL)
 *
 * Important but not emergency - Push + In-App
 */
@Injectable()
export class StudentRemovedFromGroupResolver
  extends BaseIntentResolver
  implements NotificationIntentResolver<NotificationType.STUDENT_REMOVED_FROM_GROUP>
{
  private readonly logger: Logger = new Logger(StudentRemovedFromGroupResolver.name);

  constructor(
    private readonly userService: UserService,
    private readonly userProfileService: UserProfileService,
    private readonly centersRepository: CentersRepository,
  ) {
    super();
  }

  async resolveIntent(
    intent: IntentForNotification<NotificationType.STUDENT_REMOVED_FROM_GROUP>,
    audience: AudienceIdForNotification<NotificationType.STUDENT_REMOVED_FROM_GROUP>,
  ) {
    const center = await this.centersRepository.findOne(intent.centerId);
    if (!center) {
      throw new Error(
        `STUDENT_REMOVED_FROM_GROUP: Center not found: ${intent.centerId}`,
      );
    }

    const studentProfile = await this.userProfileService.findOne(
      intent.studentUserProfileId,
    );
    if (!studentProfile) {
      throw new Error(
        `STUDENT_REMOVED_FROM_GROUP: Student profile not found: ${intent.studentUserProfileId}`,
      );
    }

    const studentUser = await this.userService.findOne(studentProfile.userId);
    if (!studentUser) {
      throw new Error(
        `STUDENT_REMOVED_FROM_GROUP: Student user not found: ${studentProfile.userId}`,
      );
    }

    const actor = await this.userProfileService.findOne(intent.actorId);
    const actorUser = actor ? await this.userService.findOne(actor.userId) : null;

    const templateVariables = {
      studentName: studentUser.name,
      groupName: intent.groupName,
      className: intent.className,
      centerName: center.name,
      actorName: actorUser?.name || '',
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
