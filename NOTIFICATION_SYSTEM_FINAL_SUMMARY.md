# Notification System - Final Structure & Architecture Summary

**Date:** 2024  
**Status:** ✅ Production-ready after manifest refactoring  
**Version:** Post-refactoring (unified template field, manifest-level requiredVariables)

---

## 📋 Table of Contents

1. [Final Manifest Structure](#final-manifest-structure)
2. [Architecture Overview](#architecture-overview)
3. [How Notifications Work (General Flow)](#how-notifications-work-general-flow)
4. [Component Connections](#component-connections)
5. [Pros & Cons](#pros--cons)
6. [Data Flow Diagram](#data-flow-diagram)

---

## 🏗️ Final Manifest Structure

### Type Definitions

```typescript
// Channel Configuration
interface ChannelManifest {
  template: NotificationTemplatePath | string;  // ✅ Unified field
  // - EMAIL/SMS/IN_APP: File path (e.g., 'email/auth/otp')
  // - WHATSAPP: Meta template name (e.g., 'otp_verification')
  subject?: string;  // Required for EMAIL channel
}

// Audience Configuration
interface AudienceManifest {
  channels: {
    [NotificationChannel.EMAIL]?: ChannelManifest;
    [NotificationChannel.SMS]?: ChannelManifest;
    [NotificationChannel.WHATSAPP]?: ChannelManifest;
    [NotificationChannel.IN_APP]?: ChannelManifest;
    [NotificationChannel.PUSH]?: ChannelManifest;
  };
}

// Complete Manifest
interface NotificationManifest {
  type: NotificationType;
  group: NotificationGroup;
  requiredVariables: readonly string[];  // ✅ Top-level (union of all audience needs)
  priority?: number;
  localized?: boolean;
  requiresAudit?: boolean;
  audiences: {
    [audienceId: string]: AudienceManifest;
  };
}
```

### Example: Simple Manifest (OTP)

```typescript
export const otpManifest: NotificationManifest = {
  type: NotificationType.OTP,
  group: NotificationGroup.SECURITY,
  priority: 4,
  requiresAudit: true,
  requiredVariables: ['otpCode', 'expiresIn'],  // ✅ All channels use same variables
  audiences: {
    DEFAULT: {
      channels: {
        [NotificationChannel.SMS]: {
          template: 'sms/auth/otp',  // ✅ Explicit file path
        },
        [NotificationChannel.WHATSAPP]: {
          template: 'otp_verification',  // ✅ Meta template name
        },
        [NotificationChannel.EMAIL]: {
          template: 'email/auth/otp',  // ✅ Explicit file path
          subject: 'Your Verification Code',
        },
        [NotificationChannel.IN_APP]: {
          template: 'in-app/auth/otp',  // ✅ Explicit file path
        },
      },
    },
  },
} as const;
```

### Example: Multi-Audience Manifest (Center Created)

```typescript
export const centerCreatedManifest: NotificationManifest = {
  type: NotificationType.CENTER_CREATED,
  group: NotificationGroup.MANAGEMENT,
  priority: 3,
  requiresAudit: true,
  requiredVariables: ['creatorName', 'centerName', 'ownerName'],  // ✅ Union of all needs
  // TypeScript ensures ALL variables are provided
  // Each audience uses only what it needs
  audiences: {
    ADMIN: {
      channels: {
        [NotificationChannel.IN_APP]: {
          template: 'in-app/center-created',  // Uses: creatorName, centerName
        },
      },
    },
    OWNER: {
      channels: {
        [NotificationChannel.EMAIL]: {
          template: 'email/center-created',  // Uses: centerName, ownerName
          subject: 'Your new center is ready!',
        },
        [NotificationChannel.IN_APP]: {
          template: 'in-app/center-created',  // Uses: centerName
        },
      },
    },
  },
} as const;
```

---

## 🏛️ Architecture Overview

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Domain Modules                            │
│  (Auth, User, Center, etc.)                                  │
│  Emit events via EventEmitter2                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              NotificationListener                           │
│  - Listens to domain events (@OnEvent)                      │
│  - Validates event data (requiredVariables)                 │
│  - Resolves recipients                                       │
│  - Calls NotificationService.trigger()                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            NotificationService (Orchestrator)               │
│  - Validates & deduplicates recipients                      │
│  - Groups recipients by template data (bulk optimization)   │
│  - Pre-renders templates (for bulk groups)                  │
│  - Processes recipients (with concurrency control)          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│        NotificationPipelineService                          │
│  - Extracts event data                                      │
│  - Determines enabled channels (from manifest)              │
│  - Selects optimal channels (dynamic based on user activity)│
│  - Prepares template data                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│          NotificationRouterService                           │
│  - Validates recipient (per-channel)                        │
│  - Checks rate limit (FIRST - prevents resource waste)      │
│  - Checks idempotency (prevents duplicates)                │
│  - Renders template (or uses pre-rendered cache)           │
│  - Builds payload (channel-specific)                        │
│  - Routes to queue (or sends IN_APP directly)             │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌───────────────┐        ┌──────────────────────┐
│  IN_APP       │        │  EMAIL/SMS/WHATSAPP   │
│  (Direct)    │        │  (BullMQ Queue)        │
└───────┬───────┘        └──────────┬─────────────┘
        │                          │
        ▼                          ▼
┌───────────────┐        ┌──────────────────────┐
│ Notification  │        │ NotificationProcessor │
│ Gateway       │        │ (BullMQ Worker)      │
│ (WebSocket)   │        └──────────┬─────────────┘
└───────┬───────┘                  │
        │                          ▼
        │                 ┌──────────────────────┐
        │                 │ NotificationSender   │
        │                 │ Service              │
        │                 └──────────┬─────────────┘
        │                          │
        └──────────────┬───────────┘
                       ▼
              ┌─────────────────┐
              │ Channel Adapters│
              │ - EmailAdapter   │
              │ - SmsAdapter     │
              │ - InAppAdapter   │
              │ - WhatsAppAdapter│
              └─────────────────┘
```

---

## 🔄 How Notifications Work (General Flow)

### Step-by-Step Flow

#### 1. **Event Emission** (Domain Module)

```typescript
// Example: Auth service emits OTP event
this.eventEmitter.emit(
  AuthEvents.OTP,
  new OtpEvent(userId, otpCode, expiresIn)
);
```

#### 2. **Event Reception** (NotificationListener)

```typescript
@OnEvent(AuthEvents.OTP)
async handleOtp(event: OtpEvent) {
  // 1. Validate event data contains all requiredVariables
  const missing = this.validateEventData(
    NotificationType.OTP,
    'DEFAULT',
    event
  );
  if (missing.length > 0) {
    // Log error, skip notification
    return;
  }

  // 2. Resolve recipient
  const recipient: RecipientInfo = {
    userId: event.userId,
    phone: user.getPhone(),
    email: user.email,
    locale: user.userInfo.locale,
  };

  // 3. Trigger notification
  await this.notificationService.trigger(
    NotificationType.OTP,
    {
      audience: 'DEFAULT',
      event,
      recipients: [recipient],
    }
  );
}
```

#### 3. **NotificationService Processing**

```typescript
async trigger(type, { audience, event, recipients, channels }) {
  // Step 1: Validate recipients
  const validRecipients = validateRecipients(recipients, type);
  
  // Step 2: Deduplicate (by userId)
  const uniqueRecipients = this.deduplicateRecipients(validRecipients);
  
  // Step 3: Group by template data hash (for bulk optimization)
  const groups = this.groupRecipientsByTemplateData(uniqueRecipients, event);
  
  // Step 4: Pre-render templates for bulk groups
  const preRenderedCache = new Map();
  for (const group of groups) {
    if (group.recipients.length > 1) {
      // Pre-render once, reuse for all recipients in group
      const rendered = await this.renderer.render(...);
      preRenderedCache.set(group.hash, rendered);
    }
  }
  
  // Step 5: Process recipients (with concurrency control)
  await this.multiRecipientProcessor.process(
    uniqueRecipients,
    async (recipient) => {
      await this.processEventForRecipient(
        type, event, correlationId, recipient,
        manifest, audience, channels, preRenderedCache
      );
    }
  );
}
```

#### 4. **Pipeline Processing** (NotificationPipelineService)

```typescript
async process(context, recipientInfo) {
  // Step 1: Extract event data
  this.extractEventData(context, recipientInfo);
  // - Sets userId, phone, email, locale, centerId, profileType
  
  // Step 2: Determine enabled channels (from manifest)
  this.determineChannels(context);
  // - Gets channels from manifest.audiences[audience].channels
  // - Filters by requestedChannels if provided
  
  // Step 3: Select optimal channels (dynamic)
  await this.selectOptimalChannels(context);
  // - Checks user activity (last login)
  // - Applies rules (e.g., inactive users → prefer external channels)
  // - Ensures external channel for critical events (priority >= 8)
  
  // Step 4: Prepare template data
  this.prepareTemplateData(context);
  // - Transforms event data to template variables
  // - Validates all requiredVariables are present
  // - Adds defaults (name, message, link)
}
```

#### 5. **Routing** (NotificationRouterService)

```typescript
async route(context, preRenderedCache) {
  for (const channel of context.finalChannels) {
    // Step 1: Validate recipient (per-channel)
    if (!this.isValidRecipient(context, channel)) {
      continue; // Skip invalid recipient
    }
    
    // Step 2: Check rate limit (FIRST - prevents resource waste)
    const rateLimitResult = await this.rateLimitService.checkLimit(...);
    if (!rateLimitResult.allowed) {
      // Log, skip, continue
      continue;
    }
    
    // Step 3: Check idempotency (prevents duplicates)
    const idempotencyKey = this.buildIdempotencyKey(context, channel);
    const isDuplicate = await this.idempotencyService.check(idempotencyKey);
    if (isDuplicate) {
      // Log, skip, continue
      continue;
    }
    
    // Step 4: Render template (or use pre-rendered cache)
    let rendered: RenderedNotification;
    const cacheKey = this.getTemplateCacheKey(...);
    if (preRenderedCache?.has(cacheKey)) {
      rendered = preRenderedCache.get(cacheKey)!;
    } else {
      rendered = await this.renderer.render(
        context.eventName,
        channel,
        context.templateData,
        context.locale,
        context.audience
      );
    }
    
    // Step 5: Build payload (channel-specific)
    const payload = this.payloadBuilder.buildPayload(
      channel,
      basePayload,
      rendered,
      context.templateData,
      manifest,
      channelConfig
    );
    
    // Step 6: Route to queue or send directly
    if (channel === NotificationChannel.IN_APP) {
      // Direct send (bypasses queue)
      await this.senderService.send(payload);
    } else {
      // Enqueue to BullMQ
      await this.notificationQueue.add('send-notification', payload, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      });
    }
  }
}
```

#### 6. **Queue Processing** (NotificationProcessor - BullMQ Worker)

```typescript
@Process('send-notification')
async process(job: Job<NotificationPayload>) {
  const payload = job.data;
  
  // Step 1: Get retry strategy
  const strategy = this.getRetryStrategy(payload.channel);
  
  // Step 2: Send via NotificationSenderService
  await this.senderService.send(payload);
  
  // Step 3: Log result (success/failure)
  // - Updates notification_logs table
  // - Stores metadata (messageId, latency, etc.)
  
  // Step 4: Retry on failure (with exponential backoff)
  // - Handled by BullMQ automatically
}
```

#### 7. **Sending** (NotificationSenderService)

```typescript
async send(payload: NotificationPayload) {
  const startTime = Date.now();
  
  // Step 1: Check circuit breaker
  const breaker = this.getCircuitBreaker(payload.channel);
  if (breaker.isOpen()) {
    throw new CircuitBreakerOpenException(...);
  }
  
  // Step 2: Route to adapter
  const adapter = this.getAdapter(payload.channel);
  
  // Step 3: Send via adapter
  try {
    await adapter.send(payload);
    breaker.recordSuccess();
  } catch (error) {
    breaker.recordFailure();
    throw error;
  }
  
  // Step 4: Log result
  await this.logNotificationResult(payload, startTime, success);
}
```

#### 8. **Adapter Execution** (Channel-Specific)

```typescript
// Example: EmailAdapter
async send(payload: EmailNotificationPayload) {
  // 1. Extract email-specific data
  const { to, subject, content } = payload.data;
  
  // 2. Send via provider (SendGrid)
  await this.sendGridClient.send({
    to,
    from: this.config.fromEmail,
    subject,
    html: content,
  });
  
  // 3. Return result (messageId, etc.)
  return { messageId: result.id };
}
```

---

## 🔗 Component Connections

### Service Dependencies

```
NotificationListener
  ├─> NotificationService
  │     ├─> NotificationManifestResolver (gets manifest)
  │     ├─> NotificationRenderer (pre-renders templates)
  │     ├─> NotificationPipelineService
  │     │     ├─> ChannelSelectionService (dynamic channel selection)
  │     │     └─> NotificationManifestResolver
  │     ├─> NotificationRouterService
  │     │     ├─> NotificationRenderer (renders templates)
  │     │     ├─> PayloadBuilderService (builds channel payloads)
  │     │     ├─> RateLimitService (checks rate limits)
  │     │     ├─> IdempotencyService (prevents duplicates)
  │     │     └─> NotificationQueue (BullMQ - for async channels)
  │     └─> MultiRecipientProcessor (concurrency control)
  │
  └─> UserService (resolves recipients)

NotificationProcessor (BullMQ Worker)
  └─> NotificationSenderService
        ├─> CircuitBreakerService (checks circuit breakers)
        ├─> EmailAdapter → SendGridProvider
        ├─> SmsAdapter → TwilioProvider
        ├─> WhatsAppAdapter → MetaWhatsAppProvider
        └─> InAppAdapter → NotificationGateway (WebSocket)

NotificationGateway (WebSocket)
  ├─> InAppAdapter (receives notifications)
  └─> Redis (pub/sub for scaling)
```

### Data Flow Connections

```
Event Data
  ↓
NotificationListener.validateEventData()
  ↓ (validates requiredVariables from manifest)
Event Data (validated)
  ↓
NotificationService.trigger()
  ↓
NotificationPipelineService.process()
  ↓ (uses manifest.requiredVariables)
Template Data (prepared)
  ↓
NotificationRouterService.route()
  ↓ (uses manifest.audiences[audience].channels[channel].template)
Rendered Notification
  ↓
PayloadBuilderService.buildPayload()
  ↓ (uses channelConfig.template)
Channel Payload
  ↓
NotificationQueue (BullMQ) OR Direct Send (IN_APP)
  ↓
NotificationSenderService.send()
  ↓
Channel Adapter.send()
  ↓
Provider API (SendGrid, Twilio, Meta, WebSocket)
```

---

## ✅ Pros & Cons

### ✅ Pros

#### 1. **Unified Template Field**
- **Benefit**: Consistent naming across all channels
- **Impact**: Easier to understand, less confusion
- **Example**: `template: 'email/auth/otp'` vs `template: 'otp_verification'` (same field, different meaning)

#### 2. **Manifest-Level RequiredVariables**
- **Benefit**: Type safety - TypeScript ensures all variables are provided
- **Benefit**: No duplication - defined once at top level
- **Benefit**: Clear visibility - see all possible variables at a glance
- **Example**: `requiredVariables: ['creatorName', 'centerName', 'ownerName']` - all audiences use subset

#### 3. **Explicit Template Paths**
- **Benefit**: No derivation logic - each channel specifies its template
- **Benefit**: Easier to understand - see exactly what template is used
- **Benefit**: Better IDE support - type-safe template paths

#### 4. **Multi-Audience Support**
- **Benefit**: Different audiences can have different channels
- **Benefit**: Flexible - same notification type, different delivery
- **Example**: ADMIN gets IN_APP, OWNER gets EMAIL + IN_APP

#### 5. **Type Safety**
- **Benefit**: Compile-time validation of template paths
- **Benefit**: Compile-time validation of required variables
- **Benefit**: Prevents runtime errors

#### 6. **Clean Structure**
- **Benefit**: Less nesting - easier to read
- **Benefit**: More maintainable - clear separation of concerns

### ❌ Cons

#### 1. **RequiredVariables Union**
- **Issue**: Must provide ALL variables even if audience doesn't need them
- **Impact**: Slightly more data in event (usually minimal)
- **Mitigation**: Each audience/channel uses only what it needs (templates filter)

#### 2. **Explicit Template Paths**
- **Issue**: More verbose - must specify template for each channel
- **Impact**: Slightly more code in manifests
- **Mitigation**: Better clarity and type safety

#### 3. **No Template Inheritance**
- **Issue**: Can't derive template paths from a base
- **Impact**: Must specify full path for each channel
- **Mitigation**: Explicit is better than implicit (easier to understand)

#### 4. **WhatsApp Template Name vs Path**
- **Issue**: Same field name (`template`) but different meaning (path vs name)
- **Impact**: Could be confusing (is it a path or a name?)
- **Mitigation**: Clear documentation, channel-specific handling

#### 5. **Type Complexity**
- **Issue**: `template: NotificationTemplatePath | string` (union type)
- **Impact**: Less strict typing for WhatsApp (uses `string` instead of `NotificationTemplatePath`)
- **Mitigation**: Runtime validation ensures correctness

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    DOMAIN EVENT                              │
│  AuthEvents.OTP → OtpEvent(userId, otpCode, expiresIn)      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              NotificationListener                            │
│  1. validateEventData()                                      │
│     - Checks: otpCode, expiresIn present?                    │
│  2. Resolve recipient (userId → RecipientInfo)              │
│  3. notificationService.trigger()                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            NotificationService                              │
│  1. Validate & deduplicate recipients                       │
│  2. Group by template data hash                             │
│  3. Pre-render templates (bulk optimization)                │
│  4. Process recipients (concurrency control)                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│        NotificationPipelineService                           │
│  1. Extract event data                                       │
│     - userId, phone, email, locale                          │
│  2. Determine channels (from manifest)                       │
│     - manifest.audiences['DEFAULT'].channels                 │
│  3. Select optimal channels (dynamic)                        │
│     - Check user activity, priority                         │
│  4. Prepare template data                                    │
│     - { otpCode, expiresIn } → template variables           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│          NotificationRouterService                           │
│  For each channel (SMS, EMAIL, IN_APP, etc.):               │
│  1. Validate recipient (has phone/email?)                    │
│  2. Check rate limit (FIRST)                                 │
│  3. Check idempotency                                        │
│  4. Render template                                          │
│     - Uses: manifest.audiences['DEFAULT'].channels[channel] │
│     - Template: 'sms/auth/otp' (from channelConfig.template) │
│     - Data: { otpCode: '123456', expiresIn: '5 minutes' }   │
│  5. Build payload                                            │
│  6. Route to queue or send directly                          │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌───────────────┐        ┌──────────────────────┐
│  IN_APP       │        │  EMAIL/SMS/WHATSAPP   │
│  Direct Send  │        │  BullMQ Queue         │
└───────┬───────┘        └──────────┬─────────────┘
        │                          │
        ▼                          ▼
┌───────────────┐        ┌──────────────────────┐
│ Notification  │        │ NotificationProcessor │
│ Gateway       │        │ (Worker)              │
│ (WebSocket)   │        └──────────┬─────────────┘
└───────┬───────┘                  │
        │                          ▼
        │                 ┌──────────────────────┐
        │                 │ NotificationSender    │
        │                 │ Service               │
        │                 └──────────┬─────────────┘
        │                          │
        └──────────────┬───────────┘
                       ▼
              ┌─────────────────┐
              │ Channel Adapters│
              │ - EmailAdapter   │
              │ - SmsAdapter     │
              │ - InAppAdapter   │
              │ - WhatsAppAdapter│
              └─────────────────┘
```

---

## 🎯 Key Takeaways

1. **Manifest-Driven**: All configuration in manifests (type-safe, centralized)
2. **Event-Driven**: Domain events trigger notifications (decoupled)
3. **Multi-Channel**: Supports EMAIL, SMS, WhatsApp, IN_APP, PUSH
4. **Multi-Audience**: Different audiences can have different channels
5. **Type-Safe**: TypeScript ensures correctness at compile time
6. **Bulk Optimized**: Groups recipients, pre-renders templates
7. **Reliable**: Circuit breakers, idempotency, retry strategies
8. **Observable**: Comprehensive logging, metrics, audit trails

---

## 📝 Summary

The notification system is a **production-grade, event-driven, manifest-based notification system** that:

- **Unifies** template configuration across channels
- **Ensures** type safety through TypeScript and manifest validation
- **Supports** multi-audience notifications with different channels
- **Optimizes** bulk operations through grouping and pre-rendering
- **Provides** reliability through circuit breakers, idempotency, and retries
- **Maintains** observability through comprehensive logging and metrics

The refactored structure is **cleaner, more maintainable, and type-safe**, with explicit template paths and manifest-level required variables providing better clarity and correctness.

