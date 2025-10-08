# Scope Guard Usage

The Scope Guard provides role-based access control based on user scopes. It supports two main scopes:

- `ADMIN`: For administrative users (SuperAdmin, TechnicalSupport, RegionalManager)
- `CENTER`: For center-specific users (Assistant, Worker, AssistantManager, Owner)

## Usage

### 1. Import the decorator and guard

```typescript
import { Scope } from '@/shared/common/decorators/scope.decorator';
import { ScopeGuard } from '@/shared/common/guards/scope.guard';
```

### 2. Apply to controllers or methods

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { Scope } from '@/shared/common/decorators/scope.decorator';
import { ScopeGuard } from '@/shared/common/guards/scope.guard';

@Controller('admin')
@UseGuards(ScopeGuard)
export class AdminController {
  @Get('system-settings')
  @Scope('ADMIN') // Only ADMIN scope users can access
  getSystemSettings() {
    return { message: 'System settings' };
  }

  @Get('center-data')
  @Scope('CENTER') // Both ADMIN and CENTER scope users can access
  getCenterData() {
    return { message: 'Center data' };
  }
}
```

### 3. Scope Hierarchy

- **SYSTEM scope**: Has access to everything (SuperAdmin)
- **ADMIN scope**: Has access to ADMIN and CENTER scopes
- **CENTER scope**: Only has access to CENTER scope

### 4. Center ID Extraction

The guard automatically extracts `centerId` from:

- Request parameters (`req.params.centerId`)
- Query parameters (`req.query.centerId`)
- Request body (`req.body.centerId`)
- User object (`req.user.centerId`)

### 5. Error Handling

The guard throws `ForbiddenException` when:

- User is not authenticated
- User has no role
- User doesn't have the required scope

## Examples

### Admin-only endpoint

```typescript
@Get('admin-only')
@Scope('ADMIN')
adminOnlyMethod() {
  // Only users with ADMIN scope can access
}
```

### Center-specific endpoint

```typescript
@Get('center-specific')
@Scope('CENTER')
centerSpecificMethod() {
  // Users with ADMIN or CENTER scope can access
}
```

### Combined with other guards

```typescript
@Get('protected')
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionsGuard)
@Scope('ADMIN')
@Permissions('user:read')
protectedMethod() {
  // Requires JWT auth, ADMIN scope, and user:read permission
}
```
