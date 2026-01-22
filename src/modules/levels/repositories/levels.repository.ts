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
      // Audit relations
      .leftJoin('level.creator', 'creator')
      .leftJoin('creator.user', 'creatorUser')
      .leftJoin('level.updater', 'updater')
      .leftJoin('updater.user', 'updaterUser')
      .leftJoin('level.deleter', 'deleter')
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
   * @param includeDeleted - Whether to include soft-deleted levels
   * @returns Level with center.id and center.name only
   */
  async findLevelWithRelations(levelId: string, includeDeleted: boolean = false): Promise<Level | null> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('level')
      // Join relations for name fields only (not full entities)
      .leftJoin('level.center', 'center')
      // Audit relations
      .leftJoin('level.creator', 'creator')
      .leftJoin('creator.user', 'creatorUser')
      .leftJoin('level.updater', 'updater')
      .leftJoin('updater.user', 'updaterUser')
      .leftJoin('level.deleter', 'deleter')
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
      .where('level.id = :levelId', { levelId });

    if (includeDeleted) {
      queryBuilder.withDeleted();
    }

    return queryBuilder.getOne();
  }

  /**
   * Find a level with optimized relations loaded or throw if not found
   *
   * @param levelId - Level ID
   * @param includeDeleted - Whether to include soft-deleted levels
   * @returns Level with center.id and center.name only
   * @throws Level not found error
   */
  async findLevelWithRelationsOrThrow(levelId: string, includeDeleted: boolean = false): Promise<Level> {
    const level = await this.findLevelWithRelations(levelId, includeDeleted);
    if (!level) {
      throw new Error(`Level with id ${levelId} not found`);
    }
    return level;
  }
}
