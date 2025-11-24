# Translation Standardization Guide

## Overview

This document outlines the translation structure standards and best practices for maintaining consistency, scalability, and maintainability across all translation files in the application.

## Table of Contents

1. [Translation Structure](#translation-structure)
2. [Naming Conventions](#naming-conventions)
3. [Namespace Organization](#namespace-organization)
4. [Dynamic Patterns](#dynamic-patterns)
5. [Best Practices](#best-practices)
6. [Common Patterns](#common-patterns)
7. [Migration Guide](#migration-guide)

---

## Translation Structure

### File Organization

- **Location**: `src/i18n/{locale}/t.json`
- **Languages**: English (`en`) and Arabic (`ar`)
- **Single File**: All translations consolidated into one `t.json` file per language

### Root Namespaces

```json
{
  "actions": {...},        // User action suggestions
  "auth": {...},           // Authentication-related
  "common": {...},         // Shared data structures (status, channels, resources)
  "confirm": {...},        // Confirmation dialogs
  "errors": {...},         // Error messages (camelCase only)
  "success": {...},        // Success messages
  "validation": {...},    // Validation patterns (dynamic)
  "toast": {...},         // Toast notifications
  "tooltip": {...},       // Tooltip messages
  "empty": {...},         // Empty state messages
  "date": {...},          // Date formatting
  "time": {...},          // Time formatting
  "currency": {...},      // Currency formatting
  "system": {...}         // System-related (organized by purpose)
}
```

---

## Naming Conventions

### ✅ **DO: Use camelCase**

All translation keys must use **camelCase** naming:

```json
{
  "errors": {
    "userNotFound": "User not found", // ✅ Correct
    "validationFailed": "Validation failed", // ✅ Correct
    "qrCodeGenerationFailed": "QR code generation failed" // ✅ Correct
  }
}
```

### ❌ **DON'T: Use UPPERCASE or snake_case**

```json
{
  "errors": {
    "USER_NOT_FOUND": "...", // ❌ Wrong - removed during standardization
    "validation_failed": "...", // ❌ Wrong
    "QR_CODE_GENERATION_FAILED": "..." // ❌ Wrong - removed during standardization
  }
}
```

**Note**: UPPERCASE constants are only used in `ErrorCode` enum for programmatic error codes, not in translation keys.

---

## Namespace Organization

### 1. Errors Namespace (`errors.*`)

**Structure**: All error messages in camelCase, organized by purpose.

```json
{
  "errors": {
    // Simple error messages
    "userNotFound": "User not found",
    "validationFailed": "Validation failed",
    "authenticationFailed": "Authentication failed",

    // Structured error objects (for complex errors)
    "centerInactive": {
      "title": "Center Inactive",
      "description": "The selected center is currently inactive..."
    },

    // Operation-specific errors
    "qrCodeGenerationFailed": "QR code generation failed",
    "twoFactorGenerationFailed": "Two-factor authentication setup failed"
  }
}
```

**Rules**:

- ✅ Use camelCase for all keys
- ✅ Keep messages user-friendly and actionable
- ✅ Use structured objects for complex errors with title/description
- ❌ Never use UPPERCASE constants in translation keys

### 2. Validation Namespace (`validation.*`)

**Structure**: Dynamic patterns with field interpolation, NOT field-specific keys.

```json
{
  "validation": {
    "required": {
      "message": "{field} is required",
      "suggestion": "Please provide a value for {field}"
    },
    "invalid": {
      "message": "{field} is invalid",
      "format": "Invalid {field} format"
    },
    "minLength": {
      "message": "{field} must be at least {min} characters",
      "suggestion": "Please ensure {field} meets the minimum length requirement"
    },
    "maxLength": {
      "message": "{field} must not exceed {max} characters",
      "suggestion": "Please shorten {field} to meet the maximum length requirement"
    },
    "email": {
      "invalid": "Invalid email address",
      "suggestion": "Please enter a valid email address for {field}"
    },
    "phone": {
      "invalid": "Invalid phone number format",
      "suggestion": "Please enter a valid phone number for {field}"
    },
    "password": {
      "invalid": "Password does not meet requirements",
      "mismatch": "Passwords do not match",
      "suggestion": "Please ensure {field} meets the password strength requirements"
    },
    "default": {
      "suggestion": "Please check {field} and try again"
    }
  }
}
```

**Rules**:

- ✅ Use dynamic patterns with `{field}` interpolation
- ✅ Get field labels from `t.common.labels.*` or `t.ui.labels.*`
- ❌ Never create field-specific keys like `nameRequired`, `emailRequired`
- ❌ Never create 100+ field-specific validation keys

**Usage in Code**:

```typescript
// ✅ Correct - Dynamic pattern
const fieldLabel = this.i18n.translate(`t.common.labels.${field}`);
const message = this.i18n.translate('t.validation.required.message', {
  args: { field: fieldLabel },
});

// ❌ Wrong - Field-specific key
const message = this.i18n.translate(`t.validation.${field}Required`);
```

### 3. Success Namespace (`success.*`)

**Structure**: Action-based success messages with resource interpolation.

```json
{
  "success": {
    "create": "{resource} created successfully",
    "update": "{resource} updated successfully",
    "delete": "{resource} deleted successfully",
    "activate": "{resource} activated successfully",
    "deactivate": "{resource} deactivated successfully",
    "restore": "{resource} restored successfully",
    "archive": "{resource} archived successfully",
    "export": "{resource} exported successfully",
    "import": "{resource} imported successfully",

    // Specific operation messages
    "login": "Login successful",
    "logout": "Logout successful",
    "passwordChange": "Password changed successfully",
    "emailVerified": "Email verified successfully",
    "phoneVerified": "Phone verified successfully",
    "otpSent": "OTP sent successfully",
    "twoFactorEnabled": "Two-factor authentication enabled successfully",
    "twoFactorDisabled": "Two-factor authentication disabled successfully",
    "branchAssigned": "User assigned to branch successfully",
    "branchRemoved": "User removed from branch successfully",
    "exportCompleted": "Export completed successfully"
  }
}
```

**Rules**:

- ✅ Use `{resource}` interpolation for generic operations
- ✅ Add specific keys for unique operations
- ✅ Keep messages consistent and user-friendly

### 4. System Namespace (`system.*`)

**Structure**: Organized by purpose into logical groups.

```json
{
  "system": {
    "health": {
      "check": "System health check",
      "status": "System status",
      "uptime": "System uptime",
      "version": "System version",
      "lastUpdate": "Last update"
    },
    "status": {
      "online": "System online",
      "offline": "System offline",
      "ready": "System ready",
      "maintenance": "System maintenance",
      "initializing": "System initializing",
      "shuttingDown": "System shutting down",
      "restarting": "System restarting"
    },
    "monitoring": {
      "performance": "System performance",
      "capacity": "System capacity",
      "load": "System load",
      "memory": "Memory",
      "disk": "Disk",
      "network": "Network",
      "database": "Database",
      "cache": "Cache",
      "queue": "Queue"
    },
    "operations": {...},
    "components": {...},
    "actions": {...},
    "deployment": {...},
    "processing": {...}
  }
}
```

**Rules**:

- ✅ Group related keys by purpose
- ✅ Use nested objects for organization
- ✅ Keep only actively used keys

### 5. UI Patterns

#### Toast Notifications (`toast.*`)

```json
{
  "toast": {
    "success": {
      "title": "Success",
      "message": "Operation completed successfully",
      "saved": "Changes saved successfully",
      "deleted": "Item deleted successfully",
      "created": "Item created successfully",
      "updated": "Item updated successfully"
    },
    "error": {
      "title": "Error",
      "message": "An error occurred",
      "network": "Network error. Please check your connection",
      "server": "Server error. Please try again later",
      "validation": "Please check your input and try again"
    },
    "warning": {
      "title": "Warning",
      "message": "Please review your action"
    },
    "info": {
      "title": "Information",
      "message": "Please note"
    }
  }
}
```

#### Tooltips (`tooltip.*`)

```json
{
  "tooltip": {
    "default": "Hover for more information",
    "help": "Click for help",
    "required": "This field is required",
    "optional": "This field is optional",
    "disabled": "This action is currently disabled"
  }
}
```

#### Empty States (`empty.*`)

```json
{
  "empty": {
    "noData": "No data available",
    "noResults": "No results found",
    "noItems": "No items to display",
    "noPermission": "You don't have permission to view this content",
    "noCenters": "No centers available",
    "noUsers": "No users found",
    "noRoles": "No roles available",
    "noBranches": "No branches available",
    "noPermissions": "No permissions available",
    "noNotifications": "No notifications available",
    "noFiles": "No files available",
    "loading": "Loading data...",
    "error": "Failed to load data"
  }
}
```

#### Date/Time Formatting (`date.*`, `time.*`)

```json
{
  "date": {
    "formats": {
      "short": "MM/DD/YYYY",
      "medium": "MMM DD, YYYY",
      "long": "MMMM DD, YYYY",
      "full": "EEEE, MMMM DD, YYYY"
    },
    "relative": {
      "now": "Just now",
      "minutesAgo": "{count} minute(s) ago",
      "hoursAgo": "{count} hour(s) ago",
      "daysAgo": "{count} day(s) ago",
      "weeksAgo": "{count} week(s) ago",
      "monthsAgo": "{count} month(s) ago",
      "yearsAgo": "{count} year(s) ago"
    }
  },
  "time": {
    "formats": {
      "short": "HH:mm",
      "medium": "HH:mm:ss",
      "long": "HH:mm:ss.SSS"
    }
  }
}
```

#### Currency Formatting (`currency.*`)

```json
{
  "currency": {
    "symbol": "$",
    "format": "{amount} {currency}",
    "decimalPlaces": 2
  }
}
```

---

## Dynamic Patterns

### Field Interpolation

Always use dynamic patterns with field interpolation instead of creating field-specific keys.

**Example - Validation**:

```typescript
// ✅ Correct
const fieldLabel = this.i18n.translate(`t.common.labels.${field}`);
const message = this.i18n.translate('t.validation.required.message', {
  args: { field: fieldLabel },
});

// ❌ Wrong
const message = this.i18n.translate(`t.validation.${field}Required`);
```

**Example - Success Messages**:

```typescript
// ✅ Correct
const resourceName = this.i18n.translate(`t.common.resources.${resource}`);
const message = this.i18n.translate('t.success.create', {
  args: { resource: resourceName },
});

// ❌ Wrong
const message = this.i18n.translate(`t.success.${resource}Created`);
```

### Parameter Interpolation

Use `{param}` syntax for dynamic values:

```json
{
  "success": {
    "create": "{resource} created successfully", // {resource} is interpolated
    "showingRange": "Showing {start} to {end} of {total} items" // Multiple params
  }
}
```

```typescript
this.i18n.translate('t.success.create', {
  args: { resource: 'User' },
});
// Result: "User created successfully"
```

---

## Best Practices

### 1. **Consistency First**

- ✅ Always use camelCase for keys
- ✅ Keep message tone consistent (user-friendly, actionable)
- ✅ Use consistent patterns across similar operations

### 2. **Scalability**

- ✅ Use dynamic patterns instead of field-specific keys
- ✅ Group related keys in namespaces
- ✅ Avoid creating 100+ similar keys

### 3. **Maintainability**

- ✅ Organize keys logically by purpose
- ✅ Use nested objects for complex structures
- ✅ Keep related keys together

### 4. **Type Safety**

- ✅ All translation keys are type-checked via generated types
- ✅ Use `I18nPath` type for dynamic keys when needed
- ✅ Run `npm run build` to regenerate types after adding keys

### 5. **Completeness**

- ✅ Always add translations for both English and Arabic
- ✅ Keep both language files in sync
- ✅ Test translations after adding new keys

---

## Common Patterns

### Adding a New Error Message

1. **Add to `errors` namespace** (camelCase):

```json
{
  "errors": {
    "newErrorName": "User-friendly error message"
  }
}
```

2. **Use in code**:

```typescript
throw new CustomException(this.i18n.translate('t.errors.newErrorName'));
```

### Adding a New Success Message

1. **Add to `success` namespace**:

```json
{
  "success": {
    "newOperation": "Operation completed successfully"
  }
}
```

2. **Use in code**:

```typescript
return {
  message: this.i18n.translate('t.success.newOperation'),
  data: result,
};
```

### Adding a New Validation Pattern

1. **Add to `validation` namespace** (if it's a new pattern):

```json
{
  "validation": {
    "newPattern": {
      "message": "{field} must meet {requirement}",
      "suggestion": "Please ensure {field} meets the requirement"
    }
  }
}
```

2. **Update validation.pipe.ts** to handle the new pattern

### Adding a New UI Pattern

1. **Add to appropriate namespace** (`toast`, `tooltip`, `empty`, etc.):

```json
{
  "toast": {
    "newType": {
      "title": "Title",
      "message": "Message"
    }
  }
}
```

---

## Migration Guide

### Migrating from Field-Specific to Dynamic Patterns

**Before** (Field-specific - ❌ Don't use):

```json
{
  "validation": {
    "nameRequired": "Name is required",
    "emailRequired": "Email is required",
    "phoneRequired": "Phone number is required"
  }
}
```

**After** (Dynamic pattern - ✅ Use):

```json
{
  "validation": {
    "required": {
      "message": "{field} is required",
      "suggestion": "Please provide a value for {field}"
    }
  }
}
```

**Code Migration**:

```typescript
// Before
const message = this.i18n.translate(`t.validation.${field}Required`);

// After
const fieldLabel = this.i18n.translate(`t.common.labels.${field}`);
const message = this.i18n.translate('t.validation.required.message', {
  args: { field: fieldLabel },
});
```

### Migrating from UPPERCASE to camelCase

**Before** (UPPERCASE - ❌ Don't use):

```json
{
  "errors": {
    "RESOURCE_NOT_FOUND": "The requested resource was not found"
  }
}
```

**After** (camelCase - ✅ Use):

```json
{
  "errors": {
    "resourceNotFound": "The requested resource was not found"
  }
}
```

**Code Migration**:

```typescript
// Before
this.i18n.translate('t.errors.RESOURCE_NOT_FOUND');

// After
this.i18n.translate('t.errors.resourceNotFound');
```

---

## Checklist for Adding New Translations

- [ ] Use camelCase for all keys
- [ ] Add to both English and Arabic files
- [ ] Use dynamic patterns when possible (avoid field-specific keys)
- [ ] Group related keys in appropriate namespaces
- [ ] Use interpolation (`{param}`) for dynamic values
- [ ] Keep messages user-friendly and actionable
- [ ] Run `npm run build` to regenerate types
- [ ] Verify TypeScript compilation passes
- [ ] Test translations in both languages

---

## Examples

### Complete Example: Adding a New Feature

**Scenario**: Adding a new "Export" feature with validation, success, and error messages.

**Step 1: Add Success Message**

```json
{
  "success": {
    "exportCompleted": "Export completed successfully"
  }
}
```

**Step 2: Add Error Messages (if needed)**

```json
{
  "errors": {
    "exportFailed": "Export operation failed",
    "exportFormatNotSupported": "Export format not supported"
  }
}
```

**Step 3: Use in Code**

```typescript
// Success
return {
  message: this.i18n.translate('t.success.exportCompleted'),
  data: exportData,
};

// Error
throw new ExportFailedException(this.i18n.translate('t.errors.exportFailed'));
```

---

## Summary

### Key Principles

1. **camelCase Only**: All translation keys use camelCase
2. **Dynamic Patterns**: Use interpolation instead of field-specific keys
3. **Organized Namespaces**: Group related keys logically
4. **Type Safety**: All keys are type-checked
5. **Consistency**: Keep patterns consistent across the codebase

### What We Standardized

- ✅ Removed 120+ field-specific validation keys → Dynamic patterns
- ✅ Removed UPPERCASE error constants → camelCase messages
- ✅ Added UI patterns (toast, tooltip, empty states, date/time, currency)
- ✅ Organized system namespace by purpose
- ✅ Standardized error message structure

### Future Guidelines

- Always use dynamic patterns for validation
- Never create field-specific keys
- Always use camelCase
- Keep both language files in sync
- Test after adding new keys

---

**Last Updated**: After Translation Structure Refactoring (2024)
**Maintained By**: Development Team


