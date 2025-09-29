# Pagination, Sorting & Filtering Guide

## 📋 **Overview**

This guide documents the enhanced pagination, sorting, and filtering capabilities implemented using `nestjs-typeorm-paginate` with custom validation and flexible query building.

## 🎯 **Key Features**

- ✅ **Flexible Pagination**: Configurable page size, limits, and navigation
- ✅ **Advanced Sorting**: Multi-column sorting with direction control
- ✅ **Complex Filtering**: Support for operators like `$ne`, `$like`, `$in`, `$gt`, etc.
- ✅ **Search Functionality**: Multi-column text search with ILIKE
- ✅ **Validation**: Built-in validation with customizable rules
- ✅ **Type Safety**: Full TypeScript support with proper typing

---

## 📄 **Users Endpoint Documentation**

### **Base URL**

```
GET /users
```

### **Query Parameters**

| Parameter  | Type         | Required | Default          | Description                           |
| ---------- | ------------ | -------- | ---------------- | ------------------------------------- |
| `page`     | number       | No       | 1                | Page number (1-based)                 |
| `limit`    | number       | No       | 10               | Items per page (max: 100)             |
| `search`   | string       | No       | -                | Text search across searchable columns |
| `sortBy`   | string/array | No       | `createdAt:DESC` | Sorting field and direction           |
| `filter.*` | mixed        | No       | -                | Filter conditions with operators      |

---

## 🔍 **Search Parameters**

### **Searchable Columns**

The users endpoint supports searching across these columns:

- `name` - User's full name
- `email` - User's email address

### **Usage Examples**

```bash
# Search for users with "john" in name or email
GET /users?search=john

# Search for admin users
GET /users?search=admin
```

---

## 📊 **Sorting Parameters**

### **Sortable Columns**

- `createdAt` - Account creation date
- `updatedAt` - Last update date
- `name` - User's full name
- `email` - User's email address

### **Sorting Syntax**

```
sortBy=field:direction
```

**Directions:**

- `ASC` - Ascending order
- `DESC` - Descending order

### **Usage Examples**

```bash
# Sort by name ascending
GET /users?sortBy=name:ASC

# Sort by creation date descending (default)
GET /users?sortBy=createdAt:DESC

# Multiple sorting (comma-separated)
GET /users?sortBy=name:ASC,createdAt:DESC
```

---

## 🔧 **Filtering Parameters**

### **Filter Syntax**

```
filter.field=value
filter.field[operator]=value
```

### **Supported Operators**

| Operator | Description           | Example                             |
| -------- | --------------------- | ----------------------------------- |
| `$ne`    | Not equal             | `filter.id[$ne]=123`                |
| `$like`  | LIKE pattern          | `filter.name[$like]=%john%`         |
| `$in`    | In array              | `filter.role[$in]=admin,user`       |
| `$gt`    | Greater than          | `filter.createdAt[$gt]=2024-01-01`  |
| `$gte`   | Greater than or equal | `filter.createdAt[$gte]=2024-01-01` |
| `$lt`    | Less than             | `filter.createdAt[$lt]=2024-12-31`  |
| `$lte`   | Less than or equal    | `filter.createdAt[$lte]=2024-12-31` |

### **Filterable Fields**

- `id` - User ID
- `name` - User's full name
- `email` - User's email address
- `isActive` - Account status
- `createdAt` - Creation date
- `updatedAt` - Last update date

### **Usage Examples**

#### **Simple Equality Filters**

```bash
# Filter by active status
GET /users?filter.isActive=true

# Filter by specific email
GET /users?filter.email=admin@lms.com
```

#### **Complex Operator Filters**

```bash
# Exclude specific user
GET /users?filter.id[$ne]=1c829f47-e8c9-471f-ab66-d059d39b0c9a

# Find users with "admin" in name
GET /users?filter.name[$like]=%admin%

# Filter by multiple roles
GET /users?filter.role[$in]=admin,super_admin

# Users created after specific date
GET /users?filter.createdAt[$gt]=2024-01-01T00:00:00Z

# Active users created in last 30 days
GET /users?filter.isActive=true&filter.createdAt[$gte]=2024-07-01T00:00:00Z
```

---

## 📄 **Pagination Parameters**

### **Basic Pagination**

```bash
# First page with 10 items (default)
GET /users

# Second page with 20 items
GET /users?page=2&limit=20

# Last page (if you know total count)
GET /users?page=5&limit=10
```

### **Pagination Limits**

- **Minimum page**: 1
- **Maximum limit**: 100
- **Default limit**: 10

---

## 🔗 **Response Format**

