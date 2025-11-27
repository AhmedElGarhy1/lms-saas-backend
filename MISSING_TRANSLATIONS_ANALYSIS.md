# Missing Translations Analysis

## Overview

This document identifies all places in the system where English text is hardcoded and should be moved to the translation system (i18n).

---

## 1. Permissions (HIGH PRIORITY)

### Location: `src/modules/access-control/constants/permissions.ts`

**Issue:** All permission names are hardcoded in English.

**Total Count:** ~40+ permission names

**Examples:**
- `'Read Staff'`
- `'Create Staff'`
- `'Grant User Access'`
- `'Read Admin'`
- `'Create Centers'`
- `'Update Centers'`
- `'Delete Centers'`
- `'Activate/Deactivate Centers'`
- `'Create Role'`
- `'Update Role'`
- `'Delete Role'`
- `'Assign Role'`
- `'Create Branches'`
- `'System Health Check'`
- And many more...

**Where Used:**
- Stored in database `permissions` table (`name` column)
- Returned in API responses via `PermissionService.getPermissions()`
- Displayed in frontend permission management UI
- Used in role permission assignment interfaces

**Impact:** All permission names appear in English regardless of user locale.

---

## 2. Roles (HIGH PRIORITY)

### Location 1: `src/modules/access-control/constants/roles.ts`

**Issue:** Default role names are hardcoded in English.

**Roles:**
- `'Super Administrator'` (DefaultRoles.SUPER_ADMIN)
- `'Owner'` (DefaultRoles.OWNER)
- `'Student'` (DefaultRoles.STUDENT)
- `'Teacher'` (DefaultRoles.TEACHER)
- `'Parent'` (DefaultRoles.PARENT)

**Where Used:**
- Stored in database `roles` table
- Used in role creation and validation
- Referenced in access control logic
- Returned in API responses

### Location 2: `src/database/factories/role-definitions.ts`

**Issue:** Many role names and descriptions are hardcoded in English.

**System Roles:**
- `'Parent'` - "Parent with access to student information across all centers"
- `'Student'` - "Student with basic access to center resources across all centers"
- `'Teacher'` - "Teacher with educational content management access across all centers"

**Admin Roles:**
- `'Super Administrator'` - "Ultimate system administrator with full access to everything"
- `'Country Manager'` - "Country-level manager with administrative access to all centers in the country"
- `'Technical Support'` - "Technical support staff with system maintenance access"
- `'Language Centers Manager'` - "Manager responsible for all language centers"
- `'Academic Centers Manager'` - "Manager responsible for all academic centers"

**Center Roles:**
- `'Owner'` - "Ultimate center owner with full access within the center"
- `'Manager'` - "Center manager with management capabilities"
- `'Assistant'` - "Center assistant with limited administrative access"
- `'Accountant'` - "Center accountant with financial access"
- `'Cleaner'` - "Center maintenance staff with basic access"
- `'Receptionist'` - "Center receptionist with front desk access"
- `'Security Guard'` - "Center security guard with monitoring access"

**Where Used:**
- Database seeding
- Role creation
- Returned in API responses via `RoleResponseDto`
- Displayed in role management UI
- Used in role assignment interfaces

**Impact:** All role names and descriptions appear in English regardless of user locale.

---

## 3. Profile Types (MEDIUM PRIORITY)

### Location: `src/shared/common/enums/profile-type.enum.ts`

**Issue:** Profile type enum values are hardcoded in English.

**Profile Types:**
- `'Teacher'` (ProfileType.TEACHER)
- `'Staff'` (ProfileType.STAFF)
- `'Parent'` (ProfileType.PARENT)
- `'Student'` (ProfileType.STUDENT)
- `'Admin'` (ProfileType.ADMIN)

**Note:** Translations already exist in `t.json` under `common.profileTypes`, but the enum values themselves are English.

**Where Used:**
- Stored in database `user_profiles` table (`profileType` column)
- Used in type checking and validation
- Returned in API responses
- Used in filtering and searching

**Impact:** Profile type values in database and API responses are English, though frontend can translate them using existing keys.

---

## 4. Other Potential Issues

### Role Descriptions
- All role descriptions in `role-definitions.ts` are in English
- Role descriptions stored in database and returned in API responses

### Export Headers
- Export mapper headers in `role-export.mapper.ts` and `role-response-export.mapper.ts` may contain English headers
- Need to verify if these are translated

---

## Summary Statistics

| Category | Count | Priority | Impact |
|----------|-------|----------|--------|
| Permissions | ~40+ | HIGH | All permission names in English |
| Default Roles | 5 | HIGH | Core system roles in English |
| System/Admin Roles | 5 | HIGH | Administrative roles in English |
| Center Roles | 7 | HIGH | Center-specific roles in English |
| Role Descriptions | 12+ | MEDIUM | Role descriptions in English |
| Profile Types | 5 | MEDIUM | Enum values in English (translations exist) |

**Total:** ~70+ hardcoded English strings that need translation

---

## Current Translation System

### Structure
- **Location:** `src/i18n/{locale}/t.json`
- **Locales:** `en`, `ar`
- **Service:** `I18nService` from `nestjs-i18n`
- **Usage:** Controllers and services inject `I18nService` and use `translate()` method

### Existing Translation Keys
- `common.profileTypes.*` - Profile type translations exist
- `common.resources.*` - Resource name translations
- Various success/error messages

### Missing Translation Keys
- No `permissions.*` namespace
- No `roles.*` namespace
- No `roleDescriptions.*` namespace

---

## Next Steps

1. **Document all issues** ✅ (This document)
2. **Propose translation structure** (Next step)
3. **Design implementation approach** (Next step)
4. **Implement translation keys** (After approval)
5. **Update code to use translations** (After approval)

