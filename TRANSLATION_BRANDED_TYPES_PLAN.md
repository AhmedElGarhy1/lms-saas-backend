# Translation Branded Types Implementation Plan

## Overview

Implement branded `RawText` type to preserve IntelliSense for translation keys while allowing explicit raw strings when needed. This prevents accidental raw strings while maintaining full type safety.

## Goals

- ✅ Create `RawText` branded type for explicit literal strings
- ✅ Create `TranslatableArg` type (I18nPath | RawText)
- ✅ Update type generation to use `TranslatableArg` for string arguments
- ✅ Preserve IntelliSense for translation keys
- ✅ Require explicit casting for raw strings
- ✅ Document best practices

## Implementation Steps

### Phase 1: Create Branded Types

1. **Create RawText Type**
   - Add to `src/generated/i18n-type-map.generated.ts` or new file
   - `export type RawText = string & { __rawText?: never };`

2. **Create TranslatableArg Type**
   - `export type TranslatableArg = I18nPath | RawText;`
   - This allows translation keys OR explicitly branded raw text

### Phase 2: Update Type Generation

3. **Update generate-i18n-args.ts**
   - Change string arguments from `string | number` to `TranslatableArg | number`
   - Import `I18nPath` in generated file
   - Import `RawText` and `TranslatableArg` types

4. **Regenerate Types**
   - Run generation script
   - Verify types are correct

### Phase 3: Update Type Mapping

5. **Verify PathArgs**
   - Ensure `PathArgs<P>` correctly uses `TranslatableArg` for string arguments
   - Test type inference

### Phase 4: Documentation

6. **Create Best Practices Guide**
   - When to use translation keys vs RawText
   - How to cast to RawText
   - Examples

7. **Update Usage Guide**
   - Add examples with RawText casting
   - Show IntelliSense benefits

## Type System

### RawText Branded Type
```typescript
export type RawText = string & { __rawText?: never };
```

### TranslatableArg Type
```typescript
export type TranslatableArg = I18nPath | RawText;
```

### Generated Types (Before)
```typescript
't.common.buttons.createResource': { resource: string | number };
```

### Generated Types (After)
```typescript
't.common.buttons.createResource': { resource: TranslatableArg | number };
```

## Usage Examples

### ✅ Translation Key (Full IntelliSense)
```typescript
translationService.translate('t.common.buttons.createResource', {
  resource: 't.common.labels.user' // ✅ Full autocomplete
});
```

### ✅ Explicit Raw Text (Requires Cast)
```typescript
translationService.translate('t.common.buttons.createResource', {
  resource: 'User' as RawText // ✅ Explicit intent
});
```

### ❌ Accidental Raw String (Prevented)
```typescript
translationService.translate('t.common.buttons.createResource', {
  resource: 'User' // ❌ Type error - must cast to RawText
});
```

## Benefits

- ✅ Full IntelliSense for translation keys
- ✅ Prevents accidental raw strings
- ✅ Still allows raw strings when explicitly needed
- ✅ Better developer experience
- ✅ Type-safe at compile time

## Files to Modify

1. `scripts/generate-i18n-args.ts` - Update type generation
2. `src/generated/i18n-args.generated.ts` - Will be regenerated
3. `src/generated/i18n-type-map.generated.ts` - Add RawText and TranslatableArg types
4. `docs/I18N_USAGE_GUIDE.md` - Add RawText documentation
5. Create `docs/TRANSLATION_BRANDED_TYPES.md` - Best practices

