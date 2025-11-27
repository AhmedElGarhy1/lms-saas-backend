# Notification Module - Technical Summary & Analysis

**Date:** 2024  
**Audience:** Engineering Team  
**Purpose:** Internal documentation of current notification module capabilities, architecture, and trade-offs

---

## Executive Summary

The Notification Module is a **production-grade, event-driven notification system** built on NestJS that supports multiple delivery channels (Email, SMS, WhatsApp, In-App, Push) with enterprise features including circuit breakers, idempotency, rate limiting, retry strategies, and comprehensive observability.

**Current Status:** ✅ Production-ready with 34+ test files and comprehensive error handling

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Supported Channels](#supported-channels)
3. [Core Features](#core-features)
4. [Internal Architecture Details](#internal-architecture-details)
5. [Data Flow & Processing](#data-flow--processing)
6. [Advanced Features](#advanced-features)
7. [Performance Characteristics](#performance-characteristics)
8. [Pros & Cons](#pros--cons)
9. [Configuration & Limits](#configuration--limits)
10. [Testing & Quality](#testing--quality)
11. [Known Limitations](#known-limitations)
12. [Future Considerations](#future-considerations)

---

## Architecture Overview

### High-Level Flow

```
Domain Event Emission
    ↓
NotificationListener (@OnEvent handlers)
    ↓
NotificationService (Orchestrator)
    ├─> Validates & Deduplicates Recipients
    ├─> Groups Recipients by Template Data (for bulk optimization)
    ├─> Pre-renders Templates (for bulk groups)
    └─> Processes Recipients (with concurrency control)
        ↓
NotificationPipelineService
    ├─> Extracts Event Data
    ├─> Determines Enabled Channels (from manifest)
    ├─> Selects Optimal Channels (dynamic based on user activity)
    └─> Prepares Template Data
        ↓
NotificationRouterService
    ├─> Validates Recipient (per-channel)
    ├─> Checks Rate Limit (FIRST - prevents resource waste)
    ├─> Checks Idempotency (prevents duplicates)
    ├─> Renders Template (or uses pre-rendered cache)
    ├─> Builds Channel-Specific Payload
    └─> Enqueues to BullMQ (or sends IN_APP directly)
        ↓
BullMQ Queue (for EMAIL, SMS, WhatsApp, PUSH)
    ↓
NotificationProcessor (Worker)
    ├─> Applies Retry Strategy
    ├─> Sends via NotificationSenderService
    └─> Logs Results
        ↓
NotificationSenderService
    ├─> Checks Circuit Breaker
    ├─> Routes to Channel Adapter
    ├─> Records Metrics
    └─> Handles Errors
        ↓
Channel Adapters (EmailAdapter, SmsAdapter, WhatsAppAdapter, InAppAdapter)
    ↓
External Providers (SendGrid, Twilio, Meta) or WebSocket Gateway
```

### Key Architectural Decisions

1. **Event-Driven**: Decoupled via NestJS EventEmitter - domain modules emit events, notification system handles them
2. **Queue-Based**: BullMQ for async processing (except IN_APP which is real-time)
3. **Manifest-Based Configuration**: Type-safe notification definitions with multi-audience support
4. **Pipeline Architecture**: Clear separation of concerns with dedicated services for each step
5. **Fail-Open Strategy**: System continues working even if some components fail (e.g., idempotency cache)

---

## Supported Channels

| Channel | Status | Provider | Rate Limit | Retry Strategy | Timeout | Special Notes |
|---------|--------|----------|------------|----------------|---------|---------------|
| **EMAIL** | ✅ Active | SendGrid | 50/min | 3 attempts, exponential backoff (2s base) | 30s | HTML/text support |
| **SMS** | ✅ Active | Twilio | 20/min | 2 attempts, exponential backoff (3s base) | 30s | E.164 phone validation |
| **WHATSAPP** | ✅ Active | Twilio/Meta | 30/min | 2 attempts, exponential backoff (3s base) | 45s | Multi-provider support |
| **IN_APP** | ✅ Active | WebSocket (Socket.IO) | 100/min | 3 attempts, exponential backoff | 10s | **Direct send** (not queued), real-time delivery |
| **PUSH** | 🔄 Reserved | FCM (Future) | 80/min | 4 attempts, exponential backoff | 20s | Infrastructure ready, implementation pending |

### Channel Selection Logic

Channels are selected dynamically based on:

1. **Manifest Configuration**: Each notification type defines available channels per audience
2. **User Activity**: Inactive users (24h threshold) prefer external channels (EMAIL, SMS, WhatsApp) over IN_APP
3. **Event Priority**: Critical events (priority >= 8) ensure at least one external channel exists
4. **Requested Channels**: Can be overridden via `channels` parameter in `trigger()` method

**Example:**
- Active user + priority 5 → IN_APP + EMAIL
- Inactive user + priority 5 → EMAIL only (IN_APP removed)
- Any user + priority 9 → IN_APP + EMAIL + SMS (ensures external channel)

---

## Core Features

### 1. Multi-Channel Support
- ✅ Email (SendGrid)
- ✅ SMS (Twilio)
- ✅ WhatsApp (Twilio/Meta Business API)
- ✅ In-App (WebSocket via Socket.IO)
- 🔄 Push (FCM - reserved for future)

### 2. Event-Driven Architecture
- Listens to domain events via `@OnEvent()` decorators
- Automatic notification triggering on events
- No direct service calls needed from domain modules

### 3. Manifest System
- Type-safe notification definitions
- Multi-audience support (OWNER, ADMIN, DEFAULT, etc.)
- Channel-specific templates
- Required variables validation per channel
- Priority levels (0-10)

### 4. Template System
- **Engine**: Handlebars
- **i18n Support**: Locale-based templates (en, ar)
- **Caching**: 3-level caching strategy
  - Level 1: In-memory compiled templates (Map, 100 templates, FIFO)
  - Level 2: Redis template source cache (1 hour TTL)
  - Level 3: Filesystem (source of truth)
- **Pre-rendering**: Bulk groups pre-render templates once for optimization

### 5. Rate Limiting
- **Per-Channel**: Different limits per channel (cost-based)
- **Per-User**: Limits notifications per user per minute
- **Algorithm**: Sliding window using Redis sorted sets
- **Fail-Open**: If rate limiter fails, notifications proceed (logged)

### 6. Retry Logic
- **Channel-Specific**: Different retry strategies per channel
- **Exponential Backoff**: Configurable base delay
- **Max Attempts**: Configurable per channel (2-4 attempts)
- **BullMQ Integration**: Automatic retry via queue

### 7. Circuit Breakers
- **Per-Channel**: Separate circuit breaker per channel
- **Sliding Window**: Tracks failures within time window (prevents false positives)
- **States**: CLOSED → OPEN → HALF_OPEN → CLOSED
- **Threshold**: 5 failures in 60-second window opens circuit
- **Reset**: 60-second timeout before attempting recovery

### 8. Idempotency
- **Distributed Locks**: Redis-based locks prevent duplicate sends
- **Lock TTL**: 30 seconds
- **Cache TTL**: 5 minutes
- **Fail-Open**: If idempotency check fails, notification proceeds (best-effort)

### 9. Dead Letter Queue (DLQ)
- **Storage**: `notification_logs` table with `FAILED` status
- **Retention**: 90 days (configurable)
- **Cleanup**: Daily cron job at 2 AM
- **Health Monitoring**: Tracks last cleanup run, detects stalling

### 10. Observability
- **Metrics**: Success/failure counts, retry counts, latency per channel
- **Structured Logging**: Correlation IDs, context, error details
- **Audit Trails**: All notifications logged to `notification_logs` table
- **Health Checks**: Circuit breaker state, DLQ health, queue backlog

### 11. Batch Processing
- **Concurrency Control**: Multiple levels
  - Recipient processing: 10 concurrent recipients (default)
  - Queue processing: 5 concurrent jobs (default)
  - Send multiple: 5 concurrent sends (default)
- **Bulk Optimization**: Pre-renders templates for groups with same template data
- **Result Aggregation**: Returns bulk processing results with success/failure counts

### 12. Profile-Scoped Notifications
- **Role-Based**: Different channels per profile type (Admin, Staff, Teacher, Parent, Student)
- **Profile Context**: Notifications include `profileId` and `profileType`
- **Filtering**: Can filter notifications by profile in queries

---

## Internal Architecture Details

### Core Services

#### 1. NotificationService
- **Purpose**: Main orchestrator
- **Key Methods**:
  - `trigger()`: Entry point for notification processing
  - `processEventForRecipient()`: Processes single recipient
  - `groupRecipientsByTemplateData()`: Groups recipients for bulk optimization
  - `preRenderTemplatesForGroup()`: Pre-renders templates for bulk groups
- **Responsibilities**:
  - Validates and deduplicates recipients
  - Groups recipients by template data hash
  - Pre-renders templates for bulk groups
  - Processes recipients with concurrency control

#### 2. NotificationPipelineService
- **Purpose**: Processes notifications through pipeline steps
- **Key Methods**:
  - `process()`: Executes pipeline steps
- **Pipeline Steps**:
  1. Extract event data
  2. Determine enabled channels (from manifest)
  3. Select optimal channels (dynamic)
  4. Prepare template data

#### 3. NotificationRouterService
- **Purpose**: Routes notifications to channels
- **Key Methods**:
  - `route()`: Routes notification to channels
- **Execution Order** (CRITICAL):
  1. Validate recipient (per-channel)
  2. **Check rate limit (FIRST)** - prevents resource waste
  3. Check idempotency
  4. Render template (or use pre-rendered cache)
  5. Build payload
  6. Enqueue or send

#### 4. NotificationProcessor
- **Purpose**: BullMQ worker that processes queued jobs
- **Concurrency**: 5 concurrent jobs (configurable)
- **Responsibilities**:
  - Processes jobs from BullMQ queue
  - Applies channel-specific retry strategies
  - Sends via NotificationSenderService
  - Logs results to database
  - Handles failures and retries

#### 5. NotificationSenderService
- **Purpose**: Sends notifications via channel adapters
- **Key Methods**:
  - `send()`: Sends single notification
  - `sendMultiple()`: Sends multiple notifications with concurrency control
- **Responsibilities**:
  - Routes payloads to channel-specific adapters
  - Applies circuit breakers (per-channel)
  - Handles retries with exponential backoff
  - Records metrics

### Supporting Services

- **ChannelSelectionService**: Dynamic channel selection based on user activity
- **ChannelRateLimitService**: Per-channel rate limiting with sliding window
- **ChannelRetryStrategyService**: Channel-specific retry configurations
- **NotificationMetricsService**: Tracks metrics (success/failure/latency)
- **NotificationIdempotencyCacheService**: Prevents duplicate sends
- **NotificationCircuitBreakerService**: Circuit breaker with sliding window
- **NotificationRenderer**: Renders templates using manifests
- **NotificationManifestResolver**: Resolves manifests for notification types
- **RecipientValidationService**: Validates recipients per channel
- **PayloadBuilderService**: Builds channel-specific payloads
- **MultiRecipientProcessor**: Processes recipients with concurrency control

### Adapters

- **EmailAdapter**: SendGrid integration
- **SmsAdapter**: Twilio SMS integration
- **WhatsAppAdapter**: Twilio/Meta WhatsApp integration
- **InAppAdapter**: WebSocket delivery via NotificationGateway
- **PushAdapter**: Reserved for future FCM implementation

---

## Data Flow & Processing

### Event Processing Flow

1. **Event Emission**: Domain service emits event via `EventEmitter2`
2. **Listener Receives**: `NotificationListener` receives event via `@OnEvent()`
3. **Validation**: Validates event data against manifest requirements
4. **Recipient Resolution**: Resolves recipients from event data
5. **Service Trigger**: Calls `NotificationService.trigger()`
6. **Recipient Processing**:
   - Validates recipients
   - Deduplicates by userId
   - Groups by template data hash
   - Pre-renders templates for bulk groups
7. **Pipeline Processing** (per recipient):
   - Extracts event data
   - Determines enabled channels
   - Selects optimal channels
   - Prepares template data
8. **Routing** (per channel):
   - Validates recipient
   - Checks rate limit
   - Checks idempotency
   - Renders template (or uses cache)
   - Builds payload
   - Enqueues or sends
9. **Queue Processing** (for async channels):
   - BullMQ worker processes job
   - Applies retry strategy
   - Sends via adapter
   - Logs result
10. **Delivery**: Channel adapter sends to provider

### Database Entities

#### Notification Entity
- **Table**: `notifications`
- **Purpose**: Stores IN_APP notifications
- **Key Fields**:
  - `userId`, `title`, `message`, `type`, `channel`, `status`
  - `readAt`, `isArchived`, `expiresAt`
  - `profileType`, `profileId` (for profile-scoped notifications)
- **Indexes**: `userId + readAt`, `userId + createdAt`, `userId + profileType + profileId`

#### NotificationLog Entity
- **Table**: `notification_logs`
- **Purpose**: Audit trail for all notifications (EMAIL, SMS, WhatsApp, PUSH)
- **Key Fields**:
  - `type`, `channel`, `status`, `recipient`
  - `userId`, `centerId`, `profileType`, `profileId`
  - `error`, `retryCount`, `lastAttemptAt`, `jobId`
- **Indexes**: Multiple indexes for efficient querying, including composite index for DLQ cleanup

---

## Advanced Features

### 1. Circuit Breaker with Sliding Window

**Problem**: Traditional circuit breakers can have false positives (opening circuit due to temporary spikes).

**Solution**: Sliding window algorithm using Redis ZSET:
- Tracks failures within time window (60 seconds)
- Counts failures in window, not total failures
- Prevents false positives from temporary spikes

**Implementation**:
- Redis ZSET stores failure timestamps
- Window cleanup removes old failures
- State machine: CLOSED → OPEN → HALF_OPEN → CLOSED

### 2. Idempotency with Distributed Locks

**Problem**: Prevent duplicate notifications in distributed system.

**Solution**: Redis-based distributed locks:
- Lock key: `lock:{correlationId}:{type}:{channel}:{recipient}`
- Lock TTL: 30 seconds
- Fail-open: If lock acquisition fails, notification proceeds (best-effort)

**Implementation**:
- Uses Redis `SET key value EX ttl NX` for atomic lock acquisition
- Lock timeout: 100ms (prevents blocking)
- Cache TTL: 5 minutes (prevents duplicate sends within window)

### 3. Template Pre-Rendering for Bulk Groups

**Problem**: Rendering templates for each recipient is expensive.

**Solution**: Pre-render templates for groups with same template data:
- Groups recipients by template data hash
- Pre-renders once per group
- Reuses rendered content for all recipients in group

**Performance Impact**:
- Single recipient: ~5-10ms per recipient (with caching)
- Bulk group (100 recipients): ~5-10ms for first, ~0.1ms for subsequent (cache hit)

### 4. Dynamic Channel Selection

**Problem**: Not all users are active, so IN_APP notifications may be missed.

**Solution**: Dynamic channel selection based on user activity:
- Checks last activity timestamp
- Inactive users (24h threshold): Prefer external channels
- Critical events (priority >= 8): Ensure external channel exists

**Implementation**:
- `ChannelSelectionService.isUserActive()` checks last activity
- Removes IN_APP for inactive users if external channel available
- Adds SMS for critical events if no external channel

### 5. Multi-Level Template Caching

**Problem**: Template compilation is expensive.

**Solution**: 3-level caching strategy:
1. **In-Memory**: Compiled Handlebars templates (Map, 100 templates, FIFO)
2. **Redis**: Template source cache (1 hour TTL)
3. **Filesystem**: Source of truth

**Performance**:
- Level 1 hit: ~0.1ms
- Level 2 hit: ~1-5ms (network latency)
- Level 3 (filesystem): ~5-10ms

### 6. Graceful Degradation

**Strategy**: Fail-open for non-critical components:
- **Idempotency**: If Redis fails, notifications proceed (best-effort duplicate prevention)
- **Rate Limiting**: If Redis fails, notifications proceed (logged)
- **Template Cache**: If Redis fails, loads from filesystem

**Critical Components** (fail-closed):
- Database: Required for notification storage
- BullMQ: Required for async processing
- External Providers: Required for delivery

---

## Performance Characteristics

### Resource Consumption

| Stage | CPU Usage | I/O Usage | Bottleneck |
|-------|-----------|-----------|------------|
| **Recipient Processing** | Low | Medium | Database queries |
| **Queue Enqueueing** | Low | Low | Redis writes |
| **Queue Processing** | Medium | High | External API calls |
| **Sending** | Low | Very High | Network latency |

### Concurrency Limits

- **Recipient Processing**: 10 concurrent recipients (default)
- **Queue Processing**: 5 concurrent jobs (default)
- **Send Multiple**: 5 concurrent sends (default)

### Scalability

- **Horizontal Scaling**: ✅ Supported via BullMQ (multiple workers)
- **Vertical Scaling**: ✅ Increase concurrency limits
- **Database**: ✅ Indexed for efficient queries
- **Redis**: ✅ Can use Redis Cluster for high availability

### Performance Optimizations

1. **Template Caching**: Reduces compilation time from ~5ms to ~0.1ms (cache hit)
2. **Pre-Rendering**: Eliminates redundant template rendering for bulk groups
3. **Concurrency Control**: Prevents resource exhaustion while maximizing throughput
4. **Batch Enqueueing**: Groups payloads for bulk enqueue (reduces Redis round-trips)
5. **Circuit Breakers**: Prevents cascading failures and wasted resources

---

## Pros & Cons

### ✅ Pros

1. **Production-Ready**
   - Comprehensive error handling
   - Circuit breakers prevent cascading failures
   - Retry strategies with exponential backoff
   - Dead letter queue for failed notifications
   - Health monitoring and observability

2. **Scalable Architecture**
   - Queue-based processing supports horizontal scaling
   - Redis adapter for Socket.IO enables multi-instance deployment
   - Concurrency control prevents resource exhaustion
   - Batch processing optimizations

3. **Reliable Delivery**
   - Idempotency prevents duplicate sends
   - Retry strategies ensure delivery
   - Circuit breakers prevent wasted resources
   - DLQ captures failed notifications for investigation

4. **Developer Experience**
   - Event-driven: No direct service calls needed
   - Manifest system: Type-safe notification definitions
   - Template system: Handlebars with i18n support
   - Comprehensive documentation

5. **Flexible Configuration**
   - Channel-specific rate limits
   - Channel-specific retry strategies
   - Dynamic channel selection
   - Multi-audience support

6. **Observability**
   - Structured logging with correlation IDs
   - Metrics tracking (success/failure/latency)
   - Audit trails in database
   - Health checks for circuit breakers and DLQ

7. **Test Coverage**
   - 34+ test files
   - Unit, integration, and runtime validation tests
   - Property-based testing
   - Load simulation tests

### ❌ Cons

1. **Complexity**
   - Many services and components (20+ services)
   - Steep learning curve for new developers
   - Requires understanding of event-driven architecture, BullMQ, Redis, WebSocket

2. **Dependencies**
   - Heavy reliance on Redis (circuit breakers, idempotency, rate limiting, template cache, WebSocket adapter)
   - BullMQ requires Redis
   - External providers (SendGrid, Twilio, Meta) - single points of failure

3. **Configuration Overhead**
   - Many configuration options (rate limits, retry strategies, timeouts, etc.)
   - Manifest definitions required for each notification type
   - Template files required for each channel/locale combination

4. **Resource Usage**
   - Redis memory usage (circuit breakers, idempotency, rate limits, template cache)
   - Database storage (notification_logs can grow large)
   - CPU usage during batch processing (template rendering)

5. **Debugging Complexity**
   - Multi-step pipeline makes debugging challenging
   - Correlation IDs required for tracing
   - Errors can occur at multiple points (validation, routing, sending, etc.)

6. **IN_APP Channel Limitations**
   - Direct send (not queued) - no retry via BullMQ
   - Requires active WebSocket connection
   - Rate limiting per user and per socket
   - No persistence if user is offline (unlike other channels)

7. **Template Management**
   - Template files must be created for each channel/locale
   - Template changes require deployment
   - No visual template editor (code-based only)

8. **Limited Push Support**
   - PUSH channel is reserved but not implemented
   - Requires FCM integration (future work)

9. **Error Handling Complexity**
   - Fail-open strategy means some errors are logged but not blocked
   - Idempotency failures are silent (best-effort)
   - Rate limit failures are logged but notifications proceed if limiter fails

10. **Testing Challenges**
    - Requires Redis and database for integration tests
    - External provider mocking required
    - WebSocket testing is complex

---

## Configuration & Limits

### Rate Limits (per minute per user)

- **IN_APP**: 100
- **EMAIL**: 50
- **SMS**: 20
- **WHATSAPP**: 30
- **PUSH**: 80 (reserved)

### Retry Strategies

| Channel | Max Attempts | Backoff Type | Base Delay |
|---------|-------------|--------------|------------|
| EMAIL | 3 | Exponential | 2s |
| SMS | 2 | Exponential | 3s |
| WHATSAPP | 2 | Exponential | 3s |
| PUSH | 4 | Exponential | 2s |
| IN_APP | 3 | Exponential | 100ms |

### Timeouts

- **EMAIL**: 30s
- **SMS**: 30s
- **WHATSAPP**: 45s
- **PUSH**: 20s
- **IN_APP**: 10s

### Circuit Breaker

- **Error Threshold**: 5 failures
- **Window**: 60 seconds
- **Reset Timeout**: 60 seconds

### Idempotency

- **Cache TTL**: 5 minutes
- **Lock TTL**: 30 seconds
- **Lock Timeout**: 100ms

### DLQ

- **Retention**: 90 days
- **Cleanup Schedule**: Daily at 2 AM

### Concurrency

- **Recipient Processing**: 10 concurrent recipients
- **Queue Processing**: 5 concurrent jobs
- **Send Multiple**: 5 concurrent sends

---

## Testing & Quality

### Test Coverage

- **34+ test files** covering:
  - Unit tests (services, adapters, utilities)
  - Integration tests (end-to-end flows)
  - Runtime validation tests
  - Property-based tests
  - Load simulation tests

### Test Types

1. **Unit Tests**: Service logic, adapters, utilities
2. **Integration Tests**: End-to-end notification flows
3. **Runtime Validation**: Manifest validation, template validation
4. **Property-Based Tests**: Fuzz testing for edge cases
5. **Load Simulation**: Performance testing

### Quality Metrics

- ✅ Comprehensive error handling
- ✅ Type safety (TypeScript, Zod validation)
- ✅ Structured logging
- ✅ Health monitoring
- ✅ Audit trails

---

## Known Limitations

1. **PUSH Channel**: Reserved but not implemented (requires FCM integration)
2. **Template Editor**: No visual editor (code-based only)
3. **User Preferences**: No user preference system (all channels enabled by default)
4. **Notification History**: Limited querying capabilities (basic pagination)
5. **Webhook Support**: No webhook notifications for external systems
6. **Scheduled Notifications**: No support for scheduled/delayed notifications
7. **Notification Templates**: No dynamic template generation (must create files)
8. **Multi-Tenancy**: No explicit multi-tenant support (relies on centerId)
9. **Notification Batching**: No batching for external providers (sends individually)
10. **Analytics**: Limited analytics (basic metrics only)

---

## Future Considerations

### Potential Enhancements

1. **PUSH Channel Implementation**: Complete FCM integration
2. **User Preferences**: Allow users to enable/disable channels
3. **Scheduled Notifications**: Support for delayed/scheduled notifications
4. **Webhook Support**: Notify external systems on notification events
5. **Template Editor**: Visual template editor for non-developers
6. **Analytics Dashboard**: Enhanced analytics and reporting
7. **Notification Batching**: Batch sends to external providers (reduce API calls)
8. **Multi-Tenancy**: Explicit multi-tenant support
9. **Notification History**: Enhanced querying and filtering
10. **A/B Testing**: Support for A/B testing different channels/templates

### Technical Debt

1. **Redis Dependency**: Heavy reliance on Redis (consider fallback strategies)
2. **Error Handling**: Some fail-open strategies may hide issues (consider fail-closed for critical paths)
3. **Template Management**: Template changes require deployment (consider dynamic templates)
4. **Testing**: Some tests require external services (consider better mocking)

---

## Conclusion

The Notification Module is a **robust, production-ready system** with comprehensive features for multi-channel notification delivery. It provides excellent reliability, scalability, and observability, but comes with complexity and dependencies that require careful management.

**Key Strengths:**
- Production-grade reliability (circuit breakers, retries, DLQ)
- Scalable architecture (queue-based, horizontal scaling)
- Comprehensive features (multi-channel, rate limiting, idempotency)
- Good observability (metrics, logging, health checks)

**Key Challenges:**
- Complexity (many services, steep learning curve)
- Dependencies (Redis, external providers)
- Configuration overhead (many options, manifests, templates)

**Recommendation:**
- ✅ **Use for production** - System is ready for production use
- ⚠️ **Monitor closely** - Watch Redis usage, DLQ growth, circuit breaker states
- 📚 **Document well** - Ensure team understands architecture and flow
- 🔧 **Plan enhancements** - Consider user preferences, scheduled notifications, PUSH channel

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Maintained By:** Engineering Team


























