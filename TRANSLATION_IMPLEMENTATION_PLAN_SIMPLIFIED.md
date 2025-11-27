# Translation Implementation Plan - Simplified Approach

## 🎯 Overview

Simple, maintainable translation system for roles and permissions using existing `readOnly` flag and i18n infrastructure.

**Core Principle:** System values (readOnly roles, all permissions) store translation keys in `name`/`description` columns. User-created values store actual text in user's language.

---

## 📋 Architecture

### Translation Logic

| Entity | Logic | Storage |
|--------|-------|---------|
| **Roles** | `readOnly = true` → Translate<br>`readOnly = false` → Return as-is | Translation key for system roles<br>Actual text for user roles |
| **Permissions** | Always translate (all are system) | Translation key in `name`/`description` |

### Translation Key Format

- **Roles:** `t.roles.{roleKey}.name` and `t.roles.{roleKey}.description`
- **Permissions:** `t.permissions.{category}.{action}.name` and `t.permissions.{category}.{action}.description`

---

## 🏗️ Implementation

### Phase 1: Simple Translation Utility

**File:** `src/shared/utils/translation.util.ts`

```typescript
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';

/**
 * Check if a string is a translation key
 */
export function isTranslationKey(value: string | null | undefined): boolean {
  return value?.startsWith('t.') ?? false;
}

/**
 * Translate a value if it's a translation key, otherwise return as-is
 * @param i18n I18nService instance
 * @param value Value to translate (translation key or actual text)
 * @param shouldTranslate Whether to attempt translation
 * @returns Translated value or original value
 */
export function translateIfNeeded(
  i18n: I18nService<I18nTranslations>,
  value: string | null | undefined,
  shouldTranslate: boolean,
): string | null {
  if (!value) {
    return null;
  }

  if (shouldTranslate && isTranslationKey(value)) {
    try {
      return i18n.translate(value as any);
    } catch (error) {
      // Fallback to original if translation fails
      return value;
    }
  }

  return value;
}
```

**That's it!** Just 2 simple functions.

---

### Phase 2: Update Services Directly

#### 2.1 Update RolesService

**File:** `src/modules/access-control/services/roles.service.ts`

```typescript
// Add imports
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';
import { translateIfNeeded } from '@/shared/utils/translation.util';

@Injectable()
export class RolesService extends BaseService {
  constructor(
    // ... existing dependencies ...
    private readonly i18n: I18nService<I18nTranslations>, // Add I18nService
  ) {
    super();
  }

  /**
   * Helper to translate a single role
   */
  private translateRole(role: Role): Role {
    return {
      ...role,
      name: translateIfNeeded(this.i18n, role.name, role.readOnly) ?? role.name,
      description: translateIfNeeded(this.i18n, role.description, role.readOnly),
    };
  }

  async paginateRoles(query: PaginateRolesDto, actor: ActorUser) {
    const result = await this.rolesRepository.paginateRoles(query, actor);
    
    // Translate roles inline
    result.data = result.data.map(role => this.translateRole(role));
    
    return result;
  }

  async getRoleById(roleId: string, actor: ActorUser) {
    const role = await this.rolesRepository.findOne(roleId);
    // ... validation ...
    
    return this.translateRole(role);
  }

  // Apply to all methods that return roles
  async createRole(data: CreateRoleRequestDto, actor: ActorUser) {
    const role = await this.rolesRepository.createRole(data);
    return this.translateRole(role);
  }

  async updateRole(roleId: string, data: CreateRoleRequestDto, actor: ActorUser) {
    const role = await this.rolesRepository.updateRole(roleId, data, actor);
    return this.translateRole(role);
  }

  // ... other methods
}
```

#### 2.2 Update PermissionService

**File:** `src/modules/access-control/services/permission.service.ts`

