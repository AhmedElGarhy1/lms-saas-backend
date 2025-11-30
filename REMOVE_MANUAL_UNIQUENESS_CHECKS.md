# Remove Manual Uniqueness Checks - Database-Driven Approach

## Overview

Refactor all manual uniqueness checks (`findOne()`, `findByPhone()`, etc.) to rely on PostgreSQL unique constraints. Enhance the error handling system to extract field names from constraint violations generically and use `ValidationFailedException` with proper field details.

## Phase 1: Enhance TypeOrmExceptionFilter

### 1.1 Enhance TypeOrmExceptionFilter

**File:** `src/shared/common/filters/typeorm-exception.filter.ts`

Update the `23505` (unique violation) handler to:
- Parse `drv.detail` generically to extract field name(s) and value(s)
- PostgreSQL format: `Key (field)=(value) already exists.` or `Key (field1, field2)=(value1, value2) already exists.`
- Use `ValidationFailedException` with `ErrorDetail[]` containing field, value, message, code
- Use `ErrorCode.DUPLICATE_FIELD` for the error code
- Use translation key `t.errors.already.existsWithField` with field translation key

**Changes:**
- Replace `ResourceAlreadyExistsException` with `ValidationFailedException` for unique violations
- Parse `drv.detail` using regex: `/Key \((.+?)\)=\((.+?)\)/` to extract fields and values
- Handle both single field and composite unique constraints
- Create `ErrorDetail` object with:
  - `field`: extracted field name(s) - comma-separated for composite
  - `value`: extracted value(s) - comma-separated for composite
  - `message`: user-friendly message using translation
  - `code`: `ErrorCode.DUPLICATE_FIELD`

**Example implementation:**
```typescript
case '23505': // unique_violation
  const detail = drv.detail || '';
  // Parse: "Key (phone)=(1234567890) already exists."
  const match = detail.match(/Key \((.+?)\)=\((.+?)\)/);
  const field = match ? match[1] : 'field';
  const value = match ? match[2] : '';
  
  const validationException = new ValidationFailedException(
    't.errors.already.existsWithField',
    [
      {
        field,
        value,
        message: TranslationService.translateForLogging(
          't.errors.already.existsWithField',
          { field, value }
        ),
        code: ErrorCode.DUPLICATE_FIELD,
      },
    ],
    { field, value },
  );
  return res
    .status(validationException.getStatus())
    .json(validationException.getResponse());
```

## Phase 2: Remove Manual Uniqueness Checks

### 2.1 User Service

**File:** `src/modules/user/services/user.service.ts`

**Remove:**
- Lines 134-148: Manual phone check in `createUser()`
- Lines 406-420: Manual phone check in `updateUser()` (let database handle it)

**Change:**
- Directly call `userRepository.create()` without pre-check
- Let database constraint handle uniqueness
- Remove try-catch blocks that check for duplicates (let global filter handle it)

### 2.2 Center Access Repository

**File:** `src/modules/access-control/repositories/center-access.repository.ts`

**Remove:**
- Lines 35-41: Manual check in `grantCenterAccess()`

**Change:**
- Directly call `this.create(data)` without pre-check
- Let database constraint handle uniqueness

### 2.3 Branch Access Repository

**File:** `src/modules/access-control/repositories/branch-access.repository.ts`

**Remove:**
- Lines 29-34: Manual check in `grantBranchAccess()`

**Change:**
- Directly call `this.create()` without pre-check
- Let database constraint handle uniqueness

## Phase 3: Remove @NotExists Decorator

### 3.1 Create User DTO

**File:** `src/modules/user/dto/create-user.dto.ts`

**Remove:**
- Line 41: `@NotExists(User, 'phone', { message: 'Phone number already exists' })`

**Note:** Keep other validators (format, length, etc.)

### 3.2 Optional: Deprecate NotExistsConstraint

**File:** `src/shared/common/validators/not-exists.constraint.ts`

**Decision:** Keep the validator for now (may be used elsewhere), but document that it's deprecated for uniqueness checks. Alternatively, remove if not used elsewhere.

## Phase 4: Verify Translation Keys

### 4.1 Ensure Translation Keys Exist

**Files:** `src/i18n/en/t.json` and `src/i18n/ar/t.json`

**Verify these keys exist:**
- `t.errors.already.existsWithField` (should already exist from previous work)
- `t.common.labels.phone` (should already exist)
- `t.common.labels.email` (should already exist)

**Note:** The field name extracted from the database error will be used as-is in the translation. If specific field labels are needed, they should already exist in `t.common.labels`.

## Phase 5: Update Error Handling in Services (Optional)

### 5.1 Service-Level Error Handling

**Decision:** Since `TypeOrmExceptionFilter` handles `QueryFailedError` globally, services don't need try-catch blocks. However, if services are called outside HTTP context (e.g., background jobs), they may need local handling.

**Files to review:**
- Services that create entities outside HTTP context
- Background job processors
- Event listeners

**Action:** Add try-catch only where services are called outside HTTP context, otherwise rely on global filter.

## Phase 6: Testing and Validation

### 6.1 Test Cases

**Create/Update:**
1. Create user with duplicate phone → Should return 400 with field-specific validation error
2. Create center access with duplicate → Should return 400 with field details
3. Create branch access with duplicate → Should return 400 with field details
4. Update user phone to existing → Should return 400 with field details

**Error Messages:**
- Verify error messages are user-friendly
- Verify translation keys are correct
- Verify field names are extracted correctly
- Verify `details` array contains proper `ErrorDetail` structure

### 6.2 Validation

- Run `npm run validate:translations`
- Run `npm run build`
- Test API endpoints with duplicate values
- Verify error responses match expected format with `details` array

## Expected Results

**Before:**
- Manual `findOne()` checks before every insert
- `@NotExists` decorator in DTOs
- Race condition risks
- Extra database queries
- Generic error messages

**After:**
- Direct insert/update operations
- Database enforces uniqueness atomically
- No race conditions
- Cleaner, simpler code
- Field-specific validation errors with proper `ErrorDetail[]` structure
- Better user experience with field-level error messages

## Files to Modify

1. `src/shared/common/filters/typeorm-exception.filter.ts`
2. `src/modules/user/services/user.service.ts`
3. `src/modules/user/dto/create-user.dto.ts`
4. `src/modules/access-control/repositories/center-access.repository.ts`
5. `src/modules/access-control/repositories/branch-access.repository.ts`
6. `src/i18n/en/t.json` (verify keys exist)
7. `src/i18n/ar/t.json` (verify keys exist)

## Notes

- The `TypeOrmExceptionFilter` already catches `QueryFailedError` globally
- PostgreSQL error detail format: `Key (field)=(value) already exists.` or `Key (field1, field2)=(value1, value2) already exists.`
- Use generic regex parsing: `/Key \((.+?)\)=\((.+?)\)/` to extract fields and values
- For composite unique constraints, extract all fields as comma-separated string
- Use `ValidationFailedException` to provide proper field-level validation details
- The field name from the database will be used directly (e.g., "phone", "email")
- Translation will use `t.errors.already.existsWithField` with `{field}` and `{value}` placeholders
- Do NOT include `suggestion` field in `ErrorDetail` objects

