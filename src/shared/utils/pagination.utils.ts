import { PaginateQuery } from 'nestjs-paginate';

export class PaginationUtils {
  /**
   * Safely extract a single value from a query parameter that could be string or string[]
   */
  static extractSingleValue(
    value: string | string[] | undefined,
  ): string | undefined {
    if (!value) return undefined;
    if (Array.isArray(value)) return value[0];
    return value;
  }

  /**
   * Safely extract and convert a date from query parameters
   */
  static extractDate(value: string | string[] | undefined): Date | undefined {
    const dateString = this.extractSingleValue(value);
    if (
      !dateString ||
      typeof dateString !== 'string' ||
      dateString.length === 0
    ) {
      return undefined;
    }
    return new Date(dateString);
  }

  /**
   * Build where conditions for date range filtering
   */
  static buildDateRangeFilter(
    query: PaginateQuery,
    dateFromField: string = 'dateFrom',
    dateToField: string = 'dateTo',
    targetField: string = 'createdAt',
  ): any {
    const dateFrom = this.extractDate(query.filter?.[dateFromField]);
    const dateTo = this.extractDate(query.filter?.[dateToField]);

    if (!dateFrom && !dateTo) return undefined;

    const filter: any = {};
    if (dateFrom) filter.gte = dateFrom;
    if (dateTo) filter.lte = dateTo;

    return { [targetField]: filter };
  }

  /**
   * Build where conditions for text search with case-insensitive matching
   */
  static buildTextSearchFilter(
    query: PaginateQuery,
    searchField: string,
    targetField: string,
  ): any {
    const searchValue = this.extractSingleValue(query.filter?.[searchField]);
    if (!searchValue) return undefined;

    return {
      [targetField]: {
        contains: searchValue,
        mode: 'insensitive' as const,
      },
    };
  }

  /**
   * Build where conditions for exact field matching
   */
  static buildExactFilter(
    query: PaginateQuery,
    filterField: string,
    targetField?: string,
  ): any {
    const value = this.extractSingleValue(query.filter?.[filterField]);
    if (!value) return undefined;

    return { [targetField || filterField]: value };
  }

  /**
   * Build where conditions for enum field matching
   */
  static buildEnumFilter<T>(
    query: PaginateQuery,
    filterField: string,
    targetField?: string,
  ): any {
    const value = this.extractSingleValue(query.filter?.[filterField]);
    if (!value) return undefined;

    return { [targetField || filterField]: value as T };
  }

  /**
   * Build orderBy object from query sort parameters
   */
  static buildOrderBy(
    query: PaginateQuery,
    defaultField: string = 'createdAt',
  ): any {
    if (query.sortBy?.length) {
      return { [query.sortBy[0][0]]: query.sortBy[0][1] as 'asc' | 'desc' };
    }
    return { [defaultField]: 'desc' as const };
  }

  /**
   * Get pagination parameters
   */
  static getPaginationParams(query: PaginateQuery): {
    page: number;
    limit: number;
    skip: number;
  } {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    return { page, limit, skip };
  }

  /**
   * Build complete where conditions object with common filters
   */
  static buildWhereConditions(
    query: PaginateQuery,
    options: {
      exactFields?: string[];
      enumFields?: { field: string; targetField?: string }[];
      searchFields?: { field: string; targetField: string }[];
      dateRangeField?: string;
      customConditions?: (query: PaginateQuery) => any;
    } = {},
  ): any {
    const where: any = {};

    // Handle exact field matches
    if (options.exactFields) {
      for (const field of options.exactFields) {
        const condition = this.buildExactFilter(query, field);
        if (condition) {
          Object.assign(where, condition);
        }
      }
    }

    // Handle enum field matches
    if (options.enumFields) {
      for (const { field, targetField } of options.enumFields) {
        const condition = this.buildEnumFilter(query, field, targetField);
        if (condition) {
          Object.assign(where, condition);
        }
      }
    }

    // Handle text search fields
    if (options.searchFields) {
      for (const { field, targetField } of options.searchFields) {
        const condition = this.buildTextSearchFilter(query, field, targetField);
        if (condition) {
          Object.assign(where, condition);
        }
      }
    }

    // Handle date range filtering
    if (options.dateRangeField) {
      const dateCondition = this.buildDateRangeFilter(
        query,
        'dateFrom',
        'dateTo',
        options.dateRangeField,
      );
      if (dateCondition) {
        Object.assign(where, dateCondition);
      }
    }

    // Handle custom conditions
    if (options.customConditions) {
      const customWhere = options.customConditions(query);
      if (customWhere) {
        Object.assign(where, customWhere);
      }
    }

    return Object.keys(where).length > 0 ? where : undefined;
  }
}
