# Access Control Performance Problem Analysis

## Executive Summary

The access control system in this codebase suffers from severe N+1 query problems and lack of caching, resulting in hundreds or thousands of redundant database queries for a single request. The problem manifests most severely in batch operations and complex business logic flows.

---

## Problem Categories

### 1. N+1 Query Problem in Batch Operations

#### Example 1: `getAccessibleProfilesIdsForBranch`

**Location**: `src/modules/centers/services/branch-access.service.ts:89-104`

```typescript
async getAccessibleProfilesIdsForBranch(
  branchId: string,
  targetProfileIds: string[],
  centerId: string,
): Promise<string[]> {
  return Promise.all(
    targetProfileIds.map(async (targetProfileId) => {
      const canAccess = await this.canBranchAccess({
        userProfileId: targetProfileId,
        centerId,
        branchId,
      });
      return canAccess ? targetProfileId : null;
    }),
  ).then((results) => results.filter((result) => result !== null));
}
```

**Problem**: For each profile ID in the array, this calls `canBranchAccess`, which in turn makes multiple database queries. If you have 100 profile IDs, this results in 100+ database queries.

**Query Breakdown per Profile**:

- `canBranchAccess` calls `bypassCenterInternalAccess` (3-4 queries)
- `bypassCenterInternalAccess` calls:
  - `isSuperAdmin(userProfileId)` → **1 DB query**
  - `isCenterOwner(userProfileId, centerId)` → **1 DB query**
  - `findCenterAccess({userProfileId, centerId})` → **1 DB query**
  - `isAdmin(userProfileId)` → **1 DB query** (if centerAccess exists)
- `canBranchAccess` then calls `findBranchAccess({userProfileId, centerId, branchId})` → **1 DB query**

**Total per profile**: ~5 database queries  
**Total for 100 profiles**: ~500 database queries

---

#### Example 2: `getAccessibleProfilesIdsForCenter`

**Location**: `src/modules/access-control/services/access-control-helper.service.ts:119-132`

```typescript
async getAccessibleProfilesIdsForCenter(
  centerId: string,
  targetProfileIds: string[],
): Promise<string[]> {
  return Promise.all(
    targetProfileIds.map(async (targetProfileId) => {
      const canAccess = await this.canCenterAccess({
        userProfileId: targetProfileId,
        centerId,
      });
      return canAccess ? targetProfileId : null;
    }),
  ).then((results) => results.filter((result) => result !== null));
}
```

**Problem**: Similar to Example 1, but for center access.

**Query Breakdown per Profile**:

- `canCenterAccess` calls `isSuperAdmin(userProfileId)` → **1 DB query**
- `canCenterAccess` calls `findCenterAccess({userProfileId, centerId})` → **1 DB query**

**Total per profile**: ~2 database queries  
**Total for 100 profiles**: ~200 database queries

---

#### Example 3: `getAccessibleProfilesIdsForUser`

**Location**: `src/modules/access-control/services/access-control-helper.service.ts:102-117`

```typescript
async getAccessibleProfilesIdsForUser(
  userProfileId: string,
  targetProfileIds: string[],
  centerId?: string,
): Promise<string[]> {
  return Promise.all(
    targetProfileIds.map(async (targetProfileId) => {
      const canAccess = await this.canUserAccess({
        granterUserProfileId: userProfileId,
        targetUserProfileId: targetProfileId,
        centerId,
      });
      return canAccess ? targetProfileId : null;
    }),
  ).then((results) => results.filter((result) => result !== null));
}
```

**Query Breakdown per Profile**:

- `canUserAccess` calls `bypassCenterInternalAccess(granterUserProfileId, centerId)` → **3-4 DB queries**
- `canUserAccess` calls `findUserAccess(data)` → **1 DB query**

**Total per profile**: ~4-5 database queries  
**Total for 100 profiles**: ~400-500 database queries

---

#### Example 4: `getAccessibleCentersIdsForProfile`

**Location**: `src/modules/access-control/services/access-control-helper.service.ts:172-187`

```typescript
async getAccessibleCentersIdsForProfile(
  userProfileId: string,
  targetCenterIds: string[],
): Promise<string[]> {
  const result = await Promise.all(
    targetCenterIds.map(async (targetCenterId) => {
      const canAccess = await this.canCenterAccess({
        userProfileId,
        centerId: targetCenterId,
      });
      return canAccess ? targetCenterId : null;
    }),
  );
  return result.filter((result) => result !== null);
}
```

**Query Breakdown per Center**:

- `canCenterAccess` calls `isSuperAdmin(userProfileId)` → **1 DB query** (repeated for each center!)
- `canCenterAccess` calls `findCenterAccess({userProfileId, centerId})` → **1 DB query**

**Total per center**: ~2 database queries  
**Total for 50 centers**: ~100 database queries (and `isSuperAdmin` is checked 50 times for the same user!)

---

### 2. Repeated Queries for the Same Data

#### Problem: No Caching of Role Checks

**Location**: Multiple locations, e.g., `bypassCenterInternalAccess`

