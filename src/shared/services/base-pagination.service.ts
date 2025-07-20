import { PaginateQuery } from 'nestjs-paginate';
import { PaginationUtils } from '../utils/pagination.utils';

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export abstract class BasePaginationService {
  /**
   * Execute a paginated query with common filtering and sorting
   */
  protected async executePaginatedQuery<T>(
    query: PaginateQuery,
    options: {
      where?: any;
      include?: any;
      orderBy?: any;
      model: any; // Prisma model
      defaultOrderBy?: string;
      exactFields?: string[];
      enumFields?: { field: string; targetField?: string }[];
      searchFields?: { field: string; targetField: string }[];
      dateRangeField?: string;
      customConditions?: (query: PaginateQuery) => any;
    },
  ): Promise<PaginationResult<T>> {
    const { model, include, defaultOrderBy = 'createdAt' } = options;

    // Build where conditions
    const where =
      options.where ||
      PaginationUtils.buildWhereConditions(query, {
        exactFields: options.exactFields,
        enumFields: options.enumFields,
        searchFields: options.searchFields,
        dateRangeField: options.dateRangeField,
        customConditions: options.customConditions,
      });

    // Build orderBy
    const orderBy =
      options.orderBy || PaginationUtils.buildOrderBy(query, defaultOrderBy);

    // Get pagination parameters
    const { page, limit, skip } = PaginationUtils.getPaginationParams(query);

    // Execute query
    const [data, total] = await Promise.all([
      model.findMany({
        where,
        include,
        orderBy,
        skip,
        take: limit,
      }),
      model.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Execute a paginated query with transaction support
   */
  protected async executePaginatedQueryWithTransaction<T>(
    query: PaginateQuery,
    options: {
      where?: any;
      include?: any;
      orderBy?: any;
      prisma: any; // PrismaService
      model: any; // Prisma model
      defaultOrderBy?: string;
      exactFields?: string[];
      enumFields?: { field: string; targetField?: string }[];
      searchFields?: { field: string; targetField: string }[];
      dateRangeField?: string;
      customConditions?: (query: PaginateQuery) => any;
    },
  ): Promise<PaginationResult<T>> {
    const { prisma, model, include, defaultOrderBy = 'createdAt' } = options;

    // Build where conditions
    const where =
      options.where ||
      PaginationUtils.buildWhereConditions(query, {
        exactFields: options.exactFields,
        enumFields: options.enumFields,
        searchFields: options.searchFields,
        dateRangeField: options.dateRangeField,
        customConditions: options.customConditions,
      });

    // Build orderBy
    const orderBy =
      options.orderBy || PaginationUtils.buildOrderBy(query, defaultOrderBy);

    // Get pagination parameters
    const { page, limit, skip } = PaginationUtils.getPaginationParams(query);

    // Execute query with transaction
    const [data, total] = await prisma.$transaction([
      model.findMany({
        where,
        include,
        orderBy,
        skip,
        take: limit,
      }),
      model.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Build where conditions for common filters
   */
  protected buildWhereConditions(
    query: PaginateQuery,
    options: {
      exactFields?: string[];
      enumFields?: { field: string; targetField?: string }[];
      searchFields?: { field: string; targetField: string }[];
      dateRangeField?: string;
      customConditions?: (query: PaginateQuery) => any;
    } = {},
  ): any {
    return PaginationUtils.buildWhereConditions(query, options);
  }

  /**
   * Build orderBy object
   */
  protected buildOrderBy(
    query: PaginateQuery,
    defaultField: string = 'createdAt',
  ): any {
    return PaginationUtils.buildOrderBy(query, defaultField);
  }

  /**
   * Get pagination parameters
   */
  protected getPaginationParams(query: PaginateQuery): {
    page: number;
    limit: number;
    skip: number;
  } {
    return PaginationUtils.getPaginationParams(query);
  }
}
