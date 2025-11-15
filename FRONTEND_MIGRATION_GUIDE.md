# Frontend Migration Guide: UserProfile Centralization Refactor

## Overview

The backend has been refactored to centralize all profile CRUD operations in the `/user-profiles` endpoint. The `/staff` and `/admin` endpoints are now **read-only** (GET operations only). All create, update, delete, and status operations must now use the unified `/user-profiles` endpoint.

**Migration Deadline**: All frontend code using old endpoints should be migrated before the next release.

---

## Breaking Changes Summary

### ❌ Removed Endpoints (No Longer Available)

| Old Endpoint | Method | Replacement |
|-------------|--------|-------------|
| `/staff` | POST | `POST /user-profiles` (with `profileType: "Staff"`) |
| `/staff/:id` | PUT | `PUT /user-profiles/:id` |
| `/staff/:id/status` | PATCH | `PATCH /user-profiles/:id/status` |
| `/staff/:id` | DELETE | `DELETE /user-profiles/:id` |
| `/staff/:id/restore` | PATCH | `PATCH /user-profiles/:id/restore` |
| `/admin` | POST | `POST /user-profiles` (with `profileType: "Admin"`) |
| `/admin/:id` | PUT | `PUT /user-profiles/:id` |
| `/admin/:id/status` | PATCH | `PATCH /user-profiles/:id/status` |
| `/admin/:id` | DELETE | `DELETE /user-profiles/:id` |
| `/admin/:id/restore` | PATCH | `PATCH /user-profiles/:id/restore` |

### ✅ Unchanged Endpoints (Still Work)

| Endpoint | Method | Status |
|----------|--------|--------|
| `/staff` | GET | ✅ Still works (read-only) |
| `/staff/:id` | GET | ✅ Still works (read-only) |
| `/admin` | GET | ✅ Still works (read-only) |
| `/admin/:id` | GET | ✅ Still works (read-only) |
| `/user-profiles` | GET | ✅ Still works |
| `/user-profiles/:id` | GET | ✅ Still works |
| `/user-profiles/:id/status` | PATCH | ✅ Still works |
| `/user-profiles/:id` | DELETE | ✅ Still works |
| `/user-profiles/:id/restore` | PATCH | ✅ Still works |

---

## New Unified Endpoints

### 1. Create Profile (Any Type)

**Endpoint**: `POST /user-profiles`

**Request Body**:
```typescript
{
  // User fields (from CreateUserDto)
  phone: string;                    // Required
  name: string;                     // Required
  email?: string;                   // Optional
  password: string;                 // Required
  isActive?: boolean;               // Optional, default: true
  
  // UserInfo fields
  userInfo: {
    address?: string;
    dateOfBirth?: string;           // ISO date string
    locale?: "AR" | "EN";           // Optional
  };
  
  // NEW: Profile-specific fields
  profileType: "Staff" | "Admin" | "Teacher" | "Student" | "Parent";  // Required
  centerId?: string;                 // Optional, required for STAFF/TEACHER if roleId provided
  roleId?: string;                   // Optional, requires centerId for STAFF/TEACHER
}
```

