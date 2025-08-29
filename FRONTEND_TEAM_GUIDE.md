# Frontend Team Guide - Pagination System

## 🎯 **Overview for Frontend Developers**

This guide provides everything your frontend team needs to integrate with the enhanced pagination, sorting, and filtering system. The API is **production-ready** and designed specifically for frontend consumption.

---

## 🚀 **Quick Start - Get Started in 5 Minutes**

### **1. Test the API**

```bash
# Basic pagination
curl "http://localhost:3000/users?page=1&limit=10"

# Search functionality
curl "http://localhost:3000/users?search=admin"

# Filtering
curl "http://localhost:3000/users?filter.isActive=true"
```

### **2. Copy the Ready-to-Use Hook**

```typescript
// Copy this hook to your project
const useUsersPagination = () => {
  const [query, setQuery] = useState<PaginationQuery>({
    page: 1,
    limit: 10,
  });
  const [data, setData] = useState<PaginationResponse<User> | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async (params: PaginationQuery) => {
    setLoading(true);
    try {
      const searchParams = new URLSearchParams();

      // Add pagination params
      searchParams.append('page', params.page.toString());
      searchParams.append('limit', params.limit.toString());

      // Add search
      if (params.search) {
        searchParams.append('search', params.search);
      }

      // Add sorting
      if (params.sortBy && params.sortBy.length > 0) {
        const sortString = params.sortBy
          .map(([field, direction]) => `${field}:${direction}`)
          .join(',');
        searchParams.append('sortBy', sortString);
      }

      // Add filters
      if (params.filter) {
        Object.entries(params.filter).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            Object.entries(value).forEach(([operator, operatorValue]) => {
              searchParams.append(
                `filter.${key}[${operator}]`,
                operatorValue.toString(),
              );
            });
          } else {
            searchParams.append(`filter.${key}`, value.toString());
          }
        });
      }

      const response = await fetch(`/api/users?${searchParams.toString()}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(query);
  }, [query]);

  return {
    data,
    loading,
    query,
    setQuery,
    refetch: () => fetchUsers(query),
  };
};
```

### **3. Use in Your Component**

```tsx
const UsersList: React.FC = () => {
  const { data, loading, query, setQuery } = useUsersPagination();

  const handlePageChange = (page: number) => {
    setQuery((prev) => ({ ...prev, page }));
  };

  const handleSearch = (search: string) => {
    setQuery((prev) => ({ ...prev, search, page: 1 }));
  };

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data</div>;

  return (
    <div>
      <input
        placeholder="Search users..."
        onChange={(e) => handleSearch(e.target.value)}
      />

      <table>
        <tbody>
          {data.data.items.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div>
        Page {data.data.meta.currentPage} of {data.data.meta.totalPages}
        <button
          onClick={() => handlePageChange(data.data.meta.currentPage - 1)}
        >
          Previous
        </button>
        <button
          onClick={() => handlePageChange(data.data.meta.currentPage + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
};
```

---

## 📊 **API Response Format**

Every endpoint returns this consistent structure:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "1c829f47-e8c9-471f-ab66-d059d39b0c9a",
        "name": "John Doe",
        "email": "john@example.com",
        "isActive": true,
        "createdAt": "2025-08-26T14:44:26.243Z",
        "roles": [...]
      }
    ],
    "meta": {
      "totalItems": 100,      // Total count for pagination UI
      "itemCount": 25,        // Items in current page
      "itemsPerPage": 25,     // Current limit
      "totalPages": 4,        // Total pages for navigation
      "currentPage": 2        // Current page number
    },
    "links": {
      "first": "/users?limit=25",
      "previous": "/users?page=1&limit=25",
      "next": "/users?page=3&limit=25",
      "last": "/users?page=4&limit=25"
    }
  }
}
```

---

## 🔧 **TypeScript Interfaces**

Copy these interfaces to your project:

```typescript
interface PaginationQuery {
  page: number;
  limit: number;
  search?: string;
  sortBy?: [string, 'ASC' | 'DESC'][];
  filter?: Record<string, any>;
}

interface PaginationResponse<T> {
  success: boolean;
  data: {
    items: T[];
    meta: {
      totalItems: number;
      itemCount: number;
      itemsPerPage: number;
      totalPages: number;
      currentPage: number;
    };
    links: {
      first: string;
      previous: string;
      next: string;
      last: string;
    };
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  roles: Role[];
}

interface Role {
  id: string;
  name: string;
  type: string;
  description: string;
}
```

---

## 🎨 **Complete UI Components**

### **Pagination Component**

```tsx
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  links: {
    first: string;
    previous: string;
    next: string;
    last: string;
  };
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  links,
}) => {
  return (
    <div className="pagination">
      {links.first && (
        <button onClick={() => onPageChange(1)} disabled={currentPage === 1}>
          First
        </button>
      )}

      {links.previous && (
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </button>
      )}

      <span>
        Page {currentPage} of {totalPages}
      </span>

      {links.next && (
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      )}

      {links.last && (
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
        >
          Last
        </button>
      )}
    </div>
  );
};
```

### **Search Component**

```tsx
interface SearchBarProps {
  onSearch: (search: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = 'Search users...',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  useEffect(() => {
    onSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm, onSearch]);

  return (
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder={placeholder}
      className="search-input"
    />
  );
};
```

### **Filter Component**

```tsx
interface FilterPanelProps {
  onFilter: (filters: Record<string, any>) => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ onFilter }) => {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const handleFilterChange = (field: string, value: any) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilter(newFilters);
  };

  const clearFilters = () => {
    setFilters({});
    onFilter({});
  };

  return (
    <div className="filter-panel">
      <select
        value={filters.isActive || ''}
        onChange={(e) => handleFilterChange('isActive', e.target.value)}
      >
        <option value="">All Users</option>
        <option value="true">Active Only</option>
        <option value="false">Inactive Only</option>
      </select>

      <button onClick={clearFilters}>Clear Filters</button>
    </div>
  );
};
```

### **Sortable Table Header**

```tsx
interface SortableHeaderProps {
  field: string;
  currentSort?: [string, 'ASC' | 'DESC'];
  onSort: (field: string, direction: 'ASC' | 'DESC') => void;
  children: React.ReactNode;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({
  field,
  currentSort,
  onSort,
  children,
}) => {
  const handleClick = () => {
    const currentDirection = currentSort?.[1] || 'ASC';
    const newDirection = currentDirection === 'ASC' ? 'DESC' : 'ASC';
    onSort(field, newDirection);
  };

  return (
    <th onClick={handleClick} style={{ cursor: 'pointer' }}>
      {children}{' '}
      {currentSort?.[0] === field
        ? currentSort[1] === 'ASC'
          ? '↑'
          : '↓'
        : '↕'}
    </th>
  );
};
```

---

## 🔧 **Utility Functions**

### **URL Parameter Builder**

```typescript
export const buildPaginationParams = (
  query: PaginationQuery,
): URLSearchParams => {
  const params = new URLSearchParams();

  // Pagination
  params.append('page', query.page.toString());
  params.append('limit', query.limit.toString());

  // Search
  if (query.search) {
    params.append('search', query.search);
  }

  // Sorting
  if (query.sortBy && query.sortBy.length > 0) {
    const sortString = query.sortBy
      .map(([field, direction]) => `${field}:${direction}`)
      .join(',');
    params.append('sortBy', sortString);
  }

  // Filters
  if (query.filter) {
    Object.entries(query.filter).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        Object.entries(value).forEach(([operator, operatorValue]) => {
          params.append(`filter.${key}[${operator}]`, operatorValue.toString());
        });
      } else {
        params.append(`filter.${key}`, value.toString());
      }
    });
  }

  return params;
};
```

### **Filter Builder Helper**

```typescript
export const buildFilter = {
  equals: (field: string, value: any) => ({ [field]: value }),
  notEquals: (field: string, value: any) => ({ [field]: { $ne: value } }),
  like: (field: string, pattern: string) => ({ [field]: { $like: pattern } }),
  in: (field: string, values: any[]) => ({ [field]: { $in: values } }),
  gt: (field: string, value: any) => ({ [field]: { $gt: value } }),
  gte: (field: string, value: any) => ({ [field]: { $gte: value } }),
  lt: (field: string, value: any) => ({ [field]: { $lt: value } }),
  lte: (field: string, value: any) => ({ [field]: { $lte: value } }),
};

// Usage examples:
const filters = {
  ...buildFilter.equals('isActive', true),
  ...buildFilter.notEquals('id', currentUserId),
  ...buildFilter.like('name', '%admin%'),
  ...buildFilter.gte('createdAt', '2024-01-01T00:00:00Z'),
};
```

### **Debounce Hook**

```typescript
const useDebounce = (value: any, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return [debouncedValue];
};
```

---

## 🎯 **Common Use Cases**

### **1. User Management Dashboard**

```tsx
const UserDashboard: React.FC = () => {
  const { data, loading, query, setQuery } = useUsersPagination();

  const handleSearch = (search: string) => {
    setQuery((prev) => ({ ...prev, search, page: 1 }));
  };

  const handleStatusFilter = (isActive: boolean | null) => {
    setQuery((prev) => ({
      ...prev,
      filter: {
        ...prev.filter,
        isActive: isActive === null ? undefined : isActive,
      },
      page: 1,
    }));
  };

  const handleSort = (field: string, direction: 'ASC' | 'DESC') => {
    setQuery((prev) => ({
      ...prev,
      sortBy: [[field, direction]],
    }));
  };

  return (
    <div>
      <h1>User Management</h1>

      <SearchBar onSearch={handleSearch} />

      <div>
        <button onClick={() => handleStatusFilter(null)}>All Users</button>
        <button onClick={() => handleStatusFilter(true)}>Active Only</button>
        <button onClick={() => handleStatusFilter(false)}>Inactive Only</button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <table>
          <thead>
            <tr>
              <SortableHeader
                field="name"
                currentSort={query.sortBy?.[0]}
                onSort={handleSort}
              >
                Name
              </SortableHeader>
              <SortableHeader
                field="email"
                currentSort={query.sortBy?.[0]}
                onSort={handleSort}
              >
                Email
              </SortableHeader>
              <SortableHeader
                field="createdAt"
                currentSort={query.sortBy?.[0]}
                onSort={handleSort}
              >
                Created
              </SortableHeader>
            </tr>
          </thead>
          <tbody>
            {data?.data.items.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {data && (
        <Pagination
          currentPage={data.data.meta.currentPage}
          totalPages={data.data.meta.totalPages}
          onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))}
          links={data.data.links}
        />
      )}
    </div>
  );
};
```

### **2. Advanced Filtering**

```tsx
const AdvancedUserFilters: React.FC = () => {
  const { data, loading, query, setQuery } = useUsersPagination();

  const handleDateRangeFilter = (startDate: string, endDate: string) => {
    setQuery((prev) => ({
      ...prev,
      filter: {
        ...prev.filter,
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      },
      page: 1,
    }));
  };

  const handleRoleFilter = (roles: string[]) => {
    setQuery((prev) => ({
      ...prev,
      filter: {
        ...prev.filter,
        'roles.type': { $in: roles },
      },
      page: 1,
    }));
  };

  return (
    <div>
      <h2>Advanced Filters</h2>

      <div>
        <label>Date Range:</label>
        <input
          type="date"
          onChange={(e) => handleDateRangeFilter(e.target.value, '2024-12-31')}
        />
        <input
          type="date"
          onChange={(e) => handleDateRangeFilter('2024-01-01', e.target.value)}
        />
      </div>

      <div>
        <label>Roles:</label>
        <select
          multiple
          onChange={(e) => {
            const selectedRoles = Array.from(
              e.target.selectedOptions,
              (option) => option.value,
            );
            handleRoleFilter(selectedRoles);
          }}
        >
          <option value="ADMIN">Admin</option>
          <option value="USER">User</option>
          <option value="CENTER_ADMIN">Center Admin</option>
        </select>
      </div>

      {/* Display results */}
      {data && (
        <div>
          <p>Found {data.data.meta.totalItems} users</p>
          {/* User list */}
        </div>
      )}
    </div>
  );
};
```

---

## 📱 **Mobile-Friendly CSS**

```css
/* Pagination Styles */
.pagination {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  margin: 1rem 0;
}

.pagination button {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  border-radius: 4px;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination button:hover:not(:disabled) {
  background: #f5f5f5;
}

/* Search and Filter Styles */
.search-input {
  width: 100%;
  max-width: 300px;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.filter-panel {
  display: flex;
  gap: 1rem;
  margin: 1rem 0;
  flex-wrap: wrap;
}

.filter-panel select,
.filter-panel input {
  min-height: 44px; /* iOS minimum touch target */
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

/* Table Styles */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}

th,
td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  background: #f5f5f5;
  font-weight: 600;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .pagination {
    gap: 0.25rem;
  }

  .pagination button {
    padding: 0.5rem;
    font-size: 0.875rem;
  }

  .filter-panel {
    flex-direction: column;
  }

  .filter-panel select,
  .filter-panel input {
    width: 100%;
  }

  table {
    font-size: 0.875rem;
  }

  th,
  td {
    padding: 0.5rem;
  }
}
```

---

## 🔄 **State Management (Zustand Example)**

```typescript
import { create } from 'zustand';

interface UsersState {
  users: User[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
  query: PaginationQuery;
  loading: boolean;
  error: string | null;

  // Actions
  setQuery: (query: Partial<PaginationQuery>) => void;
  fetchUsers: () => Promise<void>;
  resetQuery: () => void;
}

const useUsersStore = create<UsersState>((set, get) => ({
  users: [],
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  },
  query: {
    page: 1,
    limit: 10,
  },
  loading: false,
  error: null,

  setQuery: (newQuery) => {
    set((state) => ({
      query: { ...state.query, ...newQuery },
    }));
  },

  fetchUsers: async () => {
    const { query } = get();
    set({ loading: true, error: null });

    try {
      const params = buildPaginationParams(query);
      const response = await fetch(`/api/users?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        set({
          users: data.data.items,
          pagination: {
            currentPage: data.data.meta.currentPage,
            totalPages: data.data.meta.totalPages,
            totalItems: data.data.meta.totalItems,
            itemsPerPage: data.data.meta.itemsPerPage,
          },
        });
      } else {
        set({ error: data.message });
      }
    } catch (error) {
      set({ error: 'Failed to fetch users' });
    } finally {
      set({ loading: false });
    }
  },

  resetQuery: () => {
    set({
      query: { page: 1, limit: 10 },
    });
  },
}));
```

---

## 🐛 **Error Handling**

### **API Error Response Format**

```json
{
  "success": false,
  "message": "Validation failed",
  "field": "limit",
  "error": "VALIDATION_ERROR",
  "details": "Limit must be between 1 and 100"
}
```

### **Error Handling Component**

```tsx
const ErrorHandler: React.FC<{ error: string | null }> = ({ error }) => {
  if (!error) return null;

  return (
    <div
      className="error-message"
      style={{
        padding: '1rem',
        margin: '1rem 0',
        backgroundColor: '#fee',
        border: '1px solid #fcc',
        borderRadius: '4px',
        color: '#c33',
      }}
    >
      <strong>Error:</strong> {error}
    </div>
  );
};
```

### **Loading States**

```tsx
const LoadingSpinner: React.FC = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '2rem',
    }}
  >
    <div>Loading...</div>
  </div>
);
```

---

## 📋 **API Limits & Constraints**

### **Pagination Limits**

- **Maximum limit**: 100 items per page
- **Minimum page**: 1
- **Default limit**: 10

### **Field Restrictions**

- **Searchable**: `name`, `email`
- **Sortable**: `createdAt`, `updatedAt`, `name`, `email`
- **Filterable**: `id`, `name`, `email`, `isActive`, `createdAt`, `updatedAt`

### **Supported Filter Operators**

| Operator | Description           | Example                             |
| -------- | --------------------- | ----------------------------------- |
| `$ne`    | Not equal             | `filter.id[$ne]=123`                |
| `$like`  | Pattern matching      | `filter.name[$like]=%john%`         |
| `$in`    | In array              | `filter.role[$in]=admin,user`       |
| `$gt`    | Greater than          | `filter.createdAt[$gt]=2024-01-01`  |
| `$gte`   | Greater than or equal | `filter.createdAt[$gte]=2024-01-01` |
| `$lt`    | Less than             | `filter.createdAt[$lt]=2024-12-31`  |
| `$lte`   | Less than or equal    | `filter.createdAt[$lte]=2024-12-31` |

---

## 🎯 **Best Practices**

### **1. URL State Synchronization**

```typescript
// Sync query with URL parameters
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const queryFromUrl = {
    page: parseInt(urlParams.get('page') || '1'),
    limit: parseInt(urlParams.get('limit') || '10'),
    search: urlParams.get('search') || undefined,
    sortBy: urlParams.get('sortBy')
      ? (urlParams
          .get('sortBy')!
          .split(',')
          .map((s) => s.split(':')) as [string, 'ASC' | 'DESC'][])
      : undefined,
  };
  setQuery(queryFromUrl);
}, []);

