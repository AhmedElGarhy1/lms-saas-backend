import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

export interface PaginationDocsOptions {
  searchFields?: string[];
  exactFields?: string[];
  enumFields?: string[];
  dateRangeFields?: string[];
  customFilters?: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
}

export function PaginationDocs(options: PaginationDocsOptions = {}) {
  const decorators = [
    // Basic pagination
    ApiQuery({
      name: 'page',
      required: false,
      description: 'Page number (starts from 1)',
      example: 1,
      type: Number,
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      description: 'Number of items per page (max 100)',
      example: 10,
      type: Number,
    }),
    // Sorting
    ApiQuery({
      name: 'sortBy[0][0]',
      required: false,
      description: 'Field to sort by',
      example: 'createdAt',
      type: String,
    }),
    ApiQuery({
      name: 'sortBy[0][1]',
      required: false,
      description: 'Sort direction (asc or desc)',
      example: 'desc',
      enum: ['asc', 'desc'],
    }),
  ];

  // Add search field documentation
  if (options.searchFields) {
    options.searchFields.forEach((field) => {
      decorators.push(
        ApiQuery({
          name: `filter[${field}]`,
          required: false,
          description: `Search by ${field} (case-insensitive contains)`,
          example: `john`,
          type: String,
        }),
      );
    });
  }

  // Add exact field documentation
  if (options.exactFields) {
    options.exactFields.forEach((field) => {
      decorators.push(
        ApiQuery({
          name: `filter[${field}]`,
          required: false,
          description: `Filter by exact ${field} match`,
          example: `exact-value`,
          type: String,
        }),
      );
    });
  }

  // Add enum field documentation
  if (options.enumFields) {
    options.enumFields.forEach((field) => {
      decorators.push(
        ApiQuery({
          name: `filter[${field}]`,
          required: false,
          description: `Filter by ${field} enum value`,
          example: `ACTIVE`,
          type: String,
        }),
      );
    });
  }

  // Add date range documentation
  if (options.dateRangeFields) {
    options.dateRangeFields.forEach((field) => {
      decorators.push(
        ApiQuery({
          name: `filter[dateFrom]`,
          required: false,
          description: `Filter ${field} from date (YYYY-MM-DD)`,
          example: `2024-01-01`,
          type: String,
        }),
        ApiQuery({
          name: `filter[dateTo]`,
          required: false,
          description: `Filter ${field} to date (YYYY-MM-DD)`,
          example: `2024-12-31`,
          type: String,
        }),
      );
    });
  }

  // Add custom filters documentation
  if (options.customFilters) {
    options.customFilters.forEach((filter) => {
      decorators.push(
        ApiQuery({
          name: `filter[${filter.name}]`,
          required: filter.required || false,
          description: filter.description,
          type: String,
        }),
      );
    });
  }

  return applyDecorators(...decorators);
}
