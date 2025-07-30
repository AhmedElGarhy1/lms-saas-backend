# Role Hierarchy System - Constraint-Based Approach

## Overview

The LMS backend implements a **constraint-based role hierarchy** with four distinct role types, each with specific constraints rather than permissions.

## Role Types & Constraints

### 1. Super Administrator (SUPER_ADMIN)

- **Scope**: Global
- **Constraints**: **NONE** - sees everything
- **Access Control**: No permissions, no AdminCenterAccess, no UserAccess needed
- **Use Case**: System owner, highest level administrator

### 2. Administrator (ADMIN)

- **Scope**: Global
- **Constraints**: **FULL** - constrained by SuperAdmin
- **Access Control**: Needs permissions + AdminCenterAccess + UserAccess
- **Use Case**: System administrators who help manage the platform

### 3. Center Administrator (CENTER_ADMIN)

- **Scope**: Center-specific
- **Constraints**: **NONE within their center** - sees everything
- **Access Control**: No permissions needed within center, no UserAccess needed
- **Use Case**: Center owners, school principals, institution managers

### 4. Regular User (USER)

- **Scope**: Center-specific
- **Constraints**: **FULL** - fully constrained
- **Access Control**: Needs permissions + UserAccess
- **Use Case**: Teachers, students, staff members

## Hierarchy Structure

```
SUPER_ADMIN (Level 4) - No constraints, sees everything
    ↓
ADMIN (Level 3) - Constrained by SuperAdmin
    ↓
CENTER_ADMIN (Level 2) - No constraints within center
    ↓
USER (Level 1) - Fully constrained
```

## Constraint Matrix

| Role Type       | Permissions                   | AdminCenterAccess | UserAccess    | Description                      |
| --------------- | ----------------------------- | ----------------- | ------------- | -------------------------------- |
| **SuperAdmin**  | ❌ Not needed                 | ❌ Not needed     | ❌ Not needed | No constraints - sees everything |
| **Admin**       | ✅ Required                   | ✅ Required       | ✅ Required   | Constrained by SuperAdmin        |
| **CenterAdmin** | ❌ Not needed (within center) | ❌ Not needed     | ❌ Not needed | No constraints within center     |
| **User**        | ✅ Required                   | ❌ Not needed     | ✅ Required   | Fully constrained                |

## Database Schema Changes

### New Enum: RoleType

```sql
enum RoleType {
  SUPER_ADMIN
  ADMIN
  CENTER_ADMIN
  USER
}
```

### Updated Role Model

```prisma
model Role {
  id          String   @id @default(uuid())
  name        String   @unique
  type        RoleType @default(USER)  // NEW FIELD
  isAdmin     Boolean  @default(false)
  metadata    Json?
  permissions Json?
  scope       RoleScope @default(ADMIN)
  centerId    String?
  createdAt   DateTime @default(now())  // NEW FIELD
  updatedAt   DateTime @updatedAt       // NEW FIELD
}
```

### New Model: AdminCenterAccess

```prisma
model AdminCenterAccess {
  id        String   @id @default(uuid())
  adminId   String   // Admin user ID
  centerId  String   // Center ID the admin can access
  grantedBy String   // SuperAdmin who granted this access
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  admin     User     @relation("AdminCenterAccess", fields: [adminId], references: [id])
  center    Center   @relation("AdminCenterAccess", fields: [centerId], references: [id])
  granter   User     @relation("AdminCenterAccessGranter", fields: [grantedBy], references: [id])

  @@unique([adminId, centerId])
}
```

## Access Control Logic

### SuperAdmin Access

- **No permission checks** - sees everything
- **No center access checks** - can access any center
- **No user access checks** - can access any user

### Admin Access

- **Permission checks required** - needs specific permissions
- **AdminCenterAccess required** - SuperAdmin must grant center access
- **UserAccess required** - needs explicit user access grants

### CenterAdmin Access

- **Within their center**: No permission checks - sees everything
- **Other centers**: Treated as their role in that center (if they have access)
- **No UserAccess needed** - can access users within their scope

### User Access

- **Permission checks required** - needs specific permissions
- **UserAccess required** - needs explicit user access grants
- **No AdminCenterAccess** - not applicable for users

## Implementation Details

### Constants

- `RoleTypeEnum`: Defines the four role types
- `ROLE_HIERARCHY`: Maps role types to hierarchy levels
- `ROLE_DESCRIPTIONS`: Human-readable descriptions
- `ROLE_SCOPES`: Maps role types to their scope (ADMIN/CENTER)
- `ROLE_CONSTRAINTS`: Defines what constraints each role type has

### Service Methods

- `hasCenterAccess()`: Check if user has access to a center based on role constraints
- `needsPermissionCheck()`: Check if user needs permission validation
- `needsUserAccessCheck()`: Check if user needs UserAccess validation
- `grantAdminCenterAccess()`: Grant AdminCenterAccess to an admin
- `revokeAdminCenterAccess()`: Revoke AdminCenterAccess from an admin

### Validation Logic

```typescript
// Example: Checking if user can access a center
const hasAccess = await accessControlService.hasCenterAccess(userId, centerId);

// Example: Checking if permission validation is needed
const needsPermission = await accessControlService.needsPermissionCheck(
  userId,
  centerId,
);

// Example: Checking if UserAccess validation is needed
const needsUserAccess = await accessControlService.needsUserAccessCheck(
  userId,
  targetUserId,
);
```

## Usage Examples

### Creating a Super Admin Role

```typescript
await accessControlService.createRole({
  name: 'Super Administrator',
  type: 'SUPER_ADMIN',
  scope: 'ADMIN',
  isAdmin: true,
  permissions: [], // No permissions needed
});
```

### Creating a Center Admin Role

```typescript
await accessControlService.createRole({
  name: 'School Principal',
  type: 'CENTER_ADMIN',
  scope: 'CENTER',
  centerId: 'center-uuid',
  isAdmin: true,
  permissions: [], // No permissions needed within center
});
```

### Granting Admin Center Access

```typescript
// SuperAdmin grants Admin access to a center
await accessControlService.grantAdminCenterAccess(
  adminId,
  centerId,
  superAdminId,
);
```

### Checking Access Constraints

```typescript
// Check if user needs permission validation
const needsPermission = await accessControlService.needsPermissionCheck(
  userId,
  centerId,
);

// Check if user needs UserAccess validation
const needsUserAccess = await accessControlService.needsUserAccessCheck(
  userId,
  targetUserId,
);
```

## Migration Notes

1. The new `type` field has a default value of `USER`
2. Existing roles will need to be updated with appropriate types
3. The seed file creates default roles for each type with empty permissions for SuperAdmin and CenterAdmin
4. Role constraints are enforced through service methods rather than permission arrays

## Security Considerations

- **SuperAdmin**: No constraints - highest security level, use sparingly
- **Admin**: Fully constrained - requires explicit grants from SuperAdmin
- **CenterAdmin**: No constraints within center - powerful within scope
- **User**: Fully constrained - requires explicit permissions and access grants
- **Constraint validation** occurs at multiple levels (service, guard, decorator)
- **Access grants** are auditable with timestamps and granter information