// Update URL when query changes
useEffect(() => {
  const params = buildPaginationParams(query);
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.pushState({}, '', newUrl);
}, [query]);
```

### **2. Performance Optimization**

```typescript
// Memoize expensive operations
const memoizedUsers = useMemo(() => {
  return data?.data.items || [];
}, [data?.data.items]);

// Use React.memo for components that don't need frequent re-renders
const UserRow = React.memo<{ user: User }>(({ user }) => (
  <tr>
    <td>{user.name}</td>
    <td>{user.email}</td>
  </tr>
));
```

### **3. Accessibility**

```tsx
// Add proper ARIA labels
<button
  onClick={() => onPageChange(page)}
  aria-label={`Go to page ${page}`}
  aria-current={currentPage === page ? 'page' : undefined}
>
  {page}
</button>

// Add keyboard navigation
<input
  type="text"
  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      handleSearch(e.target.value);
    }
  }}
  aria-label="Search users"
/>
```

---

## 🚀 **Complete Example - Full Implementation**

```tsx
import React, { useState, useEffect } from 'react';
import { useUsersPagination } from './hooks/useUsersPagination';
import {
  Pagination,
  SearchBar,
  FilterPanel,
  SortableHeader,
} from './components';
import { buildFilter } from './utils/filterBuilder';

