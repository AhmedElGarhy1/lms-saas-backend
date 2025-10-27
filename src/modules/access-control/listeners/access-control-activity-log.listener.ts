import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { CenterActivityType } from '@/modules/centers/enums/center-activity-type.enum';
import { UserActivityType } from '@/modules/user/enums/user-activity-type.enum';
import {
  CenterAccessGrantedEvent,
  CenterAccessRevokedEvent,
  UserAccessGrantedEvent,
  UserAccessRevokedEvent,
  AccessControlEvents,
} from '../events/access-control.events';

@Injectable()
export class AccessControlActivityLogListener {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @OnEvent(AccessControlEvents.CENTER_ACCESS_GRANTED)
  async handleCenterAccessGranted(event: CenterAccessGrantedEvent) {
    await this.activityLogService.log(
      CenterActivityType.CENTER_ACCESS_GRANTED,
      {
        userProfileId: event.userProfileId,
        centerId: event.centerId,
        accessType: 'CENTER',
      },
      event.actor,
    );
  }

  @OnEvent(AccessControlEvents.CENTER_ACCESS_REVOKED)
  async handleCenterAccessRevoked(event: CenterAccessRevokedEvent) {
    await this.activityLogService.log(
      CenterActivityType.CENTER_ACCESS_REVOKED,
      {
        userProfileId: event.userProfileId,
        centerId: event.centerId,
        accessType: 'CENTER',
      },
      event.actor,
    );
  }

  @OnEvent(AccessControlEvents.USER_ACCESS_GRANTED)
  async handleUserAccessGranted(event: UserAccessGrantedEvent) {
    await this.activityLogService.log(
      UserActivityType.USER_ACCESS_GRANTED,
      {
        granterUserProfileId: event.granterUserProfileId,
        targetUserProfileId: event.targetUserProfileId,
        centerId: event.centerId,
        accessType: 'USER',
      },
      event.actor,
    );
  }

  @OnEvent(AccessControlEvents.USER_ACCESS_REVOKED)
  async handleUserAccessRevoked(event: UserAccessRevokedEvent) {
    await this.activityLogService.log(
      UserActivityType.USER_ACCESS_REVOKED,
      {
        granterUserProfileId: event.granterUserProfileId,
        targetUserProfileId: event.targetUserProfileId,
        centerId: event.centerId,
        accessType: 'USER',
      },
      event.actor,
    );
  }
}
