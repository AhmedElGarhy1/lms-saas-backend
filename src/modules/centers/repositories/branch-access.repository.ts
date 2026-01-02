import { Injectable } from '@nestjs/common';
import { BranchAccess } from '../entities/branch-access.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { BranchAccessDto } from '../dto/branch-access.dto';
import { CentersErrors } from '../exceptions/centers.errors';
import { SystemErrors } from '@/shared/common/exceptions/system.exception';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

@Injectable()
export class BranchAccessRepository extends BaseRepository<BranchAccess> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof BranchAccess {
    return BranchAccess;
  }

  findBranchAccess(data: BranchAccessDto): Promise<BranchAccess | null> {
    return this.getRepository().findOneBy(data);
  }

  async grantBranchAccess(data: BranchAccessDto) {
    // Database unique constraint will handle uniqueness
    return this.create(data);
  }

  async revokeBranchAccess(data: BranchAccessDto) {
    const existingAccess = await this.findBranchAccess(data);
    if (!existingAccess) {
      throw CentersErrors.branchAccessNotFound();
    }

    await this.remove(existingAccess.id);
    return existingAccess;
  }

  /**
   * Batch load branch access records for multiple queries.
   * Uses query builder with OR conditions to load all records in one query.
   *
   * @param queries - Array of queries with userProfileId, centerId, and branchId
   * @returns Array of BranchAccess records
   */
  async findManyBranchAccess(
    queries: Array<{
      userProfileId: string;
      centerId: string;
      branchId: string;
    }>,
  ): Promise<BranchAccess[]> {
    if (queries.length === 0) {
      return [];
    }
    const queryBuilder =
      this.getRepository().createQueryBuilder('branchAccess');
    const conditions = queries.map(
      (q, index) =>
        `(branchAccess.userProfileId = :userProfileId${index} AND branchAccess.centerId = :centerId${index} AND branchAccess.branchId = :branchId${index})`,
    );
    queryBuilder.where(conditions.join(' OR '));
    queries.forEach((q, index) => {
      queryBuilder
        .setParameter(`userProfileId${index}`, q.userProfileId)
        .setParameter(`centerId${index}`, q.centerId)
        .setParameter(`branchId${index}`, q.branchId);
    });
    return queryBuilder.getMany();
  }
}