const UsersPage: React.FC = () => {
  const { data, loading, query, setQuery } = useUsersPagination();

  const handleSearch = (search: string) => {
    setQuery((prev) => ({ ...prev, search, page: 1 }));
  };

  const handleSort = (field: string, direction: 'ASC' | 'DESC') => {
    setQuery((prev) => ({
      ...prev,
      sortBy: [[field, direction]],
    }));
  };

  const handleFilter = (filters: Record<string, any>) => {
    setQuery((prev) => ({
      ...prev,
      filter: { ...prev.filter, ...filters },
      page: 1,
    }));
  };

  const handlePageChange = (page: number) => {
    setQuery((prev) => ({ ...prev, page }));
  };

  const handleExcludeCurrentUser = () => {
    const currentUserId = 'current-user-id'; // Get from auth context
    setQuery((prev) => ({
      ...prev,
      filter: {
        ...prev.filter,
        ...buildFilter.notEquals('id', currentUserId),
      },
      page: 1,
    }));
  };

  return (
    <div className="users-page">
      <h1>User Management</h1>

      <div className="controls">
        <SearchBar
          onSearch={handleSearch}
          placeholder="Search by name or email..."
        />

        <FilterPanel onFilter={handleFilter} />

        <button onClick={handleExcludeCurrentUser}>Exclude Current User</button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : data ? (
        <>
          <div className="results-info">
            Showing {data.data.meta.itemCount} of {data.data.meta.totalItems}{' '}
            users
          </div>

          <table className="users-table">
            <thead>
              <tr>
                <SortableHeader
                  field="name"
                  currentSort={query.sortBy?.[0]}
                  onSort={handleSort}
                >
                  Name
                </SortableHeader>
                <SortableHeader
                  field="email"
                  currentSort={query.sortBy?.[0]}
                  onSort={handleSort}
                >
                  Email
                </SortableHeader>
                <SortableHeader
                  field="createdAt"
                  currentSort={query.sortBy?.[0]}
                  onSort={handleSort}
                >
                  Created
                </SortableHeader>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.data.items.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>
                    <span
                      className={`status ${user.isActive ? 'active' : 'inactive'}`}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => handleEditUser(user.id)}>
                      Edit
                    </button>
                    <button onClick={() => handleDeleteUser(user.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination
            currentPage={data.data.meta.currentPage}
            totalPages={data.data.meta.totalPages}
            onPageChange={handlePageChange}
            links={data.data.links}
          />
        </>
      ) : (
        <div className="no-data">No users found</div>
      )}
    </div>
  );
};

