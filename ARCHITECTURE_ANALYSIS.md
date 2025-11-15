# LMS Backend Architecture Analysis

## User, UserProfile, Staff, Admin - Complete System Analysis

---

## 📊 Database Structure & Entity Relationships

### Core Entities

#### 1. **User Entity** (`users` table)

```typescript
- id: UUID (Primary Key)
- email: VARCHAR(255) [nullable, unique]
- phone: VARCHAR(12) [required]
- password: VARCHAR(255) [hashed, excluded from responses]
- name: VARCHAR(255)
- failedLoginAttempts: INT (default: 0)
- lockoutUntil: DATE [nullable]
- twoFactorSecret: VARCHAR(255) [nullable]
- twoFactorEnabled: BOOLEAN (default: false)
- isActive: BOOLEAN (default: true)
- hashedRt: VARCHAR [nullable] - Refresh token hash
- phoneVerified: BOOLEAN (default: false)
- emailVerified: BOOLEAN (default: false)
- createdAt, updatedAt, deletedAt, createdBy, updatedBy
```

**Relations:**

- `OneToMany` → `UserProfile` (cascade: true)
- `OneToOne` → `UserInfo` (cascade: true, eager: true)
- `OneToMany` → `VerificationToken`
- `OneToMany` → `Center` (as creator)

**Purpose:** Core authentication entity. Represents a person in the system.

---

#### 2. **UserInfo Entity** (`user_info` table)

```typescript
- id: UUID (Primary Key)
- userId: UUID [unique, indexed] → Foreign Key to users.id
- address: VARCHAR [nullable]
- dateOfBirth: DATE [nullable]
- locale: ENUM (default: AR)
- createdAt, updatedAt, deletedAt, createdBy, updatedBy
```

**Relations:**

- `OneToOne` → `User` (cascade: true, eager loaded)

**Purpose:** Extended user information (locale, address, DOB). Always created with User.

---

#### 3. **UserProfile Entity** (`user_profiles` table)

```typescript
- id: UUID (Primary Key) - This is the profileId used throughout the system
- userId: UUID [indexed] → Foreign Key to users.id
- profileType: ENUM [indexed] → ProfileType (STAFF, ADMIN, TEACHER, STUDENT, PARENT)
- profileRefId: UUID → Foreign Key to specific profile table (staff.id, admin.id, etc.)
- isActive: BOOLEAN (default: true)
- createdAt, updatedAt, deletedAt, createdBy, updatedBy
```

**Indexes:**

- `userId`
- `profileType`
- `(userId, profileType)` - Composite unique constraint

**Relations:**

- `ManyToOne` → `User`
- `OneToMany` → `UserAccess` (as target and granter)
- `OneToMany` → `CenterAccess`
- `OneToMany` → `BranchAccess`
- `OneToMany` → `ProfileRole`

**Purpose:** Links a User to a specific role/profile type. A User can have multiple UserProfiles (e.g., same person as Staff in one center and Teacher in another).

**Key Concept:** `profileRefId` points to the actual profile record:

- If `profileType = STAFF` → `profileRefId` = `staff.id`
- If `profileType = ADMIN` → `profileRefId` = `admin.id`
- If `profileType = TEACHER` → `profileRefId` = `teacher.id`
- etc.

---

#### 4. **Staff Entity** (`staff` table)

```typescript
- id: UUID (Primary Key)
- createdAt, updatedAt, deletedAt, createdBy, updatedBy
```

**Purpose:** Minimal entity representing a Staff member. Currently no specific fields, but can be extended. Referenced by `UserProfile.profileRefId` when `profileType = STAFF`.

---

#### 5. **Admin Entity** (`admins` table)

```typescript
- id: UUID (Primary Key)
- createdAt, updatedAt, deletedAt, createdBy, updatedBy
```

**Purpose:** Minimal entity representing an Admin. Currently no specific fields, but can be extended. Referenced by `UserProfile.profileRefId` when `profileType = ADMIN`.

---

### Access Control Entities

#### 6. **UserAccess Entity** (`user_access` table)

```typescript
- id: UUID (Primary Key)
- targetUserProfileId: UUID → Foreign Key to user_profiles.id
- granterUserProfileId: UUID → Foreign Key to user_profiles.id
- centerId: UUID [nullable] → Foreign Key to centers.id
- createdAt, updatedAt, deletedAt, createdBy, updatedBy
```

**Unique Constraint:** `(granterUserProfileId, targetUserProfileId, centerId)`

