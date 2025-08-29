# New Pagination System with nestjs-typeorm-paginate

This document explains the new pagination system implemented using `nestjs-typeorm-paginate` instead of `nestjs-paginate`.

## Overview

The new pagination system uses **nestjs-typeorm-paginate** library which provides:

1. **TypeORM Integration**: Native TypeORM query builder support
2. **Flexible Query Parameters**: Support for page, limit, search, filter, and sortBy
3. **Base Entity Integration**: Common fields for all entities
4. **Custom Decorators**: Enhanced query parameter extraction

## Migration from nestjs-paginate

### Key Changes

1. **Package Change**: `nestjs-paginate` → `nestjs-typeorm-paginate`
2. **Import Changes**:
   - `PaginateQuery` → `PaginationQuery` (custom interface)
   - `Paginated` → `Pagination` (from new library)
   - `paginate` function signature changed
3. **Decorator**: Custom `@Paginate()` decorator for query extraction
4. **Base Entity**: New `BaseEntity` class with common fields

### Updated Imports

```typescript
// Old imports
import { PaginateQuery, Paginated, paginate } from 'nestjs-paginate';

// New imports
import { Pagination, paginate } from 'nestjs-typeorm-paginate';
import { PaginationQuery } from '@/shared/common/utils/pagination.utils';
import { Paginate } from '@/shared/common/decorators/pagination.decorator';
```

## Base Entity Integration

### BaseEntity Class

```typescript
// src/shared/common/entities/base.entity.ts
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string;

  @Column({ type: 'uuid', nullable: true })
  deletedBy: string;
}
```

### Using BaseEntity

```typescript
// Example entity extending BaseEntity
@Entity('users')
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  // ... other fields
}
```

## Pagination Query Interface

### PaginationQuery Structure

```typescript
export interface PaginationQuery {
  page?: number; // Page number (default: 1)
  limit?: number; // Items per page (default: 10)
  search?: string; // Global search term
  filter?: Record<string, any>; // Exact field filters
  sortBy?: [string, 'ASC' | 'DESC'][]; // Sort parameters
}
```

### Query Parameter Examples

```
GET /users?page=1&limit=20&search=john&filter[isActive]=true&sortBy=name:ASC
```

## Controller Implementation

### Basic Controller Setup

```typescript
import { Paginate } from '@/shared/common/decorators/pagination.decorator';
import { PaginationQuery } from '@/shared/common/utils/pagination.utils';

@Controller('users')
export class UserController {
  @Get()
  async listUsers(@Paginate() query: PaginationQuery) {
    return this.userService.listUsers(query);
  }
}
```

### Advanced Controller with Documentation

```typescript
@Get()
@PaginationDocs({
  searchFields: ['name', 'email'],
  filterFields: ['isActive', 'role.type'],
  enumFields: ['isActive', 'role.type'],
  dateRangeFields: ['createdAt'],
  customFilters: [],
})
async listUsers(
  @Paginate() query: PaginationQuery,
  @GetUser() currentUser: CurrentUserType,
) {
  return this.userService.listUsers({ query, userId: currentUser.id });
}
```

## Service Implementation

### Using Base Repository

```typescript
@Injectable()
export class UserService {
  async listUsers(options: { query: PaginationQuery; userId: string }) {
    return this.userRepository.paginate({
      page: options.query.page,
      limit: options.query.limit,
      search: options.query.search,
      filter: options.query.filter,
      sortBy: options.query.sortBy,
      relations: ['profile', 'userRoles', 'userRoles.role'],
      searchableColumns: ['name', 'email'],
      sortableColumns: ['createdAt', 'updatedAt', 'name', 'email'],
      defaultSortBy: ['createdAt', 'DESC'],
    });
  }
}
```

### Custom Query Builder

```typescript
async paginateWithCustomQuery(options: PaginationQuery): Promise<Pagination<User>> {
  const queryBuilder = this.repository.createQueryBuilder('user');

  // Apply custom joins
  queryBuilder.leftJoinAndSelect('user.profile', 'profile');

  // Apply search
  if (options.search) {
    queryBuilder.andWhere('user.name ILIKE :search OR user.email ILIKE :search', {
      search: `%${options.search}%`,
    });
  }

  // Apply filters
  if (options.filter) {
    Object.entries(options.filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryBuilder.andWhere(`user.${key} = :${key}`, { [key]: value });
      }
    });
  }

  // Apply sorting
  if (options.sortBy && options.sortBy.length > 0) {
    options.sortBy.forEach(([column, direction]) => {
      queryBuilder.addOrderBy(`user.${column}`, direction);
    });
  } else {
    queryBuilder.addOrderBy('user.createdAt', 'DESC');
  }

  return await paginate(queryBuilder, {
    page: options.page || 1,
    limit: options.limit || 10,
    route: '/api/users',
  });
}
```

## Repository Implementation

### Extending Base Repository

```typescript
@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    protected readonly logger: LoggerService,
  ) {
    super(userRepository, logger);
  }

  // Custom pagination method
  async paginateUsers(
    options: PaginateOptions<User>,
  ): Promise<Pagination<User>> {
    return this.paginate({
      ...options,
      relations: ['profile', 'userRoles', 'userRoles.role'],
      searchableColumns: ['name', 'email'],
      sortableColumns: ['createdAt', 'updatedAt', 'name', 'email'],
      defaultSortBy: ['createdAt', 'DESC'],
    });
  }
}
```