export default UsersPage;
```

---

## 📚 **Additional Resources**

### **Documentation Links**

- [Pagination Quick Reference](./PAGINATION_QUICK_REFERENCE.md)
- [Frontend Integration Guide](./FRONTEND_PAGINATION_INTEGRATION.md)
- [API Documentation](./PAGINATION_SORTING_FILTERING_GUIDE.md)

### **Testing Examples**

```bash
# Test basic functionality
curl "http://localhost:3000/users?page=1&limit=5"

# Test search
curl "http://localhost:3000/users?search=admin"

# Test filtering
curl "http://localhost:3000/users?filter.isActive=true"

# Test sorting
curl "http://localhost:3000/users?sortBy=name:ASC"

# Test complex query
curl "http://localhost:3000/users?search=admin&filter.isActive=true&sortBy=name:ASC&page=1&limit=10"
```

---

## 🎉 **Summary**

This pagination system provides:

✅ **Production-ready API** with consistent responses  
✅ **Complete frontend examples** in React/TypeScript  
✅ **Type-safe interfaces** for better development experience  
✅ **Mobile-friendly design** with responsive components  
✅ **Performance optimizations** like debounced search  
✅ **Comprehensive error handling** and loading states  
✅ **URL state synchronization** for bookmarkable pages  
✅ **Accessibility features** with proper ARIA labels

**Your frontend team can start using this immediately!** All the code examples are ready to copy and paste into your project.

---

**Status**: ✅ **Ready for Frontend Development**  
**Last Updated**: August 27, 2025



