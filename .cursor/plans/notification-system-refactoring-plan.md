# Notification System Refactoring Plan

## Overview

This plan addresses deprecated code, missing implementations, duplicate logic, and over-engineering in the notification system.

## Goals

1. Remove deprecated and unused code
2. Consolidate duplicate retry/idempotency logic
3. Simplify over-engineered components
4. Complete missing implementations
5. Improve code maintainability

---

## Phase 1: Remove Deprecated Code (High Priority)

### Task 1.1: Remove `notification-config.types.ts`

**Priority**: High  
**Effort**: Low  
**Risk**: Low

**Steps**:

1. Search for all imports of `notification-config.types.ts`
2. Verify no active usage
3. Remove file
4. Remove export from `config/index.ts`
5. Update any type references if needed

**Files to modify**:

- `src/modules/notifications/config/notification-config.types.ts` (delete)
- `src/modules/notifications/config/index.ts`

**Validation**:

- Run `npm run build` - should compile without errors
- Run `npm run lint` - should pass

---

### Task 1.2: Remove Deprecated Methods from `NotificationTemplateService`

**Priority**: High  
**Effort**: Medium  
**Risk**: Medium

**Methods to remove**:

- `getEmailSubjectFromConfig()` - always returns fallback
- `validateRequiredVariables()` - always returns `{ isValid: true }`
- `renderTemplateSafe()` - kept for internal fallback only

**Steps**:

1. Search for all usages of these methods
2. Replace with `NotificationRenderer` calls where needed
3. Remove deprecated methods
4. Update any fallback logic to use `NotificationRenderer` directly

**Files to modify**:

- `src/modules/notifications/services/notification-template.service.ts`
- Any files that call these methods

**Validation**:

- Run `npm run build`
- Run tests if available
- Verify all notifications still work

---

### Task 1.3: Handle Push Adapter (Remove or Implement)

**Priority**: High  
**Effort**: Low (if removing) / High (if implementing)  
**Risk**: Low

**Decision needed**: Remove or implement?

**Option A: Remove Push Adapter**

1. Remove from `notifications.module.ts` providers
2. Remove from adapter exports
3. Remove `PushAdapter` class
4. Update `NotificationChannel` enum if needed (or keep for future)

**Option B: Implement Push Adapter**

1. Implement Firebase Cloud Messaging integration
2. Add configuration for FCM
3. Add tests
4. Update documentation

**Files to modify**:

- `src/modules/notifications/adapters/push.adapter.ts`
- `src/modules/notifications/notifications.module.ts`
- `src/modules/notifications/adapters/index.ts`

**Validation**:

- Build passes
- No runtime errors when Push channel is referenced

---

## Phase 2: Consolidate Duplicate Logic (High Priority)

### Task 2.1: Consolidate Idempotency Checks

**Priority**: High  
**Effort**: Medium  
**Risk**: Medium

**Current state**:

- `NotificationIdempotencyCacheService` - Redis-based, 24h TTL, all channels
- `InAppAdapter.checkDuplicateNotification()` - DB query, 5s window, IN_APP only

**Decision**: Use `NotificationIdempotencyCacheService` for all channels

**Steps**:

1. Remove `checkDuplicateNotification()` from `InAppAdapter`
2. Use `NotificationIdempotencyCacheService` in `InAppAdapter.send()`
3. Ensure idempotency check happens before WebSocket delivery
4. Update tests if any

**Files to modify**:

- `src/modules/notifications/adapters/in-app.adapter.ts`

**Validation**:

- IN_APP notifications still prevent duplicates
- No duplicate notifications in database
- Performance is acceptable

---

### Task 2.2: Simplify Retry Logic

**Priority**: Medium  
**Effort**: Medium  
**Risk**: Medium

**Current state**:

- BullMQ retry (queue level) - for EMAIL, SMS, WhatsApp
- `ChannelRetryStrategyService` - provides config
- `NotificationProcessor` - tracks retries
- `InAppAdapter.deliverWithRetry()` - custom retry for IN_APP
- `retry.util.ts` - unused utility

**Decision**:

