# SessionsService - Comprehensive Documentation

## Overview

`SessionsService` is the core business logic service for managing sessions in the LMS. It handles creation, updates, deletion, status management, and intelligent synchronization with schedule items. All operations are timezone-aware, using the center's timezone from `RequestContext`.

**Location:** `src/modules/sessions/services/sessions.service.ts`

**Key Features:**
- Timezone-aware date/time handling using `TimezoneService`
- Conflict detection (teacher and group overlaps)
- Intelligent session updates when schedule items change
- Transactional operations for data consistency
- Event-driven architecture for activity logging and notifications

---

## Dependencies

### Injected Services

1. **`SessionsRepository`** - Data access layer for Session entities
2. **`SessionValidationService`** - Validates conflicts, deletion rules, cancellation rules
3. **`SessionGenerationService`** - Generates sessions from schedule items
4. **`TypeSafeEventEmitter`** - Emits events for activity logging and notifications
5. **`GroupsRepository`** - Access to Group entities and relations
6. **`ScheduleItemsRepository`** - Access to ScheduleItem entities

---

## Public Methods

### 1. `createExtraSession()`

**Purpose:** Creates a manual/extra session that is not tied to a schedule item. Used for one-off sessions, makeup classes, or special events.

**Signature:**
```typescript
@Transactional()
async createExtraSession(
  groupId: string,
  createSessionDto: CreateSessionDto,
  actor: ActorUser,
): Promise<Session>
```

**Parameters:**
- `groupId` (string): UUID of the group this session belongs to
- `createSessionDto` (CreateSessionDto):
  - `date` (string): Date in YYYY-MM-DD format (interpreted as center timezone)
  - `startTime` (string): Time in HH:mm format (24-hour, center timezone)
  - `duration` (number): Duration in minutes (minimum 1)
  - `title` (string, optional): Session title/topic
- `actor` (ActorUser): User performing the action (for audit and permissions)

**Return Type:** `Promise<Session>` - The created session entity

**Flow:**
1. **Fetch Group with Class:**
   - Loads group with `class` relation to get `teacherUserProfileId`
   - Throws `ResourceNotFoundException` if group doesn't exist

2. **Timezone-Aware Date Validation:**
   - Gets current time in center timezone: `TimezoneService.getZonedNowFromContext()`
   - Converts date string to UTC: `TimezoneService.dateOnlyToUtc(dateStr)`
   - Validates date is NOT in the future (sessions must be in past or present)
   - Throws `BusinessLogicException` with key `t.messages.sessionDateMustBeInFuture` if date is future

3. **Timezone-Aware Time Conversion:**
   - Combines date + time strings: `TimezoneService.toUtc(dateStr, startTime)`
   - Converts to UTC Date object based on center timezone
   - Calculates `endTime` using `addMinutes(startTime, duration)` from `date-fns`

4. **Conflict Validation:**
   - **Teacher Conflict:** Checks if teacher has overlapping sessions
     - Uses `SessionValidationService.validateTeacherConflict()`
     - Throws `BusinessLogicException` with `t.messages.scheduleConflict.description` if conflict exists
   - **Group Conflict:** Checks if group has overlapping sessions
     - Uses `SessionValidationService.validateGroupConflict()`
     - Throws `BusinessLogicException` with `t.messages.scheduleConflict.description` if conflict exists

