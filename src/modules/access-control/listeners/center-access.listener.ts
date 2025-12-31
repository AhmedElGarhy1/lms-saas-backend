import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { OnEvent } from '@nestjs/event-emitter';
import { AccessControlService } from '../services/access-control.service';
import {
  GrantCenterAccessEvent,
  RevokeCenterAccessEvent,
  ActivateCenterAccessEvent,
  DeactivateCenterAccessEvent,
} from '../events/access-control.events';
import { AccessControlEvents } from '@/shared/events/access-control.events.enum';

@Injectable()
export class CenterAccessListener {
  private readonly logger: Logger = new Logger(CenterAccessListener.name);

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly accessControlService: AccessControlService,
  ) {}

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

  @OnEvent(AccessControlEvents.ACTIVATE_CENTER_ACCESS)
  async handleActivateCenterAccess(event: ActivateCenterAccessEvent) {
    // Activity logging removed
  }

  @OnEvent(AccessControlEvents.DEACTIVATE_CENTER_ACCESS)
  async handleDeactivateCenterAccess(event: DeactivateCenterAccessEvent) {
    // Activity logging removed
  }
}
