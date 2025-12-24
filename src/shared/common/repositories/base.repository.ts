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
import { RequestContext } from '../context/request.context';
import { TimezoneService } from '../services/timezone.service';

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
   * Bulk insert with automatic createdBy population from RequestContext.
   * Automatically sets createdBy from RequestContext if not already provided in entities.
   * Uses TypeORM's save() method which processes entities in batches for performance.
   *
   * @param entities Array of partial entity data to insert
   * @param options Bulk operation options including batch size and progress callback
   * @returns Array of created entities
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

    const ctx = RequestContext.get();
    const userId = ctx.userId;

    for (let i = 0; i < total; i += batchSize) {
      try {
        const batch = entities.slice(i, i + batchSize);

        const batchWithCreatedBy = batch.map((entity) => {
          const entityWithCreatedBy = { ...entity } as Record<string, unknown>;
          if (!entityWithCreatedBy.createdBy && userId) {
            entityWithCreatedBy.createdBy = userId;
          }
          return entityWithCreatedBy;
        });

        const batchResults = await repo.save(
          batchWithCreatedBy as unknown as T[],
          {
            chunk: batchSize,
          },
        );
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
   * Automatically sets updatedBy from RequestContext if not already provided.
   *
   * Note: This method uses QueryBuilder which bypasses TypeORM hooks (@BeforeUpdate).
   * If hooks are needed, use individual update() or updateThrow() calls instead.
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

    const ctx = RequestContext.get();
    const userId = ctx.userId;

    const updateDataWithUpdatedBy: Record<string, unknown> = {
      ...(updateData as Record<string, unknown>),
    };
    if (!updateDataWithUpdatedBy.updatedBy && userId) {
      updateDataWithUpdatedBy.updatedBy = userId;
    }
    updateDataWithUpdatedBy.updatedAt = new Date();

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
   * Automatically sets deletedBy from RequestContext for soft deletes if entity supports it.
   *
   * Note: This method uses QueryBuilder/softDelete which bypasses TypeORM hooks (@BeforeRemove).
   * If hooks are needed, delete entities individually using remove() or delete().
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

    // Check if entity supports deletedBy (has deletedBy column)
    const hasDeletedBy = repo.metadata.columns.some(
      (col) => col.propertyName === 'deletedBy',
    );

    if (hasSoftDelete) {
      const ctx = RequestContext.get();
      const userId = ctx.userId;

      if (hasDeletedBy && userId) {
        const qb = repo
          .createQueryBuilder()
          .update(this.getEntityClass())
          .set({
            deletedAt: new Date(),
            deletedBy: userId,
          } as any);

        this.applyWhereConditions(qb, where);
        const result = await qb.execute();

        if (options.onProgress) {
          options.onProgress(result.affected || 0, result.affected || 0);
        }
        return result.affected || 0;
      } else {
        const result = await repo.softDelete(where);
        if (options.onProgress) {
          options.onProgress(result.affected || 0, result.affected || 0);
        }
        return result.affected || 0;
      }
    } else {
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

    const alias =
      'alias' in queryBuilder
        ? queryBuilder.alias
        : this.getRepository().metadata.tableName;

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
          qb.andWhere('1 = 0');
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
        const inValues = (value as { _value?: unknown[] })._value;
        if (Array.isArray(inValues) && inValues.length > 0) {
          qb.andWhere(`${alias}.${key} IN (:...${parameterName})`, {
            [parameterName]: inValues,
          });
        } else {
          qb.andWhere('1 = 0');
        }
      } else {
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
    const mainAlias = queryBuilder.alias;

    if (query.isDeleted) {
      queryBuilder.withDeleted().andWhere(`${mainAlias}.deletedAt IS NOT NULL`);
    }

    this.applyDateFilters(queryBuilder, query, 'createdAt', mainAlias);

    if (query.search && columns.searchableColumns.length > 0) {
      const searchConditions = columns.searchableColumns.map((column) => {
        const columnPath = column.includes('.')
          ? column
          : `${mainAlias}.${column}`;
        return `${columnPath} ILIKE :search`;
      });
      queryBuilder.andWhere(`(${searchConditions.join(' OR ')})`, {
        search: `%${query.search}%`,
      });
    }

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

    const page = query.page || 1;
    const limit = Math.min(query.limit || 10, 100);
    const skip = (page - 1) * limit;

    const totalItems = await queryBuilder.getCount();

    queryBuilder.skip(skip).take(limit);

    let items: T[];
    if (options?.includeComputedFields && options.computedFieldsMapper) {
      const { entities, raw } = await queryBuilder.getRawAndEntities();
      items = entities.map((entity, index) =>
        options.computedFieldsMapper!(entity, raw[index], index),
      );
    } else {
      items = await queryBuilder.getMany();
    }

    const totalPages = Math.ceil(totalItems / limit);

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
        first: buildLink(),
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
   * Find a single entity by ID with optional relations loaded.
   *
   * @param id Entity ID
   * @param relations Optional array of relation names to load
   * @param withDeleted Optional flag to include soft-deleted entities
   * @returns Entity with relations or null if not found
   * @throws Error if ID is invalid
   */
  async findById(
    id: string,
    relations?: string[],
    withDeleted?: boolean,
  ): Promise<T | null> {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('ID must be a non-empty string');
    }
    const options: any = {
      where: { id } as unknown as FindOptionsWhere<T>,
    };
    if (relations) {
      options.relations = relations;
    }
    if (withDeleted) {
      options.withDeleted = true;
    }
    return this.getRepository().findOne(options);
  }

  /**
   * Find a single entity by ID with optional relations loaded, or throw an error if not found.
   *
   * @param id Entity ID
   * @param relations Optional array of relation names to load
   * @param withDeleted Optional flag to include soft-deleted entities
   * @returns Entity with relations (never null)
   * @throws ResourceNotFoundException if entity not found
   * @throws Error if ID is invalid
   */
  async findByIdOrThrow(
    id: string,
    relations?: string[],
    withDeleted?: boolean,
  ): Promise<T> {
    const entity = await this.findById(id, relations, withDeleted);
    if (!entity) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.resource',
        identifier: 't.resources.identifier',
        value: id,
      });
    }
    return entity;
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
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.resource',
        identifier: 't.resources.identifier',
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
    const entity = await repo.findOne({
      where: { id } as unknown as FindOptionsWhere<T>,
    });

    if (!entity) {
      return null;
    }

    Object.assign(entity, data);
    return repo.save(entity);
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
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.resource',
        identifier: 't.resources.identifier',
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
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.resource',
        identifier: 't.resources.identifier',
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
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.resource',
        identifier: 't.resources.identifier',
        value: id,
      });
    }

    await repo.remove(entity);
  }

  /**
   * Restore a soft-deleted entity by ID (removes deletedAt timestamp).
   *
   * @param id Entity ID
   * @throws ResourceNotFoundException if entity not found
   * @throws Error if ID is invalid
   */
  async restore(id: string): Promise<void> {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('ID must be a non-empty string');
    }

    const repo = this.getRepository();
    const entity = await repo.findOne({
      where: { id } as unknown as FindOptionsWhere<T>,
      withDeleted: true,
    });

    if (!entity) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.resource',
        identifier: 't.resources.identifier',
        value: id,
      });
    }

    await repo.recover(entity);
  }

  /**
   * Apply timezone-aware date filters to any query builder.
   * Filters by dateFrom and dateTo from BasePaginationDto.
   * If date strings are in YYYY-MM-DD format, converts them to UTC ranges based on center timezone.
   * This method can be used by all repositories for consistent timezone-aware date filtering
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
    if (!paginationDto.dateFrom && !paginationDto.dateTo) {
      return; // No date filtering needed
    }

    // Check if dates are in YYYY-MM-DD format (date-only strings)
    const isDateOnlyFormat = (dateStr: string): boolean => {
      return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
    };

    const timezone = TimezoneService.getTimezoneFromContext();

    if (paginationDto.dateFrom && paginationDto.dateTo) {
      // Both dates provided
      if (
        isDateOnlyFormat(paginationDto.dateFrom) &&
        isDateOnlyFormat(paginationDto.dateTo)
      ) {
        // Date-only strings - use timezone-aware range conversion
        const { start, end } = TimezoneService.getZonedDateRange(
          paginationDto.dateFrom,
          paginationDto.dateTo,
          timezone,
        );
        // Use >= for start (inclusive) and < for end (exclusive)
        queryBuilder.andWhere(`${alias}.${dateField} >= :dateFrom`, {
          dateFrom: start,
        });
        queryBuilder.andWhere(`${alias}.${dateField} < :dateTo`, {
          dateTo: end,
        });
      } else {
        // ISO date strings or Date objects - use as-is (already UTC or will be parsed as UTC)
        queryBuilder.andWhere(`${alias}.${dateField} >= :dateFrom`, {
          dateFrom: paginationDto.dateFrom,
        });
        queryBuilder.andWhere(`${alias}.${dateField} <= :dateTo`, {
          dateTo: paginationDto.dateTo,
        });
      }
    } else if (paginationDto.dateFrom) {
      // Only dateFrom provided
      if (isDateOnlyFormat(paginationDto.dateFrom)) {
        // Date-only string - convert to UTC midnight in center timezone
        const start = TimezoneService.dateOnlyToUtc(
          paginationDto.dateFrom,
          timezone,
        );
        queryBuilder.andWhere(`${alias}.${dateField} >= :dateFrom`, {
          dateFrom: start,
        });
      } else {
        // ISO date string or Date object - use as-is
        queryBuilder.andWhere(`${alias}.${dateField} >= :dateFrom`, {
          dateFrom: paginationDto.dateFrom,
        });
      }
    } else if (paginationDto.dateTo) {
      // Only dateTo provided
      if (isDateOnlyFormat(paginationDto.dateTo)) {
        // Date-only string - convert to UTC range (midnight to next midnight)
        const dateToRange = TimezoneService.dateRangeToUtc(
          paginationDto.dateTo,
          timezone,
        );
        // Use < for end (exclusive) to include all records on dateTo
        queryBuilder.andWhere(`${alias}.${dateField} < :dateTo`, {
          dateTo: dateToRange.end,
        });
      } else {
        // ISO date string or Date object - use as-is
        queryBuilder.andWhere(`${alias}.${dateField} <= :dateTo`, {
          dateTo: paginationDto.dateTo,
        });
      }
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

  /**
   * Apply timezone-aware date range filter to query builder.
   * Converts date-only strings (YYYY-MM-DD) to UTC ranges based on center timezone.
   * Uses exclusive upper bound (<) to ensure all sessions on dateTo are included.
   *
   * @param queryBuilder Query builder to apply filter to
   * @param dateField Field name for the date column (e.g., 'startTime', 'createdAt')
   * @param dateFrom Optional start date string in YYYY-MM-DD format
   * @param dateTo Optional end date string in YYYY-MM-DD format
   * @param timezone Optional timezone (defaults to context timezone or DEFAULT_TIMEZONE)
   * @param alias Optional table alias (defaults to 'entity')
   *
   * @example
   * ```typescript
   * // In any repository:
   * this.applyTimezoneDateRange(queryBuilder, 'startTime', '2024-01-01', '2024-01-31');
   * ```
   */
  protected applyTimezoneDateRange(
    queryBuilder: SelectQueryBuilder<any>,
    dateField: string,
    dateFrom?: string,
    dateTo?: string,
    timezone?: string,
    alias: string = 'entity',
  ): void {
    if (!dateFrom && !dateTo) {
      return; // No date filtering needed
    }

    const tz = timezone || TimezoneService.getTimezoneFromContext();

    if (dateFrom && dateTo) {
      // Both dates provided - use range conversion
      const { start, end } = TimezoneService.getZonedDateRange(
        dateFrom,
        dateTo,
        tz,
      );
      // Use >= for start (inclusive) and < for end (exclusive)
      queryBuilder.andWhere(`${alias}.${dateField} >= :dateFrom`, {
        dateFrom: start,
      });
      queryBuilder.andWhere(`${alias}.${dateField} < :dateTo`, {
        dateTo: end,
      });
    } else if (dateFrom) {
      // Only dateFrom provided - convert to UTC midnight in center timezone
      const start = TimezoneService.dateOnlyToUtc(dateFrom, tz);
      queryBuilder.andWhere(`${alias}.${dateField} >= :dateFrom`, {
        dateFrom: start,
      });
    } else if (dateTo) {
      // Only dateTo provided - convert to UTC range (midnight to next midnight)
      const dateToRange = TimezoneService.dateRangeToUtc(dateTo, tz);
      // Use < for end (exclusive) to include all sessions on dateTo
      queryBuilder.andWhere(`${alias}.${dateField} < :dateTo`, {
        dateTo: dateToRange.end,
      });
    }
  }
}
