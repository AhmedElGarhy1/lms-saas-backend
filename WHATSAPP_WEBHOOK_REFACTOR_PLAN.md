# WhatsApp Webhook Refactoring Plan

## Overview
This plan addresses critical bugs and removes over-engineered components from the WhatsApp webhook implementation, making it production-ready and maintainable.

## Goals
- ✅ Fix 2 critical bugs (signature verification, message ID race condition)
- ✅ Remove over-engineered components (~200 lines)
- ✅ Simplify codebase while maintaining reliability
- ✅ Keep essential features (idempotency, queue, signature verification)

---

## Phase 1: Critical Bug Fixes 🔴

### Task 1.1: Fix Signature Verification (CRITICAL)
**Problem**: Using `JSON.stringify(body)` breaks signature verification - Meta signs raw bytes.

**Files to modify**:
- `src/modules/notifications/controllers/whatsapp-webhook.controller.ts`
- `src/modules/notifications/notifications.module.ts`

**Files to create**:
- `src/modules/notifications/middleware/raw-body.middleware.ts`

**Steps**:
1. Create `RawBodyMiddleware` to preserve raw request body before JSON parsing
2. Apply middleware to `/notifications/webhooks/whatsapp` route
3. Update controller to use `req.rawBody` instead of `JSON.stringify(body)`
4. Test signature verification with actual Meta webhook

**Acceptance Criteria**:
- ✅ Raw body preserved before JSON parsing
- ✅ Signature verification uses raw bytes
- ✅ Webhook verification passes with Meta's signature

---

### Task 1.2: Fix Message ID Race Condition (CRITICAL)
**Problem**: Webhook may arrive before DB update commits → false "orphaned" alerts.

**Files to modify**:
- `src/modules/notifications/services/notification-sender.service.ts`

**Steps**:
1. Capture `whatsappMessageId` immediately after adapter sends
2. Store messageId in notification log metadata within same transaction
3. Ensure messageId is available before webhook can arrive
4. Consider storing messageId in initial log creation if possible

**Acceptance Criteria**:
- ✅ Message ID stored atomically with log creation/update
- ✅ No race condition between send and webhook arrival
- ✅ Orphaned webhooks only occur for truly missing messages

---

## Phase 2: Remove Over-Engineered Components 🟡

### Task 2.1: Remove Alert Service
**Reason**: Enterprise-level complexity not needed for most teams. Simple logging is sufficient.

**Files to delete**:
- `src/modules/notifications/services/webhooks/whatsapp-webhook-alert.service.ts`

**Files to modify**:
- `src/modules/notifications/services/webhooks/whatsapp-webhook.service.ts`
- `src/modules/notifications/notifications.module.ts`

**Steps**:
1. Delete `whatsapp-webhook-alert.service.ts`
2. Remove alert service from module providers
3. Remove alert service from webhook service constructor
4. Replace `alertService.recordOrphanedWebhook()` with simple logger warning
5. Remove alert service import

**Acceptance Criteria**:
- ✅ Alert service file deleted
- ✅ No references to alert service in codebase
- ✅ Orphaned webhooks logged as warnings

---

### Task 2.2: Simplify Metrics Service
**Reason**: 30-day Redis storage is expensive. Use Prometheus/Datadog for metrics.

**Files to modify**:
- `src/modules/notifications/services/webhooks/whatsapp-webhook-metrics.service.ts`
- `src/modules/notifications/services/webhooks/whatsapp-webhook.service.ts`
- `src/modules/notifications/controllers/whatsapp-webhook.controller.ts`

**Steps**:
1. Replace Redis-based metrics with simple logging
2. Remove 30-day TTL constants
3. Remove Redis key generation logic
4. Simplify methods to log-only (or remove if not needed)
5. Remove metrics calls that aren't critical
6. Keep only essential logging (signature failures, orphaned webhooks)

**Acceptance Criteria**:
- ✅ No Redis storage for metrics
- ✅ Simple logging-based metrics
- ✅ No 30-day TTL usage
- ✅ Code reduced by ~100 lines

---

### Task 2.3: Remove Batch Splitting Logic
**Reason**: Meta batches are small (1-5 items). Splitting >10 is unnecessary optimization.

**Files to modify**:
- `src/modules/notifications/services/webhooks/whatsapp-webhook.service.ts`
- `src/modules/notifications/processors/whatsapp-webhook.processor.ts`

**Steps**:
1. Remove batch size check and splitting logic from `enqueueWebhookEvent`
2. Always enqueue full event as single job
3. Remove `process-status` job type handling from processor
4. Simplify processor to only handle `process-webhook` job type

**Acceptance Criteria**:
- ✅ No batch splitting logic
- ✅ All webhooks processed as single event
- ✅ Processor only handles one job type

