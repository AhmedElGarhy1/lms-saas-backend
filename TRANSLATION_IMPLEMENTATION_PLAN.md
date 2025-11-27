# Translation Implementation Plan - Roles & Permissions

## 🎯 Overview

Implement a scalable, maintainable translation system for roles and permissions using the existing `readOnly` flag and i18n infrastructure.

**Core Principle:** System values (readOnly roles, all permissions) store translation keys in `name`/`description` columns. User-created values store actual text in user's language.

---

## 📋 Architecture Decisions

### 1. **Translation Strategy**

| Entity          | Translation Logic                                                  | Storage                                                                                |
| --------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| **Roles**       | `readOnly = true` → Translate<br>`readOnly = false` → Return as-is | Translation key in `name`/`description` for system roles<br>Actual text for user roles |
| **Permissions** | Always translate (all are system)                                  | Translation key in `name`/`description`                                                |

### 2. **Translation Key Format**

- **Roles:** `t.roles.{roleKey}.name` and `t.roles.{roleKey}.description`
- **Permissions:** `t.permissions.{category}.{action}.name` and `t.permissions.{category}.{action}.description`

### 3. **Design Principles**

✅ **Separation of Concerns:** Translation logic in dedicated utilities  
✅ **Single Responsibility:** Each utility has one clear purpose  
✅ **Type Safety:** Use TypeScript types and generated i18n types  
✅ **Performance:** Lazy translation (only when needed)  
✅ **Maintainability:** Clear, self-documenting code  
✅ **Extensibility:** Easy to add new system roles/permissions

---

## 🏗️ Implementation Structure

### Phase 1: Core Translation Utilities

#### 1.1 Translation Key Generators

**File:** `src/shared/utils/translation-key.util.ts`

```typescript
/**
 * Utility for generating and validating translation keys
 * Centralized logic for translation key patterns
 */
export class TranslationKeyUtil {
  /**
   * Translation key prefix pattern
   */
  private static readonly TRANSLATION_KEY_PREFIX = 't.';

  /**
   * Check if a string is a translation key
   */
  static isTranslationKey(value: string): boolean {
    return value?.startsWith(this.TRANSLATION_KEY_PREFIX) ?? false;
  }

  /**
   * Generate role translation key
   */
  static getRoleNameKey(roleKey: string): string {
    return `${this.TRANSLATION_KEY_PREFIX}roles.${roleKey}.name`;
  }

  static getRoleDescriptionKey(roleKey: string): string {
    return `${this.TRANSLATION_KEY_PREFIX}roles.${roleKey}.description`;
  }

  /**
   * Generate permission translation key from action
   * Example: "staff:read" → "t.permissions.staff.read.name"
   */
  static getPermissionNameKey(action: string): string {
    const [category, ...actionParts] = action.split(':');
    const actionKey = actionParts.join('').replace(/-/g, '');
    return `${this.TRANSLATION_KEY_PREFIX}permissions.${category}.${actionKey}.name`;
  }

  static getPermissionDescriptionKey(action: string): string {
    const [category, ...actionParts] = action.split(':');
    const actionKey = actionParts.join('').replace(/-/g, '');
    return `${this.TRANSLATION_KEY_PREFIX}permissions.${category}.${actionKey}.description`;
  }
}
```

#### 1.2 Role Translation Service

