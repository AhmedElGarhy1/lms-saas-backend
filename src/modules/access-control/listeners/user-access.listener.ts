import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { OnEvent } from '@nestjs/event-emitter';
import { AccessControlService } from '../services/access-control.service';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { UserActivityType } from '@/modules/user/enums/user-activity-type.enum';
import {
  GrantUserAccessEvent,
  RevokeUserAccessEvent,
} from '../events/access-control.events';
import { AccessControlEvents } from '@/shared/events/access-control.events.enum';

@Injectable()
export class UserAccessListener {
  private readonly logger: Logger;

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly accessControlService: AccessControlService,
    private readonly activityLogService: ActivityLogService,
  ) {
    // Use class name as context
    const context = this.constructor.name;
    this.logger = new Logger(context);
  }

  @OnEvent(AccessControlEvents.GRANT_USER_ACCESS)
  async handleGrantUserAccess(event: GrantUserAccessEvent) {
    const { granterUserProfileId, targetUserProfileId, centerId, actor } =
      event;

    try {
      // Call service to grant access
      await this.accessControlService.grantUserAccessInternal({
        granterUserProfileId,
        targetUserProfileId,
        centerId,
      });
    } catch (error: unknown) {
      this.logger.error(
        `Failed to grant user access - granterUserProfileId: ${granterUserProfileId}, targetUserProfileId: ${targetUserProfileId}, centerId: ${centerId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return;
    }

    // ActivityLogService is fault-tolerant, no try-catch needed
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

    try {
      // Call service to revoke access
      await this.accessControlService.revokeUserAccess({
        granterUserProfileId,
        targetUserProfileId,
        centerId,
      });
    } catch (error: unknown) {
      this.logger.error(
        `Failed to revoke user access - granterUserProfileId: ${granterUserProfileId}, targetUserProfileId: ${targetUserProfileId}, centerId: ${centerId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return;
    }

    // ActivityLogService is fault-tolerant, no try-catch needed
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
