# Center Access Management System

## Overview

The Center Access Management System provides comprehensive APIs for managing user access to centers through the `UserOnCenter` model. This system allows administrators and center managers to grant, revoke, and update user access to specific centers with different roles and activation statuses.

## Database Model

### UserOnCenter

```prisma
model UserOnCenter {
  id        String   @id @default(cuid())
  userId    String
  centerId  String
  roleId    String
  createdBy String
  isActive  Boolean  @default(true) // Center-specific activation status
  metadata  Json?
  user      User     @relation(fields: [userId], references: [id])
  center    Center   @relation(fields: [centerId], references: [id])
  role      Role     @relation(fields: [roleId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## API Endpoints

### Base URL: `/centers/:centerId/access`

### 1. Grant Center Access

**POST** `/centers/:centerId/access/grant`

Grant access to a user for a specific center with a role.

**Request Body:**

```json
{
  "userId": "user-id-123",
  "roleId": "role-id-456",
  "isActive": true,
  "metadata": {
    "notes": "Added for special project",
    "department": "Mathematics"
  }
}
```

**Response:**

```json
{
  "id": "access-id-789",
  "userId": "user-id-123",
  "centerId": "center-id-456",
  "roleId": "role-id-789",
  "createdBy": "admin-user-id",
  "isActive": true,
  "metadata": {
    "notes": "Added for special project",
    "department": "Mathematics"
  },
  "createdAt": "2025-01-23T10:00:00.000Z",
  "updatedAt": "2025-01-23T10:00:00.000Z",
  "user": {
    "id": "user-id-123",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "center": {
    "id": "center-id-456",
    "name": "Bright Future Academy"
  },
  "role": {
    "id": "role-id-789",
    "name": "Teacher"
  }
}
```

### 2. Revoke Center Access

**DELETE** `/centers/:centerId/access/revoke/:userId`

Revoke a user's access to a specific center.

**Response:**

```json
{
  "message": "Center access revoked successfully",
  "user": {
    "id": "user-id-123",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "role": {
    "id": "role-id-789",
    "name": "Teacher"
  }
}
```

### 3. Get User Center Access Details

**GET** `/centers/:centerId/access/user/:userId`

Get detailed information about a user's access to a specific center.

**Response:**

```json
{
  "id": "access-id-789",
  "userId": "user-id-123",
  "centerId": "center-id-456",
  "roleId": "role-id-789",
  "createdBy": "admin-user-id",
  "isActive": true,
  "metadata": {},
  "createdAt": "2025-01-23T10:00:00.000Z",
  "updatedAt": "2025-01-23T10:00:00.000Z",
  "user": {
    "id": "user-id-123",
    "name": "John Doe",
    "email": "john@example.com",
    "isActive": true
  },
  "center": {
    "id": "center-id-456",
    "name": "Bright Future Academy"
  },
  "role": {
    "id": "role-id-789",
    "name": "Teacher",
    "isAdmin": false,
    "permissions": ["teacher:view", "teacher:update"]
  }
}
```

### 5. List Center Users

**GET** `/centers/:centerId/access/users`

Get a list of all users with access to a specific center.

**Response:**

```json
[
  {
    "id": "access-id-789",
    "userId": "user-id-123",
    "centerId": "center-id-456",
    "roleId": "role-id-789",
    "createdBy": "admin-user-id",
    "isActive": true,
    "metadata": {},
    "createdAt": "2025-01-23T10:00:00.000Z",
    "updatedAt": "2025-01-23T10:00:00.000Z",
    "user": {
      "id": "user-id-123",
      "name": "John Doe",
      "email": "john@example.com",
      "isActive": true,
      "createdAt": "2025-01-20T10:00:00.000Z",
      "teacherProfile": {
        "id": "teacher-profile-id",
        "specialization": "Mathematics",
        "experience": 5
      },
      "studentProfile": null,
      "guardianProfile": null
    },
    "role": {
      "id": "role-id-789",
      "name": "Teacher",
      "isAdmin": false
    },
    "userType": "Teacher"
  }
]
```

### 6. Check Center Access

**GET** `/centers/:centerId/access/check/:userId`

Check if a user has active access to a specific center.

**Response:**

```json
{
  "hasAccess": true,
  "centerId": "center-id-456",
  "userId": "user-id-123"
}
```

## Service Methods

### CenterAccessService

The `CenterAccessService` provides the following methods:

#### `grantCenterAccess(centerId, dto, createdBy)`

- Validates center, user, and role existence
- Checks for existing access to prevent duplicates
- Creates new `UserOnCenter` record
- Returns complete access details

#### `revokeCenterAccess(centerId, userId, revokedBy)`

- Validates center and user access existence
- Prevents revoking access from center owner
- Deletes `UserOnCenter` record
- Returns revocation confirmation

#### `updateCenterAccess(centerId, userId, updates, updatedBy)`

- Validates center and user access existence
- Updates role, activation status, or metadata
- Returns updated access details

#### `getUserCenterAccess(centerId, userId)`

- Returns detailed access information including user, center, and role data
- Throws error if access doesn't exist

#### `listCenterUsers(centerId)`

- Returns all users with access to the center
- Includes user profiles and types
- Ordered by creation date (newest first)

#### `hasCenterAccess(centerId, userId)`

- Returns boolean indicating if user has active access
- Only considers active (`isActive: true`) access

#### `getUserCenters(userId)`

- Returns all centers a user has access to
- Only returns active access
- Includes center and role information

## Permissions Required

All endpoints require appropriate permissions:

- **Grant/Revoke/Update Access**: `center:manage-members`
- **View Access Details**: `center:view`
- **List Users**: `center:view`
- **Check Access**: `center:view`

## Business Rules

### 1. Access Validation

- Center must exist and not be deleted
- User must exist
- Role must exist and belong to the center
- Cannot grant duplicate access

### 2. Owner Protection

- Cannot revoke access from center owner
- Owner always has access to their centers

### 3. Activation Status

- `isActive` controls center-specific access
- Deactivated users cannot access center features
- Global activation (`User.isActive`) still applies

### 4. Role Assignment

- Only center-scoped roles can be assigned
- Role must belong to the specific center
- Role determines permissions within the center

## Error Handling

### Common Error Responses

**Center Not Found:**

```json
{
  "statusCode": 404,
  "message": "Center not found"
}
```

**User Not Found:**

```json
{
  "statusCode": 404,
  "message": "User not found"
}
```

**Role Not Found:**

```json
{
  "statusCode": 404,
  "message": "Role not found for this center"
}
```

**Duplicate Access:**

```json
{
  "statusCode": 400,
  "message": "User already has access to this center"
}
```

**Owner Protection:**

```json
{
  "statusCode": 403,
  "message": "Cannot revoke access from center owner"
}
```

**Insufficient Permissions:**

```json
{
  "statusCode": 403,
  "message": "Forbidden"
}
```

## Usage Examples

### Frontend Integration

**Grant Access:**

```typescript
const grantAccess = async (
  centerId: string,
  userId: string,
  roleId: string,
) => {
  const response = await fetch(`/centers/${centerId}/access/grant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      roleId,
      isActive: true,
      metadata: { notes: 'Added via admin panel' },
    }),
  });
  return response.json();
};
```

**Check Access:**

```typescript
const checkAccess = async (centerId: string, userId: string) => {
  const response = await fetch(`/centers/${centerId}/access/check/${userId}`);
  const { hasAccess } = await response.json();
  return hasAccess;
};
```

**List Center Users:**

```typescript
const getCenterUsers = async (centerId: string) => {
  const response = await fetch(`/centers/${centerId}/access/users`);
  const users = await response.json();
  return users.filter((user) => user.isActive); // Only active users
};
```

### Backend Integration

**Service Usage:**

```typescript
@Injectable()
export class MyService {
  constructor(private centerAccessService: CenterAccessService) {}

  async addTeacherToCenter(
    centerId: string,
    teacherId: string,
    roleId: string,
  ) {
    return this.centerAccessService.grantCenterAccess(
      centerId,
      {
        userId: teacherId,
        roleId,
        isActive: true,
        metadata: { addedBy: 'teacher-assignment' },
      },
      'system-user-id',
    );
  }

  async deactivateUserInCenter(centerId: string, userId: string) {
    return this.centerAccessService.updateCenterAccess(
      centerId,
      userId,
      { isActive: false },
      'admin-user-id',
    );
  }
}
```

## Security Considerations

1. **Permission Checks**: All endpoints verify user permissions
2. **Owner Protection**: Center owners cannot be removed
3. **Scope Validation**: Roles must belong to the specific center
4. **Audit Trail**: All changes are logged with user information
5. **Transaction Safety**: Critical operations use database transactions

## Monitoring and Logging

All access management operations are logged with:

- Operation type (grant, revoke, update)
- User performing the action
- Target user and center
- Timestamp and metadata

Example log entries:

```
Granted center access: User user-123 to Center center-456 with role role-789 by admin-user
Revoked center access: User user-123 from Center center-456 by admin-user
Updated center access: User user-123 in Center center-456 by admin-user
```
