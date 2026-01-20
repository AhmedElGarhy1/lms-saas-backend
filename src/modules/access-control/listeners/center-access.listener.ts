import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AccessControlService } from '../services/access-control.service';
import {
  GrantCenterAccessEvent,
  RevokeCenterAccessEvent,
} from '../events/access-control.events';
import { AccessControlEvents } from '@/shared/events/access-control.events.enum';

@Injectable()
export class CenterAccessListener {
  private readonly logger: Logger = new Logger(CenterAccessListener.name);

  constructor(private readonly accessControlService: AccessControlService) {}

  @OnEvent(AccessControlEvents.GRANT_CENTER_ACCESS)
  async handleGrantCenterAccess(event: GrantCenterAccessEvent) {
    const { userProfileId, centerId, actor, isCenterAccessActive } = event;

    try {
      // Call service to grant access
      await this.accessControlService.grantCenterAccess(
        { userProfileId, centerId, isActive: isCenterAccessActive ?? true },
        actor,
        true,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Failed to grant center access - userProfileId: ${userProfileId}, centerId: ${centerId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return;
    }

    // Activity logging removed
  }

  @OnEvent(AccessControlEvents.REVOKE_CENTER_ACCESS)
  async handleRevokeCenterAccess(event: RevokeCenterAccessEvent) {
    const { userProfileId, centerId, actor } = event;

    try {
      // Call service to revoke access
      await this.accessControlService.revokeCenterAccess(
        { userProfileId, centerId },
        actor,
        true,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Failed to revoke center access - userProfileId: ${userProfileId}, centerId: ${centerId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return;
    }

    // Activity logging removed
  }
}
