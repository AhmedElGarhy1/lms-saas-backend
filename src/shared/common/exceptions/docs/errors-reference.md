# LMS Frontend Error Reference Guide

This guide helps frontend developers handle API errors from the LMS system. Each error includes user-friendly messages and handling patterns.

---

## 🔐 Authentication Errors

| Error Code | User Message                                                | Frontend Notes                        |
| ---------- | ----------------------------------------------------------- | ------------------------------------- |
| `AUTH_001` | Authentication failed. Please try again.                    | Generic auth failure                  |
| `AUTH_002` | Invalid username or password.                               | Login credentials invalid             |
| `AUTH_003` | Your account has been disabled. Please contact support.     | Account disabled by admin             |
| `AUTH_004` | Account temporarily locked due to too many failed attempts. | Too many failed login attempts        |
| `AUTH_008` | Please verify your phone number before proceeding.          | Phone verification required           |
| `AUTH_009` | Please enter your authentication code.                      | 2FA code required                     |
| `AUTH_010` | Invalid authentication code.                                | 2FA code incorrect                    |
| `AUTH_011` | Authentication code has expired. Please request a new one.  | 2FA code expired                      |
| `AUTH_013` | An account with this information already exists.            | Duplicate account during registration |
| `AUTH_014` | Account not found.                                          | User account doesn't exist            |
| `AUTH_017` | Password reset required. Please reset your password.        | Password expired, reset needed        |
| `AUTH_018` | Password reset link has expired. Please request a new one.  | Reset token expired                   |
| `AUTH_019` | Your session has expired. Please login again.               | JWT/session expired                   |
| `AUTH_020` | Invalid session. Please login again.                        | Invalid JWT token                     |
| `AUTH_022` | Session expired. Please login again.                        | Refresh token expired                 |
| `AUTH_023` | Session expired. Please login again.                        | Refresh token invalid                 |
| `AUTH_024` | Your profile is inactive. Please contact support.           | User profile deactivated              |
| `AUTH_025` | Please select a profile to continue.                        | Multiple profiles, selection required |
| `AUTH_026` | Two-factor authentication is required.                      | 2FA required but not enabled          |
| `AUTH_027` | Two-factor authentication is already enabled.               | 2FA already active                    |
| `AUTH_028` | Two-factor authentication is already configured.            | 2FA setup already completed           |
| `AUTH_029` | User identifier is required.                                | Missing user ID parameter             |
| `AUTH_030` | Phone number is required.                                   | Missing phone parameter               |
| `AUTH_031` | Session expired. Please login again.                        | Refresh token not found               |
| `AUTH_032` | Please login to continue.                                   | Authentication required               |

## 👤 User Management Errors

| Error Code | User Message                           |
| ---------- | -------------------------------------- |
| `USR_001`  | User not found.                        |
| `USR_002`  | User already exists.                   |
| `USR_003`  | Email address already in use.          |
| `USR_004`  | Account is inactive.                   |
| `USR_005`  | Account has been deleted.              |
| `USR_006`  | Account is suspended.                  |
| `USR_010`  | Current password is incorrect.         |
| `USR_008`  | Password reset link has expired.       |
| `USR_009`  | Invalid password reset link.           |
| `USR_011`  | Profile update not allowed.            |
| `USR_012`  | Profile is incomplete.                 |
| `USR_013`  | Role assignment not allowed.           |
| `USR_014`  | Role change not allowed.               |
| `USR_016`  | User creation not allowed.             |
| `USR_017`  | User import failed.                    |
| `USR_018`  | Import failed. Please check your data. |
| `USR_022`  | Invalid settings.                      |
| `USR_023`  | Failed to update preferences.          |
| `USR_024`  | User deletion not allowed.             |
| `USR_026`  | Cannot delete your own account.        |
| `USR_027`  | Invalid user data.                     |
| `USR_028`  | Phone number already in use.           |
| `USR_029`  | User information not found.            |
| `USR_030`  | Center assignment required.            |

## 💰 Financial Errors

| Error Code     | User Message                                  | Available Parameters                                |
| -------------- | --------------------------------------------- | --------------------------------------------------- |
| `FIN_PAY_001`  | Insufficient funds in your wallet.            | `currentBalance`, `requiredAmount`, `currency`      |
| `FIN_PAY_002`  | Wallet not found.                             | None                                                |
| `FIN_PAY_003`  | Cashbox not found.                            | None                                                |
| `FIN_PAY_004`  | Payment service temporarily unavailable.      | None                                                |
| `FIN_PAY_005`  | Transaction failed. Please try again.         | None                                                |
| `FIN_PAY_006`  | Invalid payment reference.                    | None                                                |
| `FIN_PAY_007`  | Payment not completed.                        | None                                                |
| `FIN_PAY_008`  | Payment already refunded.                     | None                                                |
| `FIN_PAY_009`  | Payment status invalid.                       | None                                                |
| `FIN_PAY_010`  | Currency not supported.                       | `currency`, `gateway`                               |
| `FIN_PAY_011`  | Payment service unavailable.                  | None                                                |
| `FIN_PAY_012`  | Payment setup failed.                         | None                                                |
| `FIN_PAY_013`  | Payment processing failed.                    | None                                                |
| `FIN_PAY_014`  | Payment not found.                            | `gatewayPaymentId`                                  |
| `FIN_PAY_015`  | Payment not eligible for refund.              | `paymentId`, `currentStatus`                        |
| `FIN_PAY_016`  | Payment not eligible for refund.              | `paymentId`                                         |
| `FIN_PAY_017`  | Refund amount exceeds payment.                | `refundAmount`, `paymentAmount`                     |
| `FIN_PAY_018`  | Payment reference missing.                    | `paymentId`                                         |
| `FIN_PAY_019`  | Insufficient balance for refund.              | `refundAmount`, `availableBalance`                  |
| `FIN_PAY_020`  | Invalid payment operation.                    | `currentStatus`, `targetStatus`, `validTransitions` |
| `FIN_PAY_021`  | Operation not allowed.                        | None                                                |
| `FIN_PAY_022`  | Payment ownership required.                   | None                                                |
| `FIN_PAY_023`  | Wallet access denied.                         | None                                                |
| `FIN_TXN_001`  | Transaction not found.                        | None                                                |
| `FIN_TXN_002`  | Transaction amount mismatch.                  | `actualAmount`, `expectedAmount`                    |
| `FIN_TXN_003`  | Transaction data incomplete.                  | None                                                |
| `FIN_CTXN_001` | Cash transaction not found.                   | None                                                |
| `FIN_XFER_001` | Transfer not allowed between different users. | None                                                |
| `FIN_XFER_002` | Cannot transfer to the same account.          | None                                                |

**Example:** For `FIN_PAY_001`, frontend receives:

```json
{
  "errorCode": "FIN_PAY_001",
  "details": {
    "currentBalance": 50,
    "requiredAmount": 100,
    "currency": "EGP"
  }
}
```

Frontend can show: _"You have 50 EGP but need 100 EGP"_

---

## ✅ Validation Errors (GEN_002)

Validation errors have a special structure. They always use error code `GEN_002` and include detailed field-level validation information.

### 📝 Validation Error Structure

```json
{
  "success": false,
  "error": {
    "code": "GEN_002",
    "details": {
      "validationErrors": {
        "fieldName": [
          {
            "constraint": "constraintName",
            "params": { "paramName": "paramValue" }
          }
        ]
      }
    }
  }
}
```

### 🔧 Available Validation Constraints

| Constraint      | Parameters                 | Example Usage                             |
| --------------- | -------------------------- | ----------------------------------------- |
| `isNotEmpty`    | None                       | Field is required                         |
| `isString`      | None                       | Must be text                              |
| `isEmail`       | None                       | Must be valid email                       |
| `minLength`     | `min: number`              | Must be at least X characters             |
| `maxLength`     | `max: number`              | Must be no more than X characters         |
| `min`           | `min: number`              | Must be at least X                        |
| `max`           | `max: number`              | Must be no more than X                    |
| `isIn`          | `values: string[]`         | Must be one of: [option1, option2]        |
| `isEnum`        | `allowedValues: string[]`  | Must be one of: [admin, teacher, student] |
| `arrayMinSize`  | `min: number`              | Must have at least X items                |
| `arrayMaxSize`  | `max: number`              | Must have no more than X items            |
| `length`        | `min: number, max: number` | Must be between X and Y characters        |
| `isDivisibleBy` | `divisor: number`          | Must be divisible by X                    |

### 📋 Validation Error Example

```json
{
  "success": false,
  "error": {
    "code": "GEN_002",
    "details": {
      "validationErrors": {
        "name": [
          { "constraint": "minLength", "params": { "min": 3 } },
          { "constraint": "maxLength", "params": { "max": 50 } },
          { "constraint": "isNotEmpty" }
        ],
        "email": [{ "constraint": "isEmail" }, { "constraint": "isNotEmpty" }],
        "age": [
          { "constraint": "min", "params": { "min": 18 } },
          { "constraint": "max", "params": { "max": 120 } }
        ],
        "userType": [
          {
            "constraint": "isEnum",
            "params": { "allowedValues": ["admin", "teacher", "student"] }
          }
        ],
        "phones[0].number": [
          { "constraint": "isPhoneNumber" },
          { "constraint": "minLength", "params": { "min": 10 } }
        ]
      }
    }
  }
}
```

### 🎯 Frontend Validation Handling

