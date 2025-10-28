import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from '../entities/branch.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { LoggerService } from '@/shared/services/logger.service';
import { PaginateBranchesDto } from '../dto/paginate-branches.dto';
import { Pagination } from 'nestjs-typeorm-paginate';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';

@Injectable()
export class BranchesRepository extends BaseRepository<Branch> {
  constructor(
    protected readonly logger: LoggerService,
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(logger, txHost);
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

    this.applyIsActiveFilter(queryBuilder, paginateDto, 'branch');
    return this.paginate(
      paginateDto,
      {
        searchableColumns: ['location', 'address'],
        sortableColumns: ['location', 'createdAt', 'updatedAt'],
        defaultSortBy: ['createdAt', 'DESC'],
      },
      'centers/branches',
      queryBuilder,
    );
  }
}