**Purpose:** Tracks who granted access to whom. Represents the relationship where one profile grants access to another profile (optionally within a center).

---

#### 7. **CenterAccess Entity** (`center_access` table)

```typescript
- id: UUID (Primary Key)
- userProfileId: UUID [indexed] → Foreign Key to user_profiles.id
- centerId: UUID [indexed] → Foreign Key to centers.id
- isActive: BOOLEAN (default: true)
- createdAt, updatedAt, deletedAt, createdBy, updatedBy
```

**Unique Constraint:** `(userProfileId, centerId)`

**Purpose:** Grants a UserProfile access to a Center. Controls which profiles can operate within which centers.

---

#### 8. **ProfileRole Entity** (`profile_roles` table)

```typescript
- id: UUID (Primary Key)
- userProfileId: UUID → Foreign Key to user_profiles.id
- roleId: UUID → Foreign Key to roles.id
- centerId: UUID [nullable] → Foreign Key to centers.id (null = global role)
- createdAt, updatedAt, deletedAt, createdBy, updatedBy
```

**Purpose:** Assigns roles to profiles. Roles can be center-specific or global (when centerId is null).

---

## 🔗 Entity Relationship Diagram

```
┌─────────────┐
│    User     │
│  (users)    │
└──────┬──────┘
       │
       │ 1:1 (eager)
       │
       ▼
┌─────────────┐
│  UserInfo   │
│ (user_info) │
└─────────────┘

┌─────────────┐
│    User     │
│  (users)    │
└──────┬──────┘
       │
       │ 1:N (cascade)
       │
       ▼
┌──────────────────┐
│  UserProfile     │
│ (user_profiles)  │◄──┐
└────────┬─────────┘   │
         │             │
         │ profileRefId│
         │             │
         │             │
    ┌────┴────┐   ┌────┴────┐
    │  Staff  │   │  Admin  │
    │ (staff) │   │(admins) │
    └─────────┘   └─────────┘

┌──────────────────┐
│  UserProfile     │
│ (user_profiles)  │
└────────┬─────────┘
         │
         │ 1:N
         │
    ┌────┴────┬──────────────┬──────────────┐
    │         │              │              │
    ▼         ▼              ▼              ▼
┌─────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│UserAccess│ │CenterAccess│ │BranchAccess │ │ProfileRole  │
└─────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

---

## 🎯 ActorUser Type

```typescript
type ActorUser = User & {
  centerId?: string; // Current center context (from x-center-id header)
  profileType: ProfileType; // Current profile type (from x-user-profile-id header)
  userProfileId: string; // Current profile ID (from x-user-profile-id header)
};
```

**Construction Flow:**

1. **JWT Strategy** (`jwt.strategy.ts`):
   - Validates JWT token
   - Extracts `sub` (userId) from payload
   - Fetches `User` entity from database
   - Returns `User` → becomes `request.user`

2. **ProfileGuard** (`profile.guard.ts`):
   - Reads `x-user-profile-id` header
   - Fetches `UserProfile` by `userId` and `userProfileId`
   - Enriches `request.user` with:
     - `userProfileId = profile.id`
     - `profileType = profile.profileType`
   - Sets `RequestContext` with profile info

3. **ContextGuard** (`context.guard.ts`):
   - Reads `x-center-id` header
   - Enriches `request.user` with:
     - `centerId = centerId from header`
   - Validates center access for the profile
   - Sets `RequestContext` with center info

**Result:** `request.user` is now a complete `ActorUser` with:

- All User properties (id, email, phone, name, etc.)
- Current `userProfileId`
- Current `profileType`
- Current `centerId` (context)

---

## 🔄 Endpoint Flow: Creating Staff/Admin

### Example: `POST /staff` (Create Staff)

#### 1. **Request Flow**

```
Client Request
  ↓
JwtAuthGuard (validates JWT, sets request.user = User)
  ↓
ProfileGuard (reads x-user-profile-id, enriches with profileType, userProfileId)
  ↓
ContextGuard (reads x-center-id, validates center access)
  ↓
PermissionsGuard (checks PERMISSIONS.STAFF.CREATE)
  ↓
