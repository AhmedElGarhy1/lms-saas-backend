import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AccessControlService } from '../services/access-control.service';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { CenterActivityType } from '@/modules/centers/enums/center-activity-type.enum';
import {
  GrantBranchAccessEvent,
  RevokeBranchAccessEvent,
} from '../events/access-control.events';
import { AccessControlEvents } from '@/shared/events/access-control.events.enum';

@Injectable()
export class BranchAccessListener {
  private readonly logger: Logger = new Logger(BranchAccessListener.name);

  constructor(
    private readonly accessControlService: AccessControlService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  @OnEvent(AccessControlEvents.GRANT_BRANCH_ACCESS)
  async handleGrantBranchAccess(event: GrantBranchAccessEvent) {
    // TODO: Implement branch access granting when the service method is available
    // For now, just log the activity

    // targetUserId will be automatically resolved from targetUserProfileId by ActivityLogService
    // ActivityLogService is fault-tolerant, no try-catch needed
    await this.activityLogService.log(
      CenterActivityType.BRANCH_ACCESS_GRANTED,
      {
        userProfileId: event.userProfileId,
        branchId: event.branchId,
        centerId: event.centerId,
        accessType: 'BRANCH',
      },
      event.targetUserId ?? null, // Pass if provided, otherwise ActivityLogService will fetch from targetUserProfileId
      event.userProfileId, // Pass as targetUserProfileId for auto-resolution
    );
  }

  @OnEvent(AccessControlEvents.REVOKE_BRANCH_ACCESS)
  async handleRevokeBranchAccess(event: RevokeBranchAccessEvent) {
    // TODO: Implement branch access revoking when the service method is available
    // For now, just log the activity

    // targetUserId will be automatically resolved from targetUserProfileId by ActivityLogService
    // ActivityLogService is fault-tolerant, no try-catch needed
    await this.activityLogService.log(
      CenterActivityType.BRANCH_ACCESS_REVOKED,
      {
        userProfileId: event.userProfileId,
        branchId: event.branchId,
        centerId: event.centerId,
        accessType: 'BRANCH',
      },
      event.targetUserId ?? null, // Pass if provided, otherwise ActivityLogService will fetch from targetUserProfileId
      event.userProfileId, // Pass as targetUserProfileId for auto-resolution
    );
  }
}
