# Notifications Module - Comprehensive Unit Testing Plan

## Overview

This document outlines a comprehensive unit testing strategy for the notifications module, organized by **testing concerns** rather than individual services for faster development feedback and better test organization.

**Testing Framework:** Jest with NestJS Testing Module  
**Test Pattern:** `*.spec.ts` files organized by testing concern  
**Coverage Target:** >80% for all services, >90% for critical paths

---

## Table of Contents

1. [Test Infrastructure & Setup](#test-infrastructure--setup)
2. [Mock Integration Layer](#mock-integration-layer)
3. [Testing Concerns (Grouped Tests)](#testing-concerns-grouped-tests)
4. [Contract Tests (Deep Logic)](#contract-tests-deep-logic)
5. [Adapter Tests (Integration-Style)](#adapter-tests-integration-style)
6. [Performance & Load Simulation](#performance--load-simulation)
7. [Template Snapshot Tests](#template-snapshot-tests)
8. [Schema Validation Tests](#schema-validation-tests)
9. [Smoke Flow Integration Test](#smoke-flow-integration-test)
10. [Property-Based Tests](#property-based-tests)
11. [CI Optimization](#ci-optimization)
12. [Test Execution Strategy](#test-execution-strategy)

---

## Test Infrastructure & Setup

### Test Utilities to Create

#### 1. `test/notifications/test-helpers.ts`

```typescript
// Test data factories
export const createMockRecipientInfo()
export const createMockNotificationEvent()
export const createMockNotificationPayload()
export const createMockNotificationManifest()
export const createMockNotificationContext()

// Mock builders
export const createMockLoggerService()
export const createMockMetricsService()
export const createMockDataSource()
```

#### 2. `test/notifications/fixtures/`

- `manifests.fixture.ts` - Sample manifests for testing
- `templates.fixture.ts` - Sample template content
- `events.fixture.ts` - Sample event data
- `recipients.fixture.ts` - Sample recipient data

---

## Mock Integration Layer

### Shared Fake Services (In-Memory State)

Instead of manually mocking BullMQ and Redis in each test, we create reusable fake implementations with in-memory state that can be inspected and asserted.

#### 1. `test/notifications/fakes/fake-queue.ts`

```typescript
import { Job, JobsOptions } from 'bullmq';
import { NotificationJobData } from '@/modules/notifications/types/notification-job-data.interface';

export class FakeQueue {
  private jobs: Map<string, Job<NotificationJobData>> = new Map();
  private jobCounter = 0;

  async add(
    name: string,
    data: NotificationJobData,
    opts?: JobsOptions,
  ): Promise<Job<NotificationJobData>> {
    const jobId = `job-${++this.jobCounter}`;
    const job = {
      id: jobId,
      name,
      data,
      opts: opts || {},
      attemptsMade: 0,
    } as Job<NotificationJobData>;

    this.jobs.set(jobId, job);
    return job;
  }

  async addBulk(
    jobs: Array<{
      name: string;
      data: NotificationJobData;
      opts?: JobsOptions;
    }>,
  ): Promise<Job<NotificationJobData>[]> {
    return Promise.all(
      jobs.map((job) => this.add(job.name, job.data, job.opts)),
    );
  }

  getJob(id: string): Job<NotificationJobData> | undefined {
    return this.jobs.get(id);
  }

  getJobs(): Job<NotificationJobData>[] {
    return Array.from(this.jobs.values());
  }

  getJobCount(): number {
    return this.jobs.size;
  }

  getJobsByChannel(channel: string): Job<NotificationJobData>[] {
    return Array.from(this.jobs.values()).filter(
      (job) => job.data.channel === channel,
    );
  }

  clear(): void {
    this.jobs.clear();
    this.jobCounter = 0;
  }
}
```

#### 2. `test/notifications/fakes/fake-redis.ts`

```typescript
export class FakeRedis {
  private data: Map<string, string> = new Map();
  private expirations: Map<string, number> = new Map();

  async get(key: string): Promise<string | null> {
    const expiration = this.expirations.get(key);
    if (expiration && Date.now() > expiration) {
      this.del(key);
      return null;
    }
    return this.data.get(key) || null;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.data.set(key, value);
    if (ttlSeconds) {
      this.expirations.set(key, Date.now() + ttlSeconds * 1000);
    }
  }

  async del(key: string): Promise<number> {
    const existed = this.data.has(key);
    this.data.delete(key);
    this.expirations.delete(key);
    return existed ? 1 : 0;
  }

  async exists(key: string): Promise<number> {
    return this.data.has(key) ? 1 : 0;
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (this.data.has(key)) {
      this.expirations.set(key, Date.now() + seconds * 1000);
      return 1;
    }
    return 0;
  }

  async setex(key: string, seconds: number, value: string): Promise<void> {
    await this.set(key, value, seconds);
  }

  // Inspection methods for tests
  getValue(key: string): string | undefined {
    return this.data.get(key);
  }

  getAllKeys(): string[] {
    return Array.from(this.data.keys());
  }

  clear(): void {
    this.data.clear();
    this.expirations.clear();
  }
}
```

#### 3. `test/notifications/fakes/fake-redis-client.ts`

```typescript
import { FakeRedis } from './fake-redis';

export class FakeRedisClient extends FakeRedis {
  // Implements Redis client interface
  // Can be used as drop-in replacement for ioredis client
}
```

**Benefits:**

- ✅ Single source of truth for queue/Redis state
- ✅ Can assert "how many jobs are queued" or "what was cached"
- ✅ No duplication across test files
- ✅ Fast in-memory operations
- ✅ Easy to reset between tests

---

## Testing Concerns (Grouped Tests)

### 1. Trigger Flow Test Suite (`trigger-flow.spec.ts`)

**Priority: CRITICAL**  
**Combines:** NotificationService + NotificationPipelineService + NotificationRouterService

This single test suite validates the entire notification trigger flow from start to finish, reducing setup overhead and providing faster feedback.

#### Test Cases:

##### Basic Trigger Flow

- ✅ `trigger()` - Single recipient, single channel (EMAIL)
- ✅ `trigger()` - Single recipient, multiple channels (EMAIL + SMS)
- ✅ `trigger()` - Multiple recipients, same channels
- ✅ `trigger()` - Multiple recipients, different channels
- ✅ `trigger()` - Returns BulkNotificationResult with correct counts
- ✅ `trigger()` - Handles correlation ID from RequestContext
- ✅ `trigger()` - Generates correlation ID if not in context

##### Pipeline Integration

- ✅ Extracts event data correctly (userId, email, phone, centerId, locale)
- ✅ Determines channels from manifest
- ✅ Filters requested channels against manifest
- ✅ Selects optimal channels based on user activity
- ✅ Prepares template data with all required fields
- ✅ Early exit when no enabled channels

##### Router Integration

- ✅ Validates recipient for each channel
- ✅ Normalizes phone to E164 format
- ✅ Checks idempotency (asserts idempotencyCache methods called)
- ✅ Builds correct payload for each channel type
- ✅ Sends IN_APP directly (no queue)
- ✅ Enqueues non-IN_APP channels (asserts queue.addBulk called)
- ✅ Uses pre-rendered cache when available

##### Recipient Validation

- ✅ Validates recipients with Zod schema
- ✅ Throws InvalidRecipientException for invalid recipients
- ✅ Handles missing email for EMAIL channel
- ✅ Handles missing phone for SMS/WhatsApp channels
- ✅ Handles invalid email format
- ✅ Handles invalid phone format
- ✅ Deduplicates recipients by userId
- ✅ Handles empty recipients array
- ✅ Handles recipients with only userId (no email/phone)

##### Batch Processing

- ✅ Groups recipients by template data hash
- ✅ Pre-renders template once per group (multiple recipients)
- ✅ Renders on-demand for single-recipient groups
- ✅ Reuses pre-rendered templates from cache
- ✅ Handles 100+ recipients efficiently
- ✅ Respects concurrency limit
- ✅ Processes recipients in parallel (within limit)

##### Error Handling

- ✅ Handles pipeline service errors
- ✅ Handles router service errors
- ✅ Continues processing other recipients on error
- ✅ Collects all errors in result.errors array
- ✅ Tracks failed count correctly
- ✅ Tracks skipped count correctly

##### Performance

- ✅ Measures duration correctly
- ✅ Logs start/complete events
- ✅ Handles large batches (1000+ recipients)

**Test Setup:**

```typescript
describe('Trigger Flow', () => {
  let fakeQueue: FakeQueue;
  let fakeRedis: FakeRedis;
  let notificationService: NotificationService;
  // ... setup with fakes
});
```

---

### 2. Sender Service Test Suite (`notification-sender.service.spec.ts`)

**Priority: CRITICAL**

#### Test Cases:

##### send() - EMAIL Channel

- ✅ Calls emailAdapter.send() with correct payload
- ✅ Creates notification log entry
- ✅ Updates log status to SENT on success
- ✅ Updates log status to FAILED on error
- ✅ Records latency
- ✅ Increments sent metric
- ✅ Increments failed metric on error
- ✅ Marks as sent in idempotency cache (asserts idempotencyCache.markSent called)
- ✅ Uses transaction for atomicity
- ✅ Handles missing subject gracefully

##### send() - SMS Channel

- ✅ Calls smsAdapter.send() with correct payload
- ✅ Creates notification log entry
- ✅ Handles Twilio errors
- ✅ Uses circuit breaker if available (asserts circuitBreaker.executeWithCircuitBreaker called)

##### send() - WhatsApp Channel

- ✅ Calls whatsappAdapter.send() with correct payload
- ✅ Handles provider errors (Twilio/Meta)

##### send() - IN_APP Channel

- ✅ Calls inAppAdapter.send() directly (no transaction)
- ✅ Creates notification log entry
- ✅ Updates log synchronously
- ✅ Handles rate limiting

##### Transaction Handling

- ✅ Creates log entry in transaction
- ✅ Updates log in same transaction
- ✅ Rolls back on error
- ✅ Handles existing log entries (retries)

##### Circuit Breaker Integration

- ✅ Uses circuit breaker when available (asserts called, not re-tests logic)
- ✅ Bypasses circuit breaker when not available
- ✅ Handles OPEN circuit state (asserts error thrown)

##### Error Handling

- ✅ Logs errors with full context
- ✅ Re-throws errors for BullMQ retry
- ✅ Handles adapter not found
- ✅ Handles missing rendered content

**Note:** For Circuit Breaker and Idempotency, we only assert they're called correctly, not re-test their internal logic (that's done in contract tests).

---

### 3. Processor Test Suite (`notification.processor.spec.ts`)

**Priority: CRITICAL**

#### Test Cases:

##### process()

- ✅ Processes job with valid data
- ✅ Validates job data format
- ✅ Restores RequestContext with correlationId
- ✅ Calls senderService.send()
- ✅ Handles send success
- ✅ Handles send failure
- ✅ Retries on transient errors
- ✅ Moves to DLQ after max retries (asserts queue.add called with DLQ queue)
- ✅ Updates job status correctly
- ✅ Logs processing events

##### Retry Logic

- ✅ Respects channel-specific retry config
- ✅ Increments retry count
- ✅ Handles non-retryable errors
- ✅ Stops retrying after max attempts

##### Error Handling

- ✅ Handles invalid job data
- ✅ Handles adapter errors
- ✅ Handles database errors
- ✅ Logs errors with context

---

### 4. Template Service Test Suite (`notification-template.service.spec.ts`)

**Priority: HIGH**

#### Test Cases:

##### loadTemplate()

- ✅ Loads template from file system
- ✅ Uses Redis cache when available (uses FakeRedis)
- ✅ Falls back to file system on cache miss
- ✅ Handles missing template file
- ✅ Handles invalid template format
- ✅ Caches loaded template

##### renderTemplate()

- ✅ Renders Handlebars template
- ✅ Replaces all variables
- ✅ Handles missing variables
- ✅ Handles nested objects
- ✅ Handles arrays
- ✅ Escapes HTML correctly
- ✅ Handles template compilation errors

##### Cache Management

- ✅ Clears cache on template update
- ✅ Handles cache errors gracefully
- ✅ Uses in-memory LRU cache as fallback

---

### 5. Renderer Test Suite (`notification-renderer.service.spec.ts`)

**Priority: HIGH**

#### Test Cases:

##### render()

- ✅ Resolves manifest for notification type
- ✅ Validates required variables
- ✅ Renders template with data
- ✅ Returns rendered content
- ✅ Handles missing manifest
- ✅ Handles missing template
- ✅ Handles rendering errors

---

## Contract Tests (Deep Logic)

These tests focus on the **contract** of specific services, testing their internal logic deeply once, rather than re-testing from every caller.

### 1. Idempotency Cache Contract (`notification-idempotency-cache.service.spec.ts`)

**Priority: HIGH**  
**Approach:** Test the service deeply once, then in other tests just assert it's called correctly.

#### Test Cases:

##### acquireLock()

- ✅ Acquires Redis lock with correct key
- ✅ Returns false if lock already held
- ✅ Sets lock expiration
- ✅ Handles Redis errors
- ✅ Handles concurrent lock acquisition (race conditions)
- ✅ Releases lock on timeout

##### checkAndSet()

- ✅ Checks if notification already sent
- ✅ Sets sent flag if not sent
- ✅ Returns true if already sent
- ✅ Returns false if not sent
- ✅ Uses correct cache key format
- ✅ Handles concurrent checkAndSet (race conditions)

##### releaseLock()

- ✅ Releases acquired lock
- ✅ Handles missing lock gracefully
- ✅ Handles Redis errors
- ✅ Prevents double-release

##### markSent()

- ✅ Marks notification as sent
- ✅ Sets expiration correctly
- ✅ Handles Redis errors
- ✅ Prevents duplicate marks

##### Cache Key Format

- ✅ Generates consistent keys
- ✅ Includes correlationId, type, channel, recipient
- ✅ Handles special characters in recipient

**In Other Tests:** Just assert `idempotencyCache.acquireLock()` and `idempotencyCache.checkAndSet()` are called with correct parameters.

---

### 2. Circuit Breaker Contract (`notification-circuit-breaker.service.spec.ts`)

**Priority: MEDIUM**  
**Approach:** Test the service deeply once, then in other tests just assert it's called correctly.

#### Test Cases:

##### executeWithCircuitBreaker()

- ✅ Executes function in CLOSED state
- ✅ Opens circuit after failure threshold
- ✅ Half-opens circuit after timeout
- ✅ Rejects in OPEN state
- ✅ Tracks failure count
- ✅ Resets on success
- ✅ Handles concurrent executions

##### State Transitions

- ✅ CLOSED -> OPEN on threshold
- ✅ OPEN -> HALF_OPEN after timeout
- ✅ HALF_OPEN -> CLOSED on success
- ✅ HALF_OPEN -> OPEN on failure
- ✅ Prevents state oscillation

##### Sliding Window

- ✅ Tracks failures in time window
- ✅ Expires old failures
- ✅ Resets window on success

**In Other Tests:** Just assert `circuitBreaker.executeWithCircuitBreaker()` is called with correct channel and function.

---

### 3. Channel Selection Contract (`channel-selection.service.spec.ts`)

**Priority: MEDIUM**

#### Test Cases:

##### selectOptimalChannels()

- ✅ Returns channels based on user activity
- ✅ Prefers active channels
- ✅ Filters out inactive channels
- ✅ Returns all channels if user has no activity
- ✅ Handles missing user
- ✅ Caches activity data
- ✅ Clears cache on module destroy

##### Activity Tracking

- ✅ Tracks EMAIL activity
- ✅ Tracks SMS activity
- ✅ Tracks WHATSAPP activity
- ✅ Tracks IN_APP activity
- ✅ Uses updatedAt for activity calculation
- ✅ Handles missing updatedAt

---

### 4. Rate Limit Contract (`channel-rate-limit.service.spec.ts`)

**Priority: MEDIUM**

#### Test Cases:

##### checkRateLimit()

- ✅ Allows requests within limit
- ✅ Blocks requests over limit
- ✅ Resets window correctly
- ✅ Handles per-channel limits
- ✅ Handles per-user limits
- ✅ Handles concurrent requests

---

## Adapter Tests (Integration-Style)

Adapters are tested separately as integration-style tests, focusing on their interaction with external services.

### 1. EmailAdapter (`email.adapter.spec.ts`)

**Priority: HIGH**

#### Test Cases:

##### send()

- ✅ Calls nodemailer.sendMail() with correct params
- ✅ Uses correct from address
- ✅ Uses correct to address
- ✅ Uses correct subject
- ✅ Uses correct HTML content
- ✅ Handles timeout
- ✅ Handles SMTP errors
- ✅ Handles network errors
- ✅ Logs send attempts

##### Mock Setup

```typescript
// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => mockTransporter),
}));
```

---

### 2. SmsAdapter (`sms.adapter.spec.ts`)

**Priority: HIGH**

#### Test Cases:

##### send()

- ✅ Calls Twilio messages.create() with correct params
- ✅ Uses correct from number
- ✅ Uses correct to number
- ✅ Uses correct message body
- ✅ Handles timeout
- ✅ Handles Twilio API errors
- ✅ Handles network errors
- ✅ Logs send attempts
- ✅ Tracks metrics on success
- ✅ Tracks metrics on failure

##### Configuration

- ✅ Initializes Twilio client on module init
- ✅ Validates configuration in production
- ✅ Logs warning if not configured
- ✅ Returns early if not configured (logs only)

##### Mock Setup

```typescript
// Mock Twilio
jest.mock('twilio', () => {
  return jest.fn(() => ({
    messages: {
      create: jest.fn(),
    },
  }));
});
```

---

### 3. WhatsAppAdapter (`whatsapp.adapter.spec.ts`)

**Priority: HIGH**

#### Test Cases:

##### send()

- ✅ Uses Meta provider if configured
- ✅ Falls back to Twilio provider
- ✅ Calls provider.sendMessage() with correct params
- ✅ Handles timeout
- ✅ Handles provider errors
- ✅ Logs provider name
- ✅ Tracks metrics

##### Provider Selection

- ✅ Prefers Meta over Twilio
- ✅ Falls back to Twilio if Meta not configured
- ✅ Logs warning if no provider configured
- ✅ Returns early if not configured

##### Mock Setup

```typescript
// Mock providers
const mockTwilioProvider = {
  sendMessage: jest.fn(),
  isConfigured: jest.fn(),
  getProviderName: jest.fn(),
};

const mockMetaProvider = {
  sendMessage: jest.fn(),
  isConfigured: jest.fn(),
  getProviderName: jest.fn(),
};
```

---

### 4. InAppAdapter (`in-app.adapter.spec.ts`)

**Priority: MEDIUM**

#### Test Cases:

##### send()

- ✅ Creates notification entity
- ✅ Saves to database
- ✅ Emits WebSocket event
- ✅ Handles database errors
- ✅ Handles WebSocket errors
- ✅ Handles missing userId

---

## Performance & Load Simulation

### Load Simulation Utility (`test/notifications/load-simulation.ts`)

```typescript
import { RecipientInfo } from '@/modules/notifications/types/recipient-info.interface';
import { faker } from '@faker-js/faker';

export interface LoadSimulationOptions {
  recipientCount: number;
  includeErrors?: boolean;
  errorRate?: number; // 0-1
}

export function generateFakeRecipients(
  count: number,
  options?: { includeErrors?: boolean; errorRate?: number },
): RecipientInfo[] {
  const recipients: RecipientInfo[] = [];

  for (let i = 0; i < count; i++) {
    const shouldError =
      options?.includeErrors && Math.random() < (options.errorRate || 0.1);

    recipients.push({
      userId: `user-${i}`,
      email:
        shouldError && Math.random() < 0.5
          ? 'invalid-email'
          : faker.internet.email(),
      phone:
        shouldError && Math.random() < 0.5
          ? 'invalid-phone'
          : faker.phone.number('+1##########'),
      locale: i % 2 === 0 ? 'en' : 'ar',
      centerId: `center-${i % 10}`,
      profileType: i % 3 === 0 ? 'ADMIN' : 'STAFF',
      profileId: `profile-${i}`,
    });
  }

  return recipients;
}

export async function simulateLoad(
  triggerFn: (recipients: RecipientInfo[]) => Promise<any>,
  options: LoadSimulationOptions,
): Promise<{ duration: number; result: any }> {
  const recipients = generateFakeRecipients(options.recipientCount, {
    includeErrors: options.includeErrors,
    errorRate: options.errorRate,
  });

  const startTime = Date.now();
  const result = await triggerFn(recipients);
  const duration = Date.now() - startTime;

  return { duration, result };
}
```

### Load Simulation Test Suite (`load-simulation.spec.ts`)

**Priority: HIGH**

#### Test Cases:

##### Small Batch (10-50 recipients)

- ✅ Processes 10 recipients efficiently
- ✅ Processes 50 recipients efficiently
- ✅ Measures duration
- ✅ Verifies all recipients processed
- ✅ Verifies no duplicate sends

##### Medium Batch (100-500 recipients)

- ✅ Processes 100 recipients efficiently
- ✅ Processes 500 recipients efficiently
- ✅ Verifies template rendering optimization (groups by hash)
- ✅ Verifies bulk enqueueing (single Redis round-trip)
- ✅ Verifies concurrency limit respected

##### Large Batch (1000+ recipients)

- ✅ Processes 1000 recipients efficiently
- ✅ Processes 2000 recipients efficiently
- ✅ Measures performance (duration should be < 30s for 1000)
- ✅ Verifies all recipients processed
- ✅ Verifies no duplicate sends
- ✅ Verifies memory usage stays reasonable

##### Error Handling Under Load

- ✅ Handles 10% error rate gracefully
- ✅ Continues processing on errors
- ✅ Collects all errors correctly
- ✅ Tracks failed count correctly

##### Concurrency Under Load

- ✅ Respects concurrency limit under load
- ✅ Processes recipients in parallel (within limit)
- ✅ Queues excess recipients correctly

---

## Template Snapshot Tests

### Snapshot Test Suite (`template-snapshots.spec.ts`)

**Priority: HIGH**

Use Jest snapshots to prevent regressions in template formatting and avoid brittle string comparisons.

#### Test Cases:

##### Email Templates

- ✅ `welcome_email_en` - Welcome email in English
- ✅ `welcome_email_ar` - Welcome email in Arabic
- ✅ `password_reset_email_en` - Password reset email in English
- ✅ `otp_email_en` - OTP email in English

##### SMS Templates

- ✅ `welcome_sms_en` - Welcome SMS in English
- ✅ `welcome_sms_ar` - Welcome SMS in Arabic
- ✅ `otp_sms_en` - OTP SMS in English

##### WhatsApp Templates

- ✅ `welcome_whatsapp_en` - Welcome WhatsApp in English
- ✅ `welcome_whatsapp_ar` - Welcome WhatsApp in Arabic

##### IN_APP Templates

- ✅ `notification_inapp_en` - In-app notification in English
- ✅ `notification_inapp_ar` - In-app notification in Arabic

#### Example:

```typescript
describe('Template Snapshots', () => {
  it('should render welcome email template correctly', async () => {
    const rendered = await renderer.render(
      NotificationType.USER_CREATED,
      NotificationChannel.EMAIL,
      { userId: 'user-123', email: 'test@example.com', name: 'Test User' },
      'en',
    );

    expect(rendered.content).toMatchSnapshot('welcome_email_en');
    expect(rendered.subject).toMatchSnapshot('welcome_email_subject_en');
  });
});
```

**Benefits:**

- ✅ Prevents formatting regressions
- ✅ Easy to review template changes
- ✅ No brittle string comparisons
- ✅ Catches whitespace/HTML changes

---

## Schema Validation Tests

### Config Schema Validation (`config-validation.spec.ts`)

**Priority: MEDIUM**

Test that environment variables are validated correctly using Envalid/cleanEnv.

#### Test Cases:

##### Required Variables

- ✅ Validates EMAIL config (host, port, user, pass)
- ✅ Validates TWILIO config (accountSid, authToken, phoneNumber)
- ✅ Validates REDIS config (host, port, password)
- ✅ Validates DATABASE config (host, port, username, password, database)

##### Type Validation

- ✅ Validates port is number
- ✅ Validates boolean flags
- ✅ Validates URL formats
- ✅ Validates enum values

##### Default Values

- ✅ Uses correct defaults for optional variables
- ✅ Handles missing optional variables

#### Example:

```typescript
describe('Config Validation', () => {
  it('should validate email configuration', () => {
    const validEnv = {
      EMAIL_HOST: 'smtp.gmail.com',
      EMAIL_PORT: '587',
      EMAIL_USER: 'test@example.com',
      EMAIL_PASS: 'password123',
    };

    expect(() => cleanEnv(validEnv, emailSchema)).not.toThrow();
  });

  it('should throw on invalid email port', () => {
    const invalidEnv = {
      EMAIL_HOST: 'smtp.gmail.com',
      EMAIL_PORT: 'invalid',
      EMAIL_USER: 'test@example.com',
      EMAIL_PASS: 'password123',
    };

    expect(() => cleanEnv(invalidEnv, emailSchema)).toThrow();
  });
});
```

**Benefits:**

- ✅ Catches config errors at test time
- ✅ Prevents runtime adapter initialization failures
- ✅ Documents required environment variables

---

## Smoke Flow Integration Test

### End-to-End Mocked Test (`smoke-flow.spec.ts`)

**Priority: CRITICAL**

A single end-to-end (mocked) test that validates the entire notification flow from trigger to adapter calls.

#### Test Case:

##### Complete Flow

- ✅ Triggers event (e.g., `center.created`)
- ✅ Verifies all expected calls to adapters happened once
- ✅ Verifies notification logs created
- ✅ Verifies queue jobs enqueued (using FakeQueue inspection)
- ✅ Verifies no duplicate sends (using FakeQueue + idempotency assertions)
- ✅ Verifies metrics tracked
- ✅ Verifies correlation ID propagated

#### Example:

```typescript
describe('Smoke Flow', () => {
  it('should complete full notification flow', async () => {
    const fakeQueue = new FakeQueue();
    const fakeRedis = new FakeRedis();
    const mockEmailAdapter = createMockEmailAdapter();
    const mockSmsAdapter = createMockSmsAdapter();

    // Setup services with fakes/mocks
    const notificationService = createNotificationService({
      queue: fakeQueue,
      redis: fakeRedis,
      emailAdapter: mockEmailAdapter,
      smsAdapter: mockSmsAdapter,
    });

    // Trigger notification
    const result = await notificationService.trigger(
      NotificationType.CENTER_CREATED,
      {
        audience: 'admin',
        event: { centerId: 'center-123', name: 'Test Center' },
        recipients: [
          {
            userId: 'user-1',
            email: 'admin@example.com',
            phone: '+1234567890',
          },
        ],
      },
    );

    // Assertions
    expect(result.sent).toBe(2); // EMAIL + SMS
    expect(result.failed).toBe(0);
    expect(mockEmailAdapter.send).toHaveBeenCalledTimes(1);
    expect(mockSmsAdapter.send).toHaveBeenCalledTimes(1);
    expect(fakeQueue.getJobCount()).toBe(0); // IN_APP sent directly, others enqueued
    expect(fakeRedis.getValue('idempotency:correlation-id:...')).toBeDefined();
  });
});
```

**Benefits:**

- ✅ Validates contract between all components
- ✅ Catches integration bugs early
- ✅ Fast execution (all mocked)
- ✅ Easy to understand full flow

---

## Property-Based Tests

### Future-Proof Testing with fast-check

For template rendering and recipient validation, we can add property-based testing to catch edge bugs we didn't anticipate.

#### Setup (Future Enhancement)

```typescript
import * as fc from 'fast-check';

describe('Recipient Validation - Property Based', () => {
  it('should validate or reject any email format', () => {
    fc.assert(
      fc.property(fc.string(), (email) => {
        const result = validateEmail(email);
        // Either valid or throws error
        return typeof result === 'boolean';
      }),
    );
  });

  it('should render template with any valid data', () => {
    fc.assert(
      fc.property(
        fc.record({
          userId: fc.string(),
          email: fc.emailAddress(),
          phone: fc.string({ minLength: 10, maxLength: 15 }),
          locale: fc.constantFrom('en', 'ar'),
        }),
        async (data) => {
          const rendered = await renderer.render(
            NotificationType.USER_CREATED,
            NotificationChannel.EMAIL,
            data,
            data.locale,
          );
          return rendered.content.length > 0;
        },
      ),
    );
  });
});
```

**Benefits:**

- ✅ Catches edge bugs we didn't anticipate
- ✅ Tests with random valid/invalid inputs
- ✅ Great for validation and rendering logic

**Note:** This is a future enhancement, not required for initial implementation.

---

## CI Optimization

### Test Execution Configuration

#### Parallel vs Sequential Execution

```json
// jest.config.js
module.exports = {
  // ... other config
  testMatch: ['**/*.spec.ts'],

  // Run Redis/Queue tests sequentially (not parallel-safe)
  testSequencer: './test-sequencer.js',

  // Force exit to ensure clean teardown
  forceExit: true,
  detectOpenHandles: true,
};
```

#### Test Sequencer (`test-sequencer.js`)

```javascript
const Sequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends Sequencer {
  sort(tests) {
    // Run Redis/Queue tests sequentially
    const redisQueueTests = tests.filter(
      (test) => test.path.includes('redis') || test.path.includes('queue'),
    );
    const otherTests = tests.filter(
      (test) => !test.path.includes('redis') && !test.path.includes('queue'),
    );

    return [...otherTests, ...redisQueueTests];
  }
}

module.exports = CustomSequencer;
```

#### CI Scripts

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:notifications": "jest --testPathPattern=notifications",
    "test:notifications:sequential": "jest --testPathPattern=notifications --runInBand",
    "test:ci": "jest --detectOpenHandles --forceExit --coverage"
  }
}
```

**Benefits:**

- ✅ Prevents race conditions in Redis/Queue tests
- ✅ Faster execution for other tests (parallel)
- ✅ Clean teardown of connections
- ✅ Prevents hanging test processes

---

## Test Execution Strategy

### Test Organization

```
src/modules/notifications/
├── services/
│   ├── trigger-flow.spec.ts              # Combined: Service + Pipeline + Router
│   ├── notification-sender.service.spec.ts
│   ├── notification-template.service.spec.ts
│   ├── notification-renderer.service.spec.ts
│   └── ...
├── contracts/
│   ├── notification-idempotency-cache.service.spec.ts
│   ├── notification-circuit-breaker.service.spec.ts
│   ├── channel-selection.service.spec.ts
│   └── channel-rate-limit.service.spec.ts
├── adapters/
│   ├── email.adapter.spec.ts
│   ├── sms.adapter.spec.ts
│   ├── whatsapp.adapter.spec.ts
│   └── in-app.adapter.spec.ts
├── processors/
│   └── notification.processor.spec.ts
├── integration/
│   ├── smoke-flow.spec.ts
│   ├── batch-processing.spec.ts
│   ├── template-rendering.spec.ts
│   ├── template-snapshots.spec.ts
│   ├── load-simulation.spec.ts
│   └── edge-cases.spec.ts
├── config/
│   └── config-validation.spec.ts
└── test/
    ├── fakes/
    │   ├── fake-queue.ts
    │   ├── fake-redis.ts
    │   └── fake-redis-client.ts
    ├── helpers/
    │   └── test-helpers.ts
    ├── load-simulation.ts
    └── fixtures/
        ├── manifests.fixture.ts
        └── ...
```

### Test Execution Commands

```bash
# Run all notification tests
npm test -- notifications

# Run trigger flow tests (fast feedback)
npm test -- trigger-flow.spec.ts

# Run adapter tests (integration-style)
npm test -- adapters/

# Run contract tests (deep logic)
npm test -- contracts/

# Run load simulation tests
npm test -- load-simulation.spec.ts

# Run with coverage
npm test -- --coverage notifications

# Run in watch mode
npm test -- --watch notifications

# Run specific test case
npm test -- -t "should send email notification"

# Run in CI mode (sequential + force exit)
npm run test:ci -- notifications
```

### Coverage Goals

- **Critical Services:** >90% (Trigger Flow, Sender, Processor)
- **Contract Tests:** >95% (Idempotency, Circuit Breaker)
- **Adapters:** >90% (Email, SMS, WhatsApp, InApp)
- **Supporting Services:** >85% (Template, Renderer, Selection)
- **Utilities:** >85% (Validators, Type Guards, Extractors)

### Continuous Integration

- Run all tests on every PR
- Require >80% coverage for new code
- Fail build on test failures
- Generate coverage reports
- Run Redis/Queue tests sequentially
- Use `--detectOpenHandles --forceExit` in CI

---

## Implementation Priority

### Phase 1: Infrastructure & Critical Path (Week 1)

1. ✅ Create FakeQueue and FakeRedis
2. ✅ Create test helpers and fixtures
3. ✅ Implement trigger-flow.spec.ts (combined Service + Pipeline + Router)
4. ✅ Implement notification-sender.service.spec.ts
5. ✅ Implement notification.processor.spec.ts

### Phase 2: Contracts & Adapters (Week 2)

1. ✅ Implement contract tests (Idempotency, Circuit Breaker)
2. ✅ Implement adapter tests (Email, SMS, WhatsApp)
3. ✅ Implement template and renderer tests

### Phase 3: Integration & Performance (Week 3)

1. ✅ Implement smoke-flow.spec.ts
2. ✅ Implement load-simulation.spec.ts
3. ✅ Implement template-snapshots.spec.ts
4. ✅ Implement batch-processing.spec.ts

### Phase 4: Edge Cases & Validation (Week 4)

1. ✅ Implement edge-cases.spec.ts
2. ✅ Implement config-validation.spec.ts
3. ✅ Add property-based tests (optional, future enhancement)
4. ✅ Achieve >80% coverage

---

## Expected Bug Discoveries

Based on the comprehensive test plan, we expect to discover:

1. **Template Rendering Issues:**
   - Missing variable handling
   - Locale fallback logic
   - Channel-specific template selection
   - Snapshot mismatches (formatting regressions)

2. **Batch Processing Issues:**
   - Template data hashing collisions
   - Cache key generation bugs
   - Concurrency limit violations
   - Performance bottlenecks at scale

3. **Idempotency Issues:**
   - Lock release timing
   - Race conditions
   - Cache key collisions

4. **Error Handling Issues:**
   - Missing error context
   - Incorrect error propagation
   - Transaction rollback issues

5. **Type Safety Issues:**
   - Type narrowing problems
   - Discriminated union handling
   - Optional field handling

6. **Config Issues:**
   - Missing environment variables
   - Incorrect type validation
   - Missing defaults

---

## Notes

- All mocks should be reset between tests
- Use `beforeEach()` for test setup
- Use `afterEach()` for cleanup (especially FakeQueue/FakeRedis.clear())
- Use factories for test data generation
- Keep tests isolated (no shared state)
- Use descriptive test names
- Group related tests with `describe()` blocks
- Use `it.each()` for parameterized tests where applicable
- Use FakeQueue/FakeRedis for state inspection
- Assert contract service calls, don't re-test their logic
- Use snapshots for template rendering
- Run Redis/Queue tests sequentially

---

## Next Steps

1. ✅ Review and approve this plan
2. Create test infrastructure (FakeQueue, FakeRedis, helpers, fixtures)
3. Implement Phase 1 tests (Infrastructure & Critical Path)
4. Run tests and fix discovered bugs
5. Continue with remaining phases
6. Achieve >80% coverage
7. Document any discovered bugs and fixes
8. Add property-based tests (optional, future enhancement)