```javascript
function handleValidationError(error) {
  if (error.errorCode === 'GEN_002') {
    const fieldErrors = {};

    for (const [field, constraints] of Object.entries(
      error.details.validationErrors,
    )) {
      fieldErrors[field] = constraints.map((c) => ({
        constraint: c.constraint,
        params: c.params || {},
        message: getValidationMessage(field, c.constraint, c.params),
      }));
    }

    return fieldErrors;
  }
}

function getValidationMessage(field, constraint, params) {
  switch (constraint) {
    case 'minLength':
      return `${field} must be at least ${params.min} characters`;
    case 'maxLength':
      return `${field} must be no more than ${params.max} characters`;
    case 'min':
      return `${field} must be at least ${params.min}`;
    case 'max':
      return `${field} must be no more than ${params.max}`;
    case 'isEmail':
      return `${field} must be a valid email address`;
    case 'isNotEmpty':
      return `${field} is required`;
    case 'isIn':
      return `${field} must be one of: ${params.values.join(', ')}`;
    case 'isEnum':
      return `${field} must be one of: ${params.allowedValues.join(', ')}`;
    default:
      return `${field} is invalid`;
  }
}
```

## 🔐 Access Control Errors

| Error Code | User Message                     |
| ---------- | -------------------------------- |
| `ACL_001`  | Profile not found.               |
| `ACL_002`  | Access already granted.          |
| `ACL_003`  | Center access not found.         |
| `ACL_004`  | Center access already exists.    |
| `ACL_005`  | Center access already removed.   |
| `ACL_006`  | Center access already inactive.  |
| `ACL_007`  | Role not found.                  |
| `ACL_008`  | Role already exists.             |
| `ACL_009`  | Permission not found.            |
| `ACL_010`  | Permission already assigned.     |
| `ACL_011`  | Cannot assign role to yourself.  |
| `ACL_012`  | Insufficient privileges.         |
| `ACL_013`  | Role already assigned.           |
| `ACL_014`  | Role not assigned.               |
| `ACL_015`  | System role cannot be modified.  |
| `ACL_016`  | Role is currently in use.        |
| `ACL_017`  | Invalid role operation.          |
| `ACL_018`  | Invalid profile type for role.   |
| `ACL_019`  | Role already active.             |
| `ACL_020`  | Profile type not supported.      |
| `ACL_021`  | Admin access cannot be removed.  |
| `ACL_022`  | Center access already active.    |
| `ACL_023`  | Admin access cannot be modified. |
| `ACL_024`  | Invalid profile type.            |
| `ACL_026`  | Access denied.                   |
| `ACL_027`  | Access denied.                   |
| `ACL_028`  | Access cannot be revoked.        |
| `ACL_029`  | Access denied.                   |
| `ACL_030`  | Permission denied.               |
| `ACL_025`  | Access record not found.         |

## 📚 Classes & Sessions Errors

| Error Code | User Message                                         |
| ---------- | ---------------------------------------------------- |
| `CLS_001`  | Class not found.                                     |
| `CLS_005`  | Invalid class operation.                             |
| `CLS_006`  | Class is completed and cannot be modified.           |
| `CLS_007`  | Class is cancelled and cannot be modified.           |
| `CLS_008`  | Status change period has expired.                    |
| `CLS_029`  | Access denied.                                       |
| `CLS_031`  | Staff member already assigned.                       |
| `CLS_032`  | Staff member not assigned.                           |
| `CLS_033`  | Payment strategy not found.                          |
| `CLS_034`  | Payment strategy cannot be changed.                  |
| `CLS_036`  | Schedule conflict detected.                          |
| `CLS_037`  | Schedule overlap detected.                           |
| `CLS_038`  | Teacher schedule conflict with availability details. |
| `CLS_041`  | Student schedule conflict with availability details. |

### 🎯 Detailed Schedule Conflict Errors

**CLS_038** and **CLS_041** provide specific teacher/student availability information:

#### Teacher Schedule Conflict (CLS_038)

```json
{
  "success": false,
  "error": {
    "code": "CLS_038",
    "details": {
      "teacherName": "John Smith",
      "teacherUserProfileId": "uuid-teacher-123",
      "conflicts": [
        { "day": "Monday", "timeRange": "10:00-11:00" },
        { "day": "Wednesday", "timeRange": "14:00-15:00" }
      ],
      "message": "Teacher John Smith is not available during the requested schedule"
    }
  }
}
```

#### Student Schedule Conflict (CLS_041)

```json
{
  "success": false,
  "error": {
    "code": "CLS_041",
    "details": {
      "studentName": "Jane Doe",
      "studentUserProfileId": "uuid-student-456",
      "conflicts": [{ "day": "Monday", "timeRange": "10:00-11:00" }],
      "message": "Student Jane Doe is not available during the requested schedule"
    }
  }
}
```

**Frontend Usage:**

```javascript
if (error.code === 'CLS_038') {
  const { teacherName, conflicts } = error.details;
  showError(
    `Teacher ${teacherName} is not available on ${conflicts[0].day} ${conflicts[0].timeRange}`,
  );
}
```

| `CLS_039` | Group not found. |
| `CLS_040` | Group already exists. |
| `CLS_044` | Student already in group. |
| `CLS_045` | Student not in group. |
| `CLS_046` | Invalid class data. |
| `CLS_047` | Invalid group data. |
| `CLS_048` | Start date cannot be changed. |
| `CLS_049` | Cannot assign staff to class. |
| `CLS_050` | Staff member already assigned. |
| `CLS_051` | Cannot create group for this class. |
| `CLS_052` | Student type not compatible with group. |
| `CLS_053` | Student already in this group. |
| `CLS_054` | Access denied. |
| `CLS_055` | Staff access not found. |
| `CLS_056` | Access denied. |
| `CLS_057` | Access denied. |
| `CLS_058` | Branch selection required. |
| `SES_001` | Session not found. |
| `SES_002` | Session already exists. |
| `SES_003` | Session is inactive. |
| `SES_004` | Session has been deleted. |
| `SES_005` | Invalid session operation. |
| `SES_006` | Session is completed and cannot be modified. |
| `SES_007` | Session is cancelled and cannot be modified. |
| `SES_008` | Session start time cannot be in the past. |
| `SES_017` | Failed to cancel session. |
| `SES_019` | Class must be active for session operations. |
| `SES_020` | Schedule conflict detected. |
| `SES_021` | Invalid session status for check-in. |
| `SES_022` | Schedule item not found. |
| `SES_023` | Session must be checked in before starting. |
| `SES_024` | Invalid session status for starting. |
| `SES_025` | Session cannot be updated. |
| `SES_026` | Invalid session operation. |
| `SES_027` | Access denied. |
| `SES_028` | Invalid schedule item. |
| `SES_029` | Invalid session ID. |

## 📊 Attendance Errors (ATD_xxx)

| Code    | Enum                            | Description                                                         | Parameters | Example                                           |
| ------- | ------------------------------- | ------------------------------------------------------------------- | ---------- | ------------------------------------------------- |
| ATD_007 | ATTENDANCE_SESSION_NOT_ACTIVE   | Session not in active state (CHECKING_IN/CONDUCTING) for attendance | None       | `AttendanceErrors.attendanceSessionNotActive()`   |
| ATD_008 | ATTENDANCE_STUDENT_NOT_ENROLLED | Student not enrolled in group                                       | None       | `AttendanceErrors.attendanceStudentNotEnrolled()` |
| ATD_012 | ATTENDANCE_PAYMENT_REQUIRED     | Student payment required for session access                         | None       | `AttendanceErrors.attendancePaymentRequired()`    |
| ATD_014 | ATTENDANCE_INVALID_STUDENT_CODE | Student code format invalid                                         | None       | `AttendanceErrors.attendanceInvalidStudentCode()` |
| ATD_015 | ATTENDANCE_ALREADY_EXISTS       | Attendance record already exists                                    | None       | `AttendanceErrors.attendanceAlreadyExists()`      |

## 📚 Levels Errors (LVL_xxx)

| Code    | Enum                                | Description                                 | Parameters | Example                                          |
| ------- | ----------------------------------- | ------------------------------------------- | ---------- | ------------------------------------------------ |
| LVL_001 | LEVEL_NOT_FOUND                     | Level not found in system                   | None       | `LevelsErrors.levelNotFound()`                   |
| LVL_002 | LEVEL_ALREADY_EXISTS                | Level already exists                        | None       | `LevelsErrors.levelAlreadyExists()`              |
| LVL_003 | LEVEL_INACTIVE                      | Level is currently inactive                 | None       | `LevelsErrors.levelInactive()`                   |
| LVL_004 | LEVEL_DELETED                       | Level has been deleted                      | None       | `LevelsErrors.levelDeleted()`                    |
| LVL_005 | LEVEL_CANNOT_MODIFY_DELETED         | Cannot modify deleted level                 | None       | `LevelsErrors.levelCannotModifyDeleted()`        |
| LVL_006 | LEVEL_CANNOT_DELETE_WITH_CLASSES    | Cannot delete level with associated classes | None       | `LevelsErrors.levelCannotDeleteWithClasses()`    |
| LVL_007 | LEVEL_CANNOT_RESTORE_WITH_CONFLICTS | Cannot restore level due to conflicts       | None       | `LevelsErrors.levelCannotRestoreWithConflicts()` |
| LVL_008 | LEVEL_BULK_OPERATION_FAILED         | Bulk level operation failed                 | None       | `LevelsErrors.levelBulkOperationFailed()`        |
| LVL_009 | LEVEL_INVALID_DATA                  | Level data validation failed                | None       | `LevelsErrors.levelInvalidData()`                |

