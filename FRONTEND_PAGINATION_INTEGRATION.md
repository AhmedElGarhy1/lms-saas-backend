# Frontend Pagination Integration Guide

## 🎯 **Overview**

This guide shows how to integrate the enhanced pagination, sorting, and filtering system with frontend applications.

## 🚀 **Quick Integration Examples**

### **React/TypeScript Example**

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

// Hook for pagination
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
            // Handle operators like { $ne: value }
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

### **React Component Example**

```tsx
const UsersList: React.FC = () => {
  const { data, loading, query, setQuery } = useUsersPagination();

  const handlePageChange = (page: number) => {
    setQuery((prev) => ({ ...prev, page }));
  };

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

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data</div>;

  return (
    <div>
      {/* Search Bar */}
      <SearchBar onSearch={handleSearch} />

      {/* Filters */}
      <FilterPanel onFilter={handleFilter} />

      {/* Users Table */}
      <table>
        <thead>
          <tr>
            <th onClick={() => handleSort('name', 'ASC')}>Name ↕</th>
            <th onClick={() => handleSort('email', 'ASC')}>Email ↕</th>
            <th onClick={() => handleSort('createdAt', 'DESC')}>Created ↕</th>
          </tr>
        </thead>
        <tbody>
          {data.data.items.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{new Date(user.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <Pagination
        currentPage={data.data.meta.currentPage}
        totalPages={data.data.meta.totalPages}
        onPageChange={handlePageChange}
        links={data.data.links}
      />
    </div>
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
        // Handle operators
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
  // Simple equality
  equals: (field: string, value: any) => ({ [field]: value }),

  // Not equal
  notEquals: (field: string, value: any) => ({ [field]: { $ne: value } }),

  // Pattern matching
  like: (field: string, pattern: string) => ({ [field]: { $like: pattern } }),

  // In array
  in: (field: string, values: any[]) => ({ [field]: { $in: values } }),

  // Greater than
  gt: (field: string, value: any) => ({ [field]: { $gt: value } }),

  // Greater than or equal
  gte: (field: string, value: any) => ({ [field]: { $gte: value } }),

  // Less than
  lt: (field: string, value: any) => ({ [field]: { $lt: value } }),

  // Less than or equal
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

---

## 🎨 **UI Components**

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
  const getPageFromLink = (link: string): number | null => {
    const match = link.match(/page=(\d+)/);
    return match ? parseInt(match[1]) : null;
  };

  return (
    <div className="pagination">
      {/* First Page */}
      {links.first && (
        <button onClick={() => onPageChange(1)} disabled={currentPage === 1}>
          First
        </button>
      )}

      {/* Previous Page */}
      {links.previous && (
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </button>
      )}

      {/* Page Numbers */}
      <span>
        Page {currentPage} of {totalPages}
      </span>

      {/* Next Page */}
      {links.next && (
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      )}

      {/* Last Page */}
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

---

## 🔄 **State Management (Redux/Zustand)**

### **Zustand Store Example**

```typescript
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

## 🎯 **Best Practices**

### **1. Debounce Search Input**

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

### **2. URL State Synchronization**

```typescript
// Sync query with URL parameters
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const queryFromUrl = {
    page: parseInt(urlParams.get('page') || '1'),
    limit: parseInt(urlParams.get('limit') || '10'),
    search: urlParams.get('search') || undefined,
    // ... other params
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

### **3. Error Handling**

```typescript
const handleApiError = (error: any) => {
  if (error.response?.status === 400) {
    // Validation error
    const validationErrors = error.response.data;
    // Handle validation errors
  } else if (error.response?.status === 404) {
    // Not found
    setError('No users found');
  } else {
    // Generic error
    setError('An error occurred while fetching users');
  }
};
```

---

## 📱 **Mobile Considerations**

### **Responsive Pagination**

```css
.pagination {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .pagination {
    gap: 0.25rem;
  }

  .pagination button {
    padding: 0.5rem;
    font-size: 0.875rem;
  }
}
```

### **Touch-Friendly Filters**

```css
.filter-panel select,
.filter-panel input {
  min-height: 44px; /* iOS minimum touch target */
  padding: 0.75rem;
}
```

---

## 🎉 **Complete Example**

See the full working example in the [React Users List Component](./examples/UsersList.tsx) for a complete implementation.

**Status**: ✅ **Ready for Integration**









