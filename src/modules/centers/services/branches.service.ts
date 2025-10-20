import { Injectable } from '@nestjs/common';
import { CreateBranchDto } from '../dto/create-branch.dto';
import { PaginateBranchesDto } from '../dto/paginate-branches.dto';
import { BranchesRepository } from '../repositories/branches.repository';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { ActivityType } from '@/shared/modules/activity-log/entities/activity-log.entity';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { Pagination } from 'nestjs-typeorm-paginate';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import {
  ResourceNotFoundException,
  ValidationFailedException,
} from '@/shared/common/exceptions/custom.exceptions';
import { ErrorCode } from '@/shared/common/enums/error-codes.enum';

@Injectable()
export class BranchesService {
  constructor(
    private readonly branchesRepository: BranchesRepository,
    private readonly activityLogService: ActivityLogService,
    private readonly accessControlHelperService: AccessControlHelperService,
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
      userId: actor.id,
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

    // Log activity
    await this.activityLogService.log(ActivityType.CENTER_CREATED, {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      branchId: branch.id,
      location: branch.location,
      action: 'branch_created',
    });

    return branch;
  }

  async updateBranch(
    branchId: string,
    data: CreateBranchDto,
    actor: ActorUser,
  ) {
    await this.accessControlHelperService.validateBranchAccess({
      userId: actor.id,
      centerId: actor.centerId!,
      branchId,
    });

    const branch = await this.getBranch(branchId, actor);

    Object.assign(branch, data);
    const updatedBranch = await this.branchesRepository.update(branchId, data);

    // Log activity
    await this.activityLogService.log(ActivityType.CENTER_UPDATED, {
      branchId: updatedBranch?.id,
      location: updatedBranch?.location,
      action: 'branch_updated',
      new: data,
    });

    return updatedBranch;
  }

  async deleteBranch(branchId: string, actor: ActorUser) {
    await this.accessControlHelperService.validateBranchAccess({
      userId: actor.id,
      centerId: actor.centerId!,
      branchId,
    });

    await this.branchesRepository.softRemove(branchId);

    // Log activity
    await this.activityLogService.log(ActivityType.CENTER_DELETED, {
      branchId,
      action: 'branch_deleted',
    });
  }
}
