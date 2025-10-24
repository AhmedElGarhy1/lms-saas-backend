import {
  Repository,
  SelectQueryBuilder,
  ObjectLiteral,
  DeepPartial,
  FindManyOptions,
  EntityManager,
} from 'typeorm';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Pagination, paginate } from 'nestjs-typeorm-paginate';
import { LoggerService } from '@/shared/services/logger.service';
import { BasePaginationDto } from '../dto/base-pagination.dto';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

export interface QueryOptions<T> {
  select?: (keyof T)[];
  relations?: string[];
  where?: any;
  order?: Record<string, 'ASC' | 'DESC'>;
  skip?: number;
  take?: number;
  cache?: boolean | number;
  lock?:
    | 'pessimistic_read'
    | 'pessimistic_write'
    | 'dirty_read'
    | 'pessimistic_partial_write'
    | 'pessimistic_write_or_fail'
    | 'for_no_key_update'
    | 'for_key_share';
}

export interface BulkOperationOptions {
  batchSize?: number;
  onProgress?: (processed: number, total: number) => void;
}

export interface PaginateOptions<T> {
  page?: number;
  limit?: number;
  searchableColumns?: string[];
  sortableColumns?: string[];
  filterableColumns?: string[];
  defaultSortBy?: [string, 'ASC' | 'DESC'];
  defaultLimit?: number;
  maxLimit?: number;
  search?: string;
  filter?: Record<string, any>;
  sortBy?: [string, 'ASC' | 'DESC'][];
  route?: string;
}

