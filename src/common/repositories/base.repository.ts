import { Repository, SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { PaginateQuery, Paginated } from 'nestjs-paginate';
import { paginate } from 'nestjs-paginate';
import { LoggerService } from '../../shared/services/logger.service';

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
  query: PaginateQuery;
  searchableColumns?: string[];
  sortableColumns?: string[];
  filterableColumns?: string[];
  defaultSortBy?: [string, 'ASC' | 'DESC'];
  relations?: string[];
  defaultLimit?: number;
  maxLimit?: number;
}

@Injectable()
export abstract class BaseRepository<T extends ObjectLiteral> {
  constructor(
    protected readonly repository: Repository<T>,
    protected readonly logger: LoggerService,
  ) {}

  /**
   * Enhanced find method with advanced query building
   */
  async findWithOptions(options: QueryOptions<T>): Promise<T[]> {
    const queryBuilder = this.repository.createQueryBuilder('entity');

    // Apply select
    if (options.select && options.select.length > 0) {
      queryBuilder.select(
        options.select.map((field) => `entity.${String(field)}`),
      );
    }

    // Apply relations
    if (options.relations && options.relations.length > 0) {
      options.relations.forEach((relation) => {
        queryBuilder.leftJoinAndSelect(`entity.${relation}`, relation);
      });
    }

    // Apply where conditions
    if (options.where) {
      this.applyWhereConditions(queryBuilder, options.where);
    }

    // Apply ordering
    if (options.order) {
      Object.entries(options.order).forEach(([field, direction]) => {
        queryBuilder.addOrderBy(`entity.${field}`, direction);
      });
    }

    // Apply pagination
    if (options.skip !== undefined) {
      queryBuilder.skip(options.skip);
    }
    if (options.take !== undefined) {
      queryBuilder.take(options.take);
    }

    // Apply caching
    if (options.cache) {
      const cacheTime =
        typeof options.cache === 'number' ? options.cache : 60000; // 1 minute default
      queryBuilder.cache(`query_${Date.now()}`, cacheTime);
    }

    // Apply locking
    if (options.lock) {
      queryBuilder.setLock(options.lock);
    }

    const startTime = Date.now();
    const result = await queryBuilder.getMany();
    const duration = Date.now() - startTime;

    this.logger.debug('Enhanced query executed', undefined, {
      entity: this.repository.metadata.name,
      duration,
      resultCount: result.length,
      options: JSON.stringify(options),
    });

    return result;
  }

