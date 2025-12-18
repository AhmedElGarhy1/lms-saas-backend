import { Injectable } from '@nestjs/common';
import { CreateBranchDto } from '../dto/create-branch.dto';
import { PaginateBranchesDto } from '../dto/paginate-branches.dto';
import { BranchesRepository } from '../repositories/branches.repository';
import { Pagination } from '@/shared/common/types/pagination.types';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ResourceNotFoundException } from '@/shared/common/exceptions/custom.exceptions';
import {
  BranchCreatedEvent,
  BranchUpdatedEvent,
  BranchDeletedEvent,
  BranchRestoredEvent,
} from '@/modules/centers/events/branch.events';
import { BranchEvents } from '@/shared/events/branch.events.enum';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { BaseService } from '@/shared/common/services/base.service';

@Injectable()
export class BranchesService extends BaseService {
  constructor(
    private readonly branchesRepository: BranchesRepository,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
  ) {
    super();
  }

  async paginateBranches(
    paginateDto: PaginateBranchesDto,
    actor: ActorUser,
  ): Promise<Pagination<any>> {
    return this.branchesRepository.paginateBranches(
      paginateDto,
      actor.centerId!,
    );
  }

  async getBranch(branchId: string, actor: ActorUser, includeDeleted = false) {
    const branch = includeDeleted
      ? await this.branchesRepository.findOneSoftDeletedById(branchId)
      : await this.branchesRepository.findOne(branchId);

    if (!branch) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.branch',
        identifier: 't.resources.identifier',
        value: branchId,
      });
    }

    return branch;
  }

  async createBranch(createBranchDto: CreateBranchDto, actor: ActorUser) {
    const branch = await this.branchesRepository.create({
      ...createBranchDto,
      centerId: actor.centerId!,
    });

    // Emit event for activity logging
    await this.typeSafeEventEmitter.emitAsync(
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
    const branch = await this.getBranch(branchId, actor);

    Object.assign(branch, data);
    const updatedBranch = await this.branchesRepository.update(branchId, data);

    // Emit event for activity logging
    await this.typeSafeEventEmitter.emitAsync(
      BranchEvents.UPDATED,
      new BranchUpdatedEvent(branchId, branch.centerId, data, actor),
    );

    return updatedBranch;
  }

  async deleteBranch(branchId: string, actor: ActorUser) {
    const branch = await this.getBranch(branchId, actor);
    await this.branchesRepository.softRemove(branchId);

    // Emit event for activity logging
    await this.typeSafeEventEmitter.emitAsync(
      BranchEvents.DELETED,
      new BranchDeletedEvent(branchId, branch.centerId, actor),
    );
  }

  async toggleBranchStatus(
    branchId: string,
    isActive: boolean,
    actor: ActorUser,
  ): Promise<void> {
    const branch = await this.branchesRepository.findOne(branchId);
    if (!branch) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.branch',
        identifier: 't.resources.identifier',
        value: branchId,
      });
    }

    await this.branchesRepository.update(branchId, { isActive });

    // Emit event for activity logging
    await this.typeSafeEventEmitter.emitAsync(
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
    const branch =
      await this.branchesRepository.findOneSoftDeletedById(branchId);
    if (!branch) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.branch',
        identifier: 't.resources.identifier',
        value: branchId,
      });
    }

    await this.branchesRepository.restore(branchId);

    // Emit event for activity logging
    await this.typeSafeEventEmitter.emitAsync(
      BranchEvents.RESTORED,
      new BranchRestoredEvent(branchId, branch.centerId, actor),
    );
  }
}