- Keep BullMQ retry for queued channels (EMAIL, SMS, WhatsApp)
- Keep `InAppAdapter.deliverWithRetry()` (IN_APP is direct, not queued)
- Remove or document `retry.util.ts` if unused
- Simplify `ChannelRetryStrategyService` to only provide config

**Steps**:

1. Verify `retry.util.ts` is not used anywhere
2. Remove `retry.util.ts` if unused
3. Document why IN_APP has custom retry (direct send, not queued)
4. Ensure `ChannelRetryStrategyService` only provides config, no logic

**Files to modify**:

- `src/modules/notifications/utils/retry.util.ts` (delete if unused)
- `src/modules/notifications/services/channel-retry-strategy.service.ts` (review)
- `src/modules/notifications/adapters/in-app.adapter.ts` (add comment explaining retry)

**Validation**:

- All channels retry correctly
- No duplicate retry logic
- Documentation is clear

---

### Task 2.3: Remove Duplicate Validation

**Priority**: Medium  
**Effort**: Low  
**Risk**: Low

**Current state**:

- `NotificationRenderer.validateRequiredVariables()` - active
- `NotificationTemplateService.validateRequiredVariables()` - deprecated, always returns valid

**Steps**:

1. Remove deprecated `validateRequiredVariables()` from `NotificationTemplateService`
2. Update `renderTemplateSafe()` if it calls the deprecated method
3. Ensure all validation goes through `NotificationRenderer`

**Files to modify**:

- `src/modules/notifications/services/notification-template.service.ts`

**Validation**:

- Build passes
- All validations still work

---

## Phase 3: Simplify Over-Engineered Components (Medium Priority)

### Task 3.1: Simplify Channel Selection

**Priority**: Medium  
**Effort**: Medium  
**Risk**: Low

**Current state**:

- `ChannelSelectionService.selectOptimalChannels()` - complex logic, only called once

**Options**:

- **Option A**: Move logic inline to `NotificationService`
- **Option B**: Keep service but simplify logic
- **Option C**: Extract to strategy pattern if multiple strategies needed

**Recommendation**: Option B - Keep service but simplify

**Steps**:

1. Review channel selection logic
2. Remove unnecessary complexity
3. Simplify user activity checks
4. Document decision logic clearly

**Files to modify**:

- `src/modules/notifications/services/channel-selection.service.ts`

**Validation**:

- Channel selection still works correctly
- Logic is easier to understand

---

### Task 3.2: Audit and Simplify `NotificationProcessingContext`

**Priority**: Low  
**Effort**: Medium  
**Risk**: Low

**Current state**: 13+ fields, some may be unused

**Steps**:

1. Search for all usages of each field
2. Identify unused fields
3. Remove unused fields
4. Group related fields if possible
5. Add JSDoc comments for clarity

**Files to modify**:

- `src/modules/notifications/services/notification.service.ts`

**Validation**:

- Build passes
- All functionality still works
- Code is cleaner

---

### Task 3.3: Simplify Template Fallback Strategy

**Priority**: Low  
**Effort**: Low  
**Risk**: Low

**Current state**: 4-level fallback (channel-specific → email → channel default → root default)

**Decision**: Simplify to 2 levels (primary → default)

**Steps**:

1. Review fallback logic in `NotificationRenderer`
2. Simplify to: primary template → default template
3. Update documentation

**Files to modify**:

- `src/modules/notifications/renderer/notification-renderer.service.ts`

**Validation**:

- Fallbacks still work
- Simpler code

---

### Task 3.4: Document Concurrency Limits

**Priority**: Low  
**Effort**: Low  
**Risk**: None

**Current state**: Multiple concurrency limiters

**Steps**:

1. Document each concurrency limit:
   - `NotificationService.concurrencyLimit` (20) - limits concurrent `processEvent()` calls
   - `NotificationSenderService.sendMultipleConcurrency` (5) - limits concurrent `send()` calls
   - `NotificationProcessor` concurrency (5) - BullMQ worker concurrency
2. Explain why each exists
3. Add to documentation

**Files to modify**:

- `docs/NOTIFICATION_SYSTEM_COMPLETE_GUIDE.md`
- Add comments in code

**Validation**:

- Documentation is clear

---

