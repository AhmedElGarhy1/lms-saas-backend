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
import { ClassStaffRepository } from '@/modules/classes/repositories/class-staff.repository';
import { CentersRepository } from '@/modules/centers/repositories/centers.repository';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

/**
 * Resolver for SESSION_CONFLICT_DETECTED notification intent
 *
 * Administrative issue, doesn't concern students/parents
 * Multi-audience support:
 * - STUDENTS: None (not their concern)
 * - PARENTS: None (not their concern)
 * - TEACHER: Push + In-App (needs to resolve conflict)
 * - STAFF: Push + In-App (needs to resolve conflict)
 */
@Injectable()
export class SessionConflictDetectedResolver
  extends BaseIntentResolver
  implements
    NotificationIntentResolver<NotificationType.SESSION_CONFLICT_DETECTED>
{
  private readonly logger: Logger = new Logger(
    SessionConflictDetectedResolver.name,
  );

  constructor(
    private readonly userService: UserService,
    private readonly userProfileService: UserProfileService,
    private readonly groupsRepository: GroupsRepository,
    private readonly classStaffRepository: ClassStaffRepository,
    private readonly centersRepository: CentersRepository,
  ) {
    super();
  }

  async resolveIntent(
    intent: IntentForNotification<NotificationType.SESSION_CONFLICT_DETECTED>,
    audience: AudienceIdForNotification<NotificationType.SESSION_CONFLICT_DETECTED>,
  ) {
    const group = await this.groupsRepository.findById(intent.groupId, [
      'class',
    ]);
    if (!group) {
      throw new Error(
        `SESSION_CONFLICT_DETECTED: Group not found: ${intent.groupId}`,
      );
    }

    const center = await this.centersRepository.findOne(intent.centerId);
    if (!center) {
      throw new Error(
        `SESSION_CONFLICT_DETECTED: Center not found: ${intent.centerId}`,
      );
    }

    const conflictTypeAr = intent.conflictType === 'TEACHER' ? 'المدرس' : 'المجموعة';

    const templateVariables = {
      groupName: group.name,
      conflictType: conflictTypeAr,
      proposedStartTime: format(intent.proposedStartTime, 'EEEE d MMMM - h:mm a', {
        locale: ar,
      }),
      proposedEndTime: format(intent.proposedEndTime, 'h:mm a', { locale: ar }),
      centerName: center.name,
    };

    const recipients: RecipientInfo[] = [];

    switch (audience) {
      // STUDENTS: None - not their concern
      // PARENTS: None - not their concern
      case 'TEACHER':
        if (group.class?.teacherUserProfileId) {
          await this.addTeacherRecipient(
            recipients,
            group.class.teacherUserProfileId,
          );
        }
        break;
      case 'STAFF':
        await this.addStaffRecipients(recipients, group.classId, intent.centerId);
        break;
    }

    return { templateVariables, recipients };
  }

  private async addTeacherRecipient(
    recipients: RecipientInfo[],
    teacherProfileId: string,
  ) {
    const profile = await this.userProfileService.findOne(teacherProfileId);
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
        const profile = await this.userProfileService.findOne(cs.userProfileId);
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
    }
  }
}
