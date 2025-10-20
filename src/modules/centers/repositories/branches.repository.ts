import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from '../entities/branch.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { LoggerService } from '@/shared/services/logger.service';
import { PaginateBranchesDto } from '../dto/paginate-branches.dto';
import { Pagination } from 'nestjs-typeorm-paginate';

@Injectable()
export class BranchesRepository extends BaseRepository<Branch> {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    protected readonly logger: LoggerService,
  ) {
    super(branchRepository, logger);
  }

  async paginateBranches(
    paginateDto: PaginateBranchesDto,
    centerId: string,
  ): Promise<Pagination<Branch>> {
    const queryBuilder = this.branchRepository
      .createQueryBuilder('branch')
      .leftJoinAndSelect('branch.center', 'center')
      .leftJoinAndSelect('branch.branchAccess', 'branchAccess')
      .where('branch.centerId = :centerId', { centerId });

    if (paginateDto.isActive !== undefined) {
      queryBuilder.andWhere('branch.isActive = :isActive', {
        isActive: paginateDto.isActive,
      });
    }

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
