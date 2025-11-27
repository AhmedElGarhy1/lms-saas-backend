# Translation Solution Proposal for Permissions, Roles, and Profile Types

## Problem Statement

Currently, permissions, roles, and profile types have hardcoded English names stored in the database and returned in API responses. These need to be translated based on user locale.

**Key Constraint:** We cannot change the database values (they're used as identifiers), but we need to translate them when returning to the frontend.

---

## Proposed Solution

### Approach: Translation Key Mapping System

Instead of storing translations in the database, we'll:
1. Keep English values in the database (as identifiers)
2. Create translation keys in i18n files
3. Create mapping utilities to convert database values → translation keys
4. Translate values when returning in API responses

---

## 1. Translation Key Structure

### 1.1 Permissions

**Structure:** `permissions.{category}.{action}.name`

**Example Keys:**
```json
{
  "permissions": {
    "staff": {
      "read": { "name": "Read Staff" },
      "create": { "name": "Create Staff" },
      "grantUserAccess": { "name": "Grant User Access" }
    },
    "admin": {
      "read": { "name": "Read Admin" },
      "create": { "name": "Create Admin" }
    },
    "center": {
      "create": { "name": "Create Centers" },
      "update": { "name": "Update Centers" }
    },
    "roles": {
      "create": { "name": "Create Role" },
      "update": { "name": "Update Role" }
    },
    "branches": {
      "create": { "name": "Create Branches" },
      "update": { "name": "Update Branches" }
    },
    "system": {
      "healthCheck": { "name": "System Health Check" }
    }
  }
}
```

**Mapping Logic:**
- Permission `action` field: `"staff:read"` → Key: `"permissions.staff.read.name"`
- Split by `:` to get category and action
- Convert action to camelCase if needed

---

### 1.2 Roles

**Structure:** `roles.{roleKey}.name` and `roles.{roleKey}.description`

**Default Roles:**
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
    },
    "student": {
      "name": "Student",
      "description": "Student with basic access to center resources across all centers"
    },
    "teacher": {
      "name": "Teacher",
      "description": "Teacher with educational content management access across all centers"
    },
    "parent": {
      "name": "Parent",
      "description": "Parent with access to student information across all centers"
    }
  }
}
```

**System/Admin Roles:**
```json
{
  "roles": {
    "countryManager": {
      "name": "Country Manager",
      "description": "Country-level manager with administrative access to all centers in the country"
    },
    "technicalSupport": {
      "name": "Technical Support",
      "description": "Technical support staff with system maintenance access"
    },
    "languageCentersManager": {
      "name": "Language Centers Manager",
      "description": "Manager responsible for all language centers"
    },
    "academicCentersManager": {
      "name": "Academic Centers Manager",
      "description": "Manager responsible for all academic centers"
    }
  }
}
```

**Center Roles:**
```json
{
  "roles": {
    "manager": {
      "name": "Manager",
      "description": "Center manager with management capabilities"
    },
    "assistant": {
      "name": "Assistant",
      "description": "Center assistant with limited administrative access"
    },
    "accountant": {
      "name": "Accountant",
      "description": "Center accountant with financial access"
    },
    "cleaner": {
      "name": "Cleaner",
      "description": "Center maintenance staff with basic access"
    },
    "receptionist": {
      "name": "Receptionist",
      "description": "Center receptionist with front desk access"
    },
    "securityGuard": {
      "name": "Security Guard",
      "description": "Center security guard with monitoring access"
    }
  }
}
```

**Mapping Logic:**
- Role name from database → Convert to camelCase key
- Example: `"Super Administrator"` → `"roles.superAdmin.name"`
- Example: `"Country Manager"` → `"roles.countryManager.name"`
- For custom roles (not in predefined list), fallback to original name

---

### 1.3 Profile Types

**Structure:** Already exists! `common.profileTypes.{type}`

**Current Structure:**
```json
{
  "common": {
    "profileTypes": {
      "teacher": "Teacher",
      "staff": "Staff",
      "parent": "Parent",
      "student": "Student",
      "admin": "Admin"
    }
  }
}
```

**Status:** ✅ Already translated, just need to ensure consistent usage.

---

## 2. Implementation Approach

### 2.1 Create Translation Utilities

**File:** `src/shared/utils/permission-translation.util.ts`

```typescript
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';

