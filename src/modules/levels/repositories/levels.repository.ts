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
      .addSelect(['center.id', 'center.name'])
      .where('level.centerId = :centerId', { centerId })
      // Filter out levels where related entities are deleted (check if entity exists)
      .andWhere('center.id IS NOT NULL');

    return this.paginate(
      paginateDto,
      LEVEL_PAGINATION_COLUMNS,
      'levels',
      queryBuilder,
    );
  }

  /**
   * Find a level by ID optimized for API responses.
   * Selects only necessary fields (id, name, etc.) from relations for serialization.
   * Use this method when returning data to API clients to minimize response size.
   *
   * @param levelId - Level ID
   * @param includeDeleted - Whether to include soft-deleted levels
   * @returns Level with selective relation fields, or null if not found
   */
  async findLevelForResponse(
    levelId: string,
    includeDeleted: boolean = false,
  ): Promise<Level | null> {
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
   * Find a level by ID optimized for API responses, throws if not found.
   * Selects only necessary fields (id, name, etc.) from relations for serialization.
   * Use this method when returning data to API clients to minimize response size.
   *
   * @param levelId - Level ID
   * @param includeDeleted - Whether to include soft-deleted levels
   * @returns Level with selective relation fields
   * @throws Error if level not found
   */
  async findLevelForResponseOrThrow(
    levelId: string,
    includeDeleted: boolean = false,
  ): Promise<Level> {
    const level = await this.findLevelForResponse(levelId, includeDeleted);
    if (!level) {
      throw new Error(`Level with id ${levelId} not found`);
    }
    return level;
  }

  /**
   * Find a level by ID with full relations loaded for internal use.
   * Loads complete entity objects with all properties accessible (e.g., isActive, etc.).
   * Use this method for business logic that needs to access any property of related entities.
   *
   * @param levelId - Level ID
   * @param includeDeleted - Whether to include soft-deleted levels
   * @returns Level with full relations loaded, or null if not found
   */
  async findLevelWithFullRelations(
    levelId: string,
    includeDeleted: boolean = false,
  ): Promise<Level | null> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('level')
      // Load FULL entities using leftJoinAndSelect for all relations
      .leftJoinAndSelect('level.center', 'center')
      .where('level.id = :levelId', { levelId });

    if (includeDeleted) {
      queryBuilder.withDeleted();
    }

    return queryBuilder.getOne();
  }

  /**
   * Find a level by ID with full relations loaded for internal use, throws if not found.
   * Loads complete entity objects with all properties accessible (e.g., isActive, etc.).
   * Use this method for business logic that needs to access any property of related entities.
   *
   * @param levelId - Level ID
   * @param includeDeleted - Whether to include soft-deleted levels
   * @returns Level with full relations loaded
   * @throws Error if level not found
   */
  async findLevelWithFullRelationsOrThrow(
    levelId: string,
    includeDeleted: boolean = false,
  ): Promise<Level> {
    const level = await this.findLevelWithFullRelations(
      levelId,
      includeDeleted,
    );
    if (!level) {
      throw new Error(`Level with id ${levelId} not found`);
    }
    return level;
  }
}