## Pagination Utils

### Available Utility Methods

```typescript
import { PaginationUtils } from '@/shared/common/utils/pagination.utils';

// Extract single value from query parameter
const value = PaginationUtils.extractSingleValue(query.filter?.field);

// Extract date from query parameter
const date = PaginationUtils.extractDate(query.filter?.dateField);

// Build date range filter
const dateFilter = PaginationUtils.buildDateRangeFilter(
  query,
  'dateFrom',
  'dateTo',
  'createdAt',
);

// Build text search filter
const searchFilter = PaginationUtils.buildTextSearchFilter(
  query,
  'searchField',
  'targetField',
);

// Build exact filter
const exactFilter = PaginationUtils.buildExactFilter(
  query,
  'filterField',
  'targetField',
);

// Build enum filter
const enumFilter = PaginationUtils.buildEnumFilter(
  query,
  'enumField',
  'targetField',
);

// Get pagination parameters
const { page, limit, skip } = PaginationUtils.getPaginationParams(query);

// Build complete where conditions
const whereConditions = PaginationUtils.buildWhereConditions(query, {
  exactFields: ['isActive'],
  enumFields: [{ field: 'role.type', targetField: 'roleType' }],
  searchFields: [{ field: 'search', targetField: 'name' }],
  dateRangeField: 'createdAt',
  customConditions: (query) => ({
    /* custom logic */
  }),
});
```

## API Response Format

### Pagination Response Structure

```typescript
interface Pagination<T> {
  items: T[]; // Array of items
  meta: {
    itemCount: number; // Number of items in current page
    totalItems: number; // Total number of items
    itemsPerPage: number; // Items per page
    totalPages: number; // Total number of pages
    currentPage: number; // Current page number
  };
  links: {
    first?: string; // Link to first page
    previous?: string; // Link to previous page
    next?: string; // Link to next page
    last?: string; // Link to last page
  };
}
```

### Example Response

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "itemCount": 1,
    "totalItems": 100,
    "itemsPerPage": 10,
    "totalPages": 10,
    "currentPage": 1
  },
  "links": {
    "first": "/api/users?page=1&limit=10",
    "next": "/api/users?page=2&limit=10",
    "last": "/api/users?page=10&limit=10"
  }
}
```

## Migration Checklist

### Files to Update

1. **Package.json**: Remove `nestjs-paginate`, add `nestjs-typeorm-paginate`
2. **Base Repository**: Update imports and paginate method
3. **Pagination Utils**: Update interface and method signatures
4. **Controllers**: Update imports and method signatures
5. **Services**: Update imports and pagination logic
6. **Repositories**: Update imports and return types
7. **Entities**: Extend BaseEntity where appropriate

### Import Updates Required

```typescript
// Update these imports in all files:
// OLD:
import { PaginateQuery, Paginated, paginate } from 'nestjs-paginate';

// NEW:
import { Pagination, paginate } from 'nestjs-typeorm-paginate';
import { PaginationQuery } from '@/shared/common/utils/pagination.utils';
import { Paginate } from '@/shared/common/decorators/pagination.decorator';
```

### Method Signature Updates

```typescript
// OLD:
async paginate(query: PaginateQuery): Promise<Paginated<T>>

// NEW:
async paginate(options: Partial<PaginateOptions<T>>): Promise<Pagination<T>>
```

## Best Practices

1. **Use BaseEntity**: Extend BaseEntity for all entities to get common fields
2. **Custom Decorators**: Use the custom `@Paginate()` decorator for query extraction
3. **Type Safety**: Use proper TypeScript types for all pagination parameters
4. **Error Handling**: Implement proper error handling for pagination queries
5. **Performance**: Use appropriate indexes for searchable and sortable columns
6. **Documentation**: Use `@PaginationDocs()` decorator for API documentation

## Testing

### Unit Tests

```typescript
describe('UserService', () => {
  it('should paginate users correctly', async () => {
    const query: PaginationQuery = {
      page: 1,
      limit: 10,
      search: 'john',
      filter: { isActive: true },
      sortBy: [['name', 'ASC']],
    };

    const result = await userService.listUsers({ query, userId: 'user-id' });

    expect(result.items).toBeDefined();
    expect(result.meta).toBeDefined();
    expect(result.links).toBeDefined();
  });
});
```

### Integration Tests

```typescript
describe('UserController (e2e)', () => {
  it('should return paginated users', () => {
    return request(app.getHttpServer())
      .get('/users?page=1&limit=10&search=john')
      .expect(200)
      .expect((res) => {
        expect(res.body.items).toBeDefined();
        expect(res.body.meta).toBeDefined();
        expect(res.body.links).toBeDefined();
      });
  });
});
```

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure all imports are updated to use the new library
2. **Type Errors**: Check that all method signatures use the correct types
3. **Query Builder Issues**: Verify that query builder methods are compatible
4. **Performance Issues**: Add appropriate database indexes for searchable columns

### Debug Tips

1. **Check Console Logs**: Look for import or type errors
2. **Verify Package Installation**: Ensure `nestjs-typeorm-paginate` is installed
3. **Test Individual Methods**: Test pagination methods in isolation
4. **Check Database Queries**: Monitor generated SQL queries for performance issues