/**
 * Get translation key for a permission action
 * @param action Permission action (e.g., "staff:read")
 * @returns Translation key (e.g., "permissions.staff.read.name")
 */
export function getPermissionTranslationKey(action: string): string {
  const [category, ...actionParts] = action.split(':');
  const actionKey = actionParts.join('').replace(/-/g, '');
  return `permissions.${category}.${actionKey}.name`;
}

/**
 * Translate permission name
 */
export function translatePermissionName(
  i18n: I18nService<I18nTranslations>,
  action: string,
  fallback?: string,
): string {
  const key = getPermissionTranslationKey(action);
  try {
    return i18n.translate(key);
  } catch {
    return fallback || action;
  }
}
```

**File:** `src/shared/utils/role-translation.util.ts`

```typescript
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';

/**
 * Convert role name to translation key
 * @param roleName Role name from database (e.g., "Super Administrator")
 * @returns Translation key (e.g., "roles.superAdmin.name")
 */
export function getRoleTranslationKey(roleName: string): string {
  // Map known role names to keys
  const roleKeyMap: Record<string, string> = {
    'Super Administrator': 'superAdmin',
    'Owner': 'owner',
    'Student': 'student',
    'Teacher': 'teacher',
    'Parent': 'parent',
    'Country Manager': 'countryManager',
    'Technical Support': 'technicalSupport',
    'Language Centers Manager': 'languageCentersManager',
    'Academic Centers Manager': 'academicCentersManager',
    'Manager': 'manager',
    'Assistant': 'assistant',
    'Accountant': 'accountant',
    'Cleaner': 'cleaner',
    'Receptionist': 'receptionist',
    'Security Guard': 'securityGuard',
  };

  const key = roleKeyMap[roleName] || roleName.toLowerCase().replace(/\s+/g, '');
  return `roles.${key}.name`;
}

/**
 * Get role description translation key
 */
export function getRoleDescriptionTranslationKey(roleName: string): string {
  const roleKeyMap: Record<string, string> = {
    'Super Administrator': 'superAdmin',
    'Owner': 'owner',
    // ... same mapping
  };

  const key = roleKeyMap[roleName] || roleName.toLowerCase().replace(/\s+/g, '');
  return `roles.${key}.description`;
}

/**
 * Translate role name
 */
export function translateRoleName(
  i18n: I18nService<I18nTranslations>,
  roleName: string,
  fallback?: string,
): string {
  const key = getRoleTranslationKey(roleName);
  try {
    return i18n.translate(key);
  } catch {
    return fallback || roleName;
  }
}

/**
 * Translate role description
 */
export function translateRoleDescription(
  i18n: I18nService<I18nTranslations>,
  roleName: string,
  fallback?: string,
): string {
  const key = getRoleDescriptionTranslationKey(roleName);
  try {
    return i18n.translate(key);
  } catch {
    return fallback || '';
  }
}
```

---

### 2.2 Update Services to Use Translations

**File:** `src/modules/access-control/services/permission.service.ts`

```typescript
import { I18nService } from 'nestjs-i18n';
import { translatePermissionName } from '@/shared/utils/permission-translation.util';

@Injectable()
export class PermissionService extends BaseService {
  constructor(
    private readonly permissionRepository: PermissionRepository,
    private readonly i18n: I18nService<I18nTranslations>, // Add I18nService
  ) {
    super();
  }

  async getPermissions(
    actor: ActorUser,
    scope?: PermissionScope,
  ): Promise<Permission[]> {
    // ... existing code ...
    const permissions = await this.permissionRepository.findMany({ where });
    
    // Translate permission names
    return permissions.map(permission => ({
      ...permission,
      name: translatePermissionName(this.i18n, permission.action, permission.name),
    }));
  }
}
```

**File:** `src/modules/access-control/services/roles.service.ts`

```typescript
import { I18nService } from 'nestjs-i18n';
import { translateRoleName, translateRoleDescription } from '@/shared/utils/role-translation.util';

