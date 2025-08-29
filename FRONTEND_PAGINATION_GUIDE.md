# Frontend Pagination, Search & Filter Guide

This guide provides comprehensive information for frontend developers on how to implement pagination, search, filtering, date ranges, and sorting with the backend API.

## Table of Contents

1. [Overview](#overview)
2. [Basic Pagination](#basic-pagination)
3. [Search Functionality](#search-functionality)
4. [Filtering](#filtering)
5. [Date Range Filtering](#date-range-filtering)
6. [Sorting](#sorting)
7. [Combined Usage](#combined-usage)
8. [API Endpoints](#api-endpoints)
9. [Response Format](#response-format)
10. [Error Handling](#error-handling)
11. [Examples](#examples)

## Overview

The backend uses **nestjs-typeorm-paginate** library which provides a standardized way to handle:

- **Pagination**: Page-based navigation with configurable limits
- **Search**: Global search across multiple fields (case-insensitive)
- **Filtering**: Exact match filtering on specific fields
- **Date Ranges**: Filter by date ranges
- **Sorting**: Sort by any configured field in ascending/descending order

## Basic Pagination

### Query Parameters

| Parameter | Type   | Required | Default | Description                 |
| --------- | ------ | -------- | ------- | --------------------------- |
| `page`    | number | No       | 1       | Page number (starts from 1) |
| `limit`   | number | No       | 10      | Items per page (max 100)    |

### Example

```javascript
// Get first page with 10 items
GET /users?page=1&limit=10

// Get second page with 20 items
GET /users?page=2&limit=20
```

## Search Functionality

### Global Search

Search across all configured searchable fields using case-insensitive contains matching.

| Parameter | Type   | Description        |
| --------- | ------ | ------------------ |
| `search`  | string | Global search term |

### Example

```javascript
// Search for "john" across all searchable fields
GET /users?search=john

// This will search in: user.name, user.email (case-insensitive)
// SQL: WHERE (user.name ILIKE '%john%' OR user.email ILIKE '%john%')
```

### Searchable Fields by Module

| Module        | Searchable Fields                                                                       |
| ------------- | --------------------------------------------------------------------------------------- |
| Users         | `user.name`, `user.email`                                                               |
| Centers       | `center.name`, `center.description`                                                     |
| Roles         | `role.name`, `role.description`                                                         |
| Permissions   | `permission.action`, `permission.description`                                           |
| Activity Logs | `activityLog.action`, `activityLog.details`, `actor.name`, `actor.email`, `center.name` |

## Filtering

### Exact Match Filtering

Filter by exact values on specific fields.

| Parameter           | Type                  | Description        |
| ------------------- | --------------------- | ------------------ |
| `filter[fieldName]` | string/number/boolean | Exact match filter |

### Example

```javascript
// Filter active users
GET /users?filter[isActive]=true

// Filter by multiple criteria
GET /users?filter[isActive]=true&filter[id]=123

// Filter by array values (IN clause)
GET /users?filter[roleType]=admin&filter[roleType]=user
```

### Filterable Fields by Module

| Module        | Filterable Fields                                                                                        |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| Users         | `user.isActive`, `user.id`                                                                               |
| Centers       | `center.isActive`, `center.id`                                                                           |
| Roles         | `role.type`, `role.isActive`, `role.id`                                                                  |
| Permissions   | `permission.isAdmin`, `permission.id`                                                                    |
| Activity Logs | `activityLog.centerId`, `activityLog.actorId`, `activityLog.type`, `activityLog.level`, `activityLog.id` |

## Date Range Filtering

### Date Range Parameters

| Parameter          | Type   | Description             |
| ------------------ | ------ | ----------------------- |
| `filter[dateFrom]` | string | Start date (YYYY-MM-DD) |
| `filter[dateTo]`   | string | End date (YYYY-MM-DD)   |

### Example

```javascript
// Filter by date range
GET /users?filter[dateFrom]=2024-01-01&filter[dateTo]=2024-12-31

// Filter by creation date range
GET /activity-logs?filter[dateFrom]=2024-01-01&filter[dateTo]=2024-12-31
```

## Sorting

### Sort Parameters

| Parameter      | Type   | Description                      |
| -------------- | ------ | -------------------------------- |
| `sortBy[0][0]` | string | Field to sort by                 |
| `sortBy[0][1]` | string | Sort direction (`asc` or `desc`) |

### Example

```javascript
// Sort by name ascending
GET /users?sortBy[0][0]=user.name&sortBy[0][1]=asc

// Sort by creation date descending
GET /users?sortBy[0][0]=user.createdAt&sortBy[0][1]=desc
```

### Sortable Fields by Module

| Module  | Sortable Fields                                                                                   |
| ------- | ------------------------------------------------------------------------------------------------- |
| Users   | `user.name`, `user.email`, `user.isActive`, `user.createdAt`, `user.updatedAt`                    |
| Centers | `center.name`, `center.description`, `center.isActive`, `center.createdAt`, `center.updatedAt`    |
| Roles   | `role.name`, `role.description`, `role.type`, `role.isActive`, `role.createdAt`, `role.updatedAt` |

## Combined Usage

You can combine all parameters for complex queries:

```javascript
// Complex query example
GET /users?search=john&filter[isActive]=true&filter[dateFrom]=2024-01-01&sortBy[0][0]=user.name&sortBy[0][1]=asc&page=1&limit=20
```

This query will:

1. Search for "john" in name/email
2. Filter for active users only
3. Filter by date range
4. Sort by name ascending
5. Return first page with 20 items

## API Endpoints

### Available Endpoints

| Endpoint             | Method | Description        | Searchable | Filterable |
| -------------------- | ------ | ------------------ | ---------- | ---------- |
| `/users`             | GET    | List users         | ✅         | ✅         |
| `/centers`           | GET    | List centers       | ✅         | ✅         |
| `/roles`             | GET    | List roles         | ✅         | ✅         |
| `/permissions`       | GET    | List permissions   | ✅         | ✅         |
| `/activity-logs`     | GET    | List activity logs | ✅         | ✅         |
| `/users/:id/centers` | GET    | User centers       | ✅         | ✅         |

### Required Parameters

Some endpoints require additional parameters:

```javascript
// Users endpoint requires centerId for access control
GET /users?centerId=123&search=john&filter[isActive]=true

// Activity logs can be filtered by center
GET /activity-logs/center/123?search=user&filter[level]=info
```

## Response Format

### Standard Response Structure

```json
{
  "data": [
    {
      "id": "123",
      "name": "John Doe",
      "email": "john@example.com",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "itemsPerPage": 10,
    "totalItems": 100,
    "currentPage": 1,
    "totalPages": 10,
    "sortBy": [["user.name", "ASC"]],
    "searchBy": ["user.name", "user.email"],
    "filter": {
      "user.isActive": true
    }
  },
  "links": {
    "first": "/users?limit=10",
    "previous": "",
    "current": "/users?page=1&limit=10",
    "next": "/users?page=2&limit=10",
    "last": "/users?page=10&limit=10"
  }
}
```

### Meta Information

The `meta` object provides useful information for UI components:

- `itemsPerPage`: Number of items per page
- `totalItems`: Total number of items
- `currentPage`: Current page number
- `totalPages`: Total number of pages
- `sortBy`: Current sorting configuration
- `searchBy`: Fields being searched
- `filter`: Current filter configuration

## Error Handling

### Common Error Responses

```json
// 400 Bad Request - Invalid parameters
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    "Page must be a positive number",
    "Limit cannot exceed 100"
  ]
}

// 401 Unauthorized
{
  "statusCode": 401,
  "message": "Unauthorized"
}

// 403 Forbidden
{
  "statusCode": 403,
  "message": "Access denied to this resource"
}

// 404 Not Found
{
  "statusCode": 404,
  "message": "Resource not found"
}
```

### Validation Rules

- `page`: Must be a positive number ≥ 1
- `limit`: Must be between 1 and 100
- `search`: String, case-insensitive
- `filter[field]`: Exact match values
- `sortBy[0][1]`: Must be `asc` or `desc`

## Examples

### Frontend Implementation Examples

#### React Hook Example

```javascript
import { useState, useEffect } from 'react';

const usePaginatedData = (endpoint, initialParams = {}) => {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async (params = {}) => {
    setLoading(true);
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`${endpoint}?${queryString}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result.data);
      setMeta(result.meta);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(initialParams);
  }, []);

  return { data, meta, loading, error, refetch: fetchData };
};
```

#### Vue.js Composition API Example

```javascript
import { ref, reactive, onMounted } from 'vue';

export function usePaginatedData(endpoint, initialParams = {}) {
  const data = ref([]);
  const meta = ref({});
  const loading = ref(false);
  const error = ref(null);
  const params = reactive(initialParams);

  const fetchData = async (newParams = {}) => {
    loading.value = true;
    try {
      const queryString = new URLSearchParams({
        ...params,
        ...newParams,
      }).toString();
      const response = await fetch(`${endpoint}?${queryString}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      data.value = result.data;
      meta.value = result.meta;
      error.value = null;
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  onMounted(() => {
    fetchData();
  });

  return { data, meta, loading, error, params, fetchData };
}
```

#### Angular Service Example

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  filter?: Record<string, any>;
  sortBy?: [string, 'asc' | 'desc'];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    itemsPerPage: number;
    totalItems: number;
    currentPage: number;
    totalPages: number;
    sortBy: [string, string][];
    searchBy: string[];
    filter: Record<string, any>;
  };
  links: {
    first: string;
    previous: string;
    current: string;
    next: string;
    last: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class PaginationService {
  constructor(private http: HttpClient) {}

  getPaginatedData<T>(
    endpoint: string,
    params: PaginationParams = {},
  ): Observable<PaginatedResponse<T>> {
    let httpParams = new HttpParams();

    // Add pagination params
    if (params.page)
      httpParams = httpParams.set('page', params.page.toString());
    if (params.limit)
      httpParams = httpParams.set('limit', params.limit.toString());

    // Add search param
    if (params.search) httpParams = httpParams.set('search', params.search);

    // Add filter params
    if (params.filter) {
      Object.entries(params.filter).forEach(([key, value]) => {
        httpParams = httpParams.set(`filter[${key}]`, value.toString());
      });
    }

    // Add sort params
    if (params.sortBy) {
      httpParams = httpParams.set('sortBy[0][0]', params.sortBy[0]);
      httpParams = httpParams.set('sortBy[0][1]', params.sortBy[1]);
    }

    return this.http.get<PaginatedResponse<T>>(endpoint, {
      params: httpParams,
    });
  }
}
```

### UI Component Examples

#### Search and Filter Form

```javascript
const SearchFilterForm = ({ onSearch, onFilter, onReset }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({});
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    const params = {
      search: searchTerm,
      filter: {
        ...filters,
        ...(dateRange.from && { dateFrom: dateRange.from }),
        ...(dateRange.to && { dateTo: dateRange.to }),
      },
    };
    onSearch(params);
  };

  const handleReset = () => {
    setSearchTerm('');
    setFilters({});
    setDateRange({ from: '', to: '' });
    onReset();
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Search..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <select
        value={filters.isActive || ''}
        onChange={(e) => setFilters({ ...filters, isActive: e.target.value })}
      >
        <option value="">All Status</option>
        <option value="true">Active</option>
        <option value="false">Inactive</option>
      </select>

      <input
        type="date"
        value={dateRange.from}
        onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
      />
      <input
        type="date"
        value={dateRange.to}
        onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
      />

      <button type="submit">Search</button>
      <button type="button" onClick={handleReset}>
        Reset
      </button>
    </form>
  );
};
```

#### Pagination Component

```javascript
const Pagination = ({ meta, onPageChange }) => {
  const { currentPage, totalPages, totalItems, itemsPerPage } = meta;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  return (
    <div className="pagination">
      <div className="pagination-info">
        Showing {startItem} to {endItem} of {totalItems} results
      </div>

      <div className="pagination-controls">
        <button
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
        >
          First
        </button>

        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </button>

        <span className="page-info">
          Page {currentPage} of {totalPages}
        </span>

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </button>

        <button
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
        >
          Last
        </button>
      </div>
    </div>
  );
};
```

## Best Practices

### Frontend Implementation

1. **Debounce Search**: Implement debouncing for search inputs to avoid excessive API calls
2. **URL State**: Sync pagination state with URL parameters for bookmarkable/shareable links
3. **Loading States**: Show loading indicators during API calls
4. **Error Handling**: Display user-friendly error messages
5. **Caching**: Consider caching paginated results for better UX
6. **Accessibility**: Ensure pagination controls are keyboard accessible

### Performance Tips

1. **Limit Requests**: Use appropriate page sizes (10-50 items)
2. **Lazy Loading**: Consider infinite scroll for large datasets
3. **Optimistic Updates**: Update UI immediately for better perceived performance
4. **Request Cancellation**: Cancel pending requests when new ones are made

### Security Considerations

1. **Input Validation**: Validate all user inputs before sending to API
2. **Rate Limiting**: Respect API rate limits
3. **Authentication**: Include proper authentication headers
4. **Sanitization**: Sanitize search terms to prevent injection attacks