The methods `isSuperAdmin`, `isCenterOwner`, and `isAdmin` are called repeatedly for the same `userProfileId` within a single request, but the results are never cached.

**Example Flow**:

```typescript
// In bypassCenterInternalAccess (line 350)
const isSuperAdmin = await this.isSuperAdmin(userProfileId); // Query 1

// Later in the same method (line 355)
const isCenterOwner = await this.isCenterOwner(userProfileId, centerId); // Query 2

// Even later (line 364)
const haveAdminRole = await this.isAdmin(userProfileId); // Query 3
```

**But then in `canBranchAccess`** (line 48):

```typescript
const bypassBranchAccess =
  await this.accessControlHelperService.bypassCenterInternalAccess(
    data.userProfileId,
    data.centerId,
  ); // This calls all 3 methods again - Queries 4, 5, 6
```

If `canBranchAccess` is called 100 times (as in `getAccessibleProfilesIdsForBranch`), the same `isSuperAdmin` check runs 100 times for the same user, making 100 identical database queries.

---

#### Problem: `canCenterAccess` Calls `isSuperAdmin` Every Time

**Location**: `src/modules/access-control/services/access-control-helper.service.ts:247-259`

```typescript
async canCenterAccess(
  data: CenterAccessDto,
  isDeleted: boolean = true,
): Promise<boolean> {
  const { userProfileId } = data;
  const isSuperAdmin = await this.isSuperAdmin(userProfileId); // DB Query every time!
  if (isSuperAdmin) {
    return true;
  }
  const centerAccess = await this.findCenterAccess(data, isDeleted);
  return !!centerAccess;
}
```

**Problem**: Even when checking the same `userProfileId` multiple times, `isSuperAdmin` is queried from the database every single time. If this method is called 100 times for the same user, it makes 100 identical database queries.

---

#### Problem: `bypassCenterInternalAccess` Makes Multiple Queries Every Time

**Location**: `src/modules/access-control/services/access-control-helper.service.ts:346-371`

```typescript
async bypassCenterInternalAccess(
  userProfileId: string,
  centerId?: string,
): Promise<boolean> {
  const isSuperAdmin = await this.isSuperAdmin(userProfileId); // Query 1
  if (isSuperAdmin) {
    return true;
  }
  if (centerId) {
    const isCenterOwner = await this.isCenterOwner(userProfileId, centerId); // Query 2
    if (isCenterOwner) {
      return true;
    }
    const centerAccess = await this.centerAccessRepository.findCenterAccess({
      userProfileId,
      centerId,
    }); // Query 3
    if (centerAccess) {
      const haveAdminRole = await this.isAdmin(userProfileId); // Query 4
      if (haveAdminRole) {
        return true;
      }
    }
  }
  return false;
}
```

**Problem**: This method makes 3-4 database queries every time it's called, even if called with the same parameters multiple times within a single request. There's no caching mechanism.

---

### 3. Cascading Query Problems

#### Real-World Scenario: Complex Business Logic

Imagine a scenario where you need to check access for multiple profiles across multiple resources:

```typescript
// Scenario: Check branch access for 50 profiles
const profiles = [
  /* 50 profile IDs */
];
const branchId = 'branch-123';
const centerId = 'center-456';

// This single call triggers:
const accessibleProfiles =
  await branchAccessService.getAccessibleProfilesIdsForBranch(
    branchId,
    profiles,
    centerId,
  );
```

**Query Breakdown**:

For each of the 50 profiles:

1. `canBranchAccess` is called
2. `canBranchAccess` calls `bypassCenterInternalAccess(userProfileId, centerId)`
3. `bypassCenterInternalAccess` makes:
   - `isSuperAdmin(userProfileId)` → Query #1
   - `isCenterOwner(userProfileId, centerId)` → Query #2
   - `findCenterAccess({userProfileId, centerId})` → Query #3
   - `isAdmin(userProfileId)` → Query #4 (if centerAccess exists)
4. `canBranchAccess` then calls `findBranchAccess({userProfileId, centerId, branchId})` → Query #5

**Total**: 50 profiles × 5 queries = **250 database queries**

But wait! If multiple profiles belong to the same user (unlikely but possible), or if `isSuperAdmin` is checked for the same user multiple times, the same queries are repeated.

---

#### Real-World Scenario: Pagination with Access Filtering

**Location**: `src/modules/user/repositories/user.repository.ts`

When paginating users with access filtering:

```typescript
// In paginateStaff or similar methods
if (branchAccess === AccessibleUsersEnum.ALL) {
  const accessibleProfileIds =
    await this.accessControlHelperService.getAccessibleProfilesIdsForBranch(
      branchId,
      userProfileIds, // Could be 20-50 IDs from pagination
      centerId,
    );
  // ... use accessibleProfileIds to filter
}
```

**Problem**: This is called during pagination, meaning:

- Every page load triggers 100-250+ queries
- If the user navigates through multiple pages, this repeats
- The queries are identical for the same profiles across different pages

---

### 4. Double Query Problem in `validateCenterAccess`

