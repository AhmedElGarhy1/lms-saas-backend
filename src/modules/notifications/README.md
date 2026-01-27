# Notification System Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Concepts](#core-concepts)
4. [System Flow](#system-flow)
5. [In-App Translation System](#in-app-translation-system)
6. [Audience Selection System](#audience-selection-system)
7. [Adding New Notifications](#adding-new-notifications)
8. [Adding New Channels](#adding-new-channels)
9. [Configuration](#configuration)
10. [Error Handling & Resilience](#error-handling--resilience)
11. [Testing](#testing)
12. [Best Practices](#best-practices)
13. [Troubleshooting](#troubleshooting)
14. [API Reference](#api-reference)

---

## Overview

The Notification System is a comprehensive, enterprise-grade notification delivery platform built with NestJS. It supports multiple channels (Email, SMS, WhatsApp, In-App, Push), multi-audience targeting, internationalization, and robust error handling.

### Key Features

- **Multi-Channel Support**: Email, SMS, WhatsApp, In-App, Push notifications
- **Multi-Audience Targeting**: Different audiences can receive different channels and content
- **Internationalization**: Built-in i18n support for all channels
- **Type Safety**: Full TypeScript type safety throughout
- **Resilience**: Circuit breakers, retry strategies, idempotency, graceful degradation
- **Scalability**: Queue-based processing with BullMQ, bulk operations
- **Observability**: Comprehensive metrics, logging, and health checks
- **Manifest System**: Declarative configuration for notifications

### Supported Channels

| Channel | Description | Template Format | Use Case |
|---------|-------------|----------------|----------|
| **EMAIL** | HTML email via SMTP | `.hbs` (Handlebars) | Transactional emails, newsletters |
| **SMS** | Text messages via SMS provider | `.txt` (simple interpolation) | OTP codes, alerts |
| **WHATSAPP** | WhatsApp Business API | Meta template name | Customer support, marketing |
| **IN_APP** | Real-time in-app notifications | JSON (i18n-based) | User activity, updates |
| **PUSH** | Mobile push notifications | JSON | Mobile app notifications |

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Event System                              │
│  (Domain Events: CenterCreated, OtpSent, etc.)              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              NotificationListener                            │
│  (Listens to domain events, emits notification intents)      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         NotificationIntentService                            │
│  (Enqueues notification intents to trigger queue)           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│      NotificationTriggerProcessor (BullMQ)                  │
│  (Processes intents, resolves recipients & template vars)   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│            NotificationService                                │
│  (Orchestrates notification processing pipeline)              │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌──────────────────┐        ┌──────────────────┐
│  Pipeline Service │        │  Router Service   │
│  (Extract data,   │───────▶│  (Route to       │
│   select channels)│        │   channels)       │
└──────────────────┘        └──────────────────┘
                                      │
                                      ▼
                           ┌──────────────────┐
                           │  Renderer        │
                           │  (Render templates│
                           │   with i18n)     │
                           └──────────────────┘
                                      │
                                      ▼
                           ┌──────────────────┐
                           │  Sender Service  │
                           │  (Send via        │
                           │   adapters)       │
                           └──────────────────┘
```

### Component Overview

#### 1. **Event System**
- Domain events trigger notifications
- Type-safe event emitters ensure compile-time safety

#### 2. **Intent System**
- Intent = minimal data needed to resolve notification
- Separates business logic from delivery
- Enables bulk processing

#### 3. **Manifest System**
- Declarative configuration for notifications
- Defines channels, audiences, required variables
- Type-safe at compile time

#### 4. **Resolver System**
- Resolves intents to recipients and template variables
- One resolver per notification type
- Handles audience-specific logic

#### 5. **Pipeline System**
- Extracts event data
- Determines enabled channels
- Selects optimal channels
- Prepares template data

#### 6. **Router System**
- Validates recipients
- Checks idempotency
- Renders templates
- Builds payloads
- Routes to channels

#### 7. **Sender System**
- Sends via channel-specific adapters
- Handles retries, circuit breakers
- Logs and tracks metrics

---

## Core Concepts

### 1. Notification Types

Notification types are defined in `enums/notification-type.enum.ts`:

```typescript
export enum NotificationType {
  OTP = 'OTP',
  PASSWORD_RESET = 'PASSWORD_RESET',
  PHONE_VERIFIED = 'PHONE_VERIFIED',
  CENTER_CREATED = 'CENTER_CREATED',
  CENTER_UPDATED = 'CENTER_UPDATED',
}
```

### 2. Channels

Channels define how notifications are delivered:

```typescript
export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  IN_APP = 'IN_APP',
  PUSH = 'PUSH',
}
```

### 3. Audiences

Audiences allow different user groups to receive different content/channels:

```typescript
// Example: CENTER_CREATED has two audiences
audiences: {
  ADMIN: { channels: { IN_APP: {} } },
  OWNER: { channels: { IN_APP: {}, EMAIL: {} } }
}
```

### 4. Manifests

Manifests are declarative configurations that define:
- Notification type and group
- Priority
- Required template variables
- Audiences and their channels
- Channel-specific templates

### 5. Intents

Intents contain minimal data needed to resolve a notification:
- IDs (userId, centerId, etc.)
- Template variables (otpCode, expiresIn, etc.)
- No full entity data (fetched by resolver)

### 6. Resolvers

Resolvers convert intents into:
- Template variables (full data from database)
- Recipients (user info, locale, contact details)

---

## System Flow

### Complete Notification Flow

```
1. Domain Event Triggered
   └─> CenterCreatedEvent emitted

2. NotificationListener
   └─> Listens to event
   └─> Calls NotificationIntentService.enqueue()

3. NotificationIntentService
   └─> Creates notification intent
   └─> Enqueues to 'notification-triggers' queue

4. NotificationTriggerProcessor (BullMQ)
   └─> Gets manifest (determines audiences)
   └─> Loops through audiences:
       ├─> Gets resolver for notification type
       ├─> Calls resolver.resolveIntent(intent, audience)
       │   └─> Resolver fetches data, builds template variables
       │   └─> Resolver resolves recipients
       └─> Calls NotificationService.trigger()

5. NotificationService
   └─> Validates recipients
   └─> Loops through recipients:
       └─> Calls processNotification()
           └─> NotificationPipelineService.process()
               ├─> Extract event data
               ├─> Determine channels (from manifest)
               ├─> Select optimal channels (user activity)
               └─> Prepare template data
           └─> NotificationRouterService.route()
               ├─> For each channel:
               │   ├─> Validate recipient
               │   ├─> Check idempotency
               │   ├─> Render template
               │   ├─> Build payload
               │   └─> Send/enqueue
               └─> Bulk enqueue (non-IN_APP channels)

6. NotificationProcessor (BullMQ)
   └─> Processes queued notifications
   └─> Calls NotificationSenderService.send()

7. NotificationSenderService
   └─> Gets adapter for channel
   └─> Executes with circuit breaker
   └─> Creates notification log
   └─> Sends via adapter
   └─> Updates log status
   └─> Tracks metrics

8. Adapter (Channel-specific)
   └─> EMAIL: Sends via SMTP
   └─> SMS: Sends via SMS provider
   └─> WHATSAPP: Sends via Meta API
   └─> IN_APP: Creates Notification entity, sends via WebSocket
   └─> PUSH: Sends via push notification service
```

### Flow Diagram

```
Event → Listener → Intent Service → Trigger Queue
                                          │
                                          ▼
                                    Trigger Processor
                                          │
                    ┌────────────────────┴────────────────────┐
                    │                                          │
                    ▼                                          ▼
            Resolver (per audience)                    Notification Service
                    │                                          │
                    ▼                                          ▼
        Template Variables + Recipients              Pipeline Service
                                                              │
                                                              ▼
                                                      Router Service
                                                              │
                    ┌─────────────────────────────────────────┴─────────────┐
                    │                                                       │
                    ▼                                                       ▼
            Renderer (i18n)                                        Sender Service
                    │                                                       │
                    ▼                                                       ▼
            Translated Content                                      Adapter (Channel)
                                                                             │
                                                                             ▼
                                                                    Delivered to User
```

---

## In-App Translation System

### Overview

In-app notifications use a JSON-based i18n system that loads translations from `src/i18n/{locale}/notifications.json` files.

### Translation File Structure

```
src/i18n/
  ├── en/
  │   └── notifications.json
  └── ar/
      └── notifications.json
```

**Example: `src/i18n/en/notifications.json`**

```json
{
  "OTP": {
    "title": "OTP Verification",
    "message": "Your verification code is {otpCode}. Valid for {expiresIn} minutes."
  },
  "CENTER_CREATED": {
    "title": "Center Created Successfully",
    "message": "Your center {centerName} has been successfully created!"
  }
}
```

**Example: `src/i18n/ar/notifications.json`**

```json
{
  "OTP": {
    "title": "التحقق من رمز OTP",
    "message": "رمز التحقق الخاص بك هو {otpCode}. صالح لمدة {expiresIn} دقيقة."
  }
}
```

### How It Works

1. **Translation Loading**
   - `NotificationTranslationService` loads translations from JSON files
   - Translations are cached in memory for performance
   - Supports nested keys: `notifications.OTP.title`

2. **Template Rendering**
   - For IN_APP channel, system detects JSON template
   - Builds i18n key: `notifications.{NotificationType}.{field}`
   - Example: `notifications.OTP.title` → `"OTP Verification"`

3. **Variable Interpolation**
   - Variables in `{variable}` format are replaced
   - Example: `"Your code is {otpCode}"` + `{otpCode: "123456"}` → `"Your code is 123456"`

4. **Fallback Behavior**
   - If translation missing, falls back to key
   - If locale missing, falls back to 'en'
   - Errors are logged but don't break notification flow

### Adding Translations

1. **Add to JSON file**:
   ```json
   {
     "NEW_NOTIFICATION_TYPE": {
       "title": "New Notification Title",
       "message": "Your message with {variable} here."
     }
   }
   ```

2. **Use in manifest**:
   ```typescript
   // IN_APP channel doesn't need template path
   [NotificationChannel.IN_APP]: {
     // Template optional - uses i18n with NotificationType enum value
   }
   ```

3. **Variables are automatically extracted** from translation strings

### Variable Extraction

The system automatically extracts variables from translation strings:

```typescript
extractI18nVariables("Hello {name}, your code is {otpCode}")
// Returns: ["name", "otpCode"]
```

These variables are validated against `requiredVariables` in the manifest.

---

## Audience Selection System

### Overview

The audience system allows different user groups to receive different notification content and channels for the same notification type.

### How It Works

#### 1. Manifest Definition

Manifests define audiences and their channels:

```typescript
export const centerCreatedManifest = {
  type: NotificationType.CENTER_CREATED,
  audiences: {
    ADMIN: {
      channels: {
        [NotificationChannel.IN_APP]: {}
      }
    },
    OWNER: {
      channels: {
        [NotificationChannel.IN_APP]: {},
        [NotificationChannel.EMAIL]: {
          template: 'email/center/center-created',
          subject: 'Center Created Successfully'
        }
      }
    }
  }
}
```

#### 2. Intent Resolver

Each notification type has a resolver that handles audience-specific logic:

```typescript
@Injectable()
export class CenterCreatedResolver implements NotificationIntentResolver<NotificationType.CENTER_CREATED> {
  async resolveIntent(intent, audience: 'ADMIN' | 'OWNER') {
    if (audience === 'ADMIN') {
      // Fetch admin users
      const admins = await this.fetchAdmins();
      return {
        templateVariables: { centerName, creatorName },
        recipients: admins.map(admin => ({
          userId: admin.id,
          locale: admin.locale,
          // ...
        }))
      };
    } else if (audience === 'OWNER') {
      // Fetch center owner
      const owner = await this.fetchOwner(intent.centerId);
      return {
        templateVariables: { centerName, ownerName },
        recipients: [{
          userId: owner.id,
          locale: owner.locale,
          // ...
        }]
      };
    }
  }
}
```

#### 3. Automatic Processing

The trigger processor automatically loops through all audiences:

```typescript
// Get all audiences from manifest
const audiences = Object.keys(manifest.audiences); // ['ADMIN', 'OWNER']

for (const audience of audiences) {
  // Resolve intent for this audience
  const { templateVariables, recipients } = await resolver.resolveIntent(intent, audience);
  
  // Trigger notification for this audience
  await this.notificationService.trigger(type, {
    audience,
    templateVariables,
    recipients
  });
}
```

#### 4. Type Safety

TypeScript ensures type safety:

```typescript
// Extract audience IDs from manifest at compile time
type AudienceIdForNotification<T> = 
  T extends keyof typeof NotificationRegistry
    ? ExtractAudiences<(typeof NotificationRegistry)[T]>
    : never;

// For CENTER_CREATED: 'ADMIN' | 'OWNER'
// For OTP: 'DEFAULT'
```

### Benefits

1. **Separation of Concerns**: Different audiences handled separately
2. **Type Safety**: Compile-time validation of audience IDs
3. **Flexibility**: Each audience can have different channels and content
4. **Automatic Processing**: System handles all audiences automatically

---

## Adding New Notifications

### Step-by-Step Guide

#### Step 1: Add Notification Type

Add to `enums/notification-type.enum.ts`:

```typescript
export enum NotificationType {
  // ... existing types
  NEW_NOTIFICATION = 'NEW_NOTIFICATION',
}
```

#### Step 2: Create Manifest

Create `manifests/{category}/new-notification.manifest.ts`:

```typescript
import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

export const newNotificationManifest = {
  type: NotificationType.NEW_NOTIFICATION,
  group: NotificationGroup.MANAGEMENT, // or SECURITY, etc.
  priority: 3, // 0-5, higher = more important
  requiredVariables: ['variable1', 'variable2'], // Variables needed in templates
  audiences: {
    DEFAULT: {
      channels: {
        [NotificationChannel.IN_APP]: {
          // Template optional for IN_APP - uses i18n
        },
        [NotificationChannel.EMAIL]: {
          template: 'email/category/new-notification',
          subject: 'New Notification Subject'
        },
        [NotificationChannel.SMS]: {
          template: 'sms/category/new-notification'
        }
      }
    }
  }
} as const satisfies NotificationManifest;
```

#### Step 3: Register Manifest

Add to `manifests/registry/notification-registry.ts`:

```typescript
import { newNotificationManifest } from '../category/new-notification.manifest';

export const NotificationRegistry = {
  // ... existing manifests
  [NotificationType.NEW_NOTIFICATION]: newNotificationManifest,
} as const satisfies Record<NotificationType, NotificationManifest>;
```

#### Step 4: Create Intent Type

Add to `types/notification-intent.map.ts`:

```typescript
export interface NotificationIntentMap {
  // ... existing intents
  [NotificationType.NEW_NOTIFICATION]: {
    userId: string;
    variable1: string;
    variable2: number;
  };
}
```

#### Step 5: Create Intent Resolver

Create `intents/resolvers/new-notification.resolver.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationIntentResolver } from '../interfaces/notification-intent-resolver.interface';
import { BaseIntentResolver } from '../base/base-intent-resolver.abstract';
import { IntentForNotification } from '../../types/notification-intent.map';
import { AudienceIdForNotification } from '../../types/audience-id.types';
import { UserService } from '@/modules/user/services/user.service';

@Injectable()
export class NewNotificationResolver
  extends BaseIntentResolver
  implements NotificationIntentResolver<NotificationType.NEW_NOTIFICATION>
{
  private readonly logger: Logger = new Logger(NewNotificationResolver.name);

  constructor(private readonly userService: UserService) {
    super();
  }

  async resolveIntent(
    intent: IntentForNotification<NotificationType.NEW_NOTIFICATION>,
    audience: AudienceIdForNotification<NotificationType.NEW_NOTIFICATION>,
  ) {
    // Fetch user
    const user = (await this.userService.findOne(intent.userId))!;
    
    const locale = this.extractLocale(user);
    const phone = user.getPhone();

    // Build template variables
    const templateVariables = {
      variable1: intent.variable1,
      variable2: intent.variable2,
      // Add any additional variables from database
    };

    // Resolve recipients
    const recipients: RecipientInfo[] = [
      {
        userId: user.id,
        profileId: null,
        profileType: null,
        phone,
        email: user.email || null,
        locale,
      },
    ];

    return {
      templateVariables,
      recipients,
    };
  }
}
```

#### Step 6: Register Resolver

Add to `intents/notification-intent-resolver-registry.service.ts`:

```typescript
import { NewNotificationResolver } from './resolvers/new-notification.resolver';

@Injectable()
export class NotificationIntentResolverRegistryService {
  constructor(
    // ... existing resolvers
    private readonly newNotificationResolver: NewNotificationResolver,
  ) {}

  onModuleInit(): void {
    // ... existing registrations
    this.register(NotificationType.NEW_NOTIFICATION, this.newNotificationResolver);
  }
}
```

#### Step 7: Register in Module

Add to `notifications.module.ts` providers:

```typescript
providers: [
  // ... existing providers
  NewNotificationResolver,
]
```

#### Step 8: Create Event Listener (Optional)

If triggered by domain event, add to `listeners/notification.listener.ts`:

```typescript
this.typeSafeEventEmitter.on(YourEvents.NEW_EVENT, (event) => {
  void this.handleNewEvent(event);
});

private async handleNewEvent(event: YourEvent) {
  await this.intentService.enqueue(NotificationType.NEW_NOTIFICATION, {
    userId: event.userId,
    variable1: event.variable1,
    variable2: event.variable2,
  });
}
```

#### Step 9: Create Templates

**For EMAIL**: `src/i18n/notifications/{locale}/email/category/new-notification.hbs`

```handlebars
<h1>New Notification</h1>
<p>Variable 1: {{variable1}}</p>
<p>Variable 2: {{variable2}}</p>
```

**For SMS**: `src/i18n/notifications/{locale}/sms/category/new-notification.txt`

```
New notification: {{variable1}}, {{variable2}}
```

**For IN_APP**: Add to `src/i18n/{locale}/notifications.json`

```json
{
  "NEW_NOTIFICATION": {
    "title": "New Notification",
    "message": "Variable 1: {variable1}, Variable 2: {variable2}"
  }
}
```

#### Step 10: Test

1. Trigger notification via event or direct call
2. Check notification logs
3. Verify delivery
4. Check translations

---

## Adding New Channels

### Step-by-Step Guide

#### Step 1: Add Channel Enum

Add to `enums/notification-channel.enum.ts`:

```typescript
export enum NotificationChannel {
  // ... existing channels
  NEW_CHANNEL = 'NEW_CHANNEL',
}
```

#### Step 2: Create Adapter

Create `adapters/new-channel.adapter.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { NotificationAdapter } from './interfaces/notification-adapter.interface';
import { NewChannelNotificationPayload } from '../types/notification-payload.interface';

@Injectable()
export class NewChannelAdapter
  implements NotificationAdapter<NewChannelNotificationPayload>
{
  private readonly logger: Logger = new Logger(NewChannelAdapter.name);

  constructor(
    // Inject any dependencies (API clients, etc.)
  ) {}

  async send(payload: NewChannelNotificationPayload): Promise<void> {
    // Implement sending logic
    // - Validate payload
    // - Call external API
    // - Handle errors
    // - Log results
  }
}
```

#### Step 3: Add Payload Type

Add to `types/notification-payload.interface.ts`:

```typescript
export interface NewChannelNotificationPayload extends BaseNotificationPayload {
  channel: NotificationChannel.NEW_CHANNEL;
  // Add channel-specific fields
  customField?: string;
}
```

#### Step 4: Register Adapter

Add to `services/notification-sender.service.ts`:

```typescript
constructor(
  // ... existing adapters
  private readonly newChannelAdapter: NewChannelAdapter,
) {
  this.adapterRegistry = new Map([
    // ... existing mappings
    [NotificationChannel.NEW_CHANNEL, newChannelAdapter],
  ]);
}
```

#### Step 5: Add Channel Config

Add to `config/notification.config.ts`:

```typescript
retry: {
  // ... existing channels
  newChannel: {
    maxAttempts: 3,
    backoffType: 'exponential' as const,
    backoffDelay: 2000,
  },
},
timeouts: {
  // ... existing channels
  newChannel: 30000, // 30 seconds
},
rateLimit: {
  // ... existing channels
  newChannel: 50,
},
```

#### Step 6: Add Template Format

Add to `config/template-format.config.ts`:

```typescript
export function getChannelExtension(channel: NotificationChannel): string {
  switch (channel) {
    // ... existing cases
    case NotificationChannel.NEW_CHANNEL:
      return '.txt'; // or .hbs, .json
  }
}

export function getChannelFolder(channel: NotificationChannel): string {
  switch (channel) {
    // ... existing cases
    case NotificationChannel.NEW_CHANNEL:
      return 'new-channel';
  }
}
```

#### Step 7: Update Payload Builder

Add handling in `services/payload-builder.service.ts`:

```typescript
if (channel === NotificationChannel.NEW_CHANNEL) {
  return {
    ...basePayload,
    channel: NotificationChannel.NEW_CHANNEL,
    customField: rendered.content.customField,
    data: {
      ...rendered.content,
    },
  } as NewChannelNotificationPayload;
}
```

#### Step 8: Register in Module

Add to `notifications.module.ts`:

```typescript
providers: [
  // ... existing providers
  NewChannelAdapter,
]
```

#### Step 9: Create Templates

Create template files in `src/i18n/notifications/{locale}/new-channel/`

---

## Configuration

### Notification Config

Located in `config/notification.config.ts`:

```typescript
export const NotificationConfig = {
  // Concurrency
  concurrency: {
    processor: 5, // Concurrent jobs
    maxRecipientsPerBatch: 10,
  },
  
  // Retry strategies per channel
  retry: {
    email: { maxAttempts: 3, backoffType: 'exponential', backoffDelay: 2000 },
    sms: { maxAttempts: 2, backoffType: 'exponential', backoffDelay: 3000 },
    // ...
  },
  
  // Timeouts per channel (milliseconds)
  timeouts: {
    sms: 30000,
    email: 30000,
    whatsapp: 45000,
    // ...
  },
  
  // Rate limiting
  rateLimit: {
    inApp: 100, // per window
    email: 50,
    // ...
  },
  
  // Circuit breaker
  circuitBreaker: {
    errorThreshold: 5, // Errors before opening
    windowSeconds: 60, // Time window
    resetTimeoutSeconds: 60, // Reset timeout
  },
  
  // Idempotency
  idempotency: {
    cacheTtlSeconds: 300, // 5 minutes
    lockTtlSeconds: 30,
    lockTimeoutMs: 500,
  },
}
```

### Environment Variables

Required environment variables (in your main Config):

```env
# Email
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...

# SMS
SMS_API_KEY=...
SMS_API_URL=...

# WhatsApp
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_BUSINESS_ACCOUNT_ID=...

# Redis (for queues)
REDIS_HOST=...
REDIS_PORT=...
```

---

## Error Handling & Resilience

### Error Handling Strategies

The system uses two strategies:

1. **FAIL_CLOSED**: Errors block operation (notification channels)
2. **FAIL_OPEN**: Errors allow operation (cache, metrics, idempotency)

### Circuit Breaker

Prevents cascading failures:

- **States**: CLOSED → OPEN → HALF_OPEN → CLOSED
- **Threshold**: 5 errors in 60 seconds
- **Reset**: 60 seconds after opening
- **Implementation**: Redis ZSET with sliding window

### Retry Strategies

Per-channel retry configuration:

```typescript
retry: {
  email: { maxAttempts: 3, backoffType: 'exponential', backoffDelay: 2000 },
  sms: { maxAttempts: 2, backoffType: 'exponential', backoffDelay: 3000 },
}
```

### Idempotency

Prevents duplicate notifications:

- **Cache TTL**: 5 minutes
- **Lock TTL**: 30 seconds
- **Lock Timeout**: 500ms
- **Fail-Open**: If Redis fails, allows notification

### Graceful Degradation

- Template cache fails → Load from filesystem
- Metrics fail → Log error, continue
- Idempotency fails → Allow notification (best-effort)
- Rate limiting fails → Allow notification

---

## Testing

### Unit Testing

```typescript
describe('NotificationService', () => {
  it('should send notification', async () => {
    // Mock dependencies
    // Test notification sending
  });
});
```

### Integration Testing

```typescript
describe('Notification Flow', () => {
  it('should process notification end-to-end', async () => {
    // Trigger event
    // Wait for processing
    // Verify delivery
  });
});
```

### Manual Testing

1. **Trigger via Event**:
   ```typescript
   eventEmitter.emit(CenterEvents.CREATED, event);
   ```

2. **Trigger Directly**:
   ```typescript
   await notificationIntentService.enqueue(NotificationType.OTP, {
     userId: '...',
     otpCode: '123456',
     expiresIn: 5,
   });
   ```

3. **Check Logs**:
   - Notification logs in database
   - Application logs
   - Queue status

---

## Best Practices

### 1. Manifest Design

- **Keep requiredVariables minimal**: Only include what's actually needed
- **Use appropriate priority**: 0-5, higher for critical notifications
- **Group logically**: Use NotificationGroup enum

### 2. Resolver Design

- **Fetch only needed data**: Don't load unnecessary relations
- **Handle errors gracefully**: Return empty recipients on error
- **Extract locale properly**: Use `extractLocale()` from BaseIntentResolver

### 3. Template Design

- **Use variables consistently**: `{variableName}` format
- **Keep templates simple**: Avoid complex logic
- **Test all locales**: Ensure translations work

### 4. Error Handling

- **Log errors with context**: Include correlationId, userId, etc.
- **Don't throw in resolvers**: Return empty recipients instead
- **Use appropriate error codes**: Follow error code conventions

### 5. Performance

- **Use bulk operations**: Process multiple recipients together
- **Cache templates**: System caches automatically
- **Optimize queries**: Fetch only needed data in resolvers

### 6. Security

- **Validate recipients**: System validates automatically
- **Sanitize template data**: Prevent injection attacks
- **Rate limit**: System rate limits automatically

---

## Troubleshooting

### Common Issues

#### 1. Notification Not Sent

**Check**:
- Event listener registered?
- Intent resolver registered?
- Manifest registered?
- Queue workers running?

**Debug**:
```typescript
// Check queue status
await queue.getWaiting();
await queue.getFailed();

// Check logs
// Check notification_logs table
```

#### 2. Translation Missing

**Check**:
- Translation file exists?
- Key matches NotificationType enum?
- Locale correct?

**Fix**:
```json
// Add to src/i18n/{locale}/notifications.json
{
  "NOTIFICATION_TYPE": {
    "title": "Title",
    "message": "Message {variable}"
  }
}
```

#### 3. Template Not Found

**Check**:
- Template file exists?
- Path matches manifest?
- Locale correct?

**Fix**:
```
// Create template file
src/i18n/notifications/{locale}/{channel}/path/to/template.{ext}
```

#### 4. Circuit Breaker Open

**Check**:
```typescript
const status = await circuitBreakerService.getHealthStatus();
console.log(status);
```

**Fix**:
```typescript
// Reset circuit breaker
await circuitBreakerService.reset(NotificationChannel.EMAIL);
```

#### 5. Idempotency Issues

**Check**:
- Redis available?
- Lock timeout too short?
- CorrelationId unique?

**Debug**:
```typescript
const stats = await idempotencyCache.getStats();
console.log(stats);
```

---

## API Reference

### NotificationIntentService

```typescript
// Enqueue notification intent
await notificationIntentService.enqueue(NotificationType.OTP, {
  userId: '...',
  otpCode: '123456',
  expiresIn: 5,
});
```

### NotificationService

```typescript
// Trigger notification directly (advanced)
await notificationService.trigger(NotificationType.OTP, {
  audience: 'DEFAULT',
  templateVariables: { otpCode: '123456', expiresIn: 5 },
  recipients: [{ userId: '...', locale: 'en', ... }],
});
```

### NotificationSenderService

```typescript
// Send notification directly (advanced)
await senderService.send(payload);
```

### Health Checks

```typescript
// Circuit breaker status
const health = await circuitBreakerService.getHealthStatus();

// Idempotency stats
const stats = await idempotencyCache.getStats();

// Metrics
const metrics = await metricsService.getMetrics();
```

---

## Additional Resources

### File Structure

```
src/modules/notifications/
├── adapters/          # Channel-specific adapters
├── config/            # Configuration files
├── entities/          # Database entities
├── enums/             # Enums (types, channels, etc.)
├── intents/           # Intent resolvers
├── manifests/         # Notification manifests
├── processors/        # BullMQ processors
├── services/          # Core services
├── types/             # TypeScript types
└── utils/             # Utility functions
```

### Key Files

- `manifests/registry/notification-registry.ts` - All manifests
- `intents/notification-intent-resolver-registry.service.ts` - All resolvers
- `listeners/notification.listener.ts` - Event listeners
- `config/notification.config.ts` - Configuration
- `services/notification.service.ts` - Main service

### Related Documentation

- [BullMQ Documentation](https://docs.bullmq.io/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)

---

## Support

For questions or issues:
1. Check this documentation
2. Review code comments
3. Check application logs
4. Contact the team

---

**Last Updated**: 2026-01-27
**Version**: 1.0.0