## 📖 Subjects Errors (SBJ_xxx)

| Code    | Enum                                  | Description                                   | Parameters | Example                                              |
| ------- | ------------------------------------- | --------------------------------------------- | ---------- | ---------------------------------------------------- |
| SBJ_001 | SUBJECT_NOT_FOUND                     | Subject not found in system                   | None       | `SubjectsErrors.subjectNotFound()`                   |
| SBJ_002 | SUBJECT_ALREADY_EXISTS                | Subject already exists                        | None       | `SubjectsErrors.subjectAlreadyExists()`              |
| SBJ_003 | SUBJECT_INACTIVE                      | Subject is currently inactive                 | None       | `SubjectsErrors.subjectInactive()`                   |
| SBJ_004 | SUBJECT_DELETED                       | Subject has been deleted                      | None       | `SubjectsErrors.subjectDeleted()`                    |
| SBJ_005 | SUBJECT_CANNOT_MODIFY_DELETED         | Cannot modify deleted subject                 | None       | `SubjectsErrors.subjectCannotModifyDeleted()`        |
| SBJ_006 | SUBJECT_CANNOT_DELETE_WITH_CLASSES    | Cannot delete subject with associated classes | None       | `SubjectsErrors.subjectCannotDeleteWithClasses()`    |
| SBJ_007 | SUBJECT_CANNOT_RESTORE_WITH_CONFLICTS | Cannot restore subject due to conflicts       | None       | `SubjectsErrors.subjectCannotRestoreWithConflicts()` |
| SBJ_008 | SUBJECT_BULK_OPERATION_FAILED         | Bulk subject operation failed                 | None       | `SubjectsErrors.subjectBulkOperationFailed()`        |
| SBJ_009 | SUBJECT_INVALID_DATA                  | Subject data validation failed                | None       | `SubjectsErrors.subjectInvalidData()`                |

## 🏢 Centers Errors (CTR_xxx)

| Code        | Enum                                   | Description                            | Parameters | Example                                             |
| ----------- | -------------------------------------- | -------------------------------------- | ---------- | --------------------------------------------------- |
| CTR_BRN_001 | BRANCH_NOT_FOUND                       | Branch not found in system             | None       | `CentersErrors.branchNotFound()`                    |
| CTR_BRN_002 | BRANCH_ALREADY_EXISTS                  | Branch already exists                  | None       | `CentersErrors.branchAlreadyExists()`               |
| CTR_CTR_001 | CENTER_NOT_FOUND                       | Center not found in system             | None       | `CentersErrors.centerNotFound()`                    |
| CTR_CTR_002 | CENTER_ALREADY_EXISTS                  | Center already exists                  | None       | `CentersErrors.centerAlreadyExists()`               |
| CTR_CTR_003 | CENTER_ALREADY_ACTIVE                  | Center is already active               | None       | `CentersErrors.centerAlreadyActive()`               |
| CTR_ACC_001 | BRANCH_ACCESS_DENIED                   | Branch access denied                   | None       | `CentersErrors.branchAccessDenied()`                |
| CTR_ACC_002 | BRANCH_ACCESS_ALREADY_GRANTED          | Branch access already granted          | None       | `CentersErrors.branchAccessAlreadyGranted()`        |
| CTR_ACC_003 | BRANCH_ACCESS_NOT_GRANTED              | Branch access not granted              | None       | `CentersErrors.branchAccessNotGranted()`            |
| CTR_ACC_004 | BRANCH_ACCESS_NOT_FOUND                | Branch access record not found         | None       | `CentersErrors.branchAccessNotFound()`              |
| CTR_PRF_001 | PROFILE_INVALID_TYPE_FOR_BRANCH_ACCESS | Invalid profile type for branch access | None       | `CentersErrors.profileInvalidTypeForBranchAccess()` |
| CTR_PRF_002 | PROFILE_ALREADY_HAS_BRANCH_ACCESS      | Profile already has branch access      | None       | `CentersErrors.profileAlreadyHasBranchAccess()`     |
| CTR_VAL_001 | BRANCH_VALIDATION_FAILED               | Branch validation failed               | None       | `CentersErrors.branchValidationFailed()`            |
| CTR_VAL_002 | CENTER_VALIDATION_FAILED               | Center validation failed               | None       | `CentersErrors.centerValidationFailed()`            |

## 👨‍🏫 Staff Errors (STF_xxx)

| Code    | Enum                        | Description                           | Parameters | Example                                  |
| ------- | --------------------------- | ------------------------------------- | ---------- | ---------------------------------------- |
| STF_001 | STAFF_NOT_FOUND             | Staff member not found                | None       | `StaffErrors.staffNotFound()`            |
| STF_002 | STAFF_ALREADY_EXISTS        | Staff member already exists           | None       | `StaffErrors.staffAlreadyExists()`       |
| STF_003 | STAFF_INACTIVE              | Staff member is inactive              | None       | `StaffErrors.staffInactive()`            |
| STF_004 | STAFF_DELETED               | Staff member has been deleted         | None       | `StaffErrors.staffDeleted()`             |
| STF_005 | STAFF_INVALID_PROFILE_TYPE  | Staff member has invalid profile type | None       | `StaffErrors.staffInvalidProfileType()`  |
| STF_006 | STAFF_BULK_OPERATION_FAILED | Bulk staff operation failed           | None       | `StaffErrors.staffBulkOperationFailed()` |

## 👨‍🎓 Students Errors (STD_xxx)

| Code    | Enum                          | Description                      | Parameters | Example                                       |
| ------- | ----------------------------- | -------------------------------- | ---------- | --------------------------------------------- |
| STD_001 | STUDENT_NOT_FOUND             | Student not found                | None       | `StudentsErrors.studentNotFound()`            |
| STD_002 | STUDENT_ALREADY_EXISTS        | Student already exists           | None       | `StudentsErrors.studentAlreadyExists()`       |
| STD_003 | STUDENT_INACTIVE              | Student is inactive              | None       | `StudentsErrors.studentInactive()`            |
| STD_004 | STUDENT_DELETED               | Student has been deleted         | None       | `StudentsErrors.studentDeleted()`             |
| STD_005 | STUDENT_INVALID_PROFILE_TYPE  | Student has invalid profile type | None       | `StudentsErrors.studentInvalidProfileType()`  |
| STD_006 | STUDENT_BULK_OPERATION_FAILED | Bulk student operation failed    | None       | `StudentsErrors.studentBulkOperationFailed()` |

## 👨‍🏫 Teachers Errors (TCH_xxx)

| Code    | Enum                          | Description                      | Parameters | Example                                       |
| ------- | ----------------------------- | -------------------------------- | ---------- | --------------------------------------------- |
| TCH_001 | TEACHER_NOT_FOUND             | Teacher not found                | None       | `TeachersErrors.teacherNotFound()`            |
| TCH_002 | TEACHER_ALREADY_EXISTS        | Teacher already exists           | None       | `TeachersErrors.teacherAlreadyExists()`       |
| TCH_003 | TEACHER_INACTIVE              | Teacher is inactive              | None       | `TeachersErrors.teacherInactive()`            |
| TCH_004 | TEACHER_DELETED               | Teacher has been deleted         | None       | `TeachersErrors.teacherDeleted()`             |
| TCH_005 | TEACHER_INVALID_PROFILE_TYPE  | Teacher has invalid profile type | None       | `TeachersErrors.teacherInvalidProfileType()`  |
| TCH_006 | TEACHER_BULK_OPERATION_FAILED | Bulk teacher operation failed    | None       | `TeachersErrors.teacherBulkOperationFailed()` |

## 👨‍💼 Admin Errors (ADM_xxx)

| Code    | Enum                        | Description                    | Parameters | Example                                  |
| ------- | --------------------------- | ------------------------------ | ---------- | ---------------------------------------- |
| ADM_001 | ADMIN_NOT_FOUND             | Admin not found                | None       | `AdminErrors.adminNotFound()`            |
| ADM_002 | ADMIN_ALREADY_EXISTS        | Admin already exists           | None       | `AdminErrors.adminAlreadyExists()`       |
| ADM_003 | ADMIN_INACTIVE              | Admin is inactive              | None       | `AdminErrors.adminInactive()`            |
| ADM_004 | ADMIN_DELETED               | Admin has been deleted         | None       | `AdminErrors.adminDeleted()`             |
| ADM_005 | ADMIN_INVALID_PROFILE_TYPE  | Admin has invalid profile type | None       | `AdminErrors.adminInvalidProfileType()`  |
| ADM_006 | ADMIN_BULK_OPERATION_FAILED | Bulk admin operation failed    | None       | `AdminErrors.adminBulkOperationFailed()` |

## 👤 User Profile Errors (UPF_xxx)