StaffController.createStaff()
```

#### 2. **Controller** (`staff.controller.ts`)

```typescript
@Post()
@Permissions(PERMISSIONS.STAFF.CREATE)
@Transactional()
async createStaff(
  @Body() dto: CreateStaffDto,
  @GetUser() actorUser: ActorUser,  // Fully populated ActorUser
) {
  await this.staffService.createStaff(dto, actorUser);
  return ControllerResponse.success(null, 'Staff created');
}
```

#### 3. **Service** (`staff.service.ts`)

```typescript
async createStaff(dto: CreateStaffDto, actor: ActorUser): Promise<void> {
  // 1. Create empty Staff entity
  const staff = await this.staffRepository.create({});

  // 2. Emit event (event-driven architecture)
  await this.typeSafeEventEmitter.emitAsync(
    StaffEvents.CREATE,
    new CreateStaffEvent(dto, actor, staff),
  );
}
```

#### 4. **Event Listener** (`staff.listener.ts`)

```typescript
@OnEvent(StaffEvents.CREATE)
async handleCreateStaff(event: CreateStaffEvent) {
  const { dto, actor, staff } = event;

  // 1. Create User entity
  const createdUser = await this.userService.createUser(dto, actor);
  //    - Creates User in users table
  //    - Creates UserInfo in user_info table (cascade)
  //    - Hashes password
  //    - Validates email/phone uniqueness

  // 2. Create UserProfile linking User to Staff
  const userProfile = await this.userProfileService.createUserProfile(
    createdUser.id,        // userId
    ProfileType.STAFF,     // profileType
    staff.id,              // profileRefId → points to staff.id
  );
  //    - Creates UserProfile in user_profiles table
  //    - Links: userId → createdUser.id
  //    - Links: profileRefId → staff.id

  // 3. Grant center access (if centerId provided)
  const centerId = dto.centerId ?? actor.centerId;
  if (centerId) {
    // Grant center access
    await this.typeSafeEventEmitter.emitAsync(
      AccessControlEvents.GRANT_CENTER_ACCESS,
      new GrantCenterAccessEvent(userProfile.id, centerId, actor),
    );
    //    - Creates CenterAccess in center_access table
    //    - Links: userProfileId → userProfile.id
    //    - Links: centerId → centerId

    // Grant user access (who can manage this staff)
    await this.typeSafeEventEmitter.emitAsync(
      AccessControlEvents.GRANT_USER_ACCESS,
      new GrantUserAccessEvent(
        actor.userProfileId,  // granter
        userProfile.id,        // target
        actor,
        centerId,
      ),
    );
    //    - Creates UserAccess in user_access table
    //    - Links: granterUserProfileId → actor.userProfileId
    //    - Links: targetUserProfileId → userProfile.id

    // Assign role (if provided)
    if (dto.roleId) {
      await this.typeSafeEventEmitter.emitAsync(
        AccessControlEvents.ASSIGN_ROLE,
        new AssignRoleEvent(userProfile.id, dto.roleId, actor, centerId),
      );
      //    - Creates ProfileRole in profile_roles table
      //    - Links: userProfileId → userProfile.id
      //    - Links: roleId → dto.roleId
    }
  }

  // 4. Emit UserCreatedEvent (for activity logging, notifications)
  await this.typeSafeEventEmitter.emitAsync(
    UserEvents.CREATED,
    new UserCreatedEvent(createdUser, userProfile, actor),
  );

  // 5. Send phone verification OTP
  if (createdUser.phone && createdUser.id) {
    await this.verificationService.sendPhoneVerification(
      createdUser.id,
      createdUser.getPhone(),
    );
  }
}
```

#### 5. **Database State After Creation**

```
users table:
┌──────┬──────────┬─────────┬──────┐
│  id  │   email  │  phone │ name │
├──────┼──────────┼────────┼──────┤
│ uuid1│ user@... │ 123... │ John │
└──────┴──────────┴────────┴──────┘

user_info table:
┌──────┬─────────┬────────┐
│  id  │ userId  │ locale │
├──────┼─────────┼────────┤
│ uuid2│  uuid1  │   AR   │
└──────┴─────────┴────────┘

staff table:
┌──────┐
│  id  │
├──────┤
│ uuid3│
└──────┘

user_profiles table:
┌──────┬─────────┬─────────────┬──────────────┐
│  id  │ userId  │ profileType │ profileRefId │
├──────┼─────────┼─────────────┼──────────────┤
│ uuid4│  uuid1  │    STAFF    │    uuid3     │
└──────┴─────────┴─────────────┴──────────────┘

center_access table:
┌──────┬──────────────┬──────────┐
│  id  │userProfileId │ centerId│
├──────┼──────────────┼──────────┤
│ uuid5│    uuid4     │  uuid6   │
└──────┴──────────────┴──────────┘

