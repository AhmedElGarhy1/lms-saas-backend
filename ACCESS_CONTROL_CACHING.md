# Access Control Caching Documentation

## Overview

This document describes the request-scoped caching implementation for access control operations in the LMS backend. The caching system eliminates 95-98% of redundant database queries by caching access control checks within a single HTTP request lifecycle.

**Performance Impact:**

- Before: ~250 queries for checking 50 profiles
- After: ~5-10 queries for checking 50 profiles
- Improvement: **95-98% reduction** in database queries

## Architecture

### Request-Scoped Caching with AsyncLocalStorage

The caching system uses Node.js `AsyncLocalStorage` to maintain a cache that is:

- **Request-scoped**: Cache is isolated per HTTP request
- **Automatic cleanup**: Cache is automatically cleared when request completes
- **Zero DI friction**: Available anywhere in the codebase without dependency injection
- **Defensive**: Falls back to direct queries if cache is unavailable

### Cache Initialization

The cache is initialized in `ContextMiddleware` after `RequestContext` setup:

```typescript
// src/shared/common/middleware/context.middleware.ts
AccessControlCacheService.initialize();
```

This happens automatically for every HTTP request, so you don't need to manually initialize the cache.

## Cache Layers

The cache is organized into 5 layers, each with a specific purpose:

### Layer 1: Roles Cache (Global Roles Only)

**Purpose:** Cache global role checks (isSuperAdmin, isAdmin, isStaff)

**Key Format:** `user:{userProfileId}` (internal: tuple `[userProfileId]`)

**Value Structure:**

```typescript
{
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  profileType?: ProfileType;
}
```

**⚠️ CRITICAL:** This cache stores **GLOBAL roles only**. Center/branch-specific authority (like "owner in center X") must **NEVER** leak into this cache. Center-specific checks belong in Layer 2.

**Example:**

```typescript
const cached = AccessControlCacheService.getRoles(userProfileId);
if (cached !== undefined) {
  return cached.isSuperAdmin; // Already cached
}
// Cache miss - load and cache all role data
const rolesData = await this.loadAndCacheRoles(userProfileId);
```

### Layer 2: Center Access Cache

**Purpose:** Cache center-scoped ownership and access records

**Key Format:** `center:{centerId}:user:{userProfileId}` (internal: tuple `[userProfileId, centerId]`)

**Value Structure:**

```typescript
{
  isOwner?: boolean;              // Center owner check (center-scoped!)
  hasCenterAccess?: boolean;
  centerAccess?: CenterAccess | null;
}
```

**Important:** `isOwner` is center-scoped and belongs here, **NOT** in roles cache.

**Example:**

```typescript
const cached = AccessControlCacheService.getCenterAccess(
  userProfileId,
  centerId,
);
if (cached?.isOwner !== undefined) {
  return cached.isOwner;
}
// Cache miss - query and cache
```

### Layer 3: Branch Access Cache

**Purpose:** Cache branch access records

**Key Format:** `branch:{branchId}:center:{centerId}:user:{userProfileId}` (internal: tuple `[userProfileId, centerId, branchId]`)

**Value Structure:**

```typescript
{
  hasBranchAccess?: boolean;
  branchAccess?: BranchAccess | null;
}
```

### Layer 4: User Access Cache

**Purpose:** Cache user-to-user access grants

**Key Format:** `user:granter:{granterUserProfileId}:target:{targetUserProfileId}:center:{centerId || 'null'}` (internal: tuple `[granterUserProfileId, targetUserProfileId, centerId || null]`)

**Value Structure:**

```typescript
{
  hasUserAccess?: boolean;
  userAccess?: UserAccess | null;
}
```

### Layer 5: Batch Results Cache (Optional - Use with Caution)

**Purpose:** Cache results of batch operations when inputs are small and stable

**Key Format:** `batch:{type}:{hash(inputs)}` (only stringify for Map key)

**Value:** `Set<string>` (IDs that passed the check)

**⚠️ GUARDRAILS:**

- Maximum 50 items in input array (if more, skip batch cache)
- No dynamic flags (includeDeleted, includeInactive, etc.) - must be deterministic
- Inputs must be sorted and stable for hash to work correctly
- If any constraint fails, skip batch cache and rely on Layer 1-4 caching instead

**Recommendation:** Batch cache is optional - the per-entity caching in Layers 1-4 already provides most of the benefit. Only use if inputs are small (<50), deterministic, and stable.

## Key Rules and Guidelines

### 1. Scope Separation (CRITICAL)

**Never mix scopes in one key:**

- ✅ Roles cache: Global roles only (isSuperAdmin, isAdmin, isStaff)
- ✅ Center cache: Center-scoped authority (isCenterOwner, centerAccess)
- ❌ **DO NOT** cache center-specific checks in roles cache

**Example of INCORRECT usage:**

```typescript
// ❌ WRONG - isCenterOwner is center-scoped, not global
AccessControlCacheService.setRoles(userId, {
  isSuperAdmin: true,
  isCenterOwner: true, // ❌ This doesn't belong here!
});
```

