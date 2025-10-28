import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AccessControlService } from '../services/access-control.service';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { UserActivityType } from '@/modules/user/enums/user-activity-type.enum';
import {
  GrantUserAccessEvent,
  RevokeUserAccessEvent,
  AccessControlEvents,
} from '../events/access-control.events';

@Injectable()
export class UserAccessListener {
  constructor(
    private readonly accessControlService: AccessControlService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  @OnEvent(AccessControlEvents.GRANT_USER_ACCESS)
  async handleGrantUserAccess(event: GrantUserAccessEvent) {
    const { granterUserProfileId, targetUserProfileId, centerId, actor } =
      event;

    // Call service to grant access
    await this.accessControlService.grantUserAccessInternal({
      granterUserProfileId,
      targetUserProfileId,
      centerId,
    });

    // Log activity
    await this.activityLogService.log(
      UserActivityType.USER_ACCESS_GRANTED,
      {
        granterUserProfileId,
        targetUserProfileId,
        centerId,
        accessType: 'USER',
      },
      actor,
    );
  }

  @OnEvent(AccessControlEvents.REVOKE_USER_ACCESS)
  async handleRevokeUserAccess(event: RevokeUserAccessEvent) {
    const { granterUserProfileId, targetUserProfileId, centerId, actor } =
      event;

    // Call service to revoke access
    await this.accessControlService.revokeUserAccess({
      granterUserProfileId,
      targetUserProfileId,
      centerId,
    });

    // Log activity
    await this.activityLogService.log(
      UserActivityType.USER_ACCESS_REVOKED,
      {
        granterUserProfileId,
        targetUserProfileId,
        centerId,
        accessType: 'USER',
      },
      actor,
    );
  }
}
