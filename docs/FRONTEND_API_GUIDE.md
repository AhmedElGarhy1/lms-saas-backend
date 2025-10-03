# Frontend API Guide - LMS Backend System

This comprehensive guide explains the LMS backend system architecture, endpoints, and behaviors for frontend developers.

## Table of Contents

1. [System Overview](#system-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Core Concepts](#core-concepts)
4. [API Endpoints](#api-endpoints)
5. [Pagination, Filtering & Sorting](#pagination-filtering--sorting)
6. [Error Handling](#error-handling)
7. [Access Control System](#access-control-system)
8. [Role-Based Permissions](#role-based-permissions)
9. [Center Management](#center-management)
10. [User Management](#user-management)
11. [Best Practices](#best-practices)

## System Overview

The LMS backend is built with **NestJS** and follows a **Domain-Driven Design (DDD)** architecture with comprehensive access control and role-based permissions.

### Key Technologies

- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT with refresh tokens
- **Validation**: Zod schemas
- **Documentation**: Swagger/OpenAPI
- **Logging**: Winston
- **Rate Limiting**: Built-in throttling

### Architecture Principles

- **Separation of Concerns**: Each module handles specific domain logic
- **Role-Based Access Control**: Granular permissions based on user roles
- **Multi-Scope Support**: Global (ADMIN) and Center-scoped operations
- **Soft Delete**: Records are marked as deleted rather than removed
- **Comprehensive Validation**: Input validation at multiple levels
- **Event-Driven Architecture**: Uses EventEmitter for decoupled event handling

## Event System

The LMS backend uses an **EventEmitter-based event system** for decoupled, asynchronous processing of business events.

### Event Types

#### Center Events

- `center.created` - Emitted when a center is created
- `center.admin.created` - Emitted when a center admin is created
- `center.user.assigned` - Emitted when a user is assigned to a center
- `center.admin.assigned` - Emitted when an admin is assigned to a center

#### User Events

- `user.created` - Emitted when a user is created
- `user.role.assigned` - Emitted when a role is assigned to a user
- `user.profile.created` - Emitted when a user profile is created
- `user.activated` - Emitted when a user is activated/deactivated

### Event-Driven Center Creation

When creating a center, the system automatically:

1. **Creates the center** with provided information
2. **Emits `center.created`** event with center and admin details
3. **Creates center admin user** with provided admin information
4. **Assigns CENTER_ADMIN role** to the admin
5. **Creates basic roles** (Student, Teacher, Assistant) for the center
6. **Emits additional events** for tracking and processing

### Benefits of Event System

- **Decoupled Processing**: Events are processed asynchronously
- **Extensibility**: Easy to add new event listeners without modifying existing code
- **Audit Trail**: All important actions emit events for logging and tracking
- **Integration Ready**: Events can be used for external system integration
- **Scalability**: Event processing can be distributed across multiple services

## Activity Logging System

The LMS backend includes a comprehensive **activity logging system** that tracks all user actions, system events, and administrative activities for audit and monitoring purposes.

### Activity Log Structure

```typescript
interface ActivityLog {
  id: string;
  type: ActivityType; // Type of activity (USER_CREATED, CENTER_UPDATED, etc.)
  level: ActivityLevel; // INFO, WARNING, ERROR, CRITICAL
  scope: ActivityScope; // GLOBAL, CENTER, USER
  action: string; // Human-readable action description
  description?: string; // Detailed description
  details?: Record<string, any>; // Additional activity details
  metadata?: Record<string, any>; // System metadata
  actorId?: string; // User who performed the action
  targetUserId?: string; // User affected by the action
  centerId?: string; // Center context (if applicable)
  ipAddress?: string; // IP address for security tracking
  userAgent?: string; // User agent for security tracking
  createdAt: Date; // When the activity occurred
}
```

### Activity Types

#### User Activities

- `USER_CREATED`, `USER_UPDATED`, `USER_DELETED`
- `USER_ACTIVATED`, `USER_DEACTIVATED`
- `USER_LOGIN`, `USER_LOGOUT`
- `USER_PASSWORD_CHANGED`
- `USER_PROFILE_CREATED`, `USER_PROFILE_UPDATED`

#### Center Activities

- `CENTER_CREATED`, `CENTER_UPDATED`, `CENTER_DELETED`
- `CENTER_ACTIVATED`, `CENTER_DEACTIVATED`
- `CENTER_ADMIN_CREATED`, `CENTER_ADMIN_ASSIGNED`, `CENTER_ADMIN_REMOVED`
- `CENTER_USER_ASSIGNED`, `CENTER_USER_REMOVED`

#### Role & Permission Activities

- `ROLE_CREATED`, `ROLE_UPDATED`, `ROLE_DELETED`
- `ROLE_ASSIGNED`, `ROLE_REMOVED`
- `ROLE_PERMISSIONS_UPDATED`
- `PERMISSION_GRANTED`, `PERMISSION_REVOKED`

#### Access Control Activities

- `USER_ACCESS_GRANTED`, `USER_ACCESS_REVOKED`
- `CENTER_ACCESS_GRANTED`, `CENTER_ACCESS_REVOKED`

#### System Activities

- `SYSTEM_BACKUP`, `SYSTEM_RESTORE`
- `SYSTEM_MAINTENANCE`, `SYSTEM_ERROR`

### Activity Scopes

- **`GLOBAL`**: System-wide activities (user creation, global settings)
- **`CENTER`**: Center-specific activities (center management, user assignments)
- **`USER`**: User-specific activities (profile updates, login/logout)

### Activity Levels

- **`INFO`**: Normal operations and successful actions
- **`WARNING`**: Potential issues or unusual activities
- **`ERROR`**: Failed operations or system errors
- **`CRITICAL`**: Security violations or critical system failures

### Activity Log Endpoints

#### Global Activity Logs

```typescript
GET / activity - logs;
// Retrieve all system activity logs with pagination and filtering
```

#### Center Activity Logs

```typescript
GET /activity-logs/center/:centerId
// Retrieve activity logs for a specific center
```

#### User Activity Logs

```typescript
GET /activity-logs/user/:userId
// Retrieve activity logs for a specific user (as actor)
```

#### Activity Logs by Type

```typescript
GET /activity-logs/type/:type
// Retrieve activity logs filtered by activity type
```

#### Activity Logs by Level

```typescript
GET /activity-logs/level/:level
// Retrieve activity logs filtered by activity level
```

#### Activity Statistics

```typescript
GET /activity-logs/stats?centerId=:centerId
// Retrieve activity statistics (global or center-specific)

GET /activity-logs/stats/center/:centerId
// Retrieve activity statistics for a specific center
```

#### Individual Activity Log

```typescript
GET /activity-logs/:id
// Retrieve a specific activity log by ID
```

### Activity Log Filtering & Search

All activity log endpoints support:

- **Pagination**: `page`, `limit` parameters
- **Search**: Global search across `action` and `description` fields
- **Sorting**: Sort by `createdAt`, `type`, `level`, `action`
- **Filtering**: Filter by `type`, `level`, `scope`, `actorId`, `centerId`

### Example Activity Log Queries

```typescript
// Get recent user creation activities
GET /activity-logs/type/USER_CREATED?sortBy=createdAt:DESC&limit=10

// Get error-level activities for a center
GET /activity-logs/center/center-123?filter[level]=ERROR

// Search for password change activities
GET /activity-logs?search=password&filter[type]=USER_PASSWORD_CHANGED

// Get activity statistics for a center
GET /activity-logs/stats/center/center-123
```

### Activity Log Response Format

```typescript
{
  "data": [
    {
      "id": "log-123",
      "type": "USER_CREATED",
      "level": "INFO",
      "scope": "GLOBAL",
      "action": "User account created",
      "description": "User 'john.doe@example.com' created by admin",
      "details": {
        "userEmail": "john.doe@example.com",
        "userName": "John Doe",
        "centerId": "center-123"
      },
      "actorId": "admin-456",
      "targetUserId": "user-789",
      "centerId": "center-123",
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2024-01-01T10:00:00.000Z"
    }
  ],
  "meta": {
    "itemsPerPage": 20,
    "totalItems": 150,
    "currentPage": 1,
    "totalPages": 8
  }
}
```

### Benefits of Activity Logging

- **Audit Trail**: Complete record of all system activities
- **Security Monitoring**: Track suspicious activities and security events
- **Compliance**: Meet regulatory requirements for activity tracking
- **Debugging**: Help identify issues and troubleshoot problems
- **Analytics**: Understand user behavior and system usage patterns
- **Accountability**: Track who performed what actions and when

## Authentication & Authorization

### Authentication Flow

1. **Login**: `POST /auth/login` → Returns access token + refresh token
2. **Token Usage**: Include `Authorization: Bearer <token>` in requests
3. **Token Refresh**: `POST /auth/refresh` → Get new access token
4. **Logout**: `POST /auth/logout` → Invalidate tokens

### Authorization Headers

```typescript
// Required for all protected endpoints
headers: {
  'Authorization': 'Bearer <access_token>',
  'Content-Type': 'application/json'
}
```

### Scope Headers (Optional)

```typescript
// For center-scoped operations
headers: {
  'X-Scope': 'CENTER',
  'X-Center-Id': '<center_id>'
}
```

## Core Concepts

### 1. Scopes

The system supports two scopes for operations:

- **`ADMIN`**: Global scope - can access all data across centers
- **`CENTER`**: Center scope - limited to specific center data

### 2. Role Types

```typescript
enum RoleTypeEnum {
  SUPER_ADMIN = 'SUPER_ADMIN', // Highest level - No constraints
  ADMIN = 'ADMIN', // Global admin - Constrained by SuperAdmin
  CENTER_ADMIN = 'CENTER_ADMIN', // Center admin - No constraints within center
  USER = 'USER', // Regular user - Fully constrained
}
```

### 3. Role Hierarchy

```typescript
const ROLE_HIERARCHY = {
  SUPER_ADMIN: 4, // Highest level
  ADMIN: 3, // Global admin
  CENTER_ADMIN: 2, // Center admin
  USER: 1, // Regular user
};
```

### 4. User Types

```typescript
// Note: User creation only creates BaseUser
// Profile types (Teacher, Student, Guardian) are handled by separate modules
enum ProfileType {
  TEACHER = 'Teacher',
  STUDENT = 'Student',
  GUARDIAN = 'Guardian',
}
```

## API Endpoints

### Base URL

```
http://localhost:3000/api
```

### Endpoint Categories

#### Authentication Endpoints

- `POST /auth/login` - User login
- `POST /auth/signup` - User registration
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - User logout
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password
- `POST /auth/verify-email` - Verify email address

#### User Management Endpoints

- `GET /users` - List users with pagination and filtering
- `GET /users/me` - Get current user profile
- `GET /users/:id` - Get user by ID
- `POST /users` - Create new user
- `PATCH /users/me` - Update current user profile
- `PATCH /users/:id/status` - Activate/deactivate user
- `DELETE /users/:id` - Soft delete user
- `POST /users/:id/restore` - Restore deleted user

#### Center Management Endpoints

- `GET /centers` - List centers (admin access only)
- `GET /centers/:id` - Get center by ID
- `POST /centers` - Create new center
- `PATCH /centers/:id` - Update center
- `DELETE /centers/:id` - Soft delete center
- `POST /centers/:id/restore` - Restore deleted center
- `POST /centers/:id/assign-user` - Assign user to center
- `DELETE /centers/:id/users/:userId` - Remove user from center
- `POST /centers/:id/assign-admin` - Assign admin to center
- `DELETE /centers/:id/admins/:adminId` - Remove admin from center

#### Role Management Endpoints

- `GET /roles` - List roles
- `GET /roles/:id` - Get role by ID
- `POST /roles` - Create new role
- `PATCH /roles/:id` - Update role
- `DELETE /roles/:id` - Delete role
- `GET /roles/permissions` - Get permissions (context-aware)
- `GET /roles/users/:userId` - Get user roles
- `POST /roles/:id/users` - Assign role to user
- `DELETE /roles/:id/users/:userId` - Remove role from user

#### Access Control Endpoints

- `GET /access-control/user-access/:userId` - Get user access grants
- `POST /access-control/user-access` - Grant user access
- `DELETE /access-control/user-access/:userId/:targetUserId` - Revoke user access
- `GET /access-control/center-access/:userId` - Get user centers
- `POST /access-control/center-access` - Grant center access
- `DELETE /access-control/center-access/:userId/:centerId` - Revoke center access

## Pagination, Filtering & Sorting

### Pagination Parameters

All list endpoints support pagination with these query parameters:

```typescript
interface PaginationQuery {
  page?: number; // Page number (default: 1)
  limit?: number; // Items per page (default: 20, max: 100)
  search?: string; // Global search term
  sortBy?: string[]; // Sort fields (e.g., ['name:ASC', 'createdAt:DESC'])
  filter?: object; // Field-specific filters
}
```

### Example Pagination Request

```typescript
GET /users?page=1&limit=10&search=john&sortBy=name:ASC&filter[isActive]=true
```

### Available Filters by Endpoint

#### Users (`/users`)

```typescript
// Filterable fields
filter: {
  isActive?: boolean;           // Active/inactive users
  // Note: Profile types (Teacher, Student, Guardian) are handled by separate modules
  // type?: 'Teacher' | 'Student' | 'Guardian';  // User type - not available in base user creation
  roleType?: string;           // Role type
  centerId?: string;           // Center ID
}

// Searchable fields
search: ['name', 'email', 'phone']

// Sortable fields
sortBy: ['name', 'email', 'createdAt', 'updatedAt', 'isActive']
```

#### Centers (`/centers`)

```typescript
// Filterable fields
filter: {
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  isActive?: boolean;
}

// Searchable fields
search: ['name', 'description', 'city', 'state', 'country']

// Sortable fields
sortBy: ['name', 'status', 'currentEnrollment', 'createdAt', 'updatedAt']
```

#### Roles (`/roles`)

```typescript
// Filterable fields
filter: {
  type?: string;               // Role type
  scope?: 'ADMIN' | 'CENTER';  // Role scope
}

// Searchable fields
search: ['name', 'description']

// Sortable fields
sortBy: ['name', 'type', 'createdAt', 'updatedAt']
```

### Advanced Filtering Examples

```typescript
// Get active users in a specific center
GET /users?filter[isActive]=true&filter[centerId]=center-123

// Get centers in a specific city
GET /centers?filter[city]=New York&search=learning

// Get admin roles
GET /roles?filter[type]=ADMIN&sortBy=name:ASC
```

## Error Handling

### Enhanced Error Response Format

All errors follow a consistent format with frontend-friendly fields:

```typescript
interface EnhancedErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path?: string;
  method?: string;
  details?: ErrorDetail[];
  userMessage?: string; // User-friendly message
  actionRequired?: string; // What the user should do
  retryable?: boolean; // Whether the error can be retried
}

interface ErrorDetail {
  field?: string; // Form field name
  value?: any; // Invalid value
  message: string; // Error message
  code?: string; // Error code for handling
  suggestion?: string; // How to fix the issue
}
```

### Common Error Codes

```typescript
const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DUPLICATE_FIELD: 'DUPLICATE_FIELD',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  AUTH_FAILED: 'AUTH_FAILED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  RESOURCE_IN_USE: 'RESOURCE_IN_USE',
  INVALID_OPERATION: 'INVALID_OPERATION',
};
```

### Error Handling Examples

```typescript
// Validation Error
{
  "statusCode": 400,
  "message": "Validation failed",
  "userMessage": "Please check your input and try again.",
  "actionRequired": "Fix the highlighted errors below.",
  "retryable": true,
  "details": [
    {
      "field": "email",
      "value": "invalid-email",
      "message": "Invalid email format",
      "code": "VALIDATION_ERROR",
      "suggestion": "Please enter a valid email address"
    }
  ]
}

// Permission Error
{
  "statusCode": 403,
  "message": "Insufficient permissions to delete user",
  "userMessage": "You don't have permission to delete this user.",
  "actionRequired": "Please contact your administrator if you believe this is an error.",
  "retryable": false
}
```

## Access Control System

### Center Access Logic

#### For Users (`/me` endpoint)

- **Regular Users**: Centers from `UserCenter` (centers they belong to)
- **Center Admins**: Centers they belong to + centers they admin
- **Global Admins**: All centers (global access)

#### For Admins (`/centers` endpoint)

- **Regular Users**: No access (empty result)
- **Center Admins**: Centers they can manage
- **Global Admins**: All centers (global management)

### Access Control Matrix

| User Type        | `/me` Centers                               | `/centers` Access       | Permissions                               |
| ---------------- | ------------------------------------------- | ----------------------- | ----------------------------------------- |
| **Regular User** | Centers they belong to                      | None                    | Limited to assigned permissions           |
| **Center Admin** | Centers they belong to + centers they admin | Centers they can manage | Full access within center                 |
| **Admin**        | All centers                                 | All centers             | Global access (constrained by SuperAdmin) |
| **Super Admin**  | All centers                                 | All centers             | No constraints                            |

### User Access Relationships

```typescript
// User can grant access to other users
interface UserAccess {
  granterUserId: string; // User granting access
  targetUserId: string; // User receiving access
  centerId?: string; // Optional center scope
  grantedAt: Date;
}
```

## Role-Based Permissions

### Permission Structure

```typescript
interface Permission {
  id: string;
  action: string; // e.g., 'user:create', 'center:view'
  description: string;
  isAdmin: boolean; // Whether this is an admin-only permission
}
```

### Common Permissions

```typescript
// User permissions
'user:create'; // Create users
'user:read'; // View users
'user:update'; // Update users
'user:delete'; // Delete users
'user:activate'; // Activate/deactivate users

// Center permissions
'center:create'; // Create centers
'center:read'; // View centers
'center:update'; // Update centers
'center:delete'; // Delete centers
'center:assign-user'; // Assign users to centers
'center:remove-user'; // Remove users from centers

// Role permissions
'role:create'; // Create roles
'role:read'; // View roles
'role:update'; // Update roles
'role:delete'; // Delete roles
'role:assign'; // Assign roles to users

// Permission management
'permission:read'; // View permissions
'permission:assign'; // Assign permissions to roles
```

### Role Constraints

```typescript
const ROLE_CONSTRAINTS = {
  SUPER_ADMIN: {
    needsPermissions: false, // No permission checks needed
    needsAdminCenterAccess: false,
    needsUserAccess: false,
  },
  ADMIN: {
    needsPermissions: true, // Permission checks required
    needsAdminCenterAccess: true, // Admin center access required
    needsUserAccess: true, // User access relationships required
  },
  CENTER_ADMIN: {
    needsPermissions: false, // No permission checks within center
    needsAdminCenterAccess: false,
    needsUserAccess: false,
  },
  USER: {
    needsPermissions: true, // Permission checks required
    needsAdminCenterAccess: false,
    needsUserAccess: true, // User access relationships required
  },
};
```

## Center Management

### Center Entity

```typescript
interface Center {
  id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  isActive: boolean;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  currentEnrollment: number;
  settings?: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Center Operations

#### Creating Centers

```typescript
POST /centers
{
  "name": "ABC Learning Center",
  "description": "A comprehensive learning center",
  "address": "123 Main Street",
  "city": "New York",
  "state": "NY",
  "country": "USA",
  "phone": "+1-555-123-4567",
  "email": "info@abclearning.com",
  "adminInfo": {
    "email": "admin@abclearning.com",
    "name": "John Doe",
    "password": "securePassword123"
  }
}

// Response includes the created center
{
  "id": "center-123",
  "name": "ABC Learning Center",
  "description": "A comprehensive learning center",
  "status": "ACTIVE",
  "currentEnrollment": 0,
  "createdBy": "user-456",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}

// Note: The system automatically:
// 1. Creates the center admin user with the provided adminInfo
// 2. Assigns CENTER_ADMIN role to the admin
// 3. Creates basic roles (Student, Teacher, Assistant) for the center
// 4. Emits events for tracking and additional processing
```

#### Assigning Users to Centers

```typescript
POST /centers/:centerId/assign-user
{
  "userId": "user-123",
  "assignedBy": "admin-456"
}
```

#### Assigning Admins to Centers

```typescript
POST /centers/:centerId/assign-admin
{
  "adminId": "admin-123",
  "grantedBy": "super-admin-456"
}
```

## User Management

### User Entity

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  isEmailVerified: boolean;
  profile?: Profile;
  userRoles: UserRole[];
  userPermissions: UserPermission[];
  centers: UserCenter[];
  createdAt: Date;
  updatedAt: Date;
}
```

### User Operations

#### Creating Users

```typescript
POST /users
{
  "email": "john.doe@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "isActive": true,
  "centerId": "center-123",    // Optional: assign to center
  "roleId": "role-456"         // Optional: assign role
}

// Note: This creates a BaseUser only
// Profile types (Teacher, Student, Guardian) will be handled by separate modules in the future
```

#### Updating User Status

```typescript
PATCH /users/:userId/status
{
  "isActive": false,
  "scopeType": "ADMIN"
}
```

### User Filtering Options

```typescript
// Get users with specific criteria
GET /users?filter[centerId]=center-123&includeCenters=true

// Include related data
GET /users?includePermissions=true&includeUserAccess=true&includeCenters=true

// Note: Profile type filtering (Teacher, Student, Guardian) will be available
// when separate modules are implemented in the future
```

## Best Practices

### 1. Error Handling

```typescript
// Always handle errors with user-friendly messages
try {
  const response = await api.post('/users', userData);
  // Handle success
} catch (error) {
  if (error.response?.data?.userMessage) {
    // Show user-friendly message
    showError(error.response.data.userMessage);

    // Handle field-specific errors
    if (error.response.data.details) {
      error.response.data.details.forEach((detail) => {
        if (detail.field) {
          setFieldError(detail.field, detail.suggestion);
        }
      });
    }
  }
}
```

### 2. Pagination Implementation

```typescript
// Always implement pagination for list endpoints
const fetchUsers = async (page = 1, limit = 20, filters = {}) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...filters,
  });

  const response = await api.get(`/users?${params}`);
  return response.data;
};
```

### 3. Permission Checking

```typescript
// Check permissions before showing actions
const canCreateUser = userPermissions.includes('user:create');
const canDeleteCenter = userPermissions.includes('center:delete');

// Show/hide UI elements based on permissions
{canCreateUser && <Button onClick={createUser}>Create User</Button>}
```

### 4. Scope Awareness

```typescript
// Handle different scopes appropriately
const isGlobalScope = user.scope === 'ADMIN';
const isCenterScope = user.scope === 'CENTER';

// Adjust UI based on scope
if (isGlobalScope) {
  // Show global management options
} else if (isCenterScope) {
  // Show center-specific options
}
```

### 5. Real-time Updates

```typescript
// Implement optimistic updates for better UX
const updateUser = async (userId, data) => {
  // Optimistic update
  setUsers((prev) =>
    prev.map((u) => (u.id === userId ? { ...u, ...data } : u)),
  );

  try {
    await api.patch(`/users/${userId}`, data);
  } catch (error) {
    // Revert on error
    setUsers((prev) => prev.map((u) => (u.id === userId ? originalUser : u)));
    showError('Failed to update user');
  }
};
```

### 6. Form Validation

```typescript
// Use the enhanced error responses for form validation
const handleSubmit = async (formData) => {
  try {
    await api.post('/users', formData);
    showSuccess('User created successfully');
  } catch (error) {
    if (error.response?.data?.details) {
      // Clear previous errors
      clearFieldErrors();

      // Set field-specific errors
      error.response.data.details.forEach((detail) => {
        if (detail.field) {
          setFieldError(detail.field, detail.suggestion);
        }
      });
    }
  }
};
```

## Rate Limiting

The API implements rate limiting:

- **Default**: 10 requests per minute
- **Test Environment**: 1000 requests per minute
- **429 Response**: "Too Many Requests" with retry-after header

## Testing

### Environment Setup

```typescript
// Development
const API_BASE_URL = 'http://localhost:3000/api';

// Production
const API_BASE_URL = 'https://api.yourdomain.com/api';
```

### Authentication Testing

```typescript
// Test login flow
const testLogin = async () => {
  const response = await api.post('/auth/login', {
    email: 'test@example.com',
    password: 'password123',
  });

  // Store tokens
  localStorage.setItem('accessToken', response.data.accessToken);
  localStorage.setItem('refreshToken', response.data.refreshToken);
};
```

This comprehensive guide should help frontend developers understand and effectively work with the LMS backend system. For specific implementation details, refer to the individual endpoint documentation and error handling examples.