```typescript
// Add imports
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';
import { translateIfNeeded } from '@/shared/utils/translation.util';

@Injectable()
export class PermissionService extends BaseService {
  constructor(
    private readonly permissionRepository: PermissionRepository,
    private readonly i18n: I18nService<I18nTranslations>, // Add I18nService
  ) {
    super();
  }

  /**
   * Helper to translate a single permission
   */
  private translatePermission(permission: Permission): Permission {
    return {
      ...permission,
      name: translateIfNeeded(this.i18n, permission.name, true) ?? permission.name,
      description: translateIfNeeded(this.i18n, permission.description, true),
    };
  }

  async getPermissions(
    actor: ActorUser,
    scope?: PermissionScope,
  ): Promise<Permission[]> {
    const permissions = await this.permissionRepository.findMany({ where });
    
    // Translate permissions (all are system, so always translate)
    return permissions.map(p => this.translatePermission(p));
  }

  async getPermissionByAction(action: string): Promise<Permission | null> {
    const permission = await this.permissionRepository.findMany({ where: { action } });
    if (permission.length === 0) return null;
    
    return this.translatePermission(permission[0]);
  }
}
```

---

### Phase 3: Translation Files

#### 3.1 Add Role Translations

**File:** `src/i18n/en/t.json`

Add to existing structure:
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

Add Arabic translations:
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

#### 3.2 Add Permission Translations

**File:** `src/i18n/en/t.json`

Add permissions section:
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

**File:** `src/i18n/ar/t.json` - Add Arabic translations for all permissions

---

### Phase 4: Database Migration

#### 4.1 Update System Roles in Database

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

#### 4.2 Update Constants and Seeders

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

**File:** `src/database/seeder.ts`

```typescript
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

#### 4.3 Update Permission Constants

**File:** `src/modules/access-control/constants/permissions.ts`

```typescript
export const PERMISSIONS = {
  STAFF: {
    READ: {
      action: 'staff:read',
      name: 't.permissions.staff.read.name', // Use translation key
      scope: PermissionScope.CENTER,
    },
    CREATE: {
      action: 'staff:create',
      name: 't.permissions.staff.create.name',
      scope: PermissionScope.CENTER,
    },
    // ... update all permissions
  },
  // ... update all categories
} as const;
```

---

### Phase 5: Generate i18n Types

After adding translations, regenerate types:

```bash
npm run generate:i18n-types
# or whatever command generates i18n types
```

---

## 📝 Implementation Checklist

### Phase 1: Core Utility ✅
- [ ] Create `translation.util.ts` with 2 simple functions
- [ ] Add unit tests (optional but recommended)

### Phase 2: Service Updates ✅
- [ ] Inject `I18nService` in `RolesService`
- [ ] Add `translateRole()` helper method
- [ ] Update all methods returning roles to use translation
- [ ] Inject `I18nService` in `PermissionService`
- [ ] Add `translatePermission()` helper method
- [ ] Update all methods returning permissions to use translation

### Phase 3: Translation Files ✅
- [ ] Add role translations to `i18n/en/t.json`
- [ ] Add role translations to `i18n/ar/t.json`
- [ ] Add permission translations to `i18n/en/t.json`
- [ ] Add permission translations to `i18n/ar/t.json`
- [ ] Generate i18n types

### Phase 4: Database Migration ✅
- [ ] Create migration for system roles
- [ ] Update `createOwnerRoleData()` in constants
- [ ] Update `ADMIN_ROLES` in role-definitions
- [ ] Update seeder
- [ ] Update permission constants

### Phase 5: Testing ✅
- [ ] Test API endpoints return translated values
- [ ] Test with different locales (en, ar)
- [ ] Test system roles vs user-created roles
- [ ] Test permissions are always translated

---

## 🎨 Code Quality

### Principles

✅ **Simplicity:** Minimal code, easy to understand  
✅ **Maintainability:** Logic in one place, clear flow  
✅ **Type Safety:** Use generated i18n types  
✅ **Error Handling:** Graceful fallback to original value  
✅ **Performance:** Lazy translation, no overhead  

### Benefits

- **1 utility file** instead of 5+ files
- **~50 lines of code** instead of ~300
- **Direct service integration** - no extra layers
- **Easy to understand** - clear flow
- **Easy to maintain** - all logic visible
- **Same functionality** - does everything needed

---

## 🚀 Summary

This simplified approach:

1. **One utility file** with 2 simple functions
2. **Direct translation** in service methods
3. **No extra layers** - no transformers, no separate services
4. **Clear and maintainable** - anyone can understand it
5. **Production-ready** - error handling, type safety, performance

**Total files to create:** 1 (translation.util.ts)  
**Total files to modify:** 4 (RolesService, PermissionService, constants, seeders)  
**Total complexity:** Minimal

This is the sweet spot between functionality and simplicity! 🎯

