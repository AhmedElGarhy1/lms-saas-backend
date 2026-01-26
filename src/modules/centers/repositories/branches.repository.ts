import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Branch } from '../entities/branch.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { PaginateBranchesDto } from '../dto/paginate-branches.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { BRANCH_PAGINATION_COLUMNS } from '@/shared/common/constants/pagination-columns';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { ActorUser } from '@/shared/common/types/actor-user.type';

@Injectable()
export class BranchesRepository extends BaseRepository<Branch> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    @Inject(forwardRef(() => AccessControlHelperService))
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof Branch {
    return Branch;
  }

  async paginateBranches(
    paginateDto: PaginateBranchesDto,
    actor: ActorUser,
  ): Promise<Pagination<Branch>> {
    const centerId = actor.centerId!;
    const queryBuilder = this.getRepository()
      .createQueryBuilder('branch')
      // Join relations for name fields only (not full entities)
      .leftJoin('branch.center', 'center')
      .leftJoin('branch.branchAccess', 'branchAccess')
      // Add name and id fields as selections
      .addSelect(['center.id', 'center.name'])
      .where('branch.centerId = :centerId', { centerId })
      // Filter out branches where related entities are deleted (check if entity exists)
      .andWhere('center.id IS NOT NULL');

    const canBypassCenterInternalAccess =
      await this.accessControlHelperService.bypassCenterInternalAccess(
        actor.userProfileId,
        centerId,
      );

    if (!canBypassCenterInternalAccess) {
      queryBuilder.andWhere(
        'EXISTS (SELECT 1 FROM branch_access ba WHERE ba."userProfileId" = :userProfileId AND ba."branchId" = branch.id AND ba."centerId" = :centerId)',
        {
          userProfileId: actor.userProfileId,
          centerId,
        },
      );
    }

    this.applyIsActiveFilter(queryBuilder, paginateDto, 'branch.isActive');
    return this.paginate(
      paginateDto,
      BRANCH_PAGINATION_COLUMNS,
      'centers/branches',
      queryBuilder,
    );
  }

  /**
   * Find a branch with optimized relations loaded
   * Only loads id and name fields for center relation
   *
   * @param branchId - Branch ID
   * @param includeDeleted - Whether to include soft-deleted branches
   * @returns Branch with center.id and center.name only
   */
  async findBranchWithRelations(
    branchId: string,
    includeDeleted: boolean = false,
  ): Promise<Branch | null> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('branch')
      // Join relations for name fields only (not full entities)
      .leftJoin('branch.center', 'center')
      // Audit relations
      .leftJoin('branch.creator', 'creator')
      .leftJoin('creator.user', 'creatorUser')
      .leftJoin('branch.updater', 'updater')
      .leftJoin('updater.user', 'updaterUser')
      .leftJoin('branch.deleter', 'deleter')
      .leftJoin('deleter.user', 'deleterUser')
      // Add name and id fields as selections
      .addSelect([
        'center.id',
        'center.name',
        // Audit fields
        'creator.id',
        'creatorUser.id',
        'creatorUser.name',
        'updater.id',
        'updaterUser.id',
        'updaterUser.name',
        'deleter.id',
        'deleterUser.id',
        'deleterUser.name',
      ])
      .where('branch.id = :branchId', { branchId });

    if (includeDeleted) {
      queryBuilder.withDeleted();
    }

    return queryBuilder.getOne();
  }

  /**
   * Find a branch with optimized relations loaded or throw if not found
   *
   * @param branchId - Branch ID
   * @param includeDeleted - Whether to include soft-deleted branches
   * @returns Branch with center.id and center.name only
   * @throws Branch not found error
   */
  async findBranchWithRelationsOrThrow(
    branchId: string,
    includeDeleted: boolean = false,
  ): Promise<Branch> {
    const branch = await this.findBranchWithRelations(branchId, includeDeleted);
    if (!branch) {
      throw new Error(`Branch with id ${branchId} not found`);
    }
    return branch;
  }
}
