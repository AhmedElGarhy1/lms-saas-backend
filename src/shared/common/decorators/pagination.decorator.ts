import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import {
  PaginationQuery,
  PaginationUtils,
  PaginationValidationOptions,
  PaginationValidationError,
} from '../utils/pagination.utils';

export const Paginate = createParamDecorator(
  (
    validationOptions: PaginationValidationOptions = {},
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

    // Extract date range parameters (sent as separate params by frontend)
    if (query.dateFrom) {
      filter.dateFrom = query.dateFrom;
    }
    if (query.dateTo) {
      filter.dateTo = query.dateTo;
    }

    // Extract sortBy - handle both formats:
    // 1. sortBy[0][0] and sortBy[0][1] (frontend format)
    // 2. sortBy as string or array (legacy format)
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
      const [field, order] = (query.sortBy as string).split(':');
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
      // Validate and sanitize the query
      return PaginationUtils.createPaginationOptions(
        paginationQuery,
        validationOptions,
      );
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
