import { Injectable } from '@nestjs/common';
import { Branch } from '../entities/branch.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { PaginateBranchesDto } from '../dto/paginate-branches.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { BRANCH_PAGINATION_COLUMNS } from '@/shared/common/constants/pagination-columns';

@Injectable()
export class BranchesRepository extends BaseRepository<Branch> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof Branch {
    return Branch;
  }

  async paginateBranches(
    paginateDto: PaginateBranchesDto,
    centerId: string,
  ): Promise<Pagination<Branch>> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('branch')
      // Join relations for name fields only (not full entities)
      .leftJoin('branch.center', 'center')
      .leftJoin('branch.branchAccess', 'branchAccess')
      // Add name and id fields as selections
      .addSelect([
        'center.id',
        'center.name',
      ])
      .where('branch.centerId = :centerId', { centerId });

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
   * @returns Branch with center.id and center.name only
   */
  async findBranchWithRelations(branchId: string): Promise<Branch | null> {
    return this.getRepository()
      .createQueryBuilder('branch')
      // Join relations for name fields only (not full entities)
      .leftJoin('branch.center', 'center')
      // Add name and id fields as selections
      .addSelect([
        'center.id',
        'center.name',
      ])
      .where('branch.id = :branchId', { branchId })
      .getOne();
  }

  /**
   * Find a branch with optimized relations loaded or throw if not found
   *
   * @param branchId - Branch ID
   * @returns Branch with center.id and center.name only
   * @throws Branch not found error
   */
  async findBranchWithRelationsOrThrow(branchId: string): Promise<Branch> {
    const branch = await this.findBranchWithRelations(branchId);
    if (!branch) {
      throw new Error(`Branch with id ${branchId} not found`);
    }
    return branch;
  }
}
