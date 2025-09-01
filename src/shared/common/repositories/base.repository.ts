import { Repository, SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Pagination, paginate } from 'nestjs-typeorm-paginate';
import { LoggerService } from '@/shared/services/logger.service';

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
    options: Partial<PaginateOptions<T>> = {},
    queryBuilder?: SelectQueryBuilder<T>,
  ): Promise<Pagination<T>> {
    const {
      page = 1,
      limit = 10,
      searchableColumns = [],
      sortableColumns = [],
      filterableColumns = [],
      defaultSortBy = ['createdAt', 'DESC'],
      defaultLimit = 10,
      maxLimit = 100,
      search,
      filter,
      sortBy,
      route = '/api',
    } = options;

    // Use provided queryBuilder or create a new one
    const qb = queryBuilder || this.repository.createQueryBuilder('entity');

    // Get the main alias from the query builder
    const mainAlias = qb.alias;

    // Apply search
    if (search && searchableColumns.length > 0) {
      const searchConditions = searchableColumns.map((column) => {
        return `${mainAlias}.${column} ILIKE :search`;
      });
      qb.andWhere(`(${searchConditions.join(' OR ')})`, {
        search: `%${search}%`,
      });
    }

    // Apply filters
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          // Handle date range filtering
          if (key === 'dateFrom' && value) {
            qb.andWhere(`${mainAlias}.createdAt >= :dateFrom`, {
              dateFrom: value,
            });
          } else if (key === 'dateTo' && value) {
            qb.andWhere(`${mainAlias}.createdAt <= :dateTo`, {
              dateTo: value,
            });
          } else if (typeof value === 'object' && value !== null) {
            // Handle complex filters like { $ne: value }
            if ('$ne' in value) {
              qb.andWhere(`${mainAlias}.${key} != :${key}_ne`, {
                [`${key}_ne`]: value.$ne,
              });
            } else if ('$like' in value) {
              qb.andWhere(`${mainAlias}.${key} LIKE :${key}_like`, {
                [`${key}_like`]: value.$like,
              });
            } else if ('$in' in value) {
              qb.andWhere(`${mainAlias}.${key} IN (:...${key}_in)`, {
                [`${key}_in`]: value.$in,
              });
            } else if ('$gt' in value) {
              qb.andWhere(`${mainAlias}.${key} > :${key}_gt`, {
                [`${key}_gt`]: value.$gt,
              });
            } else if ('$gte' in value) {
              qb.andWhere(`${mainAlias}.${key} >= :${key}_gte`, {
                [`${key}_gte`]: value.$gte,
              });
            } else if ('$lt' in value) {
              qb.andWhere(`${mainAlias}.${key} < :${key}_lt`, {
                [`${key}_lt`]: value.$lt,
              });
            } else if ('$lte' in value) {
              qb.andWhere(`${mainAlias}.${key} <= :${key}_lte`, {
                [`${key}_lte`]: value.$lte,
              });
            }
          } else {
            // Simple equality filter
            qb.andWhere(`${mainAlias}.${key} = :${key}`, { [key]: value });
          }
        }
      });
    }

    // Apply sorting
    if (sortBy && sortBy.length > 0) {
      sortBy.forEach(([column, direction]) => {
        qb.addOrderBy(`${mainAlias}.${column}`, direction);
      });
    } else if (defaultSortBy) {
      qb.addOrderBy(`${mainAlias}.${defaultSortBy[0]}`, defaultSortBy[1]);
    }

    return await paginate(qb, {
      page,
      limit: Math.min(limit, maxLimit),
      route,
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

  /**
   * Apply filters to query builder with field mapping
   * @param queryBuilder - The query builder to apply filters to
   * @param filters - The filters object
   * @param fieldMapping - Mapping from frontend field names to database field names
   */
  protected applyFilters(
    queryBuilder: SelectQueryBuilder<T>,
    filters: Record<string, any>,
    fieldMapping: Record<string, string> = {},
  ): void {
    const conditions: {
      condition: string;
      params: Record<string, any>;
    }[] = [];

    // Handle date range filtering first
    if (filters.dateFrom || filters.dateTo) {
      const dateField =
        fieldMapping.dateFrom || fieldMapping.dateTo || 'user.createdAt';

      if (filters.dateFrom) {
        conditions.push({
          condition: `${dateField} >= :dateFrom`,
          params: { dateFrom: filters.dateFrom },
        });
      }

      if (filters.dateTo) {
        conditions.push({
          condition: `${dateField} <= :dateTo`,
          params: { dateTo: filters.dateTo },
        });
      }
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        key !== 'dateFrom' &&
        key !== 'dateTo'
      ) {
        // Use field mapping or default to the key name
        const dbField = fieldMapping[key] || key;

        // Create a safe parameter name (replace dots with underscores)
        const paramName = key.replace(/[^a-zA-Z0-9_]/g, '_');

        // Handle different filter types
        if (typeof value === 'object' && value !== null) {
          if ('$ne' in value) {
            conditions.push({
              condition: `${dbField} != :${paramName}_ne`,
              params: {
                [`${paramName}_ne`]: value.$ne,
              },
            });
          } else if ('$like' in value) {
            conditions.push({
              condition: `${dbField} LIKE :${paramName}_like`,
              params: {
                [`${paramName}_like`]: value.$like,
              },
            });
          } else if ('$in' in value) {
            conditions.push({
              condition: `${dbField} IN (:...${paramName}_in)`,
              params: {
                [`${paramName}_in`]: value.$in,
              },
            });
          } else if ('$gte' in value) {
            conditions.push({
              condition: `${dbField} >= :${paramName}_gte`,
              params: {
                [`${paramName}_gte`]: value.$gte,
              },
            });
          } else if ('$lte' in value) {
            conditions.push({
              condition: `${dbField} <= :${paramName}_lte`,
              params: {
                [`${paramName}_lte`]: value.$lte,
              },
            });
          }
        } else {
          // Simple equality filter
          // Convert string boolean values to actual booleans
          let processedValue = value;
          if (typeof value === 'string') {
            if (value.toLowerCase() === 'true') {
              processedValue = true;
            } else if (value.toLowerCase() === 'false') {
              processedValue = false;
            }
          }

          conditions.push({
            condition: `${dbField} = :${paramName}`,
            params: {
              [paramName]: processedValue,
            },
          });
        }
      }
    });
    conditions.forEach((condition) => {
      queryBuilder.andWhere(condition.condition, condition.params);
    });
  }
}
