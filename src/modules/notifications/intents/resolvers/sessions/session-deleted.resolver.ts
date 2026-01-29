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
import { GroupStudentsRepository } from '@/modules/classes/repositories/group-students.repository';
import { ClassStaffRepository } from '@/modules/classes/repositories/class-staff.repository';
import { CentersRepository } from '@/modules/centers/repositories/centers.repository';
import { ClassesRepository } from '@/modules/classes/repositories/classes.repository';

/**
 * Resolver for SESSION_DELETED notification intent - CRITICAL
 *
 * Similar to cancellation - prevents unnecessary travel
 * Note: Session is already deleted, so we use group/class info
 *
 * Multi-audience support:
 * - STUDENTS: WhatsApp + Push + In-App
 * - PARENTS: WhatsApp + Push + In-App (safety concern)
 * - TEACHER: WhatsApp + Push + In-App
 * - STAFF: Push + In-App (operational awareness)
 */
@Injectable()
export class SessionDeletedResolver
  extends BaseIntentResolver
  implements NotificationIntentResolver<NotificationType.SESSION_DELETED>
{
  private readonly logger: Logger = new Logger(SessionDeletedResolver.name);

  constructor(
    private readonly userService: UserService,
    private readonly userProfileService: UserProfileService,
    private readonly groupsRepository: GroupsRepository,
    private readonly groupStudentsRepository: GroupStudentsRepository,
    private readonly classStaffRepository: ClassStaffRepository,
    private readonly centersRepository: CentersRepository,
    private readonly classesRepository: ClassesRepository,
  ) {
    super();
  }

  async resolveIntent(
    intent: IntentForNotification<NotificationType.SESSION_DELETED>,
    audience: AudienceIdForNotification<NotificationType.SESSION_DELETED>,
  ) {
    // Note: Session is deleted, so we rely on group/class info
    const group = await this.groupsRepository.findById(intent.groupId, [
      'class',
    ]);
    if (!group) {
      throw new Error(`SESSION_DELETED: Group not found: ${intent.groupId}`);
    }

    const center = await this.centersRepository.findOne(intent.centerId);
    if (!center) {
      throw new Error(`SESSION_DELETED: Center not found: ${intent.centerId}`);
    }

    const actor = await this.userProfileService.findOne(intent.actorId);
    if (!actor) {
      throw new Error(
        `SESSION_DELETED: Actor profile not found: ${intent.actorId}`,
      );
    }

    const actorUser = await this.userService.findOne(actor.userId);
    if (!actorUser) {
      throw new Error(`SESSION_DELETED: Actor user not found: ${actor.userId}`);
    }

    const templateVariables = {
      sessionTitle: 'حصة',
      className: group.class?.name || '',
      groupName: group.name,
      startTime: '', // Session is deleted, time may not be available
      centerName: center.name,
      actorName: actorUser.name,
    };

    const recipients: RecipientInfo[] = [];

    switch (audience) {
      case 'STUDENTS':
        await this.addStudentRecipients(recipients, intent.groupId);
        break;
      case 'PARENTS':
        // TODO: Implement parent recipients based on parent-student relationship
        break;
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

  private async addStudentRecipients(
    recipients: RecipientInfo[],
    groupId: string,
  ) {
    const groupStudents = await this.groupStudentsRepository.findByGroupId(groupId);
    for (const gs of groupStudents) {
      const profile = await this.userProfileService.findOne(
        gs.studentUserProfileId,
      );
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
