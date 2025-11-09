# Refactoring Plan Review & Updates

**Date:** Current Session  
**Purpose:** Comprehensive review of notifications module, tests, and refactoring plan

---

## 📊 Current State Analysis

### Services/Components Inventory (38 Total)

#### ✅ **Has Tests (13)**
1. NotificationService (via trigger-flow.spec.ts)
2. NotificationSenderService ✅
3. NotificationTemplateService ✅
4. NotificationProcessor ✅
5. NotificationRenderer ✅
6. NotificationPipelineService ✅
7. NotificationRouterService ✅
8. NotificationIdempotencyCacheService ✅
9. NotificationCircuitBreakerService ✅
10. EmailAdapter ✅
11. SmsAdapter ✅
12. WhatsAppAdapter ✅
13. InAppAdapter ✅

#### ❌ **Missing Tests (25)**

**Critical Services (High Priority):**
1. **NotificationListener** - Handles all domain events, critical integration point
2. **NotificationManifestResolver** - Core service, resolves manifests for all notifications
3. **NotificationValidator** - Validates manifests on startup, prevents runtime errors
4. **NotificationGateway** - WebSocket gateway for real-time notifications
5. **InAppNotificationService** - Service for in-app notifications (has controller)
6. **ChannelRateLimitService** - Rate limiting per channel
7. **ChannelRetryStrategyService** - Retry strategies per channel
8. **RecipientResolverService** - Recipient resolution logic
9. **ChannelSelectionService** - Optimal channel selection

**Repositories (Medium Priority):**
10. **NotificationLogRepository** - Custom methods: findByUserId, findByCenterId, deleteOldFailedLogs, etc.
11. **NotificationRepository** - Custom methods: findByUserId, markAsRead, archive, etc.

**Supporting Services (Medium Priority):**
12. **MetricsBatchService** - Batch metrics collection
13. **NotificationAlertService** - Alert service for queue backlog
14. **RedisTemplateCacheService** - Template caching with Redis
15. **NotificationMetricsService** - Metrics tracking (tested indirectly, but needs direct tests)

**Observability (Low Priority):**
16. **NotificationTracerService** - Tracing service
17. **PrometheusMetricsService** - Prometheus metrics wrapper

**Config/Jobs (Low Priority):**
18. **TimeoutConfigService** - Provider-specific timeout configuration
19. **NotificationDlqCleanupJob** - Scheduled job for DLQ cleanup
20. **RedisCleanupJob** - Scheduled job for Redis cleanup
21. **TemplateHotReloadService** - Development feature (optional)

**Legacy (Can Remove):**
22. **TemplateCacheService** - Legacy, marked for removal

**Providers (Low Priority - Tested via Adapters):**
23. TwilioWhatsAppProvider
24. MetaWhatsAppProvider

---

## 🔍 Issues Found

### 1. **Missing Critical Tests**

**NotificationListener** - **CRITICAL**
- Handles all domain events (Center, Auth, User events)
- Validates event data before triggering
- Error handling and logging
- **Impact:** High - All event-driven notifications go through this
- **Priority:** HIGH

**NotificationManifestResolver** - **CRITICAL**
- Resolves manifests for all notification types
- Gets audience configurations
- Gets channel configurations
- **Impact:** High - Used by all notification flows
- **Priority:** HIGH

**NotificationValidator** - **HIGH**
- Validates manifests on module init
- Checks template existence
- Validates channel configurations
- **Impact:** High - Prevents runtime errors
- **Priority:** HIGH

**NotificationGateway** - **HIGH**
- WebSocket connections/disconnections
- Real-time notification delivery
- Rate limiting per user
- Connection management in Redis
- **Impact:** High - Real-time notifications
- **Priority:** HIGH

### 2. **Repository Tests Missing**

**NotificationLogRepository** - Custom methods need testing:
- `findByUserId()`
- `findByCenterId()`
- `findByStatus()`
- `findByType()`
- `deleteOldFailedLogs()` - Used by DLQ cleanup job
- `paginate()` - Custom pagination
- Complex queries with filters

**NotificationRepository** - Custom methods need testing:
- `findByUserId()` - Complex query with readAt filtering
- `markAsRead()`
- `archive()`
- `paginate()` - Custom pagination
- Complex queries with profile filtering

**Impact:** Medium - Repositories have complex logic that should be tested

### 3. **Job Tests Missing**

**NotificationDlqCleanupJob** - Scheduled job:
- Cleanup old failed notifications
- Retention period logic
- Bulk deletion
- Statistics reporting

**RedisCleanupJob** - Scheduled job:
- Cleanup stale socket connections
- SCAN-based key iteration
- TTL-based cleanup
- Connection leak detection

