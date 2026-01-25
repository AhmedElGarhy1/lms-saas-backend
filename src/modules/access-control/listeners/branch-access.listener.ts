import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AccessControlService } from '../services/access-control.service';
import {
  GrantBranchAccessEvent,
  RevokeBranchAccessEvent,
} from '../events/access-control.events';
import { AccessControlEvents } from '@/shared/events/access-control.events.enum';

@Injectable()
export class BranchAccessListener {
  private readonly logger: Logger = new Logger(BranchAccessListener.name);

  constructor(private readonly accessControlService: AccessControlService) {}

  @OnEvent(AccessControlEvents.GRANT_BRANCH_ACCESS)
  async handleGrantBranchAccess(event: GrantBranchAccessEvent) {
    // TODO: Implement branch access granting when the service method is available
    // Activity logging removed
  }

  @OnEvent(AccessControlEvents.REVOKE_BRANCH_ACCESS)
  async handleRevokeBranchAccess(event: RevokeBranchAccessEvent) {
    // TODO: Implement branch access revoking when the service method is available
    // Activity logging removed
  }
}