user_access table:
┌──────┬──────────────────────┬──────────────────────┬──────────┐
│  id  │granterUserProfileId │targetUserProfileId   │ centerId │
├──────┼──────────────────────┼──────────────────────┼──────────┤
│ uuid7│   actor.profileId   │       uuid4          │  uuid6   │
└──────┴──────────────────────┴──────────────────────┴──────────┘

profile_roles table (if roleId provided):
┌──────┬──────────────┬──────────┬──────────┐
│  id  │userProfileId│  roleId │ centerId │
├──────┼──────────────┼──────────┼──────────┤
│ uuid8│    uuid4    │  uuid9   │  uuid6   │
└──────┴──────────────┴──────────┴──────────┘
```

---

## 🔄 Endpoint Flow: Reading Staff/Admin

### Example: `GET /staff/:userProfileId`

#### 1. **Request Flow**

```
Client Request (with x-user-profile-id and x-center-id headers)
  ↓
JwtAuthGuard → ProfileGuard → ContextGuard → PermissionsGuard
  ↓
StaffController.findOne()
```

#### 2. **Controller**

```typescript
@Get(':userProfileId')
@Permissions(PERMISSIONS.STAFF.READ)
async findOne(
  @Param('userProfileId', ParseUUIDPipe) userProfileId: string,
  @GetUser() actor: ActorUser,
) {
  return this.staffService.findOne(userProfileId);
}
```

#### 3. **Service**

```typescript
async findOne(userProfileId: string): Promise<User> {
  const user = await this.userService.findOne(userId);
  // Fetches User with relations (userProfiles, userInfo)
  return user;
}
```

**Note:** The service uses `userService.findOne()` which typically:

- Fetches User by ID
- Eager loads UserInfo
- Loads related UserProfiles
- Returns complete User entity

---

## 🔄 Endpoint Flow: Updating Staff/Admin

### Example: `PUT /staff/:userProfileId`

#### 1. **Service Flow**

```typescript
async updateStaff(
  userProfileId: string,
  updateData: UpdateStaffDto,
  actor: ActorUser,
): Promise<User> {
  // 1. Validate access (can actor manage this profile?)
  await this.accessControlHelperService.validateUserAccess({
    granterUserProfileId: actor.userProfileId,
    targetUserProfileId: userProfileId,
  });
  //    - Checks UserAccess table
  //    - Verifies actor has granted access to target profile
  //    - Validates center context if needed

  // 2. Update User entity
  return await this.userService.updateUser(userId, updateData, actor);
  //    - Updates users table
  //    - Updates user_info table if needed
  //    - Emits UserUpdatedEvent
}
```

---

## 🔄 Endpoint Flow: Deleting Staff/Admin

### Example: `DELETE /staff/:userProfileId`

#### 1. **Service Flow**

```typescript
async deleteStaff(userProfileId: string, actor: ActorUser): Promise<void> {
  // 1. Check permissions (only admins can delete)
  const isAdmin = await this.accessControlHelperService.isAdmin(
    actor.userProfileId,
  );
  if (!isAdmin) {
    throw new ForbiddenException();
  }

  // 2. Soft delete User
  await this.userService.deleteUser(userId, actor);
  //    - Sets deletedAt timestamp on users table
  //    - Cascades to user_info (soft delete)
  //    - Emits UserDeletedEvent
  //    - Note: UserProfile, Staff, CenterAccess remain (soft delete handled separately)
}
```

---

## 🔐 Access Control Flow

### How Access is Validated

1. **UserAccess Validation:**

   ```typescript
   // Can actor manage target profile?
   validateUserAccess({
     granterUserProfileId: actor.userProfileId,
     targetUserProfileId: targetProfileId,
   });
   ```

   - Queries `user_access` table
   - Checks if `(granterUserProfileId, targetUserProfileId, centerId)` exists
   - Validates center context if provided

2. **CenterAccess Validation:**

   ```typescript
   // Does profile have access to center?
   validateAdminAndCenterAccess({
     userProfileId: actor.userProfileId,
     centerId: centerId,
   });
   ```

   - Queries `center_access` table
   - Checks if `(userProfileId, centerId)` exists and `isActive = true`

3. **Role Validation:**

   ```typescript
   // What role does profile have in center?
   getProfileRole(userProfileId, centerId?)
   ```

   - Queries `profile_roles` table
   - Returns role (center-specific or global)

---

## 📝 Key Design Patterns

### 1. **Event-Driven Architecture**

- Services emit domain events
- Listeners handle side effects (access control, notifications, activity logs)
- Decouples business logic from infrastructure concerns

### 2. **Profile-Based Access Control**

- Access is granted to **profiles**, not users
- A user can have multiple profiles (different roles in different centers)
- `userProfileId` is the primary identifier for access control operations

### 3. **Soft Deletes**

- All entities use soft deletes (`deletedAt` timestamp)
- Allows data recovery and audit trails

### 4. **Cascade Relationships**

- `User` → `UserInfo` (cascade: true, eager: true)
- `User` → `UserProfile` (cascade: true)
- Ensures data consistency

### 5. **Context-Aware Operations**

- `centerId` from `x-center-id` header sets operation context
- `userProfileId` from `x-user-profile-id` header sets profile context
- Guards validate context before allowing operations

---

## 🎯 Summary: How Everything Connects

1. **User** = Authentication entity (login, password, email, phone)
2. **UserProfile** = Role/Profile entity (links User to Staff/Admin/Teacher/etc.)
3. **Staff/Admin** = Specific profile type entities (minimal, extensible)
4. **ActorUser** = Runtime context (User + current profile + current center)
5. **Access Control** = Profile-based permissions (who can manage whom, which centers)

**Flow:**

- User logs in → JWT contains `userId`
- Client sends `x-user-profile-id` → ProfileGuard enriches with profile
- Client sends `x-center-id` → ContextGuard validates center access
- Endpoints operate on `userProfileId` (not `userId`) for access control
- Services validate access using `UserAccess`, `CenterAccess`, `ProfileRole` tables

---

## 🔍 Database Query Patterns

### Finding User by Profile

```sql
SELECT u.*, ui.*
FROM users u
JOIN user_info ui ON ui.userId = u.id
JOIN user_profiles up ON up.userId = u.id
WHERE up.id = :userProfileId
```

### Finding All Staff in Center

```sql
SELECT u.*, up.*
FROM users u
JOIN user_profiles up ON up.userId = u.id
JOIN center_access ca ON ca.userProfileId = up.id
WHERE up.profileType = 'STAFF'
  AND ca.centerId = :centerId
  AND ca.isActive = true
  AND up.isActive = true
  AND u.isActive = true
