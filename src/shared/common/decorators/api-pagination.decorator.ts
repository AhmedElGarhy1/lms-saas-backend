import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

export function ApiPagination() {
  return applyDecorators(
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      description: 'Page number (1-based)',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Number of items per page',
    }),
    ApiQuery({
      name: 'search',
      required: false,
      type: String,
      description: 'Search term',
    }),
  );
}

export function ApiUserFilters() {
  return applyDecorators(
    ApiQuery({
      name: 'filter[isActive]',
      required: false,
      type: Boolean,
      description: 'Filter by user status',
    }),
    ApiQuery({
      name: 'filter[roleId]',
      required: false,
      type: String,
      description: 'Filter by specific role ID',
    }),
    ApiQuery({
      name: 'filter[centerId]',
      required: false,
      type: String,
      description: 'Filter by center ID',
    }),
    ApiQuery({
      name: 'filter[createdAt]',
      required: false,
      type: String,
      description: 'Filter by creation date',
    }),
  );
}

// Generic filter decorator for any module
export function ApiFilters(
  filters: Array<{
    name: string;
    type: any;
    description: string;
  }>,
) {
  return applyDecorators(
    ...filters.map((filter) =>
      ApiQuery({
        name: `filter[${filter.name}]`,
        required: false,
        type: filter.type,
        description: filter.description,
      }),
    ),
  );
}

// Predefined filter sets for common modules
export const CommonFilters = {
  // User filters
  user: () =>
    ApiFilters([
      { name: 'isActive', type: Boolean, description: 'Filter by user status' },
      {
        name: 'roleId',
        type: String,
        description: 'Filter by specific role ID',
      },
      { name: 'centerId', type: String, description: 'Filter by center ID' },
      {
        name: 'createdAt',
        type: String,
        description: 'Filter by creation date',
      },
    ]),

  // Center filters
  center: () =>
    ApiFilters([
      {
        name: 'isActive',
        type: Boolean,
        description: 'Filter by center status',
      },
      {
        name: 'createdAt',
        type: String,
        description: 'Filter by creation date',
      },
    ]),

  // Role filters
  role: () =>
    ApiFilters([
      { name: 'isActive', type: Boolean, description: 'Filter by role status' },
      { name: 'type', type: String, description: 'Filter by role type' },
      {
        name: 'createdAt',
        type: String,
        description: 'Filter by creation date',
      },
    ]),
};