| Code    | Enum                                           | Description                            | Parameters | Example                                                        |
| ------- | ---------------------------------------------- | -------------------------------------- | ---------- | -------------------------------------------------------------- |
| UPF_001 | USER_PROFILE_NOT_FOUND                         | User profile not found                 | None       | `UserProfileErrors.userProfileNotFound()`                      |
| UPF_009 | USER_PROFILE_INVALID_DATA                      | User profile data validation failed    | None       | `UserProfileErrors.userProfileInvalidData()`                   |
| UPF_011 | USER_PROFILE_SELECTION_REQUIRED                | User profile selection is required     | None       | `UserProfileErrors.userProfileSelectionRequired()`             |
| UPF_012 | USER_PROFILE_INACTIVE                          | User profile is inactive               | None       | `UserProfileErrors.userProfileInactive()`                      |
| UPF_013 | USER_PROFILE_ALREADY_EXISTS                    | User profile already exists            | None       | `UserProfileErrors.userProfileAlreadyExists()`                 |
| UPF_014 | USER_PROFILE_ALREADY_EXISTS_WITH_CENTER_ACCESS | User profile exists with center access | None       | `UserProfileErrors.userProfileAlreadyExistsWithCenterAccess()` |

## 💰 Student Billing Errors (SBL_xxx)

| Code    | Enum                                    | Description                                       | Parameters | Example                                                      |
| ------- | --------------------------------------- | ------------------------------------------------- | ---------- | ------------------------------------------------------------ |
| SBL_001 | SUBSCRIPTION_PAYMENT_STRATEGY_MISSING   | Monthly subscription payment strategy missing     | None       | `StudentBillingErrors.subscriptionPaymentStrategyMissing()`  |
| SBL_002 | SUBSCRIPTION_ALREADY_EXISTS             | Student already has active subscription for month | None       | `StudentBillingErrors.subscriptionAlreadyExists()`           |
| SBL_003 | SUBSCRIPTION_INVALID_PAYMENT_SOURCE     | Invalid payment source for subscription           | None       | `StudentBillingErrors.subscriptionInvalidPaymentSource()`    |
| SBL_004 | SESSION_CHARGE_PAYMENT_STRATEGY_MISSING | Session charge payment strategy missing           | None       | `StudentBillingErrors.sessionChargePaymentStrategyMissing()` |
| SBL_005 | SESSION_CHARGE_ALREADY_EXISTS           | Student already paid for this session             | None       | `StudentBillingErrors.sessionChargeAlreadyExists()`          |
| SBL_006 | SESSION_CHARGE_INVALID_PAYMENT_SOURCE   | Invalid payment source for session charge         | None       | `StudentBillingErrors.sessionChargeInvalidPaymentSource()`   |

## 🔔 Notification Errors (NTN_xxx)

| Code    | Enum                         | Description                           | Parameters                                  | Example                                           |
| ------- | ---------------------------- | ------------------------------------- | ------------------------------------------- | ------------------------------------------------- |
| NTN_001 | NOTIFICATION_NOT_FOUND       | Notification not found                | None                                        | `NotificationErrors.notificationNotFound()`       |
| NTN_002 | NOTIFICATION_ACCESS_DENIED   | Notification access denied            | None                                        | `NotificationErrors.notificationAccessDenied()`   |
| NTN_003 | TEMPLATE_RENDERING_FAILED    | Template rendering failed             | None                                        | `NotificationErrors.templateRenderingFailed()`    |
| NTN_004 | INVALID_RECIPIENT            | Invalid notification recipient        | None                                        | `NotificationErrors.invalidRecipient()`           |
| NTN_005 | NOTIFICATION_ALREADY_READ    | Notification already read             | None                                        | `NotificationErrors.notificationAlreadyRead()`    |
| NTN_006 | NOTIFICATION_SENDING_FAILED  | Notification sending failed           | channel, error                              | `NotificationErrors.notificationSendingFailed()`  |
| NTN_007 | CHANNEL_ADAPTER_FAILED       | Channel adapter operation failed      | channel, operation, error                   | `NotificationErrors.channelAdapterFailed()`       |
| NTN_008 | INVALID_CHANNEL              | Invalid channel for adapter           | adapter, expectedChannel, receivedChannel   | `NotificationErrors.invalidChannel()`             |
| NTN_009 | MISSING_NOTIFICATION_CONTENT | Required notification content missing | channel, contentType                        | `NotificationErrors.missingNotificationContent()` |
| NTN_010 | MISSING_TEMPLATE_VARIABLES   | Required template variables missing   | notificationType, channel, missingVariables | `NotificationErrors.missingTemplateVariables()`   |
| NTN_011 | WEBHOOK_SIGNATURE_INVALID    | Webhook signature validation failed   | None                                        | `NotificationErrors.webhookSignatureInvalid()`    |

## 🔧 System Errors (SYS_xxx)

| Code    | Enum                      | Description                                                       | Parameters                        | Example                                   |
| ------- | ------------------------- | ----------------------------------------------------------------- | --------------------------------- | ----------------------------------------- |
| SYS_001 | INTERNAL_SERVER_ERROR     | Unexpected internal server error (catch-all for unhandled errors) | None (handled by SystemException) | `SystemErrors.internalServerError()`      |
| SYS_002 | SERVICE_UNAVAILABLE       | Service is temporarily unavailable                                | None (handled by SystemException) | `SystemErrors.serviceUnavailable()`       |
| SYS_003 | SYSTEM_NOT_READY          | System is not ready to handle requests                            | None (handled by SystemException) | `SystemErrors.systemNotReady()`           |
| SYS_004 | DATABASE_CONNECTION_ERROR | Database connection failed                                        | None (handled by SystemException) | `SystemErrors.databaseConnectionFailed()` |
| SYS_005 | UNKNOWN_TRANSITION_LOGIC  | Unknown transition logic in state machine                         | None (handled by SystemException) | `SystemErrors.unknownTransitionLogic()`   |

---

## 🎯 Common Errors (GEN_xxx)

| Code    | Enum              | Description                            | Parameters | Example                          |
| ------- | ----------------- | -------------------------------------- | ---------- | -------------------------------- |
| GEN_006 | TOO_MANY_ATTEMPTS | Too many attempts, temporarily blocked | None       | `CommonErrors.tooManyAttempts()` |

## 🎯 Generic Fallback Errors (GEN_xxx)

| Code    | Enum               | Description                | Parameters                                    | Example                                                   |
| ------- | ------------------ | -------------------------- | --------------------------------------------- | --------------------------------------------------------- |
| GEN_001 | RESOURCE_NOT_FOUND | Generic resource not found | `entity: string, entityId?: string \| number` | `DomainErrors.resourceNotFound('User', 123)`              |
| GEN_002 | VALIDATION_FAILED  | Generic validation failure | `field: string, value: any`                   | `DomainErrors.validationFailed('email', 'invalid-email')` |

---

## 📝 Adding New Errors

When adding a new error to the system:

### 1. Choose Appropriate Module and Code

- **AUTH_xxx**: Authentication/authorization issues
- **USR_xxx**: User management operations
- **FIN_xxx**: Financial/payment operations
- **SYS_xxx**: System/infrastructure issues (500 status)
- **GEN_xxx**: Generic fallbacks (use sparingly)

### 2. Add Error Code to Enum

```typescript
// src/modules/auth/enums/auth.codes.ts
export enum AuthErrorCode {
  // ... existing codes
  NEW_ERROR_CODE = 'AUTH_027',
}
```

### 3. Add Helper Method

```typescript
// src/modules/auth/exceptions/auth.errors.ts
export class AuthErrors extends BaseErrorHelpers {
  // For errors with context
  static newErrorWithContext(param: Type): DomainException {
    return this.createWithDetails(AuthErrorCode.NEW_ERROR_CODE, { param });
  }

  // For simple errors
  static newSimpleError(): DomainException {
    return this.createNoDetails(AuthErrorCode.NEW_ERROR_CODE);
  }
}
```

### 4. Update This Documentation

Add a new row to the appropriate table with:

- Code: The error code
- Enum: The enum value name
- Description: Clear description
- Parameters: What the method expects (if any)
- Example: Usage example

### 5. Test Error Handling

- Verify backend throws error correctly
- Verify frontend handles error appropriately
- Check error appears in logs with correct code

---

## 🎯 Frontend Integration Guide

### Basic Error Handling Pattern

```javascript
try {
  await apiCall();
} catch (error) {
  switch (error.errorCode) {
    case 'AUTH_002':
      showToast('Invalid username or password.');
      break;
    case 'FIN_PAY_001':
      const { currentBalance, requiredAmount, currency } = error.details;
      showToast(
        `Insufficient funds. You have ${currentBalance} ${currency} but need ${requiredAmount} ${currency}.`,
      );
      break;
    case 'GEN_002':
      // Handle validation errors
      const validationErrors = handleValidationError(error);
      setFormErrors(validationErrors);
      break;
    default:
      showToast('An error occurred. Please try again.');
  }
}
```

### Error Response Structure

All API errors follow this structure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "details": {
      // Error-specific data (varies by error type)
    },
    "stack": ["..."], // Only in development mode
    "debug": { "...": "..." } // Only in development mode
  }
}
```

### Validation Error Handling

```javascript
function handleValidationError(error) {
  const fieldErrors = {};

  for (const [field, constraints] of Object.entries(
    error.details.validationErrors,
  )) {
    fieldErrors[field] = constraints.map((constraint) => ({
      type: constraint.constraint,
      params: constraint.params || {},
      message: generateValidationMessage(
        field,
        constraint.constraint,
        constraint.params,
      ),
    }));
  }

  return fieldErrors;
}