```

### Validating Access

```sql
SELECT *
FROM user_access ua
WHERE ua.granterUserProfileId = :actorProfileId
  AND ua.targetUserProfileId = :targetProfileId
  AND (ua.centerId = :centerId OR ua.centerId IS NULL)
```

---

This architecture provides:

- ✅ Flexible multi-role support (one user, multiple profiles)
- ✅ Center-based access control
- ✅ Granular permissions (who can manage whom)
- ✅ Audit trails (soft deletes, activity logs)
- ✅ Event-driven side effects (notifications, logging)
- ✅ Type-safe operations (ActorUser ensures context)

---

## 🌐 API Endpoints Reference

### Authentication Endpoints (`/auth`)

#### Public Endpoints

| Method | Endpoint                | Description                         | Rate Limit | Body                       |
| ------ | ----------------------- | ----------------------------------- | ---------- | -------------------------- |
| `POST` | `/auth/login`           | User login (email/phone + password) | 5/min      | `LoginRequestDto`          |
| `POST` | `/auth/signup`          | User registration (not implemented) | 3/5min     | -                          |
| `POST` | `/auth/refresh`         | Refresh access token                | -          | -                          |
| `POST` | `/auth/forgot-password` | Request password reset              | -          | `ForgotPasswordRequestDto` |
| `POST` | `/auth/reset-password`  | Reset password with token           | -          | `ResetPasswordRequestDto`  |

#### Authenticated Endpoints

| Method | Endpoint                           | Description                                    | Headers Required | Body                                 |
| ------ | ---------------------------------- | ---------------------------------------------- | ---------------- | ------------------------------------ |
| `POST` | `/auth/verify-email`               | Verify email with token                        | -                | `VerifyEmailRequestDto`              |
| `POST` | `/auth/request-email-verification` | Request email verification (current user only) | -                | -                                    |
| `POST` | `/auth/request-phone-verification` | Request phone verification OTP                 | -                | `RequestPhoneVerificationRequestDto` |
| `POST` | `/auth/verify-phone`               | Verify phone with OTP code                     | -                | `VerifyPhoneRequestDto`              |
| `POST` | `/auth/setup-2fa`                  | Setup two-factor authentication                | -                | `TwoFASetupRequestDto`               |
| `POST` | `/auth/verify-2fa`                 | Verify 2FA code                                | -                | `TwoFAVerifyRequestDto`              |
| `POST` | `/auth/logout`                     | User logout (invalidates refresh token)        | -                | -                                    |

**Note:** All authenticated endpoints require:

- `Authorization: Bearer <access_token>`
- `x-user-profile-id: <userProfileId>` (unless `@NoProfile()`)
- `x-center-id: <centerId>` (unless `@NoContext()`)

---

### Staff Management Endpoints (`/staff`)

All endpoints require authentication and `PERMISSIONS.STAFF.*` permissions.

| Method   | Endpoint                        | Description                | Params                    | Body                         | Response                      |
| -------- | ------------------------------- | -------------------------- | ------------------------- | ---------------------------- | ----------------------------- |
| `GET`    | `/staff`                        | List staff with pagination | Query: `PaginateStaffDto` | -                            | Paginated `UserResponseDto[]` |
| `GET`    | `/staff/:userProfileId`         | Get staff by profile ID    | `userProfileId` (UUID)    | -                            | `UserResponseDto`             |
| `POST`   | `/staff`                        | Create new staff member    | -                         | `CreateStaffDto`             | Success message               |
| `PUT`    | `/staff/:userProfileId`         | Update staff information   | `userProfileId` (UUID)    | `UpdateStaffDto`             | `UserResponseDto`             |
| `PATCH`  | `/staff/:userProfileId/status`  | Toggle staff active status | `userProfileId` (UUID)    | `ToggleUserStatusRequestDto` | Status response               |
| `DELETE` | `/staff/:userProfileId`         | Soft delete staff          | `userProfileId` (UUID)    | -                            | Success message               |
| `PATCH`  | `/staff/:userProfileId/restore` | Restore deleted staff      | `userProfileId` (UUID)    | -                            | Success message               |

**CreateStaffDto includes:**

- `email`, `phone`, `name`, `password`
- `userInfo`: `address`, `dateOfBirth`, `locale`
- `centerId` (optional, defaults to actor's center)
- `roleId` (optional)
- `isActive` (default: true)

**Flow:** Creates User → UserProfile (STAFF) → Staff entity → CenterAccess → UserAccess → ProfileRole

---

### Admin Management Endpoints (`/admin`)

All endpoints require authentication and `PERMISSIONS.ADMIN.*` permissions.

| Method   | Endpoint                        | Description                              | Params                    | Body                         | Response                      |
| -------- | ------------------------------- | ---------------------------------------- | ------------------------- | ---------------------------- | ----------------------------- |
| `GET`    | `/admin`                        | List admins with pagination              | Query: `PaginateAdminDto` | -                            | Paginated `UserResponseDto[]` |
| `GET`    | `/admin/:userProfileId`         | Get admin by profile ID                  | `userProfileId` (UUID)    | -                            | `UserResponseDto`             |
| `POST`   | `/admin`                        | Create new admin user                    | -                         | `CreateAdminDto`             | Success message               |
| `PUT`    | `/admin/:userProfileId`         | Update admin information                 | `userProfileId` (UUID)    | `UpdateAdminDto`             | `UserResponseDto`             |
| `PATCH`  | `/admin/:userProfileId/status`  | Toggle admin active status               | `userProfileId` (UUID)    | `ToggleUserStatusRequestDto` | Status response               |
| `DELETE` | `/admin/:userProfileId`         | Soft delete admin (super admin only)     | `userProfileId` (UUID)    | -                            | Success message               |
| `PATCH`  | `/admin/:userProfileId/restore` | Restore deleted admin (super admin only) | `userProfileId` (UUID)    | -                            | Success message               |

**CreateAdminDto includes:**

- `email`, `phone`, `name`, `password`
- `userInfo`: `address`, `dateOfBirth`, `locale`
- `roleId` (optional, global role)
- `isActive` (default: true)

**Flow:** Creates User → UserProfile (ADMIN) → Admin entity → UserAccess → ProfileRole (global)

---

### User Profile Endpoints (`/user-profiles`)

All endpoints require authentication and `PERMISSIONS.ADMIN.*` permissions.

| Method   | Endpoint                     | Description                                  | Params      | Body                         | Response        |
| -------- | ---------------------------- | -------------------------------------------- | ----------- | ---------------------------- | --------------- |
| `GET`    | `/user-profiles`             | List user profiles (current user's profiles) | -           | -                            | `UserProfile[]` |
| `GET`    | `/user-profiles/:id`         | Get user profile by ID                       | `id` (UUID) | -                            | `UserProfile`   |
| `PATCH`  | `/user-profiles/:id/status`  | Update profile status (activate/deactivate)  | `id` (UUID) | `UpdateUserProfileStatusDto` | Status response |
| `DELETE` | `/user-profiles/:id`         | Soft delete user profile                     | `id` (UUID) | -                            | Success message |
| `PATCH`  | `/user-profiles/:id/restore` | Restore deleted profile                      | `id` (UUID) | -                            | Success message |

---

### Profiles Endpoints (`/profiles`)

| Method | Endpoint        | Description                   | Auth | Headers                    | Body               | Response             |
| ------ | --------------- | ----------------------------- | ---- | -------------------------- | ------------------ | -------------------- |
| `GET`  | `/profiles/me`  | Get current user's profile    | ✅   | `@NoContext`, `@NoProfile` | -                  | `ProfileResponseDto` |
| `PUT`  | `/profiles/me`  | Update current user's profile | ✅   | `@NoContext`               | `UpdateProfileDto` | `UserResponseDto`    |
| `GET`  | `/profiles/:id` | Get user profile by user ID   | ✅   | `PERMISSIONS.ADMIN.READ`   | -                  | `ProfileResponseDto` |

**ProfileResponseDto includes:**

- All User fields
- `profileType`
- `profile` (Staff/Admin/Teacher entity)
- `role` (current role in center)
- `center` (current center context)

---

### User Access Endpoints (`/users/access`)

All endpoints require authentication and appropriate permissions.

| Method   | Endpoint        | Description                       | Body            | Permissions                                                                        |
| -------- | --------------- | --------------------------------- | --------------- | ---------------------------------------------------------------------------------- |
| `POST`   | `/users/access` | Grant user access to another user | `UserAccessDto` | `PERMISSIONS.STAFF.GRANT_CENTER_ACCESS` or `PERMISSIONS.ADMIN.GRANT_CENTER_ACCESS` |
| `DELETE` | `/users/access` | Revoke user access                | `UserAccessDto` | Same as above                                                                      |

**UserAccessDto:**

- `granterUserProfileId`: Profile granting access
- `targetUserProfileId`: Profile receiving access
- `centerId`: Optional center context

**Validation:**

- Granter and target must have same `profileType`
- Actor must have permission to grant access for that profile type

---

### Centers Endpoints (`/centers`)

| Method   | Endpoint               | Description                  | Params                      | Body                     | Permissions                  |
| -------- | ---------------------- | ---------------------------- | --------------------------- | ------------------------ | ---------------------------- |
| `POST`   | `/centers`             | Create new center            | -                           | `CreateCenterDto`        | `PERMISSIONS.CENTER.CREATE`  |
| `GET`    | `/centers`             | List centers with pagination | Query: `PaginateCentersDto` | -                        | -                            |
| `GET`    | `/centers/:id`         | Get center by ID             | `id` (UUID)                 | -                        | -                            |
| `PUT`    | `/centers/:id`         | Update center                | `id` (UUID)                 | `UpdateCenterRequestDto` | `PERMISSIONS.CENTER.UPDATE`  |
| `DELETE` | `/centers/:id`         | Soft delete center           | `id` (UUID)                 | -                        | `PERMISSIONS.CENTER.DELETE`  |
| `PATCH`  | `/centers/:id/restore` | Restore deleted center       | `id` (UUID)                 | -                        | `PERMISSIONS.CENTER.RESTORE` |

---

### Roles & Permissions Endpoints (`/roles`)

| Method   | Endpoint                | Description                    | Params                    | Body                   | Permissions                |
| -------- | ----------------------- | ------------------------------ | ------------------------- | ---------------------- | -------------------------- |
| `GET`    | `/roles/permissions/me` | Get current user's permissions | -                         | -                      | -                          |
| `GET`    | `/roles/permissions`    | Get all permissions            | Query: `scope?`           | -                      | -                          |
| `GET`    | `/roles`                | List roles with pagination     | Query: `PaginateRolesDto` | -                      | `PERMISSIONS.ROLE.READ`    |
| `GET`    | `/roles/:id`            | Get role by ID                 | `id` (UUID)               | -                      | `PERMISSIONS.ROLE.READ`    |
| `POST`   | `/roles`                | Create new role                | -                         | `CreateRoleRequestDto` | `PERMISSIONS.ROLE.CREATE`  |
| `PUT`    | `/roles/:id`            | Update role                    | `id` (UUID)               | `UpdateRoleRequestDto` | `PERMISSIONS.ROLE.UPDATE`  |
| `DELETE` | `/roles/:id`            | Soft delete role               | `id` (UUID)               | -                      | `PERMISSIONS.ROLE.DELETE`  |
| `PATCH`  | `/roles/:id/restore`    | Restore deleted role           | `id` (UUID)               | -                      | `PERMISSIONS.ROLE.RESTORE` |
| `POST`   | `/roles/export`         | Export roles to file           | Query: `ExportRolesDto`   | -                      | `PERMISSIONS.ROLE.READ`    |

---

### Activity Log Endpoints (`/activity-logs`)

| Method | Endpoint         | Description                 | Params                           | Auth |
| ------ | ---------------- | --------------------------- | -------------------------------- | ---- |
| `GET`  | `/activity-logs` | Get paginated activity logs | Query: `PaginateActivityLogsDto` | ✅   |

**Note:** Only returns activity logs for the authenticated user.

---

## 🔐 Request Headers

### Required Headers

| Header              | Description             | Required For                     | Example                                |
| ------------------- | ----------------------- | -------------------------------- | -------------------------------------- |
| `Authorization`     | JWT access token        | All authenticated endpoints      | `Bearer eyJhbGc...`                    |
| `x-user-profile-id` | Current user profile ID | Endpoints without `@NoProfile()` | `550e8400-e29b-41d4-a716-446655440000` |
| `x-center-id`       | Current center context  | Endpoints without `@NoContext()` | `550e8400-e29b-41d4-a716-446655440001` |

### Optional Headers

| Header            | Description       | Example            |
| ----------------- | ----------------- | ------------------ |
| `Accept-Language` | Locale preference | `ar`, `en`         |
| `Content-Type`    | Request body type | `application/json` |

---

## 📋 Common Request/Response Patterns

### Pagination

Most list endpoints support pagination:

```typescript
Query Parameters:
- page: number (default: 1)
- limit: number (default: 10, max: 100)
- search?: string (search term)
- sortBy?: string (field to sort by)
- sortOrder?: 'ASC' | 'DESC' (default: 'ASC')
- filters?: Record<string, any> (additional filters)
```

**Response:**

```typescript
{
  items: T[],
  meta: {
    totalItems: number,
    itemCount: number,
    itemsPerPage: number,
    totalPages: number,
    currentPage: number
  }
}
```

### Standard Response Format

```typescript
{
  success: boolean,
  data: T,
  message: string (i18n key),
  timestamp: string (ISO 8601)
}
```

### Error Response Format

```typescript
{
  success: false,
  statusCode: number,
  message: string,
  error: string,
  timestamp: string,
  path: string
}
```

---

## 🎯 Endpoint Flow Summary

### Creation Flow (Staff/Admin)

```
POST /staff or /admin
  ↓
