# Type-Safe Translation System

This document explains how to use the type-safe translation system in your NestJS application.

## 🎯 Benefits

- **Compile-time checking** - Translation keys are validated at build time
- **IntelliSense support** - Auto-completion for all available translation keys
- **Refactoring safety** - Renaming translation keys will show errors if not updated
- **No runtime errors** - Invalid translation keys are caught during development
- **Auto-inferred types** - Types are automatically generated from your actual locale files
- **No manual maintenance** - Add new translations and types are automatically updated

## 📁 File Structure

```
src/
├── shared/
│   ├── types/
│   │   └── translation-keys.type.ts     # Type definitions for all translation keys
│   ├── utils/
│   │   ├── i18n-type-safe.util.ts       # Type-safe translation utilities
│   │   └── exception-type-safe.util.ts  # Type-safe exception utilities
│   └── examples/
│       └── type-safe-translation-usage.example.ts  # Usage examples
└── i18n/
    └── en/
        ├── common.ts
        ├── validation.ts
        ├── api.ts
        ├── errors.ts
        ├── actions.ts
        ├── userMessages.ts
        ├── success.ts
        ├── system.ts
        └── index.ts
```

## 🚀 Basic Usage

### 1. Simple Translation

```typescript
import { t } from '@/shared/utils/i18n-type-safe.util';

// ✅ Type-safe - IntelliSense will show available keys
const message = t('common.welcome');
const goodbye = t('common.goodbye');
const loading = t('common.loading');
```

### 2. Translation with Variables

```typescript
import { t } from '@/shared/utils/i18n-type-safe.util';

// ✅ Type-safe with variables
const message = t('common.welcome', {
  args: { name: 'John' },
});
```

### 3. Smart Translation Function

```typescript
import { t } from '@/shared/utils/i18n-type-safe.util';

// ✅ One smart function handles all translation types
const welcome = t('common.buttons.save');
const error = t('errors.RESOURCE_NOT_FOUND', { args: { id: '123' } });
const validation = t('validation.required');
const userMsg = t('userMessages.resourceNotFound', {
  args: { resource: 'user' },
});
const action = t('actions.retry');
const system = t('system.ready');
const success = t('api.success.create');
const errorMsg = t('api.error.update');
const tableColumn = t('table.columns.centerName');
const paginationInfo = t('pagination.showingResults', {
  args: { start: 1, end: 10, total: 100 },
});
```

## 🛡️ Type-Safe Exceptions

### 1. Simple Exception Utilities

```typescript
import {
  createNotFoundError,
  createValidationError,
  createUnauthorizedError,
  createForbiddenError,
  createUserExistsError,
  createCenterRequiredError,
  createInternalServerError,
} from '@/shared/utils/exception-type-safe.util';

// ✅ Type-safe exception creation
throw createNotFoundError('user', { id: '123' });
throw createValidationError(validationDetails);
throw createUnauthorizedError();
throw createForbiddenError();
throw createUserExistsError('user@example.com');
throw createCenterRequiredError();
throw createInternalServerError();
```

### 2. Custom Exceptions with Translation

```typescript
import { NotFoundException } from '@nestjs/common';
import { t } from '@/shared/utils/i18n-type-safe.util';

// ✅ Type-safe custom exceptions
throw new NotFoundException({
  message: t('errors.RESOURCE_NOT_FOUND', { args: { resource: 'page' } }),
  userMessage: t('userMessages.resourceNotFound', {
    args: { resource: 'page' },
  }),
});
```

## 📝 Controller Examples

### 1. Basic Controller

```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';
import { t } from '@/shared/utils/i18n-type-safe.util';
import { createNotFoundError } from '@/shared/utils/exception-type-safe.util';

@Controller('users')
export class UsersController {
  @Get('welcome')
  getWelcome() {
    // ✅ Type-safe translation
    return { message: t('common.messages.loading') };
  }

  @Get(':id')
  getUser(id: string) {
    if (id === '999') {
      // ✅ Type-safe exception
      throw createNotFoundError('user', { id });
    }

    return { id, name: 'John Doe' };
  }

  @Post()
  createUser(@Body() userData: any) {
    // ✅ Type-safe success message
    return {
      message: t('api.success.create'),
      data: userData,
    };
  }
}
```

### 2. Validation Controller

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { t } from '@/shared/utils/i18n-type-safe.util';
import { createValidationError } from '@/shared/utils/exception-type-safe.util';

