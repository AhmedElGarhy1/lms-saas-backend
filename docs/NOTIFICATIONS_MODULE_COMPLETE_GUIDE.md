# 📚 Notifications Module - Complete Technical Guide

**Version:** 2.0  
**Last Updated:** 2024  
**Audience:** Senior Engineers, Architects, Developers

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Event Flow & Processing](#event-flow--processing)
4. [Channels](#channels)
5. [Dynamic Configuration](#dynamic-configuration)
6. [Execution Order](#execution-order)
7. [Caching Strategy](#caching-strategy)
8. [Cron Jobs & Scheduled Tasks](#cron-jobs--scheduled-tasks)
9. [Dead Letter Queue (DLQ)](#dead-letter-queue-dlq)
10. [Complete Flow Diagrams](#complete-flow-diagrams)
11. [Template System](#template-system)
12. [Batch Processing & Performance](#batch-processing--performance)
13. [Test Coverage](#test-coverage)
14. [Extending the System](#extending-the-system)
15. [Troubleshooting](#troubleshooting)

---

## Executive Summary

The Notifications Module is a **production-grade, event-driven notification system** built on NestJS that supports multiple channels (Email, SMS, WhatsApp, In-App, Push), dynamic channel selection, circuit breakers, idempotency, rate limiting, and comprehensive error handling.

### Key Features

- ✅ **Multi-Channel Support**: Email, SMS, WhatsApp, In-App, Push
- ✅ **Event-Driven Architecture**: Listens to domain events and triggers notifications
- ✅ **Dynamic Channel Selection**: Automatically selects optimal channels based on user activity
- ✅ **Circuit Breakers**: Prevents cascading failures with per-channel circuit breakers
- ✅ **Idempotency**: Prevents duplicate notifications using Redis-based distributed locks
- ✅ **Rate Limiting**: Per-channel rate limiting to prevent abuse
- ✅ **Queue-Based Processing**: BullMQ for reliable, scalable job processing
- ✅ **Template System**: Handlebars-based templates with multi-locale support
- ✅ **Batch Processing**: Efficient batch processing with configurable concurrency
- ✅ **Comprehensive Testing**: 34+ test files covering unit, integration, and runtime validation

### System Characteristics

- **Scalability**: Queue-based architecture supports horizontal scaling
- **Reliability**: Circuit breakers, retries, DLQ, and idempotency ensure delivery
- **Performance**: Template caching, batch processing, and optimized database queries
- **Maintainability**: Clean architecture with pure services, clear boundaries, and comprehensive tests

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Domain Events Layer                          │
│  (CenterEvents, AuthEvents, UserEvents, etc.)                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              NotificationListener (Event Listener)              │
│  • Validates event data                                          │
│  • Resolves recipients                                           │
│  • Triggers NotificationService                                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              NotificationService (Orchestrator)                 │
│  • Validates recipients                                         │
│  • Groups recipients by template data                           │
│  • Pre-renders templates for bulk groups                        │
│  • Processes recipients with concurrency control                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│         NotificationPipelineService (Pipeline)                 │
│  • Extracts event data                                           │
│  • Determines enabled channels                                   │
│  • Selects optimal channels (dynamic)                            │
│  • Prepares template data                                       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│         NotificationRouterService (Router)                      │
│  • Validates recipients per channel                            │
│  • Checks idempotency                                           │
│  • Renders templates (or uses pre-rendered cache)                │
│  • Builds channel-specific payloads                            │
│  • Enqueues to BullMQ queue (or sends IN_APP directly)         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│         NotificationProcessor (BullMQ Worker)                   │
│  • Processes queued jobs                                         │
│  • Applies retry strategies                                     │
│  • Sends via NotificationSenderService                          │
│  • Logs results                                              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│         NotificationSenderService (Sender)                     │
│  • Routes to channel-specific adapters                         │
│  • Applies circuit breakers                                     │
│  • Handles retries                                              │
│  • Records metrics                                              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Channel Adapters (Email, SMS, etc.)                │
│  • Channel-specific implementation                              │
│  • Provider integration (Twilio, SendGrid, etc.)               │
└─────────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. **NotificationListener**

- **Purpose**: Event listener that subscribes to domain events
- **Location**: `src/modules/notifications/listeners/notification.listener.ts`
- **Responsibilities**:
  - Listens to `@OnEvent()` decorators for domain events
  - Validates event data against manifest requirements
  - Resolves recipients from event data
  - Triggers `NotificationService.trigger()`

#### 2. **NotificationService**

- **Purpose**: Main orchestrator for notification processing
- **Location**: `src/modules/notifications/services/notification.service.ts`
- **Responsibilities**:
  - Validates and deduplicates recipients
  - Groups recipients by template data (for bulk optimization)
  - Pre-renders templates for groups with multiple recipients
  - Processes recipients with concurrency control via `MultiRecipientProcessor`
  - Returns bulk processing results

#### 3. **NotificationPipelineService**

- **Purpose**: Processes notifications through pipeline steps
- **Location**: `src/modules/notifications/services/pipeline/notification-pipeline.service.ts`
- **Responsibilities**:
  - Extracts event data and recipient information
  - Determines enabled channels from manifest
  - Selects optimal channels (dynamic selection based on user activity)
  - Prepares template data

#### 4. **NotificationRouterService**

- **Purpose**: Routes notifications to channels
- **Location**: `src/modules/notifications/services/routing/notification-router.service.ts`
- **Responsibilities**:
  - Validates recipients per channel
  - Checks idempotency (prevents duplicates)
  - Renders templates (or uses pre-rendered cache)
  - Builds channel-specific payloads
  - Enqueues to BullMQ queue (or sends IN_APP directly)

#### 5. **NotificationProcessor**

- **Purpose**: BullMQ worker that processes queued jobs
- **Location**: `src/modules/notifications/processors/notification.processor.ts`
- **Responsibilities**:
  - Processes jobs from BullMQ queue
  - Applies channel-specific retry strategies
  - Sends notifications via `NotificationSenderService`
  - Logs results to database
  - Handles failures and retries

#### 6. **NotificationSenderService**

- **Purpose**: Sends notifications via channel adapters
- **Location**: `src/modules/notifications/services/notification-sender.service.ts`
- **Responsibilities**:
  - Routes payloads to channel-specific adapters
  - Applies circuit breakers (per-channel)
  - Handles retries with exponential backoff
  - Records metrics

#### 7. **Channel Adapters**

- **Purpose**: Channel-specific implementations
- **Locations**:
  - `src/modules/notifications/adapters/email.adapter.ts`
  - `src/modules/notifications/adapters/sms.adapter.ts`
  - `src/modules/notifications/adapters/whatsapp.adapter.ts`
  - `src/modules/notifications/adapters/in-app.adapter.ts`
- **Responsibilities**:
  - Channel-specific sending logic
  - Provider integration (Twilio, SendGrid, etc.)
  - Error handling and transformation

---

## Event Flow & Processing

### How Events Start

Events are triggered by domain services using NestJS's `EventEmitter2`:

```typescript
// Example: Center creation event
this.eventEmitter.emit(CenterEvents.CREATED, {
  actor: currentUser,
  center: newCenter,
});
```

### Event Processing Flow

#### Step 1: Event Emission

Domain services emit events when actions occur (e.g., user created, center updated, password reset requested).

#### Step 2: NotificationListener Receives Event

The `NotificationListener` uses `@OnEvent()` decorators to listen to events:

```typescript
@OnEvent(CenterEvents.CREATED)
async handleCenterCreated(event: CreateCenterEvent) {
  // 1. Validate event data
  const missingVariables = this.validateEventData(
    NotificationType.CENTER_CREATED,
    'OWNER',
    event,
  );

  // 2. Resolve recipients
  const recipient: RecipientInfo = {
    userId: actor.id,
    phone: actor.getPhone(),
    email: center.email,
    locale: actor.userInfo?.locale || 'en',
    centerId: center.id,
  };

  // 3. Trigger notification
  await this.notificationService.trigger(
    NotificationType.CENTER_CREATED,
    {
      audience: 'OWNER',
      event,
      recipients: [recipient],
    },
  );
}
```

#### Step 3: NotificationService Processing

The `NotificationService.trigger()` method:

1. **Validates Recipients**: Checks phone, locale, and other required fields
2. **Deduplicates Recipients**: Removes duplicate recipients based on userId
3. **Groups Recipients**: Groups recipients by template data hash (for bulk optimization)
4. **Pre-renders Templates**: For groups with multiple recipients, pre-renders templates once
5. **Processes Recipients**: Uses `MultiRecipientProcessor` to process recipients with concurrency control

```typescript
async trigger(
  type: NotificationType,
  options: {
    audience: AudienceId;
    event: NotificationEvent;
    recipients: RecipientInfo[];
    channels?: NotificationChannel[];
  },
): Promise<BulkNotificationResult> {
  // 1. Validate recipients
  const validationResult = await this.validator.validateRecipients(
    recipients,
    type,
  );

  // 2. Deduplicate
  const uniqueRecipients = this.deduplicateRecipients(
    validationResult.valid,
  );

  // 3. Group by template data
  const recipientGroups = this.groupRecipientsByTemplateData(
    uniqueRecipients,
    type,
    event,
    manifest,
    audience,
  );

  // 4. Pre-render for bulk groups
  for (const group of recipientGroups) {
    if (group.recipients.length > 1) {
      await this.preRenderTemplatesForGroup(
        group,
        type,
        event,
        manifest,
        audience,
        preRenderedCache,
        correlationId,
      );
    }
  }

  // 5. Process recipients with concurrency control
  const processResults = await this.multiRecipientProcessor.processRecipients(
    uniqueRecipients,
    async (recipient) => {
      await this.processEventForRecipient(
        type,
        event,
        correlationId,
        recipient,
        manifest,
        audience,
        channels,
        preRenderedCache,
      );
    },
  );

  return result;
}
```

#### Step 4: Pipeline Processing

For each recipient, `NotificationPipelineService`:

1. **Extracts Event Data**: Populates recipient information in context
2. **Determines Channels**: Gets enabled channels from manifest
3. **Selects Optimal Channels**: Dynamically selects channels based on user activity
4. **Prepares Template Data**: Merges event data with recipient data

#### Step 5: Routing

`NotificationRouterService` routes to channels:

1. **Validates Recipient**: Per-channel validation (email for EMAIL, phone for SMS/WhatsApp, userId for IN_APP)
2. **Checks Idempotency**: Prevents duplicate sends using Redis distributed locks
3. **Renders Template**: Uses pre-rendered cache if available, otherwise renders on-demand
4. **Builds Payload**: Creates channel-specific payload
5. **Enqueues or Sends**: Enqueues to BullMQ (for async channels) or sends directly (for IN_APP)

#### Step 6: Queue Processing

`NotificationProcessor` (BullMQ worker):

1. **Processes Job**: Dequeues job from BullMQ queue
2. **Applies Retry Strategy**: Gets channel-specific retry config
3. **Sends Notification**: Calls `NotificationSenderService.send()`
4. **Logs Result**: Records success/failure in database
5. **Handles Retries**: Retries on failure with exponential backoff

#### Step 7: Sending

`NotificationSenderService`:

1. **Checks Circuit Breaker**: Verifies circuit is not OPEN
2. **Routes to Adapter**: Calls channel-specific adapter
3. **Records Metrics**: Tracks success/failure/latency
4. **Handles Errors**: Records failures for circuit breaker

---

## Channels

### Supported Channels

| Channel      | Status      | Provider     | Description                                     |
| ------------ | ----------- | ------------ | ----------------------------------------------- |
| **EMAIL**    | ✅ Active   | SendGrid     | Email notifications with HTML/text support      |
| **SMS**      | ✅ Active   | Twilio       | SMS notifications via Twilio API                |
| **WHATSAPP** | ✅ Active   | Twilio/Meta  | WhatsApp notifications via Twilio or Meta API   |
| **IN_APP**   | ✅ Active   | WebSocket    | Real-time in-app notifications via Socket.IO    |
| **PUSH**     | 🔄 Reserved | FCM (Future) | Mobile push notifications (reserved for future) |

### Channel-Specific Behavior

#### EMAIL Channel

- **Recipient**: Must be a valid email address
- **Payload**: Requires `subject` and `html`/`content`
- **Provider**: SendGrid
- **Rate Limit**: 50 per minute per user
- **Retry**: 3 attempts with exponential backoff
- **Timeout**: 30 seconds

#### SMS Channel

- **Recipient**: Must be a valid E.164 phone number
- **Payload**: Text content only (max 1600 characters)
- **Provider**: Twilio
- **Rate Limit**: 20 per minute per user
- **Retry**: 2 attempts with exponential backoff
- **Timeout**: 30 seconds

#### WHATSAPP Channel

- **Recipient**: Must be a valid E.164 phone number
- **Payload**: Text content only
- **Provider**: Twilio or Meta
- **Rate Limit**: 30 per minute per user
- **Retry**: 2 attempts with exponential backoff
- **Timeout**: 45 seconds

#### IN_APP Channel

- **Recipient**: User ID (not email/phone)
- **Payload**: Requires `title` and `message`
- **Provider**: Socket.IO (WebSocket)
- **Rate Limit**: 100 per minute per user
- **Retry**: 3 attempts with exponential backoff (WebSocket-specific)
- **Timeout**: 10 seconds
- **Special**: Sent directly (not queued) for real-time delivery

#### PUSH Channel

- **Status**: Reserved for future implementation
- **Provider**: Firebase Cloud Messaging (FCM)
- **Note**: Infrastructure ready, implementation pending

### Channel Selection Logic

Channels are selected dynamically based on:

1. **Manifest Configuration**: Each notification type defines available channels per audience
2. **User Activity**: Inactive users prefer external channels (EMAIL, SMS, WhatsApp) over IN_APP
3. **Event Priority**: Critical events (priority >= 8) ensure external channel exists
4. **Requested Channels**: Can be overridden via `channels` parameter

```typescript
// Example: Channel selection for inactive user
if (!isActive && selectedChannels.includes(NotificationChannel.IN_APP)) {
  if (hasExternalChannel()) {
    // Remove IN_APP, prefer external channels
    selectedChannels = selectedChannels.filter(
      (ch) => ch !== NotificationChannel.IN_APP,
    );
  }
}

// Example: Critical event ensures external channel
if (effectivePriority >= 8 && !hasExternalChannel()) {
  selectedChannels.push(NotificationChannel.SMS);
}
```

---

## Dynamic Configuration

### Manifest System

The notification system uses a **manifest-based configuration** that allows:

- **Multi-Audience Support**: Different audiences can have different channels and configurations
- **Channel-Specific Templates**: Each channel can have its own template
- **Required Variables**: Define required template variables per channel
- **Priority Levels**: Set notification priority (0-10)

#### Manifest Structure

```typescript
export const CENTER_CREATED_MANIFEST: NotificationManifest = {
  type: NotificationType.CENTER_CREATED,
  priority: 5,
  templateBase: 'center-created',
  audiences: {
    OWNER: {
      channels: {
        [NotificationChannel.EMAIL]: {
          requiredVariables: ['center', 'actor'],
        },
        [NotificationChannel.IN_APP]: {
          requiredVariables: ['center', 'actor'],
        },
      },
    },
    ADMIN: {
      channels: {
        [NotificationChannel.EMAIL]: {
          requiredVariables: ['center', 'actor'],
        },
      },
    },
  },
};
```

#### Dynamic Channel Selection

The `ChannelSelectionService` dynamically selects channels based on:

- **User Activity**: Checks last activity timestamp
- **Event Priority**: Critical events ensure external channels
- **Channel Availability**: Only selects channels available in manifest

```typescript
async selectOptimalChannels(
  userId: string,
  baseChannels: NotificationChannel[],
  eventContext: EventContext,
  priority?: number,
): Promise<NotificationChannel[]> {
  // 1. Check user activity
  const isActive = await this.isUserActive(userId);

  // 2. Apply rules
  if (!isActive && baseChannels.includes(NotificationChannel.IN_APP)) {
    // Prefer external channels for inactive users
    if (hasExternalChannel(baseChannels)) {
      return baseChannels.filter(ch => ch !== NotificationChannel.IN_APP);
    }
  }

  // 3. Ensure external channel for critical events
  if (priority >= 8 && !hasExternalChannel(baseChannels)) {
    return [...baseChannels, NotificationChannel.SMS];
  }

  return baseChannels;
}
```

---

## Execution Order

### Complete Execution Flow

```
1. Event Emitted
   └─> Domain service emits event

2. NotificationListener Receives Event
   ├─> Validates event data
   ├─> Resolves recipients
   └─> Calls NotificationService.trigger()

3. NotificationService Processing
   ├─> Validates recipients
   ├─> Deduplicates recipients
   ├─> Groups recipients by template data
   ├─> Pre-renders templates for bulk groups
   └─> Processes recipients (with concurrency control)

4. For Each Recipient: Pipeline Processing
   ├─> Extract event data
   ├─> Determine enabled channels (from manifest)
   ├─> Select optimal channels (dynamic)
   └─> Prepare template data

5. For Each Channel: Routing
   ├─> Validate recipient (per-channel)
   ├─> Check rate limit (FIRST - prevents resource waste)
   ├─> Check idempotency (prevents duplicates)
   ├─> Render template (or use pre-rendered cache)
   ├─> Build payload (channel-specific)
   └─> Enqueue to queue (or send IN_APP directly)

6. Queue Processing (BullMQ Worker)
   ├─> Dequeue job
   ├─> Get retry strategy
   ├─> Send via NotificationSenderService
   ├─> Log result
   └─> Retry on failure (with exponential backoff)

7. Sending
   ├─> Check circuit breaker
   ├─> Route to adapter
   ├─> Send notification
   ├─> Record metrics
   └─> Handle errors (record failures for circuit breaker)
```

### Critical Execution Order

**IMPORTANT**: The order of operations in `NotificationRouterService.route()` is critical:

1. **Rate Limit Check** (FIRST) - Prevents resource waste if rate limited
2. **Recipient Validation** - Ensures valid recipient before processing
3. **Idempotency Check** - Prevents duplicate sends
4. **Retry Strategy** - Determines retry config (BEFORE sending)
5. **Template Rendering** - Renders template (or uses cache)
6. **Payload Building** - Builds channel-specific payload
7. **Sending/Enqueueing** - Sends or enqueues with retry strategy

This order ensures:

- **Early Exit**: Rate limit failures don't waste resources
- **Idempotency**: Duplicate prevention happens before rendering
- **Efficiency**: Template rendering only happens if all checks pass

---

## Caching Strategy

### Multi-Level Caching

The notification system uses a **three-level caching strategy**:

#### Level 1: In-Memory Compiled Template Cache

- **Location**: `RedisTemplateCacheService.compiledCache` (Map)
- **Purpose**: Fastest access for compiled Handlebars templates
- **Size Limit**: 100 templates (FIFO eviction)
- **TTL**: Per-instance (cleared on restart)
- **Performance**: ~0.1ms access time

#### Level 2: Redis Template Source Cache

- **Location**: Redis (key: `template:source:{locale}:{channel}:{templateName}`)
- **Purpose**: Distributed cache for template source code
- **TTL**: 1 hour (configurable via `NotificationConfig.templateCacheTtlSeconds`)
- **Performance**: ~1-5ms access time (network latency)
- **Fail-Open**: If Redis fails, loads directly from filesystem

#### Level 3: Filesystem Template Storage

- **Location**: `src/modules/notifications/templates/`
- **Purpose**: Source of truth for templates
- **Structure**: `{channel}/{locale}/{templateName}.hbs`
- **Performance**: ~5-10ms (file I/O)

### Template Caching Flow

```
1. Request Template
   └─> Check Level 1 (In-Memory)

2. Cache Miss in Level 1
   └─> Check Level 2 (Redis)

3. Cache Miss in Level 2
   └─> Load from Level 3 (Filesystem)
   └─> Store in Level 2 (Redis)
   └─> Compile Handlebars
   └─> Store in Level 1 (In-Memory)
   └─> Return compiled template
```

### Pre-Rendered Template Cache

For **bulk notifications** (multiple recipients with same template data):

- **Location**: `Map<string, RenderedNotification>` in `NotificationService`
- **Purpose**: Pre-render templates once for groups of recipients
- **Key**: `{type}:{channel}:{locale}:{templateDataHash}:{audience}`
- **Performance**: Eliminates redundant template rendering

```typescript
// Example: Pre-rendering for bulk group
const recipientGroups = this.groupRecipientsByTemplateData(
  uniqueRecipients,
  type,
  event,
  manifest,
  audience,
);

for (const group of recipientGroups) {
  if (group.recipients.length > 1) {
    // Pre-render once for the group
    await this.preRenderTemplatesForGroup(
      group,
      type,
      event,
      manifest,
      audience,
      preRenderedCache,
      correlationId,
    );
  }
}
```

### Cache Invalidation

- **Automatic**: Templates expire after TTL (1 hour)
- **Manual**: `RedisTemplateCacheService.clearCache()` method
- **Hot Reload**: `TemplateHotReloadService` watches filesystem changes (development only)

---

## Cron Jobs & Scheduled Tasks

### DLQ Cleanup Job

**Purpose**: Cleans up old failed notification logs from the database

**Schedule**: Daily at 2:00 AM (`@Cron(CronExpression.EVERY_DAY_AT_2AM)`)

**Location**: `src/modules/notifications/jobs/notification-dlq-cleanup.job.ts`

**Process**:

1. Calculates cutoff date (retention period: 90 days by default)
2. Finds all failed notifications older than cutoff
3. Deletes old entries using `bulkDelete`
4. Persists cleanup run timestamp to Redis
5. Logs statistics (deleted count, duration, etc.)

**Configuration**:

```typescript
NotificationConfig.dlq.retentionDays = 90; // Default
```

**Health Monitoring**:

- Tracks last cleanup run timestamp in Redis
- Detects stalling (if last run > 25 hours ago)
- Provides health status via `getDlqHealthStatus()`

### Redis Cleanup Job

**Purpose**: Cleans up expired Redis keys (circuit breaker states, idempotency locks, etc.)

**Schedule**: Hourly (`@Cron(CronExpression.EVERY_HOUR)`)

**Location**: `src/modules/notifications/jobs/redis-cleanup.job.ts`

**Process**:

1. Scans Redis for notification-related keys
2. Removes expired keys
3. Logs cleanup statistics

---

## Dead Letter Queue (DLQ)

### What is DLQ?

The **Dead Letter Queue (DLQ)** is a storage mechanism for failed notifications that cannot be processed after all retry attempts.

### DLQ Flow

```
1. Notification Fails
   └─> Retry attempts exhausted

2. Job Moves to Failed State
   └─> BullMQ marks job as failed

3. Logged to Database
   └─> NotificationLogRepository.create()
   └─> Status: FAILED

4. DLQ Cleanup Job
   └─> Runs daily at 2 AM
   └─> Deletes entries older than retention period (90 days)
```

### DLQ Storage

- **Location**: `notification_logs` table in database
- **Status**: `NotificationStatus.FAILED`
- **Retention**: 90 days (configurable)
- **Cleanup**: Automatic via `NotificationDlqCleanupJob`

### DLQ Health Monitoring

The system tracks DLQ health:

```typescript
async getDlqHealthStatus(): Promise<{
  totalFailed: number;
  oldestFailedDate: Date | null;
  entriesToBeDeleted: number;
  lastCleanupRun: Date | null;
  isHealthy: boolean;
}> {
  // Checks:
  // 1. Total failed count < 10,000 (warning threshold)
  // 2. Last cleanup run < 25 hours ago (stalling detection)
  // 3. Oldest entry age
}
```

### DLQ Access

Failed notifications can be queried:

```typescript
// Get all failed notifications
const failed = await logRepository.findMany({
  where: { status: NotificationStatus.FAILED },
});

// Get failed notifications for a user
const userFailed = await logRepository.findByUserId(userId, {
  status: NotificationStatus.FAILED,
});
```

---

## Complete Flow Diagrams

### End-to-End Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    EVENT EMISSION                                │
│  Domain Service emits event (e.g., CenterEvents.CREATED)         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              NOTIFICATION LISTENER                                │
│  • @OnEvent() decorator receives event                            │
│  • Validates event data against manifest                          │
│  • Resolves recipients from event                                 │
│  • Calls NotificationService.trigger()                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              NOTIFICATION SERVICE                                │
│  • Validates recipients                                          │
│  • Deduplicates recipients                                       │
│  • Groups recipients by template data                            │
│  • Pre-renders templates for bulk groups                         │
│  • Processes recipients with concurrency control                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│         MULTI-RECIPIENT PROCESSOR                                │
│  • Processes recipients concurrently (limit: 10)                 │
│  • For each recipient:                                           │
│    └─> processEventForRecipient()                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              PIPELINE SERVICE                                    │
│  • Extracts event data                                           │
│  • Determines enabled channels (from manifest)                  │
│  • Selects optimal channels (dynamic)                            │
│  • Prepares template data                                       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              ROUTER SERVICE                                      │
│  For each channel:                                               │
│  • Validates recipient (per-channel)                             │
│  • Checks rate limit (FIRST)                                    │
│  • Checks idempotency                                            │
│  • Renders template (or uses pre-rendered cache)                 │
│  • Builds payload                                                │
│  • Enqueues to BullMQ (or sends IN_APP directly)                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              BULLMQ QUEUE                                        │
│  • Jobs queued with priority                                     │
│  • Waiting for worker                                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              PROCESSOR (Worker)                                  │
│  • Dequeues job                                                  │
│  • Gets retry strategy                                           │
│  • Calls NotificationSenderService.send()                        │
│  • Logs result                                                   │
│  • Retries on failure                                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              SENDER SERVICE                                      │
│  • Checks circuit breaker                                        │
│  • Routes to adapter                                             │
│  • Sends notification                                            │
│  • Records metrics                                               │
│  • Handles errors                                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              CHANNEL ADAPTER                                     │
│  • Channel-specific implementation                               │
│  • Provider integration (Twilio, SendGrid, etc.)                │
│  • Returns result                                                │
└─────────────────────────────────────────────────────────────────┘
```

### Per-Channel Routing Flow

```
For each channel in finalChannels:
  │
  ├─> Validate recipient
  │   └─> EMAIL: Must be valid email
  │   └─> SMS/WHATSAPP: Must be valid E.164 phone
  │   └─> IN_APP: Uses userId
  │
  ├─> Check rate limit (FIRST)
  │   └─> If rate limited: Skip channel, continue to next
  │
  ├─> Check idempotency
  │   └─> Acquire distributed lock (Redis SETNX)
  │   └─> If already sent: Skip channel, continue to next
  │
  ├─> Render template
  │   ├─> Check pre-rendered cache
  │   ├─> If cache hit: Use cached rendered content
  │   └─> If cache miss: Render on-demand
  │
  ├─> Build payload
  │   └─> Channel-specific payload structure
  │
  └─> Enqueue or send
      ├─> IN_APP: Send directly (real-time)
      └─> Others: Enqueue to BullMQ (async)
```

### Circuit Breaker Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              CIRCUIT BREAKER STATE MACHINE                      │
└─────────────────────────────────────────────────────────────────┘

CLOSED (Normal Operation)
  │
  ├─> Request succeeds
  │   └─> Stay CLOSED
  │
  └─> Request fails
      └─> Record failure in Redis ZSET
          └─> Count failures in window
              ├─> If failures < threshold (5)
              │   └─> Stay CLOSED
              └─> If failures >= threshold (5)
                  └─> Transition to OPEN

OPEN (Circuit Open - Blocking Requests)
  │
  └─> Wait for reset timeout (60 seconds)
      └─> Transition to HALF_OPEN

HALF_OPEN (Testing Recovery)
  │
  ├─> Request succeeds
  │   └─> Clear failures, transition to CLOSED
  │
  └─> Request fails
      └─> Record failure, transition back to OPEN
```

---

## Template System

### Template Structure

Templates are organized by channel and locale:

```
src/modules/notifications/templates/
├── email/
│   ├── en/
│   │   ├── center-created.hbs
│   │   ├── password-reset.hbs
│   │   └── ...
│   └── ar/
│       ├── center-created.hbs
│       └── ...
├── sms/
│   ├── en/
│   │   ├── center-created.hbs
│   │   └── ...
│   └── ar/
│       └── ...
├── whatsapp/
│   ├── en/
│   └── ar/
├── in-app/
│   ├── en/
│   └── ar/
└── push/
    ├── en/
    └── ar/
```

### Template Loading & Compilation

#### Step 1: Template Resolution

The `NotificationManifestResolver` resolves template paths:

```typescript
resolveTemplatePath(
  manifest: NotificationManifest,
  channel: NotificationChannel,
  config: ChannelManifest,
): string {
  // 1. Check explicit template in config
  if (config.template) {
    return config.template;
  }

  // 2. Derive from templateBase
  if (manifest.templateBase) {
    const channelFolder = getChannelFolder(channel); // e.g., "email"
    return `${channelFolder}/${manifest.templateBase}`; // e.g., "email/center-created"
  }

  throw new Error('Template path not specified');
}
```

#### Step 2: Template Loading

The `NotificationTemplateService` loads template content:

```typescript
async loadTemplateContent(
  templateName: string,
  locale: string = 'en',
  channel: NotificationChannel,
): Promise<string> {
  // 1. Resolve template path
  const templatePath = resolveTemplatePath(templateName, locale, channel);

  // 2. Load from filesystem
  const content = await fs.readFile(templatePath, 'utf-8');

  return content;
}
```

#### Step 3: Template Compilation

Templates are compiled using Handlebars:

```typescript
async loadTemplateWithChannel(
  templateName: string,
  locale: string = 'en',
  channel: NotificationChannel,
): Promise<HandlebarsTemplateDelegate> {
  const cacheKey = `${locale}:${channel}:${templateName}`;

  // Get compiled template with Redis caching
  return this.redisCache.getCompiledTemplate(cacheKey, async () => {
    // 1. Load template source (from Redis cache or filesystem)
    const templateContent = await this.loadTemplateContent(
      templateName,
      locale,
      channel,
    );

    // 2. Compile Handlebars template
    return Handlebars.compile(templateContent);
  });
}
```

### Template Rendering

Templates are rendered with template data:

```typescript
async render(
  type: NotificationType,
  channel: NotificationChannel,
  templateData: NotificationTemplateData,
  locale: string,
  audience?: AudienceId,
): Promise<RenderedNotification> {
  // 1. Get manifest
  const manifest = this.manifestResolver.getManifest(type);

  // 2. Resolve template path
  const templatePath = this.manifestResolver.resolveTemplatePath(
    manifest,
    channel,
    config,
  );

  // 3. Load and compile template
  const template = await this.templateService.loadTemplateWithChannel(
    templatePath,
    locale,
    channel,
  );

  // 4. Render with data
  const rendered = template(templateData);

  return {
    content: rendered,
    subject: extractSubject(rendered, channel),
    html: extractHtml(rendered, channel),
    metadata: {
      template: templatePath,
      locale,
      channel,
    },
  };
}
```

### Template Compilation: Per-Recipient vs Batch

#### Per-Recipient Compilation (Default)

- **When**: Single recipient or recipients with different template data
- **Process**: Template compiled and rendered for each recipient
- **Performance**: ~5-10ms per recipient (with caching)

#### Batch Compilation (Optimization)

- **When**: Multiple recipients with same template data
- **Process**: Template compiled once, rendered once, reused for all recipients
- **Performance**: ~5-10ms for first recipient, ~0.1ms for subsequent (cache hit)

```typescript
// Example: Batch optimization
const recipientGroups = this.groupRecipientsByTemplateData(
  uniqueRecipients,
  type,
  event,
  manifest,
  audience,
);

for (const group of recipientGroups) {
  if (group.recipients.length > 1) {
    // Pre-render once for the group
    await this.preRenderTemplatesForGroup(
      group,
      type,
      event,
      manifest,
      audience,
      preRenderedCache,
      correlationId,
    );
  }
}

// Later, when processing recipients:
if (preRenderedCache && preRenderedCache.has(cacheKey)) {
  // Use pre-rendered content (cache hit)
  rendered = preRenderedCache.get(cacheKey)!;
} else {
  // Render on-demand (cache miss)
  rendered = await this.renderer.render(...);
}
```

---

## Batch Processing & Performance

### Batch Processing Architecture

When processing **many notifications** (e.g., 1000+ recipients):

#### Concurrency Control

The system uses **multiple levels of concurrency control**:

1. **Recipient Processing**: `MultiRecipientProcessor` limits concurrent recipient processing (default: 10)
2. **Queue Processing**: BullMQ processor concurrency (default: 5)
3. **Send Multiple**: `NotificationSenderService.sendMultiple()` concurrency (default: 5)

```typescript
// Level 1: Recipient processing concurrency
const processResults = await this.multiRecipientProcessor.processRecipients(
  uniqueRecipients, // 1000 recipients
  async (recipient) => {
    // Processed with concurrency limit of 10
    await this.processEventForRecipient(...);
  },
);

// Level 2: Queue processing concurrency
@Processor('notifications', {
  concurrency: 5, // 5 concurrent jobs
})

// Level 3: Send multiple concurrency
async sendMultiple(payloads: NotificationPayload[]): Promise<ChannelResult[]> {
  const limit = pLimit(this.sendMultipleConcurrency); // 5 concurrent sends
  // ...
}
```

### CPU Usage & Resource Consumption

#### What Happens During Batch Processing?

1. **Recipient Processing** (CPU: Low, I/O: Medium)
   - Validates recipients
   - Groups by template data
   - Pre-renders templates (if bulk groups)
   - **CPU**: Template compilation (~5ms per template, cached after first)
   - **I/O**: Database queries for user data, Redis for idempotency

2. **Queue Enqueueing** (CPU: Low, I/O: Low)
   - Enqueues jobs to BullMQ (Redis)
   - **CPU**: Minimal (serialization)
   - **I/O**: Redis writes (~1ms per job)

3. **Queue Processing** (CPU: Medium, I/O: High)
   - BullMQ workers process jobs concurrently (5 workers)
   - **CPU**: Template rendering (~5ms per job, with caching)
   - **I/O**: External API calls (SendGrid, Twilio) - **bottleneck**

4. **Sending** (CPU: Low, I/O: Very High)
   - HTTP requests to external providers
   - **CPU**: Minimal (HTTP client)
   - **I/O**: Network latency (50-500ms per request)

#### Resource Consumption Summary

| Stage                    | CPU Usage | I/O Usage | Bottleneck         |
| ------------------------ | --------- | --------- | ------------------ |
| **Recipient Processing** | Low       | Medium    | Database queries   |
| **Queue Enqueueing**     | Low       | Low       | Redis writes       |
| **Queue Processing**     | Medium    | High      | External API calls |
| **Sending**              | Low       | Very High | Network latency    |

#### Is Everything Queued?

**Yes, except IN_APP**:

- **EMAIL, SMS, WhatsApp, PUSH**: All queued via BullMQ (async)
- **IN_APP**: Sent directly (synchronous) for real-time delivery

```typescript
// Example: Enqueueing vs Direct Send
if (channel === NotificationChannel.IN_APP) {
  // Direct send (synchronous)
  await this.inAppNotificationService.send(payload);
} else {
  // Enqueue to BullMQ (asynchronous)
  await this.queue.add('notification', payload, {
    priority: manifest.priority || 0,
  });
}
```

### Performance Optimization Strategies

1. **Template Caching**: Reduces compilation time from ~5ms to ~0.1ms (cache hit)
2. **Pre-Rendering**: Eliminates redundant template rendering for bulk groups
3. **Concurrency Control**: Prevents resource exhaustion while maximizing throughput
4. **Batch Enqueueing**: Groups payloads for bulk enqueue (reduces Redis round-trips)
5. **Circuit Breakers**: Prevents cascading failures and wasted resources

### Scaling Considerations

- **Horizontal Scaling**: BullMQ supports multiple workers across instances
- **Vertical Scaling**: Increase concurrency limits (processor, sendMultiple)
- **Database Optimization**: Index `notification_logs` table on `userId`, `status`, `createdAt`
- **Redis Optimization**: Use Redis Cluster for high availability

---

## Test Coverage

### Test Files Overview

The notifications module has **34 test files** covering:

#### Unit Tests (20 files)

- Service tests (notification.service.spec.ts, notification-sender.service.spec.ts, etc.)
- Adapter tests (email.adapter.spec.ts, sms.adapter.spec.ts, etc.)
- Utility tests (recipient-validation.service.spec.ts, payload-builder.service.spec.ts, etc.)

#### Integration Tests (8 files)

- End-to-end flow tests (trigger-flow.spec.ts, smoke-flow.spec.ts)
- Batch processing tests (batch-processing.spec.ts)
- Edge cases (edge-cases.spec.ts)
- Runtime validation (runtime-validation.spec.ts)

#### Repository Tests (2 files)

- NotificationLogRepository tests
- NotificationRepository tests

#### Job Tests (2 files)

- DLQ cleanup job tests
- Redis cleanup job tests

#### Gateway Tests (1 file)

- WebSocket gateway tests

#### Helper Tests (1 file)

- Async helpers, test environment guards

### Test Coverage by Component

| Component        | Test Files | Coverage |
| ---------------- | ---------- | -------- |
| **Services**     | 12         | ✅ High  |
| **Adapters**     | 4          | ✅ High  |
| **Processors**   | 1          | ✅ High  |
| **Repositories** | 2          | ✅ High  |
| **Jobs**         | 2          | ✅ High  |
| **Gateways**     | 1          | ✅ High  |
| **Integration**  | 8          | ✅ High  |
| **Helpers**      | 2          | ✅ High  |

### Key Test Scenarios

#### 1. **Circuit Breaker Tests**

- State transitions (CLOSED → OPEN → HALF_OPEN → CLOSED)
- Failure threshold validation
- Recovery testing
- Half-open state behavior

#### 2. **Idempotency Tests**

- Race condition prevention
- Lock expiry handling
- Redis reconnect scenarios
- Duplicate prevention

#### 3. **DLQ Tests**

- Cleanup job execution
- Timestamp persistence
- Stalling detection
- Health status

#### 4. **Batch Processing Tests**

- Concurrency limits
- Bulk template rendering
- Error handling
- Result aggregation

#### 5. **Integration Tests**

- End-to-end notification flow
- Multi-channel delivery
- Error recovery
- Retry strategies

### Running Tests

```bash
# Run all notification tests
npm test -- notifications

# Run specific test file
npm test -- notification.service.spec.ts

# Run with coverage
npm test -- --coverage notifications
```

---

## Extending the System

### Adding a New Channel

#### Step 1: Add Channel Enum

```typescript
// src/modules/notifications/enums/notification-channel.enum.ts
export enum NotificationChannel {
  // ... existing channels
  TELEGRAM = 'TELEGRAM', // New channel
}
```

#### Step 2: Create Adapter

```typescript
// src/modules/notifications/adapters/telegram.adapter.ts
import { Injectable } from '@nestjs/common';
import { NotificationAdapter } from '../interfaces/notification-adapter.interface';
import { TelegramNotificationPayload } from '../types/notification-payload.interface';

@Injectable()
export class TelegramAdapter
  implements NotificationAdapter<TelegramNotificationPayload>
{
  async send(payload: TelegramNotificationPayload): Promise<void> {
    // Implement Telegram API integration
  }

  getChannel(): NotificationChannel {
    return NotificationChannel.TELEGRAM;
  }
}
```

#### Step 3: Register Adapter

```typescript
// src/modules/notifications/services/notification-sender.service.ts
constructor(
  // ... existing adapters
  private readonly telegramAdapter: TelegramAdapter,
) {
  this.adapterRegistry.set(
    NotificationChannel.TELEGRAM,
    this.telegramAdapter,
  );
}
```

#### Step 4: Add Payload Type

```typescript
// src/modules/notifications/types/notification-payload.interface.ts
export interface TelegramNotificationPayload extends BaseNotificationPayload {
  channel: NotificationChannel.TELEGRAM;
  data: {
    message: string;
    chatId: string;
  };
}
```

#### Step 5: Update Recipient Validation

```typescript
// src/modules/notifications/services/recipient-validation.service.ts
determineAndValidateRecipient(
  channel: NotificationChannel,
  recipient: string | undefined,
  phone: string | undefined,
  userId: string,
): string | null {
  // ... existing channels
  if (channel === NotificationChannel.TELEGRAM) {
    // Validate Telegram chat ID
    return recipient || null;
  }
}
```

#### Step 6: Update Payload Builder

```typescript
// src/modules/notifications/services/payload-builder.service.ts
buildPayload(
  channel: NotificationChannel,
  basePayload: ReturnType<typeof this.buildBasePayload>,
  rendered: RenderedNotification,
  templateData: NotificationTemplateData,
  manifest: NotificationManifest,
): NotificationPayload | null {
  // ... existing channels
  case NotificationChannel.TELEGRAM:
    return {
      ...basePayload,
      data: {
        message: rendered.content as string,
        chatId: templateData.telegramChatId,
      },
    } as TelegramNotificationPayload;
}
```

#### Step 7: Add Configuration

```typescript
// src/modules/notifications/config/notification.config.ts
export const NotificationConfig = {
  // ... existing config
  rateLimit: {
    // ... existing channels
    telegram: 50, // Rate limit per minute
  },
  retry: {
    // ... existing channels
    telegram: {
      maxAttempts: 3,
      backoffType: 'exponential' as const,
      backoffDelay: 1000,
    },
  },
  timeouts: {
    // ... existing channels
    telegram: 30000, // 30 seconds
  },
};
```

#### Step 8: Create Templates

```
src/modules/notifications/templates/telegram/
├── en/
│   └── center-created.hbs
└── ar/
    └── center-created.hbs
```

#### Step 9: Update Manifest

```typescript
// src/modules/notifications/manifests/center/center-created.manifest.ts
export const CENTER_CREATED_MANIFEST: NotificationManifest = {
  // ... existing config
  audiences: {
    OWNER: {
      channels: {
        // ... existing channels
        [NotificationChannel.TELEGRAM]: {
          requiredVariables: ['center', 'actor'],
        },
      },
    },
  },
};
```

### Adding a New Notification Type

#### Step 1: Add Notification Type Enum

```typescript
// src/modules/notifications/enums/notification-type.enum.ts
export enum NotificationType {
  // ... existing types
  USER_INVITED = 'USER_INVITED', // New type
}
```

#### Step 2: Create Manifest

```typescript
// src/modules/notifications/manifests/user/user-invited.manifest.ts
import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';

export const USER_INVITED_MANIFEST: NotificationManifest = {
  type: NotificationType.USER_INVITED,
  priority: 6,
  templateBase: 'user-invited',
  audiences: {
    DEFAULT: {
      channels: {
        [NotificationChannel.EMAIL]: {
          requiredVariables: ['user', 'inviter', 'invitationLink'],
        },
        [NotificationChannel.IN_APP]: {
          requiredVariables: ['user', 'inviter'],
        },
      },
    },
  },
};
```

#### Step 3: Register Manifest

```typescript
// src/modules/notifications/manifests/registry/notification-registry.ts
import { USER_INVITED_MANIFEST } from '../user/user-invited.manifest';

export const NotificationRegistry: Record<
  NotificationType,
  NotificationManifest
> = {
  // ... existing manifests
  [NotificationType.USER_INVITED]: USER_INVITED_MANIFEST,
};
```

#### Step 4: Create Templates

```
src/modules/notifications/templates/
├── email/
│   ├── en/
│   │   └── user-invited.hbs
│   └── ar/
│       └── user-invited.hbs
└── in-app/
    ├── en/
    │   └── user-invited.hbs
    └── ar/
        └── user-invited.hbs
```

#### Step 5: Add Event Listener

```typescript
// src/modules/notifications/listeners/notification.listener.ts
@OnEvent(UserEvents.INVITED)
async handleUserInvited(event: UserInvitedEvent) {
  const recipient: RecipientInfo = {
    userId: event.userId,
    email: event.email,
    phone: event.phone,
    locale: event.locale || 'en',
  };

  await this.validateAndTriggerNotification(
    NotificationType.USER_INVITED,
    'DEFAULT',
    event,
    [recipient],
  );
}
```

### Adding a New Event

#### Step 1: Define Event Type

```typescript
// src/shared/events/user.events.enum.ts
export enum UserEvents {
  INVITED = 'user.invited',
  ACTIVATED = 'user.activated',
}
```

#### Step 2: Create Event Class

```typescript
// src/modules/user/events/user.events.ts
export class UserInvitedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly phone: string,
    public readonly inviterId: string,
    public readonly invitationLink: string,
  ) {}
}
```

#### Step 3: Emit Event

```typescript
// In your service
this.eventEmitter.emit(
  UserEvents.INVITED,
  new UserInvitedEvent(userId, email, phone, inviterId, invitationLink),
);
```

#### Step 4: Add Listener (see "Adding a New Notification Type" above)

---

## Troubleshooting

### Common Issues

#### 1. **Notifications Not Sending**

**Symptoms**: Notifications are triggered but not delivered

**Debugging Steps**:

1. Check `NotificationListener` logs for validation errors
2. Check `NotificationService` logs for recipient validation failures
3. Check BullMQ queue status: `await queue.getWaiting()`
4. Check circuit breaker state: `await circuitBreakerService.getCircuitState(channel)`
5. Check DLQ for failed notifications: `await logRepository.findMany({ status: FAILED })`

**Common Causes**:

- Invalid recipients (missing phone/email)
- Circuit breaker OPEN
- Rate limit exceeded
- Template rendering errors
- Provider API errors

#### 2. **Circuit Breaker Stuck OPEN**

**Symptoms**: All notifications for a channel are blocked

**Solution**:

```typescript
// Manually reset circuit breaker
await circuitBreakerService.recordSuccess(channel);
```

**Prevention**:

- Monitor circuit breaker health
- Investigate provider API issues
- Adjust error threshold if too sensitive

#### 3. **High CPU Usage During Batch Processing**

**Symptoms**: CPU spikes when processing many notifications

**Solution**:

- Reduce `NotificationConfig.concurrency.maxRecipientsPerBatch` (default: 10)
- Reduce `NotificationConfig.concurrency.processor` (default: 5)
- Enable template pre-rendering for bulk groups
- Check for template compilation issues (should be cached)

#### 4. **Template Not Found Errors**

**Symptoms**: `Template not found` errors

**Debugging Steps**:

1. Check template path in manifest
2. Verify template file exists: `src/modules/notifications/templates/{channel}/{locale}/{templateName}.hbs`
3. Check template cache: `await redisCache.clearCache()`
4. Verify locale: Default is 'en', check recipient locale

**Solution**:

- Create missing template file
- Update manifest with correct template path
- Clear template cache

#### 5. **Duplicate Notifications**

**Symptoms**: Same notification sent multiple times

**Debugging Steps**:

1. Check idempotency cache: `await idempotencyCache.getHealthStatus()`
2. Check correlation ID: Should be unique per notification
3. Check Redis connectivity: Idempotency uses Redis

**Solution**:

- Ensure correlation ID is unique
- Check Redis connection
- Verify idempotency lock TTL (default: 30 seconds)

#### 6. **DLQ Growing Too Large**

**Symptoms**: Many failed notifications in DLQ

**Debugging Steps**:

1. Check DLQ health: `await dlqCleanupJob.getDlqHealthStatus()`
2. Check last cleanup run: Should be daily at 2 AM
3. Check failed notification reasons: `await logRepository.findMany({ status: FAILED })`

**Solution**:

- Investigate root cause of failures
- Adjust retention period if needed
- Manually trigger cleanup: `await dlqCleanupJob.cleanupOldFailedJobs()`

---

## Conclusion

This guide provides a comprehensive overview of the Notifications Module architecture, flow, and extension points. For specific implementation details, refer to the source code and inline documentation.

### Key Takeaways

1. **Event-Driven**: System responds to domain events automatically
2. **Multi-Channel**: Supports Email, SMS, WhatsApp, In-App, Push
3. **Dynamic**: Channel selection adapts to user activity and event priority
4. **Reliable**: Circuit breakers, retries, DLQ, and idempotency ensure delivery
5. **Scalable**: Queue-based architecture supports horizontal scaling
6. **Performant**: Template caching, batch processing, and concurrency control optimize throughput
7. **Extensible**: Easy to add new channels, notification types, and events

### Next Steps

- Review source code for implementation details
- Run tests to understand behavior
- Experiment with adding new channels or notification types
- Monitor production metrics for optimization opportunities

---

**Document Version**: 2.0  
**Last Updated**: 2024  
**Maintained By**: Engineering Team
