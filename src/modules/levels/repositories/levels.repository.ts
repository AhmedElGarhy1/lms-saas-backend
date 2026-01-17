import { Injectable } from '@nestjs/common';
import { Level } from '../entities/level.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { PaginateLevelsDto } from '../dto/paginate-levels.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { LEVEL_PAGINATION_COLUMNS } from '@/shared/common/constants/pagination-columns';

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
      // Join relations for name fields only (not full entities)
      .leftJoin('level.center', 'center')
      // Add name and id fields as selections
      .addSelect([
        'center.id',
        'center.name',
      ])
      .where('level.centerId = :centerId', { centerId });

    return this.paginate(
      paginateDto,
      LEVEL_PAGINATION_COLUMNS,
      'levels',
      queryBuilder,
    );
  }

  /**
   * Find a level with optimized relations loaded
   * Only loads id and name fields for center relation
   *
   * @param levelId - Level ID
   * @returns Level with center.id and center.name only
   */
  async findLevelWithRelations(levelId: string): Promise<Level | null> {
    return this.getRepository()
      .createQueryBuilder('level')
      // Join relations for name fields only (not full entities)
      .leftJoin('level.center', 'center')
      // Add name and id fields as selections
      .addSelect([
        'center.id',
        'center.name',
      ])
      .where('level.id = :levelId', { levelId })
      .getOne();
  }

  /**
   * Find a level with optimized relations loaded or throw if not found
   *
   * @param levelId - Level ID
   * @returns Level with center.id and center.name only
   * @throws Level not found error
   */
  async findLevelWithRelationsOrThrow(levelId: string): Promise<Level> {
    const level = await this.findLevelWithRelations(levelId);
    if (!level) {
      throw new Error(`Level with id ${levelId} not found`);
    }
    return level;
  }
}
