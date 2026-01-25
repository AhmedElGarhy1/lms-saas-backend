# Module Structure Analysis

## Standard Module Structure Pattern

Based on analysis of modules across the codebase, the standard structure is:

```
{module-name}/
├── controllers/
│   ├── {resource}.controller.ts
│   └── {resource}-actions.controller.ts
├── dto/
│   ├── create-{resource}.dto.ts
│   ├── update-{resource}.dto.ts
│   ├── paginate-{resource}.dto.ts
│   └── ...
├── entities/
│   └── {resource}.entity.ts
├── enums/
│   └── {resource}-activity-type.enum.ts
├── events/
│   └── {resource}.events.ts
├── listeners/
│   ├── {resource}.listener.ts
├── repositories/
│   └── {resource}.repository.ts
├── services/
│   └── {resource}.service.ts
└── {module-name}.module.ts
```

## Examples

### ✅ Students Module (Standard)

```
students/
├── controllers/
│   ├── student.controller.ts
│   └── student-actions.controller.ts
├── dto/
├── entities/
├── enums/
├── events/
├── listeners/
├── repositories/
├── services/
└── students.module.ts
```

### ✅ Teachers Module (Standard)

```
teachers/
├── controllers/
│   ├── teacher.controller.ts
│   └── teacher-actions.controller.ts
├── dto/
├── entities/
├── enums/
├── events/
├── listeners/
├── repositories/
├── services/
└── teachers.module.ts
```

### ✅ Staff Module (Standard)

```
staff/
├── controllers/
│   ├── staff.controller.ts
│   └── staff-actions.controller.ts
├── dto/
├── entities/
├── enums/
├── events/
├── listeners/
├── repositories/
├── services/
└── staff.module.ts
```

### ✅ Centers Module (Multi-Resource, Standard)

```
centers/
├── controllers/
│   ├── centers.controller.ts
│   ├── centers-actions.controller.ts
│   ├── centers-access.controller.ts
│   ├── centers-access-actions.controller.ts
│   ├── branches.controller.ts
│   ├── branches-actions.controller.ts
│   └── branches-access.controller.ts
├── dto/
├── entities/
├── enums/
├── events/
├── listeners/
├── repositories/
├── services/
└── centers.module.ts
```

## Classes Module - Current Structure

### ❌ Inconsistencies Found

```
classes/
├── controllers/ ✅
├── dto/ ✅
├── entities/ ✅
├── enums/ ✅
├── events/ ✅
├── interfaces/ ⚠️ (Only in some modules: user, notifications, rate-limit)
├── listeners/ ✅
├── mappers/ ❌ (Should be in shared/common/mappers/)
├── repositories/ ✅
├── services/ ✅
├── utils/ ⚠️ (Only in some modules: notifications, rate-limit, access-control)
└── classes.module.ts ✅
```

## Issues Identified

### 1. Mappers Location ❌

- **Current**: `src/modules/classes/mappers/`
- **Expected**: `src/shared/common/mappers/`
- **Reason**: All other export mappers are in `shared/common/mappers/`
  - `user-export.mapper.ts`
  - `center-export.mapper.ts`
  - `role-export.mapper.ts`
  - etc.

### 2. Utils Folder ⚠️

- **Current**: `src/modules/classes/utils/`
- **Status**: Acceptable (other modules have utils too)
- **Examples**:
  - `notifications/utils/`
  - `rate-limit/utils/`
  - `access-control/utils/`

### 3. Interfaces Folder ⚠️

- **Current**: `src/modules/classes/interfaces/`
- **Status**: Acceptable (other modules have interfaces too)
- **Examples**:
  - `user/interfaces/`
  - `notifications/adapters/interfaces/`
  - `rate-limit/interfaces/`

## Recommendations

### Priority 1: Move Mappers to Shared

Move `src/modules/classes/mappers/` → `src/shared/common/mappers/`

**Files to move:**

- `class-export.mapper.ts` → `src/shared/common/mappers/class-export.mapper.ts`
- `group-export.mapper.ts` → `src/shared/common/mappers/group-export.mapper.ts`

**Update imports:**

- Update all imports from `../mappers/` to `@/shared/common/mappers/`
- Update `src/shared/common/mappers/index.ts` to export new mappers

### Priority 2: Keep Utils and Interfaces

These are acceptable as they follow patterns from other modules.

## Standard Module Naming Conventions

### Controllers

- Main CRUD: `{resource}.controller.ts`
- Actions (bulk, export): `{resource}-actions.controller.ts`
- Access control: `{resource}-access.controller.ts`
- Access actions: `{resource}-access-actions.controller.ts`

### Services

- Main service: `{resource}.service.ts`
- Specialized services: `{resource}-{feature}.service.ts`
  - Example: `branch-access.service.ts`, `group-schedule.service.ts`

### Repositories

- One repository per entity: `{resource}.repository.ts`

### DTOs

- Create: `create-{resource}.dto.ts`
- Update: `update-{resource}.dto.ts`
- Paginate: `paginate-{resource}.dto.ts`
- Response: `{resource}-response.dto.ts`
- Param: `{resource}-id-param.dto.ts`
- Bulk: `bulk-{action}-{resource}.dto.ts`

## Module File Organization Best Practices

1. **Controllers**: Group by resource/feature
2. **Services**: One main service + specialized services as needed
3. **Repositories**: One per entity
4. **DTOs**: Group by purpose (create, update, paginate, etc.)
5. **Mappers**: Should be in `shared/common/mappers/` for consistency
6. **Utils**: Module-specific utilities (acceptable)
7. **Interfaces**: Module-specific interfaces (acceptable)

## Summary

The classes module structure is **mostly consistent** with other modules, but has one inconsistency:

- ❌ **Mappers should be moved to `shared/common/mappers/`** to follow the established pattern

All other folders (utils, interfaces) are acceptable as they exist in other modules too.
