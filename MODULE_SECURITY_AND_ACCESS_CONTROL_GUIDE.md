# Module Security and Access Control Standardization Guide

**Purpose:** This guide standardizes the security and access control patterns for all modules in the LMS backend to ensure consistent, secure, and maintainable code.

**Last Updated:** Based on Classes and Sessions modules implementation

---

## Table of Contents

1. [Security Pattern: Triple-Lock with Bypass](#security-pattern-triple-lock-with-bypass)
2. [Module Structure Guidelines](#module-structure-guidelines)
3. [Service Layer Access Control](#service-layer-access-control)
4. [Repository Layer Access Control](#repository-layer-access-control)
5. [Dependency Injection Requirements](#dependency-injection-requirements)
6. [Error Handling and Exception Types](#error-handling-and-exception-types)
7. [Best Practices](#best-practices)
8. [Code Examples](#code-examples)
9. [Migration Checklist](#migration-checklist)

---

## Security Pattern: Triple-Lock with Bypass

### Overview

All module operations that access resources must implement the **Triple-Lock with Bypass** pattern:

1. **Global Lock (Center):** Verify resource belongs to actor's center
2. **Bypass Check:** Check if user can bypass center internal access
3. **Zonal Lock (Branch):** Validate branch access (if not bypassing)
4. **Personal Lock (Resource-Specific):** Validate resource-specific access (if not bypassing)

### When to Apply

- **Always:** Single resource operations (get, update, delete)
- **Always:** Resource creation operations
- **Always:** List/query operations in repositories
- **Never:** Public endpoints that don't require authentication

### Bypass Privileges

Users who can bypass center internal access:

- **Super Admins:** System-wide access
- **Center Owners:** Full access to their center
- **Admins with Center Access:** Full access to centers they manage

Bypass users skip branch and resource-specific access validation but **must still pass center ownership validation**.

---

## Module Structure Guidelines

### Standard Module Structure

```
src/modules/{module-name}/
├── controllers/          # API endpoints
│   └── {module}.controller.ts
├── services/            # Business logic
│   ├── {module}.service.ts
│   └── {module}-validation.service.ts (optional)
├── repositories/        # Data access layer
│   └── {module}.repository.ts
├── entities/            # TypeORM entities
│   └── {entity}.entity.ts
├── dto/                 # Data Transfer Objects
├── enums/               # Enumerations
├── events/              # Event definitions (if using events)
├── listeners/           # Event listeners (if using events)
├── jobs/                # Background jobs (if needed)
├── utils/               # Utility functions
└── decorators/          # Custom decorators
```

### Module Dependencies

Every module should import:

```typescript
import { AccessControlModule } from '@/modules/access-control/access-control.module';
import { CentersModule } from '@/modules/centers/centers.module';
import { SharedModule } from '@/shared/shared.module';
```

---

## Service Layer Access Control

### Pattern for Single Resource Operations

For operations that access a single resource (get, update, delete):

```typescript
async getResource(resourceId: string, actor: ActorUser): Promise<Resource> {
  // 1. Fetch the resource (with relations if needed)
  const resource = await this.repository.findOneOrThrow(resourceId, ['relatedEntity']);

  // 2. Global Lock: Verify center ownership
  if (resource.centerId !== actor.centerId) {
    throw new BusinessLogicException('t.messages.validationFailed', {
      resource: 't.resources.resourceName',
    } as any);
  }

  // 3. Bypass Check
  const canBypassCenterInternalAccess =
    await this.accessControlHelperService.bypassCenterInternalAccess(
      actor.userProfileId,
      actor.centerId!,
    );

  // 4. Validate access (only if not bypassing)
  if (!canBypassCenterInternalAccess) {
    // Zonal Lock: Branch access validation
    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId: resource.branchId,
    });

    // Personal Lock: Resource-specific access validation
    await this.resourceAccessService.validateResourceAccess({
      userProfileId: actor.userProfileId,
      resourceId: resource.id,
    });
  }

  return resource;
}
```

### Pattern for Creation Operations

For operations that create resources:

```typescript
@Transactional()
async createResource(
  createDto: CreateResourceDto,
  actor: ActorUser,
): Promise<Resource> {
  // 1. Fetch related entity (e.g., group, class) that the resource belongs to
  const parentEntity = await this.parentRepository.findByIdOrThrow(
    createDto.parentId,
    ['relatedEntity'],
  );

  // 2. Bypass Check (before validation)
  const canBypassCenterInternalAccess =
    await this.accessControlHelperService.bypassCenterInternalAccess(
      actor.userProfileId,
      actor.centerId!,
    );

  // 3. Validate access (only if not bypassing)
  if (!canBypassCenterInternalAccess) {
    // Zonal Lock: Branch access validation
    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId: parentEntity.branchId,
    });

    // Personal Lock: Resource-specific access validation
    await this.parentAccessService.validateParentAccess({
      userProfileId: actor.userProfileId,
      parentId: parentEntity.id,
    });
  }

  // 4. Create resource
  const resource = await this.repository.create({
    ...createDto,
    centerId: parentEntity.centerId,
    branchId: parentEntity.branchId,
  });

  return resource;
}
```

### Centralized Access Validation Helper

For modules with multiple operations, consider creating a helper method:

```typescript
private async findResourceAndValidateAccess(
  resourceId: string,
  actor: ActorUser,
  includeDeleted = false,
): Promise<Resource> {
  // 1. Fetch resource
  const resource = await this.repository.findOneOrThrow(
    resourceId,
    ['relatedEntity'],
    includeDeleted,
  );

  // 2. Global Lock: Center ownership
  if (resource.centerId !== actor.centerId) {
    throw new BusinessLogicException('t.messages.validationFailed', {
      resource: 't.resources.resourceName',
    } as any);
  }

  // 3. Bypass Check
  const canBypassCenterInternalAccess =
    await this.accessControlHelperService.bypassCenterInternalAccess(
      actor.userProfileId,
      actor.centerId!,
    );

  // 4. Validate access (only if not bypassing)
  if (!canBypassCenterInternalAccess) {
    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId: resource.branchId,
    });

    await this.resourceAccessService.validateResourceAccess({
      userProfileId: actor.userProfileId,
      resourceId: resource.id,
    });
  }

  return resource;
}
```

Then use it in public methods:

```typescript
async getResource(resourceId: string, actor: ActorUser): Promise<Resource> {
  return this.findResourceAndValidateAccess(resourceId, actor);
}

async updateResource(
  resourceId: string,
  updateDto: UpdateResourceDto,
  actor: ActorUser,
): Promise<Resource> {
  const resource = await this.findResourceAndValidateAccess(resourceId, actor);
  // ... update logic
}
```

---

## Repository Layer Access Control

### Pattern for List/Query Operations

For repository methods that return multiple resources:

```typescript
async findResources(
  filters: ResourceFiltersDto,
  actor: ActorUser,
): Promise<Resource[]> {
  const centerId = actor.centerId!;
  const queryBuilder = this.getRepository()
    .createQueryBuilder('resource')
    .leftJoin('resource.parentEntity', 'parent')
    .where('resource.centerId = :centerId', { centerId });

  // Bypass Check
  const canBypassCenterInternalAccess =
    await this.accessControlHelperService.bypassCenterInternalAccess(
      actor.userProfileId,
      centerId,
    );

  // Apply access control filters (only if not bypassing)
  if (!canBypassCenterInternalAccess) {
    // Resource-specific filtering (e.g., class staff, teacher)
    queryBuilder
      .leftJoin('parent.resourceStaff', 'resourceStaff')
      .andWhere('resourceStaff.userProfileId = :userProfileId', {
        userProfileId: actor.userProfileId,
      });

    // Branch access filtering (using sub-query for performance)
    queryBuilder.andWhere(
      'resource.branchId IN (SELECT "branchId" FROM branch_access WHERE "userProfileId" = :userProfileId AND "isActive" = true)',
      {
        userProfileId: actor.userProfileId,
      },
    );
  }

  // Apply additional filters
  if (filters.status) {
    queryBuilder.andWhere('resource.status = :status', {
      status: filters.status,
    });
  }

  return queryBuilder.getMany();
}
```

### Performance Optimization

For branch access filtering, use a sub-query with proper indexing:

```typescript
// Ensure branch_access table has composite index:
// CREATE INDEX idx_branch_access_user_branch_active
// ON branch_access (userProfileId, branchId, isActive);

queryBuilder.andWhere(
  'resource.branchId IN (SELECT "branchId" FROM branch_access WHERE "userProfileId" = :userProfileId AND "isActive" = true)',
  {
    userProfileId: actor.userProfileId,
  },
);
```

### Shared Query Builder Helper

For repositories with multiple query methods, create a shared helper:

```typescript
private async buildResourceQueryBuilder(
  filters: ResourceFiltersDto,
  actor: ActorUser,
): Promise<SelectQueryBuilder<Resource>> {
  const centerId = actor.centerId!;
  const queryBuilder = this.getRepository()
    .createQueryBuilder('resource')
    .leftJoin('resource.parentEntity', 'parent')
    .where('resource.centerId = :centerId', { centerId });

  // Bypass Check
  const canBypassCenterInternalAccess =
    await this.accessControlHelperService.bypassCenterInternalAccess(
      actor.userProfileId,
      centerId,
    );

  // Apply access control filters (only if not bypassing)
  if (!canBypassCenterInternalAccess) {
    queryBuilder
      .leftJoin('parent.resourceStaff', 'resourceStaff')
      .andWhere('resourceStaff.userProfileId = :userProfileId', {
        userProfileId: actor.userProfileId,
      });

    queryBuilder.andWhere(
      'resource.branchId IN (SELECT "branchId" FROM branch_access WHERE "userProfileId" = :userProfileId AND "isActive" = true)',
      {
        userProfileId: actor.userProfileId,
      },
    );
  }

  // Apply filters
  // ... filter logic

  return queryBuilder;
}
```

---

## Dependency Injection Requirements

### Required Services

Every service that implements access control must inject:

```typescript
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { BranchAccessService } from '@/modules/centers/services/branch-access.service';
// Add resource-specific access service if applicable
import { ResourceAccessService } from '@/modules/{module}/services/resource-access.service';

@Injectable()
export class ResourceService extends BaseService {
  constructor(
    private readonly repository: ResourceRepository,
    private readonly branchAccessService: BranchAccessService,
    private readonly resourceAccessService: ResourceAccessService, // if applicable
    private readonly accessControlHelperService: AccessControlHelperService,
    // ... other dependencies
  ) {
    super();
  }
}
```

### Repository Requirements

Repositories that filter by access control must inject:

```typescript
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';

@Injectable()
export class ResourceRepository extends BaseRepository<Resource> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    protected readonly accessControlHelperService: AccessControlHelperService,
  ) {
    super(txHost);
  }
}
```

---

## Error Handling and Exception Types

### Exception Types by Validation Layer

1. **Center Ownership Failure:**

   ```typescript
   throw new BusinessLogicException('t.messages.validationFailed', {
     resource: 't.resources.resourceName',
   } as any);
   ```

2. **Branch Access Failure:**
   - Thrown by: `branchAccessService.validateBranchAccess()`
   - Type: `BranchAccessDeniedException`
   - Message: `'t.messages.accessDenied'` with `resource: 't.resources.branch'`

3. **Resource-Specific Access Failure:**
   - Thrown by: `resourceAccessService.validateResourceAccess()`
   - Type: `InsufficientPermissionsException`
   - Message: `'t.messages.actionUnauthorized'` with resource context

### Frontend Error Handling

Each exception type allows the frontend to show specific error messages:

- `BranchAccessDeniedException` → "You don't have access to this branch"
- `InsufficientPermissionsException` → "You don't have access to this resource"
- `BusinessLogicException` → Generic validation error

---

## Best Practices

### 1. Always Check Center Ownership First

Center ownership validation is the first security gate and is **never bypassed**.

```typescript
// ✅ CORRECT: Center check first
if (resource.centerId !== actor.centerId) {
  throw new BusinessLogicException(...);
}

// ❌ WRONG: Skipping center check
// Always validate center ownership, even for bypass users
```

### 2. Check Bypass Before Branch/Resource Validation

Always check bypass status before performing branch or resource-specific validation:

```typescript
// ✅ CORRECT: Check bypass first
const canBypass = await this.accessControlHelperService.bypassCenterInternalAccess(...);
if (!canBypass) {
  await this.branchAccessService.validateBranchAccess(...);
  await this.resourceAccessService.validateResourceAccess(...);
}

// ❌ WRONG: Always validating without bypass check
await this.branchAccessService.validateBranchAccess(...); // Should check bypass first
```

### 3. Use Denormalized Fields for Filtering

Always use denormalized `centerId` and `branchId` fields on entities for query filtering:

```typescript
// ✅ CORRECT: Use denormalized field
.where('resource.centerId = :centerId', { centerId })

// ❌ WRONG: Joining through relations for filtering
.leftJoin('resource.parent', 'parent')
.where('parent.centerId = :centerId', { centerId }) // Slower, unnecessary join
```

### 4. Centralize Common Validation Logic

Create helper methods to avoid code duplication:

```typescript
// ✅ CORRECT: Centralized helper
private async findResourceAndValidateAccess(...) { ... }

// ❌ WRONG: Duplicating validation in every method
```

### 5. Transaction Safety

Ensure access validation happens **within transactions** for write operations:

```typescript
@Transactional()
async updateResource(...) {
  // Access validation inside transaction
  const resource = await this.findResourceAndValidateAccess(...);
  // ... update logic
}
```

### 6. Avoid Redundant Validations

Don't validate access multiple times in the same call chain:

```typescript
// ✅ CORRECT: Validate once in helper method
async getResource(id: string, actor: ActorUser) {
  return this.findResourceAndValidateAccess(id, actor);
}

// ❌ WRONG: Validating twice
async getResource(id: string, actor: ActorUser) {
  const resource = await this.findResourceAndValidateAccess(id, actor);
  // Redundant validation
  await this.branchAccessService.validateBranchAccess(...); // Already done in helper
}
```

---

## Code Examples

### Complete Service Example

```typescript
import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { BranchAccessService } from '@/modules/centers/services/branch-access.service';
import { ResourceAccessService } from './resource-access.service';
import { ResourceRepository } from '../repositories/resource.repository';
import { BusinessLogicException } from '@/shared/common/exceptions/custom.exceptions';
import { ActorUser } from '@/shared/common/types/actor-user.type';

@Injectable()
export class ResourceService extends BaseService {
  constructor(
    private readonly repository: ResourceRepository,
    private readonly branchAccessService: BranchAccessService,
    private readonly resourceAccessService: ResourceAccessService,
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {
    super();
  }

  /**
   * Helper method to find resource and validate access
   */
  private async findResourceAndValidateAccess(
    resourceId: string,
    actor: ActorUser,
    includeDeleted = false,
  ): Promise<Resource> {
    const resource = await this.repository.findOneOrThrow(
      resourceId,
      ['relatedEntity'],
      includeDeleted,
    );

    // 1. Global Lock: Center ownership
    if (resource.centerId !== actor.centerId) {
      throw new BusinessLogicException('t.messages.validationFailed', {
        resource: 't.resources.resource',
      } as any);
    }

    // 2. Bypass Check
    const canBypassCenterInternalAccess =
      await this.accessControlHelperService.bypassCenterInternalAccess(
        actor.userProfileId,
        actor.centerId!,
      );

    // 3. Validate access (only if not bypassing)
    if (!canBypassCenterInternalAccess) {
      // Zonal Lock: Branch access
      await this.branchAccessService.validateBranchAccess({
        userProfileId: actor.userProfileId,
        centerId: actor.centerId!,
        branchId: resource.branchId,
      });

      // Personal Lock: Resource-specific access
      await this.resourceAccessService.validateResourceAccess({
        userProfileId: actor.userProfileId,
        resourceId: resource.id,
      });
    }

    return resource;
  }

  /**
   * Get a single resource
   */
  async getResource(resourceId: string, actor: ActorUser): Promise<Resource> {
    return this.findResourceAndValidateAccess(resourceId, actor);
  }

  /**
   * Update a resource
   */
  @Transactional()
  async updateResource(
    resourceId: string,
    updateDto: UpdateResourceDto,
    actor: ActorUser,
  ): Promise<Resource> {
    const resource = await this.findResourceAndValidateAccess(
      resourceId,
      actor,
    );

    // Update logic
    return this.repository.update(resourceId, updateDto);
  }

  /**
   * Create a resource
   */
  @Transactional()
  async createResource(
    createDto: CreateResourceDto,
    actor: ActorUser,
  ): Promise<Resource> {
    const parent = await this.parentRepository.findByIdOrThrow(
      createDto.parentId,
      ['relatedEntity'],
    );

    // Bypass Check
    const canBypassCenterInternalAccess =
      await this.accessControlHelperService.bypassCenterInternalAccess(
        actor.userProfileId,
        actor.centerId!,
      );

    // Validate access (only if not bypassing)
    if (!canBypassCenterInternalAccess) {
      await this.branchAccessService.validateBranchAccess({
        userProfileId: actor.userProfileId,
        centerId: actor.centerId!,
        branchId: parent.branchId,
      });

      await this.parentAccessService.validateParentAccess({
        userProfileId: actor.userProfileId,
        parentId: parent.id,
      });
    }

    return this.repository.create({
      ...createDto,
      centerId: parent.centerId,
      branchId: parent.branchId,
    });
  }
}
```

### Complete Repository Example

```typescript
import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { SelectQueryBuilder } from 'typeorm';

@Injectable()
export class ResourceRepository extends BaseRepository<Resource> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    protected readonly accessControlHelperService: AccessControlHelperService,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof Resource {
    return Resource;
  }

  /**
   * Shared query builder with access control
   */
  private async buildResourceQueryBuilder(
    filters: ResourceFiltersDto,
    actor: ActorUser,
  ): Promise<SelectQueryBuilder<Resource>> {
    const centerId = actor.centerId!;
    const queryBuilder = this.getRepository()
      .createQueryBuilder('resource')
      .leftJoin('resource.parentEntity', 'parent')
      .where('resource.centerId = :centerId', { centerId });

    // Bypass Check
    const canBypassCenterInternalAccess =
      await this.accessControlHelperService.bypassCenterInternalAccess(
        actor.userProfileId,
        centerId,
      );

    // Apply access control filters (only if not bypassing)
    if (!canBypassCenterInternalAccess) {
      // Resource-specific filtering
      queryBuilder
        .leftJoin('parent.resourceStaff', 'resourceStaff')
        .andWhere('resourceStaff.userProfileId = :userProfileId', {
          userProfileId: actor.userProfileId,
        });

      // Branch access filtering
      queryBuilder.andWhere(
        'resource.branchId IN (SELECT "branchId" FROM branch_access WHERE "userProfileId" = :userProfileId AND "isActive" = true)',
        {
          userProfileId: actor.userProfileId,
        },
      );
    }

    // Apply filters
    if (filters.status) {
      queryBuilder.andWhere('resource.status = :status', {
        status: filters.status,
      });
    }

    return queryBuilder;
  }

  /**
   * Find resources with pagination
   */
  async findResources(
    filters: ResourceFiltersDto,
    actor: ActorUser,
  ): Promise<Resource[]> {
    const queryBuilder = await this.buildResourceQueryBuilder(filters, actor);
    return queryBuilder.getMany();
  }

  /**
   * Count resources
   */
  async countResources(
    filters: ResourceFiltersDto,
    actor: ActorUser,
  ): Promise<number> {
    const queryBuilder = await this.buildResourceQueryBuilder(filters, actor);
    return queryBuilder.getCount();
  }
}
```

---

## Migration Checklist

When refactoring an existing module to follow this pattern:

- [ ] Add required service injections (`AccessControlHelperService`, `BranchAccessService`)
- [ ] Add required repository injection (`AccessControlHelperService`)
- [ ] Implement center ownership validation in all resource access methods
- [ ] Add bypass check before branch/resource validation
- [ ] Add branch access validation (only if not bypassing)
- [ ] Add resource-specific access validation (only if not bypassing)
- [ ] Update repository query methods with bypass logic and branch filtering
- [ ] Create centralized validation helper methods (if applicable)
- [ ] Remove redundant validations
- [ ] Remove debug code (console.log, etc.)
- [ ] Test with different user roles (super admin, center owner, admin, staff)
- [ ] Test bypass functionality
- [ ] Test branch access restrictions
- [ ] Verify no performance regression

---

## References

- **Classes Module:** `src/modules/classes/services/classes.service.ts`
- **Sessions Module:** `src/modules/sessions/services/sessions.service.ts`
- **Access Control Service:** `src/modules/access-control/services/access-control-helper.service.ts`
- **Branch Access Service:** `src/modules/centers/services/branch-access.service.ts`

---

## Questions or Issues?

If you have questions about implementing this pattern or encounter issues:

1. Review the Classes and Sessions modules for reference implementations
2. Check the analysis documents: `CLASSES_MODULE_DETAILED_ANALYSIS.md` and `SESSIONS_MODULE_DETAILED_ANALYSIS.md`
3. Consult with the team lead for module-specific access control requirements

---

**Remember:** Security is not optional. Every module must implement proper access control following this standardized pattern.

---

## Future Considerations

This guide focuses on the **most critical** security aspect: access control. The following areas are important for enterprise-grade modules but are intentionally kept separate to maintain focus:

### 1. Audit Logging

Standardize how changes are recorded. Consider creating a standard `@AuditLog()` decorator or centralized service that records:

- `actor.userProfileId`
- Action performed
- Resource affected
- Timestamp
- Before/after state (for updates)

**When to add:** After core access control patterns are established across all modules.

### 2. Soft Deletion & Recovery Pattern

Ensure consistent soft deletion and restoration across all modules:

- Standardize `restoreResource()` methods
- Apply same validation rules as `createResource()` during restoration
- Document lifecycle states (active, soft-deleted, hard-deleted)

**Current status:** Partial implementation exists (see `includeDeleted` parameter in examples).

### 3. Validation Consistency

Standardize input validation patterns:

- Ensure all DTOs use `class-validator` consistently
- Centralize business rule validation in `{module}-validation.service.ts`
- Keep main service clean by separating validation logic

**Current status:** Some modules follow this pattern (e.g., `SessionValidationService`).

---

**Note:** These areas will be standardized in future iterations. For now, focus on implementing the access control patterns described in this guide.
