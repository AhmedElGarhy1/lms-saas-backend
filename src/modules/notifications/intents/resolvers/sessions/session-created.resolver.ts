import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '../../../enums/notification-type.enum';
import { NotificationIntentResolver } from '../../interfaces/notification-intent-resolver.interface';
import { BaseIntentResolver } from '../../base/base-intent-resolver.abstract';
import { IntentForNotification } from '../../../types/notification-intent.map';
import { AudienceIdForNotification } from '../../../types/audience-id.types';
import { RecipientInfo } from '../../../types/recipient-info.interface';
import { UserService } from '@/modules/user/services/user.service';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { SessionsRepository } from '@/modules/sessions/repositories/sessions.repository';
import { GroupsRepository } from '@/modules/classes/repositories/groups.repository';
import { GroupStudentsRepository } from '@/modules/classes/repositories/group-students.repository';
import { ClassStaffRepository } from '@/modules/classes/repositories/class-staff.repository';
import { CentersRepository } from '@/modules/centers/repositories/centers.repository';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

/**
 * Resolver for SESSION_CREATED notification intent
 *
 * Multi-audience support:
 * - STUDENTS: Push + In-App (reminder)
 * - PARENTS: In-App only (just for awareness, not urgent)
 * - TEACHER: Push + In-App (reminder)
 * - STAFF: In-App only (operational)
 */
@Injectable()
export class SessionCreatedResolver
  extends BaseIntentResolver
  implements NotificationIntentResolver<NotificationType.SESSION_CREATED>
{
  private readonly logger: Logger = new Logger(SessionCreatedResolver.name);

  constructor(
    private readonly userService: UserService,
    private readonly userProfileService: UserProfileService,
    private readonly sessionsRepository: SessionsRepository,
    private readonly groupsRepository: GroupsRepository,
    private readonly groupStudentsRepository: GroupStudentsRepository,
    private readonly classStaffRepository: ClassStaffRepository,
    private readonly centersRepository: CentersRepository,
  ) {
    super();
  }

  async resolveIntent(
    intent: IntentForNotification<NotificationType.SESSION_CREATED>,
    audience: AudienceIdForNotification<NotificationType.SESSION_CREATED>,
  ) {
    const session = await this.sessionsRepository.findById(intent.sessionId);
    if (!session) {
      throw new Error(
        `SESSION_CREATED: Session not found: ${intent.sessionId}`,
      );
    }

    const group = await this.groupsRepository.findById(intent.groupId, [
      'class',
    ]);
    if (!group) {
      throw new Error(`SESSION_CREATED: Group not found: ${intent.groupId}`);
    }

    const center = await this.centersRepository.findOne(intent.centerId);
    if (!center) {
      throw new Error(`SESSION_CREATED: Center not found: ${intent.centerId}`);
    }

    // Get teacher name
    const teacherProfile = await this.userProfileService.findOne(
      session.teacherUserProfileId,
    );
    const teacherUser = teacherProfile
      ? await this.userService.findOne(teacherProfile.userId)
      : null;
    const teacherName = teacherUser?.name || '';

    const templateVariables = {
      sessionTitle: session.title || 'حصة',
      className: group.class?.name || '',
      groupName: group.name,
      startTime: format(session.startTime, 'EEEE d MMMM - h:mm a', {
        locale: ar,
      }),
      endTime: format(session.endTime, 'h:mm a', { locale: ar }),
      teacherName,
      centerName: center.name,
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
        await this.addTeacherRecipient(recipients, session.teacherUserProfileId);
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