@Injectable()
export class RolesService extends BaseService {
  constructor(
    // ... existing dependencies ...
    private readonly i18n: I18nService<I18nTranslations>, // Add I18nService
  ) {
    super();
  }

  async paginateRoles(query: PaginateRolesDto, actor: ActorUser) {
    const result = await this.rolesRepository.paginateRoles(query, actor);
    
    // Translate role names and descriptions
    result.data = result.data.map(role => ({
      ...role,
      name: translateRoleName(this.i18n, role.name, role.name),
      description: role.description 
        ? translateRoleDescription(this.i18n, role.name, role.description)
        : role.description,
    }));
    
    return result;
  }
}
```

---

### 2.3 Update DTOs (Optional - For Response Transformation)

Alternatively, we can use DTOs with `@Transform` decorator to translate values automatically:

**File:** `src/modules/access-control/dto/permission-response.dto.ts` (new)

```typescript
import { Expose, Transform } from 'class-transformer';
import { I18nService } from 'nestjs-i18n';
import { translatePermissionName } from '@/shared/utils/permission-translation.util';

export class PermissionResponseDto {
  @Expose()
  id: string;

  @Expose()
  action: string;

  @Expose()
  @Transform(({ obj, value }) => {
    const i18n = I18nContext.current()?.service;
    if (i18n) {
      return translatePermissionName(i18n, obj.action, value);
    }
    return value;
  })
  name: string;

  @Expose()
  description?: string;

  @Expose()
  scope: PermissionScope;
}
```

---

## 3. Migration Strategy

### Phase 1: Add Translation Keys
1. Add all permission translations to `i18n/en/t.json` and `i18n/ar/t.json`
2. Add all role translations to both locale files
3. Generate i18n types

### Phase 2: Create Utilities
1. Create `permission-translation.util.ts`
2. Create `role-translation.util.ts`
3. Add unit tests for mapping logic

### Phase 3: Update Services
1. Inject `I18nService` in `PermissionService`
2. Inject `I18nService` in `RolesService`
3. Update methods to translate names/descriptions
4. Test API responses return translated values

### Phase 4: Update Controllers (if needed)
1. Ensure controllers use translated services
2. Test with different locales

### Phase 5: Frontend Integration
1. Frontend should use translated values from API
2. No changes needed if API returns translated values

---

## 4. Benefits

✅ **Database Integrity:** Keep English identifiers in database  
✅ **Translation Support:** All names/descriptions translated  
✅ **Backward Compatible:** Fallback to original value if translation missing  
✅ **Type Safe:** Use generated i18n types  
✅ **Maintainable:** Centralized translation keys  
✅ **Extensible:** Easy to add new permissions/roles  

---

## 5. Considerations

### 5.1 Custom Roles
- Custom roles created by users won't have translation keys
- Solution: Fallback to original name (or allow users to provide translations)

### 5.2 Performance
- Translation happens on every API call
- Consider caching if performance is an issue
- Or use DTO transformation (happens once per response)

### 5.3 Database Seeding
- Seeder should still use English names (they're identifiers)
- Translations applied only when returning to frontend

---

## 6. Alternative Approaches Considered

### Option A: Store Translations in Database
❌ **Rejected:** Would require schema changes, complex queries, harder to maintain

### Option B: Frontend-Only Translation
❌ **Rejected:** Backend should provide translated values, frontend shouldn't need mapping logic

### Option C: Separate Translation Table
❌ **Rejected:** Over-engineered, i18n system already exists

### Option D: Current Proposal (Mapping + i18n)
✅ **Selected:** Clean, maintainable, uses existing infrastructure

---

## Next Steps

1. **Review this proposal** with team
2. **Approve translation key structure**
3. **Create translation files** (en + ar)
4. **Implement utilities**
5. **Update services**
6. **Test and verify**