**Example of CORRECT usage:**

```typescript
// ✅ CORRECT - isCenterOwner in center layer
AccessControlCacheService.setCenterAccess(userId, centerId, {
  isOwner: true, // ✅ Correct layer
  centerAccess: centerAccess,
});
```

### 2. Null Value Caching

**Always cache null values** to avoid repeated queries for non-existent records:

```typescript
// ✅ CORRECT - Cache null explicitly
AccessControlCacheService.setCenterAccess(userId, centerId, {
  centerAccess: null, // ✅ Cache null to avoid repeated queries
  hasCenterAccess: false,
});
```

### 3. Defensive Fallback Pattern

**Always check if cache exists** and fall back to direct queries if unavailable:

```typescript
async findCenterAccess(data: CenterAccessDto): Promise<CenterAccess | null> {
  // Defensive check: verify cache exists
  const cached = AccessControlCacheService.getCenterAccess(
    userProfileId,
    centerId,
  );
  if (cached !== undefined && cached.centerAccess !== undefined) {
    return cached.centerAccess; // Cache hit
  }

  // Cache miss - query repository
  const centerAccess = await this.centerAccessRepository.findCenterAccess(data);

  // Cache the result (including null)
  AccessControlCacheService.setCenterAccess(userProfileId, centerId, {
    ...cached,
    centerAccess,
  });

  return centerAccess;
}
```

### 4. Read-Through Cache Pattern

All cache operations follow the read-through pattern:

1. **Check cache** - if available, return immediately
2. **Query repository** - if cache miss
3. **Cache result** - store for future use (including null)
4. **Return result**

### 5. Batch Loading Pattern

When checking multiple entities, use batch loading:

```typescript
// ✅ CORRECT - Batch load, then cache individually
const centerAccesses = await this.centerAccessRepository.findManyCenterAccess(
  userProfileIds,
  centerId,
);

// Cache each result individually
for (const centerAccess of centerAccesses) {
  AccessControlCacheService.setCenterAccess(
    centerAccess.userProfileId,
    centerAccess.centerId,
    { centerAccess, hasCenterAccess: true },
  );
}

// Cache nulls for profiles without access
for (const profileId of userProfileIds) {
  if (!hasAccess(profileId)) {
    AccessControlCacheService.setCenterAccess(profileId, centerId, {
      centerAccess: null,
      hasCenterAccess: false,
    });
  }
}
```

## Usage Examples

### Example 1: Checking if User is Super Admin

```typescript
async isSuperAdmin(userProfileId: string): Promise<boolean> {
  // Check cache first
  const cached = AccessControlCacheService.getRoles(userProfileId);
  if (cached !== undefined) {
    return cached.isSuperAdmin; // Cache hit
  }

  // Cache miss - load and cache all role data
  const rolesData = await this.loadAndCacheRoles(userProfileId);
  return rolesData.isSuperAdmin;
}
```

### Example 2: Checking Center Access

```typescript
async canCenterAccess(
  data: CenterAccessDto,
  isDeleted: boolean = true,
): Promise<boolean> {
  const { userProfileId } = data;

  // Check super admin first (cached)
  const isSuperAdmin = await this.isSuperAdmin(userProfileId);
  if (isSuperAdmin) {
    return true;
  }

  // Check center access (cached)
  const centerAccess = await this.findCenterAccess(data, isDeleted);
  return !!centerAccess;
}
```

### Example 3: Batch Operation with Caching

```typescript
async getAccessibleProfilesIdsForCenter(
  centerId: string,
  targetProfileIds: string[],
): Promise<string[]> {
  // Early return for empty array
  if (targetProfileIds.length === 0) {
    return [];
  }

  // Batch load all center accesses in one query
  const centerAccesses = await this.centerAccessRepository.findManyCenterAccess(
    targetProfileIds,
    centerId,
  );

  // Cache results individually
  const accessibleSet = new Set<string>();
  for (const centerAccess of centerAccesses) {
    accessibleSet.add(centerAccess.userProfileId);
    AccessControlCacheService.setCenterAccess(
      centerAccess.userProfileId,
      centerAccess.centerId,
      { centerAccess, hasCenterAccess: true }
    );
  }

  // Check super admin for remaining profiles (cached checks)
  const results: string[] = [];
  for (const profileId of targetProfileIds) {
    if (accessibleSet.has(profileId)) {
      results.push(profileId);
    } else {
      const isSuperAdmin = await this.isSuperAdmin(profileId);
      if (isSuperAdmin) {
        results.push(profileId);
      }
    }
  }

  return results;
}
```

## Common Patterns

### Pattern 1: Role Check with Batch Loading

When any role check misses cache, batch-load all role data:

