import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateBranchDto } from '../dto/create-branch.dto';
import { PaginateBranchesDto } from '../dto/paginate-branches.dto';
import { BranchesRepository } from '../repositories/branches.repository';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { Pagination } from 'nestjs-typeorm-paginate';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ResourceNotFoundException } from '@/shared/common/exceptions/custom.exceptions';
import {
  BranchCreatedEvent,
  BranchUpdatedEvent,
  BranchDeletedEvent,
  BranchRestoredEvent,
} from '@/modules/centers/events/branch.events';
import { BranchEvents } from '@/shared/events/branch.events.enum';

@Injectable()
export class BranchesService {
  constructor(
    private readonly branchesRepository: BranchesRepository,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async paginateBranches(
    paginateDto: PaginateBranchesDto,
    actor: ActorUser,
  ): Promise<Pagination<any>> {
    return this.branchesRepository.paginateBranches(
      paginateDto,
      actor.centerId!,
    );
  }

  async getBranch(branchId: string, actor: ActorUser) {
    await this.accessControlHelperService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId,
    });

    const branch = await this.branchesRepository.findOne(branchId);

    if (!branch) {
      throw new ResourceNotFoundException(
        `Branch with ID ${branchId} not found`,
      );
    }

    return branch;
  }

  async createBranch(createBranchDto: CreateBranchDto, actor: ActorUser) {
    const branch = await this.branchesRepository.create({
      ...createBranchDto,
      centerId: actor.centerId!,
    });

    // Emit event for activity logging
    await this.eventEmitter.emitAsync(
      BranchEvents.CREATED,
      new BranchCreatedEvent(branch, actor),
    );

    return branch;
  }

  async updateBranch(
    branchId: string,
    data: CreateBranchDto,
    actor: ActorUser,
  ) {
    await this.accessControlHelperService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId,
    });

    const branch = await this.getBranch(branchId, actor);

    Object.assign(branch, data);
    const updatedBranch = await this.branchesRepository.update(branchId, data);

    // Emit event for activity logging
    await this.eventEmitter.emitAsync(
      BranchEvents.UPDATED,
      new BranchUpdatedEvent(branchId, branch.centerId, data, actor),
    );

    return updatedBranch;
  }

  async deleteBranch(branchId: string, actor: ActorUser) {
    await this.accessControlHelperService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId,
    });

    const branch = await this.getBranch(branchId, actor);
    await this.branchesRepository.softRemove(branchId);

    // Emit event for activity logging
    await this.eventEmitter.emitAsync(
      BranchEvents.DELETED,
      new BranchDeletedEvent(branchId, branch.centerId, actor),
    );
  }

  async toggleBranchStatus(
    branchId: string,
    isActive: boolean,
    actor: ActorUser,
  ): Promise<void> {
    await this.accessControlHelperService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId,
    });

    const branch = await this.branchesRepository.findOne(branchId);
    if (!branch) {
      throw new ResourceNotFoundException(
        `Branch with ID ${branchId} not found`,
      );
    }

    await this.branchesRepository.update(branchId, { isActive });

    // Emit event for activity logging
    await this.eventEmitter.emitAsync(
      BranchEvents.UPDATED,
      new BranchUpdatedEvent(
        branchId,
        branch.centerId,
        { location: branch.location, isActive } as any,
        actor,
      ),
    );
  }

  async restoreBranch(branchId: string, actor: ActorUser): Promise<void> {
    await this.accessControlHelperService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId,
    });

    const branch =
      await this.branchesRepository.findOneSoftDeletedById(branchId);
    if (!branch) {
      throw new ResourceNotFoundException(
        `Branch with ID ${branchId} not found`,
      );
    }

    await this.branchesRepository.restore(branchId);

    // Emit event for activity logging
    await this.eventEmitter.emitAsync(
      BranchEvents.RESTORED,
      new BranchRestoredEvent(branchId, branch.centerId, actor),
    );
  }
}
