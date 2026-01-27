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
   * Find a branch by ID optimized for API responses.
   * Selects only necessary fields (id, name, etc.) from relations for serialization.
   * Use this method when returning data to API clients to minimize response size.
   *
   * @param branchId - Branch ID
   * @param includeDeleted - Whether to include soft-deleted branches
   * @returns Branch with selective relation fields, or null if not found
   */
  async findBranchForResponse(
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
   * Find a branch by ID optimized for API responses, throws if not found.
   * Selects only necessary fields (id, name, etc.) from relations for serialization.
   * Use this method when returning data to API clients to minimize response size.
   *
   * @param branchId - Branch ID
   * @param includeDeleted - Whether to include soft-deleted branches
   * @returns Branch with selective relation fields
   * @throws Error if branch not found
   */
  async findBranchForResponseOrThrow(
    branchId: string,
    includeDeleted: boolean = false,
  ): Promise<Branch> {
    const branch = await this.findBranchForResponse(branchId, includeDeleted);
    if (!branch) {
      throw new Error(`Branch with id ${branchId} not found`);
    }
    return branch;
  }

  /**
   * Find a branch by ID with full relations loaded for internal use.
   * Loads complete entity objects with all properties accessible (e.g., isActive, etc.).
   * Use this method for business logic that needs to access any property of related entities.
   *
   * @param branchId - Branch ID
   * @param includeDeleted - Whether to include soft-deleted branches
   * @returns Branch with full relations loaded, or null if not found
   */
  async findBranchWithFullRelations(
    branchId: string,
    includeDeleted: boolean = false,
  ): Promise<Branch | null> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('branch')
      // Load FULL entities using leftJoinAndSelect for all relations
      .leftJoinAndSelect('branch.center', 'center')
      .where('branch.id = :branchId', { branchId });

    if (includeDeleted) {
      queryBuilder.withDeleted();
    }

    return queryBuilder.getOne();
  }

  /**
   * Find a branch by ID with full relations loaded for internal use, throws if not found.
   * Loads complete entity objects with all properties accessible (e.g., isActive, etc.).
   * Use this method for business logic that needs to access any property of related entities.
   *
   * @param branchId - Branch ID
   * @param includeDeleted - Whether to include soft-deleted branches
   * @returns Branch with full relations loaded
   * @throws Error if branch not found
   */
  async findBranchWithFullRelationsOrThrow(
    branchId: string,
    includeDeleted: boolean = false,
  ): Promise<Branch> {
    const branch = await this.findBranchWithFullRelations(
      branchId,
      includeDeleted,
    );
    if (!branch) {
      throw new Error(`Branch with id ${branchId} not found`);
    }
    return branch;
  }
}
