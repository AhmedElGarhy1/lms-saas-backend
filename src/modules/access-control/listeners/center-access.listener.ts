import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { OnEvent } from '@nestjs/event-emitter';
import { AccessControlService } from '../services/access-control.service';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { CenterActivityType } from '@/modules/centers/enums/center-activity-type.enum';
import {
  GrantCenterAccessEvent,
  RevokeCenterAccessEvent,
  ActivateCenterAccessEvent,
  DeactivateCenterAccessEvent,
} from '../events/access-control.events';
import { AccessControlEvents } from '@/shared/events/access-control.events.enum';

@Injectable()
export class CenterAccessListener {
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

  @OnEvent(AccessControlEvents.GRANT_CENTER_ACCESS)
  async handleGrantCenterAccess(event: GrantCenterAccessEvent) {
    const { userProfileId, centerId, actor } = event;

    try {
      // Call service to grant access
      await this.accessControlService.grantCenterAccess(
        { userProfileId, centerId },
        actor,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Failed to grant center access - userProfileId: ${userProfileId}, centerId: ${centerId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return;
    }

    // ActivityLogService is fault-tolerant, no try-catch needed
    await this.activityLogService.log(
      CenterActivityType.CENTER_ACCESS_GRANTED,
      {
        userProfileId,
        centerId,
        accessType: 'CENTER',
      },
      actor,
    );
  }

  @OnEvent(AccessControlEvents.REVOKE_CENTER_ACCESS)
  async handleRevokeCenterAccess(event: RevokeCenterAccessEvent) {
    const { userProfileId, centerId, actor } = event;

    try {
      // Call service to revoke access
      await this.accessControlService.revokeCenterAccess(
        { userProfileId, centerId },
        actor,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Failed to revoke center access - userProfileId: ${userProfileId}, centerId: ${centerId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return;
    }

    // ActivityLogService is fault-tolerant, no try-catch needed
    await this.activityLogService.log(
      CenterActivityType.CENTER_ACCESS_REVOKED,
      {
        userProfileId,
        centerId,
        accessType: 'CENTER',
      },
      actor,
    );
  }

  @OnEvent(AccessControlEvents.ACTIVATE_CENTER_ACCESS)
  async handleActivateCenterAccess(event: ActivateCenterAccessEvent) {
    const { userProfileId, centerId, isActive, actor } = event;

    // ActivityLogService is fault-tolerant, no try-catch needed
    await this.activityLogService.log(
      CenterActivityType.CENTER_ACCESS_ACTIVATED,
      {
        userProfileId,
        centerId,
        isActive,
        accessType: 'CENTER',
      },
      actor,
    );
  }

  @OnEvent(AccessControlEvents.DEACTIVATE_CENTER_ACCESS)
  async handleDeactivateCenterAccess(event: DeactivateCenterAccessEvent) {
    const { userProfileId, centerId, isActive, actor } = event;

    // ActivityLogService is fault-tolerant, no try-catch needed
    await this.activityLogService.log(
      CenterActivityType.CENTER_ACCESS_DEACTIVATED,
      {
        userProfileId,
        centerId,
        isActive,
        accessType: 'CENTER',
      },
      actor,
    );
  }
}