function generateValidationMessage(field, constraint, params = {}) {
  const fieldName = field.replace(/\[.*?\]/g, ''); // Remove array indices for display

  switch (constraint) {
    case 'minLength':
      return `${fieldName} must be at least ${params.min} characters`;
    case 'maxLength':
      return `${fieldName} must be no more than ${params.max} characters`;
    case 'min':
      return `${fieldName} must be at least ${params.min}`;
    case 'max':
      return `${fieldName} must be no more than ${params.max}`;
    case 'isEmail':
      return `${fieldName} must be a valid email address`;
    case 'isNotEmpty':
      return `${fieldName} is required`;
    case 'isIn':
      return `${fieldName} must be one of: ${params.values?.join(', ')}`;
    case 'isEnum':
      return `${fieldName} must be one of: ${params.allowedValues?.join(', ')}`;
    default:
      return `${fieldName} is invalid`;
  }
}
```

---

## ✅ Class-Validator Constraints Reference

This section documents all class-validator constraints supported in the validation pipe, including which ones provide parameters to clients.

### 📋 Constraint Parameters Table

| Constraint          | Parameters Provided                     | Description                                   | Example Parameter                                      |
| ------------------- | --------------------------------------- | --------------------------------------------- | ------------------------------------------------------ |
| `isNotEmpty`        | ❌ None                                 | Value is not null, undefined, or empty string | N/A                                                    |
| `isString`          | ❌ None                                 | Value is a string                             | N/A                                                    |
| `isNumber`          | ❌ None                                 | Value is a number                             | N/A                                                    |
| `isBoolean`         | ❌ None                                 | Value is a boolean                            | N/A                                                    |
| `isDate`            | ❌ None                                 | Value is a valid date                         | N/A                                                    |
| `isEmail`           | ❌ None                                 | Value is a valid email format                 | N/A                                                    |
| `isUUID`            | ❌ None                                 | Value is a valid UUID                         | N/A                                                    |
| `isStrongPassword`  | ❌ None                                 | Password meets strength requirements          | N/A                                                    |
| `isIn`              | ✅ `values: string[]`                   | Value is in allowed array                     | `{ "values": ["+1", "+20", "+966"] }`                  |
| `isNotIn`           | ✅ `values: string[]`                   | Value is not in forbidden array               | `{ "values": ["banned1", "banned2"] }`                 |
| `isArray`           | ❌ None                                 | Value is an array                             | N/A                                                    |
| `isEnum`            | ✅ `allowedValues: string[]`            | Value is a valid enum value                   | `{ "allowedValues": ["admin", "teacher", "student"] }` |
| `matches`           | ❌ None                                 | Value matches regex pattern                   | N/A                                                    |
| `isOptional`        | ❌ None                                 | Value can be undefined/null                   | N/A                                                    |
| `equals`            | ❌ None                                 | Value equals comparison value                 | N/A                                                    |
| `notEquals`         | ❌ None                                 | Value doesn't equal comparison value          | N/A                                                    |
| `isDefined`         | ❌ None                                 | Value is defined (not undefined)              | N/A                                                    |
| `isNotEmptyObject`  | ❌ None                                 | Object is not empty                           | N/A                                                    |
| `isInstance`        | ❌ None                                 | Value is instance of class                    | N/A                                                    |
| `isInt`             | ❌ None                                 | Value is integer                              | N/A                                                    |
| `isPositive`        | ❌ None                                 | Value is positive number                      | N/A                                                    |
| `isNegative`        | ❌ None                                 | Value is negative number                      | N/A                                                    |
| `min`               | ✅ `min: number`                        | Minimum numeric value                         | `{ "min": 18 }`                                        |
| `max`               | ✅ `max: number`                        | Maximum numeric value                         | `{ "max": 120 }`                                       |
| `minLength`         | ✅ `min: number`                        | Minimum string length                         | `{ "min": 3 }`                                         |
| `maxLength`         | ✅ `max: number`                        | Maximum string length                         | `{ "max": 50 }`                                        |
| `arrayMinSize`      | ✅ `min: number`                        | Minimum array size                            | `{ "min": 1 }`                                         |
| `arrayMaxSize`      | ✅ `max: number`                        | Maximum array size                            | `{ "max": 10 }`                                        |
| `arrayUnique`       | ❌ None                                 | Array contains unique values                  | N/A                                                    |
| `arrayContains`     | ✅ `requiredValues: string[]`           | Array contains specific values                | `{ "requiredValues": ["required1", "required2"] }`     |
| `arrayNotContains`  | ✅ `requiredValues: string[]`           | Array doesn't contain specific values         | `{ "requiredValues": ["forbidden1", "forbidden2"] }`   |
| `arrayNotEmpty`     | ❌ None                                 | Array is not empty                            | N/A                                                    |
| `isDivisibleBy`     | ✅ `divisor: number`                    | Number is divisible by value                  | `{ "divisor": 2 }`                                     |
| `isHexColor`        | ❌ None                                 | Value is valid hex color                      | N/A                                                    |
| `isHexadecimal`     | ❌ None                                 | Value is hexadecimal                          | N/A                                                    |
| `isOctal`           | ❌ None                                 | Value is octal                                | N/A                                                    |
| `isDecimal`         | ❌ None                                 | Value is decimal                              | N/A                                                    |
| `isLatLong`         | ❌ None                                 | Value is latitude/longitude                   | N/A                                                    |
| `isLatitude`        | ❌ None                                 | Value is latitude                             | N/A                                                    |
| `isLongitude`       | ❌ None                                 | Value is longitude                            | N/A                                                    |
| `isIP`              | ❌ None                                 | Value is IP address                           | N/A                                                    |
| `isPort`            | ❌ None                                 | Value is valid port                           | N/A                                                    |
| `isJSON`            | ❌ None                                 | Value is valid JSON                           | N/A                                                    |
| `isJWT`             | ❌ None                                 | Value is JWT token                            | N/A                                                    |
| `isObject`          | ❌ None                                 | Value is object                               | N/A                                                    |
| `isNotEmptyObject`  | ❌ None                                 | Object is not empty                           | N/A                                                    |
| `isLowercase`       | ❌ None                                 | String is lowercase                           | N/A                                                    |
| `isUppercase`       | ❌ None                                 | String is uppercase                           | N/A                                                    |
| `length`            | ✅ `min: number, max: number`           | String/array length in range                  | `{ "min": 5, "max": 20 }`                              |
| `isUrl`             | ❌ None                                 | Value is valid URL                            | N/A                                                    |
| `isFQDN`            | ❌ None                                 | Value is fully qualified domain name          | N/A                                                    |
| `isDateString`      | ❌ None                                 | Value is date string                          | N/A                                                    |
| `isPhoneNumber`     | ❌ None                                 | Value is phone number                         | N/A                                                    |
| `isISO8601`         | ❌ None                                 | Value is ISO8601 date                         | N/A                                                    |
| `isISO31661Alpha2`  | ❌ None                                 | Value is ISO3166-1 alpha-2 country code       | N/A                                                    |
| `isISO31661Alpha3`  | ❌ None                                 | Value is ISO3166-1 alpha-3 country code       | N/A                                                    |
| `isBase64`          | ❌ None                                 | Value is base64 encoded                       | N/A                                                    |
| `isHash`            | ❌ None                                 | Value is hash (MD5, SHA1, etc.)               | N/A                                                    |
| `isMACAddress`      | ❌ None                                 | Value is MAC address                          | N/A                                                    |
| `isDataURI`         | ❌ None                                 | Value is data URI                             | N/A                                                    |
| `isMagnetURI`       | ❌ None                                 | Value is magnet URI                           | N/A                                                    |
| `isMimeType`        | ❌ None                                 | Value is MIME type                            | N/A                                                    |
| `isFileName`        | ❌ None                                 | Value is filename                             | N/A                                                    |
| `isAlpha`           | ❌ None                                 | String contains only letters                  | N/A                                                    |
| `isAlphanumeric`    | ❌ None                                 | String contains letters and numbers           | N/A                                                    |
| `isAscii`           | ❌ None                                 | String contains ASCII characters              | N/A                                                    |
| `isByteLength`      | ✅ `minBytes: number, maxBytes: number` | String byte length in range                   | `{ "minBytes": 10, "maxBytes": 100 }`                  |
| `isVariableWidth`   | ❌ None                                 | String contains full-width chars              | N/A                                                    |
| `isFullWidth`       | ❌ None                                 | String contains full-width chars              | N/A                                                    |
| `isHalfWidth`       | ❌ None                                 | String contains half-width chars              | N/A                                                    |
| `isSurrogatePair`   | ❌ None                                 | String contains surrogate pairs               | N/A                                                    |
| `isMultibyte`       | ❌ None                                 | String contains multibyte chars               | N/A                                                    |
| `isSemVer`          | ❌ None                                 | Value is semantic version                     | N/A                                                    |
| `isISSN`            | ❌ None                                 | Value is ISSN                                 | N/A                                                    |
| `isISIN`            | ❌ None                                 | Value is ISIN                                 | N/A                                                    |
| `isISBN`            | ❌ None                                 | Value is ISBN                                 | N/A                                                    |
| `isISRC`            | ❌ None                                 | Value is ISRC                                 | N/A                                                    |
| `isRFC3339`         | ❌ None                                 | Value is RFC3339 date                         | N/A                                                    |
| `isIdentityCard`    | ❌ None                                 | Value is identity card                        | N/A                                                    |
| `isPassportNumber`  | ❌ None                                 | Value is passport number                      | N/A                                                    |
| `isPostalCode`      | ❌ None                                 | Value is postal code                          | N/A                                                    |
| `isCurrency`        | ❌ None                                 | Value is currency                             | N/A                                                    |
| `isBtcAddress`      | ❌ None                                 | Value is Bitcoin address                      | N/A                                                    |
| `isEthereumAddress` | ❌ None                                 | Value is Ethereum address                     | N/A                                                    |
| `isCreditCard`      | ❌ None                                 | Value is credit card number                   | N/A                                                    |
| `isIBAN`            | ❌ None                                 | Value is IBAN                                 | N/A                                                    |
| `isBIC`             | ❌ None                                 | Value is BIC                                  | N/A                                                    |
| `isHSL`             | ❌ None                                 | Value is HSL color                            | N/A                                                    |
| `isRgbColor`        | ❌ None                                 | Value is RGB color                            | N/A                                                    |
| `isMilitaryTime`    | ❌ None                                 | Value is military time                        | N/A                                                    |
| `isHash`            | ❌ None                                 | Value is hash                                 | N/A                                                    |
| `isEAN`             | ❌ None                                 | Value is EAN                                  | N/A                                                    |
| `isSSN`             | ❌ None                                 | Value is SSN                                  | N/A                                                    |
| `isTaxId`           | ❌ None                                 | Value is tax ID                               | N/A                                                    |

### 🎯 Dual-Source Parameter Extraction Logic

The validation pipe uses a **dual-source strategy** for maximum reliability and flexibility:

#### 🥇 **Phase 1: Contexts First (Developer Intent)**

```typescript
// Check if developer explicitly provided parameters
if (error.contexts?.[constraintKey]) {
  return error.contexts[constraintKey]; // Most reliable!
}
```

#### 🥈 **Phase 2: Regex Fallback (Automation)**

```typescript
// Performance: Pre-compiled regex patterns
const NUMERIC_EXTRACTOR = /(\d+(?:\.\d+)?)/;
const LENGTH_RANGE_EXTRACTOR = /min.*?(\d+).*?max.*?(\d+)/;