**File:** `src/shared/services/role-translation.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';
import { Role } from '@/modules/access-control/entities/role.entity';
import { TranslationKeyUtil } from '../utils/translation-key.util';

/**
 * Service for translating role names and descriptions
 * Handles both system roles (readOnly) and user-created roles
 */
@Injectable()
export class RoleTranslationService {
  constructor(private readonly i18n: I18nService<I18nTranslations>) {}

  /**
   * Translate role name based on readOnly flag
   * - System roles (readOnly = true): name contains translation key → translate
   * - User roles (readOnly = false): name contains actual text → return as-is
   */
  translateRoleName(role: Role): string {
    if (role.readOnly && TranslationKeyUtil.isTranslationKey(role.name)) {
      try {
        return this.i18n.translate(role.name as any);
      } catch (error) {
        // Fallback to original if translation fails
        return role.name;
      }
    }
    // User-created role: return as-is (already in user's language)
    return role.name;
  }

  /**
   * Translate role description based on readOnly flag
   */
  translateRoleDescription(role: Role): string | null {
    if (!role.description) {
      return null;
    }

    if (
      role.readOnly &&
      TranslationKeyUtil.isTranslationKey(role.description)
    ) {
      try {
        return this.i18n.translate(role.description as any);
      } catch (error) {
        return role.description;
      }
    }
    return role.description;
  }

  /**
   * Translate multiple roles
   */
  translateRoles(roles: Role[]): Role[] {
    return roles.map((role) => ({
      ...role,
      name: this.translateRoleName(role),
      description: this.translateRoleDescription(role),
    }));
  }
}
```

#### 1.3 Permission Translation Service

**File:** `src/shared/services/permission-translation.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';
import { Permission } from '@/modules/access-control/entities/permission.entity';
import { TranslationKeyUtil } from '../utils/translation-key.util';

/**
 * Service for translating permission names and descriptions
 * All permissions are system-defined, so always translate
 */
@Injectable()
export class PermissionTranslationService {
  constructor(private readonly i18n: I18nService<I18nTranslations>) {}

  /**
   * Translate permission name
   * All permissions are system-defined, so name should be a translation key
   */
  translatePermissionName(permission: Permission): string {
    if (TranslationKeyUtil.isTranslationKey(permission.name)) {
      try {
        return this.i18n.translate(permission.name as any);
      } catch (error) {
        // Fallback to original if translation fails
        return permission.name;
      }
    }
    // If not a translation key, return as-is (backward compatibility)
    return permission.name;
  }

  /**
   * Translate permission description
   */
  translatePermissionDescription(permission: Permission): string | null {
    if (!permission.description) {
      return null;
    }

    if (TranslationKeyUtil.isTranslationKey(permission.description)) {
      try {
        return this.i18n.translate(permission.description as any);
      } catch (error) {
        return permission.description;
      }
    }
    return permission.description;
  }

  /**
   * Translate multiple permissions
   */
  translatePermissions(permissions: Permission[]): Permission[] {
    return permissions.map((permission) => ({
      ...permission,
      name: this.translatePermissionName(permission),
      description: this.translatePermissionDescription(permission),
    }));
  }
}
```

---

### Phase 2: Response Transformation

#### 2.1 Role Response Transformer

**File:** `src/shared/common/transformers/role-response.transformer.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { RoleTranslationService } from '@/shared/services/role-translation.service';
import { Role } from '@/modules/access-control/entities/role.entity';
import { RoleResponseDto } from '@/modules/access-control/dto/role-response.dto';

/**
 * Transformer for role responses
 * Automatically translates role names and descriptions
 */
@Injectable()
export class RoleResponseTransformer {
  constructor(
    private readonly roleTranslationService: RoleTranslationService,
  ) {}

  /**
   * Transform single role
   */
  transform(role: Role): RoleResponseDto {
    return {
      ...role,
      name: this.roleTranslationService.translateRoleName(role),
      description: this.roleTranslationService.translateRoleDescription(role),
    } as RoleResponseDto;
  }

  /**
   * Transform multiple roles
   */
  transformMany(roles: Role[]): RoleResponseDto[] {
    return roles.map((role) => this.transform(role));
  }
}
```

#### 2.2 Permission Response Transformer

**File:** `src/shared/common/transformers/permission-response.transformer.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PermissionTranslationService } from '@/shared/services/permission-translation.service';
import { Permission } from '@/modules/access-control/entities/permission.entity';

/**
 * Transformer for permission responses
 * Automatically translates permission names and descriptions
 */
@Injectable()
export class PermissionResponseTransformer {
  constructor(
    private readonly permissionTranslationService: PermissionTranslationService,
  ) {}

  /**
   * Transform single permission
   */
  transform(permission: Permission): Permission {
    return {
      ...permission,
      name: this.permissionTranslationService.translatePermissionName(
        permission,
      ),
      description:
        this.permissionTranslationService.translatePermissionDescription(
          permission,
        ),
    };
  }

  /**
   * Transform multiple permissions
   */
  transformMany(permissions: Permission[]): Permission[] {
    return permissions.map((permission) => this.transform(permission));
  }
}
```