```typescript
private async loadAndCacheRoles(userProfileId: string): Promise<RolesCacheData> {
  const [isSuperAdmin, isAdmin, isStaff, userProfile] = await Promise.all([
    this.profileRoleRepository.isSuperAdmin(userProfileId),
    this.userProfileService.isAdmin(userProfileId),
    this.userProfileService.isStaff(userProfileId),
    this.userProfileService.findOne(userProfileId).catch(() => null),
  ]);

  const rolesData: RolesCacheData = {
    isSuperAdmin,
    isAdmin,
    isStaff,
    profileType: userProfile?.profileType,
  };

  AccessControlCacheService.setRoles(userProfileId, rolesData);
  return rolesData;
}
```

### Pattern 2: Cache Merge

When updating cache, preserve existing data:

```typescript
const currentCache =
  AccessControlCacheService.getCenterAccess(userProfileId, centerId) ?? {};

AccessControlCacheService.setCenterAccess(userProfileId, centerId, {
  ...currentCache, // Preserve existing cache data
  centerAccess, // Add new data
  hasCenterAccess: true,
});
```

### Pattern 3: Handling Soft-Deleted Records

Soft-deleted records are **not cached** (they use `withDeleted: true`):

```typescript
async findCenterAccess(
  data: CenterAccessDto,
  isDeleted?: boolean,
): Promise<CenterAccess | null> {
  // Only cache non-deleted records
  if (!isDeleted) {
    const cached = AccessControlCacheService.getCenterAccess(
      userProfileId,
      centerId,
    );
    if (cached !== undefined && cached.centerAccess !== undefined) {
      return cached.centerAccess;
    }
  }

  // Query (may include deleted records if isDeleted=true)
  const centerAccess = await this.centerAccessRepository.findCenterAccess(
    data,
    isDeleted,
  );

  // Only cache if not deleted
  if (!isDeleted) {
    AccessControlCacheService.setCenterAccess(userProfileId, centerId, {
      centerAccess,
    });
  }

  return centerAccess;
}
```

## Troubleshooting

### Cache Not Working?

1. **Check if cache is initialized**: The cache is initialized in `ContextMiddleware`. If you're calling access control methods outside of a request context (e.g., in background jobs), the cache won't be available.

2. **Verify defensive fallback**: All methods should fall back to direct queries if cache is unavailable. Check for proper defensive checks:

   ```typescript
   const cached = AccessControlCacheService.getRoles(userId);
   if (cached !== undefined) {
     // Use cache
   }
   // Fall back to query
   ```

3. **Check scope separation**: Ensure you're using the correct cache layer. Don't mix global and scoped data.

### Performance Not Improved?

1. **Verify batch loading**: Are you using batch loading methods (`findManyCenterAccess`, etc.) for multiple checks?

2. **Check null caching**: Are null values being cached? Missing null caching can cause repeated queries for non-existent records.

3. **Verify cache hits**: Add logging to verify cache hits vs misses during development.

### Common Mistakes

1. **❌ Mixing scopes**: Storing center-specific data in roles cache

   ```typescript
   // ❌ WRONG
   AccessControlCacheService.setRoles(userId, {
     isCenterOwner: true, // Center-scoped!
   });
   ```

2. **❌ Not caching nulls**: Missing null caching causes repeated queries

   ```typescript
   // ❌ WRONG - doesn't cache null
   if (centerAccess) {
     AccessControlCacheService.setCenterAccess(...);
   }
   ```

3. **❌ Not using defensive fallback**: Assuming cache always exists
   ```typescript
   // ❌ WRONG - assumes cache exists
   const cached = AccessControlCacheService.getRoles(userId);
   return cached.isSuperAdmin; // Might be undefined!
   ```

## Testing

When testing access control methods:

1. **Query count assertions**: Test that query counts are reduced:

   ```typescript
   // Before: 50 profiles → 250 queries
   // After: 50 profiles → ≤10 queries
   ```

2. **Cache isolation**: Verify cache is request-scoped (different requests don't share cache)

3. **Null caching**: Test that null values are cached (repeated checks don't query)

4. **Defensive fallback**: Test behavior when cache is unavailable (should fall back to queries)

## Files Reference

- **Cache Service**: `src/shared/common/services/access-control-cache.service.ts`
- **Middleware**: `src/shared/common/middleware/context.middleware.ts`
- **Helper Service**: `src/modules/access-control/services/access-control-helper.service.ts`
- **Branch Access Service**: `src/modules/centers/services/branch-access.service.ts`
- **Repositories**:
  - `src/modules/access-control/repositories/center-access.repository.ts`
  - `src/modules/centers/repositories/branch-access.repository.ts`
  - `src/modules/access-control/repositories/user-access.repository.ts`

## Summary

The access control caching system provides:

- ✅ **95-98% reduction** in database queries
- ✅ **Request-scoped** cache (isolated per request)
- ✅ **Defensive fallbacks** (works even if cache unavailable)
- ✅ **Null caching** (avoids repeated queries for missing records)
- ✅ **Batch loading** (optimizes multiple checks)
- ✅ **Clear scope separation** (global vs scoped data)

**Remember:**

- Cache is an **optimization**, not a dependency
- Always include **defensive fallbacks**
- Cache **null values** explicitly
- Maintain **scope separation** (roles vs center/branch)
- Use **batch loading** for multiple checks
