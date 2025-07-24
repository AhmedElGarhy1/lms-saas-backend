# Search and Pagination Documentation

This document explains how to use the search and pagination functionality in the LMS API.

## Overview

The API uses `nestjs-paginate` for pagination and implements a custom search system using filter parameters. All search operations are **case-insensitive** and use **contains matching**.

## Basic Pagination Parameters

### Standard Parameters

- `page` - Page number (starts from 1, default: 1)
- `limit` - Items per page (default: 10, max: 100)
- `sortBy[0][0]` - Field to sort by
- `sortBy[0][1]` - Sort direction (`asc` or `desc`)

### Example

```bash
GET /users?page=1&limit=20&sortBy[0][0]=createdAt&sortBy[0][1]=desc
```

## Search Parameters

### Text Search (Case-insensitive contains)

Use `filter[fieldName]` to search in specific fields:

```bash
# Search users by name
GET /users?filter[name]=john

# Search users by email
GET /users?filter[email]=gmail

# Search groups by name
GET /groups?filter[name]=math

# Search subjects by name
GET /subjects?filter[name]=algebra
```

### Exact Match Filtering

Some endpoints support exact field matching:

```bash
# Filter by exact center ID
GET /groups?filter[centerId]=center-uuid-123

# Filter by exact grade level ID
GET /subjects?filter[gradeLevelId]=grade-uuid-456

# Filter by exact user type
GET /users?filter[userType]=Teacher
```

### Enum Filtering

Filter by enum values:

```bash
# Filter attendance by status
GET /attendance?filter[status]=PRESENT

# Filter by session ID
GET /attendance?filter[sessionId]=session-uuid-123
```

### Date Range Filtering

Filter by date ranges:

```bash
# Filter attendance by date range
GET /attendance?filter[dateFrom]=2024-01-01&filter[dateTo]=2024-01-31

# Filter sessions by time range
GET /sessions?filter[dateFrom]=2024-01-01&filter[dateTo]=2024-12-31
```

## Endpoint-Specific Search Fields

### Users (`/users`)

- **Search fields**: `name`, `email`
- **Exact fields**: `userType`
- **Custom filters**: `centerId`

```bash
# Search for teachers named "John" in a specific center
GET /users?filter[name]=john&filter[userType]=Teacher&filter[centerId]=center-123
```

### Teachers (`/teachers`)

- **Search fields**: `name`
- **Custom filters**: `centerId`

```bash
# Search for teachers named "Smith"
GET /teachers?filter[name]=smith
```

### Groups (`/groups`)

- **Search fields**: `name`
- **Exact fields**: `centerId`, `gradeLevelId`

```bash
# Search for math groups in a specific center and grade
GET /groups?filter[name]=math&filter[centerId]=center-123&filter[gradeLevelId]=grade-456
```

### Subjects (`/subjects`)

- **Search fields**: `name`
- **Exact fields**: `centerId`, `gradeLevelId`

```bash
# Search for algebra subjects
GET /subjects?filter[name]=algebra
```

### Attendance (`/attendance`)

- **Search fields**: `note`
- **Exact fields**: `sessionId`, `studentId`
- **Enum fields**: `status`
- **Date range**: `createdAt`

```bash
# Search attendance with notes containing "late" for a specific session
GET /attendance?filter[note]=late&filter[sessionId]=session-123

# Search attendance by date range and status
GET /attendance?filter[dateFrom]=2024-01-01&filter[dateTo]=2024-01-31&filter[status]=ABSENT
```

### Centers (`/centers`)

- **Search fields**: `name`

```bash
# Search for centers with "Learning" in the name
GET /centers?filter[name]=Learning
```

### Guardians (`/guardians`)

- **Search fields**: `name`, `email`

```bash
# Search for guardians by name or email
GET /guardians?filter[name]=smith&filter[email]=gmail
```

### Grade Levels (`/grade-levels`)

- **Search fields**: `name`
- **Exact fields**: `centerId`

```bash
# Search for grade levels in a specific center
GET /grade-levels?filter[name]=grade&filter[centerId]=center-123
```

### Sessions (`/sessions`)

- **Search fields**: `title`, `description`
- **Exact fields**: `centerId`, `subjectId`, `teacherId`
- **Date range**: `startTime`, `endTime`

```bash
# Search for math sessions in a specific center
GET /sessions?filter[title]=math&filter[centerId]=center-123
```

## Response Format

All paginated endpoints return the same response format:

```json
{
  "data": [
    // Array of items
  ],
  "meta": {
    "itemsPerPage": 10,
    "totalItems": 100,
    "currentPage": 1,
    "totalPages": 10,
    "sortBy": [["createdAt", "desc"]],
    "searchBy": [],
    "search": "",
    "filter": {
      "name": "john"
    },
    "select": []
  },
  "links": {
    "first": "?page=1&limit=10",
    "previous": "",
    "current": "?page=1&limit=10",
    "next": "?page=2&limit=10",
    "last": "?page=10&limit=10"
  }
}
```

## Advanced Search Examples

### Complex User Search

```bash
# Find all teachers named "John" or "Jane" in a specific center, sorted by creation date
GET /users?filter[name]=john&filter[userType]=Teacher&filter[centerId]=center-123&sortBy[0][0]=createdAt&sortBy[0][1]=desc&page=1&limit=20
```

### Attendance Report

```bash
# Get all absent students for a specific session with notes
GET /attendance?filter[sessionId]=session-123&filter[status]=ABSENT&filter[note]=sick&page=1&limit=50
```

### Group Management

```bash
# Find all math groups in grade 10 for a specific center
GET /groups?filter[name]=math&filter[gradeLevelId]=grade-10&filter[centerId]=center-123&sortBy[0][0]=name&sortBy[0][1]=asc
```

## Best Practices

1. **Use appropriate page sizes**: Keep `limit` reasonable (10-50) for better performance
2. **Combine filters**: Use multiple filters to narrow down results
3. **Use sorting**: Always specify sorting for consistent results
4. **Handle pagination**: Use the `links` in the response for navigation
5. **Case-insensitive**: Search terms are case-insensitive, so "John" and "john" return the same results

## Error Handling

- Invalid filter fields are ignored
- Invalid date formats return 400 Bad Request
- Invalid enum values return 400 Bad Request
- Empty search terms are ignored

## Rate Limiting

All search endpoints are subject to rate limiting. Check the response headers for rate limit information.
