import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BranchesService } from '../services/branches.service';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { CenterActivityType } from '../enums/center-activity-type.enum';
import { CreateCenterBranchEvent } from '../events/center.events';
import { CenterEvents } from '@/shared/events/center.events.enum';
import {
  BranchCreatedEvent,
  BranchUpdatedEvent,
  BranchDeletedEvent,
  BranchRestoredEvent,
} from '../events/branch.events';
import { BranchEvents } from '@/shared/events/branch.events.enum';

@Injectable()
export class BranchListener {
  constructor(
    private readonly branchesService: BranchesService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  @OnEvent(CenterEvents.CREATE_BRANCH)
  async handleCreateCenterBranch(event: CreateCenterBranchEvent) {
    const { center, branchData, actor } = event;

    actor.centerId = center.id;

    // Create branch using service (which handles event emission internally)
    // The service will emit CREATED event, which will be handled by handleBranchCreated
    await this.branchesService.createBranch(branchData, actor);
  }

  @OnEvent(BranchEvents.CREATED)
  async handleBranchCreated(event: BranchCreatedEvent) {
    const { branch } = event;

    // Log activity for branch creation
    // Object action (on branch), no specific user affected
    await this.activityLogService.log(
      CenterActivityType.BRANCH_CREATED,
      {
        branchId: branch.id,
        centerId: branch.centerId,
        location: branch.location,
        address: branch.address,
        email: branch.email,
      },
      null, // Object action, no target user
    );
  }

  @OnEvent(BranchEvents.UPDATED)
  async handleBranchUpdated(event: BranchUpdatedEvent) {
    const { branchId, centerId } = event;

    // ActivityLogService is fault-tolerant, no try-catch needed
    // Object action (on branch), no specific user affected
    await this.activityLogService.log(
      CenterActivityType.BRANCH_UPDATED,
      {
        branchId,
        centerId,
        updatedFields: Object.keys(event.updates),
      },
      null, // Object action, no target user
    );
  }

  @OnEvent(BranchEvents.DELETED)
  async handleBranchDeleted(event: BranchDeletedEvent) {
    const { branchId, centerId } = event;

    // ActivityLogService is fault-tolerant, no try-catch needed
    // Object action (on branch), no specific user affected
    await this.activityLogService.log(
      CenterActivityType.BRANCH_DELETED,
      {
        branchId,
        centerId,
      },
      null, // Object action, no target user
    );
  }

  @OnEvent(BranchEvents.RESTORED)
  async handleBranchRestored(event: BranchRestoredEvent) {
    const { branchId, centerId } = event;

    // ActivityLogService is fault-tolerant, no try-catch needed
    // Object action (on branch), no specific user affected
    await this.activityLogService.log(
      CenterActivityType.BRANCH_RESTORED,
      {
        branchId,
        centerId,
      },
      null, // Object action, no target user
    );
  }
}
