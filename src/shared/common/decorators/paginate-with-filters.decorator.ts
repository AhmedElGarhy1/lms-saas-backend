import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
  Type,
} from '@nestjs/common';
import { Request } from 'express';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import {
  PaginationQuery,
  PaginationUtils,
  PaginationValidationOptions,
  PaginationValidationError,
} from '../utils/pagination.utils';

export interface PaginateWithFiltersOptions
  extends PaginationValidationOptions {
  filterDto?: Type<any>;
}

export const PaginateWithFilters = createParamDecorator(
  (
    options: PaginateWithFiltersOptions = {},
    ctx: ExecutionContext,
  ): PaginationQuery => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const query = request.query;

    // Extract pagination parameters
    const page = query.page ? parseInt(query.page as string, 10) : 1;
    const limit = query.limit ? parseInt(query.limit as string, 10) : 10;
    const search = query.search as string;

    // Extract filters
    const filter: Record<string, any> = {};
    Object.keys(query).forEach((key) => {
      if (key.startsWith('filter.') || key.startsWith('filter[')) {
        // Handle filter.field format
        if (key.startsWith('filter.')) {
          const filterKey = key.replace('filter.', '');
          filter[filterKey] = query[key];
        }
        // Handle filter[field] format
        else if (key.startsWith('filter[') && key.endsWith(']')) {
          const filterKey = key.slice(7, -1); // Remove 'filter[' and ']'
          filter[filterKey] = query[key];
        }
      }
    });

    // Extract date range parameters
    if (query.dateFrom) {
      filter.dateFrom = query.dateFrom;
    }
    if (query.dateTo) {
      filter.dateTo = query.dateTo;
    }

    // Validate and transform filters using DTO if provided
    if (options.filterDto && Object.keys(filter).length > 0) {
      const filterInstance = plainToClass(options.filterDto, filter);
      // Note: In a real implementation, you'd want to validate here
      // const errors = await validate(filterInstance);
      // if (errors.length > 0) {
      //   throw new BadRequestException('Invalid filter parameters');
      // }

      // Use the DTO's toDatabaseFilters method if available
      if (typeof filterInstance.toDatabaseFilters === 'function') {
        Object.assign(filter, filterInstance.toDatabaseFilters());
      }
    }

    // Extract sortBy
    const sortBy: [string, 'ASC' | 'DESC'][] = [];

    // Handle sortBy[0][0] and sortBy[0][1] format
    if (query['sortBy[0][0]'] && query['sortBy[0][1]']) {
      const field = query['sortBy[0][0]'] as string;
      const order = (query['sortBy[0][1]'] as string).toUpperCase();
      if (field && (order === 'ASC' || order === 'DESC')) {
        sortBy.push([field, order]);
      }
    }
    // Handle legacy sortBy format
    else if (query.sortBy && typeof query.sortBy === 'string') {
      const [field, order] = query.sortBy.split(':');
      if (field && (order === 'ASC' || order === 'DESC')) {
        sortBy.push([field, order]);
      }
    } else if (Array.isArray(query.sortBy)) {
      (query.sortBy as string[]).forEach((sortItem) => {
        const [field, order] = sortItem.split(':');
        if (field && (order === 'ASC' || order === 'DESC')) {
          sortBy.push([field, order]);
        }
      });
    }

    const paginationQuery: PaginationQuery = {
      page,
      limit,
      search,
      filter,
      sortBy,
    };

    try {
      return PaginationUtils.createPaginationOptions(paginationQuery, options);
    } catch (error) {
      if (error instanceof PaginationValidationError) {
        throw new BadRequestException({
          message: error.message,
          field: error.field,
          error: 'VALIDATION_ERROR',
        });
      }
      throw error;
    }
  },
);
