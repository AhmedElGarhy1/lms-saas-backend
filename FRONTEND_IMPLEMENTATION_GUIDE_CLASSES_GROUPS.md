# Frontend Implementation Guide: Classes & Groups Module

## Overview

This guide provides complete API documentation for implementing the **Classes** and **Groups** modules in the frontend. Both modules are center-scoped and use the authenticated user's `centerId` automatically (no need to send it in requests).

---

## Table of Contents

1. [Classes Module](#classes-module)
2. [Groups Module](#groups-module)
3. [Enums & Constants](#enums--constants)
4. [Data Models](#data-models)
5. [Validation Rules](#validation-rules)
6. [Business Logic Rules](#business-logic-rules)
7. [Permissions](#permissions)

---

## Classes Module

### Base URL

```
/classes
```

### Endpoints

#### 1. List Classes (Paginated)

**GET** `/classes`

**Query Parameters:**

```typescript
{
  page?: number;           // Default: 1
  limit?: number;          // Default: 10, Max: 100
  search?: string;         // Search by name
  sortBy?: string;         // 'name' | 'startDate' | 'endDate' | 'createdAt' | 'updatedAt'
  sortOrder?: 'ASC' | 'DESC'; // Default: 'DESC'
  branchId?: string;       // Filter by branch (UUID)
  levelId?: string;        // Filter by level (UUID)
  subjectId?: string;      // Filter by subject (UUID)
  teacherUserProfileId?: string; // Filter by teacher (UUID)
}
```

**Response:**

```typescript
{
  success: true;
  message: { key: string; args?: object };
  data: {
    items: Class[];
    meta: {
      currentPage: number;
      itemCount: number;
      itemsPerPage: number;
      totalItems: number;
      totalPages: number;
    };
  };
}
```

**Permission Required:** `CLASSES.READ`

---

#### 2. Get Single Class

**GET** `/classes/:classId`

**Path Parameters:**

- `classId` (UUID) - Class ID

**Response:**

```typescript
{
  success: true;
  message: { key: string; args?: object };
  data: Class;
}
```

**Permission Required:** `CLASSES.READ`

---

#### 3. Create Class

**POST** `/classes`

**Request Body:**

```typescript
{
  name?: string;                    // Optional, max 255 chars
  levelId: string;                  // UUID, required
  subjectId: string;                // UUID, required
  teacherUserProfileId: string;     // UUID, required (must be TEACHER profile)
  branchId: string;                 // UUID, required
  studentPaymentStrategy: {
    per: 'session' | 'hour' | 'month' | 'class';
    count?: number;                 // Required if per is session/hour/month, ignored for class
    amount: number;                 // Min: 0
  };
  teacherPaymentStrategy: {
    per: 'student' | 'hour' | 'session' | 'month' | 'class';
    amount: number;                 // Min: 0
  };
  startDate: string;                // ISO 8601 date string, required
  endDate?: string;                  // ISO 8601 date string, optional (must be after startDate)
}
```

**Example:**

```json
{
  "name": "Math Primary 3",
  "levelId": "123e4567-e89b-12d3-a456-426614174000",
  "subjectId": "123e4567-e89b-12d3-a456-426614174001",
  "teacherUserProfileId": "123e4567-e89b-12d3-a456-426614174002",
  "branchId": "123e4567-e89b-12d3-a456-426614174003",
  "studentPaymentStrategy": {
    "per": "session",
    "count": 10,
    "amount": 500
  },
  "teacherPaymentStrategy": {
    "per": "student",
    "amount": 100
  },
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z"
}
```

**Response:**

```typescript
{
  success: true;
  message: { key: string; args?: object };
  data: Class;
}
```

**Permission Required:** `CLASSES.CREATE`

**Validation Rules:**

- Teacher profile must exist and be of type `TEACHER`
- Teacher profile must be active
- Teacher must have access to the center
- Level, Subject, Branch must belong to the same center
- `startDate` must be before `endDate` (if provided)
- Payment strategies must be valid (see [Payment Strategies](#payment-strategies))

---

#### 4. Update Class

**PUT** `/classes/:classId`

**Path Parameters:**

- `classId` (UUID) - Class ID

**Request Body:** (All fields optional, same structure as Create)

**Response:**

```typescript
{
  success: true;
  message: { key: string; args?: object };
  data: Class;
}
```

**Permission Required:** `CLASSES.UPDATE`

---

#### 5. Delete Class

**DELETE** `/classes/:classId`

**Path Parameters:**

- `classId` (UUID) - Class ID

**Response:**

```typescript
{
  success: true;
  message: { key: string; args?: object };
}
```

**Permission Required:** `CLASSES.DELETE`

**Note:** Soft delete - can be restored

---

#### 6. Restore Class

**PATCH** `/classes/:classId/restore`

**Path Parameters:**

- `classId` (UUID) - Class ID

**Response:**

```typescript
{
  success: true;
  message: { key: string; args?: object };
  data: Class;
}
```

**Permission Required:** `CLASSES.RESTORE`

---

### Classes Actions Endpoints

#### 7. Bulk Delete Classes

**POST** `/classes/actions/bulk/delete`

**Request Body:**

```typescript
{
  classIds: string[]; // Array of UUIDs
}
```

**Response:**

```typescript
{
  success: true;
  message: { key: string; args?: object };
  data: {
    successCount: number;
    failureCount: number;
    results: Array<{
      id: string;
      success: boolean;
      error?: string;
    }>;
  };
}
```

**Permission Required:** `CLASSES.DELETE`

---

#### 8. Bulk Restore Classes

**POST** `/classes/actions/bulk/restore`

**Request Body:**

```typescript
{
  classIds: string[]; // Array of UUIDs
}
```

**Response:** Same as bulk delete

**Permission Required:** `CLASSES.RESTORE`

---

#### 9. Export Classes

**GET** `/classes/actions/export`

**Query Parameters:**

```typescript
{
  format: 'csv' | 'xlsx' | 'json';  // Required
  filename?: string;                 // Optional, default: 'classes'
  // All pagination and filter params from List Classes endpoint
}
```

**Response:** File download (CSV/XLSX) or JSON response

**Permission Required:** `CLASSES.EXPORT`

---

## Groups Module

### Base URL

```
/groups
```

### Endpoints

#### 1. List Groups (Paginated)

**GET** `/groups`

**Query Parameters:**

```typescript
{
  page?: number;           // Default: 1
  limit?: number;          // Default: 10, Max: 100
  search?: string;         // Search by name
  sortBy?: string;         // 'name' | 'createdAt' | 'updatedAt'
  sortOrder?: 'ASC' | 'DESC'; // Default: 'DESC'
  classId?: string;        // Filter by class (UUID)
  branchId?: string;       // Filter by branch (UUID)
}
```

**Response:**

```typescript
{
  success: true;
  message: { key: string; args?: object };
  data: {
    items: Group[];
    meta: PaginationMeta;
  };
}
```

**Permission Required:** `GROUPS.READ`

---

#### 2. Get Single Group

**GET** `/groups/:groupId`

**Path Parameters:**

- `groupId` (UUID) - Group ID

**Response:**

```typescript
{
  success: true;
  message: { key: string; args?: object };
  data: Group;
}
```

**Permission Required:** `GROUPS.READ`

---

#### 3. Create Group

**POST** `/groups`

**Request Body:**

```typescript
{
  classId: string;                    // UUID, required
  name?: string;                      // Optional, max 255 chars
  scheduleItems: Array<{               // Required, min 1 item
    day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
    startTime: string;                 // HH:mm format (24-hour)
    endTime: string;                   // HH:mm format (24-hour)
  }>;
  studentUserProfileIds: string[];     // Array of UUIDs, required
}
```

**Example:**

```json
{
  "classId": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Saturday 5PM Batch",
  "scheduleItems": [
    {
      "day": "Sat",
      "startTime": "17:00",
      "endTime": "18:00"
    }
  ],
  "studentUserProfileIds": [
    "123e4567-e89b-12d3-a456-426614174001",
    "123e4567-e89b-12d3-a456-426614174002"
  ]
}
```

**Response:**

```typescript
{
  success: true;
  message: { key: string; args?: object };
  data: Group;
}
```

**Permission Required:** `GROUPS.CREATE`

**Validation Rules:**

- Class must exist and belong to center
- Schedule items must have valid format (HH:mm, 24-hour)
- `startTime` must be before `endTime`
- No overlapping time slots on the same day
- Students must exist, be of type `STUDENT`, and have center access
- No duplicate student IDs
- Teacher schedule conflicts are checked (prevents overlapping schedules)

---

#### 4. Update Group

**PUT** `/groups/:groupId`

**Path Parameters:**

- `groupId` (UUID) - Group ID

**Request Body:** (All fields optional)

```typescript
{
  name?: string;
  scheduleItems?: Array<ScheduleItem>;  // Replaces all existing schedule items
  studentUserProfileIds?: string[];     // Replaces all existing students
}
```

**Response:**

```typescript
{
  success: true;
  message: { key: string; args?: object };
  data: Group;
}
```

**Permission Required:** `GROUPS.UPDATE`

---

#### 5. Delete Group

**DELETE** `/groups/:groupId`

**Path Parameters:**

- `groupId` (UUID) - Group ID

**Response:**

```typescript
{
  success: true;
  message: { key: string; args?: object };
}
```

**Permission Required:** `GROUPS.DELETE`

---

#### 6. Restore Group

**PATCH** `/groups/:groupId/restore`

**Path Parameters:**

- `groupId` (UUID) - Group ID

**Response:**

```typescript
{
  success: true;
  message: { key: string; args?: object };
  data: Group;
}
```

**Permission Required:** `GROUPS.RESTORE`

---

#### 7. Add Students to Group

**POST** `/groups/:groupId/students`

**Path Parameters:**

- `groupId` (UUID) - Group ID

**Request Body:**

```typescript
{
  studentUserProfileIds: string[]; // Array of UUIDs
}
```

**Response:**

```typescript
{
  success: true;
  message: { key: string; args?: object };
}
```

**Permission Required:** `GROUPS.UPDATE`

**Note:** Only adds new students (duplicates are automatically skipped)

---

#### 8. Remove Students from Group

**DELETE** `/groups/:groupId/students`

**Path Parameters:**

- `groupId` (UUID) - Group ID

**Request Body:**

```typescript
{
  studentUserProfileIds: string[]; // Array of UUIDs
}
```

**Response:**

```typescript
{
  success: true;
  message: { key: string; args?: object };
}
```

**Permission Required:** `GROUPS.UPDATE`

---

### Groups Actions Endpoints

#### 9. Bulk Delete Groups

**POST** `/groups/actions/bulk/delete`

**Request Body:**

```typescript
{
  groupIds: string[]; // Array of UUIDs
}
```

**Response:** Same as classes bulk delete

**Permission Required:** `GROUPS.DELETE`

---

#### 10. Bulk Restore Groups

**POST** `/groups/actions/bulk/restore`

**Request Body:**

```typescript
{
  groupIds: string[]; // Array of UUIDs
}
```

**Response:** Same as classes bulk restore

**Permission Required:** `GROUPS.RESTORE`

---

#### 11. Export Groups

**GET** `/groups/actions/export`

**Query Parameters:**

```typescript
{
  format: 'csv' | 'xlsx' | 'json';  // Required
  filename?: string;                 // Optional, default: 'groups'
  // All pagination and filter params from List Groups endpoint
}
```

**Response:** File download (CSV/XLSX) or JSON response

**Permission Required:** `GROUPS.READ`

---

## Enums & Constants

### Day of Week

```typescript
enum DayOfWeek {
  MON = 'Mon',
  TUE = 'Tue',
  WED = 'Wed',
  THU = 'Thu',
  FRI = 'Fri',
  SAT = 'Sat',
  SUN = 'Sun',
}
```

### Student Payment Unit

```typescript
enum StudentPaymentUnit {
  SESSION = 'session', // Requires 'count' field
  HOUR = 'hour', // Requires 'count' field
  MONTH = 'month', // Requires 'count' field
  CLASS = 'class', // 'count' is ignored
}
```

### Teacher Payment Unit

```typescript
enum TeacherPaymentUnit {
  STUDENT = 'student', // Amount per student
  HOUR = 'hour', // Amount per hour
  SESSION = 'session', // Amount per session
  MONTH = 'month', // Amount per month
  CLASS = 'class', // Total amount for full class period
}
```

---

## Data Models

### Class

```typescript
interface Class {
  id: string;
  name?: string;
  levelId: string;
  subjectId: string;
  teacherUserProfileId: string;
  branchId: string;
  centerId: string; // Auto-set from actor
  studentPaymentStrategy: {
    per: StudentPaymentUnit;
    count?: number;
    amount: number;
  };
  teacherPaymentStrategy: {
    per: TeacherPaymentUnit;
    amount: number;
  };
  startDate: string; // ISO 8601
  endDate?: string; // ISO 8601
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  deletedAt?: string; // ISO 8601 (if soft deleted)

  // Relations (may be included in response)
  level?: Level;
  subject?: Subject;
  teacher?: UserProfile;
  branch?: Branch;
  center?: Center;
  groups?: Group[];
}
```

### Group

```typescript
interface Group {
  id: string;
  classId: string;
  branchId: string; // Denormalized from class
  centerId: string; // Denormalized from class
  name?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  deletedAt?: string; // ISO 8601 (if soft deleted)

  // Relations (may be included in response)
  class?: Class;
  branch?: Branch;
  center?: Center;
  scheduleItems?: ScheduleItem[];
  groupStudents?: Array<{
    id: string;
    groupId: string;
    studentUserProfileId: string;
    student?: UserProfile;
  }>;
}
```

### ScheduleItem

```typescript
interface ScheduleItem {
  id: string;
  groupId: string;
  day: DayOfWeek;
  startTime: string; // HH:mm format (24-hour)
  endTime: string; // HH:mm format (24-hour)
  createdAt: string;
  updatedAt: string;
}
```

---

## Validation Rules

### Schedule Items

1. **Time Format:** Must be `HH:mm` (24-hour format)
   - Valid: `"17:00"`, `"09:30"`, `"23:59"`
   - Invalid: `"5:00 PM"`, `"9:30"`, `"25:00"`

2. **Time Logic:** `startTime` must be before `endTime`
   - Valid: `startTime: "17:00"`, `endTime: "18:00"`
   - Invalid: `startTime: "18:00"`, `endTime: "17:00"`

3. **No Overlaps:** Cannot have overlapping time slots on the same day
   - Invalid: Same day with `17:00-18:00` and `17:30-18:30`

4. **Minimum:** At least 1 schedule item required

### Payment Strategies

#### Student Payment Strategy

- **SESSION/HOUR/MONTH:** `count` is **required** and must be ≥ 1
- **CLASS:** `count` is **ignored** (not required)
- **amount:** Always required, must be ≥ 0

**Examples:**

```typescript
// Valid
{ per: 'session', count: 10, amount: 500 }  // 10 sessions for 500
{ per: 'hour', count: 20, amount: 1000 }     // 20 hours for 1000
{ per: 'month', count: 3, amount: 1500 }     // 3 months for 1500
{ per: 'class', amount: 5000 }               // Full class for 5000 (count ignored)

// Invalid
{ per: 'session', amount: 500 }               // Missing count
{ per: 'session', count: 0, amount: 500 }     // Count must be ≥ 1
{ per: 'class', count: 10, amount: 5000 }     // Count is ignored but can be sent
```

#### Teacher Payment Strategy

- **All units:** `amount` is required, must be ≥ 0
- **No count field:** Teachers don't use count

**Examples:**

```typescript
// Valid
{ per: 'student', amount: 100 }    // 100 per student
{ per: 'hour', amount: 50 }        // 50 per hour
{ per: 'session', amount: 200 }    // 200 per session
{ per: 'month', amount: 5000 }     // 5000 per month
{ per: 'class', amount: 10000 }   // 10000 for full class
```

### Dates

- **startDate:** Required, ISO 8601 format
- **endDate:** Optional, but if provided must be after `startDate`

---

## Business Logic Rules

### Classes

1. **Teacher Validation:**
   - Teacher profile must exist
   - Teacher profile type must be `TEACHER`
   - Teacher profile must be **active**
   - Teacher must have access to the center

2. **Related Entities:**
   - Level, Subject, Branch must belong to the same center
   - All validations happen automatically (no need to check in frontend)

3. **Date Validation:**
   - `startDate` must be before `endDate` (if provided)

### Groups

1. **Class Validation:**
   - Class must exist and belong to center
   - Class must not have ended (if `endDate` is set)

2. **Schedule Validation:**
   - No overlapping time slots on the same day
   - Schedule items must be within class date range (if class has end date)
   - Teacher schedule conflicts are automatically checked (prevents teacher from having overlapping schedules across different groups)

3. **Student Validation:**
   - All students must exist
   - All students must be of type `STUDENT`
   - All students must have access to the center
   - No duplicate student IDs in the same group

4. **Student Assignment:**
   - When updating `studentUserProfileIds`, it **replaces** all existing students
   - Use dedicated endpoints (`POST /groups/:groupId/students` or `DELETE /groups/:groupId/students`) to add/remove individual students

---

## Permissions

### Classes Permissions

- `CLASSES.READ` - View classes
- `CLASSES.CREATE` - Create classes
- `CLASSES.UPDATE` - Update classes
- `CLASSES.DELETE` - Delete classes
- `CLASSES.RESTORE` - Restore deleted classes
- `CLASSES.EXPORT` - Export classes data

### Groups Permissions

- `GROUPS.READ` - View groups
- `GROUPS.CREATE` - Create groups
- `GROUPS.UPDATE` - Update groups (includes add/remove students)
- `GROUPS.DELETE` - Delete groups
- `GROUPS.RESTORE` - Restore deleted groups

---

## Error Responses

All endpoints follow the standard error response format:

```typescript
{
  success: false;
  message: {
    key: string;        // Translation key
    args?: object;      // Translation arguments
  };
  error?: string;       // Additional error details
}
```

### Common Error Scenarios

1. **Validation Failed (400):**
   - Invalid date format
   - Invalid time format
   - Overlapping schedule items
   - Missing required fields
   - Invalid payment strategy

2. **Not Found (404):**
   - Class/Group doesn't exist
   - Level/Subject/Branch doesn't exist
   - Teacher/Student profile doesn't exist

3. **Business Logic Error (400):**
   - Teacher profile is inactive
   - Teacher schedule conflict
   - Class has ended
   - Duplicate student assignment

4. **Permission Denied (403):**
   - User doesn't have required permission
   - User doesn't have access to center

---

## Important Notes

1. **Center ID:** Never send `centerId` in requests. It's automatically set from the authenticated user's context.

2. **Soft Delete:** Deleted classes/groups can be restored. Use the restore endpoints or bulk restore.

3. **Schedule Updates:** When updating `scheduleItems`, it **replaces** all existing schedule items (not merged).

4. **Student Updates:** When updating `studentUserProfileIds`, it **replaces** all existing students (not merged). Use dedicated add/remove endpoints for incremental changes.

5. **Teacher Schedule Conflicts:** The backend automatically prevents teachers from having overlapping schedules across different groups. If a conflict is detected, the request will fail with a validation error.

6. **Pagination:** All list endpoints support pagination with search and sorting. Default page size is 10, maximum is 100.

7. **Export:** Export endpoints return files directly (CSV/XLSX) or JSON. Handle the response accordingly based on format.

---

## Example Frontend Flow

### Creating a Class with Groups

```typescript
// Step 1: Create Class
const classData = {
  name: 'Math Primary 3',
  levelId: selectedLevelId,
  subjectId: selectedSubjectId,
  teacherUserProfileId: selectedTeacherId,
  branchId: selectedBranchId,
  studentPaymentStrategy: {
    per: 'session',
    count: 10,
    amount: 500,
  },
  teacherPaymentStrategy: {
    per: 'student',
    amount: 100,
  },
  startDate: '2024-01-01T00:00:00Z',
  endDate: '2024-12-31T23:59:59Z',
};

const createdClass = await api.post('/classes', classData);

// Step 2: Create Groups for the Class
const groupData = {
  classId: createdClass.data.id,
  name: 'Saturday 5PM Batch',
  scheduleItems: [{ day: 'Sat', startTime: '17:00', endTime: '18:00' }],
  studentUserProfileIds: selectedStudentIds,
};

const createdGroup = await api.post('/groups', groupData);

// Step 3: Add More Students Later (if needed)
await api.post(`/groups/${createdGroup.data.id}/students`, {
  studentUserProfileIds: additionalStudentIds,
});
```

---

## TypeScript Type Definitions

```typescript
// Enums
type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
type StudentPaymentUnit = 'session' | 'hour' | 'month' | 'class';
type TeacherPaymentUnit = 'student' | 'hour' | 'session' | 'month' | 'class';
type ExportFormat = 'csv' | 'xlsx' | 'json';

// DTOs
interface CreateClassDto {
  name?: string;
  levelId: string;
  subjectId: string;
  teacherUserProfileId: string;
  branchId: string;
  studentPaymentStrategy: StudentPaymentStrategy;
  teacherPaymentStrategy: TeacherPaymentStrategy;
  startDate: string; // ISO 8601
  endDate?: string; // ISO 8601
}

interface UpdateClassDto extends Partial<CreateClassDto> {}

interface CreateGroupDto {
  classId: string;
  name?: string;
  scheduleItems: ScheduleItemDto[];
  studentUserProfileIds: string[];
}

interface UpdateGroupDto {
  name?: string;
  scheduleItems?: ScheduleItemDto[];
  studentUserProfileIds?: string[];
}

interface ScheduleItemDto {
  day: DayOfWeek;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

interface StudentPaymentStrategy {
  per: StudentPaymentUnit;
  count?: number; // Required for session/hour/month
  amount: number;
}

interface TeacherPaymentStrategy {
  per: TeacherPaymentUnit;
  amount: number;
}

// Response Types
interface Class extends CreateClassDto {
  id: string;
  centerId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

interface Group {
  id: string;
  classId: string;
  branchId: string;
  centerId: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  scheduleItems?: ScheduleItem[];
  groupStudents?: GroupStudent[];
}

interface ScheduleItem {
  id: string;
  groupId: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## Testing Checklist

- [ ] Create class with all required fields
- [ ] Create class with optional name
- [ ] Create class with different payment strategies
- [ ] Update class fields individually
- [ ] Delete and restore class
- [ ] Bulk delete/restore classes
- [ ] Export classes in all formats
- [ ] Create group with schedule items
- [ ] Create group with multiple schedule items (same day, different days)
- [ ] Validate schedule overlap prevention
- [ ] Add/remove students from group
- [ ] Update group schedule (replaces all)
- [ ] Update group students (replaces all)
- [ ] Delete and restore group
- [ ] Bulk delete/restore groups
- [ ] Export groups in all formats
- [ ] Test teacher schedule conflict detection
- [ ] Test validation errors (invalid dates, times, etc.)
- [ ] Test permission errors

---

**Last Updated:** 2024-12-04
**API Version:** 1.0
