import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AccessControlService } from '../services/access-control.service';
import {
  GrantUserAccessEvent,
  RevokeUserAccessEvent,
  UserAccessGrantedEvent,
  UserAccessRevokedEvent,
  AccessControlEvents,
} from '../events/access-control.events';

@Injectable()
export class UserAccessListener {
  constructor(
    private readonly accessControlService: AccessControlService,
    private readonly eventEmitter: EventEmitter2,
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

    // Emit result event for activity logging
    this.eventEmitter.emit(
      AccessControlEvents.USER_ACCESS_GRANTED,
      new UserAccessGrantedEvent(
        granterUserProfileId,
        targetUserProfileId,
        centerId,
        actor,
      ),
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

    // Emit result event for activity logging
    this.eventEmitter.emit(
      AccessControlEvents.USER_ACCESS_REVOKED,
      new UserAccessRevokedEvent(
        granterUserProfileId,
        targetUserProfileId,
        centerId,
        actor,
      ),
    );
  }
}
