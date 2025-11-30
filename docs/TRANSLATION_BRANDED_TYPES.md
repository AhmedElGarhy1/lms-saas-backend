# Translation Branded Types Guide

## Overview

The translation system uses branded types to preserve IntelliSense for translation keys while preventing accidental raw strings. This ensures type safety and better developer experience.

## Key Types

### `RawText`

A branded type for explicit raw text strings. Use this when you need to pass a literal string that is NOT a translation key.

```typescript
export type RawText = string & { __rawText?: never };
```

### `TranslatableArg`

A union type that allows either:
- A translation key (`I18nPath`) - preferred, provides full IntelliSense
- A raw text string (`RawText`) - requires explicit casting

```typescript
export type TranslatableArg = I18nPath | RawText;
```

## Usage Examples

### ✅ Translation Key (Recommended)

Use translation keys for UI text to get full IntelliSense and ensure consistency:

```typescript
import { TranslationService } from '@/shared/common/services/translation.service';

translationService.translate('t.common.buttons.createResource', {
  resource: 't.common.labels.user' // ✅ Full autocomplete + validation
});
```

**Benefits:**
- Full IntelliSense autocomplete
- Compile-time validation
- Consistent translations across languages
- Automatic pluralization support

### ✅ Explicit Raw Text (When Needed)

Use `RawText` for literal strings that are NOT translation keys (e.g., user-generated content, filenames):

```typescript
import { RawText } from '@/generated/i18n-type-map.generated';

translationService.translate('t.common.buttons.createResource', {
  resource: 'User' as RawText // ✅ Explicit intent - prevents accidental raw strings
});
```

**When to use:**
- User-generated content
- Filenames
- Error messages from external APIs
- Dynamic content that can't be translated

### ❌ Accidental Raw String (Prevented)

The type system prevents accidental raw strings:

```typescript
translationService.translate('t.common.buttons.createResource', {
  resource: 'User' // ❌ Type error - must use translation key or cast to RawText
});
```

This forces developers to think: "Is this really a literal value, or should I use a translation key?"

## Best Practices

### ✅ Use Translation Keys For:

| Type | Example | Why |
|------|---------|-----|
| Resource labels | `resource: 't.common.labels.user'` | Consistent across languages |
| Status labels | `status: 't.common.status.active'` | Proper pluralization |
| Action names | `action: 't.common.actions.create'` | Consistent terminology |
| Field labels | `field: 't.common.labels.email'` | UI consistency |
| Error types | `type: 't.errors.validation'` | Standardized messages |

### ❌ Use Raw Values For:

| Type | Example | Why |
|------|---------|-----|
| Numbers | `count: 5` | Data, not UI text |
| IDs | `userId: 'abc123'` | Data, not UI text |
| Usernames | `username: 'john.doe'` | User-generated content |
| File names | `filename: 'document.pdf'` | System data |
| Dates | `date: new Date()` | Will be formatted |
| Email addresses | `email: 'user@example.com'` | Data, not UI text |
| Phone numbers | `phone: '+1234567890'` | Data, not UI text |

### When to Use RawText

Use `RawText` only when you have a legitimate reason to use a literal string:

1. **User-generated content** that can't be translated
   ```typescript
   resource: userInput as RawText
   ```

2. **Filenames or system paths**
   ```typescript
   filename: 'report.pdf' as RawText
   ```

3. **External API error messages**
   ```typescript
   message: apiError.message as RawText
   ```

4. **Temporary fallback** (prefer fixing the translation key)
   ```typescript
   resource: 'Unknown' as RawText // TODO: Add proper translation key
   ```

## Type System Benefits

### 1. Full IntelliSense

When using translation keys, you get full autocomplete:

```typescript
translationService.translate('t.common.buttons.createResource', {
  resource: 't.common.labels.' // ✅ Shows all available labels
});
```

### 2. Prevents Accidental Errors

The type system prevents typos and accidental raw strings:

```typescript
// ❌ Type error - prevents typos
resource: 't.common.labels.usre' // Typo detected

// ❌ Type error - prevents accidental raw strings
resource: 'User' // Must be explicit
```

### 3. Maintains Flexibility

You can still use raw strings when explicitly needed:

```typescript
// ✅ Allowed with explicit casting
resource: 'User' as RawText
```

## Migration Guide

### Existing Code

If you have existing code with raw strings, you have two options:

1. **Convert to translation keys** (recommended):
   ```typescript
   // Before
   resource: 'User'
   
   // After
   resource: 't.common.labels.user'
   ```

2. **Cast to RawText** (if it's truly a literal value):
   ```typescript
   // Before
   resource: 'User'
   
   // After
   resource: 'User' as RawText
   ```

### New Code

Always prefer translation keys for UI text:

```typescript
// ✅ Good - uses translation key
translationService.translate('t.errors.notFound', {
  resource: 't.common.labels.user'
});

// ❌ Avoid - raw string
translationService.translate('t.errors.notFound', {
  resource: 'User' as RawText
});
```

## Examples

### Error Messages

```typescript
// ✅ Good - translation keys for UI text
throw new NotFoundException('t.errors.notFound', {
  resource: 't.common.labels.user',
  what: 't.common.labels.access'
});

// ❌ Avoid - raw strings
throw new NotFoundException('t.errors.notFound', {
  resource: 'User' as RawText,
  what: 'Access' as RawText
});
```

### Success Messages

```typescript
// ✅ Good - translation keys
return {
  message: translationService.translate('t.success.created', {
    resource: 't.common.labels.user'
  })
};

// ❌ Avoid - raw strings
return {
  message: translationService.translate('t.success.created', {
    resource: 'User' as RawText
  })
};
```

### Mixed Arguments

```typescript
// ✅ Good - translation key for UI text, number for data
translationService.translate('t.common.messages.showingCount', {
  count: 5, // ✅ Number (data)
  item: 't.common.labels.user' // ✅ Translation key (UI text)
});
```

## Summary

- ✅ **Use translation keys** for UI text (labels, resources, statuses, actions)
- ✅ **Use numbers** for numeric data
- ✅ **Use RawText** only when you have a legitimate reason for a literal string
- ✅ **Prefer translation keys** over RawText for consistency
- ❌ **Avoid raw strings** without explicit casting

This approach ensures:
- Full IntelliSense for translation keys
- Prevention of accidental raw strings
- Type safety at compile time
- Consistent translations across languages
- Better developer experience

