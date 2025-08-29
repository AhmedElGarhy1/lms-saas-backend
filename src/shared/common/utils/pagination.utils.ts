// Pagination utilities for nestjs-typeorm-paginate
export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  filter?: Record<string, any>;
  sortBy?: [string, 'ASC' | 'DESC'][];
}

export interface PaginationValidationOptions {
  maxPage?: number;
  maxLimit?: number;
  minLimit?: number;
  allowedSortFields?: string[];
  allowedFilterFields?: string[];
  allowedSearchFields?: string[];
}

export class PaginationValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message);
    this.name = 'PaginationValidationError';
  }
}

export class PaginationUtils {
  /**
   * Validate pagination query parameters
   */
  static validatePaginationQuery(
    query: PaginationQuery,
    options: PaginationValidationOptions = {},
  ): void {
    const {
      maxPage = 1000,
      maxLimit = 100,
      minLimit = 1,
      allowedSortFields = [],
      allowedFilterFields = [],
      allowedSearchFields = [],
    } = options;

    // Validate page
    if (query.page !== undefined) {
      if (!Number.isInteger(query.page) || query.page < 1) {
        throw new PaginationValidationError(
          'Page must be a positive integer',
          'page',
        );
      }
      if (query.page > maxPage) {
        throw new PaginationValidationError(
          `Page cannot exceed ${maxPage}`,
          'page',
        );
      }
    }

    // Validate limit
    if (query.limit !== undefined) {
      if (!Number.isInteger(query.limit) || query.limit < minLimit) {
        throw new PaginationValidationError(
          `Limit must be a positive integer >= ${minLimit}`,
          'limit',
        );
      }
      if (query.limit > maxLimit) {
        throw new PaginationValidationError(
          `Limit cannot exceed ${maxLimit}`,
          'limit',
        );
      }
    }

    // Validate search
    if (query.search !== undefined && query.search !== null) {
      if (typeof query.search !== 'string') {
        throw new PaginationValidationError(
          'Search must be a string',
          'search',
        );
      }
      if (query.search.length > 255) {
        throw new PaginationValidationError(
          'Search query too long (max 255 characters)',
          'search',
        );
      }
      if (allowedSearchFields.length > 0) {
        // Note: This is a basic validation. In practice, you might want to
        // validate that the search is being applied to allowed fields
        // This would require more complex logic in the repository layer
      }
    }

    // Validate filter
    if (query.filter && typeof query.filter === 'object') {
      Object.entries(query.filter).forEach(([key, value]) => {
        if (
          allowedFilterFields.length > 0 &&
          !allowedFilterFields.includes(key)
        ) {
          throw new PaginationValidationError(
            `Filter field '${key}' is not allowed`,
            `filter.${key}`,
          );
        }

        // Validate filter value structure
        if (value !== null && value !== undefined) {
          if (typeof value === 'object' && !Array.isArray(value)) {
            // Check for valid operators
            const validOperators = [
              '$ne',
              '$like',
              '$in',
              '$gt',
              '$gte',
              '$lt',
              '$lte',
            ];
            const operators = Object.keys(value);
            const invalidOperators = operators.filter(
              (op) => !validOperators.includes(op),
            );

            if (invalidOperators.length > 0) {
              throw new PaginationValidationError(
                `Invalid filter operators: ${invalidOperators.join(', ')}. Valid operators: ${validOperators.join(', ')}`,
                `filter.${key}`,
              );
            }

            // Validate $in operator
            if ('$in' in value && !Array.isArray(value.$in)) {
              throw new PaginationValidationError(
                '$in operator requires an array value',
                `filter.${key}.$in`,
              );
            }

            // Validate $like operator
            if ('$like' in value && typeof value.$like !== 'string') {
              throw new PaginationValidationError(
                '$like operator requires a string value',
                `filter.${key}.$like`,
              );
            }
          }
        }
      });
    }

    // Validate sortBy
    if (query.sortBy && Array.isArray(query.sortBy)) {
      query.sortBy.forEach((sortItem, index) => {
        if (!Array.isArray(sortItem) || sortItem.length !== 2) {
          throw new PaginationValidationError(
            'SortBy items must be arrays with exactly 2 elements [field, direction]',
            `sortBy[${index}]`,
          );
        }

        const [field, direction] = sortItem;

        if (typeof field !== 'string' || field.length === 0) {
          throw new PaginationValidationError(
            'Sort field must be a non-empty string',
            `sortBy[${index}][0]`,
          );
        }

        if (direction !== 'ASC' && direction !== 'DESC') {
          throw new PaginationValidationError(
            'Sort direction must be either "ASC" or "DESC"',
            `sortBy[${index}][1]`,
          );
        }

        if (
          allowedSortFields.length > 0 &&
          !allowedSortFields.includes(field)
        ) {
          throw new PaginationValidationError(
            `Sort field '${field}' is not allowed`,
            `sortBy[${index}][0]`,
          );
        }
      });
    }
  }

