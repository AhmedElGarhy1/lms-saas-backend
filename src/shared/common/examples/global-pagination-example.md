# Global Date Filtering for Pagination

This document shows how to use the ultra-simple global date filtering across all repositories.

## ✅ **What's Available Globally:**

### 1. **BasePaginationDto** (already includes dateFrom/dateTo)

```typescript
export class BasePaginationDto {
  page?: number = 1;
  limit?: number = 10;
  search?: string;
  sortBy?: [string, 'ASC' | 'DESC'][];
  dateFrom?: string; // ✅ Global date filtering
  dateTo?: string; // ✅ Global date filtering
}
```

### 2. **BaseRepository.paginate()** (ultimate simplicity)

```typescript
// Just pass query, columns, route, and queryBuilder - date filtering is automatic!
await this.paginate(
  query,
  {
    searchableColumns: ['name', 'description'],
    sortableColumns: ['name', 'createdAt', 'updatedAt'],
    defaultSortBy: ['createdAt', 'DESC'],
  },
  '/centers',
  queryBuilder,
);
```

## 🚀 **How to Use in Any Repository:**

### **Step 1: Extend BasePaginationDto**

```typescript
// centers/dto/paginate-centers.dto.ts
export class PaginateCentersDto extends BasePaginationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // ✅ dateFrom and dateTo are automatically available!
}
```

### **Step 2: Use in Repository**

```typescript
// centers/repositories/centers.repository.ts
async paginateCenters(query: PaginateCentersDto): Promise<Pagination<Center>> {
  const queryBuilder = this.centerRepository
    .createQueryBuilder('center');

  // Apply specific filters
  if (query.name) {
    queryBuilder.andWhere('center.name ILIKE :name', { name: `%${query.name}%` });
  }

  if (query.isActive !== undefined) {
    queryBuilder.andWhere('center.isActive = :isActive', { isActive: query.isActive });
  }

  // ✅ Ultra-simple: just pass query, columns, route, and queryBuilder
  return this.paginateWithQuery(
    query,
    {
      searchableColumns: ['name', 'description'],
      sortableColumns: ['name', 'createdAt', 'updatedAt'],
      defaultSortBy: ['createdAt', 'DESC'],
    },
    '/centers',
    queryBuilder,
  );
}
```

### **Step 3: Use in Controller**

```typescript
// centers/controllers/centers.controller.ts
@Get()
async listCenters(@Query() query: PaginateCentersDto) {
  return this.centersService.paginateCenters(query);
}
```

## 🎯 **Benefits:**

1. **✅ Ultra-Simple**: Just 4 parameters - query, columns, route, queryBuilder
2. **✅ Automatic**: Date filtering happens without any extra code
3. **✅ Consistent**: All repositories use the same simple pattern
4. **✅ Type-safe**: Full TypeScript support
5. **✅ Validated**: Automatic validation with class-validator
6. **✅ Documented**: Automatic Swagger documentation

## 📝 **API Usage Examples:**

```bash
# Filter users by date range
GET /users?dateFrom=2024-01-01&dateTo=2024-12-31

# Filter centers by date range
GET /centers?dateFrom=2024-01-01&dateTo=2024-12-31

# Combine with other filters
GET /users?roleId=123&isActive=true&dateFrom=2024-01-01&dateTo=2024-12-31

# Sorting examples (simple string format):
GET /users?sortBy=email:ASC
GET /users?sortBy=createdAt:DESC
GET /users?sortBy=name:asc
GET /users?sortBy=updatedAt:desc
```

## 🔧 **Real Example from User Repository:**

```typescript
// This is all you need in any repository:
const result = await this.paginateWithQuery(
  query, // Your pagination DTO
  USER_PAGINATION_COLUMNS, // Column configuration
  '/users', // Route
  queryBuilder, // Your query builder
);
```

## 🚀 **That's It!**

No imports, no utilities, no complex configuration. Just 4 simple parameters and date filtering works automatically across your entire application!

This is the cleanest, simplest pagination solution possible! 🎉
