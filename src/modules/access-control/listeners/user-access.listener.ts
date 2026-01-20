import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AccessControlService } from '../services/access-control.service';
import {
  GrantUserAccessEvent,
  RevokeUserAccessEvent,
} from '../events/access-control.events';
import { AccessControlEvents } from '@/shared/events/access-control.events.enum';

@Injectable()
export class UserAccessListener {
  private readonly logger: Logger = new Logger(UserAccessListener.name);

  constructor(private readonly accessControlService: AccessControlService) {}

  @OnEvent(AccessControlEvents.GRANT_USER_ACCESS)
  async handleGrantUserAccess(event: GrantUserAccessEvent) {
    const { granterUserProfileId, targetUserProfileId, centerId, actor } =
      event;
console.log('granterUserProfileId', granterUserProfileId);
    try {
      // Call service to grant access
      await this.accessControlService.grantUserAccess(
        {
          granterUserProfileId,
          targetUserProfileId,
          centerId,
        },
        actor,
        true,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Failed to grant user access - granterUserProfileId: ${granterUserProfileId}, targetUserProfileId: ${targetUserProfileId}, centerId: ${centerId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return;
    }

    // Activity logging removed
  }

  @OnEvent(AccessControlEvents.REVOKE_USER_ACCESS)
  async handleRevokeUserAccess(event: RevokeUserAccessEvent) {
    const { granterUserProfileId, targetUserProfileId, centerId, actor } =
      event;

    try {
      // Call service to revoke access
      await this.accessControlService.revokeUserAccess(
        {
          granterUserProfileId,
          targetUserProfileId,
          centerId,
        },
        actor,
        true,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Failed to revoke user access - granterUserProfileId: ${granterUserProfileId}, targetUserProfileId: ${targetUserProfileId}, centerId: ${centerId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return;
    }

    // Activity logging removed
  }
}