// Enhanced parameter extraction with compiled regex
case 'minLength':
case 'maxLength':
  const lengthMatch = constraintMessage.match(NUMERIC_EXTRACTOR);
  if (lengthMatch) {
    params[constraintKey === 'minLength' ? 'min' : 'max'] = parseInt(lengthMatch[1], 10);
  }
  break;

// Enum values extraction
case 'isEnum':
  const enumPart = constraintMessage.split(': ')[1];
  if (enumPart) {
    params.allowedValues = enumPart.split(', ').map(v => v.trim());
  }
  break;

// Array constraint values
case 'isIn':
case 'isNotIn':
  const valuesPart = constraintMessage.split(': ')[1];
  if (valuesPart) {
    params.values = valuesPart.split(', ').map(v => v.trim());
  }
  break;

// Array content constraints
case 'arrayContains':
case 'arrayNotContains':
  const arrayValuesPart = constraintMessage.split(': ')[1];
  if (arrayValuesPart) {
    params.requiredValues = arrayValuesPart.split(', ').map(v => v.trim());
  }
  break;
```

#### ❌ Parameters NOT Extracted:

- **Enum values**: Client should know enum from DTO definition
- **Regex patterns**: Client should know from DTO definition
- **Array contents**: Client should know allowed values from DTO
- **Boolean constraints**: No parameters needed (pass/fail only)

---

## 🔢 Error Code Enums Reference

Here are the actual error code enums used in the LMS system. These are the exact error codes you'll receive in API responses.

### 🔐 Authentication Error Codes

```javascript
enum AuthErrorCode {
  AUTHENTICATION_FAILED = 'AUTH_001',
  INVALID_CREDENTIALS = 'AUTH_002',
  ACCOUNT_DISABLED = 'AUTH_003',
  ACCOUNT_LOCKED = 'AUTH_004',
  PHONE_NOT_VERIFIED = 'AUTH_008',
  OTP_REQUIRED = 'AUTH_009',
  OTP_INVALID = 'AUTH_010',
  OTP_EXPIRED = 'AUTH_011',
  USER_NOT_FOUND = 'AUTH_014',
  PASSWORD_RESET_REQUIRED = 'AUTH_017',
  PASSWORD_RESET_EXPIRED = 'AUTH_018',
  SESSION_EXPIRED = 'AUTH_019',
  SESSION_INVALID = 'AUTH_020',
  REFRESH_TOKEN_INVALID = 'AUTH_022',
  REFRESH_TOKEN_EXPIRED = 'AUTH_023',
  PROFILE_INACTIVE = 'AUTH_024',
  PROFILE_SELECTION_REQUIRED = 'AUTH_025',
  TWO_FACTOR_NOT_ENABLED = 'AUTH_026',
  TWO_FACTOR_ALREADY_ENABLED = 'AUTH_027',
  TWO_FACTOR_ALREADY_SETUP = 'AUTH_028',
  MISSING_USER_IDENTIFIER = 'AUTH_029',
  MISSING_PHONE_PARAMETER = 'AUTH_030',
  REFRESH_TOKEN_NOT_FOUND = 'AUTH_031',
  AUTHENTICATION_REQUIRED = 'AUTH_032'
}
```

### 👤 User Management Error Codes

```javascript
enum UserErrorCode {
  USER_NOT_FOUND = 'USR_001',
  USER_ALREADY_EXISTS = 'USR_002',
  EMAIL_ALREADY_EXISTS = 'USR_003',
  USER_INACTIVE = 'USR_004',
  USER_DELETED = 'USR_005',
  USER_SUSPENDED = 'USR_006',
  CURRENT_PASSWORD_INVALID = 'USR_010',
  PASSWORD_RESET_EXPIRED = 'USR_008',
  PASSWORD_RESET_INVALID = 'USR_009',
  PROFILE_UPDATE_FORBIDDEN = 'USR_011',
  PROFILE_INCOMPLETE = 'USR_012',
  ROLE_ASSIGNMENT_FORBIDDEN = 'USR_013',
  ROLE_CHANGE_FORBIDDEN = 'USR_014',
  USER_CREATION_FORBIDDEN = 'USR_016',
  USER_IMPORT_FAILED = 'USR_017',
  USER_SETTINGS_INVALID = 'USR_022',
  PREFERENCE_UPDATE_FAILED = 'USR_023',
  USER_DELETION_FORBIDDEN = 'USR_024',
  USER_CANNOT_DELETE_SELF = 'USR_026',
  USER_DATA_INVALID = 'USR_027',
  PHONE_ALREADY_EXISTS = 'USR_028',
  USER_INFO_NOT_FOUND = 'USR_029',
  USER_CENTER_REQUIRED = 'USR_030'
}
```

### 💰 Financial Error Codes

```javascript
enum FinanceErrorCode {
  INSUFFICIENT_FUNDS = 'FIN_PAY_001',
  WALLET_NOT_FOUND = 'FIN_PAY_002',
  CASHBOX_NOT_FOUND = 'FIN_PAY_003',
  PAYMENT_PROVIDER_DOWN = 'FIN_PAY_004',
  TRANSACTION_FAILED = 'FIN_PAY_005',
  PAYMENT_REFERENCE_INVALID = 'FIN_PAY_006',
  PAYMENT_NOT_COMPLETED = 'FIN_PAY_007',
  PAYMENT_ALREADY_REFUNDED = 'FIN_PAY_008',
  PAYMENT_NOT_PENDING = 'FIN_PAY_009',
  PAYMENT_CURRENCY_NOT_SUPPORTED = 'FIN_PAY_010',
  PAYMENT_SERVICE_UNAVAILABLE = 'FIN_PAY_011',
  PAYMENT_SETUP_FAILED = 'FIN_PAY_012',
  PAYMENT_PROCESSING_FAILED = 'FIN_PAY_013',
  PAYMENT_NOT_FOUND_BY_GATEWAY_ID = 'FIN_PAY_014',
  PAYMENT_NOT_REFUNDABLE = 'FIN_PAY_015',
  PAYMENT_NOT_EXTERNAL = 'FIN_PAY_016',
  REFUND_AMOUNT_EXCEEDS_PAYMENT = 'FIN_PAY_017',
  PAYMENT_MISSING_GATEWAY_ID = 'FIN_PAY_018',
  INSUFFICIENT_REFUND_BALANCE = 'FIN_PAY_019',
  PAYMENT_STATUS_TRANSITION_INVALID = 'FIN_PAY_020',
  PAYMENT_OVERRIDE_DENIED = 'FIN_PAY_021',
  PAYMENT_OWNERSHIP_REQUIRED = 'FIN_PAY_022',
  WALLET_ACCESS_DENIED = 'FIN_PAY_023',
  TRANSACTION_NOT_FOUND = 'FIN_TXN_001',
  TRANSACTION_AMOUNT_MISMATCH = 'FIN_TXN_002',
  TRANSACTION_BALANCE_REQUIRED = 'FIN_TXN_003',
  CASH_TRANSACTION_NOT_FOUND = 'FIN_CTXN_001',
  TRANSFER_PROFILES_DIFFERENT_USERS = 'FIN_XFER_001',
  TRANSFER_SAME_PROFILE = 'FIN_XFER_002'
}
```

### 🔐 Access Control Error Codes

```javascript
enum AccessControlErrorCode {
  USER_PROFILE_NOT_FOUND = 'ACL_001',
  USER_ALREADY_HAS_ACCESS = 'ACL_002',
  CENTER_ACCESS_NOT_FOUND = 'ACL_003',
  CENTER_ACCESS_ALREADY_EXISTS = 'ACL_004',
  CENTER_ACCESS_ALREADY_DELETED = 'ACL_005',
  CENTER_ACCESS_ALREADY_INACTIVE = 'ACL_006',
  ROLE_NOT_FOUND = 'ACL_007',
  ROLE_ALREADY_EXISTS = 'ACL_008',
  PERMISSION_NOT_FOUND = 'ACL_009',
  PERMISSION_ALREADY_ASSIGNED = 'ACL_010',
  CANNOT_ASSIGN_ROLE_TO_SELF = 'ACL_011',
  INSUFFICIENT_PRIVILEGES_FOR_ROLE_ASSIGNMENT = 'ACL_012',
  USER_ALREADY_HAS_ROLE = 'ACL_013',
  USER_DOES_NOT_HAVE_ROLE = 'ACL_014',
  CANNOT_MODIFY_SYSTEM_ROLE = 'ACL_015',
  ROLE_IS_IN_USE = 'ACL_016',
  INVALID_ROLE_STATUS_TRANSITION = 'ACL_017',
  INVALID_PROFILE_TYPE_FOR_ROLE_ASSIGNMENT = 'ACL_018',
  ROLE_ALREADY_ACTIVE = 'ACL_019',
  UNSUPPORTED_PROFILE_TYPE_FOR_CENTER_ACCESS = 'ACL_020',
  CANNOT_DELETE_ADMIN_CENTER_ACCESS = 'ACL_021',
  CANNOT_RESTORE_ACTIVE_CENTER_ACCESS = 'ACL_022',
  CANNOT_MODIFY_ADMIN_CENTER_ACCESS = 'ACL_023',
  INVALID_PROFILE_TYPE = 'ACL_024',
  CANNOT_ACCESS_GRANTER_USER = 'ACL_026',
  CANNOT_ACCESS_TARGET_USER = 'ACL_027',
  CANNOT_REVOKE_USER_ACCESS = 'ACL_028',
  CANNOT_ACCESS_USER_RECORDS = 'ACL_029',
  MISSING_PERMISSION = 'ACL_030',
  USER_ACCESS_NOT_FOUND = 'ACL_025'
}
```

### 📚 Classes Error Codes

```javascript
enum ClassesErrorCode {
  CLASS_NOT_FOUND = 'CLS_001',
  CLASS_STATUS_TRANSITION_INVALID = 'CLS_005',
  CLASS_CANNOT_MODIFY_COMPLETED = 'CLS_006',
  CLASS_CANNOT_MODIFY_CANCELLED = 'CLS_007',
  CLASS_STATUS_CHANGE_GRACE_PERIOD_EXPIRED = 'CLS_008',
  CLASS_ACCESS_DENIED = 'CLS_029',
  CLASS_STAFF_ALREADY_ASSIGNED = 'CLS_031',
  CLASS_STAFF_NOT_ASSIGNED = 'CLS_032',
  PAYMENT_STRATEGY_NOT_FOUND = 'CLS_033',
  PAYMENT_STRATEGY_UPDATE_DENIED = 'CLS_034',
  SCHEDULE_CONFLICT = 'CLS_036',
  SCHEDULE_OVERLAP = 'CLS_037',
  TEACHER_SCHEDULE_CONFLICT = 'CLS_038',
  GROUP_NOT_FOUND = 'CLS_039',
  STUDENT_SCHEDULE_CONFLICT = 'CLS_041',
  GROUP_ALREADY_EXISTS = 'CLS_040',
  GROUP_STUDENT_ALREADY_ASSIGNED = 'CLS_044',
  GROUP_STUDENT_NOT_ASSIGNED = 'CLS_045',
  CLASS_VALIDATION_FAILED = 'CLS_046',
  GROUP_VALIDATION_FAILED = 'CLS_047',
  CLASS_START_DATE_UPDATE_FORBIDDEN = 'CLS_048',
  CLASS_STATUS_DOES_NOT_ALLOW_STAFF_ASSIGNMENT = 'CLS_049',
  STAFF_ALREADY_ASSIGNED_TO_CLASS = 'CLS_050',
  GROUP_CREATION_NOT_ALLOWED_FOR_CLASS_STATUS = 'CLS_051',
  STUDENT_INVALID_TYPE_FOR_GROUP_ASSIGNMENT = 'CLS_052',
  STUDENT_ALREADY_ASSIGNED_TO_GROUP = 'CLS_053',
  RESOURCE_ACCESS_DENIED = 'CLS_054',
  CLASS_STAFF_ACCESS_NOT_FOUND = 'CLS_055',
  CANNOT_ACCESS_CLASSES = 'CLS_056',
  CANNOT_ACCESS_CLASS = 'CLS_057',
  CLASS_BRANCH_REQUIRED = 'CLS_058'
}
```

### 📅 Sessions Error Codes

```javascript
enum SessionsErrorCode {
  SESSION_NOT_FOUND = 'SES_001',
  SESSION_ALREADY_EXISTS = 'SES_002',
  SESSION_INACTIVE = 'SES_003',
  SESSION_DELETED = 'SES_004',
  SESSION_STATUS_TRANSITION_INVALID = 'SES_005',
  SESSION_CANNOT_MODIFY_COMPLETED = 'SES_006',
  SESSION_CANNOT_MODIFY_CANCELLED = 'SES_007',
  SESSION_START_TIME_PAST = 'SES_008',
  SESSION_CANCEL_FAILED = 'SES_017',
  SESSION_CLASS_NOT_ACTIVE = 'SES_019',
  SESSION_SCHEDULE_CONFLICT = 'SES_020',
  SESSION_CHECK_IN_INVALID_STATUS = 'SES_021',
  SESSION_SCHEDULE_ITEM_NOT_FOUND = 'SES_022',
  SESSION_NOT_CHECKED_IN = 'SES_023',
  SESSION_START_INVALID_STATUS = 'SES_024',
  SESSION_CANNOT_UPDATE = 'SES_025',
  SESSION_STATUS_INVALID_FOR_OPERATION = 'SES_026',
  SESSION_ACCESS_DENIED = 'SES_027',
  SESSION_SCHEDULE_ITEM_INVALID = 'SES_028',
  SESSION_INVALID_ID_FORMAT = 'SES_029'
}
```

### 📊 Other Error Codes

```javascript
enum AttendanceErrorCode {
  ATTENDANCE_SESSION_NOT_ACTIVE = 'ATD_007',
  ATTENDANCE_STUDENT_NOT_ENROLLED = 'ATD_008',
  ATTENDANCE_PAYMENT_REQUIRED = 'ATD_012',
  ATTENDANCE_INVALID_STUDENT_CODE = 'ATD_014',
  ATTENDANCE_ALREADY_EXISTS = 'ATD_015'
}