---

### Phase 3: Service Layer Integration

#### 3.1 Update RolesService

**File:** `src/modules/access-control/services/roles.service.ts`

```typescript
// Add imports
import { RoleResponseTransformer } from '@/shared/common/transformers/role-response.transformer';

@Injectable()
export class RolesService extends BaseService {
  constructor(
    // ... existing dependencies ...
    private readonly roleResponseTransformer: RoleResponseTransformer, // Add
  ) {
    super();
  }

  async paginateRoles(query: PaginateRolesDto, actor: ActorUser) {
    const result = await this.rolesRepository.paginateRoles(query, actor);

    // Transform roles (translate system roles, keep user roles as-is)
    result.data = this.roleResponseTransformer.transformMany(result.data);

    return result;
  }

  async getRoleById(roleId: string, actor: ActorUser) {
    const role = await this.rolesRepository.findOne(roleId);
    // ... validation ...

    // Transform role
    return this.roleResponseTransformer.transform(role);
  }

  // Apply to all methods that return roles
}
```

#### 3.2 Update PermissionService

**File:** `src/modules/access-control/services/permission.service.ts`

```typescript
// Add imports
import { PermissionResponseTransformer } from '@/shared/common/transformers/permission-response.transformer';

@Injectable()
export class PermissionService extends BaseService {
  constructor(
    private readonly permissionRepository: PermissionRepository,
    private readonly permissionResponseTransformer: PermissionResponseTransformer, // Add
  ) {
    super();
  }

  async getPermissions(
    actor: ActorUser,
    scope?: PermissionScope,
  ): Promise<Permission[]> {
    const permissions = await this.permissionRepository.findMany({ where });

    // Transform permissions (always translate)
    return this.permissionResponseTransformer.transformMany(permissions);
  }
}
```

---

### Phase 4: Translation Files

#### 4.1 Add Role Translations

**File:** `src/i18n/en/t.json`

```json
{
  "roles": {
    "superAdmin": {
      "name": "Super Administrator",
      "description": "Ultimate system administrator with full access to everything"
    },
    "owner": {
      "name": "Owner",
      "description": "Ultimate center owner with full access within the center"
    }
  }
}
```

**File:** `src/i18n/ar/t.json`

```json
{
  "roles": {
    "superAdmin": {
      "name": "المدير العام",
      "description": "مدير النظام النهائي مع وصول كامل إلى كل شيء"
    },
    "owner": {
      "name": "المالك",
      "description": "مالك المركز النهائي مع وصول كامل داخل المركز"
    }
  }
}
```

#### 4.2 Add Permission Translations

**File:** `src/i18n/en/t.json`

