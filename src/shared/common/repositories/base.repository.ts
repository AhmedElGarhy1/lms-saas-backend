import {
  Repository,
  SelectQueryBuilder,
  UpdateQueryBuilder,
  DeleteQueryBuilder,
  ObjectLiteral,
  DeepPartial,
  FindManyOptions,
  EntityManager,
  FindOptionsWhere,
} from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { ResourceNotFoundException } from '../exceptions/custom.exceptions';
import { Pagination } from '../types/pagination.types';
import { BasePaginationDto } from '../dto/base-pagination.dto';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

export interface BulkOperationOptions {
  batchSize?: number;
  onProgress?: (processed: number, total: number) => void;
}

@Injectable()
export abstract class BaseRepository<T extends ObjectLiteral> {
  protected readonly logger: Logger;

  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    // Use class name as context (e.g., 'UserRepository', 'CenterRepository')
    // Note: Cannot use ClassName.name for abstract class, must use this.constructor.name
    const context = this.constructor.name;
    this.logger = new Logger(context);
  }

  /**
   * Get the entity class for this repository.
   * Override this method in child repositories to specify the entity class.
   *
   * @returns Entity class constructor
   */
  protected abstract getEntityClass(): new () => T;

  /**
   * Get the active repository - always from transaction context.
   *
   * @returns TypeORM repository instance
   * @throws Error if transaction context is not available
   */
  protected getRepository(): Repository<T> {
    if (!this.txHost?.tx) {
      this.logger.error(
        `Repository transaction context is missing - entity: ${this.getEntityClass().name}`,
        new Error('Transaction context not available'),
      );
      throw new Error('Transaction context is not available');
    }
    return this.txHost.tx.getRepository(this.getEntityClass());
  }

  /**
   * Get the active entity manager - always from transaction context.
   *
   * @returns TypeORM entity manager instance
   * @throws Error if transaction context is not available
   */
  protected getEntityManager(): EntityManager {
    if (!this.txHost?.tx) {
      this.logger.error(
        `Entity manager transaction context is missing - entity: ${this.getEntityClass().name}`,
        new Error('Transaction context not available'),
      );
      throw new Error('Transaction context is not available');
    }
    return this.txHost.tx;
  }

  /**
   * Bulk insert with progress tracking and error handling.
   * Uses TypeORM's built-in batch save for optimal performance.
   *
   * @param entities Array of partial entities to insert
   * @param options Bulk operation options including batch size and progress callback
   * @returns Array of inserted entities
   * @throws Error if entities array is empty
   */
  async bulkInsert(
    entities: Partial<T>[],
    options: BulkOperationOptions = {},
  ): Promise<T[]> {
    if (!entities || entities.length === 0) {
      throw new Error('Entities array cannot be empty');
    }

    const repo = this.getRepository();
    const { batchSize = 100, onProgress } = options;
    const total = entities.length;
    const results: T[] = [];

    // Process in batches using TypeORM's built-in chunking
    for (let i = 0; i < total; i += batchSize) {
      try {
        const batch = entities.slice(i, i + batchSize);
        const batchResults = await repo.save(batch as T[], {
          chunk: batchSize,
        });
        results.push(...batchResults);

        if (onProgress) {
          onProgress(Math.min(i + batchSize, total), total);
        }
      } catch (error) {
        this.logger.error(
          `Bulk insert batch failed: ${error instanceof Error ? error.message : String(error)}`,
          error,
          {
            entity: repo.metadata.name,
            totalProcessed: i,
            total,
          },
        );
        throw error;
      }
    }

    return results;
  }

  /**
   * Update multiple entities by ID.
   *
   * @param data Array of objects containing id and data to update
   * @returns Array of updated entities
   * @throws ResourceNotFoundException if any entity is not found
   */
  async updateMany(data: { id: string; data: DeepPartial<T> }[]): Promise<T[]> {
    const results = await Promise.all(
      data.map((item) => this.updateThrow(item.id, item.data)),
    );
    return results.map((result) => result as T);
  }

  /**
   * Bulk update with progress tracking and error handling.
   * Uses direct SQL update for optimal performance without loading entities into memory.
   *
   * @param where Where conditions to match entities
   * @param updateData Data to update
   * @param options Bulk operation options including batch size and progress callback
   * @returns Number of affected rows
   * @throws Error if where condition is empty
   */
  async bulkUpdate(
    where: FindOptionsWhere<T>,
    updateData: DeepPartial<T>,
    options: BulkOperationOptions = {},
  ): Promise<number> {
    if (!where || Object.keys(where).length === 0) {
      throw new Error('Where condition cannot be empty');
    }

    const repo = this.getRepository();
    const qb = repo
      .createQueryBuilder()
      .update(this.getEntityClass())
      // TypeORM's UpdateQueryBuilder.set() requires a specific type that DeepPartial<T> doesn't satisfy
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      .set(updateData as any);

    this.applyWhereConditions(qb, where);
    const result = await qb.execute();

    if (options.onProgress) {
      options.onProgress(result.affected || 0, result.affected || 0);
    }

    return result.affected || 0;
  }

  /**
   * Bulk delete with progress tracking and error handling.
   * Uses soft delete if entity supports it (has deletedAt column), otherwise uses hard delete.
   * Uses direct SQL delete for optimal performance without loading entities into memory.
   *
   * @param where Where conditions to match entities
   * @param options Bulk operation options including batch size and progress callback
   * @returns Number of affected rows
   * @throws Error if where condition is empty
   */
  async bulkDelete(
    where: FindOptionsWhere<T>,
    options: BulkOperationOptions = {},
  ): Promise<number> {
    if (!where || Object.keys(where).length === 0) {
      throw new Error('Where condition cannot be empty');
    }

    const repo = this.getRepository();

    // Check if entity supports soft delete (has deletedAt column)
    const hasSoftDelete = repo.metadata.columns.some(
      (col) => col.propertyName === 'deletedAt',
    );

    if (hasSoftDelete) {
      // Use softDelete for entities that support it
      const result = await repo.softDelete(where);
      if (options.onProgress) {
        options.onProgress(result.affected || 0, result.affected || 0);
      }
      return result.affected || 0;
    } else {
      // Use hard delete for entities that don't support soft delete
      const qb = repo.createQueryBuilder().delete().from(this.getEntityClass());
      this.applyWhereConditions(qb, where);
      const result = await qb.execute();
      if (options.onProgress) {
        options.onProgress(result.affected || 0, result.affected || 0);
      }
      return result.affected || 0;
    }
  }

  /**
   * Apply where conditions to query builder.
   * Supports standard TypeORM FindOptionsWhere patterns:
   * - Simple equality: { field: value }
   * - Arrays (IN clause): { field: [value1, value2] }
   * - Null checks: { field: null } or { field: undefined }
   * - TypeORM operators: { field: In([...]) } - extracts values from In() operator
   *
   * @param queryBuilder Query builder (Select, Update, or Delete)
   * @param where Where conditions to apply
   */
  private applyWhereConditions(
    queryBuilder:
      | SelectQueryBuilder<T>
      | UpdateQueryBuilder<T>
      | DeleteQueryBuilder<T>,
    where: FindOptionsWhere<T>,
  ): void {
    if (typeof where !== 'object' || where === null) {
      return;
    }

    // For UpdateQueryBuilder and DeleteQueryBuilder, we need to use the table name as alias
    // For SelectQueryBuilder, we can use the alias property
    const alias =
      'alias' in queryBuilder
        ? queryBuilder.alias
        : this.getRepository().metadata.tableName;

    // TypeScript doesn't recognize that all query builder types have andWhere
    // We need to cast to access the common interface
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const qb = queryBuilder as any;

    /* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
    Object.entries(where).forEach(([key, value], index) => {
      const parameterName = `${key}_${index}`;

      if (value === null) {
        qb.andWhere(`${alias}.${key} IS NULL`);
      } else if (value === undefined) {
        qb.andWhere(`${alias}.${key} IS NOT NULL`);
      } else if (Array.isArray(value)) {
        if (value.length === 0) {
          qb.andWhere('1 = 0'); // No results
        } else {
          qb.andWhere(`${alias}.${key} IN (:...${parameterName})`, {
            [parameterName]: value,
          });
        }
      } else if (
        typeof value === 'object' &&
        value !== null &&
        '_type' in value &&
        (value as { _type?: string })._type === 'in'
      ) {
        // Handle TypeORM In() operator - extract the values
        const inValues = (value as { _value?: unknown[] })._value;
        if (Array.isArray(inValues) && inValues.length > 0) {
          qb.andWhere(`${alias}.${key} IN (:...${parameterName})`, {
            [parameterName]: inValues,
          });
        } else {
          qb.andWhere('1 = 0'); // No results
        }
      } else {
        // Simple equality (strings, numbers, booleans, etc.)
        qb.andWhere(`${alias}.${key} = :${parameterName}`, {
          [parameterName]: value,
        });
      }
    });
    /* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
  }

  /**
   * Paginate entities with search, sorting, and filtering support.
   *
   * @param query Pagination DTO with search, sort, and filter parameters
   * @param columns Configuration for searchable and sortable columns
   * @param route API route for pagination links
   * @param queryBuilder Pre-configured query builder
   * @returns Paginated result with entities and metadata
   */
  async paginate(
    query: BasePaginationDto,
    columns: {
      searchableColumns: string[];
      sortableColumns: string[];
      defaultSortBy: [string, 'ASC' | 'DESC'];
    },
    route: string,
    queryBuilder: SelectQueryBuilder<T>,
    options?: {
      includeComputedFields?: boolean;
      computedFieldsMapper?: (entity: T, raw: any, index: number) => T;
    },
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
        // If column already contains a dot, it's a full path (e.g., 'userProfiles.name')
        // Otherwise, prefix it with the main alias (e.g., 'user.name')
        const columnPath = column.includes('.')
          ? column
          : `${mainAlias}.${column}`;
        return `${columnPath} ILIKE :search`;
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

    // Calculate pagination parameters
    const page = query.page || 1;
    const limit = Math.min(query.limit || 10, 100);
    const skip = (page - 1) * limit;

    // Get total count before pagination
    const totalItems = await queryBuilder.getCount();

    // Apply pagination
    queryBuilder.skip(skip).take(limit);

    // Get entities (with or without raw data for computed fields)
    let items: T[];
    if (options?.includeComputedFields && options.computedFieldsMapper) {
      // Use getRawAndEntities to access computed fields
      const { entities, raw } = await queryBuilder.getRawAndEntities();
      // Map entities with computed fields using the provided mapper
      items = entities.map((entity, index) =>
        options.computedFieldsMapper!(entity, raw[index], index),
      );
    } else {
      // Use getMany for standard pagination
      items = await queryBuilder.getMany();
    }

    // Build pagination response
    const totalPages = Math.ceil(totalItems / limit);

    // Build links - match the exact format from the example
    // first: "/classes?limit=10" (no page parameter)
    // last: "/classes?page=1&limit=10"
    const buildLink = (pageNum?: number): string => {
      if (pageNum === undefined) {
        return `${route}?limit=${limit}`;
      }
      return `${route}?page=${pageNum}&limit=${limit}`;
    };

    return {
      items,
      meta: {
        totalItems,
        itemCount: items.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
      links: {
        first: buildLink(), // No page parameter for first
        last: buildLink(totalPages),
        next: page < totalPages ? buildLink(page + 1) : '',
        previous: page > 1 ? buildLink(page - 1) : '',
      },
    };
  }

  /**
   * Create a new entity.
   *
   * @param data Partial entity data
   * @returns Created entity
   * @throws Error if data is invalid
   */
  async create(data: Partial<T>): Promise<T> {
    if (!data || typeof data !== 'object') {
      throw new Error('Data must be a valid object');
    }

    const repo = this.getRepository();
    const entity = repo.create(data as unknown as T);
    return repo.save(entity);
  }

  /**
   * Find a single entity by ID.
   *
   * @param id Entity ID
   * @returns Entity or null if not found
   * @throws Error if ID is invalid
   */
  async findOne(id: string): Promise<T | null> {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('ID must be a non-empty string');
    }
    return this.getRepository().findOne({
      where: { id } as unknown as FindOptionsWhere<T>,
    });
  }

  /**
   * Find a single entity by ID or throw an error if not found.
   *
   * @param id Entity ID
   * @returns Entity (never null)
   * @throws ResourceNotFoundException if entity not found
   * @throws Error if ID is invalid
   */
  async findOneOrThrow(id: string): Promise<T> {
    const entity = await this.findOne(id);
    if (!entity) {
      throw new ResourceNotFoundException('t.errors.notFound.withId', {
        resource: 't.common.resources.resource',
        identifier: 'ID',
        value: id,
      });
    }
    return entity;
  }

  /**
   * Find a single soft-deleted entity by ID.
   *
   * @param id Entity ID
   * @returns Entity or null if not found
   * @throws Error if ID is invalid
   */
  async findOneSoftDeletedById(id: string): Promise<T | null> {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('ID must be a non-empty string');
    }
    return this.getRepository().findOne({
      where: { id } as unknown as FindOptionsWhere<T>,
      withDeleted: true,
    });
  }
  /**
   * Find a single soft-deleted entity by where conditions.
   *
   * @param data Where conditions to match
   * @returns Entity or null if not found
   */
  async findOneSoftDeleted(data: FindOptionsWhere<T>): Promise<T | null> {
    return this.getRepository().findOne({
      where: data,
      withDeleted: true,
    });
  }

  /**
   * Find multiple entities with optional find options.
   *
   * @param options Optional TypeORM find options
   * @returns Array of entities
   */
  async findMany(options?: FindManyOptions<T>): Promise<T[]> {
    return this.getRepository().find(options);
  }

  /**
   * Update an entity by ID.
   *
   * @param id Entity ID
   * @param data Data to update
   * @returns Updated entity or null if not found
   * @throws Error if ID or data is invalid
   */
  async update(id: string, data: DeepPartial<T>): Promise<T | null> {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('ID must be a non-empty string');
    }
    if (!data || typeof data !== 'object') {
      throw new Error('Update data must be a valid object');
    }

    const repo = this.getRepository();
    // TypeORM's update method accepts DeepPartial<T> but TypeScript doesn't recognize the compatibility
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const result = await repo.update(id, data as any);

    if (result.affected === 0) {
      return null;
    }

    // Return updated entity
    return repo.findOne({ where: { id } as unknown as FindOptionsWhere<T> });
  }

  /**
   * Update an entity by ID or throw an error if not found.
   *
   * @param id Entity ID
   * @param data Data to update
   * @returns Updated entity (never null)
   * @throws ResourceNotFoundException if entity not found
   * @throws Error if ID or data is invalid
   */
  async updateThrow(id: string, data: DeepPartial<T>): Promise<T> {
    const entity = await this.update(id, data);
    if (!entity) {
      throw new ResourceNotFoundException('t.errors.notFound.withId', {
        resource: 't.common.resources.resource',
        identifier: 'ID',
        value: id,
      });
    }
    return entity;
  }

  /**
   * Soft delete an entity by ID (sets deletedAt timestamp).
   *
   * @param id Entity ID
   * @throws ResourceNotFoundException if entity not found
   * @throws Error if ID is invalid
   */
  async softRemove(id: string): Promise<void> {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('ID must be a non-empty string');
    }

    const repo = this.getRepository();
    const entity = await repo.findOne({
      where: { id } as unknown as FindOptionsWhere<T>,
    });
    if (!entity) {
      throw new ResourceNotFoundException('t.errors.notFound.withId', {
        resource: 't.common.resources.resource',
        identifier: 'ID',
        value: id,
      });
    }

    await repo.softRemove(entity);
  }

  /**
   * Hard delete an entity by ID (permanently removes from database).
   *
   * @param id Entity ID
   * @throws ResourceNotFoundException if entity not found
   * @throws Error if ID is invalid
   */
  async remove(id: string): Promise<void> {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('ID must be a non-empty string');
    }

    const repo = this.getRepository();
    const entity = await repo.findOne({
      where: { id } as unknown as FindOptionsWhere<T>,
    });
    if (!entity) {
      throw new ResourceNotFoundException('t.errors.notFound.withId', {
        resource: 't.common.resources.resource',
        identifier: 'ID',
        value: id,
      });
    }

    await repo.remove(entity);
  }

  /**
   * Restore a soft-deleted entity by ID (removes deletedAt timestamp).
   *
   * @param id Entity ID
   * @throws Error if ID is invalid
   */
  async restore(id: string): Promise<void> {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('ID must be a non-empty string');
    }
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
  protected applyDateFilters(
    queryBuilder: SelectQueryBuilder<any>,
    paginationDto: BasePaginationDto,
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

  /**
   * Apply isActive filter to query builder.
   *
   * @param queryBuilder Query builder to apply filter to
   * @param dto Pagination DTO containing isActive filter
   * @param isActiveField Field name for isActive column
   */
  protected applyIsActiveFilter<T extends BasePaginationDto>(
    queryBuilder: SelectQueryBuilder<any>,
    dto: T,
    isActiveField: string,
  ): void {
    if (dto.isActive !== undefined && dto.isActive !== null) {
      queryBuilder.andWhere(`${isActiveField} = :isActive`, {
        isActive: dto.isActive,
      });
    }
  }
}
