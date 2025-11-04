# Notification Module Guide 📬

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [How It Works](#how-it-works)
4. [Components](#components)
5. [Configuration](#configuration)
6. [File Structure](#file-structure)
7. [Usage Examples](#usage-examples)
8. [Key Concepts](#key-concepts)
9. [Integration Guide](#integration-guide)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Notification Module is a comprehensive, enterprise-ready notification system that supports multiple delivery channels (Email, SMS, WhatsApp, Push, and In-App) with horizontal scaling, retry logic, rate limiting, and full observability.

### Key Features

- **Multi-Channel Support**: Email, SMS, WhatsApp, Push, and In-App notifications
- **Event-Driven Architecture**: Decoupled communication via NestJS EventEmitter
- **Horizontal Scaling**: Redis adapter for Socket.IO across multiple instances
- **Retry Logic**: Channel-specific retry strategies with exponential backoff
- **Rate Limiting**: Per-user and per-channel rate limiting with sliding window algorithm
- **Template System**: Handlebars templates with i18n support and caching
- **Dynamic Channel Selection**: Smart channel selection based on user activity and urgency
- **Full Observability**: Metrics, structured logging, and audit trails
- **Profile-Scoped Notifications**: Role-based notification delivery (Admin, Staff, etc.)
- **Graceful Degradation**: System continues working even if some channels fail

---

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│  Domain Module  │  (User, Center, Auth, etc.)
│   Emits Event   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Notification    │  @OnEvent handlers
│   Listener      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Notification    │  Orchestration pipeline:
│   Service       │  - Mapping lookup
│                 │  - Data extraction
│                 │  - Channel selection
│                 │  - Preference check
│                 │  - Template preparation
└────────┬────────┘
         │
         ├──────────────────┬──────────────────┐
         ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   IN_APP     │  │   EMAIL      │  │   SMS/WA     │
│  (Direct)    │  │  (BullMQ)    │  │  (BullMQ)    │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ WebSocket    │  │   Email      │  │   Twilio     │
│  Gateway     │  │   Adapter    │  │   Adapter    │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Component Layers

1. **Event Layer**: Domain modules emit events (UserEvents, AuthEvents, etc.)
2. **Listener Layer**: NotificationListener subscribes to events
3. **Service Layer**: NotificationService orchestrates the processing pipeline
4. **Adapter Layer**: Channel-specific adapters handle delivery
5. **Infrastructure Layer**: BullMQ, Redis, WebSocket, Database

---

## How It Works

### Notification Flow

#### 1. Event Emission

Domain modules emit events using NestJS EventEmitter:

```typescript
// Example: User module emits event
this.eventEmitter.emit(UserEvents.CREATE, new CreateUserEvent(userData));
```

#### 2. Event Subscription

`NotificationListener` subscribes to events using `@OnEvent` decorator:

```typescript
@OnEvent(UserEvents.CREATE, { async: true })
async handleUserCreated(event: CreateUserEvent) {
  await this.enqueueNotification(UserEvents.CREATE, event);
}
```

#### 3. Event Processing Pipeline

`NotificationService.processEvent()` orchestrates the following pipeline:

```typescript
// Pipeline steps (executed sequentially):
1. lookupMapping()        // Find notification mapping
2. extractEventData()     // Extract recipient, userId, etc.
3. determineChannels()    // Get channels from mapping
4. checkPreferences()     // Filter by user preferences
5. selectOptimalChannels() // Dynamic channel selection
6. prepareTemplateData()  // Prepare template variables
7. routeToChannels()      // Send via adapters
```

#### 4. Channel Routing

**IN_APP Channel** (Real-time):

- Bypasses BullMQ queue
- Direct delivery via WebSocket
- Rate limiting applied
- Stored in `notifications` table

**Other Channels** (EMAIL, SMS, WhatsApp):

- Enqueued in BullMQ
- Processed by `NotificationProcessor`
- Retry logic via BullMQ
- Logged in `notification_logs` table

#### 5. Delivery

**IN_APP**:

```
NotificationSenderService → InAppAdapter → NotificationGateway → WebSocket → Client
```

**EMAIL/SMS/WHATSAPP**:

```
BullMQ Queue → NotificationProcessor → NotificationSenderService → Channel Adapter → Provider API
```

---

## Components

### Core Services

#### NotificationService

**Location**: `services/notification.service.ts`

**Responsibilities**:

- Orchestrates notification processing pipeline
- Extracts event data (userId, recipient, locale, etc.)
- Determines channels from mappings
- Checks user preferences
- Selects optimal channels dynamically
- Prepares template data
- Routes to appropriate channels

**Key Methods**:

- `processEvent(eventName, event)` - Main orchestration method
- `enqueueNotifications(payloads)` - Bulk notification enqueueing

#### NotificationListener

**Location**: `listeners/notification.listener.ts`

**Responsibilities**:

- Subscribes to domain events using `@OnEvent`
- Delegates processing to `NotificationService`
- Handles errors gracefully

**Event Handlers**:

- User events (CREATE, UPDATE, DELETE, etc.)
- Center/Branch events
- Auth events (password reset, email verification, OTP)
- Admin/Staff events

#### NotificationSenderService

**Location**: `services/notification-sender.service.ts`

**Responsibilities**:

- Routes notifications to appropriate adapters
- Handles adapter registry
- Tracks metrics per channel
- Creates audit logs

**Key Methods**:

- `send(payload)` - Send notification via adapter
- `sendMultiple(payloads)` - Send multiple notifications with concurrency control

#### NotificationTemplateService

**Location**: `services/notification-template.service.ts`

**Responsibilities**:

- Loads and renders Handlebars templates
- Handles i18n template loading
- Provides template fallbacks
- Validates template data

**Key Methods**:

- `loadTemplate(templateName, locale)` - Load template
- `renderTemplate(template, data)` - Render template with data
- `ensureTemplateData(event, mapping)` - Ensure required data exists

### Adapters

#### InAppAdapter

**Location**: `adapters/in-app.adapter.ts`

**Responsibilities**:

- Creates notification entities in database
- Delivers via WebSocket gateway
- Implements retry logic for transient failures
- Creates audit logs
- Emits delivery events

**Flow**:

1. Extract notification data
2. Create notification entity
3. Emit `notification.created` event
4. Deliver via WebSocket with retry
5. Update notification status
6. Create audit log
7. Track metrics
8. Emit `notification.delivered` or `notification.failed` event

#### EmailAdapter

**Location**: `adapters/email.adapter.ts`

**Responsibilities**:

- Sends emails via SMTP (Nodemailer)
- Handles HTML content
- Supports attachments (future)

#### SmsAdapter

**Location**: `adapters/sms.adapter.ts`

**Responsibilities**:

- Sends SMS via Twilio
- Validates phone numbers
- Handles Twilio API errors

#### WhatsAppAdapter

**Location**: `adapters/whatsapp.adapter.ts`

**Responsibilities**:

- Supports multiple providers (Twilio, Meta Business API)
- Provider abstraction via `WhatsAppProvider` interface
- Routes to appropriate provider

### Infrastructure Components

#### NotificationGateway

**Location**: `gateways/notification.gateway.ts`

**Responsibilities**:

- Manages WebSocket connections
- Stores active connections in Redis
- Implements rate limiting (per-user and per-socket)
- Delivers notifications to connected clients
- Tracks active connections metrics

**Key Features**:

- Redis adapter for horizontal scaling
- Atomic connection management (Lua scripts)
- Sliding window rate limiting
- Connection TTL management
- Automatic cleanup of stale connections

#### NotificationProcessor

**Location**: `processors/notification.processor.ts`

**Responsibilities**:

- Processes BullMQ jobs for EMAIL, SMS, WhatsApp channels
- Implements channel-specific retry strategies
- Updates notification logs
- Tracks metrics (retries, failures, latency)

**Configuration**:

- Concurrency: `NOTIFICATION_CONCURRENCY` (default: 5)
- Retry threshold: `NOTIFICATION_RETRY_THRESHOLD` (default: 2)

#### RedisIoAdapter

**Location**: `adapters/redis-io.adapter.ts`

**Responsibilities**:

- Extends NestJS `IoAdapter`
- Configures Redis adapter for Socket.IO
- Enables horizontal scaling across multiple instances

### Supporting Services

#### ChannelSelectionService

**Location**: `services/channel-selection.service.ts`

**Responsibilities**:

- Dynamically selects optimal channels based on:
  - User activity (last seen)
  - Notification urgency (priority)
  - Channel availability
  - User preferences

#### ChannelRateLimitService

**Location**: `services/channel-rate-limit.service.ts`

**Responsibilities**:

- Per-channel rate limiting
- Sliding window algorithm
- Configurable limits per channel

#### ChannelRetryStrategyService

**Location**: `services/channel-retry-strategy.service.ts`

**Responsibilities**:

- Channel-specific retry configurations
- Max attempts per channel
- Backoff strategies (exponential, fixed)

#### NotificationMetricsService

**Location**: `services/notification-metrics.service.ts`

**Responsibilities**:

- Tracks notification metrics:
  - Sent/failed counts per channel
  - Retry counts
  - Latency
  - Active WebSocket connections
  - Queue backlog

#### MetricsBatchService

**Location**: `services/metrics-batch.service.ts`

**Responsibilities**:

- Batches Redis operations for metrics
- Reduces Redis load
- Auto-flush on batch size or interval

#### TemplateCacheService

**Location**: `services/template-cache.service.ts`

**Responsibilities**:

- Caches compiled Handlebars templates
- Caches rendered content
- Reduces CPU overhead

#### InAppNotificationService

**Location**: `services/in-app-notification.service.ts`

**Responsibilities**:

- CRUD operations for in-app notifications
- Unread count management
- Mark as read/unread
- Archive/unarchive
- Rate limiting for IN_APP channel

### Jobs

#### RedisCleanupJob

**Location**: `jobs/redis-cleanup.job.ts`

**Responsibilities**:

- Scheduled cleanup of stale Redis connections
- Removes expired socket IDs
- Prevents memory leaks

**Schedule**: Runs periodically (configurable via cron)

---

## Configuration

### Environment Variables

All notification-related environment variables are defined in `src/shared/config/env.validation.ts`:

#### WebSocket Configuration

```env
WEBSOCKET_RATE_LIMIT_USER=100          # Max notifications/min per user
WEBSOCKET_RATE_LIMIT_SOCKET=50         # Max notifications/min per socket
WEBSOCKET_RETRY_MAX_ATTEMPTS=3         # Redis operation retries
WEBSOCKET_RETRY_DELAY_MS=100           # Base retry delay
```

#### Notification System Configuration

```env
NOTIFICATION_RETRY_MAX_DELAY_MS=10000   # Max retry delay
NOTIFICATION_RETRY_MAX_ATTEMPTS=3      # Default retry attempts
NOTIFICATION_CONCURRENCY=5              # BullMQ processor concurrency
NOTIFICATION_RETRY_THRESHOLD=2         # Retry threshold for status
NOTIFICATION_SEND_MULTIPLE_CONCURRENCY=5  # Bulk send concurrency
NOTIFICATION_METRICS_BATCH_SIZE=50     # Metrics batch size
NOTIFICATION_METRICS_FLUSH_INTERVAL_MS=5000  # Metrics flush interval
```

#### Channel-Specific Rate Limits

```env
NOTIFICATION_RATE_LIMIT_IN_APP=100
NOTIFICATION_RATE_LIMIT_EMAIL=50
NOTIFICATION_RATE_LIMIT_SMS=20
NOTIFICATION_RATE_LIMIT_WHATSAPP=30
NOTIFICATION_RATE_LIMIT_PUSH=80
```

#### Channel-Specific Retry Strategies

```env
# EMAIL
NOTIFICATION_RETRY_EMAIL_MAX_ATTEMPTS=3
NOTIFICATION_RETRY_EMAIL_BACKOFF_TYPE=exponential
NOTIFICATION_RETRY_EMAIL_BACKOFF_DELAY=2000

# SMS
NOTIFICATION_RETRY_SMS_MAX_ATTEMPTS=2
NOTIFICATION_RETRY_SMS_BACKOFF_TYPE=exponential
NOTIFICATION_RETRY_SMS_BACKOFF_DELAY=3000

# WhatsApp
NOTIFICATION_RETRY_WHATSAPP_MAX_ATTEMPTS=2
NOTIFICATION_RETRY_WHATSAPP_BACKOFF_TYPE=exponential
NOTIFICATION_RETRY_WHATSAPP_BACKOFF_DELAY=3000
```

#### Channel Selection

```env
NOTIFICATION_INACTIVITY_THRESHOLD_HOURS=24  # User inactivity threshold
```

### Event Mapping Configuration

**Location**: `config/notifications.map.ts`

The `NotificationEventsMap` defines how domain events map to notification configurations:

```typescript
export const NotificationEventsMap: Partial<
  Record<EventType, NotificationEventMapping>
> = {
  [UserEvents.CREATE]: {
    type: NotificationType.USER_REGISTERED,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    template: 'user-registered',
    group: NotificationGroup.USER,
    priority: 5,
    localized: true,
    profileScoped: false,
  },
  // ... more mappings
};
```

**Key Fields**:

- `type`: NotificationType enum value
- `channels`: Array of channels or profile-scoped object
- `template`: Template name (without extension)
- `group`: NotificationGroup enum value
- `priority`: 1-10 (higher = more urgent)
- `localized`: Use i18n templates
- `profileScoped`: Profile-specific channels
- `actionType`: Action type for IN_APP notifications
- `defaultChannels`: Fallback channels

---

## File Structure

```
src/modules/notifications/
├── adapters/                    # Channel adapters
│   ├── email.adapter.ts
│   ├── sms.adapter.ts
│   ├── whatsapp.adapter.ts
│   ├── in-app.adapter.ts
│   ├── push.adapter.ts
│   ├── redis-io.adapter.ts      # Redis adapter for Socket.IO
│   ├── interfaces/
│   │   └── notification-adapter.interface.ts
│   └── providers/               # WhatsApp providers
│       ├── whatsapp-provider.interface.ts
│       ├── twilio-whatsapp.provider.ts
│       └── meta-whatsapp.provider.ts
│
├── config/                      # Configuration files
│   ├── notifications.map.ts     # Event-to-notification mappings
│   └── notification-gateway.config.ts
│
├── controllers/                 # REST API controllers
│   ├── in-app-notification.controller.ts
│   ├── notification-history.controller.ts
│   └── notification-preference.controller.ts
│
├── dto/                         # Data Transfer Objects
│   ├── in-app-notification.dto.ts
│   ├── notification-history.dto.ts
│   └── notification-preference.dto.ts
│
├── entities/                    # Database entities
│   ├── notification.entity.ts
│   ├── notification-log.entity.ts
│   └── notification-preference.entity.ts
│
├── enums/                       # Enumerations
│   ├── notification-channel.enum.ts
│   ├── notification-type.enum.ts
│   ├── notification-group.enum.ts
│   ├── notification-status.enum.ts
│   └── notification-action-type.enum.ts
│
├── events/                      # Notification events
│   └── notification.events.ts
│
├── gateways/                    # WebSocket gateway
│   └── notification.gateway.ts
│
├── guards/                      # WebSocket guards
│   └── websocket-auth.guard.ts
│
├── jobs/                        # Scheduled jobs
│   └── redis-cleanup.job.ts
│
├── listeners/                   # Event listeners
│   └── notification.listener.ts
│
├── processors/                  # BullMQ processors
│   └── notification.processor.ts
│
├── repositories/                # Data repositories
│   ├── notification.repository.ts
│   ├── notification-log.repository.ts
│   └── notification-preference.repository.ts
│
├── services/                    # Business logic services
│   ├── notification.service.ts         # Core orchestration
│   ├── notification-sender.service.ts  # Adapter routing
│   ├── notification-template.service.ts # Template rendering
│   ├── notification-preference.service.ts
│   ├── in-app-notification.service.ts
│   ├── channel-selection.service.ts
│   ├── channel-rate-limit.service.ts
│   ├── channel-retry-strategy.service.ts
│   ├── notification-metrics.service.ts
│   ├── metrics-batch.service.ts
│   └── template-cache.service.ts
│
├── types/                       # TypeScript types
│   ├── notification-event.types.ts
│   ├── notification-payload.interface.ts
│   ├── notification-job-data.interface.ts
│   └── websocket.types.ts
│
├── utils/                       # Utility functions
│   ├── notification-extractors.ts
│   ├── retry.util.ts
│   └── sliding-window-rate-limit.ts
│
└── notifications.module.ts     # NestJS module definition
```

---

## Usage Examples

### Emitting a Notification Event

In your domain module (e.g., User module):

```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserEvents } from '@/shared/events/user.events.enum';
import { CreateUserEvent } from './events/user.events';

@Injectable()
export class UserService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async createUser(userData: CreateUserDto) {
    const user = await this.userRepository.save(userData);

    // Emit event - notification system will handle it automatically
    this.eventEmitter.emit(
      UserEvents.CREATE,
      new CreateUserEvent({
        userId: user.id,
        email: user.email,
        name: user.name,
        // ... other data
      }),
    );

    return user;
  }
}
```

### Adding a New Event Mapping

Edit `config/notifications.map.ts`:

```typescript
export const NotificationEventsMap: Partial<
  Record<EventType, NotificationEventMapping>
> = {
  // ... existing mappings

  [YourEventType.YOUR_EVENT]: {
    type: NotificationType.YOUR_TYPE,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    template: 'your-template-name',
    group: NotificationGroup.SYSTEM,
    priority: 7,
    localized: true,
    profileScoped: false,
    actionType: NotificationActionType.NAVIGATE,
  },
};
```

### Creating a Template

Create template file in `src/i18n/notifications/{locale}/your-template-name.hbs`:

```handlebars
Subject:
{{title}}

Hello
{{name}},

{{message}}

{{#if actionUrl}}
  Click here:
  {{actionUrl}}
{{/if}}

Thank you!
```

### Sending Notification Programmatically

```typescript
import { NotificationService } from '@/modules/notifications/services/notification.service';

@Injectable()
export class YourService {
  constructor(private readonly notificationService: NotificationService) {}

  async sendCustomNotification(userId: string) {
    await this.notificationService.processEvent('custom.event', {
      userId,
      email: 'user@example.com',
      name: 'John Doe',
      // ... other data
    });
  }
}
```

### Accessing In-App Notifications via API

```typescript
// GET /notifications/in-app
// Returns paginated list of user's notifications

// GET /notifications/in-app/unread-count
// Returns unread notification count

// PATCH /notifications/in-app/:id/read
// Mark notification as read

// PATCH /notifications/in-app/:id/unread
// Mark notification as unread

// PATCH /notifications/in-app/:id/archive
// Archive notification
```

### WebSocket Client Connection

```typescript
// Client-side (e.g., React)
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/notifications', {
  auth: {
    token: 'your-jwt-token',
  },
});

socket.on('notification:new', (notification) => {
  console.log('New notification:', notification);
  // Display notification in UI
});

socket.on('notification:throttled', (data) => {
  console.log('Rate limited:', data);
});
```

---

## Key Concepts

### Notification Channels

Supported channels:

- **IN_APP**: Real-time WebSocket delivery, stored in `notifications` table
- **EMAIL**: SMTP delivery, logged in `notification_logs` table
- **SMS**: Twilio SMS delivery, logged in `notification_logs` table
- **WHATSAPP**: Twilio or Meta Business API, logged in `notification_logs` table
- **PUSH**: Future implementation for FCM/APNs

### Notification Types

Defined in `enums/notification-type.enum.ts`:

- `USER_REGISTERED`
- `PASSWORD_RESET`
- `EMAIL_VERIFICATION`
- `OTP_SENT`
- `USER_ACTIVATED`
- `USER_DEACTIVATED`
- `CENTER_CREATED`
- `BRANCH_CREATED`
- ... and more

### Notification Groups

Defined in `enums/notification-group.enum.ts`:

- `USER`: User-related notifications
- `AUTH`: Authentication-related
- `SYSTEM`: System notifications
- `CENTER`: Center-related
- `BRANCH`: Branch-related

### Profile-Scoped Notifications

Some notifications are profile-specific (Admin, Staff, etc.):

```typescript
channels: {
  [ProfileType.ADMIN]: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
  [ProfileType.STAFF]: [NotificationChannel.WHATSAPP, NotificationChannel.IN_APP],
  // Default for other profiles
  [ProfileType.TEACHER]: [NotificationChannel.IN_APP],
  [ProfileType.PARENT]: [NotificationChannel.IN_APP],
  [ProfileType.STUDENT]: [NotificationChannel.IN_APP],
}
```

### Dynamic Channel Selection

The `ChannelSelectionService` intelligently selects channels based on:

- **User Activity**: Prefers IN_APP for active users, EMAIL for inactive
- **Urgency**: Higher priority notifications use multiple channels
- **Availability**: Skips channels if user is not reachable

### Retry Strategies

Each channel has its own retry configuration:

- **EMAIL**: 3 attempts, exponential backoff (2s base)
- **SMS**: 2 attempts, exponential backoff (3s base)
- **WHATSAPP**: 2 attempts, exponential backoff (3s base)
- **IN_APP**: 3 attempts with exponential backoff (in-adapter)

### Rate Limiting

- **Per-User**: Limits notifications per user per minute
- **Per-Socket**: Limits notifications per socket connection per minute
- **Per-Channel**: Different limits for each channel (cost-based)
- **Algorithm**: Sliding window using Redis sorted sets

### Template System

- **Engine**: Handlebars
- **i18n Support**: Locale-based templates
- **Caching**: Compiled templates and rendered content cached
- **Fallbacks**: Default templates for missing locales
- **Validation**: Missing template variables logged

### Correlation IDs

Every notification includes a `correlationId` for tracing:

- Extracted from `RequestContext` if available
- Generated via `randomUUID()` if not available
- Passed through entire processing pipeline
- Included in logs and metrics

---

## Integration Guide

### Adding a New Notification Channel

1. **Create Adapter**:

   ```typescript
   // adapters/my-channel.adapter.ts
   import { Injectable } from '@nestjs/common';
   import { NotificationAdapter } from './interfaces/notification-adapter.interface';
   import { NotificationPayload } from '../types/notification-payload.interface';

   @Injectable()
   export class MyChannelAdapter implements NotificationAdapter {
     async send(payload: NotificationPayload): Promise<void> {
       // Implementation
     }
   }
   ```

2. **Register in Module**:

   ```typescript
   // notifications.module.ts
   providers: [
     // ... existing providers
     MyChannelAdapter,
   ],
   ```

3. **Add to SenderService**:

   ```typescript
   // notification-sender.service.ts
   constructor(
     // ... existing adapters
     private readonly myChannelAdapter: MyChannelAdapter,
   ) {
     this.adapterRegistry.set(NotificationChannel.MY_CHANNEL, this.myChannelAdapter);
   }
   ```

4. **Add Enum Value**:
   ```typescript
   // enums/notification-channel.enum.ts
   export enum NotificationChannel {
     // ... existing channels
     MY_CHANNEL = 'MY_CHANNEL',
   }
   ```

### Adding a New Event Type

1. **Add Event Enum** (if needed):

   ```typescript
   // shared/events/your-module.events.enum.ts
   export enum YourModuleEvents {
     YOUR_EVENT = 'your.module.your.event',
   }
   ```

2. **Create Event Class**:

   ```typescript
   // modules/your-module/events/your-module.events.ts
   export class YourEvent {
     constructor(public readonly data: YourEventData) {}
   }
   ```

3. **Add Listener Handler**:

   ```typescript
   // listeners/notification.listener.ts
   @OnEvent(YourModuleEvents.YOUR_EVENT, { async: true })
   async handleYourEvent(event: YourEvent) {
     await this.enqueueNotification(YourModuleEvents.YOUR_EVENT, event);
   }
   ```

4. **Add Mapping**:

   ```typescript
   // config/notifications.map.ts
   export const NotificationEventsMap = {
     // ... existing mappings
     [YourModuleEvents.YOUR_EVENT]: {
       type: NotificationType.YOUR_TYPE,
       channels: [NotificationChannel.IN_APP],
       template: 'your-template',
       group: NotificationGroup.SYSTEM,
     },
   };
   ```

5. **Create Template**:
   ```
   src/i18n/notifications/en/your-template.hbs
   src/i18n/notifications/ar/your-template.hbs
   ```

### Testing Notifications

```typescript
// In your test file
import { Test } from '@nestjs/testing';
import { NotificationService } from '../notification.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('NotificationService', () => {
  let service: NotificationService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NotificationService,
        // ... other providers
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should send notification on user creation', async () => {
    const event = new CreateUserEvent({
      userId: '123',
      email: 'test@example.com',
      name: 'Test User',
    });

    await eventEmitter.emit(UserEvents.CREATE, event);

    // Assert notification was sent
    // ...
  });
});
```

---

## Troubleshooting

### Notifications Not Delivered

1. **Check Event Emission**:
   - Verify event is being emitted with correct event name
   - Check event payload structure matches expected format

2. **Check Mapping**:
   - Verify event exists in `NotificationEventsMap`
   - Check mapping configuration is correct

3. **Check User Preferences**:
   - Verify user has enabled the channel
   - Check `notification_preferences` table

4. **Check Logs**:
   - Look for errors in `NotificationListener`
   - Check `NotificationService` logs
   - Review adapter-specific logs

5. **Check Queue**:
   - For EMAIL/SMS/WHATSAPP: Check BullMQ queue status
   - Verify `NotificationProcessor` is running
   - Check job failures in Redis

### WebSocket Not Connecting

1. **Check Authentication**:
   - Verify JWT token is valid
   - Check `WebSocketAuthGuard` logs

2. **Check Redis Connection**:
   - Verify Redis is accessible
   - Check Redis adapter configuration

3. **Check CORS**:
   - Verify frontend URL is in CORS whitelist
   - Check `notification.gateway.ts` CORS configuration

### Rate Limiting Issues

1. **Check Limits**:
   - Verify rate limit configuration
   - Check Redis keys for rate limit counters

2. **Check User Activity**:
   - Verify user is not spamming events
   - Check rate limit logs

### Template Rendering Issues

1. **Check Template Exists**:
   - Verify template file exists in `i18n/notifications/{locale}/`
   - Check template name matches mapping

2. **Check Template Variables**:
   - Verify all required variables are provided
   - Check `ensureTemplateData` logs for missing variables

3. **Check i18n**:
   - Verify locale is correct
   - Check fallback template exists

### Metrics Not Updating

1. **Check Redis Connection**:
   - Verify Redis is accessible
   - Check metrics service logs

2. **Check Batching**:
   - Verify `MetricsBatchService` is flushing
   - Check batch size configuration

### Performance Issues

1. **Check Queue Backlog**:
   - Monitor BullMQ queue size
   - Increase processor concurrency if needed

2. **Check Template Caching**:
   - Verify `TemplateCacheService` is working
   - Check cache hit rates

3. **Check Database Queries**:
   - Review slow queries
   - Check indexes on notification tables

4. **Check Redis Performance**:
   - Monitor Redis connection count
   - Check Redis memory usage

---

## Best Practices

1. **Always Use Events**: Never call notification services directly from domain modules
2. **Use Proper Event Classes**: Use typed event classes, not plain objects
3. **Include Correlation IDs**: Always include correlation IDs in logs
4. **Handle Errors Gracefully**: Don't let notification failures break business logic
5. **Test Templates**: Always test templates with real data
6. **Monitor Metrics**: Regularly check notification metrics
7. **Review Logs**: Check logs for unmapped events or missing templates
8. **Update Mappings**: Keep `NotificationEventsMap` up to date
9. **Document Custom Events**: Document any custom events you add
10. **Use Profile-Scoped Channels**: Use profile-scoped channels for role-specific notifications

---

## Additional Resources

- [NestJS Event Emitter Documentation](https://docs.nestjs.com/techniques/events)
- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Handlebars Documentation](https://handlebarsjs.com/)

---

## Support

For questions or issues:

1. Check this documentation
2. Review code comments in source files
3. Check logs for error messages
4. Review metrics for system health
5. Contact the development team

---

**Last Updated**: 2024-01-XX
**Version**: 1.0.0
