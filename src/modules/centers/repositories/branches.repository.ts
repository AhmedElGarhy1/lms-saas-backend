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
      .leftJoinAndSelect('branch.center', 'center')
      .leftJoinAndSelect('branch.branchAccess', 'branchAccess')
      .where('branch.centerId = :centerId', { centerId });

    this.applyIsActiveFilter(queryBuilder, paginateDto, 'branch.isActive');
    return this.paginate(
      paginateDto,
      BRANCH_PAGINATION_COLUMNS,
      'centers/branches',
      queryBuilder,
    );
  }
}