---

### Task 2.4: Simplify Processor Validation
**Reason**: DTO validation already handles structure. Excessive nested validation is redundant.

**Files to modify**:
- `src/modules/notifications/processors/whatsapp-webhook.processor.ts`

**Steps**:
1. Remove deep nested validation (lines 49-135)
2. Keep only basic null/undefined checks
3. Let DTO validation handle structure
4. Simplify error handling

**Acceptance Criteria**:
- ✅ Validation reduced to basic null checks
- ✅ DTO validation handles structure
- ✅ Code reduced by ~80 lines

---

## Phase 3: Cleanup & Optimization 🟢

### Task 3.1: Update Controller
**Files to modify**:
- `src/modules/notifications/controllers/whatsapp-webhook.controller.ts`

**Steps**:
1. Remove `metricsService` from constructor
2. Remove metrics recording calls
3. Simplify error handling
4. Keep signature verification and queue enqueueing

**Acceptance Criteria**:
- ✅ Controller simplified
- ✅ No metrics service dependency
- ✅ Essential functionality preserved

---

### Task 3.2: Update Module Configuration
**Files to modify**:
- `src/modules/notifications/notifications.module.ts`

**Steps**:
1. Remove `WhatsAppWebhookAlertService` from providers
2. Add `RawBodyMiddleware` to module
3. Configure middleware for webhook route
4. Verify all imports are correct

**Acceptance Criteria**:
- ✅ Alert service removed from providers
- ✅ Middleware configured correctly
- ✅ All imports valid

---

### Task 3.3: Code Review & Testing
**Steps**:
1. Run TypeScript compilation check
2. Run linter
3. Verify no broken imports
4. Test webhook verification endpoint
5. Test webhook event processing
6. Verify idempotency works
7. Check signature verification with real payload

**Acceptance Criteria**:
- ✅ No TypeScript errors
- ✅ No linter errors
- ✅ All tests pass (if applicable)
- ✅ Webhook verification works
- ✅ Event processing works

---

## Summary of Changes

### Files to Delete
- ❌ `src/modules/notifications/services/webhooks/whatsapp-webhook-alert.service.ts`

### Files to Create
- ✅ `src/modules/notifications/middleware/raw-body.middleware.ts`

### Files to Modify
1. `src/modules/notifications/controllers/whatsapp-webhook.controller.ts`
2. `src/modules/notifications/services/webhooks/whatsapp-webhook.service.ts`
3. `src/modules/notifications/services/webhooks/whatsapp-webhook-metrics.service.ts`
4. `src/modules/notifications/services/webhooks/whatsapp-webhook-signature.service.ts` (no changes, just verify)
5. `src/modules/notifications/services/webhooks/whatsapp-webhook-idempotency.service.ts` (no changes, keep as-is)
6. `src/modules/notifications/processors/whatsapp-webhook.processor.ts`
7. `src/modules/notifications/services/notification-sender.service.ts`
8. `src/modules/notifications/notifications.module.ts`

---

## Expected Outcomes

### Code Reduction
- **Before**: ~800 lines across webhook services
- **After**: ~400 lines (50% reduction)
- **Removed**: ~200 lines of over-engineered code

### Maintainability
- ✅ Simpler codebase
- ✅ Fewer services to understand
- ✅ Clear separation of concerns
- ✅ Easier onboarding

### Reliability
- ✅ Critical bugs fixed
- ✅ Essential features preserved
- ✅ Same security (signature verification)
- ✅ Same reliability (idempotency, queue)

---

## Risk Assessment

### Low Risk
- Removing alert service (replaced with logging)
- Simplifying metrics (replaced with logging)
- Removing batch splitting (Meta batches are small)

### Medium Risk
- Signature verification fix (must test with real Meta webhook)
- Message ID race condition fix (must verify transaction timing)

### Mitigation
- Test signature verification with actual Meta webhook payload
- Verify message ID storage timing in integration tests
- Keep idempotency service unchanged (proven to work)

---

## Rollback Plan

If issues arise:
1. Revert commits in reverse order
2. Restore deleted alert service if needed
3. Re-enable batch splitting if performance issues occur
4. Keep metrics service as fallback if needed

---

## Timeline Estimate

- **Phase 1 (Critical Fixes)**: 2-3 hours
- **Phase 2 (Remove Over-Engineering)**: 2-3 hours
- **Phase 3 (Cleanup)**: 1-2 hours
- **Testing & Verification**: 1-2 hours

**Total**: ~6-10 hours

---

## Notes

- Keep idempotency service as-is (it's simple and correct)
- Keep signature service as-is (just fix usage)
- Consider consolidating services later (optional)
- Metrics can be added to Prometheus/Datadog later if needed