**Impact:** Medium - Jobs run in production, should be tested

### 4. **Redundant/Legacy Code**

**TemplateCacheService** - Marked as legacy:
- Comment says "can be removed after migration"
- Should be removed or migrated fully
- **Action:** Remove or complete migration

### 5. **Test Organization Issues**

**Test Files Location:**
- Some tests in `services/` directory (trigger-flow.spec.ts, batch-processing.spec.ts, edge-cases.spec.ts)
- Some tests in `test/` directory (smoke-flow.spec.ts, load-simulation.spec.ts)
- **Recommendation:** Consolidate test location or document structure

**Test File Naming:**
- `trigger-flow.spec.ts` - Not a service, but a flow test
- `batch-processing.spec.ts` - Not a service, but a feature test
- `edge-cases.spec.ts` - Generic name
- **Recommendation:** Consider renaming or moving to `test/` directory

---

## 📝 Updated Refactoring Plan

### Phase 4: Add Missing Tests (Updated)

**Priority:** MEDIUM - Completes test coverage  
**Time Estimate:** 32-48 hours (increased from 24-34)

#### Task 4.1: Critical Service Tests (12-18 hours)

**4.1.1: NotificationListener Tests** (4-6 hours) - **NEW**
- Event handling for all event types
- Event data validation
- Error handling and logging
- Recipient resolution
- Integration with NotificationService

**4.1.2: NotificationManifestResolver Tests** (3-4 hours) - **NEW**
- Manifest resolution for all types
- Audience configuration retrieval
- Channel configuration retrieval
- Error handling for missing manifests

**4.1.3: NotificationValidator Tests** (2-3 hours) - **NEW**
- Manifest validation on init
- Template existence checks
- Channel configuration validation
- CI vs dev behavior

**4.1.4: NotificationGateway Tests** (3-5 hours) - **NEW**
- WebSocket connection handling
- Disconnection handling
- Real-time notification delivery
- Rate limiting per user
- Redis connection management
- Connection reconciliation

#### Task 4.2: Repository Tests (6-8 hours) - **NEW**

**4.2.1: NotificationLogRepository Tests** (3-4 hours)
- Custom query methods (findByUserId, findByCenterId, etc.)
- Pagination
- deleteOldFailedLogs (used by DLQ cleanup)
- Complex filtering

**4.2.2: NotificationRepository Tests** (3-4 hours)
- Custom query methods (findByUserId with readAt filtering)
- markAsRead
- archive
- Pagination
- Profile filtering

#### Task 4.3: Supporting Service Tests (8-12 hours)

**4.3.1: ChannelRateLimitService Tests** (4-6 hours)
- Rate limit checking per channel
- Window reset logic
- Concurrent requests handling
- Per-user limits
- Per-channel limits

**4.3.2: ChannelRetryStrategyService Tests** (4-6 hours)
- Retry strategies per channel
- Backoff calculations
- Max retry limits
- Retry delays

#### Task 4.4: Additional Service Tests (6-10 hours)

**4.4.1: RecipientResolverService Tests** (4-6 hours)
- Recipient resolution logic
- User profile resolution
- Center/user context resolution
- Error handling

**4.4.2: ChannelSelectionService Tests** (3-4 hours)
- Optimal channel selection
- User activity-based selection
- Fallback logic
- Caching

**4.4.3: InAppNotificationService Tests** (4-6 hours)
- Notification creation
- Notification retrieval
- Notification updates (read, archive)
- Filtering and pagination

**4.4.4: MetricsBatchService Tests** (3-4 hours)
- Batch metrics collection
- Metrics aggregation
- Batch flushing
- Error handling

**4.4.5: NotificationAlertService Tests** (2-3 hours)
- Alert creation
- Alert resolution
- Queue backlog alerts

**4.4.6: RedisTemplateCacheService Tests** (2-3 hours) - **NEW**
- Template caching
- Cache invalidation
- Redis operations

#### Task 4.5: Job Tests (4-6 hours) - **NEW**

**4.5.1: NotificationDlqCleanupJob Tests** (2-3 hours)
- Cleanup old failed notifications
- Retention period logic
- Bulk deletion
- Statistics reporting
- Cron scheduling (mock)

**4.5.2: RedisCleanupJob Tests** (2-3 hours)
- Cleanup stale connections
- SCAN-based iteration
- TTL-based cleanup
- Connection leak detection
- Cron scheduling (mock)

#### Task 4.6: Optional Tests (2-4 hours)

**4.6.1: TemplateHotReloadService Tests** (2-3 hours) - Optional
- Hot reload functionality
- File watching
- Cache invalidation

**4.6.2: Observability Tests** (2-3 hours) - Optional
- NotificationTracerService
- PrometheusMetricsService