```json
{
  "permissions": {
    "staff": {
      "read": { "name": "Read Staff" },
      "create": { "name": "Create Staff" },
      "grantUserAccess": { "name": "Grant User Access" },
      "grantBranchAccess": { "name": "Grant Branch Access" },
      "grantCenterAccess": { "name": "Grant Center Access" },
      "readAll": { "name": "Read All Staff without Staff Access" },
      "import": { "name": "Import Staff" },
      "export": { "name": "Export Staff" }
    },
    "admin": {
      "read": { "name": "Read Admin" },
      "create": { "name": "Create Admin" },
      "grantAdminAccess": { "name": "Grant Admin Access" },
      "grantCenterAccess": { "name": "Grant Center Access" },
      "readAll": { "name": "Read All Admin without Admin Access" },
      "import": { "name": "Import Admin" },
      "export": { "name": "Export Admin" }
    },
    "center": {
      "create": { "name": "Create Centers" },
      "update": { "name": "Update Centers" },
      "delete": { "name": "Delete Centers" },
      "restore": { "name": "Restore Centers" },
      "activate": { "name": "Activate/Deactivate Centers" },
      "readAll": { "name": "Read All Centers without Center Access" },
      "import": { "name": "Import Centers" },
      "export": { "name": "Export Centers" }
    },
    "roles": {
      "create": { "name": "Create Role" },
      "update": { "name": "Update Role" },
      "delete": { "name": "Delete Role" },
      "restore": { "name": "Restore Role" },
      "assign": { "name": "Assign Role" },
      "import": { "name": "Import Roles" },
      "export": { "name": "Export Roles" }
    },
    "branches": {
      "create": { "name": "Create Branches" },
      "update": { "name": "Update Branches" },
      "delete": { "name": "Delete Branches" },
      "restore": { "name": "Restore Branches" },
      "activate": { "name": "Activate/Deactivate Branches" },
      "import": { "name": "Import Branches" },
      "export": { "name": "Export Branches" },
      "readAll": { "name": "Read All Branches without Branch Access" }
    },
    "system": {
      "healthCheck": { "name": "System Health Check" }
    }
  }
}
```

**File:** `src/i18n/ar/t.json` (Arabic translations)

---

### Phase 5: Database Migration

#### 5.1 Migration Script

**File:** `src/database/migrations/XXXXXX-update-system-roles-translation-keys.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSystemRolesTranslationKeys1234567890
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update Super Administrator role
    await queryRunner.query(`
      UPDATE roles
      SET 
        name = 't.roles.superAdmin.name',
        description = 't.roles.superAdmin.description'
      WHERE name = 'Super Administrator' AND readOnly = true;
    `);

    // Update Owner role
    await queryRunner.query(`
      UPDATE roles
      SET 
        name = 't.roles.owner.name',
        description = 't.roles.owner.description'
      WHERE name = 'Owner' AND readOnly = true;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert Super Administrator
    await queryRunner.query(`
      UPDATE roles
      SET 
        name = 'Super Administrator',
        description = 'Ultimate system administrator with full access to everything'
      WHERE name = 't.roles.superAdmin.name';
    `);

    // Revert Owner
    await queryRunner.query(`
      UPDATE roles
      SET 
        name = 'Owner',
        description = 'Ultimate center owner with full access within the center'
      WHERE name = 't.roles.owner.name';
    `);
  }
}
```

#### 5.2 Update Seeder

**File:** `src/database/seeder.ts`

```typescript
// Update createGlobalRoles method
private async createGlobalRoles(createdBy: string): Promise<void> {
  const globalRoles = [
    {
      name: 't.roles.superAdmin.name', // Use translation key
      description: 't.roles.superAdmin.description',
      type: 'ADMIN',
      createdBy,
      readOnly: true,
    },
  ];
  // ... rest of the code
}
```

#### 5.3 Update Role Definitions

**File:** `src/modules/access-control/constants/roles.ts`

```typescript
export const createOwnerRoleData = (centerId: string) => ({
  name: 't.roles.owner.name', // Use translation key
  description: 't.roles.owner.description',
  rolePermissions: [],
  centerId: centerId,
  readOnly: true,
});
```

**File:** `src/database/factories/role-definitions.ts`

```typescript
export const ADMIN_ROLES: Partial<Role>[] = [
  {
    name: 't.roles.superAdmin.name', // Use translation key
    description: 't.roles.superAdmin.description',
    rolePermissions: [],
    centerId: undefined,
    readOnly: true,
  },
  // ... other roles remain as-is (user-created)
];
```

#### 5.4 Update Permission Constants

**File:** `src/modules/access-control/constants/permissions.ts`

```typescript
export const PERMISSIONS = {
  STAFF: {
    READ: {
      action: 'staff:read',
      name: 't.permissions.staff.read.name', // Use translation key
      scope: PermissionScope.CENTER,
    },
    // ... update all permissions
  },
  // ... update all categories
} as const;
```

---

### Phase 6: Module Registration

#### 6.1 Update SharedModule

**File:** `src/shared/shared.module.ts`

```typescript
import { RoleTranslationService } from './services/role-translation.service';
import { PermissionTranslationService } from './services/permission-translation.service';
import { RoleResponseTransformer } from './common/transformers/role-response.transformer';
import { PermissionResponseTransformer } from './common/transformers/permission-response.transformer';

