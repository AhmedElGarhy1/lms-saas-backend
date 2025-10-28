import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AccessControlService } from '../services/access-control.service';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { CenterActivityType } from '@/modules/centers/enums/center-activity-type.enum';
import {
  GrantBranchAccessEvent,
  RevokeBranchAccessEvent,
  AccessControlEvents,
} from '../events/access-control.events';

@Injectable()
export class BranchAccessListener {
  constructor(
    private readonly accessControlService: AccessControlService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  @OnEvent(AccessControlEvents.GRANT_BRANCH_ACCESS)
  async handleGrantBranchAccess(event: GrantBranchAccessEvent) {
    const { userProfileId, branchId, centerId, actor } = event;

    // TODO: Implement branch access granting when the service method is available
    // For now, just log the activity
    await this.activityLogService.log(
      CenterActivityType.BRANCH_ACCESS_GRANTED,
      {
        userProfileId,
        branchId,
        centerId,
        accessType: 'BRANCH',
      },
      actor,
    );
  }

  @OnEvent(AccessControlEvents.REVOKE_BRANCH_ACCESS)
  async handleRevokeBranchAccess(event: RevokeBranchAccessEvent) {
    const { userProfileId, branchId, centerId, actor } = event;

    // TODO: Implement branch access revoking when the service method is available
    // For now, just log the activity
    await this.activityLogService.log(
      CenterActivityType.BRANCH_ACCESS_REVOKED,
      {
        userProfileId,
        branchId,
        centerId,
        accessType: 'BRANCH',
      },
      actor,
    );
  }
}