**4.6.3: TimeoutConfigService Tests** (1-2 hours) - Optional
- Timeout configuration per provider

---

## 🗑️ Cleanup Tasks

### Task 6.1: Remove Legacy Code (1-2 hours) - **NEW**

**TemplateCacheService:**
- Verify migration to RedisTemplateCacheService is complete
- Remove TemplateCacheService if no longer used
- Update imports and references
- Update documentation

**Acceptance Criteria:**
- ✅ TemplateCacheService removed
- ✅ No references to legacy service
- ✅ All functionality migrated to RedisTemplateCacheService

---

## 📋 Test Organization Improvements

### Task 7.1: Reorganize Test Files (2-3 hours) - **NEW**

**Current Issues:**
- Tests scattered across `services/` and `test/` directories
- Inconsistent naming (trigger-flow.spec.ts vs notification.service.spec.ts)

**Options:**

**Option A: Keep Current Structure** (Recommended)
- Keep service tests next to services
- Keep integration tests in `test/` directory
- Document the structure

**Option B: Consolidate to `test/` Directory**
- Move all tests to `test/` directory
- Organize by type: `test/services/`, `test/adapters/`, `test/integration/`
- More consistent but requires more refactoring

**Recommended: Option A** - Less disruption, document structure

**Implementation:**
1. Document test file organization
2. Add README in `test/` directory explaining structure
3. Consider moving flow tests (trigger-flow, batch-processing) to `test/` if they're integration tests

---

## 🎯 Updated Priority List

### Phase 1: Fix Blocking Issues (Week 1) - **UNCHANGED**
- Fix circular dependency ✅ (In Progress)
- Fix ES module issue ✅ (Completed)
- Fix test expectation failures

### Phase 2: Reduce Mocking Complexity (Week 2) - **UNCHANGED**
- Create test module factory
- Refactor integration tests
- Simplify database mocking
- Create complete mock factories

### Phase 3: Fix Test Logic & Types (Week 3) - **UNCHANGED**
- Fix type errors
- Fix test failures
- Improve test isolation

### Phase 4: Add Missing Tests (Week 4) - **UPDATED**
- **NEW:** Critical services (Listener, ManifestResolver, Validator, Gateway)
- **NEW:** Repository tests
- **NEW:** Job tests
- Supporting services (from original plan)
- Optional tests

### Phase 5: Improve Test Quality (Week 5) - **UNCHANGED**
- Edge cases
- Performance tests
- Documentation
- Coverage reporting
- CI/CD integration

### Phase 6: Cleanup (Week 6) - **NEW**
- Remove legacy code
- Reorganize test files (optional)
- Final review

---

## 📊 Updated Success Metrics

### Before Refactoring
- ❌ Test Suites: 14 failed, 6 passed
- ❌ Tests: 23 failed, 101 passed
- ❌ Mocks per File: ~14
- ❌ Type Errors: 42
- ❌ Services with Tests: 13/38 (34%)

### After Refactoring
- ✅ Test Suites: 0 failed, 38+ passed
- ✅ Tests: 0 failed, 300+ passed
- ✅ Mocks per File: ~6 (-57%)
- ✅ Type Errors: 0 (-100%)
- ✅ Services with Tests: 38/38 (100%)

---

## 🔄 Plan Updates Summary

### Added to Plan:
1. **NotificationListener tests** - Critical, handles all events
2. **NotificationManifestResolver tests** - Critical, core service
3. **NotificationValidator tests** - High priority, startup validation
4. **NotificationGateway tests** - High priority, WebSocket
5. **Repository tests** - Medium priority, custom methods
6. **Job tests** - Medium priority, scheduled jobs
7. **RedisTemplateCacheService tests** - Medium priority
8. **Cleanup phase** - Remove legacy code
9. **Test organization** - Document/improve structure

### Removed from Plan:
- Nothing removed, only additions

### Updated Estimates:
- Phase 4: 24-34 hours → 32-48 hours (added critical services)
- Total time: ~100-130 hours → ~110-150 hours

---

## 📝 Notes

### Test Strategy by Component Type

**Services:**
- Use real services in integration tests
- Mock only external dependencies
- Use faker for test data

**Repositories:**
- Use test database or mock at repository level
- Test custom methods
- Test complex queries

**Gateways:**
- Mock WebSocket server
- Test connection/disconnection
- Test message delivery

**Listeners:**
- Mock event emitter
- Test event handling
- Test error scenarios

**Jobs:**
- Mock cron scheduler
- Test job logic
- Test cleanup operations

**Validators:**
- Test validation logic
- Test error reporting
- Test CI vs dev behavior

---

**Last Updated:** Current Session