### **Success Response**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "1c829f47-e8c9-471f-ab66-d059d39b0c9a",
        "createdAt": "2025-08-26T14:44:26.243Z",
        "updatedAt": "2025-08-26T14:44:26.243Z",
        "deletedAt": null,
        "isActive": true,
        "createdBy": null,
        "updatedBy": null,
        "deletedBy": null,
        "email": "admin@lms.com",
        "name": "System Administrator",
        "failedLoginAttempts": 0,
        "lockoutUntil": null,
        "twoFactorEnabled": false,
        "profile": null,
        "roles": [
          {
            "id": "85448259-6a87-4e4e-9752-2869e8bfee86",
            "name": "Global Administrator",
            "type": "ADMIN",
            "description": "System administrator with full constraints"
          }
        ]
      }
    ],
    "meta": {
      "totalItems": 2,
      "itemCount": 2,
      "itemsPerPage": 10,
      "totalPages": 1,
      "currentPage": 1
    },
    "links": {
      "first": "/users?limit=10",
      "previous": "",
      "next": "",
      "last": "/users?page=1&limit=10"
    }
  },
  "timestamp": "2025-08-27T18:34:55.873Z",
  "path": "/users?page=1&limit=10",
  "method": "GET"
}
```

### **Response Fields**

#### **Meta Information**

- `totalItems` - Total number of items in database
- `itemCount` - Number of items in current page
- `itemsPerPage` - Items per page limit
- `totalPages` - Total number of pages
- `currentPage` - Current page number

#### **Navigation Links**

- `first` - Link to first page
- `previous` - Link to previous page (empty if on first page)
- `next` - Link to next page (empty if on last page)
- `last` - Link to last page

---

## 🚀 **Advanced Usage Examples**

### **Complex Queries**

#### **Search + Filter + Sort + Pagination**

```bash
# Search for admin users, exclude specific user, sort by name, page 2
GET /users?search=admin&filter.id[$ne]=123&filter.isActive=true&sortBy=name:ASC&page=2&limit=20
```

#### **Date Range Filtering**

```bash
# Users created between dates
GET /users?filter.createdAt[$gte]=2024-01-01T00:00:00Z&filter.createdAt[$lte]=2024-12-31T23:59:59Z
```

#### **Multiple Role Filtering**

```bash
# Users with admin or super_admin roles
GET /users?filter.role[$in]=admin,super_admin
```

#### **Text Search with Pattern Matching**

```bash
# Users with "john" in name (case insensitive)
GET /users?filter.name[$like]=%john%
```

---

## ⚠️ **Error Handling**

### **Validation Errors**

```json
{
  "success": false,
  "message": "Validation failed",
  "field": "limit",
  "error": "VALIDATION_ERROR",
  "details": "Limit must be between 1 and 100"
}
```

### **Common Error Scenarios**

- **Invalid page number**: Must be >= 1
- **Invalid limit**: Must be between 1 and 100
- **Invalid sort field**: Field not in allowed sortable columns
- **Invalid filter operator**: Operator not supported
- **Invalid filter field**: Field not in allowed filterable columns

---

## 🔧 **Implementation Details**

### **Backend Implementation**

#### **Controller Level**

```typescript
@Get()
@Paginate({
  maxPage: 1000,
  maxLimit: 100,
  minLimit: 1,
  allowedSortFields: ['createdAt', 'updatedAt', 'name', 'email'],
  allowedFilterFields: ['id', 'name', 'email', 'isActive', 'createdAt', 'updatedAt'],
  allowedSearchFields: ['name', 'email']
})
async listUsers(@Paginate() query: PaginationQuery) {
  return this.userService.listUsers({ query, userId: this.getCurrentUserId() });
}
```

#### **Repository Level**

```typescript
async paginateUsersInCenter(params: UserListQuery): Promise<Pagination<User>> {
  const { query, userId, isActive, targetUserId, centerId } = params;

  const queryBuilder = this.userRepository
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.profile', 'profile')
    .leftJoinAndSelect('user.userRoles', 'userRoles')
    .leftJoinAndSelect('userRoles.role', 'role');

  return this.paginate({
    page: query.page,
    limit: query.limit,
    search: query.search,
    filter: {
      ...query.filter,
      ...(targetUserId && { id: { $ne: targetUserId } }),
      ...(isActive !== undefined && { isActive }),
    },
    sortBy: query.sortBy,
    searchableColumns: ['name', 'email'],
    sortableColumns: ['createdAt', 'updatedAt', 'name', 'email'],
    defaultSortBy: ['createdAt', 'DESC'],
    route: '/users',
  }, queryBuilder);
}
```

---

## 📚 **Related Documentation**

- [Pagination Fix Summary](./PAGINATION_FIX_SUMMARY.md)
- [Pagination Links Fix](./PAGINATION_LINKS_FIX.md)
- [Base Entity and Validation Summary](./BASE_ENTITY_AND_VALIDATION_SUMMARY.md)

---

## 🎉 **Status**

- ✅ **Fully Implemented**
- ✅ **Tested and Working**
- ✅ **Documented**
- ✅ **Ready for Production**

**Last Updated**: August 27, 2025











