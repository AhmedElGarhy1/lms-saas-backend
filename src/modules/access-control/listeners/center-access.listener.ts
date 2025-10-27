import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AccessControlService } from '../services/access-control.service';
import {
  GrantCenterAccessEvent,
  RevokeCenterAccessEvent,
  CenterAccessGrantedEvent,
  CenterAccessRevokedEvent,
  AccessControlEvents,
} from '../events/access-control.events';

@Injectable()
export class CenterAccessListener {
  constructor(
    private readonly accessControlService: AccessControlService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(AccessControlEvents.GRANT_CENTER_ACCESS)
  async handleGrantCenterAccess(event: GrantCenterAccessEvent) {
    const { userProfileId, centerId, actor } = event;

    // Call service to grant access
    await this.accessControlService.grantCenterAccess(
      { userProfileId, centerId },
      actor,
    );

    // Emit result event for activity logging
    this.eventEmitter.emit(
      AccessControlEvents.CENTER_ACCESS_GRANTED,
      new CenterAccessGrantedEvent(userProfileId, centerId, actor),
    );
  }

  @OnEvent(AccessControlEvents.REVOKE_CENTER_ACCESS)
  async handleRevokeCenterAccess(event: RevokeCenterAccessEvent) {
    const { userProfileId, centerId, actor } = event;

    // Call service to revoke access
    await this.accessControlService.revokeCenterAccess(
      { userProfileId, centerId },
      actor,
    );

    // Emit result event for activity logging
    this.eventEmitter.emit(
      AccessControlEvents.CENTER_ACCESS_REVOKED,
      new CenterAccessRevokedEvent(userProfileId, centerId, actor),
    );
  }
}