**Validation Rules**:
- `profileType` is **required**
- For `ADMIN`: `centerId` is **not allowed**
- For `STAFF`/`TEACHER`: `centerId` is **optional** (defaults to actor's center)
- If `roleId` is provided for `STAFF`/`TEACHER`, `centerId` must also be provided
- For `ADMIN`, `roleId` can be provided without `centerId` (global role)

**Response**:
```typescript
{
  success: true;
  data: null;
  message: "Profile created successfully";
  timestamp: string;
}
```

**Example: Create Staff**
```typescript
// OLD WAY (No longer works)
POST /staff
{
  phone: "01234567890",
  name: "John Doe",
  password: "password123",
  userInfo: { locale: "AR" },
  centerId: "uuid-here",
  roleId: "role-uuid"
}

// NEW WAY
POST /user-profiles
{
  phone: "01234567890",
  name: "John Doe",
  password: "password123",
  userInfo: { locale: "AR" },
  profileType: "Staff",        // ← NEW: Required
  centerId: "uuid-here",
  roleId: "role-uuid"
}
```

**Example: Create Admin**
```typescript
// OLD WAY (No longer works)
POST /admin
{
  phone: "01234567890",
  name: "Admin User",
  password: "password123",
  userInfo: { locale: "AR" },
  roleId: "role-uuid"          // Global role
}

// NEW WAY
POST /user-profiles
{
  phone: "01234567890",
  name: "Admin User",
  password: "password123",
  userInfo: { locale: "AR" },
  profileType: "Admin",        // ← NEW: Required
  roleId: "role-uuid"          // Global role (no centerId allowed)
}
```

---

### 2. Update Profile

**Endpoint**: `PUT /user-profiles/:id`

**Request Body**:
```typescript
{
  name?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;         // ISO date string
}
```

**Response**:
```typescript
{
  success: true;
  data: UserResponseDto;        // Updated user object
  message: "Profile updated successfully";
  timestamp: string;
}
```

**Example: Update Staff**
```typescript
// OLD WAY (No longer works)
PUT /staff/:userProfileId
{
  name: "Updated Name",
  phone: "01234567891"
}

// NEW WAY
PUT /user-profiles/:userProfileId
{
  name: "Updated Name",
  phone: "01234567891"
}
```

**Note**: The endpoint now uses `:id` (userProfileId) instead of `:userProfileId` in the path, but the parameter name is the same.

---

### 3. Activate/Deactivate Profile

**Endpoint**: `PATCH /user-profiles/:id/status`

**Request Body**:
```typescript
{
  isActive: boolean;
}
```

**Response**:
```typescript
{
  success: true;
  data: {
    id: string;
    isActive: boolean;
  };
  message: "Profile status updated";
  timestamp: string;
}
```

**Example**:
```typescript
// OLD WAY (No longer works)
PATCH /staff/:userProfileId/status
{
  isActive: false
}

// NEW WAY
PATCH /user-profiles/:userProfileId/status
{
  isActive: false
}
```

---

### 4. Delete Profile

**Endpoint**: `DELETE /user-profiles/:id`

**Response**:
```typescript
{
  success: true;
  data: {
    id: string;
  };
  message: "Profile deleted successfully";
  timestamp: string;
}
```

**Example**:
```typescript
// OLD WAY (No longer works)
DELETE /staff/:userProfileId

// NEW WAY
DELETE /user-profiles/:userProfileId
```

---

### 5. Restore Profile

**Endpoint**: `PATCH /user-profiles/:id/restore`

**Response**:
```typescript
{
  success: true;
  data: {
    id: string;
  };
  message: "Profile restored successfully";
  timestamp: string;
}
```

**Example**:
```typescript
// OLD WAY (No longer works)
PATCH /staff/:userProfileId/restore

// NEW WAY
PATCH /user-profiles/:userProfileId/restore
```

---

## Migration Steps

### Step 1: Update API Service/Client Files

Find all API service files that call the old endpoints and update them:

**Before**:
```typescript
// staff.service.ts
async createStaff(data: CreateStaffDto) {
  return this.http.post('/staff', data);
}

async updateStaff(id: string, data: UpdateStaffDto) {
  return this.http.put(`/staff/${id}`, data);
}

async deleteStaff(id: string) {
  return this.http.delete(`/staff/${id}`);
}
```

**After**:
```typescript
// staff.service.ts (or user-profile.service.ts)
async createStaff(data: CreateStaffDto) {
  return this.http.post('/user-profiles', {
    ...data,
    profileType: 'Staff'  // ← Add this
  });
}

async updateStaff(id: string, data: UpdateStaffDto) {
  return this.http.put(`/user-profiles/${id}`, data);
}

async deleteStaff(id: string) {
  return this.http.delete(`/user-profiles/${id}`);
}
```

### Step 2: Update DTOs/Interfaces

Update your TypeScript interfaces to include the new `profileType` field:

**Before**:
```typescript
interface CreateStaffDto {
  phone: string;
  name: string;
  password: string;
  email?: string;
  userInfo: UserInfoDto;
  centerId?: string;
  roleId?: string;
}
```

**After**:
```typescript
interface CreateUserProfileDto {
  phone: string;
  name: string;
  password: string;
  email?: string;
  userInfo: UserInfoDto;
  profileType: 'Staff' | 'Admin' | 'Teacher' | 'Student' | 'Parent';  // ← NEW
  centerId?: string;
  roleId?: string;
}

// Or keep separate DTOs but extend base
interface CreateStaffDto extends CreateUserProfileDto {
  profileType: 'Staff';  // Fixed type
}
```

### Step 3: Update Form Components

Update any forms that create/update staff or admin to include `profileType`:

**Before**:
```typescript
// StaffForm.tsx
const handleSubmit = (data: CreateStaffDto) => {
  staffService.createStaff(data);
};
```

**After**:
```typescript
// StaffForm.tsx
const handleSubmit = (data: CreateStaffDto) => {
  staffService.createStaff({
    ...data,
    profileType: 'Staff'  // ← Add this
  });
};
```

### Step 4: Update Error Handling

The error responses remain the same, but endpoint paths in error messages will change:

**Before**:
```
Error: POST /staff failed with status 400
```

**After**:
```
Error: POST /user-profiles failed with status 400
```

### Step 5: Update API Documentation/Comments

Update any API documentation, comments, or Swagger references:

**Before**:
```typescript
/**
 * Creates a new staff member
 * @endpoint POST /staff
 */
```

**After**:
```typescript
/**
 * Creates a new staff member
 * @endpoint POST /user-profiles (with profileType: 'Staff')
 */
```

---

## Common Migration Patterns

### Pattern 1: Create Staff with Center and Role

**Before**:
```typescript
const createStaff = async (data: {
  phone: string;
  name: string;
  password: string;
  centerId: string;
  roleId: string;
}) => {
  return api.post('/staff', {
    phone: data.phone,
    name: data.name,
    password: data.password,
    userInfo: { locale: 'AR' },
    centerId: data.centerId,
    roleId: data.roleId
  });
};
```

**After**:
```typescript
const createStaff = async (data: {
  phone: string;
  name: string;
  password: string;
  centerId: string;
  roleId: string;
}) => {
  return api.post('/user-profiles', {
    phone: data.phone,
    name: data.name,
    password: data.password,
    userInfo: { locale: 'AR' },
    profileType: 'Staff',  // ← Add this
    centerId: data.centerId,
    roleId: data.roleId
  });
};
```

### Pattern 2: Create Admin (No Center)

**Before**:
```typescript
const createAdmin = async (data: {
  phone: string;
  name: string;
  password: string;
  roleId?: string;
}) => {
  return api.post('/admin', {
    ...data,
    userInfo: { locale: 'AR' },
    // centerId should not be included
  });
};
```

**After**:
```typescript
const createAdmin = async (data: {
  phone: string;
  name: string;
  password: string;
  roleId?: string;
}) => {
  return api.post('/user-profiles', {
    ...data,
    userInfo: { locale: 'AR' },
    profileType: 'Admin',  // ← Add this
    // centerId should not be included (will be rejected if provided)
  });
};
```

### Pattern 3: Update Profile

**Before**:
```typescript
const updateStaff = async (id: string, data: UpdateStaffDto) => {
  return api.put(`/staff/${id}`, data);
};

const updateAdmin = async (id: string, data: UpdateAdminDto) => {
  return api.put(`/admin/${id}`, data);
};
```

**After**:
```typescript
// Both can use the same endpoint now
const updateProfile = async (id: string, data: UpdateUserProfileDto) => {
  return api.put(`/user-profiles/${id}`, data);
};

// Or keep separate functions for clarity
const updateStaff = async (id: string, data: UpdateStaffDto) => {
  return api.put(`/user-profiles/${id}`, data);
};

const updateAdmin = async (id: string, data: UpdateAdminDto) => {
  return api.put(`/user-profiles/${id}`, data);
};
```

### Pattern 4: Toggle Status

**Before**:
```typescript
const toggleStaffStatus = async (id: string, isActive: boolean) => {
  return api.patch(`/staff/${id}/status`, { isActive });
};

const toggleAdminStatus = async (id: string, isActive: boolean) => {
  return api.patch(`/admin/${id}/status`, { isActive });
};
```

**After**:
```typescript
// Unified endpoint
const toggleProfileStatus = async (id: string, isActive: boolean) => {
  return api.patch(`/user-profiles/${id}/status`, { isActive });
};
```

---

## Validation Rules Reference

### For Creating Staff/Teacher Profiles

✅ **Valid**:
```typescript
{
  profileType: 'Staff',
  centerId: 'uuid',      // Optional, but recommended
  roleId: 'uuid'         // Requires centerId if provided
}
```

❌ **Invalid**:
```typescript
{
  profileType: 'Staff',
  roleId: 'uuid'         // Error: roleId requires centerId
  // Missing centerId
}
```

### For Creating Admin Profiles

✅ **Valid**:
```typescript
{
  profileType: 'Admin',
  roleId: 'uuid'         // Global role, no centerId needed
}
```

❌ **Invalid**:
```typescript
{
  profileType: 'Admin',
  centerId: 'uuid'       // Error: Admin cannot have centerId
}
```

---

## Testing Checklist

After migration, verify the following:

- [ ] Create Staff profile works
- [ ] Create Admin profile works
- [ ] Create Staff with centerId and roleId works
- [ ] Create Admin with roleId (no centerId) works
- [ ] Create Admin with centerId fails (validation error)
- [ ] Create Staff with roleId but no centerId fails (validation error)
- [ ] Update Staff profile works
- [ ] Update Admin profile works
- [ ] Toggle Staff status works
- [ ] Toggle Admin status works
- [ ] Delete Staff profile works
- [ ] Delete Admin profile works
- [ ] Restore Staff profile works
- [ ] Restore Admin profile works
- [ ] List Staff (GET /staff) still works
- [ ] List Admin (GET /admin) still works
- [ ] Get single Staff (GET /staff/:id) still works
- [ ] Get single Admin (GET /admin/:id) still works

---

## Error Handling

### Common Errors

**1. Missing profileType**
```json
{
  "statusCode": 400,
  "message": ["profileType must be an enum value"],
  "error": "Bad Request"
}
```

**2. Admin with centerId**
```json
{
  "statusCode": 400,
  "message": ["Admin cannot be assigned to a specific center"],
  "error": "Bad Request"
}
```

**3. Staff/Teacher with roleId but no centerId**
```json
{
  "statusCode": 400,
  "message": ["roleId can only be provided when centerId is also provided for STAFF/TEACHER profiles"],
  "error": "Bad Request"
}
```

**4. Endpoint Not Found (Old Endpoints)**
```json
{
  "statusCode": 404,
  "message": "Cannot POST /staff",
  "error": "Not Found"
}
```

---

## Rollback Plan

If issues are discovered after migration:

1. **Temporary**: The backend can temporarily restore old endpoints (not recommended)
2. **Better**: Fix frontend code to use new endpoints correctly
3. **Best**: Test thoroughly in staging before production deployment

---

## Support

If you encounter issues during migration:

1. Check this guide first
2. Review the API documentation (Swagger)
3. Check backend logs for validation errors
4. Contact the backend team with:
   - Endpoint being called
   - Request body
   - Error response
   - Expected vs actual behavior

---

## Summary

**Key Changes**:
1. ✅ All profile creation now uses `POST /user-profiles` with `profileType` field
2. ✅ All profile updates now use `PUT /user-profiles/:id`
3. ✅ All status toggles now use `PATCH /user-profiles/:id/status`
4. ✅ All deletions now use `DELETE /user-profiles/:id`
5. ✅ All restores now use `PATCH /user-profiles/:id/restore`
6. ✅ Read operations (GET) remain unchanged on `/staff` and `/admin`

**Migration Effort**: Medium
- Requires updating API service files
- Requires adding `profileType` field to create requests
- Requires updating endpoint paths for write operations
- Read operations require no changes

**Estimated Time**: 2-4 hours for a typical frontend codebase

---

**Last Updated**: [Current Date]
**Backend Version**: After UserProfile Centralization Refactor