@Injectable()
export abstract class BaseRepository<T extends ObjectLiteral> {
  constructor(
    protected readonly logger: LoggerService,
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {}

  /**
   * Get the entity class for this repository
   * Override this method in child repositories to specify the entity class
   */
  protected abstract getEntityClass(): new () => T;

  /**
   * Get the active repository - always from transaction context
   */
  protected getRepository(): Repository<T> {
    return this.txHost.tx.getRepository(this.getEntityClass());
  }

  /**
   * Get the active entity manager - always from transaction context
   */
  protected getEntityManager(): EntityManager {
    return this.txHost.tx;
  }

  /**
   * Get the active entity manager - public access for external use
   */
  public getManager(): EntityManager {
    return this.txHost.tx;
  }

  /**
   * Bulk insert with progress tracking and error handling
   */
  async bulkInsert(
    entities: Partial<T>[],
    options: BulkOperationOptions = {},
  ): Promise<T[]> {
    const { batchSize = 100, onProgress } = options;
    const total = entities.length;
    let totalProcessed = 0;
    const results: T[] = [];

    for (let i = 0; i < total; i += batchSize) {
      try {
        const batchResults = await Promise.all(
          entities.slice(i, i + batchSize).map((e) => this.create(e)),
        );
        results.push(...batchResults);

        totalProcessed += batchResults.length;

        if (onProgress) {
          onProgress(totalProcessed, total);
        }
      } catch (error) {
        this.logger.error(
          `Bulk insert batch failed: ${error.message}`,
          error.stack,
          undefined,
          {
            entity: this.getRepository().metadata.name,
            totalProcessed,
            total,
          },
        );
        throw error;
      }
    }

    return results;
  }

  /**
   * Bulk update with progress tracking and error handling
   */
  async bulkUpdate(
    where: any,
    updateData: Partial<T>,
    options: BulkOperationOptions = {},
  ): Promise<number> {
    const { batchSize = 100, onProgress } = options;
    let totalProcessed = 0;
    let totalAffected = 0;
    const repo = this.getRepository();

    // First, get all IDs that match the where condition
    const queryBuilder = repo.createQueryBuilder('entity');
    this.applyWhereConditions(queryBuilder, where);
    const entities = await queryBuilder.getMany();
    const total = entities.length;

    for (let i = 0; i < total; i += batchSize) {
      const batch = entities.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;

      try {
        const batchIds = batch.map((entity) => entity.id);
        const result = await repo.update(batchIds, updateData);
        const affected = result.affected || 0;
        totalAffected += affected;
        totalProcessed += batch.length;

        this.logger.debug('Bulk update batch completed', undefined, {
          entity: repo.metadata.name,
          batchNumber,
          batchSize: batch.length,
          affected,
          totalProcessed,
          total,
        });

        if (onProgress) {
          onProgress(totalProcessed, total);
        }
      } catch (error) {
        this.logger.error(
          `Bulk update batch failed: ${error.message}`,
          error.stack,
          undefined,
          {
            entity: repo.metadata.name,
            batchNumber,
            batchSize: batch.length,
            totalProcessed,
            total,
          },
        );
        throw error;
      }
    }

    return totalAffected;
  }

  /**
   * Bulk delete with progress tracking and error handling
   */
  async bulkDelete(
    where: any,
    options: BulkOperationOptions = {},
  ): Promise<number> {
    const { batchSize = 100, onProgress } = options;
    let totalProcessed = 0;
    let totalAffected = 0;
    const repo = this.getRepository();

    // First, get all IDs that match the where condition
    const queryBuilder = repo.createQueryBuilder('entity');
    this.applyWhereConditions(queryBuilder, where);
    const entities = await queryBuilder.getMany();
    const total = entities.length;

    for (let i = 0; i < total; i += batchSize) {
      const batch = entities.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;

      try {
        const batchIds = batch.map((entity) => entity.id);
        const result = await repo.delete(batchIds);
        const affected = result.affected || 0;
        totalAffected += affected;
        totalProcessed += batch.length;

        this.logger.debug('Bulk delete batch completed', undefined, {
          entity: repo.metadata.name,
          batchNumber,
          batchSize: batch.length,
          affected,
          totalProcessed,
          total,
        });

        if (onProgress) {
          onProgress(totalProcessed, total);
        }
      } catch (error) {
        this.logger.error(
          `Bulk delete batch failed: ${error.message}`,
          error.stack,
          undefined,
          {
            entity: repo.metadata.name,
            batchNumber,
            batchSize: batch.length,
            totalProcessed,
            total,
          },
        );
        throw error;
      }
    }

    return totalAffected;
  }

  /**
   * Enhanced count method with advanced query building
   */
  async countWithOptions(where?: any): Promise<number> {
    const startTime = Date.now();
    const repo = this.getRepository();
    const queryBuilder = repo.createQueryBuilder('entity');

    if (where) {
      this.applyWhereConditions(queryBuilder, where);
    }

    const count = await queryBuilder.getCount();
    const duration = Date.now() - startTime;

    this.logger.debug('Enhanced count query executed', undefined, {
      entity: repo.metadata.name,
      duration,
      count,
      where: where ? JSON.stringify(where) : 'none',
    });

    return count;
  }

  /**
   * Enhanced exists method with advanced query building
   */
  async existsWithOptions(where: any): Promise<boolean> {
    const startTime = Date.now();
    const repo = this.getRepository();
    const queryBuilder = repo.createQueryBuilder('entity');

    this.applyWhereConditions(queryBuilder, where);
    queryBuilder.select('1').limit(1);

    const result = await queryBuilder.getRawOne();
    const exists = !!result;
    const duration = Date.now() - startTime;

    this.logger.debug('Enhanced exists query executed', undefined, {
      entity: repo.metadata.name,
      duration,
      exists,
      where: JSON.stringify(where),
    });

    return exists;
  }

  /**
   * Apply where conditions to query builder
   */
  private applyWhereConditions(
    queryBuilder: SelectQueryBuilder<T>,
    where: any,
  ): void {
    if (typeof where === 'object' && where !== null) {
      Object.entries(where).forEach(([key, value], index) => {
        const parameterName = `${key}_${index}`;

        if (value === null) {
          queryBuilder.andWhere(`entity.${key} IS NULL`);
        } else if (value === undefined) {
          queryBuilder.andWhere(`entity.${key} IS NOT NULL`);
        } else if (Array.isArray(value)) {
          if (value.length === 0) {
            queryBuilder.andWhere('1 = 0'); // No results
          } else {
            queryBuilder.andWhere(`entity.${key} IN (:...${parameterName})`, {
              [parameterName]: value,
            });
          }
        } else if (typeof value === 'object' && value !== null) {
          // Handle complex conditions like { $like: '%search%' }
          if ('$like' in value) {
            queryBuilder.andWhere(`entity.${key} LIKE :${parameterName}`, {
              [parameterName]: value.$like,
            });
          } else if ('$gt' in value) {
            queryBuilder.andWhere(`entity.${key} > :${parameterName}`, {
              [parameterName]: value.$gt,
            });
          } else if ('$gte' in value) {
            queryBuilder.andWhere(`entity.${key} >= :${parameterName}`, {
              [parameterName]: value.$gte,
            });
          } else if ('$lt' in value) {
            queryBuilder.andWhere(`entity.${key} < :${parameterName}`, {
              [parameterName]: value.$lt,
            });
          } else if ('$lte' in value) {
            queryBuilder.andWhere(`entity.${key} <= :${parameterName}`, {
              [parameterName]: value.$lte,
            });
          }
        } else {
          // Simple equality
          queryBuilder.andWhere(`entity.${key} = :${parameterName}`, {
            [parameterName]: value,
          });
        }
      });
    }
  }

  // Single pagination method that handles everything
  async paginate(
    query: BasePaginationDto,
    columns: {
      searchableColumns: string[];
      sortableColumns: string[];
      defaultSortBy: [string, 'ASC' | 'DESC'];
    },
    route: string,
    queryBuilder: SelectQueryBuilder<T>,
  ): Promise<Pagination<T>> {
    // Get the main alias from the query builder
    const mainAlias = queryBuilder.alias;

    // Handle soft-deleted records
    if (query.isDeleted) {
      queryBuilder.withDeleted().andWhere(`${mainAlias}.deletedAt IS NOT NULL`);
    }

    // Apply global date filters automatically
    this.applyDateFilters(queryBuilder, query, 'createdAt', mainAlias);

    // Apply search
    if (query.search && columns.searchableColumns.length > 0) {
      const searchConditions = columns.searchableColumns.map((column) => {
        return `${mainAlias}.${column} ILIKE :search`;
      });
      queryBuilder.andWhere(`(${searchConditions.join(' OR ')})`, {
        search: `%${query.search}%`,
      });
    }

    // Apply sorting - clear any existing orderBy first
    queryBuilder.orderBy({});

    if (query.sortBy && query.sortBy.length > 0) {
      query.sortBy.forEach(([column, direction]) => {
        queryBuilder.addOrderBy(`${mainAlias}.${column}`, direction);
      });
    } else if (columns.defaultSortBy) {
      queryBuilder.addOrderBy(
        `${mainAlias}.${columns.defaultSortBy[0]}`,
        columns.defaultSortBy[1],
      );
    }

    return await paginate(queryBuilder, {
      page: query.page || 1,
      limit: Math.min(query.limit || 10, 100),
      route,
    });
  }

  async create(data: Partial<T>): Promise<T> {
    const repo = this.getRepository();
    const entity = repo.create(data as unknown as T);
    return repo.save(entity);
  }

  async findOne(id: string): Promise<T | null> {
    return this.getRepository().findOne({ where: { id } as any });
  }

  async findOneSoftDeleted(id: string): Promise<T | null> {
    return this.getRepository().findOne({
      where: { id } as any,
      withDeleted: true,
    });
  }

  async findMany(options?: FindManyOptions<T>): Promise<T[]> {
    return this.getRepository().find(options);
  }

  async findWithRelations(id: string): Promise<T | null> {
    return this.getRepository().findOne({ where: { id } as any });
  }

  async update(id: string, data: DeepPartial<T>): Promise<T | null> {
    const repo = this.getRepository();
    const entity = await repo.findOne({ where: { id } as any });
    if (!entity) return null;

    repo.merge(entity, data);

    return repo.save(entity);
  }

  async softRemove(id: string): Promise<void> {
    const repo = this.getRepository();
    const entity = await repo.findOne({ where: { id } as any });
    if (!entity) throw new NotFoundException('Entity not found');

    await repo.softRemove(entity);
  }

  async remove(id: string): Promise<void> {
    const repo = this.getRepository();
    const entity = await repo.findOne({ where: { id } as any });
    if (!entity) throw new NotFoundException('Entity not found');

    await repo.remove(entity);
  }

  async restore(id: string): Promise<void> {
    await this.getRepository().restore(id);
  }

  /**
   * Apply global date filters to any query builder
   * This method can be used by all repositories for consistent date filtering
   *
   * @example
   * ```typescript
   * // In any repository:
   * this.applyDateFilters(queryBuilder, query, 'createdAt', 'entity');
   * ```
   */
  protected applyDateFilters<T extends BasePaginationDto>(
    queryBuilder: SelectQueryBuilder<any>,
    paginationDto: T,
    dateField: string = 'createdAt',
    alias: string = 'entity',
  ): void {
    if (paginationDto.dateFrom) {
      queryBuilder.andWhere(`${alias}.${dateField} >= :dateFrom`, {
        dateFrom: paginationDto.dateFrom,
      });
    }

    if (paginationDto.dateTo) {
      queryBuilder.andWhere(`${alias}.${dateField} <= :dateTo`, {
        dateTo: paginationDto.dateTo,
      });
    }
  }
}