5. **Session Creation:**
   - Creates session with:
     - `groupId`: From parameter
     - `scheduleItemId`: `undefined` (extra sessions don't have schedule items)
     - `title`: From DTO (optional)
     - `startTime`: UTC Date from timezone conversion
     - `endTime`: UTC Date calculated from startTime + duration
     - `status`: `SessionStatus.SCHEDULED`
     - `isExtraSession`: `true`

6. **Event Emission:**
   - Emits `SessionEvents.CREATED` event with `SessionCreatedEvent`
   - Event contains: session, actor, centerId

**Error Conditions:**
- `ResourceNotFoundException`: Group not found
- `BusinessLogicException`: Date is in the future
- `BusinessLogicException`: Teacher schedule conflict
- `BusinessLogicException`: Group schedule conflict (overlapping sessions)

**Timezone Considerations:**
- All date/time inputs are interpreted in center timezone
- Stored as UTC in database
- Validation uses center timezone for "now" comparison

**Edge Cases:**
- Date at midnight in center timezone is correctly converted to UTC
- Sessions crossing midnight are handled correctly
- DST transitions are handled by `TZDate` from `@date-fns/tz`

---

### 2. `updateSession()`

**Purpose:** Updates an existing session's title, date, start time, and/or duration. Only `SCHEDULED` sessions can have their times changed.

**Signature:**
```typescript
@Transactional()
async updateSession(
  sessionId: string,
  updateSessionDto: UpdateSessionDto,
  actor: ActorUser,
): Promise<Session>
```

**Parameters:**
- `sessionId` (string): UUID of the session to update
- `updateSessionDto` (UpdateSessionDto): Same structure as `CreateSessionDto` except `groupId` is omitted
- `actor` (ActorUser): User performing the action

**Return Type:** `Promise<Session>` - The updated session entity

**Flow:**
1. **Load Session:**
   - Fetches session by ID
   - Throws `ResourceNotFoundException` if not found

2. **Status Validation:**
   - Checks if session status is `SCHEDULED`
   - Throws `BusinessLogicException` with key `t.messages.cannotUpdateSession` if status is not `SCHEDULED`
   - Other statuses (`CONDUCTING`, `FINISHED`, `CANCELED`) cannot have times changed

3. **Load Group with Class:**
   - Fetches group with `class` relation to get `teacherUserProfileId`
   - Used for conflict validation

4. **Timezone-Aware Date Validation:**
   - Same validation as `createExtraSession()`:
     - Gets center timezone "now"
     - Converts date string to UTC
     - Validates date is not in the future

5. **Timezone-Aware Time Conversion:**
   - Converts date + time to UTC: `TimezoneService.toUtc(dateStr, startTime)`
   - Calculates new `endTime` from `startTime + duration`

6. **Change Detection:**
   - Compares new times with existing session times using `.getTime()`
   - Only validates conflicts if times actually changed

7. **Conflict Validation (if time changed):**
   - **Teacher Conflict:** Validates with current session excluded
   - **Group Conflict:** Validates with current session excluded
   - Both throw `BusinessLogicException` if conflicts exist

8. **Update Session:**
   - Updates `startTime` and `endTime` (always updated)
   - Updates `title` if provided in DTO
   - Uses `sessionsRepository.updateThrow()`

9. **Event Emission:**
   - Emits `SessionEvents.UPDATED` event with `SessionUpdatedEvent`

**Error Conditions:**
- `ResourceNotFoundException`: Session not found
- `BusinessLogicException`: Session status is not `SCHEDULED`
- `BusinessLogicException`: Date is in the future
- `BusinessLogicException`: Teacher schedule conflict
- `BusinessLogicException`: Group schedule conflict

**Timezone Considerations:**
- Same timezone handling as `createExtraSession()`
- Existing session times are UTC, new times are converted from center timezone

**Edge Cases:**
- Updating only title (no time change) skips conflict validation
- Updating to same time still updates the record (idempotent)

---

### 3. `updateSessionStatus()`

**Purpose:** Updates a session's status. Handles status transitions and emits appropriate events.

**Signature:**
```typescript
@Transactional()
async updateSessionStatus(
  sessionId: string,
  status: SessionStatus,
  actor: ActorUser,
): Promise<Session>
```

**Parameters:**
- `sessionId` (string): UUID of the session
- `status` (SessionStatus): New status (`SCHEDULED`, `CONDUCTING`, `FINISHED`, `CANCELED`)
- `actor` (ActorUser): User performing the action

**Return Type:** `Promise<Session>` - The updated session entity

**Flow:**
1. **Load Session:**
   - Fetches session by ID
   - Throws `ResourceNotFoundException` if not found

2. **Early Return:**
   - If new status equals current status, returns session unchanged
   - Prevents unnecessary updates and event emissions

3. **Cancellation Validation:**
   - If new status is `CANCELED`:
     - Calls `SessionValidationService.validateSessionCancellation()`
     - Validates that only `SCHEDULED` sessions can be canceled
     - Throws `BusinessLogicException` if validation fails

4. **Update Status:**
   - Updates session status in database
   - Uses `sessionsRepository.updateThrow()`

5. **Event Emission:**
   - If status is `CANCELED`: Emits `SessionEvents.CANCELED` with `SessionCanceledEvent`
   - Otherwise: Emits `SessionEvents.UPDATED` with `SessionUpdatedEvent`

**Error Conditions:**
- `ResourceNotFoundException`: Session not found
- `BusinessLogicException`: Cannot cancel non-SCHEDULED session (from validation service)

**Status Transitions:**
- `SCHEDULED` → `CONDUCTING`: Session is starting
- `SCHEDULED` → `FINISHED`: Session was completed without marking as conducting
- `SCHEDULED` → `CANCELED`: Session was canceled
- `CONDUCTING` → `FINISHED`: Session completed normally
- Other transitions: Handled by validation service

**Edge Cases:**
- Setting status to current status is idempotent (no-op)
- Status transitions are validated by `SessionValidationService`

---

### 4. `deleteSession()`

**Purpose:** Deletes a session. Only `SCHEDULED` extra sessions (`isExtraSession: true`) can be deleted. Regular scheduled sessions must be canceled instead.

**Signature:**
```typescript
@Transactional()
async deleteSession(sessionId: string, actor: ActorUser): Promise<void>
```

**Parameters:**
- `sessionId` (string): UUID of the session to delete
- `actor` (ActorUser): User performing the action

**Return Type:** `Promise<void>`

**Flow:**
1. **Validation:**
   - Calls `SessionValidationService.validateSessionDeletion()`
   - Validates:
     - Session exists
     - Session is `SCHEDULED`
     - Session is `isExtraSession: true`
   - Throws `BusinessLogicException` if validation fails

2. **Deletion:**
   - Removes session from database using `sessionsRepository.remove()`
   - Hard delete (not soft delete)

3. **Event Emission:**
   - Emits `SessionEvents.DELETED` event with `SessionDeletedEvent`
   - Event contains: sessionId, actor, centerId

**Error Conditions:**
- `ResourceNotFoundException`: Session not found
- `BusinessLogicException`: Session is not deletable (from validation service)
  - Not `SCHEDULED`
  - Not `isExtraSession: true`
  - May have payments/attendance (TODO: future validation)

**Important Notes:**
- Regular scheduled sessions (from schedule items) should be canceled, not deleted
- Deletion is permanent (hard delete)
- TODO: Future validation for payments/attendance before deletion

---

### 5. `paginateSessions()`

**Purpose:** Retrieves paginated list of sessions with filtering and search capabilities.

**Signature:**
```typescript
async paginateSessions(
  paginateDto: PaginateSessionsDto,
  actor: ActorUser,
): Promise<Pagination<Session>>
```

**Parameters:**
- `paginateDto` (PaginateSessionsDto): Pagination and filter parameters
  - Standard pagination: `page`, `limit`
  - Filters: `groupId`, `classId`, `status`, `dateFrom`, `dateTo`
  - Search: `search` (searches in session title)
- `actor` (ActorUser): User performing the action (for access control)

**Return Type:** `Promise<Pagination<Session>>` - Paginated list with metadata

**Flow:**
1. **Delegate to Repository:**
   - Calls `sessionsRepository.paginateSessions(paginateDto, actor)`
   - Repository handles:
     - Access control (center-based filtering)
     - Date range filtering (timezone-aware)
     - Search functionality
     - Pagination logic

2. **Returns Result:**
   - Pagination object with:
     - `data`: Array of Session entities
     - `meta`: Pagination metadata (total, page, limit, etc.)

**Timezone Considerations:**
- Date filters (`dateFrom`, `dateTo`) are interpreted in center timezone
- Repository converts to UTC ranges for database queries

**Access Control:**
- Only sessions from actor's center are returned
- Additional filters based on user permissions (handled by repository)

---

### 6. `getCalendarSessions()`

**Purpose:** Retrieves sessions formatted for calendar display with all necessary relations loaded.

**Signature:**
```typescript
async getCalendarSessions(
  dto: CalendarSessionsDto,
  actor: ActorUser,
): Promise<CalendarSessionsResponseDto>
```

**Parameters:**
- `dto` (CalendarSessionsDto):
  - `dateFrom` (string, required): Start date in YYYY-MM-DD format
  - `dateTo` (string, required): End date in YYYY-MM-DD format
  - Additional filters: `groupId`, `classId`, `status`
  - Validation: Date range max 45 days, `dateTo` must be after `dateFrom`
- `actor` (ActorUser): User performing the action

**Return Type:** `Promise<CalendarSessionsResponseDto>` - Calendar-formatted response

**Flow:**
1. **Fetch Sessions:**
   - Calls `sessionsRepository.getCalendarSessions(dto, actor)`
   - Loads sessions with relations: `group`, `group.class`, `group.class.teacher`, `group.class.teacher.user`
   - Filters by date range (timezone-aware)

2. **Fetch Total Count:**
   - Calls `sessionsRepository.countCalendarSessions(dto, actor)`
   - Gets total count for pagination metadata

3. **Transform to Calendar Format:**
   - Maps each session to `CalendarSessionItem`:
     - `id`: Session ID
     - `title`: Session title or "Session" if empty
     - `startTime`: ISO 8601 string (UTC)
     - `endTime`: ISO 8601 string (UTC)
     - `status`: Session status
     - `groupId`: Group ID
     - `isExtraSession`: Boolean flag
     - `group`: Nested object with:
       - `id`, `name`
       - `class`: `id`, `name`
       - `teacher.user.name`

4. **Return Response:**
   - Returns object with:
     - `items`: Array of `CalendarSessionItem`
     - `meta`: Pagination metadata (fixed page size 1000)

**Timezone Considerations:**
- `dateFrom` and `dateTo` are interpreted as full calendar days in center timezone
- Sessions are returned with UTC ISO 8601 timestamps
- Frontend should format for display using center timezone

**Edge Cases:**
- Missing relations are handled with fallback empty strings
- Empty title defaults to "Session"

---

### 7. `getSession()`

**Purpose:** Retrieves a single session by ID with access control validation.

**Signature:**
```typescript
async getSession(sessionId: string, actor: ActorUser): Promise<Session>
```

**Parameters:**
- `sessionId` (string): UUID of the session
- `actor` (ActorUser): User performing the action

**Return Type:** `Promise<Session>` - The session entity

**Flow:**
1. **Load Session:**
   - Fetches session by ID
   - Throws `ResourceNotFoundException` if not found

2. **Access Control Validation:**
   - Fetches group by `session.groupId`
   - Validates `group.centerId === actor.centerId`
   - Throws `BusinessLogicException` with key `t.messages.withIdNotFound` if:
     - Group not found
     - Group belongs to different center

3. **Return Session:**
   - Returns session entity

**Error Conditions:**
- `ResourceNotFoundException`: Session not found
- `BusinessLogicException`: Session belongs to different center (access denied)

**Access Control:**
- Users can only access sessions from their center
- Additional permission checks may be handled by controller/guard

---

### 8. `updateSessionsEndTimeForDurationChange()`

**Purpose:** Updates `endTime` for all future scheduled sessions when a class's duration changes. Only updates sessions without conflicts.

**Signature:**
```typescript
@Transactional()
async updateSessionsEndTimeForDurationChange(
  classId: string,
  newDuration: number,
  actor: ActorUser,
): Promise<{ updated: number; conflicts: number }>
```

**Parameters:**
- `classId` (string): UUID of the class whose duration changed
- `newDuration` (number): New duration in minutes
- `actor` (ActorUser): User performing the action

**Return Type:** `Promise<{ updated: number; conflicts: number }>` - Counts of updated sessions and conflicts

**Flow:**
1. **Load Groups:**
   - Fetches all groups for the class using `groupsRepository.findByClassId()`

2. **Process Each Group:**
   - For each group:
     - Loads group with `class` relation to get `teacherUserProfileId`
     - Finds future `SCHEDULED` sessions for the group
     - Filters to only scheduled sessions (excludes `isExtraSession: true`)

3. **Validate and Update Each Session:**
   - For each session:
     - Calculates new `endTime` = `startTime + newDuration` using `addMinutes()`
     - **Teacher Conflict Check:**
       - Validates teacher doesn't have overlapping sessions
       - If conflict: Emits `CONFLICT_DETECTED` event, adds to conflicts, skips update
     - **Group Conflict Check:**
       - Validates group doesn't have overlapping sessions
       - If conflict: Emits `CONFLICT_DETECTED` event, adds to conflicts, skips update
     - **No Conflict:**
       - Updates session `endTime`
       - Emits `UPDATED` event
       - Increments updated count

4. **Return Summary:**
   - Returns object with:
     - `updated`: Total number of sessions updated
     - `conflicts`: Total number of sessions with conflicts (not updated)

**Error Conditions:**
- No errors thrown (conflicts are logged but don't fail the operation)
- Individual session updates may fail (handled by repository)

**Event Emissions:**
- `SessionEvents.CONFLICT_DETECTED`: For each session with conflict
- `SessionEvents.UPDATED`: For each successfully updated session

**Important Notes:**
- Only updates future `SCHEDULED` sessions
- Skips `isExtraSession: true` sessions
- Conflicts are detected but don't prevent other updates
- Each conflict emits a separate event for tracking

---

### 9. `regenerateSessionsForScheduleItem()`

**Purpose:** Deletes future scheduled sessions for a schedule item and regenerates them. Used when a schedule item's time or day changes.

**Signature:**
```typescript
@Transactional()
async regenerateSessionsForScheduleItem(
  scheduleItemId: string,
  actor: ActorUser,
): Promise<void>
```

**Parameters:**
- `scheduleItemId` (string): UUID of the schedule item
- `actor` (ActorUser): User performing the action

**Return Type:** `Promise<void>`

**Flow:**
1. **Load Schedule Item:**
   - Fetches schedule item with `group` relation
   - Throws `ResourceNotFoundException` if not found

2. **Find Future Sessions:**
   - Finds all future `SCHEDULED` sessions linked to this schedule item
   - Uses `sessionsRepository.findFutureScheduledSessionsByScheduleItem()`

3. **Filter Sessions:**
   - Filters out `isExtraSession: true` sessions (preserves manual sessions)
   - TODO: Future filter for sessions with payments/attendance

4. **Delete Sessions:**
   - Deletes each filtered session
   - Collects deleted session IDs

5. **Emit Bulk Deletion Event:**
   - If any sessions deleted:
     - Emits `SessionEvents.BULK_DELETED` with `SessionsBulkDeletedEvent`
     - Contains array of deleted session IDs

6. **Regenerate Sessions:**
   - Calculates date range: 2 months from now (using center timezone)
   - Calls `sessionGenerationService.generateSessionsForGroup()`
   - Generates new sessions based on updated schedule item

7. **Emit Regeneration Event:**
   - Emits `SessionEvents.REGENERATED` with `SessionsRegeneratedEvent`
   - Contains: `scheduleItemId`, `groupId`, `deletedCount`, `createdCount`

**Error Conditions:**
- `ResourceNotFoundException`: Schedule item not found
- Errors from `generateSessionsForGroup()` propagate

**Important Notes:**
- Preserves `isExtraSession: true` sessions
- Regenerates 2 months of sessions from current date
- TODO: Check for payments/attendance before deletion (future enhancement)

**Event Emissions:**
- `SessionEvents.BULK_DELETED`: When sessions are deleted
- `SessionEvents.REGENERATED`: After regeneration completes

---

### 10. `updateSessionsForScheduleItemsChange()`

**Purpose:** Intelligently updates sessions when schedule items change. Compares old vs new schedule items and:
- **Added items:** Generates new sessions
- **Removed items:** Deletes future sessions
- **Modified items:** Updates existing sessions (moves to new day/time)
- **Unchanged items:** Leaves as-is

**Signature:**
```typescript
@Transactional()
async updateSessionsForScheduleItemsChange(
  groupId: string,
  oldScheduleItems: ScheduleItem[],
  newScheduleItems: ScheduleItem[],
  actor: ActorUser,
): Promise<{
  added: number;
  removed: number;
  updated: number;
  conflicts: number;
}>
```

**Parameters:**
- `groupId` (string): UUID of the group
- `oldScheduleItems` (ScheduleItem[]): Previous schedule items
- `newScheduleItems` (ScheduleItem[]): New schedule items
- `actor` (ActorUser): User performing the action

**Return Type:** `Promise<{ added: number; removed: number; updated: number; conflicts: number }>`

**Flow:**

#### Phase 1: Build Comparison Maps
1. **Create Key Function:**
   - `getScheduleItemKey(item)`: Returns `${item.day}-${item.startTime}`
   - Used to identify identical schedule items

2. **Build Maps:**
   - `oldMap`: Map of old schedule items by key
   - `newMap`: Map of new schedule items by key

#### Phase 2: Process Removed Items
1. **Iterate Old Items:**
   - For each item in `oldMap` not in `newMap`:
     - Find future scheduled sessions for this schedule item
     - Filter out `isExtraSession: true` sessions
     - Delete each session
     - Emit `BULK_DELETED` event
     - Increment `removedCount`

#### Phase 3: Process Added Items
1. **Iterate New Items:**
   - For each item in `newMap` not in `oldMap`:
     - Calculate date range: 2 months from now (center timezone)
     - Cap to class `endDate` if exists
     - Generate dates for this day of week using `getDatesForDayOfWeek()`

2. **Create Sessions:**
   - For each date:
     - Convert to timezone-aware UTC: `TimezoneService.toUtc(dateStr, startTime)`
     - Calculate `endTime` = `startTime + duration`
     - **Check Teacher Conflict:**
       - If conflict: Emit `CONFLICT_DETECTED`, increment `conflictsCount`, skip
     - **Check Duplicate:**
       - Check if session with same `groupId + startTime` exists
       - If exists: Skip (prevents duplicates)
     - Add to `sessionsToCreate` array

3. **Bulk Insert:**
   - If sessions to create:
     - Bulk insert using `sessionsRepository.bulkInsert()`
     - Emit `BULK_CREATED` event
     - Increment `addedCount`

#### Phase 4: Process Modified Items
1. **Iterate Old Items:**
   - For each item in both maps:
     - Check if `day` or `startTime` changed
     - If changed: Process as modified

2. **Update Each Session:**
   - For each future scheduled session linked to old schedule item:
     - **Calculate New Date:**
       - Get session's current day of week (timezone-aware)
       - If day changed:
         - Calculate days difference (handles wrap-around, e.g., Fri → Mon)
         - Calculate offset from session's day to old day
         - Move session: `addDays(sessionDate, -offset + daysDiff)`
       - If only time changed: Keep same date
     
     - **Calculate New Times:**
       - Convert new date + new time to UTC: `TimezoneService.toUtc()`
       - Calculate new `endTime` = `startTime + duration`
     
     - **Validate Conflicts:**
       - Teacher conflict: Emit `CONFLICT_DETECTED`, increment `conflictsCount`, skip
       - Group conflict: Emit `CONFLICT_DETECTED`, increment `conflictsCount`, skip
     
     - **Update Session:**
       - Update `scheduleItemId`, `startTime`, `endTime`
       - Emit `UPDATED` event
       - Increment `updatedCount`

3. **Return Summary:**
   - Returns object with counts:
     - `added`: New sessions created
     - `removed`: Sessions deleted
     - `updated`: Sessions moved/updated
     - `conflicts`: Sessions with conflicts (not updated)

**Error Conditions:**
- `ResourceNotFoundException`: Group not found
- Individual session operations may fail (handled gracefully)

**Timezone Considerations:**
- All date/time operations use center timezone
- Day-of-week matching uses `TimezoneService.getDayOfWeek()` for timezone-aware comparison
- Session times are converted to UTC before storage

**Event Emissions:**
- `SessionEvents.BULK_DELETED`: When sessions are deleted
- `SessionEvents.BULK_CREATED`: When new sessions are created
- `SessionEvents.CONFLICT_DETECTED`: For each conflict
- `SessionEvents.UPDATED`: For each updated session

**Edge Cases:**
- Day wrap-around (e.g., Friday to Monday) handled correctly
- Duplicate prevention for added items
- Preserves `isExtraSession: true` sessions
- Conflicts don't prevent other updates

---

## Private Methods

### `getDatesForDayOfWeek()`

**Purpose:** Helper method to find all dates matching a specific day of week within a date range.

**Signature:**
```typescript
private getDatesForDayOfWeek(
  startDate: Date,
  endDate: Date,
  dayOfWeek: DayOfWeek,
): Date[]
```

**Parameters:**
- `startDate` (Date): Start date (inclusive, UTC)
- `endDate` (Date): End date (inclusive, UTC)
- `dayOfWeek` (DayOfWeek): Day to match (MON, TUE, WED, etc.)

**Return Type:** `Date[]` - Array of UTC Date objects

**Flow:**
1. **Initialize:**
   - Creates empty dates array
   - Maps `DayOfWeek` enum to JavaScript day index (0-6)
   - Gets target day index

2. **Iterate Dates:**
   - Starts from `startOfDay(startDate)` (UTC)
   - While current date <= endDate:
     - Gets day of week using `TimezoneService.getDayOfWeek(currentDate)` (timezone-aware)
     - If matches target day: Adds to array
     - Increments date by 1 day using `addDays()`

3. **Return:**
   - Returns array of matching dates

**Timezone Considerations:**
- Uses `TimezoneService.getDayOfWeek()` for timezone-aware day matching
- Ensures schedule items (center timezone) match correctly with UTC dates

**Edge Cases:**
- Handles dates crossing month/year boundaries
- Correctly matches days in center timezone even if UTC day differs

---

## Event Types

### SessionCreatedEvent
- **Emitted by:** `createExtraSession()`
- **Contains:** `session`, `actor`, `centerId`
- **Listeners:** Activity logging, notifications

### SessionUpdatedEvent
- **Emitted by:** `updateSession()`, `updateSessionStatus()`, `updateSessionsEndTimeForDurationChange()`, `updateSessionsForScheduleItemsChange()`
- **Contains:** `session`, `actor`, `centerId`
- **Listeners:** Activity logging, notifications

### SessionDeletedEvent
- **Emitted by:** `deleteSession()`
- **Contains:** `sessionId`, `actor`, `centerId`
- **Listeners:** Activity logging, notifications

### SessionCanceledEvent
- **Emitted by:** `updateSessionStatus()` (when status = CANCELED)
- **Contains:** `session`, `actor`, `centerId`
- **Listeners:** Activity logging, notifications, payment processing

### SessionsBulkCreatedEvent
- **Emitted by:** `updateSessionsForScheduleItemsChange()`
- **Contains:** `sessions[]`, `actor`, `centerId`
- **Listeners:** Activity logging

### SessionsBulkDeletedEvent
- **Emitted by:** `regenerateSessionsForScheduleItem()`, `updateSessionsForScheduleItemsChange()`
- **Contains:** `sessionIds[]`, `actor`, `centerId`
- **Listeners:** Activity logging

### SessionsRegeneratedEvent
- **Emitted by:** `regenerateSessionsForScheduleItem()`
- **Contains:** `scheduleItemId`, `groupId`, `deletedCount`, `createdCount`, `actor`, `centerId`
- **Listeners:** Activity logging

### SessionConflictDetectedEvent
- **Emitted by:** `updateSessionsEndTimeForDurationChange()`, `updateSessionsForScheduleItemsChange()`
- **Contains:** `groupId`, `scheduleItemId`, `startTime`, `endTime`, `conflictType` (TEACHER/GROUP), `conflictingSessionId`, `conflictingStartTime`, `conflictingEndTime`, `actor`, `centerId`
- **Listeners:** Activity logging, notifications (warnings)

---

## Timezone Handling Summary

All date/time operations in `SessionsService` follow the "Clean UTC" pattern:

1. **Input:** Date strings (YYYY-MM-DD) and time strings (HH:mm) represent center timezone intent
2. **Conversion:** `TimezoneService.toUtc()` converts to UTC using center timezone from `RequestContext`
3. **Storage:** All dates stored as UTC timestamps in database
4. **Output:** UTC ISO 8601 strings (frontend formats for display)
5. **Validation:** Uses `TimezoneService.getZonedNowFromContext()` for "now" comparisons
6. **Day Matching:** Uses `TimezoneService.getDayOfWeek()` for timezone-aware day-of-week matching

**Key Methods:**
- `TimezoneService.toUtc(dateStr, timeStr)`: Converts date+time to UTC
- `TimezoneService.dateOnlyToUtc(dateStr)`: Converts date-only to UTC midnight
- `TimezoneService.getZonedNowFromContext()`: Gets "now" in center timezone
- `TimezoneService.getDayOfWeek(date)`: Gets day of week in center timezone

---

## Transaction Management

All write operations are wrapped in `@Transactional()` decorator:
- Ensures atomicity (all-or-nothing)
- Automatic rollback on errors
- Consistent database state

**Transactional Methods:**
- `createExtraSession()`
- `updateSession()`
- `updateSessionStatus()`
- `deleteSession()`
- `updateSessionsEndTimeForDurationChange()`
- `regenerateSessionsForScheduleItem()`
- `updateSessionsForScheduleItemsChange()`

---

## Error Handling

All errors follow the standard exception hierarchy:

- **`ResourceNotFoundException`:** Entity not found (404)
- **`BusinessLogicException`:** Business rule violations (400)
  - Date validation errors
  - Status transition errors
  - Conflict errors
- **Validation errors:** Handled by DTO validators (400)

Errors are caught by global exception filters and transformed to appropriate HTTP responses.

---

## Performance Considerations

1. **Bulk Operations:**
   - `updateSessionsForScheduleItemsChange()` uses bulk insert for new sessions
   - Bulk events reduce event emission overhead

2. **Lazy Loading:**
   - Relations loaded only when needed
   - Uses repository methods with explicit relation loading

3. **Conflict Detection:**
   - Validates conflicts only when times change
   - Skips validation for unchanged sessions

4. **Date Range Limits:**
   - Calendar queries limited to 45 days
   - Session generation limited to 2 months

---

## Future Enhancements (TODOs)

1. **Payment/Attendance Validation:**
   - Check for payments before deleting sessions
   - Check for attendance before deleting sessions
   - Prevent deletion of sessions with financial/attendance records

2. **Batch Operations:**
   - Bulk status updates
   - Bulk deletions with validation

3. **Conflict Resolution:**
   - Automatic conflict resolution strategies
   - Conflict notification system

---

## Testing Recommendations

1. **Unit Tests:**
   - Each method with various input scenarios
   - Timezone edge cases (DST transitions, midnight boundaries)
   - Conflict detection logic
   - Status transition validation

2. **Integration Tests:**
   - End-to-end session creation/update flows
   - Schedule item change scenarios
   - Event emission verification

3. **Edge Cases:**
   - Sessions crossing midnight
   - Day wrap-around (Friday to Monday)
   - DST transitions
   - Concurrent updates
   - Large date ranges

---

## Related Documentation

- `SESSIONS_MODULE_DETAILED_ANALYSIS.md`: Overall module architecture
- `SESSIONS_MODULE_DETAILED_SUMMARY.md`: Module summary
- `FRONTEND_TIMEZONE_GUIDE.md`: Frontend integration guide
- `SessionValidationService`: Conflict and validation logic
- `SessionGenerationService`: Session generation from schedule items