enum LevelsErrorCode {
  LEVEL_NOT_FOUND = 'LVL_001',
  LEVEL_ALREADY_EXISTS = 'LVL_002',
  LEVEL_INACTIVE = 'LVL_003',
  LEVEL_DELETED = 'LVL_004',
  LEVEL_CANNOT_MODIFY_DELETED = 'LVL_005',
  LEVEL_CANNOT_DELETE_WITH_CLASSES = 'LVL_006',
  LEVEL_CANNOT_RESTORE_WITH_CONFLICTS = 'LVL_007',
  LEVEL_BULK_OPERATION_FAILED = 'LVL_008',
  LEVEL_INVALID_DATA = 'LVL_009'
}

enum SubjectsErrorCode {
  SUBJECT_NOT_FOUND = 'SBJ_001',
  SUBJECT_ALREADY_EXISTS = 'SBJ_002',
  SUBJECT_INACTIVE = 'SBJ_003',
  SUBJECT_DELETED = 'SBJ_004',
  SUBJECT_CANNOT_MODIFY_DELETED = 'SBJ_005',
  SUBJECT_CANNOT_DELETE_WITH_CLASSES = 'SBJ_006',
  SUBJECT_CANNOT_RESTORE_WITH_CONFLICTS = 'SBJ_007',
  SUBJECT_BULK_OPERATION_FAILED = 'SBJ_008',
  SUBJECT_INVALID_DATA = 'SBJ_009'
}

enum CentersErrorCode {
  BRANCH_NOT_FOUND = 'CTR_BRN_001',
  BRANCH_ALREADY_EXISTS = 'CTR_BRN_002',
  CENTER_NOT_FOUND = 'CTR_CTR_001',
  CENTER_ALREADY_EXISTS = 'CTR_CTR_002',
  CENTER_ALREADY_ACTIVE = 'CTR_CTR_003',
  BRANCH_ACCESS_DENIED = 'CTR_ACC_001',
  BRANCH_ACCESS_ALREADY_GRANTED = 'CTR_ACC_002',
  BRANCH_ACCESS_NOT_GRANTED = 'CTR_ACC_003',
  BRANCH_ACCESS_NOT_FOUND = 'CTR_ACC_004',
  PROFILE_INVALID_TYPE_FOR_BRANCH_ACCESS = 'CTR_PRF_001',
  PROFILE_ALREADY_HAS_BRANCH_ACCESS = 'CTR_PRF_002',
  BRANCH_VALIDATION_FAILED = 'CTR_VAL_001',
  CENTER_VALIDATION_FAILED = 'CTR_VAL_002'
}