## Phase 4: Complete Missing Implementations (Low Priority)

### Task 4.1: External Alerting Integration

**Priority**: Low  
**Effort**: High  
**Risk**: Low

**Current state**: Alerts only logged, not sent externally

**Steps**:

1. Design alerting integration (e.g., Slack, PagerDuty, email)
2. Add configuration for alerting service
3. Implement integration
4. Add tests
5. Update documentation

**Files to modify**:

- `src/modules/notifications/services/notification-alert.service.ts`
- Add new provider/service for external alerting

**Validation**:

- Alerts are sent to external service
- Tests pass

---

### Task 4.2: Teacher-Student Relationship Resolution

**Priority**: Low  
**Effort**: Medium  
**Risk**: Low

**Current state**: TODO comments in `recipient-resolver.service.ts`

**Steps**:

1. Define teacher-student relationship model
2. Implement relationship queries
3. Update `RecipientResolverService`
4. Add tests
5. Update documentation

**Files to modify**:

- `src/modules/notifications/services/recipient-resolver.service.ts`

**Validation**:

- Teacher-student notifications work
- Tests pass

---

## Phase 5: Code Quality Improvements (Ongoing)

### Task 5.1: Add Missing Tests

**Priority**: Medium  
**Effort**: High  
**Risk**: None

**Steps**:

1. Add unit tests for refactored components
2. Add integration tests for critical paths
3. Ensure test coverage > 80%

---

### Task 5.2: Update Documentation

**Priority**: Medium  
**Effort**: Medium  
**Risk**: None

**Steps**:

1. Update `NOTIFICATION_SYSTEM_COMPLETE_GUIDE.md` with refactoring changes
2. Document removed deprecated code
3. Document simplified logic
4. Add migration guide if needed

---

## Implementation Order

### Week 1: High Priority (Phase 1 + Phase 2)

1. Task 1.1: Remove `notification-config.types.ts`
2. Task 1.2: Remove deprecated methods
3. Task 1.3: Handle Push adapter
4. Task 2.1: Consolidate idempotency checks
5. Task 2.2: Simplify retry logic
6. Task 2.3: Remove duplicate validation

### Week 2: Medium Priority (Phase 3)

7. Task 3.1: Simplify channel selection
8. Task 3.2: Audit context object
9. Task 3.3: Simplify template fallback
10. Task 3.4: Document concurrency limits

### Week 3+: Low Priority (Phase 4 + 5)

11. Task 4.1: External alerting (if needed)
12. Task 4.2: Teacher-student relationships (if needed)
13. Task 5.1: Add tests
14. Task 5.2: Update documentation

---

## Risk Mitigation

### Before Starting

- Create feature branch: `refactor/notification-system-cleanup`
- Run full test suite
- Document current behavior

### During Implementation

- Test after each task
- Commit after each completed task
- Review changes before merging

### After Completion

- Run full test suite
- Performance testing
- Code review
- Update documentation

---

## Success Criteria

1. ✅ No deprecated code remains
2. ✅ No duplicate retry/idempotency logic
3. ✅ Code is simpler and easier to understand
4. ✅ All tests pass
5. ✅ Documentation is updated
6. ✅ Performance is maintained or improved

---

## Notes

- **Breaking Changes**: Most changes are internal refactoring, but some may affect behavior
- **Backward Compatibility**: Ensure existing notifications still work
- **Performance**: Monitor performance after each phase
- **Testing**: Test thoroughly after each task

---

## Questions to Resolve

1. **Push Adapter**: Remove or implement? (Recommendation: Remove for now, implement later if needed)
2. **Channel Selection**: Inline or keep service? (Recommendation: Keep service but simplify)
3. **Template Fallback**: Keep 4 levels or simplify? (Recommendation: Simplify to 2 levels)
4. **External Alerting**: Priority? (Recommendation: Low, can be done later)

---

## Estimated Timeline

- **Phase 1**: 2-3 days
- **Phase 2**: 2-3 days
- **Phase 3**: 2-3 days
- **Phase 4**: 3-5 days (if needed)
- **Phase 5**: Ongoing

**Total**: ~1-2 weeks for high/medium priority tasks
