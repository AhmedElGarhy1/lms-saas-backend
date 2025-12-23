# Sessions Module - Detailed Method Summary

## Overview

The Sessions Module manages class sessions in the Learning Management System. Sessions represent individual class meetings that can be either:

- **Scheduled Sessions** (`isExtraSession: false`): System-generated from schedule items, cannot be deleted (only canceled)
- **Extra Sessions** (`isExtraSession: true`): Manually created, can be deleted

---

## Table of Contents

1. [SessionsService](#sessionsservice)
2. [SessionGenerationService](#sessiongenerationservice)
3. [SessionValidationService](#sessionvalidationservice)
4. [SessionsRepository](#sessionsrepository)
5. [SessionsController](#sessionscontroller)
6. [Entity & Enums](#entity--enums)

---

## SessionsService

Main service for session CRUD operations and business logic.

### `createExtraSession(groupId, createSessionDto, actor)`

**Purpose:** Create a manually added extra session (not from schedule).

**Parameters:**

- `groupId: string` - Group ID
- `createSessionDto: CreateSessionDto` - Contains `date` (YYYY-MM-DD), `startTime` (HH:mm), `duration` (minutes), `title` (optional)
- `actor: ActorUser` - User performing the action

**Process:**

1. Fetches group with class to get `teacherUserProfileId`
2. Validates date is in the future
3. Converts date + time to UTC using timezone-aware conversion (`TimezoneService.toUtc`)
4. Calculates `endTime` from `startTime + duration`
5. Validates teacher conflict (no overlapping sessions for same teacher)
6. Validates group conflict (no overlapping sessions in same group)
7. Creates session with `isExtraSession: true` and `status: SCHEDULED`
8. Emits `SessionEvents.CREATED` event

**Returns:** `Promise<Session>`

**Throws:**

- `BusinessLogicException` if date is in the past
- `BusinessLogicException` if teacher/group conflict exists

---

### `updateSession(sessionId, updateSessionDto, actor)`

**Purpose:** Update session title, date, startTime, and duration. Only SCHEDULED sessions can have times changed.

**Parameters:**

- `sessionId: string` - Session ID
- `updateSessionDto: UpdateSessionDto` - Contains `date`, `startTime`, `duration`, `title` (optional)
- `actor: ActorUser` - User performing the action

**Process:**

1. Fetches session and validates it's `SCHEDULED` status
2. Fetches group with class to get `teacherUserProfileId`
3. Validates date is in the future
4. Calculates new `startTime` and `endTime`
5. If time changed, validates teacher and group conflicts (excluding current session)
6. Updates session with new data
7. Emits `SessionEvents.UPDATED` event

**Returns:** `Promise<Session>`

**Throws:**

- `BusinessLogicException` if session is not `SCHEDULED`
- `BusinessLogicException` if date is in the past
- `BusinessLogicException` if teacher/group conflict exists

---

### `updateSessionStatus(sessionId, status, actor)`

**Purpose:** Update session status (SCHEDULED → CONDUCTING → FINISHED, or SCHEDULED → CANCELED).

**Parameters:**

- `sessionId: string` - Session ID
- `status: SessionStatus` - New status
- `actor: ActorUser` - User performing the action

**Process:**

1. Fetches session
2. If status unchanged, returns early
3. If canceling, validates session is `SCHEDULED`
4. Updates session status
5. Emits `SessionEvents.CANCELED` (if canceled) or `SessionEvents.UPDATED` (otherwise)

**Returns:** `Promise<Session>`

**Throws:**

- `BusinessLogicException` if trying to cancel non-SCHEDULED session

---

### `deleteSession(sessionId, actor)`

**Purpose:** Delete a session. Only SCHEDULED extra sessions can be deleted.

**Parameters:**

- `sessionId: string` - Session ID
- `actor: ActorUser` - User performing the action

**Process:**

1. Validates session can be deleted (must be `SCHEDULED` and `isExtraSession: true`)
2. Removes session from database
3. Emits `SessionEvents.DELETED` event

**Returns:** `Promise<void>`

**Throws:**

- `BusinessLogicException` if session is not `SCHEDULED`
- `BusinessLogicException` if session is not an extra session

---

### `paginateSessions(paginateDto, actor)`

**Purpose:** Get paginated list of sessions with filtering and search.

**Parameters:**

- `paginateDto: PaginateSessionsDto` - Pagination and filter parameters (groupId, classId, status, dateFrom, dateTo, search, etc.)
- `actor: ActorUser` - User performing the action

**Process:**

1. Delegates to `SessionsRepository.paginateSessions()`
2. Applies timezone-aware date filtering if `dateFrom`/`dateTo` provided

**Returns:** `Promise<Pagination<Session>>`

---

### `getCalendarSessions(dto, actor)`

**Purpose:** Get sessions formatted for calendar view with nested relations.

**Parameters:**

- `dto: CalendarSessionsDto` - Calendar filters with required `dateFrom` and `dateTo` (YYYY-MM-DD format, max 45 days)
- `actor: ActorUser` - User performing the action

**Process:**

1. Fetches sessions using timezone-aware date range conversion
2. Transforms sessions to calendar format with nested group/class/teacher data
3. Returns formatted response with metadata

**Returns:** `Promise<CalendarSessionsResponseDto>`

**Response Format:**

```typescript
{
  items: [{
    id, title, startTime, endTime, status, groupId, isExtraSession,
    group: { id, name, class: { id, name, teacher: { user: { name } } } }
  }],
  meta: { totalItems, itemsPerPage, totalPages, currentPage }
}
```

---

### `getSession(sessionId, actor)`

**Purpose:** Get a single session by ID.

**Parameters:**

- `sessionId: string` - Session ID
- `actor: ActorUser` - User performing the action

**Process:**

1. Fetches session
2. Validates group belongs to actor's center

**Returns:** `Promise<Session>`

**Throws:**

- `BusinessLogicException` if session not found or doesn't belong to center

---

### `updateSessionsEndTimeForDurationChange(classId, newDuration, actor)`

**Purpose:** Update endTime of future SCHEDULED sessions when class duration changes.

**Parameters:**

- `classId: string` - Class ID
- `newDuration: number` - New duration in minutes
- `actor: ActorUser` - User performing the action

**Process:**

1. Finds all groups for the class
2. For each group:
   - Finds future SCHEDULED sessions (excluding extra sessions)
   - For each session:
     - Calculates new `endTime = startTime + newDuration`
     - Validates teacher conflict (excludes current session)
     - Validates group conflict (excludes current session)
     - If conflict found, emits `CONFLICT_DETECTED` event and skips
     - If no conflict, updates session and emits `UPDATED` event
3. Returns counts of updated and conflicted sessions

**Returns:** `Promise<{ updated: number; conflicts: number }>`

---

### `regenerateSessionsForScheduleItem(scheduleItemId, actor)`

**Purpose:** Regenerate sessions when a schedule item is updated. Deletes future SCHEDULED sessions for the item and regenerates them.

**Parameters:**

- `scheduleItemId: string` - Schedule Item ID
- `actor: ActorUser` - User performing the action

**Process:**

1. Fetches schedule item with group
2. Finds future SCHEDULED sessions for this schedule item (excluding extra sessions)
3. Deletes filtered sessions and emits `BULK_DELETED` event
4. Generates new sessions for 2 months from now (capped to class endDate)
5. Emits `REGENERATED` event with counts

**Returns:** `Promise<void>`

**Note:** Preserves extra sessions (`isExtraSession: true`)

---

### `updateSessionsForScheduleItemsChange(groupId, oldScheduleItems, newScheduleItems, actor)`

**Purpose:** Intelligently update sessions when schedule items change. Compares old vs new and handles added/removed/modified items.

**Parameters:**

- `groupId: string` - Group ID
- `oldScheduleItems: ScheduleItem[]` - Previous schedule items
- `newScheduleItems: ScheduleItem[]` - New schedule items
- `actor: ActorUser` - User performing the action

**Process:**

1. Creates maps of old and new schedule items (keyed by `day-startTime`)
2. **Removed Items:** Deletes future SCHEDULED sessions for removed items
3. **Added Items:** Generates new sessions for added items (2 months ahead, capped to class endDate)
4. **Modified Items:** Updates existing sessions:
   - If day changed: Moves session to new day of week
   - If time changed: Updates startTime/endTime
   - Validates conflicts before updating
5. Returns counts of added, removed, updated, and conflicted sessions

**Returns:** `Promise<{ added: number; removed: number; updated: number; conflicts: number }>`

**Note:** Preserves extra sessions throughout the process

---

### Private Helper Methods

#### `getDatesForDayOfWeek(startDate, endDate, dayOfWeek)`

**Purpose:** Get all dates matching a specific day of week within a date range.

**Returns:** `Date[]`

---

#### `getTimeFromDate(date)`

**Purpose:** Extract time string (HH:mm) from a Date object.

**Returns:** `string` (HH:mm format)

---

#### `getDurationFromSession(session)`

**Purpose:** Calculate duration in minutes from session start and end times.

**Returns:** `number` (minutes)

---

## SessionGenerationService

Service for generating sessions from schedule items.

### `generateSessionsForGroup(groupId, startDate, endDate, actor)`

**Purpose:** Generate sessions for a group within a date range based on schedule items.

**Parameters:**

- `groupId: string` - Group ID
- `startDate: Date` - Start date (inclusive)
- `endDate: Date` - End date (inclusive)
- `actor: ActorUser` - User performing the action

**Process:**

1. Fetches group with class and schedule items
2. Caps `endDate` to class `endDate` if it exists
3. For each schedule item:
   - Gets all dates matching the day of week in the range
   - For each date:
     - Converts date + time to UTC using timezone-aware conversion
     - Calculates `endTime = startTime + duration`
     - Validates teacher conflict (skips if conflict)
     - Checks for duplicates (same groupId + startTime)
     - Adds to creation list
4. Bulk inserts sessions
5. Emits `BULK_CREATED` event

**Returns:** `Promise<Session[]>`

**Note:** Skips sessions with conflicts or duplicates

---

### `generateInitialSessionsForGroup(groupId, actor)`

**Purpose:** Generate initial sessions when a class becomes active (2 months from startDate or now).

**Parameters:**

- `groupId: string` - Group ID
- `actor: ActorUser` - User performing the action

**Process:**

1. Fetches group with class
2. Calculates start date: `max(class.startDate, now)`
3. Calculates end date: `startDate + 2 months` (capped to class endDate)
4. Calls `generateSessionsForGroup()`

**Returns:** `Promise<Session[]>`

---

### `generateBufferSessionsForGroup(groupId, actor)`

**Purpose:** Generate buffer sessions to maintain 4 weeks of future sessions.

**Parameters:**

- `groupId: string` - Group ID
- `actor: ActorUser` - User performing the action

**Process:**

1. Fetches group with class and schedule items
2. Calculates required sessions: `scheduleItems.length * 4` (4 weeks)
3. Checks if enough future sessions exist (within 4 weeks)
4. If not enough, generates sessions from latest session date (or now) to 4 weeks ahead
5. Caps to class endDate if it exists

**Returns:** `Promise<Session[]>`

**Note:** Only generates if buffer is insufficient

---

### Private Helper Methods

#### `getDatesForDayOfWeek(startDate, endDate, dayOfWeek)`

**Purpose:** Get all dates matching a specific day of week within a date range.

**Returns:** `Date[]`

---

## SessionValidationService

Service for validating session operations and conflicts.

### `validateTeacherConflict(teacherUserProfileId, startTime, endTime, excludeSessionId?)`

**Purpose:** Check if a teacher has overlapping sessions at the given time.

**Parameters:**

- `teacherUserProfileId: string` - Teacher's user profile ID
- `startTime: Date` - Session start time
- `endTime: Date` - Session end time
- `excludeSessionId?: string` - Optional session ID to exclude (for updates)

**Process:**

1. Queries for overlapping sessions via teacher's groups
2. Returns conflict data if found, null otherwise

**Returns:** `Promise<{ sessionId, startTime, endTime } | null>`

**Conflict Detection:** Uses overlap logic: `session.startTime < endTime AND session.endTime > startTime`

---

### `validateGroupConflict(groupId, startTime, endTime, excludeSessionId?)`

**Purpose:** Check if a group has overlapping sessions at the given time.

**Parameters:**

- `groupId: string` - Group ID
- `startTime: Date` - Session start time
- `endTime: Date` - Session end time
- `excludeSessionId?: string` - Optional session ID to exclude (for updates)

**Process:**

1. Queries for overlapping sessions in the group
2. Returns conflict data if found, null otherwise

**Returns:** `Promise<{ sessionId, startTime, endTime } | null>`

---

### `validateSessionDeletion(sessionId)`

**Purpose:** Validate if a session can be deleted.

**Parameters:**

- `sessionId: string` - Session ID

**Process:**

1. Fetches session
2. Validates status is `SCHEDULED`
3. Validates `isExtraSession: true`

**Throws:**

- `BusinessLogicException` if session is not `SCHEDULED`
- `BusinessLogicException` if session is not an extra session

**TODO:** Check for payments/attendance before deletion

---

### `validateSessionCancellation(sessionId)`

**Purpose:** Validate if a session can be canceled.

**Parameters:**

- `sessionId: string` - Session ID

**Process:**

1. Fetches session
2. Validates status is `SCHEDULED`

**Throws:**

- `BusinessLogicException` if session is not `SCHEDULED`

---

## SessionsRepository

Repository for database operations on sessions.

### `findSessions(filters, relations?)` (Private)

**Purpose:** Generic method to find sessions with flexible filters.

**Parameters:**

- `filters` - Filter criteria (groupId, scheduleItemId, status, startTimeFrom, startTimeTo, startTimeAfter, excludeSessionId)
- `relations?: string[]` - Optional relations to load

**Returns:** `Promise<Session[]>`

---

### `findOverlappingSessionsByGroup(groupId, startTime, endTime, excludeSessionId?)`

**Purpose:** Find overlapping sessions within a group.

**Parameters:**

- `groupId: string` - Group ID
- `startTime: Date` - Session start time
- `endTime: Date` - Session end time
- `excludeSessionId?: string` - Optional session ID to exclude

**Returns:** `Promise<Session[]>`

**Query:** `session.startTime < endTime AND session.endTime > startTime`

---

### `findOverlappingSessions(teacherUserProfileId, startTime, endTime, excludeSessionId?)`

**Purpose:** Find overlapping sessions for a teacher (via their groups).

**Parameters:**

- `teacherUserProfileId: string` - Teacher's user profile ID
- `startTime: Date` - Session start time
- `endTime: Date` - Session end time
- `excludeSessionId?: string` - Optional session ID to exclude

**Returns:** `Promise<Session[]>`

---

### `findByGroupId(groupId, filters?)`

**Purpose:** Find sessions by group ID with optional time filters.

**Parameters:**

- `groupId: string` - Group ID
- `filters?: { startTimeFrom?, startTimeTo? }` - Optional time filters

**Returns:** `Promise<Session[]>`

---

### `findFutureScheduledSessionsByGroup(groupId)`

**Purpose:** Find future SCHEDULED sessions for a group (excluding extra sessions).

**Parameters:**

- `groupId: string` - Group ID

**Returns:** `Promise<Session[]>` - Only scheduled sessions (`isExtraSession: false`)

---

### `findFutureScheduledSessionsByScheduleItem(scheduleItemId)`

**Purpose:** Find future SCHEDULED sessions for a schedule item (excluding extra sessions).

**Parameters:**

- `scheduleItemId: string` - Schedule Item ID

**Returns:** `Promise<Session[]>` - Only scheduled sessions (`isExtraSession: false`)

---

### `paginateSessions(paginateDto, actor)`

**Purpose:** Paginate sessions with filtering, search, and sorting.

**Parameters:**

- `paginateDto: PaginateSessionsDto` - Pagination and filter parameters
- `actor: ActorUser` - User performing the action

**Process:**

1. Builds query with timezone-aware date filtering
2. Applies filters (groupId, classId, status, dateFrom, dateTo)
3. Applies search on title
4. Applies sorting and pagination

**Returns:** `Promise<Pagination<Session>>`

---

### `getCalendarSessions(dto, actor)`

**Purpose:** Get sessions for calendar view with timezone-aware date range filtering.

**Parameters:**

- `dto: CalendarSessionsDto` - Calendar filters with required dateFrom/dateTo
- `actor: ActorUser` - User performing the action

**Process:**

1. Converts dateFrom/dateTo to UTC range using center timezone
2. Loads nested relations (group, class, teacher, user)
3. Applies filters and returns sessions

**Returns:** `Promise<Session[]>` - With nested relations loaded

---

### `countCalendarSessions(dto, actor)`

**Purpose:** Count sessions for calendar view (for pagination metadata).

**Parameters:**

- `dto: CalendarSessionsDto` - Calendar filters
- `actor: ActorUser` - User performing the action

**Returns:** `Promise<number>`

---

### `bulkInsert(sessions)`

**Purpose:** Bulk insert sessions (used for session generation).

**Parameters:**

- `sessions: Partial<Session>[]` - Array of session data

**Returns:** `Promise<Session[]>` - Created sessions with IDs

**Note:** Automatically sets `createdBy` from RequestContext

---

### Standard Repository Methods (from BaseRepository)

- `findOneOrThrow(id)` - Find session by ID or throw
- `updateThrow(id, data)` - Update session or throw
- `remove(id)` - Delete session
- `create(data)` - Create single session
- `findMany(options)` - Find multiple sessions

---

## SessionsController

REST API controller for session endpoints.

### `POST /sessions`

**Endpoint:** `POST /sessions`

**Purpose:** Create an extra/manual session

**Request Body:** `CreateSessionDto`

```typescript
{
  groupId: string;
  date: string;        // YYYY-MM-DD
  startTime: string;   // HH:mm
  duration: number;    // minutes
  title?: string;
}
```

**Response:** `SessionResponseDto`

**Permissions:** `PERMISSIONS.SESSIONS.CREATE`

**Calls:** `SessionsService.createExtraSession()`

---

### `GET /sessions/calendar`

**Endpoint:** `GET /sessions/calendar`

**Purpose:** Get sessions for calendar view

**Query Parameters:** `CalendarSessionsDto`

```typescript
{
  dateFrom: string;    // YYYY-MM-DD (required)
  dateTo: string;      // YYYY-MM-DD (required, max 45 days)
  groupId?: string;
  classId?: string;
  status?: SessionStatus;
}
```

**Response:** `CalendarSessionsResponseDto`

**Permissions:** `PERMISSIONS.SESSIONS.READ`

**Calls:** `SessionsService.getCalendarSessions()`

---

### `GET /sessions`

**Endpoint:** `GET /sessions`

**Purpose:** Paginate sessions with filtering

**Query Parameters:** `PaginateSessionsDto`

```typescript
{
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  groupId?: string;
  classId?: string;
  status?: SessionStatus;
  dateFrom?: string;   // YYYY-MM-DD
  dateTo?: string;      // YYYY-MM-DD
}
```

**Response:** `Pagination<SessionResponseDto>`

**Permissions:** `PERMISSIONS.SESSIONS.READ`

**Calls:** `SessionsService.paginateSessions()`

---

### `GET /sessions/:sessionId`

**Endpoint:** `GET /sessions/:sessionId`

**Purpose:** Get a specific session

**Path Parameters:** `SessionIdParamDto`

```typescript
{
  sessionId: string;
}
```

**Response:** `SessionResponseDto`

**Permissions:** `PERMISSIONS.SESSIONS.READ`

**Calls:** `SessionsService.getSession()`

---

### `PUT /sessions/:sessionId`

**Endpoint:** `PUT /sessions/:sessionId`

**Purpose:** Update a session (title, date, time, duration)

**Path Parameters:** `SessionIdParamDto`
**Request Body:** `UpdateSessionDto`

```typescript
{
  date: string;        // YYYY-MM-DD
  startTime: string;   // HH:mm
  duration: number;    // minutes
  title?: string;
}
```

**Response:** `SessionResponseDto`

**Permissions:** `PERMISSIONS.SESSIONS.UPDATE`

**Calls:** `SessionsService.updateSession()`

**Note:** Only SCHEDULED sessions can have times changed

---

### `PATCH /sessions/:sessionId/status`

**Endpoint:** `PATCH /sessions/:sessionId/status`

**Purpose:** Update session status

**Path Parameters:** `SessionIdParamDto`
**Request Body:** `UpdateSessionStatusDto`

```typescript
{
  status: SessionStatus; // SCHEDULED | CONDUCTING | FINISHED | CANCELED
}
```

**Response:** `SessionResponseDto`

**Permissions:** `PERMISSIONS.SESSIONS.UPDATE`

**Calls:** `SessionsService.updateSessionStatus()`

---

### `DELETE /sessions/:sessionId`

**Endpoint:** `DELETE /sessions/:sessionId`

**Purpose:** Delete a session

**Path Parameters:** `SessionIdParamDto`

**Response:** Success message

**Permissions:** `PERMISSIONS.SESSIONS.DELETE`

**Calls:** `SessionsService.deleteSession()`

**Note:** Only extra sessions can be deleted

---

## Entity & Enums

### Session Entity

```typescript
{
  id: string;                    // UUID
  groupId: string;              // UUID
  scheduleItemId?: string;      // UUID (null for extra sessions)
  title?: string;                // Optional title
  startTime: Date;               // UTC timestamp
  endTime: Date;                 // UTC timestamp
  status: SessionStatus;          // SCHEDULED | CONDUCTING | FINISHED | CANCELED
  isExtraSession: boolean;       // true for manual sessions
  createdAt: Date;                // Auto-generated
  updatedAt: Date;                // Auto-generated
  createdBy: string;              // UUID (from RequestContext)
  updatedBy?: string;             // UUID (from RequestContext)

  // Relations
  group: Group;
  scheduleItem?: ScheduleItem;
}
```

**Indexes:**

- `groupId`
- `scheduleItemId`
- `startTime`
- `status`
- `groupId + status`
- `groupId + startTime` (unique) - Prevents exact duplicate start times
- `groupId + tsrange(startTime, endTime)` (exclusion constraint) - Prevents overlapping time ranges for non-CANCELED sessions

---

### SessionStatus Enum

```typescript
enum SessionStatus {
  SCHEDULED = 'SCHEDULED', // Initial state, can be updated/canceled
  CONDUCTING = 'CONDUCTING', // Session is in progress
  FINISHED = 'FINISHED', // Session completed
  CANCELED = 'CANCELED', // Session was canceled
}
```

**Status Transitions:**

- `SCHEDULED` → `CONDUCTING` → `FINISHED`
- `SCHEDULED` → `CANCELED`

---

## Key Features

### 1. Timezone-Aware Date Handling

- All date-only fields (YYYY-MM-DD) are converted to UTC using center timezone
- Session times are stored in UTC but interpreted in center timezone
- Date range queries use timezone-aware conversion with exclusive upper bounds

### 2. Conflict Detection

- **Teacher Conflicts:** Prevents overlapping sessions for the same teacher
- **Group Conflicts:** Prevents overlapping sessions in the same group
- **Service-Level Validation:** Conflicts are detected before creation/update and events are emitted
- **Database-Level Protection:** PostgreSQL exclusion constraint (`IDX_sessions_groupId_timeRange_exclusion`) prevents overlapping sessions in the same group, even in high-concurrency scenarios where two admins save at the exact same millisecond. This acts as the final gatekeeper for "Double Booking" prevention.

### 3. Session Types

- **Scheduled Sessions** (`isExtraSession: false`): System-generated, cannot be deleted
- **Extra Sessions** (`isExtraSession: true`): Manually created, can be deleted

### 4. Event-Driven Architecture

Events emitted:

- `CREATED` - Session created
- `UPDATED` - Session updated
- `DELETED` - Session deleted
- `CANCELED` - Session canceled
- `BULK_CREATED` - Multiple sessions created
- `BULK_DELETED` - Multiple sessions deleted
- `REGENERATED` - Sessions regenerated for schedule item
- `CONFLICT_DETECTED` - Conflict detected during operation

### 5. Intelligent Session Management

- **Duration Changes:** Updates future sessions when class duration changes
- **Schedule Changes:** Intelligently handles added/removed/modified schedule items
- **Buffer Generation:** Maintains 4 weeks of future sessions
- **Regeneration:** Regenerates sessions when schedule items are updated

---

## Important Notes

1. **Date Format:** Always use YYYY-MM-DD format for date-only fields
2. **Timezone:** All dates are stored in UTC but interpreted in center timezone
3. **Extra Sessions:** Only extra sessions can be deleted; scheduled sessions must be canceled
4. **Status Restrictions:** Only SCHEDULED sessions can have times changed or be canceled
5. **Conflict Prevention:** All operations validate conflicts before execution
6. **Preservation:** Extra sessions are preserved during regeneration and schedule updates
7. **Database-Level Protection:** PostgreSQL exclusion constraint prevents overlapping sessions even in high-concurrency scenarios (race condition protection)

---

## TODO Items

- [ ] Check for payments before session deletion
- [ ] Check for attendance before session deletion
- [ ] Filter out sessions with payments/attendance during regeneration
