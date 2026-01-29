import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '../../../enums/notification-type.enum';
import { NotificationIntentResolver } from '../../interfaces/notification-intent-resolver.interface';
import { BaseIntentResolver } from '../../base/base-intent-resolver.abstract';
import { IntentForNotification } from '../../../types/notification-intent.map';
import { AudienceIdForNotification } from '../../../types/audience-id.types';
import { RecipientInfo } from '../../../types/recipient-info.interface';
import { UserService } from '@/modules/user/services/user.service';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { ClassesRepository } from '@/modules/classes/repositories/classes.repository';
import { CentersRepository } from '@/modules/centers/repositories/centers.repository';
import { ClassStaffRepository } from '@/modules/classes/repositories/class-staff.repository';
import { GroupsRepository } from '@/modules/classes/repositories/groups.repository';
import { GroupStudentsRepository } from '@/modules/classes/repositories/group-students.repository';

/**
 * Resolver for CLASS_UPDATED notification (INFORMATIONAL)
 *
 * In-App for all - minor changes don't need Push
 */
@Injectable()
export class ClassUpdatedResolver
  extends BaseIntentResolver
  implements NotificationIntentResolver<NotificationType.CLASS_UPDATED>
{
  private readonly logger: Logger = new Logger(ClassUpdatedResolver.name);

  constructor(
    private readonly userService: UserService,
    private readonly userProfileService: UserProfileService,
    private readonly classesRepository: ClassesRepository,
    private readonly centersRepository: CentersRepository,
    private readonly classStaffRepository: ClassStaffRepository,
    private readonly groupsRepository: GroupsRepository,
    private readonly groupStudentsRepository: GroupStudentsRepository,
  ) {
    super();
  }

  async resolveIntent(
    intent: IntentForNotification<NotificationType.CLASS_UPDATED>,
    audience: AudienceIdForNotification<NotificationType.CLASS_UPDATED>,
  ) {
    const classEntity = await this.classesRepository.findById(intent.classId);
    if (!classEntity) {
      throw new Error(`CLASS_UPDATED: Class not found: ${intent.classId}`);
    }

    const center = await this.centersRepository.findOne(intent.centerId);
    if (!center) {
      throw new Error(`CLASS_UPDATED: Center not found: ${intent.centerId}`);
    }

    const actor = await this.userProfileService.findOne(intent.actorId);
    const actorUser = actor ? await this.userService.findOne(actor.userId) : null;

    const templateVariables = {
      className: classEntity.name,
      centerName: center.name,
      actorName: actorUser?.name || '',
    };

    const recipients: RecipientInfo[] = [];

    switch (audience) {
      case 'TEACHER':
        if (classEntity.teacherUserProfileId) {
          await this.addRecipient(recipients, classEntity.teacherUserProfileId);
        }
        break;
      case 'STAFF':
        await this.addStaffRecipients(recipients, intent.classId, intent.centerId);
        break;
      case 'STUDENTS':
        await this.addStudentRecipients(recipients, intent.classId);
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

  private async addStudentRecipients(recipients: RecipientInfo[], classId: string) {
    const groups = await this.groupsRepository.findByClassId(classId);
    for (const group of groups) {
      const groupStudents = await this.groupStudentsRepository.findByGroupId(group.id);
      for (const gs of groupStudents) {
        await this.addRecipient(recipients, gs.studentUserProfileId);
      }
    }
  }
}
