# Sessions Module - Detailed Overview and Architecture

## Table of Contents

1. [Overview](#overview)
2. [Architecture & Design Principles](#architecture--design-principles)
3. [Core Entities](#core-entities)
4. [DTOs (Data Transfer Objects)](#dtos-data-transfer-objects)
5. [Enums](#enums)
6. [Services](#services)
7. [Event-Driven Integration](#event-driven-integration)
8. [API Endpoints](#api-endpoints)
9. [Business Rules & Validations](#business-rules--validations)
10. [Automation (Cronjobs)](#automation-cronjobs)
11. [Database Schema](#database-schema)
12. [Future Integration Points](#future-integration-points)

---

## Overview

The **Sessions Module** is a comprehensive system for managing individual class sessions within a Learning Management System (LMS). It handles automatic generation of recurring sessions based on schedule templates, manual session creation, session lifecycle management, and integration with class and group management.

### Key Features

- **Automatic Session Generation**: Generates sessions from schedule items when groups are created
- **Rolling Window Management**: Maintains a 2-month initial window and 4-week rolling buffer
- **Teacher Conflict Prevention**: Validates teacher availability to prevent scheduling conflicts
- **Schedule Cascade Updates**: Automatically updates future sessions when schedules change
- **Lifecycle Management**: Supports session statuses (SCHEDULED, CONDUCTING, FINISHED, CANCELED)
- **Event-Driven Architecture**: Loosely coupled integration with classes module via events
- **Manual Session Creation**: Allows creation of extra sessions outside regular schedule

---

## Architecture & Design Principles

### Module Separation

The Sessions Module is **separate** from the Classes Module to maintain clear boundaries and avoid circular dependencies. Communication between modules is handled exclusively through **events**, not direct service calls.

### Event-Driven Communication

All inter-module communication uses `@nestjs/event-emitter` with type-safe events:

- **Classes Module** → **Sessions Module**:
  - `GroupEvents.CREATED` → Triggers initial session generation
  - `GroupEvents.UPDATED` → Triggers session regeneration
  - `ClassEvents.STATUS_CHANGED` → Triggers session cleanup

- **Sessions Module** → **Other Modules**:
  - `SessionEvents.CREATED`
  - `SessionEvents.UPDATED`
  - `SessionEvents.DELETED`
  - `SessionEvents.CANCELED`
  - `SessionEvents.REGENERATED`

### Entity Access Pattern

The Sessions Module accesses entities from the Classes Module (Group, ScheduleItem, Class) by:

- Importing entities directly via `TypeOrmModule.forFeature([Group, ScheduleItem, Class])`
- Using `EntityManager` or `DataSource` for direct queries
- **Not** importing the entire ClassesModule to avoid circular dependencies

### Transaction Management

- Services use `@Transactional()` decorator from `@nestjs-cls/transactional`
- Listeners operate outside transactions but call transactional services
- Cronjobs use `DataSource` directly for queries outside transaction context

---

## Core Entities

### Session Entity

**Location**: `src/modules/sessions/entities/session.entity.ts`

```typescript
@Entity('sessions')
export class Session extends BaseEntity {
  @Column({ type: 'uuid' })
  groupId: string; // Foreign key to Group

  @Column({ type: 'uuid', nullable: true })
  scheduleItemId?: string; // Foreign key to ScheduleItem (nullable for extra sessions)

  @Column({ type: 'varchar', length: 255, nullable: true })
  title?: string; // Custom topic name (e.g., "Organic Chemistry Intro")

  @Column({ type: 'timestamp' })
  startTime: Date; // Precise start time (UTC)

  @Column({ type: 'timestamp' })
  endTime: Date; // Precise end time (UTC)

  @Column({
    type: 'varchar',
    length: 20,
    default: SessionStatus.SCHEDULED,
  })
  status: SessionStatus; // SCHEDULED | CONDUCTING | FINISHED | CANCELED

  @Column({ type: 'boolean', default: false })
  isExtraSession: boolean; // Flag for manual sessions

  // Relations
  @ManyToOne(() => Group)
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @ManyToOne(() => ScheduleItem, { nullable: true })
  @JoinColumn({ name: 'scheduleItemId' })
  scheduleItem?: ScheduleItem;
}
```

**Key Constraints**:

- Unique constraint on `(groupId, startTime)` to prevent duplicates
- Indexes on `groupId`, `scheduleItemId`, `startTime`, `status`, `(groupId, status)`, `(groupId, startTime)`

**Relations**:

- `Group.sessions` → `Session[]` (OneToMany)
- `ScheduleItem.sessions` → `Session[]` (OneToMany)

---

## DTOs (Data Transfer Objects)

### CreateSessionDto

**Location**: `src/modules/sessions/dto/create-session.dto.ts`

```typescript
{
  groupId: string;           // Required, validated with @BelongsToBranch(Group)
  title?: string;            // Optional, max 255 characters
  startTime: string;         // Required, ISO 8601 format
  endTime: string;           // Required, ISO 8601 format
}
```

**Validation**:

- `groupId`: `@IsUUID(4)`, `@BelongsToBranch(Group)` - Ensures group belongs to actor's center
- `title`: `@IsOptional()`, `@IsString()`, `@MaxLength(255)`
- `startTime`: `@IsDateString()` - ISO 8601 format
- `endTime`: `@IsDateString()` - ISO 8601 format

### UpdateSessionDto

**Location**: `src/modules/sessions/dto/update-session.dto.ts`

```typescript
{
  title?: string;            // Optional, max 255 characters
  startTime?: string;        // Optional, ISO 8601 format
  endTime?: string;          // Optional, ISO 8601 format
}
```

**Validation**:

- All fields are optional
- `title`: `@IsOptional()`, `@IsString()`, `@MaxLength(255)`
- `startTime`: `@IsOptional()`, `@IsDateString()`
- `endTime`: `@IsOptional()`, `@IsDateString()`

### PaginateSessionsDto

**Location**: `src/modules/sessions/dto/paginate-sessions.dto.ts`

Extends `BasePaginationDto` with additional filters:

```typescript
{
  page?: number;
  limit?: number;
  search?: string;           // Search in title field
  sortBy?: [string, 'ASC' | 'DESC'][];
  groupId?: string;          // Filter by group ID (validated with @BelongsToBranch(Group))
  classId?: string;          // Filter by class ID (validated with @BelongsToBranch(Class))
  status?: SessionStatus;    // Filter by session status
  startTimeFrom?: string;    // Filter from date (ISO 8601)
  startTimeTo?: string;      // Filter to date (ISO 8601)
}
```

**Validation**:

- `groupId`: `@IsOptional()`, `@IsUUID(4)`, `@BelongsToBranch(Group)`
- `classId`: `@IsOptional()`, `@IsUUID(4)`, `@BelongsToBranch(Class)`
- `status`: `@IsOptional()`, `@IsEnum(SessionStatus)`
- `startTimeFrom`: `@IsOptional()`, `@IsDateString()`
- `startTimeTo`: `@IsOptional()`, `@IsDateString()`

### SessionIdParamDto

**Location**: `src/modules/sessions/dto/session-id-param.dto.ts`

```typescript
{
  sessionId: string; // UUID, validated with @Exists(Session)
}
```

**Validation**:

- `sessionId`: `@IsUUID(4)`, `@Exists(Session)` - Ensures session exists

---

## Enums

### SessionStatus

**Location**: `src/modules/sessions/enums/session-status.enum.ts`

```typescript
export enum SessionStatus {
  SCHEDULED = 'SCHEDULED', // Session is scheduled but not started
  CONDUCTING = 'CONDUCTING', // Session is currently ongoing
  FINISHED = 'FINISHED', // Session has completed
  CANCELED = 'CANCELED', // Session was canceled
}
```

**Status Transitions**:

- `SCHEDULED` → `CONDUCTING` → `FINISHED` (normal flow)
- `SCHEDULED` → `CANCELED` (cancellation)
- `CONDUCTING` → `CANCELED` (rare, mid-session cancellation)

---

## Services

### SessionsService

**Location**: `src/modules/sessions/services/sessions.service.ts`

Main service for session CRUD operations and business logic.

**Key Methods**:

1. **`createExtraSession(groupId, createSessionDto, actor)`**
   - Creates a manual/extra session
   - Validates teacher conflicts
   - Checks for duplicate startTime
   - Sets `isExtraSession: true`
   - Emits `SessionEvents.CREATED`

2. **`updateSession(sessionId, updateSessionDto, actor)`**
   - Updates session details (title, startTime, endTime)
   - Only allowed for `SCHEDULED` status
   - Validates teacher conflicts
   - Validates no payments/attendance linked (TODO: implement)
   - Emits `SessionEvents.UPDATED`

3. **`deleteSession(sessionId, actor)`**
   - Deletes a session permanently
   - Only allowed if no payments/attendance linked (TODO: implement)
   - Only allowed for `SCHEDULED` status
   - Emits `SessionEvents.DELETED`

4. **`cancelSession(sessionId, reason, actor)`**
   - Cancels a session (changes status to `CANCELED`)
   - Triggers refund logic (TODO: implement)
   - Emits `SessionEvents.CANCELED`

5. **`paginateSessions(paginateDto, actor)`**
   - Retrieves paginated list of sessions with filtering capabilities
   - Supports filtering by `groupId`, `classId`, `status`, `startTimeFrom`, `startTimeTo`
   - Uses database-level pagination (not in-memory slicing)
   - Filters by actor's center automatically

6. **`regenerateSessionsForScheduleItem(scheduleItemId, actor)`**
   - Deletes future `SCHEDULED` sessions linked to the schedule item
   - Regenerates sessions based on updated schedule
   - Preserves `isExtraSession: true` sessions
   - Preserves sessions with `CONDUCTING`, `FINISHED` status
   - Emits `SessionEvents.REGENERATED`

### SessionGenerationService

**Location**: `src/modules/sessions/services/session-generation.service.ts`

Handles automatic session generation from schedule items.

**Key Methods**:

1. **`generateSessionsForGroup(groupId, startDate, endDate, actor)`**
   - Core generation logic
   - Iterates through schedule items
   - Calculates session dates based on day of week
   - Validates teacher conflicts (skips conflicting sessions)
   - Checks for duplicates (skips if exists)
   - Bulk inserts sessions
   - Emits `SessionEvents.CREATED` for each session

2. **`generateInitialSessionsForGroup(groupId, actor)`**
   - Generates 2 months of sessions when group is created
   - Uses `class.startDate` or current date (whichever is later) as start date

3. **`generateBufferSessionsForGroup(groupId, actor)`**
   - Generates sessions to maintain 4-week buffer
   - Called by maintenance cronjob
   - Only generates if buffer < 4 weeks

**Generation Logic**:

- For each `ScheduleItem` in the group:
  - Finds all dates matching the day of week within the date range
  - Calculates `startTime` (date + scheduleItem.startTime)
  - Calculates `endTime` (startTime + class.duration)
  - Validates teacher conflict
  - Validates duplicate (groupId + startTime)
  - Creates session with `scheduleItemId` and `isExtraSession: false`

### SessionValidationService

**Location**: `src/modules/sessions/services/session-validation.service.ts`

Handles validation logic for sessions.

**Key Methods**:

1. **`validateTeacherConflict(teacherUserProfileId, startTime, endTime)`**
   - Checks if teacher has any overlapping sessions
   - Queries all sessions for groups where class.teacherUserProfileId matches
   - Returns conflict session if overlap found

2. **`validateSessionDeletion(sessionId)`** (TODO: implement payment/attendance checks)
   - Validates that session can be deleted
   - Checks for linked payments (TODO)
   - Checks for linked attendance (TODO)
   - Returns error if deletion not allowed

---

## Event-Driven Integration

### Listeners

#### GroupEventsListener

**Location**: `src/modules/sessions/listeners/group-events.listener.ts`

**Events Handled**:

1. **`GroupEvents.CREATED`**
   - Triggers `generateInitialSessionsForGroup()`
   - Generates 2 months of sessions

2. **`GroupEvents.UPDATED`**
   - Queries current schedule items
   - Calls `regenerateSessionsForScheduleItem()` for each schedule item
   - Updates only future `SCHEDULED` sessions

#### ClassEventsListener

**Location**: `src/modules/sessions/listeners/class-events.listener.ts`

**Events Handled**:

1. **`ClassEvents.STATUS_CHANGED`**
   - If new status is `CANCELED` or `FINISHED`:
     - Queries all groups for the class
     - Deletes all future `SCHEDULED` sessions for each group
     - Emits `SessionEvents.DELETED` for each deleted session

#### SessionActivityListener

**Location**: `src/modules/sessions/listeners/session-activity.listener.ts`

Logs all session events to the activity log service for audit trail.

**Events Handled**:

- `SessionEvents.CREATED`
- `SessionEvents.UPDATED`
- `SessionEvents.DELETED`
- `SessionEvents.CANCELED`
- `SessionEvents.REGENERATED`

### Event Definitions

**Location**: `src/modules/sessions/events/session.events.ts`

```typescript
export class SessionCreatedEvent {
  constructor(
    public readonly session: Session,
    public readonly actor: ActorUser,
    public readonly centerId: string,
  ) {}
}

export class SessionUpdatedEvent {
  constructor(
    public readonly session: Session,
    public readonly oldData: Partial<Session>,
    public readonly actor: ActorUser,
    public readonly centerId: string,
  ) {}
}

export class SessionDeletedEvent {
  constructor(
    public readonly sessionId: string,
    public readonly actor: ActorUser,
    public readonly centerId: string,
  ) {}
}

export class SessionCanceledEvent {
  constructor(
    public readonly session: Session,
    public readonly reason: string | undefined,
    public readonly actor: ActorUser,
    public readonly centerId: string,
  ) {}
}

export class SessionsRegeneratedEvent {
  constructor(
    public readonly scheduleItemId: string,
    public readonly deletedCount: number,
    public readonly createdCount: number,
    public readonly actor: ActorUser,
    public readonly centerId: string,
  ) {}
}
```

---

## API Endpoints

### Base Path: `/sessions`

All endpoints require authentication and appropriate permissions.

#### 1. Paginate Sessions

```
GET /sessions
```

**Permission**: `PERMISSIONS.CLASSES.READ`

**Query Parameters**: `PaginateSessionsDto`

```typescript
{
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: [string, 'ASC' | 'DESC'][];
  groupId?: string;          // Filter by group ID (validated with @BelongsToBranch)
  classId?: string;          // Filter by class ID (validated with @BelongsToBranch)
  status?: SessionStatus;    // Filter by session status
  startTimeFrom?: string;    // Filter from date (ISO 8601)
  startTimeTo?: string;      // Filter to date (ISO 8601)
}
```

**Response**: `Pagination<SessionResponseDto>`

**Features**:

- Database-level pagination (efficient, not in-memory slicing)
- Automatic filtering by actor's center
- Supports search on `title` field
- Supports sorting by `startTime`, `endTime`, `createdAt`, `updatedAt`
- Default sort: `startTime ASC`

#### 2. Get Single Session

```
GET /sessions/:sessionId
```

**Permission**: `PERMISSIONS.CLASSES.READ`

**Path Parameters**: `SessionIdParamDto`

- `sessionId`: UUID (validated with `@Exists(Session)`)

**Response**: `SessionResponseDto`

#### 3. Create Extra Session

```
POST /sessions
```

**Permission**: `PERMISSIONS.CLASSES.CREATE`

**Request Body**: `CreateSessionDto`

```typescript
{
  groupId: string;           // Required, validated with @BelongsToBranch(Group)
  title?: string;            // Optional, max 255 characters
  startTime: string;         // Required, ISO 8601 format
  endTime: string;           // Required, ISO 8601 format
}
```

**Response**: `SessionResponseDto`

**Behavior**:

- Creates a manual session with `isExtraSession: true`
- Validates group belongs to actor's center (via `@BelongsToBranch`)
- Validates teacher conflicts
- Validates duplicate startTime (same groupId + startTime)
- Sets `scheduleItemId: null`

#### 4. Update Session

```
PUT /sessions/:sessionId
```

**Permission**: `PERMISSIONS.CLASSES.UPDATE`

**Path Parameters**: `SessionIdParamDto`

- `sessionId`: UUID (validated with `@Exists(Session)`)

**Request Body**: `UpdateSessionDto`

```typescript
{
  title?: string;            // Optional, max 255 characters
  startTime?: string;        // Optional, ISO 8601 format
  endTime?: string;          // Optional, ISO 8601 format
}
```

**Response**: `SessionResponseDto`

**Constraints**:

- Only allowed for `SCHEDULED` status
- Validates teacher conflicts
- Validates no payments/attendance linked (TODO)

#### 5. Delete Session

```
DELETE /sessions/:sessionId
```

**Permission**: `PERMISSIONS.CLASSES.DELETE`

**Path Parameters**: `SessionIdParamDto`

- `sessionId`: UUID (validated with `@Exists(Session)`)

**Constraints**:

- Only allowed for `SCHEDULED` status
- Only allowed if no payments/attendance linked (TODO)

**Response**: Message response (not data)

#### 6. Cancel Session

```
PATCH /sessions/:sessionId/cancel
```

**Path Parameters**: `SessionIdParamDto`

- `sessionId`: UUID (validated with `@Exists(Session)`)

**Permission**: `PERMISSIONS.CLASSES.UPDATE`

**Path Parameters**: `SessionIdParamDto`

- `sessionId`: UUID (validated with `@Exists(Session)`)

**Request Body**: (Currently no body parameters - reason can be added if needed)

**Response**: `SessionResponseDto`

**Behavior**:

- Changes status to `CANCELED`
- Triggers refund logic (TODO)
- Emits `SessionEvents.CANCELED`

---

### Validation & Access Control

All endpoints use proper validation decorators for security and data integrity:

- **`@BelongsToBranch(Group)`**: Validates that `groupId` in `CreateSessionDto` belongs to a branch in the actor's center. Prevents unauthorized access to groups from other centers.
- **`@BelongsToBranch(Class)`**: Validates that `classId` in `PaginateSessionsDto` belongs to a branch in the actor's center.
- **`@BelongsToBranch(Group)` on PaginateSessionsDto.groupId**: Validates group filter belongs to actor's center.
- **`@Exists(Session)`**: Validates that `sessionId` exists in the database before processing any operation.
- **Center Filtering**: All repository queries automatically filter by the actor's `centerId` through group relations, ensuring users can only access sessions from their center.

---

## Business Rules & Validations

### 1. Session Generation Rules

- **Initial Generation**: When a group is created, generate sessions for 2 months from `class.startDate` (or current date if later)
- **Buffer Maintenance**: Maintain at least 4 weeks of future sessions via weekly cronjob
- **Teacher Conflict Prevention**: Skip session generation if teacher has overlapping session
- **Duplicate Prevention**: Skip if session with same `groupId` + `startTime` already exists

### 2. Schedule Update Cascade Rules

- **Only Future Sessions**: Only `SCHEDULED` sessions with `startTime > now()` are affected
- **Immutable Sessions**: Sessions with status `CONDUCTING`, `FINISHED`, or linked to payments/attendance are never modified
- **Extra Sessions Preserved**: Sessions with `isExtraSession: true` are never deleted by cascade
- **Link to ScheduleItem**: Only sessions linked to the updated `scheduleItemId` are regenerated

### 3. Session Deletion Rules

- **Status Requirement**: Only `SCHEDULED` sessions can be deleted
- **Payment/Attendance Check**: Cannot delete if linked to payments or attendance (TODO: implement)
- **Alternative**: If payments exist, must use cancel instead (triggers refund)

### 4. Session Update Rules

- **Status Requirement**: Only `SCHEDULED` sessions can be updated
- **Teacher Conflict**: Cannot update to a time that conflicts with teacher's other sessions
- **Payment/Attendance Check**: Cannot update if linked to payments or attendance (TODO: implement)

### 5. Class Terminal State Cleanup

- **Trigger**: When class status changes to `CANCELED` or `FINISHED`
- **Action**: Delete all future `SCHEDULED` sessions for all groups in the class
- **Preserved**: Sessions with status `CONDUCTING`, `FINISHED`, or `CANCELED` are preserved

---

## Automation (Cronjobs)

### SessionGenerationMaintenanceJob

**Location**: `src/modules/sessions/jobs/session-generation-maintenance.job.ts`

**Schedule**: Weekly (`@Cron(CronExpression.EVERY_WEEK)`)

**Purpose**: Maintains a 4-week buffer of future sessions for all active groups.

**Logic**:

1. Query all active groups (groups where class.status is `ACTIVE` or `NOT_STARTED`)
2. For each group:
   - Count future sessions
   - If fewer than 4 weeks of future sessions exist:
     - Call `generateBufferSessionsForGroup()`
     - Generates sessions up to 4 weeks from now

**Transaction Handling**: Uses `DataSource` directly (outside transaction context)

---

## Database Schema

### Sessions Table

**Migration**: `src/database/migrations/[timestamp]-CreateSessionsTable.ts`

```sql
CREATE TABLE "sessions" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "groupId" UUID NOT NULL,
  "scheduleItemId" UUID NULL,
  "title" VARCHAR(255) NULL,
  "startTime" TIMESTAMP NOT NULL,
  "endTime" TIMESTAMP NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
  "isExtraSession" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "createdBy" UUID NOT NULL,
  "updatedBy" UUID NULL,

  FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE,
  FOREIGN KEY ("scheduleItemId") REFERENCES "schedule_items"("id") ON DELETE SET NULL,
  FOREIGN KEY ("createdBy") REFERENCES "users"("id"),
  FOREIGN KEY ("updatedBy") REFERENCES "users"("id")
);

CREATE INDEX "IDX_sessions_groupId" ON "sessions"("groupId");
CREATE INDEX "IDX_sessions_scheduleItemId" ON "sessions"("scheduleItemId");
CREATE INDEX "IDX_sessions_startTime" ON "sessions"("startTime");
CREATE INDEX "IDX_sessions_status" ON "sessions"("status");
CREATE INDEX "IDX_sessions_groupId_status" ON "sessions"("groupId", "status");
CREATE UNIQUE INDEX "IDX_sessions_groupId_startTime" ON "sessions"("groupId", "startTime");
```

---

## Future Integration Points

### Payment Integration (TODO)

**Location**: Multiple files with `TODO` comments

**Requirements**:

1. Check for linked payments before session deletion/update
2. Implement refund logic when session is canceled
3. Create `SessionPaymentListener` to handle payment events (placeholder exists)

**Affected Methods**:

- `SessionsService.updateSession()` - Check for payments
- `SessionsService.deleteSession()` - Check for payments
- `SessionsService.cancelSession()` - Trigger refund
- `SessionValidationService.validateSessionDeletion()` - Check payments

### Attendance Integration (TODO)

**Location**: Multiple files with `TODO` comments

**Requirements**:

1. Check for linked attendance before session deletion/update
2. Create `SessionAttendanceListener` to handle attendance events (placeholder exists)

**Affected Methods**:

- `SessionsService.updateSession()` - Check for attendance
- `SessionsService.deleteSession()` - Check for attendance
- `SessionValidationService.validateSessionDeletion()` - Check attendance

### Event Listeners (Placeholders)

- **SessionPaymentListener**: `src/modules/sessions/listeners/session-payment-listener.ts` (placeholder)
- **SessionAttendanceListener**: `src/modules/sessions/listeners/session-attendance-listener.ts` (placeholder)

These listeners are registered in `SessionsModule` but currently only contain TODO comments for future implementation.

---

## Module Registration

The Sessions Module is registered in the main application:

**Location**: `src/app.module.ts`

```typescript
imports: [
  // ... other modules
  SessionsModule,
];
```

**Module Definition**: `src/modules/sessions/sessions.module.ts`

**Exports**:

- `SessionsService`
- `SessionsRepository`

**Dependencies**:

- `SharedModule` (for TypeSafeEventEmitter, ActivityLogModule, etc.)
- `AccessControlModule` (for permissions)
- `TypeOrmModule.forFeature([Session, Group, ScheduleItem, Class])`

---

## Summary

The Sessions Module provides a robust, event-driven system for managing class sessions with:

- ✅ Automatic generation from schedule templates
- ✅ Rolling window management (2-month initial, 4-week buffer)
- ✅ Teacher conflict prevention
- ✅ Schedule cascade updates
- ✅ Lifecycle management (SCHEDULED → CONDUCTING → FINISHED)
- ✅ Manual session creation
- ✅ Event-driven integration with classes module
- 🔄 Payment integration (TODO)
- 🔄 Attendance integration (TODO)

The module maintains clear separation from the classes module while providing seamless integration through events, ensuring maintainability and scalability.
