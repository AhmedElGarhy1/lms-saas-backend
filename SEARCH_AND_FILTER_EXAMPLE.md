# Search and Filter Functionality

This document explains the search and filter functionality implemented using the nestjs-typeorm-paginate library.

## Overview

The pagination system uses **nestjs-typeorm-paginate** library which provides built-in support for:

1. **Searchable Fields**: Use `LIKE %word%` (case-insensitive contains) - Global search across all searchable fields
2. **Filterable Fields**: Use `= word` (exact match)

## How it Works

The system uses **nestjs-typeorm-paginate**'s built-in search and filter functionality:

- **Global Search**: The `search` parameter searches across all searchable fields using `LIKE %word%`
- **Exact Filters**: The `filter` parameter applies exact matches using `= word`
- **Combined Usage**: Both search and filter can be used together for precise queries

## Configuration

### Pagination Columns Configuration

```typescript
// Example from USER_PAGINATION_COLUMNS
export const USER_PAGINATION_COLUMNS = {
  searchableColumns: ['user.name', 'user.email'], // LIKE %word%
  filterableColumns: ['user.isActive', 'user.id'], // = word
  sortableColumns: [
    'user.name',
    'user.email',
    'user.isActive',
    'user.createdAt',
    'user.updatedAt',
  ],
  defaultSortBy: ['user.createdAt', 'DESC'] as [string, 'ASC' | 'DESC'],
};
```

### Controller Usage

```typescript
@Get()
@PaginationDocs({
  searchFields: USER_PAGINATION_COLUMNS.searchableColumns,
  filterFields: USER_PAGINATION_COLUMNS.filterableColumns,
  enumFields: ['user.isActive'],
  dateRangeFields: ['createdAt'],
  customFilters: [],
})
async listUsers(@Paginate() query: PaginateQuery) {
  // Implementation
}
```

## API Usage Examples

### Global Search (across all searchable fields)

```
GET /users?search=john
```

This will search for "john" in all searchable fields (user.name, user.email) using `LIKE %john%`.

### Exact Filtering

```
GET /users?filter[isActive]=true&filter[id]=123
```

This will filter for:

- `user.isActive = true`
- `user.id = '123'`

### Combined Search and Filter

```
GET /users?search=john&filter[isActive]=true
```

This will:

- Search for "john" in all searchable fields (`LIKE %john%`)
- Filter for active users only (`isActive = true`)

## Implementation Details

### Base Repository

The `BaseRepository.paginate()` method uses nestjs-typeorm-paginate's built-in functionality:

```typescript
// Let nestjs-typeorm-paginate handle search and filtering
return await paginate(query, queryBuilder, {
  sortableColumns: sortableColumns as any,
  searchableColumns: searchableColumns as any,
  filterableColumns: filterableColumns.reduce(
    (acc, col) => {
      acc[col] = true;
      return acc;
    },
    {} as Record<string, boolean>,
  ) as any,
  defaultSortBy: [[String(defaultSortBy[0]), defaultSortBy[1]]] as any,
  defaultLimit,
  maxLimit,
});
```

### How nestjs-typeorm-paginate Works

1. **Search**: When `query.search` is provided, nestjs-typeorm-paginate automatically searches across all `searchableColumns` using `ILIKE %search%`
2. **Filter**: When `query.filter` is provided, nestjs-typeorm-paginate applies exact matches for all `filterableColumns`
3. **Combined**: Both search and filter work together seamlessly
4. **Pagination**: All pagination, sorting, and limiting is handled automatically

## Benefits

1. **Built-in Support**: Uses nestjs-typeorm-paginate's proven and tested search/filter functionality
2. **Performance**: Optimized SQL generation by the library
3. **Consistent**: Standardized across all modules
4. **Maintained**: Library is actively maintained and updated
5. **Documented**: Clear API documentation with examples

## Notes

- **Global Search**: The `search` parameter searches across all searchable fields using `LIKE %word%`
- **Exact Filters**: The `filter` parameter applies exact matches using `= word`
- **Combined Usage**: Both search and filter can be used together for precise queries
- **Entity Aliases**: Field names in pagination columns should include the correct table alias (e.g., `user.name`, `user.email`)