Controller (validates permissions)
  ↓
Service (creates Staff/Admin entity, emits event)
  ↓
Event Listener (creates User → UserProfile → Access Control)
  ↓
Response (success message)
```

### Update Flow

```
PUT /staff/:userProfileId or /admin/:userProfileId
  ↓
Controller (validates permissions)
  ↓
Service (validates access, updates User)
  ↓
Emits UserUpdatedEvent
  ↓
Response (updated User)
```

### Access Control Flow

```
Request with x-user-profile-id and x-center-id
  ↓
JwtAuthGuard (validates JWT, sets request.user)
  ↓
ProfileGuard (enriches with profileType, userProfileId)
  ↓
ContextGuard (validates center access, sets centerId)
  ↓
PermissionsGuard (checks required permissions)
  ↓
Controller (executes endpoint logic)
```

---

## 🔄 Transaction Management

Most write operations use `@Transactional()` decorator:

- Ensures atomicity (all or nothing)
- Automatic rollback on errors
- Uses `@nestjs-cls/transactional` for request-scoped transactions

**Endpoints with transactions:**

- All `POST` (create) endpoints
- All `PUT`/`PATCH` (update) endpoints
- All `DELETE` endpoints
- Auth operations (login, password reset, etc.)

---

## 📊 Rate Limiting

Rate limits are applied using `@RateLimit()` decorator:

| Endpoint       | Limit      | Window      |
| -------------- | ---------- | ----------- |
| `/auth/login`  | 5 requests | 60 seconds  |
| `/auth/signup` | 3 requests | 300 seconds |

Rate limiting uses Redis and supports:

- Sliding window algorithm
- Per-IP and per-user limits
- Configurable limits per endpoint

---

This comprehensive endpoint reference covers all major operations in the LMS backend system.