  /**
   * Sanitize pagination query parameters
   */
  static sanitizePaginationQuery(
    query: PaginationQuery,
    options: PaginationValidationOptions = {},
  ): PaginationQuery {
    const { maxPage = 1000, maxLimit = 100, minLimit = 1 } = options;

    const sanitized: PaginationQuery = {};

    // Sanitize page
    if (query.page !== undefined) {
      const page = Math.max(
        1,
        Math.min(maxPage, Math.floor(Number(query.page)) || 1),
      );
      sanitized.page = page;
    }

    // Sanitize limit
    if (query.limit !== undefined) {
      const limit = Math.max(
        minLimit,
        Math.min(maxLimit, Math.floor(Number(query.limit)) || minLimit),
      );
      sanitized.limit = limit;
    }

    // Sanitize search
    if (query.search !== undefined && query.search !== null) {
      const search = String(query.search).trim();
      if (search.length > 0 && search.length <= 255) {
        sanitized.search = search;
      }
    }

    // Sanitize filter
    if (query.filter && typeof query.filter === 'object') {
      const sanitizedFilter: Record<string, any> = {};
      Object.entries(query.filter).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          sanitizedFilter[key] = value;
        }
      });
      if (Object.keys(sanitizedFilter).length > 0) {
        sanitized.filter = sanitizedFilter;
      }
    }

    // Sanitize sortBy
    if (query.sortBy && Array.isArray(query.sortBy)) {
      const sanitizedSortBy: [string, 'ASC' | 'DESC'][] = [];
      query.sortBy.forEach((sortItem) => {
        if (Array.isArray(sortItem) && sortItem.length === 2) {
          const [field, direction] = sortItem;
          if (
            typeof field === 'string' &&
            field.length > 0 &&
            (direction === 'ASC' || direction === 'DESC')
          ) {
            sanitizedSortBy.push([field, direction]);
          }
        }
      });
      if (sanitizedSortBy.length > 0) {
        sanitized.sortBy = sanitizedSortBy;
      }
    }

    return sanitized;
  }

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
    query: PaginationQuery,
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
    query: PaginationQuery,
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
    query: PaginationQuery,
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
    query: PaginationQuery,
    filterField: string,
    targetField?: string,
  ): any {
    const value = this.extractSingleValue(query.filter?.[filterField]);
    if (!value) return undefined;

    return { [targetField || filterField]: value };
  }

  /**
   * Build where conditions for boolean field matching
   */
  static buildBooleanFilter(
    query: PaginationQuery,
    filterField: string,
    targetField?: string,
  ): any {
    const value = this.extractSingleValue(query.filter?.[filterField]);
    if (!value) return undefined;

    const boolValue = value.toLowerCase() === 'true';
    return { [targetField || filterField]: boolValue };
  }

  /**
   * Build where conditions for array field matching
   */
  static buildArrayFilter(
    query: PaginationQuery,
    filterField: string,
    targetField?: string,
  ): any {
    const value = query.filter?.[filterField];
    if (!value) return undefined;

    if (Array.isArray(value)) {
      return { [targetField || filterField]: { in: value } };
    }

    // If it's a string, try to parse it as JSON array
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return { [targetField || filterField]: { in: parsed } };
        }
      } catch {
        // If parsing fails, treat as single value
        return { [targetField || filterField]: value };
      }
    }

    return { [targetField || filterField]: value };
  }

  /**
   * Build orderBy object from query sort parameters
   */
  static buildOrderBy(
    query: PaginationQuery,
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
  static getPaginationParams(query: PaginationQuery): {
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
    query: PaginationQuery,
    options: {
      exactFields?: string[];
      enumFields?: { field: string; targetField?: string }[];
      searchFields?: { field: string; targetField: string }[];
      dateRangeField?: string;
      customConditions?: (query: PaginationQuery) => any;
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

  /**
   * Create pagination options with validation
   */
  static createPaginationOptions(
    query: PaginationQuery,
    options: PaginationValidationOptions = {},
  ): PaginationQuery {
    // First sanitize the query
    const sanitized = this.sanitizePaginationQuery(query, options);

    // Then validate the sanitized query
    this.validatePaginationQuery(sanitized, options);

    return sanitized;
  }
}