@Controller('validate')
export class ValidationController {
  @Post('email')
  validateEmail(@Body() data: { email: string }) {
    if (!data.email) {
      // ✅ Type-safe validation error
      throw createValidationError([
        {
          field: 'email',
          value: data.email,
          message: t('validation.required'),
          code: 'VALIDATION_ERROR' as any,
          suggestion: 'Please provide a valid email address',
        },
      ]);
    }

    return { valid: true };
  }
}
```

## 🔧 Adding New Translation Keys

### 1. Add to Translation File

```typescript
// src/i18n/en/common.ts
export default {
  buttons: {
    save: 'Save',
    cancel: 'Cancel',
    newButton: 'New Button', // ✅ Add new translation here
    // ... other translations
  },
  // ... other sections
} as const;
```

### 2. Use in Code

```typescript
// ✅ Types are automatically inferred! No manual type updates needed
const message = t('common.buttons.newButton');
```

### 3. Types are Auto-Generated

The type system automatically infers all available keys from your locale files:

```typescript
// This is automatically generated from your locale files
export type CommonKeys =
  | 'common.buttons.save'
  | 'common.buttons.cancel'
  | 'common.buttons.newButton' // ✅ Automatically added!
  | 'common.labels.name'
  | 'common.labels.email';
// ... all other keys from your files
```

## 🎨 Available Translation Categories

### Common Keys

- `common.welcome`, `common.goodbye`, `common.hello`
- `common.yes`, `common.no`, `common.ok`, `common.cancel`
- `common.save`, `common.delete`, `common.edit`
- `common.loading`, `common.error`, `common.success`

### API Keys

- `api.success.create`, `api.success.update`, `api.success.delete`
- `api.error.create`, `api.error.update`, `api.error.delete`

### Error Keys

- `errors.RESOURCE_NOT_FOUND`, `errors.VALIDATION_FAILED`
- `errors.AUTHENTICATION_FAILED`, `errors.ACCESS_DENIED`
- `errors.INTERNAL_SERVER_ERROR`, `errors.USER_ALREADY_EXISTS`

### Validation Keys

- `validation.required`, `validation.invalid`, `validation.email`
- `validation.minLength`, `validation.maxLength`, `validation.phone`

### Success Keys

- `success.create`, `success.update`, `success.delete`
- `success.login`, `success.logout`, `success.register`

### Action Keys

- `actions.retry`, `actions.continue`, `actions.goBack`
- `actions.contactSupport`, `actions.verifyCredentials`

### User Message Keys

- `userMessages.resourceNotFound`, `userMessages.validationFailed`
- `userMessages.authenticationFailed`, `userMessages.accessDenied`

### System Keys

- `system.ready`, `system.initializing`, `system.healthCheck`
- `system.online`, `system.offline`, `system.maintenance`

### Table Keys

- `table.columns.centerName`, `table.columns.contact`, `table.columns.roleName`
- `table.actions.deleteSelected`, `table.actions.toggleStatus`
- `table.selection.selectedItems`, `table.selection.selectAll`, `table.selection.deselectAll`
- `table.trashToggle.activeItems`, `table.trashToggle.deletedItems`

### Pagination Keys

- `pagination.selectedRows`, `pagination.showingResults`
- `pagination.rowsPerPage`, `pagination.pageOf`

## 🚨 Important Notes

1. **Use the smart `t` function** - One function handles all translation types
2. **Types are auto-inferred** - No need to manually update type definitions
3. **Use `as any` sparingly** - Only when dealing with dynamic keys
4. **Full key paths** - Use complete key paths like `'common.buttons.save'`
5. **Exception utilities are type-safe** - All exception creation functions are fully typed
6. **Use `as const` in locale files** - Ensures proper type inference

## 🔍 Debugging

If you get type errors:

1. **Check if the key exists** in the translation file
2. **Verify the key is properly nested** in the locale file structure
3. **Use `as any`** for dynamic keys (but prefer type-safe alternatives)
4. **Check function parameters** - ensure you're using the correct parameter types
5. **Ensure `as const` is used** in your locale files for proper type inference

## 📚 Examples

The smart `t` function is used throughout the codebase:

- `src/shared/utils/exception-type-safe.util.ts` - Exception utilities
- `src/shared/common/pipes/validation.pipe.ts` - Validation pipe
- `src/modules/locale/controllers/locale.controller.ts` - Locale controller

## 🎯 Best Practices

1. **Use the smart `t` function** - One function for all translation needs
2. **Use IntelliSense** - Let your IDE suggest available keys
3. **Group related keys** - Use consistent naming patterns
4. **Add context variables** - Use the `args` parameter for dynamic content
5. **Prefer exceptions utilities** - Use the provided exception functions
6. **Use `as const` in locale files** - Ensures proper type inference
7. **Organize translations logically** - Group related translations in nested objects

This smart type-safe system ensures your translations are always correct and provides excellent developer experience with full IntelliSense support! Types are automatically inferred from your locale files, so you never need to manually maintain type definitions. One simple `t()` function handles everything!
