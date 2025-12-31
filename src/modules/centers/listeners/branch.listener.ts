import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BranchesService } from '../services/branches.service';
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
    // Activity logging removed
  }

  @OnEvent(BranchEvents.UPDATED)
  async handleBranchUpdated(event: BranchUpdatedEvent) {
    // Activity logging removed
  }

  @OnEvent(BranchEvents.DELETED)
  async handleBranchDeleted(event: BranchDeletedEvent) {
    // Activity logging removed
  }

  @OnEvent(BranchEvents.RESTORED)
  async handleBranchRestored(event: BranchRestoredEvent) {
    // Activity logging removed
  }
}
