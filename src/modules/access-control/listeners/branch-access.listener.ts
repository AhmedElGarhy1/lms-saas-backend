import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AccessControlService } from '../services/access-control.service';
import {
  GrantBranchAccessEvent,
  RevokeBranchAccessEvent,
  BranchAccessGrantedEvent,
  BranchAccessRevokedEvent,
  AccessControlEvents,
} from '../events/access-control.events';

@Injectable()
export class BranchAccessListener {
  constructor(
    private readonly accessControlService: AccessControlService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(AccessControlEvents.GRANT_BRANCH_ACCESS)
  async handleGrantBranchAccess(event: GrantBranchAccessEvent) {
    const { userProfileId, branchId, centerId, actor } = event;

    // TODO: Implement branch access granting when the service method is available
    // For now, just emit the result event
    this.eventEmitter.emit(
      AccessControlEvents.BRANCH_ACCESS_GRANTED,
      new BranchAccessGrantedEvent(userProfileId, branchId, centerId, actor),
    );
  }

  @OnEvent(AccessControlEvents.REVOKE_BRANCH_ACCESS)
  async handleRevokeBranchAccess(event: RevokeBranchAccessEvent) {
    const { userProfileId, branchId, centerId, actor } = event;

    // TODO: Implement branch access revoking when the service method is available
    // For now, just emit the result event
    this.eventEmitter.emit(
      AccessControlEvents.BRANCH_ACCESS_REVOKED,
      new BranchAccessRevokedEvent(userProfileId, branchId, centerId, actor),
    );
  }
}
