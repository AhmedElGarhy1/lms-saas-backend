# Pagination Quick Reference Guide

## 🚀 **Quick Start Examples**

### **Basic Pagination**

```bash
GET /users?page=1&limit=20
```

### **Search**

```bash
GET /users?search=john
```

### **Sorting**

```bash
GET /users?sortBy=name:ASC
GET /users?sortBy=createdAt:DESC
```

### **Filtering**

```bash
GET /users?filter.isActive=true
GET /users?filter.id[$ne]=123
GET /users?filter.name[$like]=%admin%
```

---

## 📋 **Query Parameters Cheat Sheet**

| Parameter             | Example                             | Description               |
| --------------------- | ----------------------------------- | ------------------------- |
| `page`                | `page=2`                            | Page number (1-based)     |
| `limit`               | `limit=50`                          | Items per page (max: 100) |
| `search`              | `search=john`                       | Text search in name/email |
| `sortBy`              | `sortBy=name:ASC`                   | Sort field and direction  |
| `filter.field`        | `filter.isActive=true`              | Simple equality filter    |
| `filter.field[$ne]`   | `filter.id[$ne]=123`                | Not equal filter          |
| `filter.field[$like]` | `filter.name[$like]=%john%`         | Pattern matching          |
| `filter.field[$in]`   | `filter.role[$in]=admin,user`       | In array filter           |
| `filter.field[$gt]`   | `filter.createdAt[$gt]=2024-01-01`  | Greater than              |
| `filter.field[$gte]`  | `filter.createdAt[$gte]=2024-01-01` | Greater than or equal     |
| `filter.field[$lt]`   | `filter.createdAt[$lt]=2024-12-31`  | Less than                 |
| `filter.field[$lte]`  | `filter.createdAt[$lte]=2024-12-31` | Less than or equal        |

---

## 🎯 **Common Use Cases**

### **1. List Active Users**

```bash
GET /users?filter.isActive=true&sortBy=name:ASC
```

### **2. Search for Admin Users**

```bash
GET /users?search=admin&filter.isActive=true
```

### **3. Recent Users (Last 30 Days)**

```bash
GET /users?filter.createdAt[$gte]=2024-07-01T00:00:00Z&sortBy=createdAt:DESC
```

### **4. Exclude Current User**

```bash
GET /users?filter.id[$ne]=current-user-id
```

### **5. Users with Specific Role**

```bash
GET /users?filter.role[$in]=admin,super_admin
```

### **6. Paginated Search Results**

```bash
GET /users?search=john&page=2&limit=20&sortBy=name:ASC
```

---

## 🔧 **Advanced Combinations**

### **Complex Query Example**

```bash
GET /users?search=admin&filter.isActive=true&filter.id[$ne]=123&filter.createdAt[$gte]=2024-01-01&sortBy=name:ASC,createdAt:DESC&page=2&limit=25
```

**This query:**

- Searches for "admin" in name/email
- Filters for active users only
- Excludes user with ID 123
- Shows users created after Jan 1, 2024
- Sorts by name ascending, then creation date descending
- Returns page 2 with 25 items per page

---

## 📊 **Response Structure**

```json
{
  "success": true,
  "data": {
    "items": [...],           // Array of users
    "meta": {
      "totalItems": 100,      // Total users in database
      "itemCount": 25,        // Users in current page
      "itemsPerPage": 25,     // Items per page limit
      "totalPages": 4,        // Total number of pages
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

## ⚠️ **Limits & Constraints**

- **Maximum limit**: 100 items per page
- **Minimum page**: 1
- **Searchable fields**: `name`, `email`
- **Sortable fields**: `createdAt`, `updatedAt`, `name`, `email`
- **Filterable fields**: `id`, `name`, `email`, `isActive`, `createdAt`, `updatedAt`

---

## 🐛 **Troubleshooting**

### **Common Issues**

1. **No results returned**
   - Check if filters are too restrictive
   - Verify search terms are correct
   - Ensure page number is valid

2. **Invalid parameter errors**
   - Check parameter names (case sensitive)
   - Verify operator syntax (e.g., `[$ne]`, not `[ne]`)
   - Ensure values are properly URL encoded

3. **Sorting not working**
   - Verify field name is in sortable columns
   - Check direction is `ASC` or `DESC`

4. **Filtering not working**
   - Verify field name is in filterable columns
   - Check operator syntax
   - Ensure value format is correct

---

## 🔗 **Related Endpoints**

- **User Centers**: `/user-centers` - Similar pagination support
- **Activity Logs**: `/activity-logs` - Similar pagination support
- **Centers**: `/centers` - Similar pagination support

---

## 📚 **Full Documentation**

For complete documentation, see: [Pagination, Sorting & Filtering Guide](./PAGINATION_SORTING_FILTERING_GUIDE.md)









