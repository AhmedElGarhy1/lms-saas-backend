import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BranchesService } from '../services/branches.service';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { CenterActivityType } from '../enums/center-activity-type.enum';
import { CreateCenterBranchEvent, CenterEvents } from '../events/center.events';
import { BranchEvents, BranchCreatedEvent } from '../events/branch.events';

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
    const { branch, actor } = event;

    // Log activity for branch creation
    await this.activityLogService.log(
      CenterActivityType.BRANCH_CREATED,
      {
        branchId: branch.id,
        centerId: branch.centerId,
        location: branch.location,
        address: branch.address,
        phone: branch.phone,
        email: branch.email,
      },
      actor,
    );
  }
}
