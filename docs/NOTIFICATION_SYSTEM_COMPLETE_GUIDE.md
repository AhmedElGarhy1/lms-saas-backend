# Notification System Complete Guide

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Type Safety System](#type-safety-system)
4. [How to Add a New Notification](#how-to-add-a-new-notification)
5. [Internal Workings](#internal-workings)
6. [Event Flow](#event-flow)
7. [Template System](#template-system)
8. [Channel Adapters](#channel-adapters)
9. [Best Practices](#best-practices)

---

## Overview

The notification system is a **manifest-driven, type-safe notification framework** that handles multi-channel notifications (Email, SMS, WhatsApp, In-App) with compile-time and runtime validation.

### Key Features

- **Type-Safe**: Compile-time validation for templates, events, and manifests
- **Manifest-Driven**: Centralized configuration for all notification types
- **Multi-Channel**: Supports Email, SMS, WhatsApp, In-App, and Push (reserved)
- **Template-Based**: Channel-specific templates (`.hbs`, `.txt`, `.json`)
- **Automatic Validation**: Startup validation ensures all configurations are correct
- **Event-Driven**: Integrates with NestJS EventEmitter for domain events

---

## System Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Domain Event Emitted                      │
│              (e.g., OtpEvent, CenterCreatedEvent)        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              NotificationListener                            │
│  - Listens to domain events via @OnEvent decorator          │
│  - Extracts recipient information                           │
│  - Calls NotificationService.processEvent()                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              NotificationService                             │
│  - Looks up event mapping (EventType → NotificationType)   │
│  - Loads manifest (single source of truth)                  │
│  - Prepares template data                                   │
│  - Selects optimal channels                                 │
│  - Routes to channels (enqueue or direct send)              │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   Email     │ │    SMS      │ │  WhatsApp   │
│   Adapter   │ │   Adapter   │ │   Adapter   │
└─────────────┘ └─────────────┘ └─────────────┘
```

### File Structure

```
src/modules/notifications/
├── adapters/                    # Channel-specific adapters
│   ├── email.adapter.ts
│   ├── sms.adapter.ts
│   ├── whatsapp.adapter.ts
│   └── in-app.adapter.ts
├── config/                      # Configuration
│   ├── notifications.map.ts     # EventType → NotificationType mapping
│   ├── template-format.config.ts
│   ├── required-events.registry.ts
│   └── expected-listeners.registry.ts
├── listeners/                   # Event listeners
│   └── notification.listener.ts
├── manifests/                   # Notification manifests
│   ├── auth/
│   │   ├── otp.manifest.ts
│   │   ├── password-reset.manifest.ts
│   │   └── email-verification.manifest.ts
│   ├── center/
│   │   ├── center-created.manifest.ts
│   │   └── center-updated.manifest.ts
│   ├── registry/
│   │   ├── notification-registry.ts
│   │   └── notification-manifest-resolver.service.ts
│   └── types/
│       └── manifest.types.ts
├── processors/                  # BullMQ job processors
│   └── notification.processor.ts
├── renderer/                    # Template rendering
│   └── notification-renderer.service.ts
├── services/                       # Core services
│   ├── notification.service.ts
│   ├── notification-template.service.ts
│   ├── notification-sender.service.ts
│   └── channel-selection.service.ts
├── types/                       # Type definitions
│   ├── templates.generated.ts   # Auto-generated template paths
│   ├── event-validation.types.ts
│   └── event-notification-mapping.types.ts
└── validator/                   # Validation
    └── notification-validator.service.ts
```

---

## Type Safety System

The notification system has **three layers of type safety**:

### Layer 1: Compile-Time Type Safety

#### 1.1 Template Path Types

**Auto-Generated Types** (`src/modules/notifications/types/templates.generated.ts`):

```typescript
// Generated from file system scan
export type NotificationTemplatePath =
  | 'email/auth/otp'
  | 'sms/auth/otp'
  | 'whatsapp/auth/otp'
  | 'in-app/auth/otp';
// ... all template paths

export type TemplateBasePath =
  | 'auth/otp'
  | 'auth/password-reset'
  | 'center-created';
// ... all base paths
```

**How it works:**

- Script `scripts/generate-template-types.ts` scans `src/i18n/notifications/en/`
- Generates TypeScript union types for all template paths
- Run `npm run generate:templates` to regenerate after adding templates

**Usage:**

```typescript
// ✅ Type-safe - TypeScript validates path exists
templateBase: 'auth/otp'; // Must be in TemplateBasePath

// ❌ Type error - path doesn't exist
templateBase: 'auth/invalid-path'; // TypeScript error!
```

#### 1.2 Event-to-Notification Type Mapping

**Event Validation Types** (`src/modules/notifications/types/event-validation.types.ts`):

```typescript
// Extracts required variables from manifest
type ExtractRequiredVariables<T extends NotificationType> = ...

// Validates event has all required properties
export type ValidateEventForNotification<
  TEvent,
  TNotificationType extends NotificationType,
> = ExtractRequiredVariables<TNotificationType> extends keyof TEvent
  ? TEvent  // ✅ All properties present
  : TEvent & { __missing: ... }  // ❌ Missing properties
```

**How it works:**

1. Extracts `requiredVariables` from all channels in manifest
2. Checks if event has all required properties
3. TypeScript errors if properties are missing

**Example:**

```typescript
// Manifest requires: ['otpCode', 'expiresIn']
// If OtpEvent is missing otpCode:
@OnEvent(AuthEvents.OTP)
async handleOtp(
  event: ValidateEvent<OtpEvent, AuthEvents.OTP>  // ❌ Type error!
) { ... }
```

#### 1.3 Manifest Type Safety

**Manifest Types** (`src/modules/notifications/manifests/types/manifest.types.ts`):

```typescript
export interface NotificationManifest {
  type: NotificationType; // ✅ Enum - type-safe
  templateBase?: TemplateBasePath; // ✅ Generated type - type-safe
  channels: {
    [NotificationChannel.EMAIL]?: ChannelManifest;
    // ...
  };
}
```

**How it works:**

- `NotificationType` is an enum - TypeScript validates values
- `TemplateBasePath` is generated from file system - validates paths exist
- `NotificationChannel` is an enum - validates channel names

### Layer 2: Runtime Validation

**Startup Validation** (`src/modules/notifications/validator/notification-validator.service.ts`):

Runs on application startup and validates:

1. **All NotificationTypes have manifests**
2. **All required events are mapped** (from `required-events.registry.ts`)
3. **All templates exist** (checks file system)
4. **All mapped events have listeners** (warns if missing)

**Validation Scripts:**

```bash
# Validate manifests
npm run validate:notification-manifests

# Validate listeners
npm run validate:notification-listeners

# Generate template types
npm run generate:templates
```

### Layer 3: Runtime Type Checking

**Template Data Validation** (`src/modules/notifications/renderer/notification-renderer.service.ts`):

```typescript
// Validates required variables exist before rendering
this.validateRequiredVariables(
  config.requiredVariables || [],
  eventData,
  notificationType,
  channel,
);
```

**How it works:**

- Before rendering template, checks all `requiredVariables` exist in `eventData`
- Throws `MissingTemplateVariablesException` if variables are missing
- Ensures templates don't fail at render time

---

## How to Add a New Notification

### Step-by-Step Guide

#### Step 1: Create Event (if needed)

If you're adding a new domain event:

```typescript
// src/modules/your-module/events/your-module.events.ts
export class YourNewEvent extends BaseEvent {
  constructor(
    actor: ActorUser,
    public readonly userId: string,
    public readonly customField: string, // Required for template
    correlationId?: string,
  ) {
    super(actor, 'your-module.service', correlationId);
  }
}
```

#### Step 2: Add Event to Enum

```typescript
// src/shared/events/your-module.events.enum.ts
export enum YourModuleEvents {
  YOUR_NEW_EVENT = 'your.module.your.new.event',
}
```

#### Step 3: Create Templates

Create template files for each channel:

```
src/i18n/notifications/en/
├── email/
│   └── your-module/
│       └── your-new-event.hbs
├── sms/
│   └── your-module/
│       └── your-new-event.txt
├── whatsapp/
│   └── your-module/
│       └── your-new-event.txt
└── in-app/
    └── your-module/
        └── your-new-event.json
```

**Email Template** (`email/your-module/your-new-event.hbs`):

```handlebars
<h1>Your Notification</h1>
<p>Hello {{name}},</p>
<p>Your custom field: {{customField}}</p>
```

**SMS Template** (`sms/your-module/your-new-event.txt`):

```
Hello {{name}}, your custom field: {{customField}}
```

**In-App Template** (`in-app/your-module/your-new-event.json`):

```json
{
  "title": "Your Notification",
  "message": "Hello {{name}}, your custom field: {{customField}}",
  "actionUrl": "{{link}}"
}
```

#### Step 4: Generate Template Types

```bash
npm run generate:templates
```

This updates `templates.generated.ts` with your new template paths.

#### Step 5: Create Manifest

```typescript
// src/modules/notifications/manifests/your-module/your-new-event.manifest.ts
import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

export const yourNewEventManifest: NotificationManifest = {
  type: NotificationType.YOUR_NEW_EVENT, // Add to enum first
  group: NotificationGroup.USER, // Choose appropriate group
  priority: 3, // 1-10, higher = more urgent
  requiresAudit: false, // Set true for security events
  templateBase: 'your-module/your-new-event', // ✅ Type-safe - must exist in TemplateBasePath
  channels: {
    [NotificationChannel.EMAIL]: {
      subject: 'Your Notification Subject',
      requiredVariables: ['name', 'customField'], // Must match template variables
      defaultLocale: 'en',
    },
    [NotificationChannel.SMS]: {
      requiredVariables: ['name', 'customField'],
      defaultLocale: 'en',
    },
    [NotificationChannel.IN_APP]: {
      requiredVariables: ['name', 'customField', 'link'],
      defaultLocale: 'en',
    },
  },
} as const;
```

**Important:**

- `requiredVariables` must match exactly what templates expect
- `templateBase` must be in `TemplateBasePath` (generated from file system)
- Variables are checked at compile-time and runtime

#### Step 6: Register Manifest

```typescript
// src/modules/notifications/manifests/registry/notification-registry.ts
import { yourNewEventManifest } from '../your-module/your-new-event.manifest';

export const NotificationRegistry: Record<
  NotificationType,
  NotificationManifest
> = {
  // ... existing manifests
  [NotificationType.YOUR_NEW_EVENT]: yourNewEventManifest,
} as const;
```

#### Step 7: Add Event Mapping

```typescript
// src/modules/notifications/config/notifications.map.ts
import { YourModuleEvents } from '@/shared/events/your-module.events.enum';

export const NotificationEventsMap: Partial<
  Record<EventType, NotificationEventMapping>
> = {
  // ... existing mappings
  [YourModuleEvents.YOUR_NEW_EVENT]: {
    type: NotificationType.YOUR_NEW_EVENT,
  },
};
```

#### Step 8: Add Event Listener

```typescript
// src/modules/notifications/listeners/notification.listener.ts
import { YourNewEvent } from '@/modules/your-module/events/your-module.events';
import { YourModuleEvents } from '@/shared/events/your-module.events.enum';
import { ValidateEvent } from '../types/event-notification-mapping.types';

@OnEvent(YourModuleEvents.YOUR_NEW_EVENT)
async handleYourNewEvent(
  event: ValidateEvent<YourNewEvent, YourModuleEvents.YOUR_NEW_EVENT>,  // ✅ Type-safe
) {
  const recipient: RecipientInfo = {
    userId: event.userId,
    profileId: null,
    profileType: null,
    phone: null,
    email: event.email || null,
  };

  await this.handleNotification(
    YourModuleEvents.YOUR_NEW_EVENT,
    event,
    [recipient],
    false,  // Don't require phone if email-only
  );
}
```

**Type Safety:**

- `ValidateEvent<YourNewEvent, YourModuleEvents.YOUR_NEW_EVENT>` ensures:
  - Event has all properties required by manifest's `requiredVariables`
  - TypeScript will error if `customField` is missing from `YourNewEvent`

#### Step 9: Add to Required Events (if critical)

```typescript
// src/modules/notifications/config/required-events.registry.ts
import { YourModuleEvents } from '@/shared/events/your-module.events.enum';

export const REQUIRED_NOTIFICATION_EVENTS: readonly EventType[] = [
  // ... existing events
  YourModuleEvents.YOUR_NEW_EVENT, // If this event MUST have notifications
] as const;
```

#### Step 10: Update ensureTemplateData (if needed)

If your event needs special data transformation:

```typescript
// src/modules/notifications/services/notification-template.service.ts
ensureTemplateData(event, mapping, eventName) {
  const eventObj = event as Record<string, unknown>;
  const templateData = { ...eventObj, eventName };

  // Add custom transformation for your event
  if (eventName === YourModuleEvents.YOUR_NEW_EVENT) {
    const yourEvent = event as YourNewEvent;
    templateData.customField = yourEvent.customField;
    templateData.name = yourEvent.name || 'User';
  }

  return templateData;
}
```

#### Step 11: Validate

```bash
# Generate template types
npm run generate:templates

# Validate manifests
npm run validate:notification-manifests

# Validate listeners
npm run validate:notification-listeners

# Build
npm run build
```

#### Step 12: Emit Event

```typescript
// In your service
this.eventEmitter.emit(
  YourModuleEvents.YOUR_NEW_EVENT,
  new YourNewEvent(actor, userId, customFieldValue),
);
```

---

## Internal Workings

### Event Flow (Detailed)

```
1. Domain Event Emitted
   └─> eventEmitter.emit(YourModuleEvents.YOUR_NEW_EVENT, new YourNewEvent(...))

2. NotificationListener.handleYourNewEvent()
   ├─> Extracts recipient info from event
   ├─> Calls handleNotification()
   └─> handleNotification() calls NotificationService.processEvent()

3. NotificationService.processEvent()
   ├─> Step 1: lookupMapping()
   │   ├─> Looks up EventType → NotificationType in NotificationEventsMap
   │   └─> Loads manifest from NotificationRegistry
   │
   ├─> Step 2: extractRecipients()
   │   └─> Extracts userId, email, phone from RecipientInfo[]
   │
   ├─> Step 3: determineBaseChannels()
   │   └─> Gets channels from manifest.channels
   │
   ├─> Step 4: selectOptimalChannels()
   │   ├─> Checks user activity (last login, preferences)
   │   ├─> Considers priority and requiresAudit
   │   └─> Returns optimal channels (e.g., [EMAIL, IN_APP])
   │
   ├─> Step 5: prepareTemplateData()
   │   ├─> Calls ensureTemplateData() to transform event data
   │   ├─> Maps event properties to template variables
   │   └─> Adds defaults (name, message, link)
   │
   └─> Step 6: routeToChannels()
       ├─> For each channel:
       │   ├─> Validates recipient format (email/phone)
       │   ├─> Checks idempotency (prevents duplicates)
       │   ├─> Acquires distributed lock
       │   ├─> Renders template (NotificationRenderer)
       │   ├─> Builds payload
       │   └─> Routes to channel:
       │       ├─> IN_APP → Direct send (InAppAdapter)
       │       └─> Others → Enqueue to BullMQ queue
       │
       └─> Queue Processor (NotificationProcessor)
           ├─> Picks up job from queue
           ├─> Calls NotificationSenderService.send()
           ├─> Sender calls appropriate adapter (EmailAdapter, SmsAdapter, etc.)
           └─> Adapter sends via external provider (Nodemailer, Twilio, etc.)
```

### Template Rendering Flow

```
1. NotificationRenderer.render()
   ├─> Gets manifest via NotificationManifestResolver
   ├─> Gets channel config (with resolved template path)
   ├─> Validates required variables exist in eventData
   ├─> Determines locale (config → default → 'en')
   └─> Calls NotificationTemplateService.renderTemplateWithChannel()

2. NotificationTemplateService.renderTemplateWithChannel()
   ├─> Determines template format from channel:
   │   ├─> EMAIL → .hbs (Handlebars)
   │   ├─> SMS/WHATSAPP → .txt (simple string replacement)
   │   └─> IN_APP → .json (Zod-validated JSON)
   │
   ├─> Loads template content (with fallback strategy)
   │   ├─> Try channel-specific template
   │   ├─> Fallback to email template (if configured)
   │   └─> Fallback to default template
   │
   └─> Renders based on format:
       ├─> .hbs → Handlebars.compile() + template(data)
       ├─> .txt → String.replace(/\{\{(\w+)\}\}/g, ...)
       └─> .json → Parse JSON + validate with Zod + inject variables
```

### Channel Selection Logic

```typescript
// ChannelSelectionService.selectOptimalChannels()

1. Start with manifest channels (baseChannels)

2. Check user activity:
   - If user logged in recently → prefer IN_APP
   - If user inactive → prefer EMAIL
   - If urgent (priority >= 4) → use all available channels

3. Consider priority:
   - High priority (6-10) → Use all channels
   - Medium priority (3-5) → Use 2-3 channels
   - Low priority (1-2) → Use 1 channel

4. Consider requiresAudit:
   - If requiresAudit → Prefer EMAIL (for audit trail)

5. Return optimal channels
```

### Idempotency System

```typescript
// Prevents duplicate notifications

1. Build idempotency key:
   key = `${correlationId}:${notificationType}:${channel}:${recipient}`

2. Acquire distributed lock (Redis SET NX):
   - Prevents race conditions
   - Lock expires after 30 seconds

3. Check if already sent:
   - Redis GET key
   - If exists → skip (already sent)

4. Mark as sent:
   - Redis SET key with TTL (e.g., 24 hours)

5. Release lock
```

### Circuit Breaker

```typescript
// Prevents cascading failures

1. Track failures per channel:
   - Redis ZSET: `circuit-breaker:${channel}:failures`
   - Score = timestamp, Value = failure count

2. Check circuit state:
   - Count failures in last window (e.g., 5 minutes)
   - If failures > threshold (e.g., 10) → OPEN circuit
   - If failures < threshold → CLOSED circuit

3. Execute with circuit breaker:
   - If OPEN → Reject immediately (don't call provider)
   - If CLOSED → Call provider
   - On failure → Record failure
   - On success → Record success (may close circuit)
```

---

## Template System

### Template Formats

#### Email Templates (`.hbs`)

**Location**: `src/i18n/notifications/{locale}/email/{template-path}.hbs`

**Format**: Handlebars templates

**Example**:

```handlebars
<h1>Welcome, {{name}}!</h1>
<p>Your verification code is: <strong>{{otpCode}}</strong></p>
<p>This code expires in {{expiresIn}}.</p>
```

**Variables**: Access via `{{variableName}}`

#### SMS/WhatsApp Templates (`.txt`)

**Location**: `src/i18n/notifications/{locale}/sms/{template-path}.txt` or `whatsapp/{template-path}.txt`

**Format**: Plain text with `{{variable}}` placeholders

**Example**:

```
Hello {{name}}, your OTP is {{otpCode}}. Expires in {{expiresIn}}.
```

**Rendering**: Simple string replacement (regex-based)

#### In-App Templates (`.json`)

**Location**: `src/i18n/notifications/{locale}/in-app/{template-path}.json`

**Format**: JSON with `{{variable}}` placeholders

**Example**:

```json
{
  "title": "OTP Sent",
  "message": "Your verification code is {{otpCode}}. Expires in {{expiresIn}}.",
  "actionUrl": "{{link}}",
  "priority": 4
}
```

**Validation**: Zod schema ensures structure is correct

**Rendering**: Parse JSON → Replace variables → Validate with Zod → Return object

### Template Fallback Strategy

```
1. Try channel-specific template:
   en/email/auth/otp.hbs

2. Fallback to email template (if configured):
   en/email/auth/otp.hbs

3. Fallback to default template in channel folder:
   en/email/default.hbs

4. Fallback to root default template:
   en/default.hbs
```

### Template Variable Transformation

**Event Data → Template Variables**:

```typescript
// Event has: { resetUrl: 'https://...', expiresIn: 3600 }
// Template expects: { link: 'https://...', expiresIn: '1 hour' }

ensureTemplateData() transforms:
- resetUrl → link
- verificationUrl → link
- expiresIn (number) → expiresIn (string: "10 minutes")
- otpCode → otpCode (also creates 'otp' for backward compat)
```

---

## Channel Adapters

### Email Adapter

**Provider**: Nodemailer

**Configuration**: SMTP settings from environment variables

**Features**:

- HTML email support (Handlebars templates)
- Subject line
- Timeout protection (p-timeout)

### SMS Adapter

**Provider**: Twilio

**Configuration**: Twilio credentials from environment variables

**Features**:

- E.164 phone number validation
- Character limit handling
- Timeout protection

### WhatsApp Adapter

**Provider**: Meta Business API

**Configuration**: Meta WhatsApp Business API credentials (accessToken, phoneNumberId)

**Features**:

- Template message support (pre-approved templates only)
- E.164 phone number validation
- Timeout protection
- Template parameter extraction from event data

**Important**: WhatsApp uses template messages, not free text. Templates must be pre-approved by WhatsApp Business API. Template names in manifests must match approved template names exactly.

### In-App Adapter

**Provider**: Internal (WebSocket + Database)

**Features**:

- Real-time delivery via WebSocket
- Persistent storage in database
- JSON payload support
- Priority-based sorting

---

## Best Practices

### 1. Always Use Type-Safe Templates

```typescript
// ✅ Good
templateBase: 'auth/otp'; // TypeScript validates this exists

// ❌ Bad
templateBase: 'auth/invalid'; // TypeScript error!
```

### 2. Match requiredVariables to Template Variables

```typescript
// Template uses: {{otpCode}}, {{expiresIn}}
// ✅ Good
requiredVariables: ['otpCode', 'expiresIn'];

// ❌ Bad - mismatch
requiredVariables: ['otp', 'expiry']; // Template will fail at runtime
```

### 3. Use ValidateEvent for Type Safety

```typescript
// ✅ Good - TypeScript validates event has required properties
@OnEvent(AuthEvents.OTP)
async handleOtp(
  event: ValidateEvent<OtpEvent, AuthEvents.OTP>
) { ... }

// ❌ Bad - No type safety
@OnEvent(AuthEvents.OTP)
async handleOtp(event: OtpEvent) { ... }
```

### 4. Run Validations Before Committing

```bash
# Always run before committing
npm run generate:templates
npm run validate:notification-manifests
npm run validate:notification-listeners
npm run build
```

### 5. Use Appropriate Priority Levels

```typescript
// Security events (OTP, password reset)
priority: 4 - 5;

// Important updates (center created, user registered)
priority: 3;

// Routine updates (center updated, branch created)
priority: 2;

// Low priority (reminders, notifications)
priority: 1;
```

### 6. Mark Security Events for Audit

```typescript
// ✅ Good
requiresAudit: true; // For OTP, password reset, email verification

// ✅ Good
requiresAudit: false; // For routine notifications
```

### 7. Handle Missing Properties Gracefully

```typescript
// In ensureTemplateData()
if (!templateData.name) {
  templateData.name = 'User'; // Default fallback
}
```

### 8. Use Template Fallbacks

Always create `default` templates for each channel:

- `en/email/default.hbs`
- `en/sms/default.txt`
- `en/whatsapp/default.txt`
- `en/in-app/default.json`

---

## Troubleshooting

### TypeScript Error: "Property 'otpCode' is missing"

**Cause**: Event is missing required property from manifest

**Solution**: Add property to event class or update manifest `requiredVariables`

### TypeScript Error: "Type 'string' is not assignable to type 'TemplateBasePath'"

**Cause**: `templateBase` value doesn't exist in file system

**Solution**: Run `npm run generate:templates` or create the template file

### Runtime Error: "Missing template variables"

**Cause**: Event data doesn't have all `requiredVariables`

**Solution**: Check `ensureTemplateData()` transforms event properties correctly

### Validation Error: "Missing required event mappings"

**Cause**: Event in `required-events.registry.ts` not mapped in `NotificationEventsMap`

**Solution**: Add mapping in `notifications.map.ts`

---

## Concurrency Limits

The notification system uses **three independent concurrency limits** to prevent resource exhaustion and ensure optimal performance:

### 1. NotificationService Concurrency Limit (20)

**Location**: `NotificationService.concurrencyLimit`  
**Purpose**: Limits concurrent `processEvent()` calls  
**Value**: 20 (hardcoded)  
**Scope**: Per-service instance

**Why it exists**: Prevents too many events from being processed simultaneously, which could overwhelm the event loop or database connections.

**Usage**:

```typescript
// Limits concurrent processEvent() calls
await this.concurrencyLimit(async () => {
  await this.processEventForRecipient(...);
});
```

### 2. NotificationSenderService Concurrency Limit (5)

**Location**: `NotificationSenderService.sendMultipleConcurrency`  
**Purpose**: Limits concurrent `send()` calls when sending multiple notifications  
**Value**: 5 (configurable via `NOTIFICATION_SEND_MULTIPLE_CONCURRENCY` env var)  
**Scope**: Per-service instance

**Why it exists**: Prevents overwhelming external providers (SMTP, Twilio, etc.) with too many simultaneous requests.

**Usage**:

```typescript
// Limits concurrent send() calls
const limit = pLimit(this.sendMultipleConcurrency);
await Promise.all(
  payloads.map((payload) => limit(async () => await this.send(payload))),
);
```

### 3. NotificationProcessor Concurrency (5)

**Location**: BullMQ queue processor  
**Purpose**: Limits concurrent job processing in the queue  
**Value**: 5 (configurable via `NOTIFICATION_CONCURRENCY` env var)  
**Scope**: Per-worker instance

**Why it exists**: Controls how many queued notification jobs are processed simultaneously by BullMQ workers.

**Configuration**:

```typescript
@Processor('notifications', {
  concurrency: PROCESSOR_CONCURRENCY, // Default: 5
})
```

### Relationship Between Limits

```
Event Flow:
1. Domain Event → NotificationService.processEvent()
   └─> Limited by: NotificationService concurrency (20)

2. NotificationService → Enqueue to BullMQ
   └─> No limit (queue accepts all)

3. BullMQ Queue → NotificationProcessor.process()
   └─> Limited by: Processor concurrency (5)

4. NotificationProcessor → NotificationSenderService.send()
   └─> Limited by: SenderService concurrency (5)
```

**Key Points**:

- **NotificationService (20)** is the highest limit - allows many events to start processing
- **Processor (5)** and **SenderService (5)** are lower - prevent overwhelming external services
- These limits work together to create a **controlled flow** from events → queue → external providers

**Tuning Recommendations**:

- Increase `NotificationService` limit if you have many events but slow processing
- Increase `Processor` limit if queue backlog grows (but watch external provider limits)
- Increase `SenderService` limit if you have high throughput and robust external providers
- Monitor external provider rate limits (Twilio, SMTP) and adjust accordingly

---

## Summary

The notification system provides:

1. **Type Safety**: Compile-time validation for templates, events, and manifests
2. **Manifest-Driven**: Centralized configuration for all notification types
3. **Multi-Channel**: Supports Email, SMS, WhatsApp, In-App
4. **Automatic Validation**: Startup checks ensure correctness
5. **Event-Driven**: Integrates seamlessly with domain events

**Key Files to Remember:**

- `manifests/` - Define notification configurations
- `config/notifications.map.ts` - Map events to notification types
- `listeners/notification.listener.ts` - Handle domain events
- `types/templates.generated.ts` - Auto-generated template paths (run `npm run generate:templates`)

**Validation Commands:**

```bash
npm run generate:templates          # Generate template types
npm run validate:notification-manifests  # Validate manifests
npm run validate:notification-listeners  # Validate listeners
```