  /**
   * Enhanced findOne method with advanced query building
   */
  async findOneWithOptions(options: QueryOptions<T>): Promise<T | null> {
    const startTime = Date.now();
    const queryBuilder = this.repository.createQueryBuilder('entity');

    // Apply select
    if (options.select && options.select.length > 0) {
      queryBuilder.select(
        options.select.map((field) => `entity.${String(field)}`),
      );
    }

    // Apply relations
    if (options.relations && options.relations.length > 0) {
      options.relations.forEach((relation) => {
        queryBuilder.leftJoinAndSelect(`entity.${relation}`, relation);
      });
    }

    // Apply where conditions
    if (options.where) {
      this.applyWhereConditions(queryBuilder, options.where);
    }

    // Apply ordering
    if (options.order) {
      Object.entries(options.order).forEach(([field, direction]) => {
        queryBuilder.addOrderBy(`entity.${field}`, direction);
      });
    }

    // Apply pagination (for findOne, we only need take: 1)
    queryBuilder.take(1);

    // Apply caching
    if (options.cache) {
      const cacheTime =
        typeof options.cache === 'number' ? options.cache : 60000; // 1 minute default
      queryBuilder.cache(`query_${Date.now()}`, cacheTime);
    }

    // Apply locking
    if (options.lock) {
      queryBuilder.setLock(options.lock);
    }

    const result = await queryBuilder.getOne();
    const duration = Date.now() - startTime;

    this.logger.debug('Enhanced findOne query executed', undefined, {
      entity: this.repository.metadata.name,
      duration,
      found: !!result,
      options: JSON.stringify(options),
    });

    return result;
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
      const batch = entities.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;

      try {
        const batchResults = await this.repository.save(batch as T[]);
        results.push(...batchResults);
        totalProcessed += batch.length;

        this.logger.debug('Bulk insert batch completed', undefined, {
          entity: this.repository.metadata.name,
          batchNumber,
          batchSize: batch.length,
          totalProcessed,
          total,
        });

        if (onProgress) {
          onProgress(totalProcessed, total);
        }
      } catch (error) {
        this.logger.error(
          `Bulk insert batch failed: ${error.message}`,
          error.stack,
          undefined,
          {
            entity: this.repository.metadata.name,
            batchNumber,
            batchSize: batch.length,
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

    // First, get all IDs that match the where condition
    const queryBuilder = this.repository.createQueryBuilder('entity');
    this.applyWhereConditions(queryBuilder, where);
    const entities = await queryBuilder.getMany();
    const total = entities.length;

    for (let i = 0; i < total; i += batchSize) {
      const batch = entities.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;

      try {
        const batchIds = batch.map((entity) => entity.id);
        const result = await this.repository.update(batchIds, updateData);
        const affected = result.affected || 0;
        totalAffected += affected;
        totalProcessed += batch.length;

        this.logger.debug('Bulk update batch completed', undefined, {
          entity: this.repository.metadata.name,
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
            entity: this.repository.metadata.name,
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

    // First, get all IDs that match the where condition
    const queryBuilder = this.repository.createQueryBuilder('entity');
    this.applyWhereConditions(queryBuilder, where);
    const entities = await queryBuilder.getMany();
    const total = entities.length;

    for (let i = 0; i < total; i += batchSize) {
      const batch = entities.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;

      try {
        const batchIds = batch.map((entity) => entity.id);
        const result = await this.repository.delete(batchIds);
        const affected = result.affected || 0;
        totalAffected += affected;
        totalProcessed += batch.length;

        this.logger.debug('Bulk delete batch completed', undefined, {
          entity: this.repository.metadata.name,
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
            entity: this.repository.metadata.name,
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
    const queryBuilder = this.repository.createQueryBuilder('entity');

    if (where) {
      this.applyWhereConditions(queryBuilder, where);
    }

    const count = await queryBuilder.getCount();
    const duration = Date.now() - startTime;

    this.logger.debug('Enhanced count query executed', undefined, {
      entity: this.repository.metadata.name,
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
    const queryBuilder = this.repository.createQueryBuilder('entity');

    this.applyWhereConditions(queryBuilder, where);
    queryBuilder.select('1').limit(1);

    const result = await queryBuilder.getRawOne();
    const exists = !!result;
    const duration = Date.now() - startTime;

    this.logger.debug('Enhanced exists query executed', undefined, {
      entity: this.repository.metadata.name,
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

  // Single pagination method with flexible options
  async paginate(
    query: PaginateQuery,
    options: Partial<PaginateOptions<T>> = {},
  ): Promise<Paginated<T>> {
    const {
      searchableColumns = [],
      sortableColumns = [],
      filterableColumns = [],
      defaultSortBy = ['createdAt', 'DESC'],
      relations = [],
      defaultLimit = 10,
      maxLimit = 100,
    } = options;

    const queryBuilder = this.repository.createQueryBuilder('entity');

    relations.forEach((relation) => {
      queryBuilder.leftJoinAndSelect(`entity.${relation}`, relation);
    });

    return await paginate(query, queryBuilder, {
      sortableColumns: sortableColumns as any,
      searchableColumns: searchableColumns as any,
      filterableColumns: filterableColumns.reduce(
        (acc, col) => {
          acc[col] = true;
          return acc;
        },
        {} as Record<string, boolean>,
      ) as any,
      defaultSortBy: [[String(defaultSortBy[0]), defaultSortBy[1]]] as any,
      defaultLimit,
      maxLimit,
    });
  }

  async create(data: Partial<T>): Promise<T> {
    return this.repository.save(data as any);
  }

  async findOne(id: string): Promise<T | null> {
    return this.repository.findOne({ where: { id } as any });
  }

  async findMany(options?: any): Promise<T[]> {
    return this.repository.find(options);
  }

  async findById(id: string): Promise<T | null> {
    return this.repository.findOne({ where: { id } as any });
  }

  async findAll(): Promise<T[]> {
    return this.repository.find();
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    await this.repository.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  async restore(id: string): Promise<void> {
    await this.repository.restore(id);
  }
}
