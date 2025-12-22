# Sessions Module - Comprehensive Detailed Analysis

## Table of Contents

1. [Module Overview](#module-overview)
2. [Module Structure](#module-structure)
3. [Entity Definitions](#entity-definitions)
4. [Controllers](#controllers)
5. [Services](#services)
6. [Repositories](#repositories)
7. [Jobs (Cron Jobs)](#jobs-cron-jobs)
8. [Event Listeners](#event-listeners)
9. [Events](#events)
10. [DTOs (Data Transfer Objects)](#dtos-data-transfer-objects)
11. [Enums](#enums)
12. [Data Flow Diagrams](#data-flow-diagrams)
13. [Business Logic Details](#business-logic-details)
14. [Performance Optimizations](#performance-optimizations)

---

## Module Overview

The Sessions Module is responsible for managing class sessions in the Learning Management System. It handles:

- **Session Creation**: Both automatic (from schedule items) and manual (extra sessions)
- **Session Management**: Update, delete, cancel operations
- **Session Generation**: Automatic generation based on class schedules
- **Conflict Validation**: Teacher and group scheduling conflicts
- **Session Maintenance**: Automated cleanup and buffer generation via cron jobs
- **Event-Driven Architecture**: Integration with classes and groups modules through events

### Key Features

- Automatic session generation from schedule items
- Manual/extra session creation
- Teacher conflict detection (prevents double-booking)
- Group conflict detection (prevents overlapping sessions in same group)
- Conflict event emission (tracks skipped sessions during generation)
- Bulk operations with optimized event emission
- Set-based queries for performance
- QueryBuilder Specification pattern for flexible querying
- 24-hour grace period for class status changes
- 4-week buffer maintenance for future sessions

---

## Module Structure

```
src/modules/sessions/
├── sessions.module.ts                    # Module definition
├── entities/
│   └── session.entity.ts                 # Session entity
├── controllers/
│   └── sessions.controller.ts            # REST API endpoints
├── services/
│   ├── sessions.service.ts               # Main business logic
│   ├── session-generation.service.ts     # Session generation logic
│   └── session-validation.service.ts     # Validation logic
├── repositories/
│   └── sessions.repository.ts             # Data access layer
├── jobs/
│   ├── session-cleanup.job.ts           # Daily cleanup job
│   └── session-generation-maintenance.job.ts  # Weekly maintenance job
├── listeners/
│   ├── class-events.listener.ts         # Listens to class events
│   ├── group-events.listener.ts         # Listens to group events
│   ├── session-activity.listener.ts     # Logs session activities
│   ├── session-attendance-listener.ts   # Placeholder for attendance
│   └── session-payment-listener.ts      # Placeholder for payments
├── events/
│   └── session.events.ts                # Event class definitions
├── dto/
│   ├── create-session.dto.ts            # Create session DTO
│   ├── update-session.dto.ts           # Update session DTO
│   ├── session-response.dto.ts          # Response DTO
│   ├── session-id-param.dto.ts         # Path parameter DTO
│   ├── group-id-param.dto.ts           # Path parameter DTO
│   └── paginate-sessions.dto.ts        # Pagination DTO
└── enums/
    ├── session-status.enum.ts           # Session status enum
    └── session-activity-type.enum.ts    # Activity log types
```

---

## Entity Definitions

### Session Entity (`session.entity.ts`)

**Purpose**: Represents a class session in the database.

**Database Table**: `sessions`

**Fields**:

- `id` (UUID, Primary Key) - Inherited from BaseEntity
- `groupId` (UUID, Required) - Foreign key to groups table
- `scheduleItemId` (UUID, Optional) - Foreign key to schedule_items table (null for extra sessions)
- `title` (VARCHAR(255), Optional) - Session title/topic
- `startTime` (TIMESTAMP, Required) - Session start time
- `endTime` (TIMESTAMP, Required) - Session end time
- `status` (VARCHAR(20), Default: SCHEDULED) - Session status enum
- `isExtraSession` (BOOLEAN, Default: false) - Flag for manual sessions
- `createdAt`, `updatedAt`, `deletedAt` - Inherited from BaseEntity
- `createdBy`, `updatedBy` - Inherited from BaseEntity

**Relations**:

- `@ManyToOne(() => Group)` - Session belongs to a group
- `@ManyToOne(() => ScheduleItem)` - Session may be linked to a schedule item

**Indexes**:

- `groupId` - For filtering by group
- `scheduleItemId` - For filtering by schedule item
- `startTime` - For time-based queries
- `status` - For status filtering
- `[groupId, status]` - Composite index for common queries
- `[groupId, startTime]` - Unique composite index (prevents duplicate sessions)

**Key Design Decisions**:

- Unique constraint on `(groupId, startTime)` prevents duplicate sessions at same time
- `isExtraSession` flag distinguishes manual sessions from auto-generated ones
- `scheduleItemId` is nullable to support extra sessions

---

## Controllers

### SessionsController (`sessions.controller.ts`)

**Purpose**: Provides REST API endpoints for session management.

**File Location**: `src/modules/sessions/controllers/sessions.controller.ts`

**Class Declaration**: `@Controller('sessions') export class SessionsController`

**Base Path**: `/sessions`

**Dependencies**: `SessionsService` (injected via constructor)

**Decorators**: `@ApiTags('Sessions')` - Swagger documentation tag

---

**Endpoints**:

#### 1. `POST /sessions` - Create Extra Session

**Method**: `createSession()`

**Method Signature**:

```typescript
@Post()
@ApiOperation({ summary: 'Create an extra/manual session' })
@ApiResponse({ status: 201, description: 'Session created successfully' })
@ApiResponse({ status: 400, description: 'Invalid input or conflict' })
@Permissions(PERMISSIONS.CLASSES.CREATE)
@Transactional()
@SerializeOptions({ type: SessionResponseDto })
async createSession(
  @Body() createSessionDto: CreateSessionDto,
  @GetUser() actor: ActorUser,
)
```

**HTTP Method**: POST

**Path**: `/sessions`

**Permission**: `PERMISSIONS.CLASSES.CREATE`

**Transaction**: Yes (`@Transactional()`)

**Description**: Creates a manual/extra session for a group

**Request Body**: `CreateSessionDto`

- `groupId` (UUID, required)
- `title` (string, optional, max 255 chars)
- `startTime` (ISO 8601 date string, required)
- `endTime` (ISO 8601 date string, required)

**Response**: `ControllerResponse<SessionResponseDto>` with status 201

**Response Serialization**: Uses `SessionResponseDto` for response transformation

**Flow**:

1. **DTO Validation**: NestJS automatically validates `CreateSessionDto` using class-validator
2. **Permission Check**: `@Permissions` decorator validates user has CREATE permission
3. **Service Call**: Calls `sessionsService.createExtraSession(createSessionDto.groupId, createSessionDto, actor)`
4. **Response**: Returns `ControllerResponse.success()` with created session

**Error Responses**:

- `400 Bad Request`: Invalid DTO or validation failure
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Group not found
- `409 Conflict`: Teacher or group conflict

**Example Request**:

```json
POST /sessions
{
  "groupId": "uuid-123",
  "title": "Make-up Session",
  "startTime": "2024-01-15T14:30:00Z",
  "endTime": "2024-01-15T16:30:00Z"
}
```

**Example Response**:

```json
{
  "success": true,
  "data": {
    "id": "session-uuid",
    "groupId": "uuid-123",
    "title": "Make-up Session",
    "startTime": "2024-01-15T14:30:00Z",
    "endTime": "2024-01-15T16:30:00Z",
    "status": "SCHEDULED",
    "isExtraSession": true
  },
  "message": {
    "key": "t.messages.created",
    "args": { "resource": "t.resources.session" }
  }
}
```

#### 2. `GET /sessions` - Paginate Sessions

**Method**: `paginateSessions()`

**Method Signature**:

```typescript
@Get()
@ApiOperation({ summary: 'Paginate sessions with filtering capabilities' })
@ApiResponse({ status: 200, description: 'Sessions retrieved successfully' })
@Permissions(PERMISSIONS.CLASSES.READ)
@SerializeOptions({ type: SessionResponseDto })
async paginateSessions(
  @Query() paginateDto: PaginateSessionsDto,
  @GetUser() actor: ActorUser,
)
```

**HTTP Method**: GET

**Path**: `/sessions`

**Permission**: `PERMISSIONS.CLASSES.READ`

**Transaction**: No (read-only)

**Description**: Retrieves paginated list of sessions with filtering

**Query Parameters**: `PaginateSessionsDto`

- `page` (number, optional, default: 1)
- `limit` (number, optional, default: 10)
- `search` (string, optional) - Search in title
- `sortBy` (string, optional) - Sort column
- `sortOrder` ('ASC' | 'DESC', optional) - Sort direction
- `groupId` (UUID, optional) - Filter by group
- `classId` (UUID, optional) - Filter by class
- `status` (SessionStatus enum, optional) - Filter by status
- `startTimeFrom` (ISO 8601 date string, optional) - Filter from date
- `startTimeTo` (ISO 8601 date string, optional) - Filter until date

**Response**: `ControllerResponse<Pagination<SessionResponseDto>>` with status 200

**Flow**:

1. **Query Validation**: NestJS validates query parameters
2. **Permission Check**: Validates READ permission
3. **Service Call**: Calls `sessionsService.paginateSessions(paginateDto, actor)`
4. **Response**: Returns `ControllerResponse.success()` with paginated results

**Example Request**:

```
GET /sessions?groupId=uuid-123&status=SCHEDULED&page=1&limit=20
```

**Example Response**:

```json
{
  "success": true,
  "data": {
    "items": [...sessions...],
    "meta": {
      "totalItems": 50,
      "itemCount": 20,
      "itemsPerPage": 20,
      "totalPages": 3,
      "currentPage": 1
    },
    "links": {
      "first": "/sessions?page=1",
      "last": "/sessions?page=3",
      "next": "/sessions?page=2",
      "previous": ""
    }
  }
}
```

#### 3. `GET /sessions/:sessionId` - Get Single Session

**Method**: `getSession()`

**Method Signature**:

```typescript
@Get(':sessionId')
@ApiOperation({ summary: 'Get a specific session' })
@ApiParam({ name: 'sessionId', description: 'Session ID' })
@ApiResponse({ status: 200, description: 'Session retrieved successfully' })
@ApiResponse({ status: 404, description: 'Session not found' })
@Permissions(PERMISSIONS.CLASSES.READ)
@SerializeOptions({ type: SessionResponseDto })
async getSession(
  @Param() params: SessionIdParamDto,
  @GetUser() actor: ActorUser,
)
```

**HTTP Method**: GET

**Path**: `/sessions/:sessionId`

**Permission**: `PERMISSIONS.CLASSES.READ`

**Transaction**: No (read-only)

**Description**: Retrieves a specific session by ID

**Path Parameters**: `SessionIdParamDto`

- `sessionId` (UUID, required) - Validated with `@Exists(Session)` decorator

**Response**: `ControllerResponse<SessionResponseDto>` with status 200

**Flow**:

1. **Path Validation**: `@Exists` decorator validates session exists
2. **Permission Check**: Validates READ permission
3. **Service Call**: Calls `sessionsService.getSession(params.sessionId, actor)`
4. **Center Validation**: Service validates center access
5. **Response**: Returns `ControllerResponse.success()` with session

**Example Request**:

```
GET /sessions/session-uuid-123
```

**Example Response**:

```json
{
  "success": true,
  "data": {
    "id": "session-uuid-123",
    "groupId": "group-uuid",
    "title": "Session Title",
    "startTime": "2024-01-15T14:30:00Z",
    "endTime": "2024-01-15T16:30:00Z",
    "status": "SCHEDULED",
    "isExtraSession": false
  }
}
```

**Error Responses**:

- `404 Not Found`: Session not found or center mismatch

#### 4. `PUT /sessions/:sessionId` - Update Session

**Method**: `updateSession()`

**Method Signature**:

```typescript
@Put(':sessionId')
@ApiOperation({ summary: 'Update a session' })
@ApiParam({ name: 'sessionId', description: 'Session ID' })
@ApiResponse({ status: 200, description: 'Session updated successfully' })
@ApiResponse({ status: 400, description: 'Invalid input or session cannot be updated' })
@ApiResponse({ status: 404, description: 'Session not found' })
@Permissions(PERMISSIONS.CLASSES.UPDATE)
@Transactional()
@SerializeOptions({ type: SessionResponseDto })
async updateSession(
  @Param() params: SessionIdParamDto,
  @Body() data: UpdateSessionDto,
  @GetUser() actor: ActorUser,
)
```

**HTTP Method**: PUT

**Path**: `/sessions/:sessionId`

**Permission**: `PERMISSIONS.CLASSES.UPDATE`

**Transaction**: Yes (`@Transactional()`)

**Description**: Updates a session (only SCHEDULED sessions can be updated)

**Path Parameters**: `SessionIdParamDto` (sessionId)

**Request Body**: `UpdateSessionDto` (all fields optional)

- `title` (string, optional, max 255 chars)
- `startTime` (ISO 8601 date string, optional)
- `endTime` (ISO 8601 date string, optional)

**Response**: `ControllerResponse<SessionResponseDto>` with status 200

**Flow**:

1. **Validation**: Validates session exists and is SCHEDULED
2. **Conflict Validation**: If time changed, validates teacher and group conflicts
3. **Service Call**: Calls `sessionsService.updateSession(params.sessionId, data, actor)`
4. **Response**: Returns `ControllerResponse.success()` with updated session

**Example Request**:

```json
PUT /sessions/session-uuid-123
{
  "title": "Updated Title",
  "startTime": "2024-01-16T14:30:00Z",
  "endTime": "2024-01-16T16:30:00Z"
}
```

**Error Responses**:

- `400 Bad Request`: Session not SCHEDULED or conflict detected
- `404 Not Found`: Session not found
- `409 Conflict`: Teacher or group conflict

#### 5. `DELETE /sessions/:sessionId` - Delete Session

**Method**: `deleteSession()`

**Method Signature**:

```typescript
@Delete(':sessionId')
@ApiOperation({ summary: 'Delete a session' })
@ApiParam({ name: 'sessionId', description: 'Session ID' })
@ApiResponse({ status: 200, description: 'Session deleted successfully' })
@ApiResponse({ status: 400, description: 'Session cannot be deleted' })
@ApiResponse({ status: 404, description: 'Session not found' })
@Permissions(PERMISSIONS.CLASSES.DELETE)
@Transactional()
async deleteSession(
  @Param() params: SessionIdParamDto,
  @GetUser() actor: ActorUser,
)
```

**HTTP Method**: DELETE

**Path**: `/sessions/:sessionId`

**Permission**: `PERMISSIONS.CLASSES.DELETE`

**Transaction**: Yes (`@Transactional()`)

**Description**: Deletes a session. Only SCHEDULED extra sessions (`isExtraSession: true`) can be deleted. Scheduled sessions (`isExtraSession: false`) must be canceled instead.

**Path Parameters**: `SessionIdParamDto` (sessionId)

**Response**: `ControllerResponse` with success message (no data)

**Flow**:

1. **Validation**: Validates session exists, is SCHEDULED, and is an extra session (`isExtraSession: true`)
2. **Service Call**: Calls `sessionsService.deleteSession(params.sessionId, actor)`
3. **Response**: Returns `ControllerResponse.message()` with success message

**Example Request**:

```
DELETE /sessions/session-uuid-123
```

**Example Response**:

```json
{
  "success": true,
  "message": {
    "key": "t.messages.deleted",
    "args": { "resource": "t.resources.session" }
  }
}
```

**Error Responses**:

- `400 Bad Request`: Session not SCHEDULED, is a scheduled session (not extra), or has dependencies
- `404 Not Found`: Session not found

**Design Note**: This restriction protects the "system of record" for official schedules while allowing flexibility for manual sessions.

#### 6. `PATCH /sessions/:sessionId/cancel` - Cancel Session

**Method**: `cancelSession()`

**Method Signature**:

```typescript
@Patch(':sessionId/cancel')
@ApiOperation({ summary: 'Cancel a session' })
@ApiParam({ name: 'sessionId', description: 'Session ID' })
@ApiResponse({ status: 200, description: 'Session canceled successfully' })
@ApiResponse({ status: 404, description: 'Session not found' })
@Permissions(PERMISSIONS.CLASSES.UPDATE)
@Transactional()
@SerializeOptions({ type: SessionResponseDto })
async cancelSession(
  @Param() params: SessionIdParamDto,
  @GetUser() actor: ActorUser,
)
```

**HTTP Method**: PATCH

**Path**: `/sessions/:sessionId/cancel`

**Permission**: `PERMISSIONS.CLASSES.UPDATE`

**Transaction**: Yes (`@Transactional()`)

**Description**: Cancels a session by setting status to CANCELED

**Path Parameters**: `SessionIdParamDto` (sessionId)

**Request Body**: None

**Response**: `ControllerResponse<SessionResponseDto>` with status 200

**Flow**:

1. **Service Call**: Calls `sessionsService.cancelSession(params.sessionId, actor)`
2. **Status Update**: Service updates status to CANCELED
3. **Response**: Returns `ControllerResponse.success()` with updated session

**Example Request**:

```
PATCH /sessions/session-uuid-123/cancel
```

**Example Response**:

```json
{
  "success": true,
  "data": {
    "id": "session-uuid-123",
    "status": "CANCELED",
    ...
  }
}
```

**Note**: No validation on current status - any session can be canceled

---

## Services

### SessionsService (`sessions.service.ts`)

**Purpose**: Main business logic service for session operations.

**File Location**: `src/modules/sessions/services/sessions.service.ts`

**Class Declaration**: `export class SessionsService extends BaseService`

**Dependencies**:

- `SessionsRepository` - Data access
- `SessionValidationService` - Validation logic
- `SessionGenerationService` - Session generation
- `TypeSafeEventEmitter` - Event emission
- `GroupsRepository` - Group data access
- `ScheduleItemsRepository` - Schedule item data access

**Inheritance**: Extends `BaseService` (provides common service functionality)

**Transaction Management**: Uses `@Transactional()` decorator from `@nestjs-cls/transactional` for methods that modify data

---

#### Methods:

##### 1. `createExtraSession(groupId: string, createSessionDto: CreateSessionDto, actor: ActorUser): Promise<Session>`

**Purpose**: Creates a manual/extra session for a group.

**Method Signature**:

```typescript
@Transactional()
async createExtraSession(
  groupId: string,
  createSessionDto: CreateSessionDto,
  actor: ActorUser,
): Promise<Session>
```

**Parameters**:

- `groupId` (string, required): UUID of the group to create session for
- `createSessionDto` (CreateSessionDto, required): Contains `title?`, `startTime`, `endTime`
- `actor` (ActorUser, required): User performing the action (for audit and permissions)

**Return Type**: `Promise<Session>` - The created session entity

**Decorators**: `@Transactional()` - Ensures all database operations are in a transaction

**Called By**: `SessionsController.createSession()`

**Calls**:

- `groupsRepository.findByIdOrThrow(groupId, ['class'])`
- `sessionValidationService.validateTeacherConflict()`
- `sessionValidationService.validateGroupConflict()`
- `sessionsRepository.create()`
- `typeSafeEventEmitter.emitAsync()`

**Detailed Flow**:

1. **Fetch Group with Class**:
   - Uses `groupsRepository.findByIdOrThrow()` with `['class']` relation
   - Retrieves `teacherUserProfileId` from `group.class.teacherUserProfileId`

2. **Parse Times**:
   - Converts `createSessionDto.startTime` and `createSessionDto.endTime` strings to Date objects

3. **Validate Teacher Conflict**:
   - Calls `sessionValidationService.validateTeacherConflict()`
   - Checks if teacher has overlapping sessions
   - Throws `BusinessLogicException` if conflict found

4. **Validate Group Conflict**:
   - Calls `sessionValidationService.validateGroupConflict()`
   - Checks if group has overlapping sessions
   - Throws `BusinessLogicException` if conflict found

5. **Create Session**:
   - Uses `sessionsRepository.create()` with:
     - `groupId`: From parameter
     - `scheduleItemId`: `undefined` (extra sessions don't have schedule items)
     - `title`: From DTO (optional)
     - `startTime`, `endTime`: Parsed dates
     - `status`: `SessionStatus.SCHEDULED`
     - `isExtraSession`: `true`

6. **Emit Event**:
   - Emits `SessionEvents.CREATED` with `SessionCreatedEvent`
   - Includes session, actor, and centerId

7. **Return**: Created session entity

**Error Cases**:

- Group not found → `ResourceNotFoundException`
- Teacher conflict → `BusinessLogicException` with 't.messages.scheduleConflict'
- Group conflict → `BusinessLogicException` with 't.messages.scheduleConflict'

---

##### 2. `updateSession(sessionId, updateSessionDto, actor): Promise<Session>`

**Purpose**: Updates a session (only SCHEDULED sessions can be updated).

**Detailed Flow**:

1. **Fetch Session**:
   - Uses `sessionsRepository.findOneOrThrow(sessionId)`
   - Throws if not found

2. **Validate Status**:
   - Checks if `session.status === SessionStatus.SCHEDULED`
   - Throws `BusinessLogicException` if not SCHEDULED

3. **Handle Time Changes** (if `startTime` or `endTime` provided):
   - Fetches group with class to get `teacherUserProfileId`
   - Calculates new times:
     - `newStartTime`: From DTO or existing session
     - `newEndTime`: From DTO or existing session
   - If times changed:
     - Validates teacher conflict (excluding current session)
     - Validates group conflict (excluding current session)
     - Throws `BusinessLogicException` if conflicts found

4. **Update Session**:
   - Uses `sessionsRepository.updateThrow()` with:
     - `title`: From DTO (if provided)
     - `startTime`: Parsed from DTO or undefined
     - `endTime`: Parsed from DTO or undefined

5. **Emit Event**:
   - Emits `SessionEvents.UPDATED` with `SessionUpdatedEvent`

6. **Return**: Updated session entity

**Error Cases**:

- Session not found → `ResourceNotFoundException`
- Session not SCHEDULED → `BusinessLogicException` with 't.messages.cannotUpdateSession'
- Teacher conflict → `BusinessLogicException` with 't.messages.scheduleConflict'
- Group conflict → `BusinessLogicException` with 't.messages.scheduleConflict'

---

##### 3. `deleteSession(sessionId: string, actor: ActorUser): Promise<void>`

**Purpose**: Deletes a session. Only SCHEDULED extra sessions (`isExtraSession: true`) can be deleted. Scheduled sessions (`isExtraSession: false`) must be canceled instead.

**Method Signature**:

```typescript
@Transactional()
async deleteSession(sessionId: string, actor: ActorUser): Promise<void>
```

**Detailed Flow**:

1. **Validate Deletion**:
   - Calls `sessionValidationService.validateSessionDeletion(sessionId)`
   - Validates session exists and is SCHEDULED
   - **NEW**: Validates session is an extra session (`isExtraSession: true`)
   - Throws error if scheduled session (must use cancel instead)
   - TODO: Check for payments/attendance (future implementation)

2. **Delete Session**:
   - Uses `sessionsRepository.remove(sessionId)`
   - Performs soft delete (if entity supports it) or hard delete

3. **Emit Event**:
   - Emits `SessionEvents.DELETED` with `SessionDeletedEvent`
   - Includes sessionId, actor, and centerId

**Error Cases**:

- Session not found → `ResourceNotFoundException` (thrown by validation service)
- Session not SCHEDULED → `BusinessLogicException` with 't.messages.cannotDeleteSession'
- **NEW**: Scheduled session (`isExtraSession: false`) → `BusinessLogicException` with 't.messages.cannotDeleteScheduledSession'
- TODO: Payments/attendance exist → `BusinessLogicException` (future implementation)

**Example Usage**:

```typescript
// Only works for extra sessions
await sessionsService.deleteSession('session-uuid-123', actorUser);

// For scheduled sessions, use cancel instead:
await sessionsService.cancelSession('session-uuid-123', actorUser);
```

**Edge Cases**:

- Uses soft delete if Session entity supports it (has `deletedAt` column), otherwise hard delete
- Validation happens before deletion, so if validation fails, session is not deleted
- Event is emitted even if session was soft-deleted (for audit trail)
- Scheduled sessions cannot be deleted (throws error with clear message)

**Design Rationale**:

- **Scheduled sessions** (`isExtraSession: false`) are the "system of record" - they represent the official curriculum and must remain in the database for audit purposes
- **Extra sessions** (`isExtraSession: true`) are manually created and can be completely removed if created by mistake
- This creates "Fixed Points" (scheduled) and "Flexible Points" (extra) in the schedule

**Future Enhancements**:

- Check for associated payments before deletion
- Check for attendance records before deletion
- Potentially cascade delete related records

**Related Methods**:

- `cancelSession()` - Alternative to deletion (marks as CANCELED instead of deleting, works for both scheduled and extra sessions)
- `validateSessionDeletion()` - Performs validation checks including isExtraSession check

---

##### 4. `cancelSession(sessionId: string, actor: ActorUser): Promise<Session>`

**Purpose**: Cancels a session by setting status to CANCELED.

**Method Signature**:

```typescript
@Transactional()
async cancelSession(sessionId: string, actor: ActorUser): Promise<Session>
```

**Parameters**:

- `sessionId` (string, required): UUID of the session to cancel
- `actor` (ActorUser, required): User performing the action

**Return Type**: `Promise<Session>` - The updated session entity with status CANCELED

**Decorators**: `@Transactional()` - Ensures atomicity

**Called By**: `SessionsController.cancelSession()`

**Calls**:

- `sessionsRepository.updateThrow(sessionId, { status: SessionStatus.CANCELED })`
- `typeSafeEventEmitter.emitAsync()`

**Detailed Flow**:

1. **Update Status**:
   - Uses `sessionsRepository.updateThrow()` to set `status = SessionStatus.CANCELED`

2. **Emit Event**:
   - Emits `SessionEvents.CANCELED` with `SessionCanceledEvent`
   - TODO: Trigger refund logic (future implementation)

3. **Return**: Updated session entity

**Note**: No validation on current status - any session can be canceled.

**Example Usage**:

```typescript
const canceledSession = await sessionsService.cancelSession(
  'session-uuid-123',
  actorUser,
);
// canceledSession.status === SessionStatus.CANCELED
```

**Edge Cases**:

- Can cancel sessions in any status (SCHEDULED, CONDUCTING, FINISHED)
- Does not check for conflicts or dependencies
- TODO: Should trigger refund logic for paid sessions (future implementation)

**Future Enhancements**:

- Integrate with payment module to trigger refunds
- Potentially send notifications to students/teacher
- Update related attendance records

**Related Methods**:

- `deleteSession()` - Alternative to cancellation (removes session entirely)
- `updateSession()` - Can also change status (but only for SCHEDULED sessions)

---

##### 5. `paginateSessions(paginateDto: PaginateSessionsDto, actor: ActorUser): Promise<Pagination<Session>>`

**Purpose**: Retrieves paginated list of sessions with filtering.

**Method Signature**:

```typescript
async paginateSessions(
  paginateDto: PaginateSessionsDto,
  actor: ActorUser,
): Promise<Pagination<Session>>
```

**Parameters**:

- `paginateDto` (PaginateSessionsDto, required): Contains pagination (page, limit) and filter parameters
- `actor` (ActorUser, required): User performing the action (used for center filtering)

**Return Type**: `Promise<Pagination<Session>>` - Paginated results with metadata

**Decorators**: None (read-only operation, no transaction needed)

**Called By**: `SessionsController.paginateSessions()`

**Calls**:

- `sessionsRepository.paginateSessions(paginateDto, actor)`

**Detailed Flow**:

1. **Delegate to Repository**:
   - Calls `sessionsRepository.paginateSessions(paginateDto, actor)`
   - Repository handles filtering, searching, sorting, and pagination

2. **Return**: Paginated results with metadata

**Filters Supported**:

- `groupId` (UUID, optional) - Filter by group
- `classId` (UUID, optional) - Filter by class (through group)
- `status` (SessionStatus enum, optional) - Filter by session status
- `startTimeFrom` (DateString, optional) - Filter sessions from date (ISO 8601)
- `startTimeTo` (DateString, optional) - Filter sessions until date (ISO 8601)
- `search` (string, optional) - Search in title field
- `page` (number, optional) - Page number (default: 1)
- `limit` (number, optional) - Items per page (default: 10)
- `sortBy` (string, optional) - Sort column (default: 'startTime')
- `sortOrder` ('ASC' | 'DESC', optional) - Sort direction (default: 'ASC')

**Example Usage**:

```typescript
// Get all sessions for a group
const result = await sessionsService.paginateSessions(
  { groupId: 'group-uuid-123', page: 1, limit: 20 },
  actorUser,
);

// Search sessions by title
const result = await sessionsService.paginateSessions(
  { search: 'Chemistry', status: SessionStatus.SCHEDULED },
  actorUser,
);

// Filter by date range
const result = await sessionsService.paginateSessions(
  {
    startTimeFrom: '2024-01-01T00:00:00Z',
    startTimeTo: '2024-01-31T23:59:59Z',
  },
  actorUser,
);
```

**Edge Cases**:

- Automatically filters by `actor.centerId` (center isolation)
- If no filters provided, returns all sessions for actor's center
- Search is case-insensitive and matches partial strings in title
- Date filters are inclusive (startTimeFrom <= session.startTime <= startTimeTo)

**Performance Considerations**:

- Uses database indexes on `groupId`, `startTime`, `status` for fast filtering
- Pagination limits result set size
- Joins are optimized with `leftJoin` and selective field loading

**Return Structure**:

```typescript
{
  items: Session[],           // Array of sessions
  meta: {
    totalItems: number,       // Total count matching filters
    itemCount: number,        // Items in current page
    itemsPerPage: number,     // Limit
    totalPages: number,       // Total pages
    currentPage: number       // Current page
  },
  links: {
    first: string,            // URL to first page
    last: string,             // URL to last page
    next: string,             // URL to next page (empty if last)
    previous: string          // URL to previous page (empty if first)
  }
}
```

**Related Methods**:

- `getSession()` - Gets single session by ID
- `sessionsRepository.paginateSessions()` - Repository method that performs actual query

---

##### 6. `getSession(sessionId: string, actor: ActorUser): Promise<Session>`

**Purpose**: Retrieves a single session with center access validation.

**Method Signature**:

```typescript
async getSession(sessionId: string, actor: ActorUser): Promise<Session>
```

**Parameters**:

- `sessionId` (string, required): UUID of the session to retrieve
- `actor` (ActorUser, required): User performing the action (used for center validation)

**Return Type**: `Promise<Session>` - The session entity

**Decorators**: None (read-only operation)

**Called By**: `SessionsController.getSession()`

**Calls**:

- `sessionsRepository.findOneOrThrow(sessionId)`
- `groupsRepository.findOne(session.groupId)`

**Detailed Flow**:

1. **Fetch Session**:
   - Uses `sessionsRepository.findOneOrThrow(sessionId)`

2. **Validate Center Access**:
   - Fetches group using `groupsRepository.findOne(session.groupId)`
   - Checks if `group.centerId === actor.centerId`
   - Throws `BusinessLogicException` if center mismatch

3. **Return**: Session entity

**Error Cases**:

- Session not found → `ResourceNotFoundException` (thrown by `findOneOrThrow`)
- Center mismatch → `BusinessLogicException` with 't.messages.withIdNotFound' (if group.centerId !== actor.centerId)
- Group not found → `BusinessLogicException` (if group doesn't exist)

**Example Usage**:

```typescript
const session = await sessionsService.getSession('session-uuid-123', actorUser);
```

**Edge Cases**:

- If session exists but group is deleted, throws error (group not found)
- Center validation ensures users can only access sessions from their center
- Returns full session entity with all fields

**Security**: Center isolation prevents cross-center data access

**Related Methods**:

- `paginateSessions()` - Gets multiple sessions with filtering
- `sessionsRepository.findOneOrThrow()` - Repository method for fetching

---

##### 7. `regenerateSessionsForScheduleItem(scheduleItemId: string, actor: ActorUser): Promise<void>`

**Purpose**: Regenerates sessions for a schedule item (deletes future SCHEDULED sessions and creates new ones).

**Method Signature**:

```typescript
@Transactional()
async regenerateSessionsForScheduleItem(
  scheduleItemId: string,
  actor: ActorUser,
): Promise<void>
```

**Parameters**:

- `scheduleItemId` (string, required): UUID of the schedule item to regenerate sessions for
- `actor` (ActorUser, required): User performing the action

**Return Type**: `Promise<void>` - No return value

**Decorators**: `@Transactional()` - Ensures atomicity of delete + create operations

**Called By**: `GroupEventsListener.handleGroupUpdated()` (when group is updated)

**Calls**:

- `scheduleItemsRepository.findByIdOrThrow(scheduleItemId, ['group'])`
- `sessionsRepository.findFutureScheduledSessionsByScheduleItem(scheduleItemId)`
- `sessionsRepository.remove()` (for each session to delete)
- `typeSafeEventEmitter.emitAsync()` (BULK_DELETED event)
- `sessionGenerationService.generateSessionsForGroup()` (regenerates sessions)
- `typeSafeEventEmitter.emitAsync()` (REGENERATED event)

**Detailed Flow**:

1. **Fetch Schedule Item**:
   - Uses `scheduleItemsRepository.findByIdOrThrow()` with `['group']` relation
   - Gets `groupId` from schedule item

2. **Find Future Sessions**:
   - Calls `sessionsRepository.findFutureScheduledSessionsByScheduleItem(scheduleItemId)`
   - Gets all future SCHEDULED sessions for this schedule item

3. **Filter Sessions to Delete**:
   - Filters out `isExtraSession: true` sessions (preserve manual sessions)
   - TODO: Filter out sessions linked to payments/attendance (future)

4. **Delete Sessions**:
   - Loops through filtered sessions
   - Calls `sessionsRepository.remove()` for each
   - Collects deleted session IDs

5. **Emit Bulk Deletion Event**:
   - If sessions were deleted, emits `SessionEvents.BULK_DELETED`
   - Uses `SessionsBulkDeletedEvent` with array of session IDs

6. **Regenerate Sessions**:
   - Calculates date range: now to 2 months from now
   - Calls `sessionGenerationService.generateSessionsForGroup()`
   - Generates new sessions based on updated schedule item

7. **Emit Regeneration Event**:
   - Emits `SessionEvents.REGENERATED` with `SessionsRegeneratedEvent`
   - Includes deletedCount, createdCount, scheduleItemId, groupId

**Key Design**:

- Preserves manual sessions (`isExtraSession: true`)
- Uses bulk events for performance
- Regenerates 2 months of sessions

**Example Usage**:

```typescript
// Called automatically when group is updated
await sessionsService.regenerateSessionsForScheduleItem(
  'schedule-item-uuid-123',
  actorUser,
);
```

**Edge Cases**:

- If no future SCHEDULED sessions exist, deletion step is skipped
- If schedule item has no schedule items, no sessions are generated
- Manual sessions (`isExtraSession: true`) are never deleted
- TODO: Should check for payments/attendance before deleting sessions (future)
- If generation fails after deletion, transaction rollback restores deleted sessions

**Performance Considerations**:

- Bulk deletion event instead of individual events
- Bulk insert for new sessions
- Transaction ensures data consistency

**Related Methods**:

- `sessionGenerationService.generateSessionsForGroup()` - Called to regenerate sessions
- `GroupEventsListener.handleGroupUpdated()` - Triggers this method

---

### SessionGenerationService (`session-generation.service.ts`)

**Purpose**: Handles automatic session generation from schedule items.

**File Location**: `src/modules/sessions/services/session-generation.service.ts`

**Class Declaration**: `export class SessionGenerationService extends BaseService`

**Dependencies**:

- `SessionsRepository` - Data access
- `SessionValidationService` - Conflict validation
- `TypeSafeEventEmitter` - Event emission
- `GroupsRepository` - Group data access

**Inheritance**: Extends `BaseService`

**Transaction Management**: Methods that generate sessions don't use `@Transactional()` directly, but are called from transactional contexts

---

#### Methods:

##### 1. `generateSessionsForGroup(groupId: string, startDate: Date, endDate: Date, actor: ActorUser): Promise<Session[]>`

**Purpose**: Generates sessions for a group within a date range based on schedule items.

**Method Signature**:

```typescript
async generateSessionsForGroup(
  groupId: string,
  startDate: Date,
  endDate: Date,
  actor: ActorUser,
): Promise<Session[]>
```

**Parameters**:

- `groupId` (string, required): UUID of the group to generate sessions for
- `startDate` (Date, required): Start date for generation (inclusive)
- `endDate` (Date, required): End date for generation (inclusive)
- `actor` (ActorUser, required): User/System performing the action

**Return Type**: `Promise<Session[]>` - Array of created sessions (may be empty)

**Called By**:

- `generateInitialSessionsForGroup()` - Initial generation
- `generateBufferSessionsForGroup()` - Buffer maintenance
- `SessionsService.regenerateSessionsForScheduleItem()` - Regeneration

**Calls**:

- `groupsRepository.findByIdOrThrow(groupId, ['class', 'scheduleItems'])`
- `getDatesForDayOfWeek()` (private method)
- `sessionValidationService.validateTeacherConflict()` (for each potential session)
- `sessionsRepository.findByGroupId()` (duplicate check)
- `sessionsRepository.bulkInsert()`
- `typeSafeEventEmitter.emitAsync()` (BULK_CREATED event)

**Detailed Flow**:

1. **Fetch Group with Relations**:
   - Uses `groupsRepository.findByIdOrThrow()` with `['class', 'scheduleItems']`
   - Gets class entity and schedule items

2. **Validate Prerequisites**:
   - Checks if class exists (should always exist)
   - Checks if schedule items exist (returns empty array if none)

3. **Extract Class Information**:
   - Gets `teacherUserProfileId` from `classEntity.teacherUserProfileId`
   - Gets `duration` (in minutes) from `classEntity.duration`

4. **Generate Sessions for Each Schedule Item**:
   - Loops through each schedule item
   - For each schedule item:
     - Gets all dates matching the day of week using `getDatesForDayOfWeek()`
     - For each date:
       - Calculates `sessionStartTime`: Date with hours/minutes from schedule item
       - Calculates `sessionEndTime`: Start time + duration
       - Validates teacher conflict (skips if conflict)
       - Checks for duplicate (same groupId + startTime) (skips if duplicate)
       - Adds to `sessionsToCreate` array

5. **Bulk Insert**:
   - Uses `sessionsRepository.bulkInsert()` to insert all sessions at once
   - More efficient than individual inserts

6. **Emit Bulk Event**:
   - If sessions were created, emits `SessionEvents.BULK_CREATED`
   - Uses `SessionsBulkCreatedEvent` with array of sessions
   - Single event instead of individual events for performance

7. **Return**: Array of created sessions

**Key Design Decisions**:

- Skips sessions with teacher conflicts (doesn't throw error)
- Skips duplicate sessions (same groupId + startTime)
- Uses bulk insert for performance
- Uses bulk event for performance

**Example Usage**:

```typescript
const startDate = new Date('2024-01-01');
const endDate = new Date('2024-03-01');
const sessions = await sessionGenerationService.generateSessionsForGroup(
  'group-uuid-123',
  startDate,
  endDate,
  actorUser,
);
// Returns array of created sessions
```

**Detailed Algorithm**:

1. For each schedule item in the group:
   - Get day of week (e.g., MONDAY)
   - Find all dates in range matching that day
   - For each matching date:
     - Calculate session start time (date + schedule item's time)
     - Calculate session end time (start + class duration)
     - Check teacher conflict → Skip if conflict
     - Check duplicate → Skip if duplicate
     - Add to sessionsToCreate array
2. Bulk insert all sessions
3. Emit bulk created event

**Edge Cases**:

- If group has no schedule items, returns empty array
- If all potential sessions have conflicts, returns empty array
- If date range has no matching days for schedule items, returns empty array
- Teacher conflict check is per-session, so some sessions may be created even if others conflict
- Duplicate check uses exact startTime match (same groupId + same startTime)

**Performance Considerations**:

- Bulk insert is more efficient than individual inserts
- Conflict checks are done before insert (avoids database constraint violations)
- Bulk event reduces event overhead

**Time Calculation Example**:

```typescript
// Schedule item: Monday, 14:30
// Date: 2024-01-15 (Monday)
// Result: 2024-01-15T14:30:00

// Class duration: 120 minutes
// End time: 2024-01-15T16:30:00
```

**Related Methods**:

- `getDatesForDayOfWeek()` - Helper method for date calculation
- `validateTeacherConflict()` - Used for conflict checking

---

##### 2. `generateInitialSessionsForGroup(groupId: string, actor: ActorUser): Promise<Session[]>`

**Purpose**: Generates initial sessions when a class becomes ACTIVE (2 months from start date).

**Method Signature**:

```typescript
async generateInitialSessionsForGroup(
  groupId: string,
  actor: ActorUser,
): Promise<Session[]>
```

**Parameters**:

- `groupId` (string, required): UUID of the group
- `actor` (ActorUser, required): User/System performing the action

**Return Type**: `Promise<Session[]>` - Array of created sessions

**Called By**: `ClassEventsListener.handleClassStatusChanged()` (when class becomes ACTIVE)

**Calls**:

- `groupsRepository.findByIdOrThrow(groupId, ['class'])`
- `generateSessionsForGroup()` (delegates to main generation method)

**Detailed Flow**:

1. **Fetch Group with Class**:
   - Uses `groupsRepository.findByIdOrThrow()` with `['class']`
   - Gets class entity

2. **Calculate Start Date**:
   - Uses `Math.max(classEntity.startDate, new Date())`
   - Ensures start date is not in the past

3. **Calculate End Date**:
   - Sets end date to 2 months from start date

4. **Delegate to generateSessionsForGroup**:
   - Calls `generateSessionsForGroup(groupId, startDate, endDate, actor)`

**Use Case**: Called when class transitions from NOT_STARTED to ACTIVE.

**Example Usage**:

```typescript
// Automatically called by ClassEventsListener
const sessions = await sessionGenerationService.generateInitialSessionsForGroup(
  'group-uuid-123',
  actorUser,
);
```

**Edge Cases**:

- If class startDate is in the past, uses current date instead
- If class startDate is in the future, uses class startDate
- Always generates 2 months from the calculated start date
- If class has no groups, this method is not called

**Date Calculation Logic**:

```typescript
const startDate = Math.max(
  classEntity.startDate.getTime(),
  new Date().getTime(),
);
// Ensures we don't generate sessions in the past
```

**Related Methods**:

- `generateSessionsForGroup()` - Performs actual generation
- `ClassEventsListener.handleClassStatusChanged()` - Triggers this method

---

##### 3. `generateBufferSessionsForGroup(groupId: string, actor: ActorUser): Promise<Session[]>`

**Purpose**: Generates buffer sessions to maintain 4 weeks of future sessions.

**Method Signature**:

```typescript
async generateBufferSessionsForGroup(
  groupId: string,
  actor: ActorUser,
): Promise<Session[]>
```

**Parameters**:

- `groupId` (string, required): UUID of the group
- `actor` (ActorUser, required): User/System performing the action

**Return Type**: `Promise<Session[]>` - Array of created sessions (may be empty if buffer is sufficient)

**Called By**: `SessionGenerationMaintenanceJob.handleCron()` (weekly maintenance)

**Calls**:

- `groupsRepository.findByIdOrThrow(groupId, ['scheduleItems'])`
- `sessionsRepository.findByGroupId()` (check current buffer)
- `generateSessionsForGroup()` (if buffer is insufficient)

**Detailed Flow**:

1. **Fetch Group with Schedule Items**:
   - Uses `groupsRepository.findByIdOrThrow()` with `['scheduleItems']`
   - Gets schedule items

2. **Calculate Required Sessions**:
   - `requiredSessions = scheduleItems.length * 4`
   - Each schedule item should have 4 sessions (4 weeks ahead)

3. **Check Current Buffer**:
   - Calculates `fourWeeksFromNow = now + 28 days`
   - Fetches future sessions using `sessionsRepository.findByGroupId()` with date range
   - Compares `futureSessions.length` with `requiredSessions`

4. **Early Return**:
   - If `futureSessions.length >= requiredSessions`, returns empty array

5. **Calculate Generation Range**:
   - `startDate`: Day after latest session, or now if no sessions
   - `endDate`: 4 weeks from now

6. **Generate Sessions**:
   - Calls `generateSessionsForGroup(groupId, startDate, endDate, actor)`

**Key Design**:

- Calculates required sessions based on schedule items count (not hardcoded)
- Only generates if buffer is insufficient
- Maintains 4-week buffer

**Example Usage**:

```typescript
// Called by maintenance job
const sessions = await sessionGenerationService.generateBufferSessionsForGroup(
  'group-uuid-123',
  systemActor,
);
```

**Buffer Calculation Logic**:

```typescript
// If group has 3 schedule items (Mon, Wed, Fri)
// Required sessions = 3 * 4 = 12 sessions (4 weeks * 3 days/week)

// If group has 1 schedule item (Monday only)
// Required sessions = 1 * 4 = 4 sessions (4 weeks * 1 day/week)
```

**Edge Cases**:

- If group has no schedule items, returns empty array immediately
- If buffer is already sufficient, returns empty array (no generation needed)
- If no future sessions exist, starts generation from tomorrow
- If some future sessions exist, starts generation from day after latest session
- Always generates up to 4 weeks from now (not from latest session)

**Performance Considerations**:

- Early return if buffer is sufficient (avoids unnecessary generation)
- Only queries future sessions in 4-week window (not all sessions)

**Related Methods**:

- `generateSessionsForGroup()` - Performs actual generation
- `SessionGenerationMaintenanceJob.handleCron()` - Triggers this method

---

##### 4. `getDatesForDayOfWeek(startDate: Date, endDate: Date, dayOfWeek: DayOfWeek): Date[]` (Private)

**Purpose**: Gets all dates matching a specific day of week within a date range.

**Method Signature**:

```typescript
private getDatesForDayOfWeek(
  startDate: Date,
  endDate: Date,
  dayOfWeek: DayOfWeek,
): Date[]
```

**Parameters**:

- `startDate` (Date, required): Start date (inclusive)
- `endDate` (Date, required): End date (inclusive)
- `dayOfWeek` (DayOfWeek enum, required): Day to match (MON, TUE, WED, etc.)

**Return Type**: `Date[]` - Array of dates matching the day of week

**Visibility**: Private (only used internally)

**Called By**: `generateSessionsForGroup()` (for each schedule item)

**Algorithm**:

1. Maps DayOfWeek enum to JavaScript day numbers (0-6, where 0=Sunday)
2. Iterates through each day from startDate to endDate
3. Checks if current day matches target day
4. Adds matching dates to array
5. Returns array of matching dates

**Detailed Flow**:

1. **Initialize**:
   - Creates empty `dates` array
   - Maps `DayOfWeek` enum to JavaScript day numbers (0-6)
   - Gets target day number

2. **Iterate Through Dates**:
   - Starts from `startDate`
   - Loops while `currentDate <= endDate`
   - Checks if `currentDate.getDay() === targetDay`
   - If match, adds copy of date to array
   - Increments date by 1 day

3. **Return**: Array of matching dates

**Example**: If `dayOfWeek = MON` and range is Jan 1-31, returns all Mondays in January.

**Day Mapping**:

```typescript
const dayMap = {
  [DayOfWeek.MON]: 1, // Monday
  [DayOfWeek.TUE]: 2, // Tuesday
  [DayOfWeek.WED]: 3, // Wednesday
  [DayOfWeek.THU]: 4, // Thursday
  [DayOfWeek.FRI]: 5, // Friday
  [DayOfWeek.SAT]: 6, // Saturday
  [DayOfWeek.SUN]: 0, // Sunday
};
```

**Example Usage**:

```typescript
// Get all Mondays in January 2024
const mondays = this.getDatesForDayOfWeek(
  new Date('2024-01-01'),
  new Date('2024-01-31'),
  DayOfWeek.MON,
);
// Returns: [2024-01-01, 2024-01-08, 2024-01-15, 2024-01-22, 2024-01-29]
```

**Edge Cases**:

- If startDate is after endDate, returns empty array
- If startDate equals endDate and it matches the day, returns array with one date
- Creates new Date objects (doesn't mutate input dates)
- Handles timezone correctly (uses local timezone)

**Performance Considerations**:

- Linear time complexity O(n) where n = days in range
- Creates new Date objects for each match (memory consideration for large ranges)

**Related Methods**:

- `generateSessionsForGroup()` - Uses this method for each schedule item

---

### SessionValidationService (`session-validation.service.ts`)

**Purpose**: Validates session operations (conflicts, deletion rules).

**File Location**: `src/modules/sessions/services/session-validation.service.ts`

**Class Declaration**: `export class SessionValidationService extends BaseService`

**Dependencies**:

- `SessionsRepository` - Data access

**Inheritance**: Extends `BaseService`

**Transaction Management**: No transactions (read-only validation methods)

---

#### Methods:

##### 1. `validateTeacherConflict(teacherUserProfileId: string, startTime: Date, endTime: Date, excludeSessionId?: string): Promise<{ sessionId: string; startTime: Date; endTime: Date } | null>`

**Purpose**: Validates if a teacher has overlapping sessions.

**Method Signature**:

```typescript
async validateTeacherConflict(
  teacherUserProfileId: string,
  startTime: Date,
  endTime: Date,
  excludeSessionId?: string,
): Promise<{ sessionId: string; startTime: Date; endTime: Date } | null>
```

**Parameters**:

- `teacherUserProfileId` (string, required): UUID of the teacher's user profile
- `startTime` (Date, required): Proposed session start time
- `endTime` (Date, required): Proposed session end time
- `excludeSessionId` (string, optional): Session ID to exclude from check (used for updates)

**Return Type**: `Promise<{ sessionId: string; startTime: Date; endTime: Date } | null>`

- Returns conflict object if conflict found, `null` if no conflict

**Called By**:

- `SessionsService.createExtraSession()` - Before creating session
- `SessionsService.updateSession()` - When updating session time
- `SessionGenerationService.generateSessionsForGroup()` - During generation

**Calls**:

- `sessionsRepository.findOverlappingSessions(teacherUserProfileId, startTime, endTime, excludeSessionId)`

**Detailed Flow**:

1. **Find Overlapping Sessions**:
   - Calls `sessionsRepository.findOverlappingSessions()`
   - Joins through group and class to find sessions with same teacher
   - Checks time overlap: `(startTime < newEndTime AND endTime > newStartTime)`
   - Excludes session if `excludeSessionId` provided

2. **Return Conflict**:
   - If overlapping sessions found, returns first conflict with:
     - `sessionId`: ID of conflicting session
     - `startTime`, `endTime`: Times of conflicting session
   - Returns `null` if no conflict

**Time Overlap Logic**:

- Two time ranges overlap if: `range1.start < range2.end AND range1.end > range2.start`
- Example: [10:00-12:00] overlaps with [11:00-13:00]

**Example Usage**:

```typescript
// Check for conflict before creating session
const conflict = await sessionValidationService.validateTeacherConflict(
  'teacher-profile-uuid-123',
  new Date('2024-01-15T14:30:00Z'),
  new Date('2024-01-15T16:30:00Z'),
);

if (conflict) {
  throw new BusinessLogicException('Teacher has conflicting session');
}

// Check for conflict when updating (exclude current session)
const conflict = await sessionValidationService.validateTeacherConflict(
  'teacher-profile-uuid-123',
  new Date('2024-01-15T15:00:00Z'),
  new Date('2024-01-15T17:00:00Z'),
  'current-session-uuid', // Exclude this session from check
);
```

**Overlap Examples**:

```typescript
// Session 1: 10:00 - 12:00
// Session 2: 11:00 - 13:00
// Overlap: YES (11:00-12:00)

// Session 1: 10:00 - 12:00
// Session 2: 12:00 - 14:00
// Overlap: NO (touching but not overlapping)

// Session 1: 10:00 - 12:00
// Session 2: 09:00 - 11:00
// Overlap: YES (10:00-11:00)

// Session 1: 10:00 - 12:00
// Session 2: 08:00 - 09:00
// Overlap: NO (completely separate)
```

**Edge Cases**:

- If `excludeSessionId` is provided, that session is excluded from conflict check (used for updates)
- Returns first conflict found (there may be multiple)
- Returns `null` if no conflicts (not an error condition)
- Query joins through session → group → class to find teacher

**Performance Considerations**:

- Single database query with join
- Uses time overlap condition in WHERE clause (efficient)
- Index on `startTime` helps with query performance

**Related Methods**:

- `sessionsRepository.findOverlappingSessions()` - Performs actual query
- `validateGroupConflict()` - Similar validation for groups

---

##### 2. `validateGroupConflict(groupId: string, startTime: Date, endTime: Date, excludeSessionId?: string): Promise<{ sessionId: string; startTime: Date; endTime: Date } | null>`

**Purpose**: Validates if a group has overlapping sessions.

**Method Signature**:

```typescript
async validateGroupConflict(
  groupId: string,
  startTime: Date,
  endTime: Date,
  excludeSessionId?: string,
): Promise<{ sessionId: string; startTime: Date; endTime: Date } | null>
```

**Parameters**:

- `groupId` (string, required): UUID of the group
- `startTime` (Date, required): Proposed session start time
- `endTime` (Date, required): Proposed session end time
- `excludeSessionId` (string, optional): Session ID to exclude from check

**Return Type**: `Promise<{ sessionId: string; startTime: Date; endTime: Date } | null>`

- Returns conflict object if conflict found, `null` if no conflict

**Called By**:

- `SessionsService.createExtraSession()` - Before creating session
- `SessionsService.updateSession()` - When updating session time

**Calls**:

- `sessionsRepository.findOverlappingSessionsByGroup(groupId, startTime, endTime, excludeSessionId)`

**Detailed Flow**:

1. **Find Overlapping Sessions**:
   - Calls `sessionsRepository.findOverlappingSessionsByGroup()`
   - Finds sessions in same group with overlapping times
   - Excludes session if `excludeSessionId` provided

2. **Return Conflict**:
   - If overlapping sessions found, returns first conflict
   - Returns `null` if no conflict

**Use Case**: Prevents creating two sessions for the same group at overlapping times.

**Example Usage**:

```typescript
// Check for group conflict before creating session
const conflict = await sessionValidationService.validateGroupConflict(
  'group-uuid-123',
  new Date('2024-01-15T14:30:00Z'),
  new Date('2024-01-15T16:30:00Z'),
);

if (conflict) {
  throw new BusinessLogicException('Group has conflicting session');
}
```

**Difference from Teacher Conflict**:

- Teacher conflict: Checks across all groups (teacher might teach multiple groups)
- Group conflict: Checks only within the same group
- Both validations are performed for extra sessions

**Edge Cases**:

- If `excludeSessionId` is provided, that session is excluded (used for updates)
- Returns first conflict found
- Returns `null` if no conflicts
- Query is simpler than teacher conflict (no join needed)

**Performance Considerations**:

- Direct query on sessions table (no joins)
- Uses index on `groupId` and `startTime`
- Time overlap condition in WHERE clause

**Related Methods**:

- `sessionsRepository.findOverlappingSessionsByGroup()` - Performs actual query
- `validateTeacherConflict()` - Similar validation for teachers

---

##### 3. `validateSessionDeletion(sessionId: string): Promise<void>`

**Purpose**: Validates if a session can be deleted. Only extra sessions (`isExtraSession: true`) can be deleted.

**Method Signature**:

```typescript
async validateSessionDeletion(sessionId: string): Promise<void>
```

**Parameters**:

- `sessionId` (string, required): UUID of the session to validate

**Return Type**: `Promise<void>` - Throws exception if validation fails, returns void if valid

**Called By**: `SessionsService.deleteSession()` - Before deleting session

**Calls**:

- `sessionsRepository.findOneOrThrow(sessionId)`

**Detailed Flow**:

1. **Fetch Session**:
   - Uses `sessionsRepository.findOneOrThrow(sessionId)`

2. **Validate Status**:
   - Checks if `session.status === SessionStatus.SCHEDULED`
   - Throws `BusinessLogicException` if not SCHEDULED

3. **Validate Session Type**:
   - **NEW**: Checks if `session.isExtraSession === true`
   - Throws `BusinessLogicException` with 't.messages.cannotDeleteScheduledSession' if scheduled session
   - Only extra sessions can be deleted (scheduled sessions must be canceled)

4. **TODO Validations** (Future):
   - Check if payments exist
   - Check if attendance exists
   - Throw exception if dependencies exist

**Error Cases**:

- Session not found → `ResourceNotFoundException` (thrown by `findOneOrThrow`)
- Status not SCHEDULED → `BusinessLogicException` with 't.messages.cannotDeleteSession'
- **NEW**: Scheduled session (`isExtraSession: false`) → `BusinessLogicException` with 't.messages.cannotDeleteScheduledSession'

**Example Usage**:

```typescript
// Validate before deletion
await sessionValidationService.validateSessionDeletion('session-uuid-123');
// If validation passes, proceed with deletion
```

**Validation Rules**:

1. Session must exist
2. Session status must be `SCHEDULED`
3. TODO: Check for payments (future)
4. TODO: Check for attendance (future)

**Edge Cases**:

- If session is CONDUCTING, FINISHED, or CANCELED, throws exception
- Only SCHEDULED sessions can be deleted (prevents deleting sessions in progress or completed)
- TODO: Future implementation will check for payment/attendance dependencies

**Future Enhancements**:

```typescript
// Planned implementation
if (hasPayments(sessionId)) {
  throw new BusinessLogicException('Cannot delete session with payments');
}
if (hasAttendance(sessionId)) {
  throw new BusinessLogicException('Cannot delete session with attendance');
}
```

**Related Methods**:

- `SessionsService.deleteSession()` - Uses this validation before deletion
- `sessionsRepository.findOneOrThrow()` - Fetches session for validation

---

## Repositories

### SessionsRepository (`sessions.repository.ts`)

**Purpose**: Data access layer for sessions.

**File Location**: `src/modules/sessions/repositories/sessions.repository.ts`

**Class Declaration**: `export class SessionsRepository extends BaseRepository<Session>`

**Extends**: `BaseRepository<Session>` (provides CRUD operations, pagination, bulk operations)

**Key Design**: Uses generic `findSessions()` method to reduce method explosion.

**Transaction Management**: Inherits from BaseRepository, uses TransactionHost for transaction context

---

#### Methods:

##### 1. `findSessions(filters: Filters, relations?: string[]): Promise<Session[]>` (Private)

**Purpose**: Generic method to find sessions with flexible filters and relations.

**Method Signature**:

```typescript
private async findSessions(
  filters: {
    groupId?: string;
    scheduleItemId?: string;
    status?: SessionStatus;
    startTimeFrom?: Date;
    startTimeTo?: Date;
    startTimeAfter?: Date;
    excludeSessionId?: string;
  },
  relations?: string[],
): Promise<Session[]>
```

**Parameters**:

- `filters` (object, required): Filter criteria (all fields optional)
  - `groupId` (string, optional): Filter by group ID
  - `scheduleItemId` (string, optional): Filter by schedule item ID
  - `status` (SessionStatus, optional): Filter by status
  - `startTimeFrom` (Date, optional): Filter sessions from this date (inclusive)
  - `startTimeTo` (Date, optional): Filter sessions until this date (inclusive)
  - `startTimeAfter` (Date, optional): Filter sessions after this date (exclusive)
  - `excludeSessionId` (string, optional): Exclude this session ID from results
- `relations` (string[], optional): Array of relation names to load (e.g., `['group', 'group.class']`)

**Return Type**: `Promise<Session[]>` - Array of sessions matching filters

**Visibility**: Private (only used internally by other repository methods)

**Called By**: All public find methods delegate to this method

**Parameters**:

- `filters`: Object with optional filters (groupId, scheduleItemId, status, startTimeFrom, startTimeTo, startTimeAfter, excludeSessionId)
- `relations`: Optional array of relation names to load

**Detailed Flow**:

1. **Create Query Builder**:
   - Uses `getRepository().createQueryBuilder('session')`

2. **Load Relations** (if provided):
   - Loops through relations array
   - Uses `leftJoinAndSelect()` for each relation
   - Supports nested relations (e.g., `'group.class'`)

3. **Apply Filters**:
   - Adds `andWhere()` clauses for each provided filter
   - Uses parameterized queries for safety

4. **Order and Return**:
   - Orders by `startTime ASC`
   - Returns array of sessions

**Benefits**:

- Reduces code duplication
- Allows adding new relations without modifying multiple methods
- Flexible filtering

**Query Builder Pattern**:

```typescript
// Example query generated:
SELECT session.*
FROM sessions session
LEFT JOIN groups group ON session."groupId" = group.id
WHERE session."groupId" = :groupId
  AND session.status = :status
  AND session."startTime" >= :startTimeFrom
  AND session."startTime" <= :startTimeTo
ORDER BY session."startTime" ASC
```

**Relation Loading**:

- Supports nested relations: `['group', 'group.class', 'scheduleItem']`
- Uses `leftJoinAndSelect()` to eagerly load relations
- Relations are loaded only if specified

**Performance Considerations**:

- Uses parameterized queries (SQL injection safe)
- Applies filters in WHERE clause (database-level filtering)
- Orders by startTime (uses index)

**Example Usage** (internal):

```typescript
// Called by findByGroupId
this.findSessions({ groupId: 'uuid', status: SessionStatus.SCHEDULED }, [
  'group',
  'scheduleItem',
]);
```

---

##### 2. `findOverlappingSessionsByGroup(groupId: string, startTime: Date, endTime: Date, excludeSessionId?: string): Promise<Session[]>`

**Purpose**: Finds overlapping sessions within a group.

**Method Signature**:

```typescript
async findOverlappingSessionsByGroup(
  groupId: string,
  startTime: Date,
  endTime: Date,
  excludeSessionId?: string,
): Promise<Session[]>
```

**Parameters**:

- `groupId` (string, required): UUID of the group
- `startTime` (Date, required): Start time of proposed session
- `endTime` (Date, required): End time of proposed session
- `excludeSessionId` (string, optional): Session ID to exclude from results

**Return Type**: `Promise<Session[]>` - Array of overlapping sessions

**Called By**: `SessionValidationService.validateGroupConflict()`

**SQL Query**:

```sql
SELECT session.*
FROM sessions session
WHERE session."groupId" = :groupId
  AND (session."startTime" < :endTime AND session."endTime" > :startTime)
  AND session.id != :excludeSessionId  -- if excludeSessionId provided
```

**Detailed Flow**:

1. **Create Query**:
   - Filters by `groupId`
   - Checks time overlap: `(startTime < endTime AND endTime > startTime)`
   - Excludes session if `excludeSessionId` provided

2. **Return**: Array of overlapping sessions

**Use Case**: Group conflict validation.

**Time Overlap Condition**:

```typescript
// SQL condition: (startTime < newEndTime AND endTime > newStartTime)
// This catches all overlapping scenarios:
// - Partial overlap (start before, end during)
// - Partial overlap (start during, end after)
// - Complete containment (start before, end after)
// - Complete containment (start during, end during)
```

**Example Usage**:

```typescript
const overlapping = await sessionsRepository.findOverlappingSessionsByGroup(
  'group-uuid-123',
  new Date('2024-01-15T14:30:00Z'),
  new Date('2024-01-15T16:30:00Z'),
);
// Returns sessions that overlap with 14:30-16:30 time slot
```

**Edge Cases**:

- If `excludeSessionId` is provided, that session is excluded (used for updates)
- Returns empty array if no overlaps found
- Returns all overlapping sessions (not just first)

**Performance Considerations**:

- Direct query on sessions table (no joins needed)
- Uses index on `groupId` and `startTime`
- Time overlap condition is efficient (database-level calculation)

**Related Methods**:

- `SessionValidationService.validateGroupConflict()` - Uses this method
- `findOverlappingSessions()` - Similar method for teacher conflicts

---

##### 3. `paginateSessions(paginateDto: PaginateSessionsDto, actor: ActorUser): Promise<Pagination<Session>>`

**Purpose**: Paginates sessions with filtering and search.

**Method Signature**:

```typescript
async paginateSessions(
  paginateDto: PaginateSessionsDto,
  actor: ActorUser,
): Promise<Pagination<Session>>
```

**Parameters**:

- `paginateDto` (PaginateSessionsDto, required): Pagination and filter parameters
- `actor` (ActorUser, required): User performing the action (for center filtering)

**Return Type**: `Promise<Pagination<Session>>` - Paginated results with metadata

**Called By**: `SessionsService.paginateSessions()`

**Calls**:

- `BaseRepository.paginate()` - Inherited pagination method

**Detailed Flow**:

1. **Create Query Builder**:
   - Joins `session.group` and `group.class`
   - Filters by `group.centerId = actor.centerId` (center isolation)

2. **Apply Filters**:
   - `groupId`: Filter by group
   - `classId`: Filter by class (through group)
   - `status`: Filter by status
   - `startTimeFrom`: Filter from date
   - `startTimeTo`: Filter until date

3. **Paginate**:
   - Uses `BaseRepository.paginate()` method
   - Searchable columns: `['title']`
   - Sortable columns: `['startTime', 'endTime', 'createdAt', 'updatedAt']`
   - Default sort: `['startTime', 'ASC']`

4. **Return**: Paginated results with metadata

---

##### 4. `findByGroupId(groupId: string, options?: Options, relations?: string[]): Promise<Session[]>`

**Purpose**: Finds sessions by group ID with optional filters.

**Method Signature**:

```typescript
async findByGroupId(
  groupId: string,
  options?: {
    status?: SessionStatus;
    startTimeFrom?: Date;
    startTimeTo?: Date;
  },
  relations?: string[],
): Promise<Session[]>
```

**Parameters**:

- `groupId` (string, required): UUID of the group
- `options` (object, optional): Additional filters
  - `status` (SessionStatus, optional): Filter by status
  - `startTimeFrom` (Date, optional): Filter from date
  - `startTimeTo` (Date, optional): Filter until date
- `relations` (string[], optional): Relations to load

**Return Type**: `Promise<Session[]>` - Array of sessions

**Implementation**: Delegates to `findSessions()` with groupId filter

**Called By**:

- `SessionGenerationService.generateSessionsForGroup()` - Check for duplicates
- `SessionGenerationService.generateBufferSessionsForGroup()` - Check current buffer
- Various service methods

**Example Usage**:

```typescript
// Get all sessions for a group
const sessions = await sessionsRepository.findByGroupId('group-uuid-123');

// Get future SCHEDULED sessions
const future = await sessionsRepository.findByGroupId('group-uuid-123', {
  status: SessionStatus.SCHEDULED,
  startTimeFrom: new Date(),
});

// Get sessions with relations loaded
const withRelations = await sessionsRepository.findByGroupId(
  'group-uuid-123',
  undefined,
  ['group', 'scheduleItem'],
);
```

**Performance Considerations**:

- Uses index on `groupId`
- Uses index on `startTime` if date filters provided
- Results ordered by startTime ASC

---

##### 5. `findFutureScheduledSessionsByScheduleItem(scheduleItemId: string, relations?: string[]): Promise<Session[]>`

**Purpose**: Finds future SCHEDULED sessions for a schedule item.

**Method Signature**:

```typescript
async findFutureScheduledSessionsByScheduleItem(
  scheduleItemId: string,
  relations?: string[],
): Promise<Session[]>
```

**Parameters**:

- `scheduleItemId` (string, required): UUID of the schedule item
- `relations` (string[], optional): Relations to load

**Return Type**: `Promise<Session[]>` - Array of future SCHEDULED sessions

**Implementation**: Delegates to `findSessions()` with:

- `scheduleItemId`: Provided ID
- `status`: `SessionStatus.SCHEDULED`
- `startTimeAfter`: Current time

**Called By**: `SessionsService.regenerateSessionsForScheduleItem()` - Find sessions to delete

**Example Usage**:

```typescript
const futureSessions =
  await sessionsRepository.findFutureScheduledSessionsByScheduleItem(
    'schedule-item-uuid-123',
  );
// Returns all SCHEDULED sessions with startTime > now for this schedule item
```

**Use Case**: Session regeneration (find sessions to delete before regenerating)

**Performance Considerations**:

- Uses index on `scheduleItemId`
- Uses index on `status`
- Uses index on `startTime`
- Filters at database level (efficient)

---

##### 6. `findOverlappingSessions(teacherUserProfileId: string, startTime: Date, endTime: Date, excludeSessionId?: string, relations?: string[]): Promise<Session[]>`

**Purpose**: Finds overlapping sessions for a teacher.

**Detailed Flow**:

1. **Create Query**:
   - Joins `session.group` and `group.class`
   - Filters by `class.teacherUserProfileId`
   - Checks time overlap
   - Excludes session if provided

2. **Load Relations** (if provided):
   - Uses `leftJoinAndSelect()` for each relation

3. **Return**: Array of overlapping sessions

**Use Case**: Teacher conflict validation.

**SQL Query**:

```sql
SELECT session.*
FROM sessions session
LEFT JOIN groups group ON session."groupId" = group.id
LEFT JOIN classes class ON group."classId" = class.id
WHERE class."teacherUserProfileId" = :teacherUserProfileId
  AND (session."startTime" < :endTime AND session."endTime" > :startTime)
  AND session.id != :excludeSessionId  -- if provided
```

**Example Usage**:

```typescript
const overlapping = await sessionsRepository.findOverlappingSessions(
  'teacher-profile-uuid-123',
  new Date('2024-01-15T14:30:00Z'),
  new Date('2024-01-15T16:30:00Z'),
  'current-session-uuid', // exclude this session
);
```

**Performance Considerations**:

- Requires join through group and class (more expensive than group conflict)
- Uses indexes on foreign keys
- Time overlap condition in WHERE clause

---

##### 7. `findSessionsByGroupAndDateRange(groupId: string, startDate: Date, endDate: Date, relations?: string[]): Promise<Session[]>`

**Purpose**: Finds sessions by group and date range.

**Method Signature**:

```typescript
async findSessionsByGroupAndDateRange(
  groupId: string,
  startDate: Date,
  endDate: Date,
  relations?: string[],
): Promise<Session[]>
```

**Parameters**:

- `groupId` (string, required): UUID of the group
- `startDate` (Date, required): Start date (inclusive)
- `endDate` (Date, required): End date (inclusive)
- `relations` (string[], optional): Relations to load

**Return Type**: `Promise<Session[]>` - Array of sessions in date range

**Implementation**: Delegates to `findSessions()` with groupId and date range filters

**Example Usage**:

```typescript
const janSessions = await sessionsRepository.findSessionsByGroupAndDateRange(
  'group-uuid-123',
  new Date('2024-01-01'),
  new Date('2024-01-31'),
);
```

---

##### 8. `findFutureScheduledSessionsByGroup(groupId: string, relations?: string[]): Promise<Session[]>`

**Purpose**: Finds future SCHEDULED sessions for a group.

**Method Signature**:

```typescript
async findFutureScheduledSessionsByGroup(
  groupId: string,
  relations?: string[],
): Promise<Session[]>
```

**Parameters**:

- `groupId` (string, required): UUID of the group
- `relations` (string[], optional): Relations to load

**Return Type**: `Promise<Session[]>` - Array of future SCHEDULED sessions

**Implementation**: Delegates to `findSessions()` with:

- `groupId`: Provided ID
- `status`: `SessionStatus.SCHEDULED`
- `startTimeAfter`: Current time

**Example Usage**:

```typescript
const future =
  await sessionsRepository.findFutureScheduledSessionsByGroup('group-uuid-123');
```

---

##### 9. `countFutureSessionsByGroup(groupId: string): Promise<number>`

**Purpose**: Counts future sessions for a group.

**Method Signature**:

```typescript
async countFutureSessionsByGroup(groupId: string): Promise<number>
```

**Parameters**:

- `groupId` (string, required): UUID of the group

**Return Type**: `Promise<number>` - Count of future sessions

**Implementation**: Direct query counting sessions with `groupId` and `startTime > now`

**SQL Query**:

```sql
SELECT COUNT(*)
FROM sessions session
WHERE session."groupId" = :groupId
  AND session."startTime" > :now
```

**Example Usage**:

```typescript
const count =
  await sessionsRepository.countFutureSessionsByGroup('group-uuid-123');
```

**Performance Considerations**:

- Uses COUNT() (efficient, doesn't load data)
- Uses index on `groupId` and `startTime`

---

##### 10. `deleteFutureScheduledSessionsByGroup(groupId: string): Promise<void>`

**Purpose**: Deletes all future SCHEDULED sessions for a group.

**Method Signature**:

```typescript
async deleteFutureScheduledSessionsByGroup(groupId: string): Promise<void>
```

**Parameters**:

- `groupId` (string, required): UUID of the group

**Return Type**: `Promise<void>` - No return value

**Implementation**: Direct delete query with filters:

- `groupId`: Provided ID
- `status`: `SessionStatus.SCHEDULED`
- `startTime > now`

**SQL Query**:

```sql
DELETE FROM sessions
WHERE "groupId" = :groupId
  AND status = 'SCHEDULED'
  AND "startTime" > :now
```

**Example Usage**:

```typescript
await sessionsRepository.deleteFutureScheduledSessionsByGroup('group-uuid-123');
```

**Note**: Currently not used in codebase, but available for future use cases

---

##### 11. `deleteScheduledSessionsForHardLockedClasses(): Promise<number>`

**Purpose**: Deletes SCHEDULED sessions for classes that are CANCELED/FINISHED for >24 hours.

**Detailed Flow**:

1. **Calculate Time Threshold**:
   - `twentyFourHoursAgo = now - 24 hours`

2. **Delete with Subquery**:
   - Uses subquery to find groups in hard-locked classes:
     ```sql
     SELECT g.id FROM groups g
     INNER JOIN classes c ON g."classId" = c.id
     WHERE c.status IN ('CANCELED', 'FINISHED')
     AND c."updatedAt" < :twentyFourHoursAgo
     ```
   - Deletes sessions where `groupId IN (subquery)` and `status = 'SCHEDULED'`

3. **Return**: Count of deleted sessions

**Method Signature**:

```typescript
async deleteScheduledSessionsForHardLockedClasses(): Promise<number>
```

**Parameters**: None

**Return Type**: `Promise<number>` - Count of deleted sessions

**Called By**: `SessionCleanupJob.handleCron()` (daily cleanup)

**SQL Query**:

```sql
DELETE FROM sessions
WHERE status = 'SCHEDULED'
  AND "groupId" IN (
    SELECT g.id
    FROM groups g
    INNER JOIN classes c ON g."classId" = c.id
    WHERE c.status IN ('CANCELED', 'FINISHED')
      AND c."updatedAt" < :twentyFourHoursAgo
  )
```

**Key Design**:

- Uses subquery for efficiency (database-level filtering)
- Preserves FINISHED, CONDUCTING, CANCELED sessions (historical records)
- Only deletes SCHEDULED sessions
- 24-hour grace period allows class status reversal

**Example Usage**:

```typescript
const deletedCount =
  await sessionsRepository.deleteScheduledSessionsForHardLockedClasses();
// Returns number of sessions deleted
```

**Edge Cases**:

- If no hard-locked classes exist, returns 0
- If classes were updated within 24 hours, sessions are not deleted (grace period)
- Only SCHEDULED sessions are deleted (other statuses preserved)

**Performance Considerations**:

- Subquery filters at database level (efficient)
- Single DELETE statement (not per-class)
- Uses indexes on `status` and foreign keys

**Related Methods**:

- `SessionCleanupJob.handleCron()` - Calls this method daily

---

## Jobs (Cron Jobs)

### SessionCleanupJob (`session-cleanup.job.ts`)

**Purpose**: Daily cleanup of SCHEDULED sessions for hard-locked classes.

**File Location**: `src/modules/sessions/jobs/session-cleanup.job.ts`

**Class Declaration**: `@Injectable() export class SessionCleanupJob`

**Schedule**: `@Cron(CronExpression.EVERY_DAY_AT_2AM)` - Runs daily at 2 AM

**Dependencies**: `SessionsRepository`

**Logger**: Uses NestJS Logger with context `SessionCleanupJob`

---

#### Method: `handleCron(): Promise<void>`

**Method Signature**:

```typescript
@Cron(CronExpression.EVERY_DAY_AT_2AM)
async handleCron(): Promise<void>
```

**Parameters**: None

**Return Type**: `Promise<void>`

**Schedule**: Daily at 2:00 AM

**Called By**: NestJS Schedule module (automatic)

**Calls**:

- `sessionsRepository.deleteScheduledSessionsForHardLockedClasses()`

**Detailed Flow**:

1. **Log Start**:
   - Logs "Starting session cleanup job for hard-locked classes"

2. **Delete Sessions**:
   - Calls `sessionsRepository.deleteScheduledSessionsForHardLockedClasses()`
   - Gets count of deleted sessions

3. **Log Completion**:
   - Logs success with deleted count
   - Logs error if failed (with stack trace)

**Error Handling**: Catches and logs errors, doesn't throw (prevents job failure from affecting other jobs).

**Logging**:

- Logs start: "Starting session cleanup job for hard-locked classes"
- Logs completion: "Session cleanup completed. Deleted X SCHEDULED sessions..."
- Logs errors with stack trace

**Example Log Output**:

```
[SessionCleanupJob] Starting session cleanup job for hard-locked classes
[SessionCleanupJob] Session cleanup completed. Deleted 15 SCHEDULED sessions for hard-locked classes
```

---

### SessionGenerationMaintenanceJob (`session-generation-maintenance.job.ts`)

**Purpose**: Weekly maintenance to ensure groups have 4 weeks of future sessions.

**File Location**: `src/modules/sessions/jobs/session-generation-maintenance.job.ts`

**Class Declaration**: `@Injectable() export class SessionGenerationMaintenanceJob`

**Schedule**: `@Cron(CronExpression.EVERY_WEEK)` - Runs weekly (default: Sunday at midnight)

**Dependencies**:

- `SessionGenerationService` - Session generation logic
- `SessionsRepository` - Data access
- `DataSource` - TypeORM DataSource for raw queries

**Logger**: Uses NestJS Logger with context `SessionGenerationMaintenanceJob`

---

#### Method: `handleCron(): Promise<void>`

**Method Signature**:

```typescript
@Cron(CronExpression.EVERY_WEEK)
async handleCron(): Promise<void>
```

**Parameters**: None

**Return Type**: `Promise<void>`

**Schedule**: Weekly (default: Sunday at 00:00:00)

**Called By**: NestJS Schedule module (automatic)

**Calls**:

- `dataSource.getRepository(Group).createQueryBuilder()` (set-based query)
- `sessionGenerationService.generateBufferSessionsForGroup()` (for each group needing sessions)
- `createSystemActor()` (creates system actor for each center)

**Detailed Flow**:

1. **Calculate Date Range**:
   - `now = new Date()`
   - `fourWeeksFromNow = now + 28 days`

2. **Set-Based Query** (Performance Optimization):
   - Uses single SQL query with `GROUP BY` and `HAVING`:
     ```sql
     SELECT group.id, group.centerId,
            COUNT(DISTINCT scheduleItem.id) as scheduleItemsCount,
            COUNT(DISTINCT session.id) as futureSessionCount
     FROM groups group
     LEFT JOIN classes class ON group."classId" = class.id
     LEFT JOIN schedule_items scheduleItem ON scheduleItem."groupId" = group.id
     LEFT JOIN sessions session ON session."groupId" = group.id
         AND session."startTime" > :now
         AND session."startTime" <= :fourWeeksFromNow
         AND session.status = 'SCHEDULED'
     WHERE group.deletedAt IS NULL
       AND class.status != 'CANCELED'
       AND class.status != 'FINISHED'
     GROUP BY group.id, group.centerId
     HAVING COUNT(DISTINCT session.id) < COUNT(DISTINCT scheduleItem.id) * 4
     ```
   - Identifies all groups needing sessions in one query (O(1) instead of O(n))

3. **Process Groups**:
   - Loops through results
   - For each group:
     - Parses data (groupId, centerId, scheduleItemsCount, futureSessionCount)
     - Skips if `scheduleItemsCount === 0`
     - Creates system actor
     - Calls `sessionGenerationService.generateBufferSessionsForGroup()`
     - Logs success/error
     - Continues on error (doesn't block other groups)

4. **Log Completion**:
   - Logs processed count and generated count

**Performance Benefits**:

- Single query instead of N queries (where N = number of groups)
- Set-based filtering at database level
- Calculates required sessions based on schedule items count (not hardcoded)

**Error Handling**: Catches errors per group, logs and continues (prevents one group failure from blocking others).

**Performance Metrics**:

- Processes all groups in single query (O(1) instead of O(n))
- Only generates sessions for groups that need them
- Continues processing even if individual groups fail

**Example Log Output**:

```
[SessionGenerationMaintenanceJob] Starting session generation maintenance job
[SessionGenerationMaintenanceJob] Found 25 groups needing sessions
[SessionGenerationMaintenanceJob] Generated buffer sessions for group uuid-123 (had 8, needs 12)
[SessionGenerationMaintenanceJob] Session generation maintenance completed. Processed: 25, Generated: 25
```

---

## Event Listeners

### ClassEventsListener (`class-events.listener.ts`)

**Purpose**: Listens to class status changes and generates initial sessions.

**File Location**: `src/modules/sessions/listeners/class-events.listener.ts`

**Class Declaration**: `@Injectable() export class ClassEventsListener`

**Dependencies**:

- `SessionGenerationService` - Session generation
- `GroupsRepository` - Group data access

**Logger**: Uses NestJS Logger with context `ClassEventsListener`

---

#### Method: `handleClassStatusChanged(event: ClassStatusChangedEvent): Promise<void>`

**Method Signature**:

```typescript
@OnEvent(ClassEvents.STATUS_CHANGED)
async handleClassStatusChanged(event: ClassStatusChangedEvent): Promise<void>
```

**Event**: `ClassEvents.STATUS_CHANGED`

**Event Payload**: `ClassStatusChangedEvent`

- `classId` (string) - Class ID
- `oldStatus` (ClassStatus) - Previous status
- `newStatus` (ClassStatus) - New status
- `actor` (ActorUser) - User who changed status

**Return Type**: `Promise<void>`

**Called By**: EventEmitter (when class status changes)

**Calls**:

- `groupsRepository.findByClassId(classId)` - Get all groups for class
- `sessionGenerationService.generateInitialSessionsForGroup()` - Generate sessions for each group

**Detailed Flow**:

1. **Extract Event Data**:
   - Gets `classId`, `oldStatus`, `newStatus`, `actor`

2. **Check Transition**:
   - If `oldStatus === NOT_STARTED` AND `newStatus === ACTIVE`:
     - Fetches all groups for class using `groupsRepository.findByClassId()`
     - For each group:
       - Calls `sessionGenerationService.generateInitialSessionsForGroup()`
       - Logs error if fails (continues with other groups)

3. **Note on Cleanup**:
   - Sessions are NOT deleted when class is CANCELED/FINISHED
   - Cleanup handled by `SessionCleanupJob` after 24-hour grace period

**Key Design**:

- Only generates on NOT_STARTED → ACTIVE transition
- Doesn't regenerate on PAUSED → ACTIVE (sessions already exist)
- Error handling per group (doesn't block others)

**Example Event Flow**:

```
Class Status Changed: NOT_STARTED → ACTIVE
    ↓
ClassEventsListener.handleClassStatusChanged()
    ↓
Find all groups for class (e.g., 3 groups)
    ↓
For each group:
    ├─→ Generate initial sessions (2 months)
    └─→ Log error if fails (continue with next group)
```

**Error Handling**:

- Logs error for each group that fails
- Continues processing other groups
- Prevents one group failure from blocking others

---

### GroupEventsListener (`group-events.listener.ts`)

**Purpose**: Listens to group updates and regenerates sessions.

**File Location**: `src/modules/sessions/listeners/group-events.listener.ts`

**Class Declaration**: `@Injectable() export class GroupEventsListener`

**Dependencies**:

- `SessionsService` - Session regeneration
- `ScheduleItemsRepository` - Schedule item data access

---

#### Method: `handleGroupUpdated(event: GroupUpdatedEvent): Promise<void>`

**Method Signature**:

```typescript
@OnEvent(GroupEvents.UPDATED)
async handleGroupUpdated(event: GroupUpdatedEvent): Promise<void>
```

**Event**: `GroupEvents.UPDATED`

**Event Payload**: `GroupUpdatedEvent`

- `group` (Group) - Updated group entity
- `actor` (ActorUser) - User who updated group
- `changedFields` (string[], optional) - Array of field names that were updated (e.g., `['name', 'scheduleItems']`)

**Return Type**: `Promise<void>`

**Called By**: EventEmitter (when group is updated)

**Calls**:

- `scheduleItemsRepository.findByGroupId(group.id)` - Get all schedule items
- `sessionsService.regenerateSessionsForScheduleItem()` - Regenerate for each schedule item

**Detailed Flow**:

1. **Extract Event Data**:
   - Gets `group`, `actor`, and `changedFields`

2. **Check if Schedule Items Changed**:
   - **NEW**: Checks if `changedFields` includes `'scheduleItems'`
   - Returns early if schedule items didn't change (optimization)

3. **Fetch Schedule Items**:
   - Uses `scheduleItemsRepository.findByGroupId(group.id)`

4. **Regenerate Sessions**:
   - For each schedule item:
     - Calls `sessionsService.regenerateSessionsForScheduleItem()`
     - Deletes future SCHEDULED sessions and regenerates them

**Key Design**:

- **Optimization**: Only regenerates when `scheduleItems` field is in `changedFields`
- Group name updates don't trigger regeneration (performance improvement)
- Preserves manual sessions (`isExtraSession: true`)
- Uses transactions (handled by service)

**Example Event Flow**:

```
Group Updated (with scheduleItems in changedFields)
    ↓
GroupEventsListener.handleGroupUpdated()
    ↓
Check if 'scheduleItems' in changedFields
    ├─→ No: Return early (skip regeneration)
    └─→ Yes: Continue
        ↓
Find all schedule items for group (e.g., 3 schedule items)
        ↓
For each schedule item:
    ├─→ Regenerate sessions (delete future + create new)
    └─→ Transaction ensures atomicity
```

**Optimization**: Only regenerates when schedule items actually changed. Group name-only updates skip regeneration.

---

### SessionActivityListener (`session-activity.listener.ts`)

**Purpose**: Logs session activities to activity log.

**File Location**: `src/modules/sessions/listeners/session-activity.listener.ts`

**Class Declaration**: `@Injectable() export class SessionActivityListener`

**Dependencies**: `ActivityLogService` - Activity logging service

---

#### Methods:

##### 1. `handleSessionCreated(event: SessionCreatedEvent): Promise<void>`

**Method Signature**:

```typescript
@OnEvent(SessionEvents.CREATED)
async handleSessionCreated(event: SessionCreatedEvent): Promise<void>
```

**Event**: `SessionEvents.CREATED`

**Event Payload**: `SessionCreatedEvent`

- `session` (Session) - Created session entity
- `actor` (ActorUser) - User who created session
- `centerId` (string) - Center ID

**Return Type**: `Promise<void>`

**Called By**: EventEmitter (when session is created)

**Calls**:

- `activityLogService.log()` - Logs activity with type `SESSION_CREATED`

**Logged Data**:

- `sessionId`, `groupId`, `scheduleItemId`, `title`, `startTime`, `endTime`, `isExtraSession`, `centerId`

---

##### 2. `handleSessionUpdated(event: SessionUpdatedEvent): Promise<void>`

**Method Signature**:

```typescript
@OnEvent(SessionEvents.UPDATED)
async handleSessionUpdated(event: SessionUpdatedEvent): Promise<void>
```

**Event**: `SessionEvents.UPDATED`

**Event Payload**: `SessionUpdatedEvent`

- `session` (Session) - Updated session entity
- `actor` (ActorUser) - User who updated session
- `centerId` (string) - Center ID

**Logged Data**:

- `sessionId`, `groupId`, `title`, `startTime`, `endTime`, `status`, `centerId`

---

##### 3. `handleSessionDeleted(event: SessionDeletedEvent): Promise<void>`

**Method Signature**:

```typescript
@OnEvent(SessionEvents.DELETED)
async handleSessionDeleted(event: SessionDeletedEvent): Promise<void>
```

**Event**: `SessionEvents.DELETED`

**Event Payload**: `SessionDeletedEvent`

- `sessionId` (string) - Deleted session ID
- `actor` (ActorUser) - User who deleted session
- `centerId` (string) - Center ID

**Logged Data**:

- `sessionId`, `centerId`

**Note**: Only logs sessionId (session entity no longer exists)

---

##### 4. `handleSessionCanceled(event: SessionCanceledEvent): Promise<void>`

**Method Signature**:

```typescript
@OnEvent(SessionEvents.CANCELED)
async handleSessionCanceled(event: SessionCanceledEvent): Promise<void>
```

**Event**: `SessionEvents.CANCELED`

**Event Payload**: `SessionCanceledEvent`

- `session` (Session) - Canceled session entity
- `actor` (ActorUser) - User who canceled session
- `centerId` (string) - Center ID

**Logged Data**:

- `sessionId`, `groupId`, `centerId`

---

##### 5. `handleSessionsRegenerated(event: SessionsRegeneratedEvent): Promise<void>`

**Method Signature**:

```typescript
@OnEvent(SessionEvents.REGENERATED)
async handleSessionsRegenerated(event: SessionsRegeneratedEvent): Promise<void>
```

**Event**: `SessionEvents.REGENERATED`

**Event Payload**: `SessionsRegeneratedEvent`

- `scheduleItemId` (string) - Schedule item ID
- `groupId` (string) - Group ID
- `deletedCount` (number) - Number of sessions deleted
- `createdCount` (number) - Number of sessions created
- `actor` (ActorUser) - User who triggered regeneration
- `centerId` (string) - Center ID

**Logged Data**:

- `scheduleItemId`, `groupId`, `deletedCount`, `createdCount`, `centerId`

---

##### 6. `handleSessionsBulkCreated(event: SessionsBulkCreatedEvent): Promise<void>`

**Method Signature**:

```typescript
@OnEvent(SessionEvents.BULK_CREATED)
async handleSessionsBulkCreated(event: SessionsBulkCreatedEvent): Promise<void>
```

**Event**: `SessionEvents.BULK_CREATED`

**Event Payload**: `SessionsBulkCreatedEvent`

- `sessions` (Session[]) - Array of created sessions
- `actor` (ActorUser) - User/System who created sessions
- `centerId` (string) - Center ID

**Logged Data**:

- `sessionCount` (number) - Number of sessions created
- `groupIds` (string[]) - Array of unique group IDs
- `centerId` (string) - Center ID

**Key Design**: Single log entry for bulk operations (performance optimization)

---

##### 7. `handleSessionsBulkDeleted(event: SessionsBulkDeletedEvent): Promise<void>`

**Method Signature**:

```typescript
@OnEvent(SessionEvents.BULK_DELETED)
async handleSessionsBulkDeleted(event: SessionsBulkDeletedEvent): Promise<void>
```

**Event**: `SessionEvents.BULK_DELETED`

**Event Payload**: `SessionsBulkDeletedEvent`

- `sessionIds` (string[]) - Array of deleted session IDs
- `actor` (ActorUser) - User/System who deleted sessions
- `centerId` (string) - Center ID

**Logged Data**:

- `sessionCount` (number) - Number of sessions deleted
- `sessionIds` (string[]) - Array of session IDs
- `centerId` (string) - Center ID

**Key Design**: Single log entry for bulk operations (performance optimization)

**Logs**: Session creation with details (sessionId, groupId, scheduleItemId, title, times, isExtraSession, centerId).

---

##### 2. `handleSessionUpdated(event: SessionUpdatedEvent): Promise<void>`

**Event**: `SessionEvents.UPDATED`

**Logs**: Session update with details (sessionId, groupId, title, times, status, centerId).

---

##### 3. `handleSessionDeleted(event: SessionDeletedEvent): Promise<void>`

**Event**: `SessionEvents.DELETED`

**Logs**: Session deletion with details (sessionId, centerId).

---

##### 4. `handleSessionCanceled(event: SessionCanceledEvent): Promise<void>`

**Event**: `SessionEvents.CANCELED`

**Logs**: Session cancellation with details (sessionId, groupId, centerId).

---

##### 5. `handleSessionsRegenerated(event: SessionsRegeneratedEvent): Promise<void>`

**Event**: `SessionEvents.REGENERATED`

**Logs**: Session regeneration with details (scheduleItemId, groupId, deletedCount, createdCount, centerId).

---

##### 6. `handleSessionsBulkCreated(event: SessionsBulkCreatedEvent): Promise<void>`

**Event**: `SessionEvents.BULK_CREATED`

**Logs**: Bulk session creation with summary (sessionCount, groupIds array, centerId).

**Key Design**: Single log entry for bulk operations (performance optimization).

---

##### 7. `handleSessionsBulkDeleted(event: SessionsBulkDeletedEvent): Promise<void>`

**Event**: `SessionEvents.BULK_DELETED`

**Logs**: Bulk session deletion with summary (sessionCount, sessionIds array, centerId).

**Key Design**: Single log entry for bulk operations (performance optimization).

---

### SessionAttendanceListener (`session-attendance-listener.ts`)

**Purpose**: Placeholder for future attendance event handling.

**Status**: TODO - Not implemented

**Planned Functionality**:

- Listen to attendance events
- Update session status to CONDUCTING when attendance is marked
- Update session status to FINISHED when session ends

---

### SessionPaymentListener (`session-payment-listener.ts`)

**Purpose**: Placeholder for future payment event handling.

**Status**: TODO - Not implemented

**Planned Functionality**:

- Listen to payment events
- Update session status based on payment state
- Handle refund logic when session is canceled

---

## Events

### Event Classes (`session.events.ts`)

All events include `actor` and `centerId` for audit purposes.

#### 1. `SessionCreatedEvent`

- **Properties**: `session: Session`, `actor: ActorUser`, `centerId: string`
- **Emitted**: When a session is created (manual or generated)
- **Listeners**: `SessionActivityListener`

#### 2. `SessionUpdatedEvent`

- **Properties**: `session: Session`, `actor: ActorUser`, `centerId: string`
- **Emitted**: When a session is updated
- **Listeners**: `SessionActivityListener`

#### 3. `SessionDeletedEvent`

- **Properties**: `sessionId: string`, `actor: ActorUser`, `centerId: string`
- **Emitted**: When a session is deleted
- **Listeners**: `SessionActivityListener`

#### 4. `SessionCanceledEvent`

- **Properties**: `session: Session`, `actor: ActorUser`, `centerId: string`
- **Emitted**: When a session is canceled
- **Listeners**: `SessionActivityListener`
- **TODO**: Add refund logic integration

#### 5. `SessionsRegeneratedEvent`

- **Properties**: `scheduleItemId: string`, `groupId: string`, `deletedCount: number`, `createdCount: number`, `actor: ActorUser`, `centerId: string`
- **Emitted**: When sessions are regenerated for a schedule item
- **Listeners**: `SessionActivityListener`

#### 6. `SessionsBulkCreatedEvent`

- **Properties**: `sessions: Session[]`, `actor: ActorUser`, `centerId: string`
- **Emitted**: When multiple sessions are created in bulk
- **Listeners**: `SessionActivityListener`
- **Purpose**: Performance optimization (single event instead of N events)

#### 7. `SessionsBulkDeletedEvent`

- **Properties**: `sessionIds: string[]`, `actor: ActorUser`, `centerId: string`
- **Emitted**: When multiple sessions are deleted in bulk
- **Listeners**: `SessionActivityListener`
- **Purpose**: Performance optimization (single event instead of N events)

#### 8. `SessionConflictDetectedEvent`

- **Properties**:
  - `groupId: string` - Group ID for the proposed session
  - `scheduleItemId: string` - Schedule item ID that would have generated the session
  - `proposedStartTime: Date` - Proposed session start time
  - `proposedEndTime: Date` - Proposed session end time
  - `conflictType: 'TEACHER' | 'GROUP'` - Type of conflict detected
  - `conflictingSessionId: string` - ID of the conflicting session
  - `conflictingSessionStartTime: Date` - Start time of conflicting session
  - `conflictingSessionEndTime: Date` - End time of conflicting session
  - `actor: ActorUser` - User/system performing the action
  - `centerId: string` - Center ID
- **Emitted**: When a session is skipped during generation due to a conflict
- **Listeners**: `SessionActivityListener`
- **Purpose**: Provides visibility into "ghost sessions" (sessions that were skipped during generation)
- **Use Cases**:
  - Activity logging for audit trail
  - Notifications to secretaries for manual rescheduling
  - Conflict analytics and reporting

---

## DTOs (Data Transfer Objects)

### CreateSessionDto (`create-session.dto.ts`)

**Purpose**: Validates input for creating extra sessions.

**Fields**:

- `groupId` (UUID, Required) - Validated with `@BelongsToBranch(Group)`
- `title` (String, Optional, MaxLength: 255)
- `startTime` (DateString, Required) - ISO 8601 format
- `endTime` (DateString, Required) - ISO 8601 format

**Validations**:

- UUID format validation
- Branch/center access validation
- Date string format validation

---

### UpdateSessionDto (`update-session.dto.ts`)

**Purpose**: Validates input for updating sessions.

**Fields** (All Optional):

- `title` (String, MaxLength: 255)
- `startTime` (DateString) - ISO 8601 format
- `endTime` (DateString) - ISO 8601 format

**Validations**:

- Date string format validation

---

### SessionResponseDto (`session-response.dto.ts`)

**Purpose**: Response DTO for API responses.

**Fields**: All session entity fields (id, groupId, scheduleItemId, title, startTime, endTime, status, isExtraSession, timestamps, audit fields).

---

### SessionIdParamDto (`session-id-param.dto.ts`)

**Purpose**: Validates session ID path parameter.

**Fields**:

- `sessionId` (UUID, Required) - Validated with `@Exists(Session)`

---

### GroupIdParamDto (`group-id-param.dto.ts`)

**Purpose**: Validates group ID path parameter.

**Fields**:

- `groupId` (UUID, Required)

---

### PaginateSessionsDto (`paginate-sessions.dto.ts`)

**Purpose**: Validates pagination and filtering parameters.

**Extends**: `BasePaginationDto` (page, limit, search, sortBy, sortOrder)

**Additional Fields**:

- `groupId` (UUID, Optional) - Validated with `@BelongsToBranch(Group)`
- `classId` (UUID, Optional) - Validated with `@BelongsToBranch(Class)`
- `status` (SessionStatus enum, Optional)
- `startTimeFrom` (DateString, Optional) - ISO 8601 format
- `startTimeTo` (DateString, Optional) - ISO 8601 format

---

## Enums

### SessionStatus (`session-status.enum.ts`)

**Values**:

- `SCHEDULED` - Session is scheduled but not started
- `CONDUCTING` - Session is currently in progress
- `FINISHED` - Session has completed
- `CANCELED` - Session was canceled

**State Transitions**:

- SCHEDULED → CONDUCTING (when attendance is marked - TODO)
- SCHEDULED → FINISHED (when session ends - TODO)
- SCHEDULED → CANCELED (manual cancellation)
- Any → CANCELED (can cancel any session)

---

### SessionActivityType (`session-activity-type.enum.ts`)

**Values**:

- `SESSION_CREATED` - Session was created
- `SESSION_UPDATED` - Session was updated
- `SESSION_DELETED` - Session was deleted
- `SESSION_CANCELED` - Session was canceled
- `SESSIONS_REGENERATED` - Sessions were regenerated

**Purpose**: Used for activity logging.

---

## Data Flow Diagrams

### Session Creation Flow (Manual)

```
User Request
    ↓
SessionsController.createSession()
    ↓
SessionsService.createExtraSession()
    ↓
    ├─→ GroupsRepository.findByIdOrThrow() [Get group + class]
    ├─→ SessionValidationService.validateTeacherConflict() [Check teacher availability]
    ├─→ SessionValidationService.validateGroupConflict() [Check group availability]
    ├─→ SessionsRepository.create() [Create session]
    └─→ TypeSafeEventEmitter.emitAsync() [Emit CREATED event]
        ↓
    SessionActivityListener.handleSessionCreated() [Log activity]
    ↓
Return Session to User
```

### Session Generation Flow (Automatic)

```
Class Status Changed (NOT_STARTED → ACTIVE)
    ↓
ClassEventsListener.handleClassStatusChanged()
    ↓
SessionGenerationService.generateInitialSessionsForGroup()
    ↓
SessionGenerationService.generateSessionsForGroup()
    ↓
    ├─→ GroupsRepository.findByIdOrThrow() [Get group + class + scheduleItems]
    ├─→ For each scheduleItem:
    │   ├─→ getDatesForDayOfWeek() [Get all matching dates]
    │   ├─→ For each date:
    │   │   ├─→ SessionValidationService.validateTeacherConflict() [Check conflicts]
    │   │   └─→ SessionsRepository.findByGroupId() [Check duplicates]
    │   └─→ Add to sessionsToCreate array
    ├─→ SessionsRepository.bulkInsert() [Insert all sessions]
    └─→ TypeSafeEventEmitter.emitAsync() [Emit BULK_CREATED event]
        ↓
    SessionActivityListener.handleSessionsBulkCreated() [Log activity]
```

### Session Regeneration Flow

```
Group Updated
    ↓
GroupEventsListener.handleGroupUpdated()
    ↓
SessionsService.regenerateSessionsForScheduleItem()
    ↓
    ├─→ ScheduleItemsRepository.findByIdOrThrow() [Get schedule item + group]
    ├─→ SessionsRepository.findFutureScheduledSessionsByScheduleItem() [Find sessions to delete]
    ├─→ Filter out isExtraSession: true [Preserve manual sessions]
    ├─→ For each session: SessionsRepository.remove() [Delete sessions]
    ├─→ TypeSafeEventEmitter.emitAsync() [Emit BULK_DELETED event]
    ├─→ SessionGenerationService.generateSessionsForGroup() [Generate new sessions]
    └─→ TypeSafeEventEmitter.emitAsync() [Emit REGENERATED event]
        ↓
    SessionActivityListener handles events [Log activities]
```

### Maintenance Job Flow

```
Weekly Cron (EVERY_WEEK)
    ↓
SessionGenerationMaintenanceJob.handleCron()
    ↓
    ├─→ DataSource Query [Set-based query with GROUP BY and HAVING]
    │   └─→ Finds groups with sessionCount < scheduleItemsCount * 4
    ├─→ For each group needing sessions:
    │   ├─→ createSystemActor() [Create system actor]
    │   └─→ SessionGenerationService.generateBufferSessionsForGroup()
    │       └─→ Generates sessions to maintain 4-week buffer
    └─→ Log results
```

---

## Business Logic Details

### Conflict Detection

#### Teacher Conflict

- **Purpose**: Prevents a teacher from having overlapping sessions
- **Logic**: Checks if any session with the same teacher has overlapping time ranges
- **Query**: Joins session → group → class, filters by `teacherUserProfileId`, checks time overlap
- **Time Overlap Formula**: `(session1.startTime < session2.endTime AND session1.endTime > session2.startTime)`

#### Group Conflict

- **Purpose**: Prevents a group from having overlapping sessions
- **Logic**: Checks if any session in the same group has overlapping time ranges
- **Query**: Filters by `groupId`, checks time overlap
- **Use Case**: Prevents creating two sessions for the same group at the same time

### Session Generation Rules

1. **Initial Generation** (Class NOT_STARTED → ACTIVE):
   - Generates 2 months of sessions from class start date (or current date if start date is in past)
   - Only generates for groups with schedule items
   - Skips sessions with teacher conflicts (doesn't throw error)
   - Emits `SessionConflictDetectedEvent` for each skipped session
   - Skips duplicate sessions (same groupId + startTime)

2. **Buffer Maintenance** (Weekly):
   - Maintains 4 weeks of future sessions
   - Calculates required sessions: `scheduleItemsCount * 4`
   - Only generates if current buffer is insufficient
   - Uses set-based query for performance

3. **Regeneration** (Group Updated - Schedule Items Changed):
   - Only triggers when `scheduleItems` field is updated (not on name-only updates)
   - Deletes future SCHEDULED sessions for updated schedule items
   - Preserves manual sessions (`isExtraSession: true`)
   - Regenerates 2 months of sessions
   - Uses bulk events for performance
   - Emits conflict events for skipped sessions

4. **Regeneration** (Class Duration Updated):
   - Triggers when class `duration` field is updated
   - Regenerates sessions for all groups in the class
   - Updates session end times based on new duration
   - Preserves manual sessions (`isExtraSession: true`)
   - Uses bulk events for performance

### Session Status Rules

1. **Update Rules**:
   - Only SCHEDULED sessions can be updated
   - Time changes trigger conflict validation
   - Title can always be updated (if session is SCHEDULED)

2. **Delete Rules**:
   - Only SCHEDULED **extra sessions** (`isExtraSession: true`) can be deleted
   - Scheduled sessions (`isExtraSession: false`) **cannot** be deleted (must be canceled instead)
   - This protects the "system of record" for official schedules
   - Allows flexibility for manual sessions (can undo mistakes)
   - TODO: Check for payments/attendance before deletion

3. **Cancel Rules**:
   - Any session can be canceled (sets status to CANCELED)
   - Works for both scheduled and extra sessions
   - Preserves record in database (for audit trail)
   - TODO: Trigger refund logic

### Delete vs Cancel Comparison

| Feature                     | Scheduled Session (`isExtra: false`) | Extra Session (`isExtra: true`)             |
| --------------------------- | ------------------------------------ | ------------------------------------------- |
| **Delete Allowed**          | ❌ No (throws error)                 | ✅ Yes                                      |
| **Cancel Allowed**          | ✅ Yes                               | ✅ Yes                                      |
| **Database State (Delete)** | N/A (cannot delete)                  | Record removed (or soft-deleted)            |
| **Database State (Cancel)** | Record remains (Status: CANCELED)    | Record remains (Status: CANCELED)           |
| **Audit Trail (Delete)**    | N/A                                  | No trace (if deleted)                       |
| **Audit Trail (Cancel)**    | Shows class was planned but stopped  | Shows "Special Event" was canceled          |
| **Automation**              | Managed by cron jobs/regeneration    | Ignored by automation                       |
| **Use Case**                | Official schedule (system of record) | Manual sessions (makeup classes, workshops) |

**Design Rationale**:

- **Scheduled sessions** are the "Fixed Points" in the schedule - they represent the official curriculum and must remain in the database for audit purposes (e.g., parent reports: "Why didn't my son have class on Tuesday?" → "It was canceled due to teacher illness")
- **Extra sessions** are "Flexible Points" - they're manually created and can be completely removed if created by mistake, keeping the database clean

### Cleanup Rules

1. **Hard-Locked Classes**:
   - Classes in CANCELED or FINISHED status for >24 hours
   - Only SCHEDULED sessions are deleted
   - FINISHED, CONDUCTING, CANCELED sessions are preserved (historical records)
   - 24-hour grace period allows class status reversal

---

## Performance Optimizations

### 1. Generic Repository Method

- **Problem**: Method explosion (many similar methods with hardcoded relations)
- **Solution**: Generic `findSessions()` method with flexible filters and relations
- **Benefit**: Easy to add new relations without modifying multiple methods

### 7. QueryBuilder Specification Pattern

- **Problem**: Repository method bloat (many wrapper methods for similar queries)
- **Solution**: QueryBuilder methods (`getFutureScheduledQuery()`, `getOverlappingQuery()`) that return QueryBuilder instances
- **Benefit**: Service layer can chain additional filters without creating new repository methods, reducing code duplication and increasing flexibility

### 2. Set-Based Queries

- **Problem**: O(n) queries in maintenance job (one query per group)
- **Solution**: Single query with GROUP BY and HAVING
- **Benefit**: Identifies all groups needing sessions in one query

### 3. Bulk Operations

- **Problem**: Individual events for each session in bulk operations
- **Solution**: Bulk events (`SessionsBulkCreatedEvent`, `SessionsBulkDeletedEvent`)
- **Benefit**: Reduces event spam and improves performance

### 4. Bulk Insert

- **Problem**: Individual inserts for multiple sessions
- **Solution**: `bulkInsert()` method
- **Benefit**: More efficient database operations

### 5. Buffer Calculation

- **Problem**: Hardcoded session count doesn't account for schedule frequency
- **Solution**: Calculate based on schedule items count (`scheduleItemsCount * 4`)
- **Benefit**: Accurate buffer for groups with different meeting frequencies

### 6. Database Indexes

- **Indexes on**: `groupId`, `scheduleItemId`, `startTime`, `status`, `[groupId, status]`, `[groupId, startTime]`
- **Benefit**: Fast queries for common filters

### 8. Conflict Detection Events

- **Problem**: "Ghost sessions" - sessions skipped during generation are silently ignored
- **Solution**: `SessionConflictDetectedEvent` emitted for each skipped session
- **Benefit**: Visibility into conflicts, enables notifications, activity logging, and analytics

### 9. Optimized Regeneration Triggers

- **Problem**: Sessions regenerated on every group/class update, even when only non-relevant fields (like name) changed
- **Solution**: Track `changedFields` in event payloads, only regenerate when `scheduleItems` or `duration` change
- **Benefit**: Avoids unnecessary regeneration, improves performance, handles class duration updates correctly

---

## Summary

The Sessions Module is a comprehensive system for managing class sessions with:

- **Automatic generation** from schedule items
- **Manual creation** of extra sessions
- **Conflict detection** (teacher and group)
- **Event-driven architecture** for integration
- **Performance optimizations** (bulk operations, set-based queries)
- **Automated maintenance** (cleanup and buffer generation)
- **Audit logging** for all operations

The module follows best practices:

- Separation of concerns (services, repositories, controllers)
- Transaction management
- Event-driven design
- Performance optimization
- Error handling
- Type safety
