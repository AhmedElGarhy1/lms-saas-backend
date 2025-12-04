import { Injectable } from '@nestjs/common';
import { Level } from '../entities/level.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { PaginateLevelsDto } from '../dto/paginate-levels.dto';
import { Pagination } from 'nestjs-typeorm-paginate';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';

@Injectable()
export class LevelsRepository extends BaseRepository<Level> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof Level {
    return Level;
  }

  async paginateLevels(
    paginateDto: PaginateLevelsDto,
    centerId: string,
  ): Promise<Pagination<Level>> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('level')
      .leftJoinAndSelect('level.center', 'center')
      .where('level.centerId = :centerId', { centerId });

    return this.paginate(
      paginateDto,
      {
        searchableColumns: ['name'],
        sortableColumns: ['name', 'createdAt', 'updatedAt'],
        defaultSortBy: ['name', 'ASC'],
      },
      'levels',
      queryBuilder,
    );
  }
}