**Location**: `src/modules/access-control/services/access-control-helper.service.ts:261-328`

```typescript
async validateCenterAccess(data: CenterAccessDto, config: {...}): Promise<void> {
  // ... center validation ...

  const canAccess = await this.canCenterAccess(data, config.includeDeleted); // Calls findCenterAccess
  if (!canAccess) {
    throw new CenterAccessDeniedException(...);
  }
  const centerAccess = await this.findCenterAccess(data); // Calls findCenterAccess AGAIN!
  // ...
}
```

**Problem**: `canCenterAccess` already calls `findCenterAccess`, but then `validateCenterAccess` calls it again immediately after. This is a redundant database query.

---

## Quantifying the Problem

### Example: Single Request with Branch Access Check

**Scenario**: API endpoint that needs to check branch access for 50 profiles.

**Without Optimization**:

- `getAccessibleProfilesIdsForBranch` called with 50 profile IDs
- Each call to `canBranchAccess` = ~5 queries
- Total: **~250 database queries**

**If the same user's profile appears multiple times** (checking different branches):

- `isSuperAdmin` query repeated for same user: **50 times**
- `isCenterOwner` query repeated for same user+center: **50 times**
- `isAdmin` query repeated for same user: **50 times**

**With some optimization (batch loading + caching)**:

- Load all branch access records in 1 query: **1 query**
- Load all center access records in 1 query: **1 query**
- Load role checks once and cache: **3 queries** (isSuperAdmin, isCenterOwner, isAdmin)
- Total: **~5 database queries**

**Improvement**: From ~250 queries to ~5 queries = **98% reduction**

---

## Impact Areas

### 1. User Listing/Pagination Endpoints

- `GET /users/staff` with branch access filtering
- `GET /users/teachers` with branch access filtering
- `GET /users/students` with branch access filtering

**Impact**: Every page load = hundreds of queries

---

### 2. Bulk Operations

- Assigning multiple profiles to a branch
- Checking access for multiple resources
- Filtering results by access

**Impact**: Operations that should be fast become extremely slow

---

### 3. Complex Business Logic

- Methods like `canAssignProfileToClass` that chain multiple access checks
- Validation flows that check access multiple times
- Middleware/guards that validate access

**Impact**: Each business logic flow triggers cascading queries

---

## Specific Code Locations with Problems

### High-Impact Problem Areas

1. **`branch-access.service.ts:89-104`** - `getAccessibleProfilesIdsForBranch`
   - N+1 queries in loop
   - No batch loading
   - No caching

2. **`access-control-helper.service.ts:119-132`** - `getAccessibleProfilesIdsForCenter`
   - N+1 queries in loop
   - No batch loading
   - No caching

3. **`access-control-helper.service.ts:102-117`** - `getAccessibleProfilesIdsForUser`
   - N+1 queries in loop
   - No batch loading
   - No caching

4. **`access-control-helper.service.ts:172-187`** - `getAccessibleCentersIdsForProfile`
   - N+1 queries in loop
   - No batch loading
   - No caching
   - Repeats `isSuperAdmin` check for same user

5. **`access-control-helper.service.ts:346-371`** - `bypassCenterInternalAccess`
   - Makes 3-4 queries every time
   - No caching
   - Called frequently

6. **`access-control-helper.service.ts:247-259`** - `canCenterAccess`
   - Calls `isSuperAdmin` every time
   - No caching
   - Called frequently

7. **`access-control-helper.service.ts:330-344`** - `isSuperAdmin`, `isCenterOwner`, `isAdmin`
   - No caching
   - Called repeatedly for same user

8. **`access-control-helper.service.ts:261-328`** - `validateCenterAccess`
   - Calls `findCenterAccess` twice (via `canCenterAccess` and directly)

---

## Performance Characteristics

### Current Behavior

- **Time Complexity**: O(n × m) where n = number of profiles/resources, m = number of queries per check
- **Space Complexity**: O(1) - no caching, so constant space
- **Database Load**: Extremely high - hundreds of queries per request
- **Scalability**: Poor - gets exponentially worse with more profiles/resources

### Expected Behavior (After Optimization)

- **Time Complexity**: O(n) for batch operations, O(1) for cached checks
- **Space Complexity**: O(k) where k = number of unique checks in request (acceptable for request-scoped cache)
- **Database Load**: Minimal - 5-10 queries per request regardless of profile count
- **Scalability**: Excellent - scales linearly, not exponentially

---

## Conclusion

The access control system has fundamental architectural issues that cause:

1. **N+1 query problems** in all batch operations
2. **Lack of caching** leading to repeated identical queries
3. **Cascading queries** that multiply quickly in complex scenarios
4. **Redundant queries** where the same data is fetched multiple times

These issues result in:

- **Slow API responses** (hundreds of milliseconds to seconds)
- **High database load** (hundreds of queries per request)
- **Poor scalability** (gets worse with more data)
- **High infrastructure costs** (more database connections needed)

The problems are systematic and affect multiple areas of the codebase, making this a critical performance issue that should be addressed with a comprehensive solution.
