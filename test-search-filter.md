# Testing Search and Filter Functionality

This document provides examples of how to test the new search and filter functionality.

## Test Examples

### 1. Global Search Test

```bash
# Search for users with "john" in name or email
GET /users?search=john&centerId=your-center-id

# Expected: Returns users where name or email contains "john" (case-insensitive)
```

### 2. Exact Filter Test

```bash
# Filter for active users only
GET /users?filter[isActive]=true&centerId=your-center-id

# Expected: Returns only users where isActive = true
```

### 3. Combined Search and Filter Test

```bash
# Search for "john" in active users
GET /users?search=john&filter[isActive]=true&centerId=your-center-id

# Expected: Returns active users where name or email contains "john"
```

### 4. Multiple Filters Test

```bash
# Filter by multiple criteria
GET /users?filter[isActive]=true&filter[id]=123&centerId=your-center-id

# Expected: Returns users where isActive = true AND id = '123'
```

### 5. Centers Search Test

```bash
# Search for centers with "school" in name or description
GET /centers?search=school

# Expected: Returns centers where name or description contains "school"
```

### 6. Roles Search Test

```bash
# Search for roles with "admin" in name or description
GET /roles?search=admin

# Expected: Returns roles where name or description contains "admin"
```

### 7. Activity Log Search Test

```bash
# Search for activity logs with "user" in action or description
GET /activity-logs?search=user

# Expected: Returns activity logs where action or description contains "user"
```

## Testing with cURL

```bash
# Test user search
curl -X GET "http://localhost:3000/users?search=john&centerId=your-center-id" \
  -H "Authorization: Bearer your-token"

# Test user filter
curl -X GET "http://localhost:3000/users?filter[isActive]=true&centerId=your-center-id" \
  -H "Authorization: Bearer your-token"

# Test combined search and filter
curl -X GET "http://localhost:3000/users?search=john&filter[isActive]=true&centerId=your-center-id" \
  -H "Authorization: Bearer your-token"
```

## Expected SQL Queries

### Global Search

```sql
SELECT * FROM users
WHERE (user.name ILIKE '%john%' OR user.email ILIKE '%john%')
AND centerId = 'your-center-id'
```

### Exact Filter

```sql
SELECT * FROM users
WHERE user.isActive = true
AND centerId = 'your-center-id'
```

### Combined

```sql
SELECT * FROM users
WHERE (user.name ILIKE '%john%' OR user.email ILIKE '%john%')
AND user.isActive = true
AND centerId = 'your-center-id'
```

## Verification Checklist

- [ ] Global search works across all searchable fields
- [ ] Exact filters work for filterable fields
- [ ] Combined search and filter work together
- [ ] Case-insensitive search works
- [ ] Multiple filters work together
- [ ] Pagination still works with search/filter
- [ ] Sorting still works with search/filter
- [ ] API documentation shows correct parameters
- [ ] Error handling works for invalid parameters