@Module({
  // ... existing providers
  providers: [
    // ... existing
    RoleTranslationService,
    PermissionTranslationService,
    RoleResponseTransformer,
    PermissionResponseTransformer,
  ],
  exports: [
    // ... existing
    RoleTranslationService,
    PermissionTranslationService,
    RoleResponseTransformer,
    PermissionResponseTransformer,
  ],
})
export class SharedModule {}
```

---

### Phase 7: Testing Strategy

#### 7.1 Unit Tests

**File:** `src/shared/services/__tests__/role-translation.service.spec.ts`

```typescript
describe('RoleTranslationService', () => {
  it('should translate system role (readOnly = true)', () => {
    // Test translation of system role
  });

  it('should return user-created role as-is (readOnly = false)', () => {
    // Test user role is not translated
  });

  it('should fallback to original if translation fails', () => {
    // Test error handling
  });
});
```

#### 7.2 Integration Tests

- Test API endpoints return translated values
- Test with different locales (en, ar)
- Test system roles vs user-created roles

---

## 📝 Implementation Checklist

### Phase 1: Core Utilities ✅

- [ ] Create `TranslationKeyUtil`
- [ ] Create `RoleTranslationService`
- [ ] Create `PermissionTranslationService`
- [ ] Add unit tests

### Phase 2: Transformers ✅

- [ ] Create `RoleResponseTransformer`
- [ ] Create `PermissionResponseTransformer`
- [ ] Add unit tests

### Phase 3: Service Integration ✅

- [ ] Update `RolesService` to use transformer
- [ ] Update `PermissionService` to use transformer
- [ ] Update all methods returning roles/permissions

### Phase 4: Translation Files ✅

- [ ] Add role translations (en, ar)
- [ ] Add permission translations (en, ar)
- [ ] Generate i18n types

### Phase 5: Database Migration ✅

- [ ] Create migration for system roles
- [ ] Update seeder
- [ ] Update role definitions
- [ ] Update permission constants

### Phase 6: Module Registration ✅

- [ ] Register services in `SharedModule`
- [ ] Export services

### Phase 7: Testing ✅

- [ ] Unit tests for services
- [ ] Integration tests for API endpoints
- [ ] Test with multiple locales

---

## 🎨 Code Quality Standards

### 1. **Type Safety**

- Use generated i18n types
- Type all translation keys
- Use TypeScript strict mode

### 2. **Error Handling**

- Always fallback to original value if translation fails
- Log translation errors (non-blocking)
- Never throw errors from translation services

### 3. **Performance**

- Lazy translation (only when needed)
- Cache translation keys if needed
- Avoid unnecessary translations

### 4. **Documentation**

- JSDoc comments for all public methods
- Clear examples in code
- README for translation utilities

### 5. **Maintainability**

- Single responsibility principle
- Clear naming conventions
- Consistent patterns across codebase

---

## 🚀 Benefits

✅ **Scalable:** Easy to add new system roles/permissions  
✅ **Maintainable:** Clear separation of concerns  
✅ **Type-Safe:** Full TypeScript support  
✅ **Performance:** Lazy translation, no overhead for user-created content  
✅ **Flexible:** Supports both system and user-created content  
✅ **Clean Code:** Self-documenting, follows best practices  
✅ **Testable:** Easy to unit test and mock

---

## 📚 Future Enhancements

1. **Caching:** Cache translated values for system roles/permissions
2. **Validation:** Validate translation keys exist during seeding
3. **Admin UI:** Allow admins to see/edit translation keys
4. **Bulk Translation:** Batch translate multiple entities efficiently

---

This plan provides a comprehensive, production-ready implementation that follows best practices and creates maintainable, scalable code.