enum UserProfileErrorCode {
  USER_PROFILE_NOT_FOUND = 'UPF_001',
  USER_PROFILE_INVALID_DATA = 'UPF_009',
  USER_PROFILE_SELECTION_REQUIRED = 'UPF_011',
  USER_PROFILE_INACTIVE = 'UPF_012',
  USER_PROFILE_ALREADY_EXISTS = 'UPF_013',
  USER_PROFILE_ALREADY_EXISTS_WITH_CENTER_ACCESS = 'UPF_014'
}

enum StudentBillingErrorCode {
  SUBSCRIPTION_PAYMENT_STRATEGY_MISSING = 'SBL_001',
  SUBSCRIPTION_ALREADY_EXISTS = 'SBL_002',
  SUBSCRIPTION_INVALID_PAYMENT_SOURCE = 'SBL_003',
  SESSION_CHARGE_PAYMENT_STRATEGY_MISSING = 'SBL_004',
  SESSION_CHARGE_ALREADY_EXISTS = 'SBL_005',
  SESSION_CHARGE_INVALID_PAYMENT_SOURCE = 'SBL_006'
}

enum NotificationErrorCode {
  NOTIFICATION_NOT_FOUND = 'NTN_001',
  NOTIFICATION_ACCESS_DENIED = 'NTN_002',
  TEMPLATE_RENDERING_FAILED = 'NTN_003',
  INVALID_RECIPIENT = 'NTN_004',
  NOTIFICATION_ALREADY_READ = 'NTN_005',
  NOTIFICATION_SENDING_FAILED = 'NTN_006',
  CHANNEL_ADAPTER_FAILED = 'NTN_007',
  INVALID_CHANNEL = 'NTN_008',
  MISSING_NOTIFICATION_CONTENT = 'NTN_009',
  MISSING_TEMPLATE_VARIABLES = 'NTN_010',
  WEBHOOK_SIGNATURE_INVALID = 'NTN_011'
}

enum SystemErrorCode {
  INTERNAL_SERVER_ERROR = 'SYS_001',
  SERVICE_UNAVAILABLE = 'SYS_002',
  SYSTEM_NOT_READY = 'SYS_003',
  DATABASE_CONNECTION_ERROR = 'SYS_004',
  UNKNOWN_TRANSITION_LOGIC = 'SYS_005'
}

enum CommonErrorCode {
  ADMIN_ACCESS_DENIED = 'GEN_005',
  TOO_MANY_ATTEMPTS = 'GEN_006',
  TOO_MANY_SESSIONS = 'GEN_007',
  BULK_OPERATION_FAILED = 'GEN_008',
  BULK_OPERATION_PARTIAL_SUCCESS = 'GEN_009',
  RESOURCE_NOT_FOUND = 'GEN_001',
  VALIDATION_FAILED = 'GEN_002'
}
```

### 🎯 Error Code Structure

- **AUTH_xxx**: Authentication & Authorization (001-032)
- **USR_xxx**: User Management (001-030)
- **FIN_xxx**: Financial Operations (PAY/TXN/CTXN/XFER prefixes)
- **ACL_xxx**: Access Control & Permissions (001-030)
- **CLS_xxx**: Classes Management (001-058)
- **SES_xxx**: Sessions Management (001-029)
- **ATD_xxx**: Attendance (007,008,012,014,015)
- **LVL_xxx**: Levels (001-009)
- **SBJ_xxx**: Subjects (001-009)
- **CTR_xxx**: Centers (BRN/CTR/ACC/PRF/VAL prefixes)
- **UPF_xxx**: User Profiles (001,009,011-014)
- **SBL_xxx**: Student Billing (001-006)
- **NTN_xxx**: Notifications (001-011)
- **SYS_xxx**: System Errors (001-005)
- **GEN_xxx**: Common/Generic Errors (001,002,005-009)

---

## 📋 Available Enums Reference

Frontend developers need to know what enum values are allowed for form fields. Here are the common enums used in the LMS system:

### 👤 Profile Types

```javascript
enum ProfileType {
  ADMIN = 'Admin',
  STAFF = 'Staff',
  TEACHER = 'Teacher',
  STUDENT = 'Student',
  PARENT = 'Parent'
}
```

**Usage:** User profile type selection, role assignments

### 🌍 Locales

```javascript
enum Locale {
  EN = 'en',  // English
  AR = 'ar'   // Arabic
}
```

**Usage:** Language selection, date formatting

### 💰 Payment Status

```javascript
enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}
```

**Usage:** Payment status tracking, transaction history

### 💳 Payment Sources

```javascript
enum PaymentSource {
  WALLET = 'WALLET',
  CASH = 'CASH',
  PACKAGE = 'PACKAGE',
  EXTERNAL = 'EXTERNAL'
}
```

**Usage:** Payment method selection, transaction categorization

### 🔄 Transaction Types

```javascript
enum TransactionType {
  STUDENT_PAYMENT = 'STUDENT_PAYMENT',
  BRANCH_COLLECTION = 'BRANCH_COLLECTION',
  TEACHER_SALARY = 'TEACHER_SALARY',
  INTERNAL_TRANSFER = 'INTERNAL_TRANSFER',
  TOPUP = 'TOPUP',
  REFUND = 'REFUND',
  SESSION_PAYMENT = 'SESSION_PAYMENT',
  MONTHLY_PAYMENT = 'MONTHLY_PAYMENT'
}
```

**Usage:** Transaction filtering, financial reporting

### 📚 Class Status

```javascript
enum ClassStatus {
  PENDING_TEACHER_APPROVAL = 'PENDING_TEACHER_APPROVAL',
  NOT_STARTED = 'NOT_STARTED',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  FINISHED = 'FINISHED',
  CANCELED = 'CANCELED'
}
```

**Usage:** Class status management, scheduling

### 🏢 Default Roles

```javascript
enum DefaultRoles {
  SUPER_ADMIN = 'Super Administrator',
  OWNER = 'Owner'
}
```

**Usage:** System role management, access control

### 🎯 Frontend Integration with Enums

```javascript
// Example: Create dropdown options from enums
const profileTypeOptions = [
  { value: 'Admin', label: 'Administrator' },
  { value: 'Staff', label: 'Staff Member' },
  { value: 'Teacher', label: 'Teacher' },
  { value: 'Student', label: 'Student' },
  { value: 'Parent', label: 'Parent' },
];

const paymentStatusOptions = [
  { value: 'PENDING', label: 'Pending', color: 'yellow' },
  { value: 'COMPLETED', label: 'Completed', color: 'green' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'red' },
  { value: 'FAILED', label: 'Failed', color: 'red' },
  { value: 'REFUNDED', label: 'Refunded', color: 'blue' },
];

// Example: Validate enum values
function isValidProfileType(value) {
  return ['Admin', 'Staff', 'Teacher', 'Student', 'Parent'].includes(value);
}

function isValidPaymentStatus(value) {
  return ['PENDING', 'COMPLETED', 'CANCELLED', 'FAILED', 'REFUNDED'].includes(
    value,
  );
}
```

### 🎯 Enum Usage in Forms

```javascript
// User profile creation form
const createProfileForm = {
  profileType: {
    type: 'select',
    options: Object.values(ProfileType),
    required: true,
  },
  locale: {
    type: 'select',
    options: Object.values(Locale),
    default: Locale.EN,
  },
};

// Payment filtering
const paymentFilters = {
  status: {
    type: 'multiselect',
    options: Object.values(PaymentStatus),
  },
  source: {
    type: 'select',
    options: Object.values(PaymentSource),
  },
};
```

---

## 📋 Quick Reference Summary

| Category               | Error Codes                  | Common Patterns                 |
| ---------------------- | ---------------------------- | ------------------------------- |
| **Authentication**     | `AUTH_001-032`               | Login, registration, sessions   |
| **User Management**    | `USR_001-030`                | Profile updates, permissions    |
| **Financial**          | `FIN_xxx`                    | Payments, wallets, transactions |
| **Access Control**     | `ACL_001-030`                | Roles, permissions, centers     |
| **Classes & Sessions** | `CLS_001-058`, `SES_001-029` | Scheduling, attendance          |
| **Validation**         | `GEN_002`                    | Form validation errors          |
| **System**             | `SYS_001-005`                | Infrastructure issues           |

**Total: 243 error codes covering all LMS operations**

---

## 🔍 Error Code Quick Lookup

**Most Common Errors:**

- `AUTH_002`: Invalid credentials
- `GEN_002`: Validation failed
- `FIN_PAY_001`: Insufficient funds
- `USR_001`: User not found
- `ACL_030`: Permission denied

**Validation Constraints:**

- `minLength`/`maxLength`: String length limits
- `min`/`max`: Numeric ranges
- `isEmail`: Email format validation
- `isIn`/`isEnum`: Allowed value lists
- `isNotEmpty`: Required fields

---

## 💡 Frontend Best Practices

1. **Always check `error.errorCode`** first
2. **Handle validation errors (`GEN_002`)** with field-specific logic
3. **Use error parameters** to generate dynamic messages
4. **Show user-friendly messages** instead of technical error codes
5. **Handle network errors** separately from API errors

**Example Error Flow:**

```
API Error → Check errorCode → Extract parameters → Generate user message → Show to user
```
