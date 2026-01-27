# Notification System - Improvements & Next Steps

## Current State Assessment

**Overall Rating**: 8.5/10 (Excellent, with room for improvement)

### Strengths ✅
- ✅ Enterprise-grade architecture
- ✅ Comprehensive error handling & resilience
- ✅ Type-safe implementation
- ✅ Good observability (metrics, logging)
- ✅ Well-documented (README.md)
- ✅ Scalable queue-based processing

### Critical Gaps 🔴
- 🔴 **No test coverage** (0% - Critical)
- 🔴 **No health/metrics API endpoints** (Services exist but not exposed)
- 🟡 **No monitoring dashboard** (Metrics collected but not visualized)

---

## Priority 1: Testing (CRITICAL) 🔴

### Current State
- Jest config exists (`jest.notifications.config.js`)
- **No test files found** (0% coverage)
- Target: 80% coverage (as per config)

### Impact
- **High Risk**: Bugs can go undetected
- **Low Confidence**: Changes are risky without tests
- **Slow Development**: Manual testing required

### Implementation Plan

#### 1.1 Unit Tests (High Priority)

**Target Files**:
- `services/notification-sender.service.spec.ts`
- `services/notification-circuit-breaker.service.spec.ts`
- `services/notification-idempotency-cache.service.spec.ts`
- `services/notification-router.service.spec.ts`
- `services/payload-builder.service.spec.ts`
- `adapters/*.adapter.spec.ts`

**Example Structure**:
```typescript
describe('NotificationSenderService', () => {
  describe('send()', () => {
    it('should send notification via correct adapter', async () => {
      // Test adapter selection
    });
    
    it('should handle circuit breaker open state', async () => {
      // Test circuit breaker integration
    });
    
    it('should create notification log', async () => {
      // Test logging
    });
  });
});
```

**Estimated Effort**: 3-4 weeks

**Note**: Notification systems are inherently complex to test due to:
- Queue interactions (time-dependent)
- Retry mechanisms (flaky by nature)
- Provider integrations (external dependencies)
- Idempotency (distributed state)
- Circuit breakers (stateful)

**Testing Challenges**:
- Mocking queue behavior accurately
- Testing time-based retries
- Simulating provider failures
- Testing idempotency in concurrent scenarios
- Handling flaky tests gracefully

#### 1.2 Integration Tests (Medium Priority)

**Target Scenarios**:
- End-to-end notification flow
- Multi-channel delivery
- Retry mechanisms
- Idempotency checks
- Queue processing
- Provider failure scenarios
- Circuit breaker state transitions

**Example**:
```typescript
describe('Notification Flow Integration', () => {
  it('should process notification from event to delivery', async () => {
    // Trigger event
    // Verify queue processing
    // Verify delivery
    // Verify logs
  });
  
  it('should handle provider partial outages gracefully', async () => {
    // Test degraded mode behavior
  });
});
```

**Estimated Effort**: 2-3 weeks

**Note**: Integration tests require:
- Test database setup/teardown
- Redis queue isolation
- Provider mocking infrastructure
- Time manipulation for retries

#### 1.3 E2E Tests (Low Priority)

**Target**: Critical user flows
- OTP delivery
- Center creation notifications
- Multi-audience notifications
- Provider failure recovery

**Estimated Effort**: 2 weeks

**Note**: E2E tests are slower and more brittle:
- Require full stack setup
- External provider dependencies
- Network timing issues
- Higher maintenance cost

---

## Priority 2: Monitoring & Observability API 🟡

### Current State
- ✅ Metrics service exists (`NotificationMetricsService`)
- ✅ Circuit breaker health exists (`getHealthStatus()`)
- ✅ Idempotency stats exist (`getStats()`)
- ❌ **No API endpoints to access these**
- ❌ **Missing business metrics** (open rates, conversion rates)

### Impact
- **Operational Blindness**: Can't monitor system health
- **Debugging Difficulty**: Hard to troubleshoot issues
- **No Dashboards**: Can't visualize metrics
- **No Business Insights**: Can't measure notification effectiveness

### Implementation Plan

#### 2.1 Create Admin Monitoring Controller

**File**: `controllers/notification-monitoring.controller.ts`

```typescript
@Controller('notifications/admin')
@ApiTags('Notifications - Admin Monitoring')
@AdminOnly()
export class NotificationMonitoringController {
  constructor(
    private readonly metricsService: NotificationMetricsService,
    private readonly circuitBreakerService: NotificationCircuitBreakerService,
    private readonly idempotencyCache: NotificationIdempotencyCacheService,
  ) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get notification metrics' })
  async getMetrics() {
    return this.metricsService.getSummaryMetrics();
  }

  @Get('health')
  @ApiOperation({ summary: 'Get circuit breaker health status' })
  async getHealth() {
    return this.circuitBreakerService.getHealthStatus();
  }

  @Get('idempotency/stats')
  @ApiOperation({ summary: 'Get idempotency cache statistics' })
  async getIdempotencyStats() {
    return this.idempotencyCache.getStats();
  }

  @Get('queues/status')
  @ApiOperation({ summary: 'Get queue status' })
  async getQueueStatus() {
    // Return queue metrics (waiting, active, completed, failed)
  }
}
```

**Estimated Effort**: 2-3 days

#### 2.2 Add Prometheus Metrics Endpoint (Optional)

**File**: `controllers/notification-metrics.controller.ts`

```typescript
@Controller('notifications/metrics')
export class NotificationMetricsController {
  @Get('prometheus')
  async getPrometheusMetrics() {
    // Return Prometheus-compatible format
  }
}
```

**Estimated Effort**: 1-2 days

#### 2.3 Add Business Metrics

**Missing Metrics**:
- Notification open rate (for in-app)
- Click-through rate (for in-app with actions)
- Conversion rate (user actions taken)
- Per-channel cost effectiveness
- User engagement by notification type

**Implementation**:
```typescript
// Track business metrics
async trackNotificationOpened(notificationId: string, userId: string) {
  await this.metricsService.incrementBusinessMetric('opened', notificationId);
}

async trackNotificationAction(notificationId: string, action: string) {
  await this.metricsService.incrementBusinessMetric('action', notificationId, action);
}
```

**Estimated Effort**: 3-5 days

---

## Priority 2.5: Provider Failure Handling & Degraded Modes 🔴

### Current Gap
- System has retries and circuit breakers
- **Missing**: Explicit degraded mode behavior
- **Missing**: Fallback channel ordering
- **Missing**: Partial outage handling

### Impact
- **Unclear Behavior**: What happens when SMS is down but Email is up?
- **Poor UX**: Users may not receive critical notifications
- **No Graceful Degradation**: System may fail completely

### Implementation Plan

#### 2.5.1 Define Degraded Mode Behavior

**Strategy**: Channel fallback ordering

```typescript
// Define fallback order per notification type
const FALLBACK_ORDER = {
  [NotificationType.OTP]: [
    NotificationChannel.SMS,
    NotificationChannel.WHATSAPP,
    NotificationChannel.EMAIL,
  ],
  [NotificationType.CENTER_CREATED]: [
    NotificationChannel.IN_APP,
    NotificationChannel.EMAIL,
    NotificationChannel.SMS,
  ],
};

// When primary channel fails, try next in order
async sendWithFallback(payload: NotificationPayload) {
  const fallbackOrder = FALLBACK_ORDER[payload.type] || [payload.channel];
  
  for (const channel of fallbackOrder) {
    try {
      return await this.send({ ...payload, channel });
    } catch (error) {
      if (channel === fallbackOrder[fallbackOrder.length - 1]) {
        throw error; // Last channel failed
      }
      // Try next channel
    }
  }
}
```

#### 2.5.2 Partial Outage Handling

**Define Behavior**:
- If SMS provider is down but Email works → Use Email
- If all external channels down → Queue for retry, notify ops
- If IN_APP down → Fallback to Email/SMS
- Log all fallback decisions for analysis

#### 2.5.3 Provider Health Monitoring

**Track**:
- Per-provider success rates
- Provider-specific circuit breaker states
- Fallback usage statistics

**Estimated Effort**: 1 week

---

## Priority 3: Performance Optimizations 🟡

### 3.1 Template Caching Improvements

**Current**: In-memory cache exists
**Improvement**: Add Redis-based distributed cache

**Benefits**:
- Shared cache across instances
- Better memory management
- Cache invalidation strategies

**Estimated Effort**: 3-5 days

### 3.2 Bulk Rendering Optimization

**Current**: Templates rendered per recipient
**Improvement**: Pre-render templates for bulk sends

**Example**:
```typescript
// Current: Renders template for each recipient
for (const recipient of recipients) {
  const rendered = await renderer.render(..., recipient.locale);
}

// Improved: Pre-render once per locale
const renderedCache = new Map<string, RenderedNotification>();
for (const recipient of recipients) {
  if (!renderedCache.has(recipient.locale)) {
    renderedCache.set(recipient.locale, await renderer.render(...));
  }
}
```

**Estimated Effort**: 2-3 days

### 3.3 Database Query Optimization

**Current**: Multiple queries for recipient resolution
**Improvement**: Batch queries, use joins

**Estimated Effort**: 3-5 days

---

## Priority 4: Feature Enhancements 🟢

### 4.1 User Notification Preferences

**Feature**: Allow users to configure notification preferences

**Implementation**:
```typescript
// New entity
@Entity('notification_preferences')
export class NotificationPreference {
  userId: string;
  channel: NotificationChannel;
  enabled: boolean;
  quietHours?: { start: string; end: string };
}

// Update channel selection
async selectOptimalChannels(userId, enabledChannels) {
  const preferences = await this.getUserPreferences(userId);
  return enabledChannels.filter(ch => preferences[ch]?.enabled);
}
```

**Estimated Effort**: 1 week

### 4.2 Notification Scheduling

**Feature**: Schedule notifications for future delivery

**Implementation**:
- Add `scheduledAt` field to notification intent
- Store scheduled notifications in database (not just Redis)
- Background job polls for due notifications
- Enqueue to BullMQ when scheduled time arrives

**Important Considerations**:
- **BullMQ Limitations**: 
  - Delayed jobs don't survive Redis eviction well
  - Long delays (weeks/months) are unreliable
  - Cluster restarts may lose delayed jobs
- **Recommended Approach**:
  - Store scheduled notifications in database
  - Use cron job to poll for due notifications
  - Enqueue to BullMQ when execution time is near (< 1 hour)
  - For very long delays, use database polling

**Architecture**:
```typescript
// Store in database
@Entity('scheduled_notifications')
export class ScheduledNotification {
  scheduledAt: Date;
  notificationIntent: NotificationIntent;
  status: 'PENDING' | 'ENQUEUED' | 'SENT' | 'CANCELLED';
}

// Cron job (runs every 5 minutes)
@Cron('*/5 * * * *')
async processScheduledNotifications() {
  const due = await this.findDueNotifications();
  for (const scheduled of due) {
    await this.enqueueToBullMQ(scheduled);
    await this.markAsEnqueued(scheduled);
  }
}
```

**Estimated Effort**: 1-2 weeks (depending on long-delay requirements)

### 4.3 Notification Templates Versioning

**Feature**: Version control for templates

**Implementation**:
- Add version field to templates
- Support A/B testing
- Rollback capability

**Estimated Effort**: 1-2 weeks

### 4.4 Rich In-App Notifications

**Feature**: Support for images, actions, deep links

**Implementation**:
- Extend `Notification` entity
- Update IN_APP adapter
- Update frontend integration

**Estimated Effort**: 1 week

---

## Priority 5: Developer Experience 🟢

### 5.1 CLI Tools

**Feature**: Command-line tools for notification management

**Commands**:
```bash
# Send test notification
npm run notifications:test -- --type OTP --userId <id>

# View metrics
npm run notifications:metrics

# Reset circuit breaker
npm run notifications:circuit-breaker:reset -- --channel EMAIL

# Clear idempotency cache
npm run notifications:idempotency:clear
```

**Estimated Effort**: 1 week

### 5.2 Development Tools

**Feature**: Better development experience

**Tools**:
- Template preview tool
- Notification simulator
- Test notification sender UI

**Estimated Effort**: 1-2 weeks

### 5.3 TypeScript Improvements

**Current**: Good type safety
**Improvement**: Even stricter types

- Remove remaining `any` types
- Add branded types for IDs
- Improve type inference

**Estimated Effort**: 3-5 days

---

## Priority 6: Documentation Enhancements 🟢

### 6.1 Architecture Diagrams

**Add**: Visual diagrams for:
- System architecture
- Flow diagrams
- Sequence diagrams
- Component relationships

**Tools**: Mermaid, PlantUML, or draw.io

**Estimated Effort**: 2-3 days

### 6.2 API Documentation

**Enhance**: Swagger/OpenAPI documentation
- Add more examples
- Add request/response schemas
- Add error responses

**Estimated Effort**: 2-3 days

### 6.3 Runbook

**Create**: Operational runbook with:
- Common issues & solutions
- Troubleshooting steps
- Recovery procedures
- Alert response guide

**Estimated Effort**: 2-3 days

---

## Priority 6.5: Operational Excellence 🔒

### 6.5.1 Failure Ownership & DLQ Handling

**Current Gap**: No explicit ownership of failed notifications

**Requirements**:
- Define who owns failed notifications
- Define retry exhaustion handling
- Create replay tooling
- Define escalation paths

**Implementation**:
```typescript
// DLQ Service
@Injectable()
export class DeadLetterQueueService {
  async handleExhaustedRetries(job: Job) {
    // Move to DLQ
    await this.dlqRepository.save({
      notificationId: job.data.id,
      failureReason: job.failedReason,
      attempts: job.attemptsMade,
      lastError: job.stacktrace,
      createdAt: new Date(),
      owner: this.determineOwner(job.data.type),
    });
    
    // Notify owner
    await this.notifyOwner(job);
  }
  
  async replayFromDLQ(dlqId: string) {
    // Manual replay capability
  }
}
```

**Ownership Rules**:
- OTP failures → Security team
- Payment notifications → Finance team
- General notifications → Product team

**Estimated Effort**: 1 week

### 6.5.2 Data Retention & Cleanup

**Current Gap**: No explicit retention policies

**Requirements**:
- Define retention periods per data type
- Implement automated cleanup
- Consider compliance requirements
- Balance storage costs vs. audit needs

**Retention Policies**:
```typescript
const RETENTION_POLICIES = {
  notificationLogs: 90, // days
  notificationEntities: 365, // days (in-app notifications)
  scheduledNotifications: 30, // days after execution
  auditLogs: 2555, // days (7 years for compliance)
  metrics: 90, // days
  idempotencyCache: 1, // day (already implemented)
};
```

**Cleanup Jobs**:
- Daily cleanup for short-retention data
- Weekly cleanup for medium-retention data
- Monthly cleanup for long-retention data
- Archive before deletion (for compliance)

**Estimated Effort**: 1 week

### 6.5.3 Idempotency Scope Clarification

**Current**: Idempotency exists but scope is implicit

**Requirements**: Explicitly define idempotency scope

**Options**:
1. **Per notification type + user + correlationId** (current)
2. **Per notification type + user + time window**
3. **Per payload hash**

**Recommendation**: Document current behavior explicitly

```typescript
/**
 * Idempotency Scope:
 * - Key: correlationId + notificationType + channel + recipient
 * - TTL: 5 minutes (configurable)
 * - Purpose: Prevent duplicate sends within short time window
 * - Limitations: 
 *   - Same notification with different correlationId will be sent
 *   - Different channels are independent (can send SMS + Email)
 *   - After TTL expires, same notification can be sent again
 */
```

**Estimated Effort**: 1 day (documentation + clarification)

---

## Priority 7: Security Enhancements 🔒

### 7.1 Rate Limiting Per User

**Current**: Global rate limiting
**Enhancement**: Per-user rate limiting

**Implementation**:
```typescript
async checkUserRateLimit(userId: string, channel: NotificationChannel) {
  const key = `rate_limit:${userId}:${channel}`;
  // Check user-specific limit
}
```

**Estimated Effort**: 2-3 days

### 7.2 Content Sanitization

**Enhancement**: Better sanitization of template variables
- XSS prevention
- SQL injection prevention
- Content validation

**Estimated Effort**: 2-3 days

### 7.3 Audit Logging

**Enhancement**: Enhanced audit trail with enterprise requirements

**Requirements**:
- Who sent what notification (actor tracking)
- When and why (correlation to business events)
- Delivery status (complete lifecycle)
- Immutability (append-only logs)
- Retention policies (compliance-driven)
- Access controls (who can view audit logs)
- GDPR compliance (data deletion impact)

**Implementation**:
```typescript
@Entity('notification_audit_logs')
export class NotificationAuditLog {
  // Immutable fields
  notificationId: string;
  actorId: string;
  action: 'SENT' | 'FAILED' | 'RETRIED' | 'CANCELLED';
  timestamp: Date;
  reason?: string;
  metadata: Record<string, any>;
  
  // Retention tracking
  retentionUntil: Date;
  deletedAt?: Date; // Soft delete for GDPR
}

// Separate from operational logs
// Protected access (admin-only)
// Append-only (no updates)
```

**GDPR Considerations**:
- Audit logs may need to be deleted on user request
- Balance between audit requirements and privacy
- Consider anonymization vs deletion
- Document retention periods clearly

**Estimated Effort**: 1-2 weeks (including compliance review)

---

## Implementation Roadmap

### Phase 1: Critical (Weeks 1-6)
1. **Week 1-4**: Unit tests for core services (realistic: 3-4 weeks)
2. **Week 5-7**: Integration tests (realistic: 2-3 weeks)
3. **Week 8**: Monitoring API endpoints + Provider failure handling

### Phase 2: High Value (Weeks 9-12)
4. **Week 9**: E2E tests (realistic: 2 weeks)
5. **Week 10-11**: Performance optimizations
6. **Week 12**: User notification preferences

### Phase 3: Enhancements (Weeks 13-16)
7. **Week 13-14**: Notification scheduling (with DB storage)
8. **Week 15**: Operational excellence (DLQ, retention, idempotency docs)
9. **Week 16**: CLI tools + Documentation enhancements

### Phase 4: Security & Polish (Weeks 17-20)
10. **Week 17-18**: Security enhancements
11. **Week 19**: Business metrics
12. **Week 20**: Final polish and team training

---

## Quick Wins (Can Do Now)

### 1. Add Health Check Endpoint (30 minutes)
```typescript
@Get('health')
async health() {
  return {
    status: 'ok',
    timestamp: new Date(),
    queues: await this.getQueueStatus(),
  };
}
```

### 2. Add Metrics Endpoint (1 hour)
```typescript
@Get('metrics')
async metrics() {
  return this.metricsService.getSummaryMetrics();
}
```

### 3. Add Test Template (2 hours)
Create a basic test file to establish testing patterns:
```typescript
describe('NotificationSenderService', () => {
  // Basic test structure
});
```

### 4. Add Logging Improvements (1 hour)
- Add correlation IDs to all logs
- Add structured logging
- Add log levels

---

## Metrics to Track

### Code Quality
- [ ] Test coverage: **0%** → **80%+**
- [ ] TypeScript strict mode: **Partial** → **Full**
- [ ] Linter errors: **0**

### Performance
- [ ] Average notification latency: **< 500ms**
- [ ] Queue processing rate: **> 1000/min**
- [ ] Template cache hit rate: **> 80%**

### Reliability
- [ ] Notification delivery rate: **> 99%**
- [ ] Circuit breaker false positives: **< 1%**
- [ ] Idempotency effectiveness: **100%** (within TTL window)
- [ ] Provider fallback success rate: **> 95%** (when primary fails)
- [ ] DLQ processing time: **< 24 hours**

### Observability
- [ ] Metrics endpoint: **✅ Exists**
- [ ] Health check endpoint: **✅ Exists**
- [ ] Dashboard: **❌ Missing**
- [ ] Business metrics: **❌ Missing**

### Business Metrics
- [ ] Notification open rate: **❌ Not tracked**
- [ ] Click-through rate: **❌ Not tracked**
- [ ] Conversion rate: **❌ Not tracked**
- [ ] Per-channel cost effectiveness: **❌ Not tracked**

---

## Recommendations

### Immediate Actions (This Week)
1. ✅ Create monitoring API controller
2. ✅ Add basic health check endpoint
3. ✅ Start writing unit tests (pick one service)

### Short Term (This Month)
1. ✅ Achieve 50% test coverage
2. ✅ Add metrics dashboard (Grafana/Prometheus)
3. ✅ Performance optimizations

### Long Term (Next Quarter)
1. ✅ Achieve 80%+ test coverage
2. ✅ User notification preferences
3. ✅ Notification scheduling
4. ✅ Enhanced documentation

---

## Success Criteria

### Phase 1 Complete When:
- ✅ 80%+ test coverage
- ✅ Monitoring API endpoints exist
- ✅ Health checks working
- ✅ No critical bugs

### Phase 2 Complete When:
- ✅ Performance improved by 20%+
- ✅ User preferences implemented
- ✅ E2E tests passing
- ✅ Documentation complete

### Phase 3 Complete When:
- ✅ All features implemented
- ✅ Security enhancements done
- ✅ Production-ready
- ✅ Team trained

---

## Questions to Consider

1. **Testing Strategy**: Unit tests first, or integration tests?
   - **Recommendation**: Start with unit tests for critical services

2. **Monitoring**: Build custom dashboard or use existing tools?
   - **Recommendation**: Use Grafana + Prometheus (industry standard)

3. **User Preferences**: Simple on/off or advanced scheduling?
   - **Recommendation**: Start simple, add complexity later

4. **Notification Scheduling**: Use BullMQ delayed jobs or separate scheduler?
   - **Recommendation**: Hybrid approach
     - Short delays (< 1 hour): BullMQ delayed jobs
     - Long delays (> 1 hour): Database + cron polling
     - Very long delays (weeks/months): Database only

---

## Resources Needed

### Team
- 1 Backend Developer (full-time for 2-3 months)
- 1 QA Engineer (part-time for testing)
- 1 DevOps Engineer (for monitoring setup)

### Tools
- Testing: Jest (already configured)
- Monitoring: Grafana + Prometheus (recommended)
- Documentation: Mermaid/PlantUML for diagrams

### Infrastructure
- Redis (already exists)
- Database (already exists)
- Monitoring stack (to be set up)

---

---

## Operational Risks

### High Risk Scenarios

1. **Provider Partial Outages**
   - SMS provider down but Email works
   - WhatsApp API rate limits exceeded
   - Email SMTP server unreachable
   - **Mitigation**: Implement fallback channel ordering (Priority 2.5)

2. **Queue Backlog Explosions**
   - Sudden spike in notifications
   - Queue workers can't keep up
   - Redis memory pressure
   - **Mitigation**: Auto-scaling workers, queue monitoring, backpressure

3. **Misconfigured Templates**
   - Missing variables in templates
   - Wrong locale mappings
   - Invalid template syntax
   - **Mitigation**: Template validation on deploy, integration tests

4. **Idempotency Cache Failures**
   - Redis unavailable
   - Cache eviction under load
   - **Mitigation**: Fail-open strategy (already implemented), monitor cache hit rate

5. **Circuit Breaker False Positives**
   - Legitimate failures trigger circuit open
   - Blocks all notifications unnecessarily
   - **Mitigation**: Sliding window (already implemented), manual override capability

6. **Data Retention Explosion**
   - Notification logs grow unbounded
   - Storage costs increase
   - Database performance degrades
   - **Mitigation**: Automated cleanup jobs (Priority 6.5.2)

---

## What We Won't Solve Yet

### Explicitly Out of Scope (For Now)

1. **Multi-Region Deployment**
   - Current system assumes single-region Redis/DB
   - Cross-region replication not addressed
   - **Future Work**: If multi-region needed, redesign required

2. **Real-Time Notification Analytics**
   - Live dashboards with sub-second updates
   - Real-time alerting
   - **Future Work**: Requires event streaming (Kafka/PubSub)

3. **Advanced A/B Testing**
   - Template variants
   - Send time optimization
   - Content personalization
   - **Future Work**: Requires experimentation framework

4. **Notification Batching/Grouping**
   - Group multiple notifications into one
   - Digest emails
   - **Future Work**: Requires batching logic and user preferences

5. **Push Notification Implementation**
   - PUSH channel exists but adapter not implemented
   - **Future Work**: Requires FCM/APNS integration

6. **GraphQL Subscriptions**
   - Real-time updates via GraphQL
   - **Future Work**: Requires GraphQL subscription infrastructure

---

## Architecture Assumptions

### Current System Assumptions

1. **Infrastructure**:
   - Single-region deployment (Redis, Database)
   - Redis is available and performant
   - Database can handle notification log writes
   - **Impact**: Multi-region would require redesign

2. **Provider Availability**:
   - External providers (SMS, Email, WhatsApp) are generally available
   - Provider APIs are stable
   - **Impact**: Provider outages require fallback strategies

3. **Scale**:
   - Current design handles thousands of notifications/minute
   - **Impact**: Millions/minute would require different architecture

4. **Data Consistency**:
   - Eventual consistency acceptable for notifications
   - **Impact**: Strong consistency not guaranteed

5. **Time**:
   - System clock is accurate
   - **Impact**: Scheduled notifications depend on accurate time

---

## Failure Ownership & Escalation

### Ownership Model

| Notification Type | Primary Owner | Escalation Path |
|------------------|---------------|-----------------|
| OTP / Security | Security Team | → Engineering Lead |
| Payment Notifications | Finance Team | → Product Manager |
| Center/Class Updates | Product Team | → Engineering Lead |
| General Notifications | Product Team | → Engineering Lead |

### DLQ Handling Process

1. **Automatic**: Failed notification moves to DLQ after retry exhaustion
2. **Notification**: Owner receives alert (email/Slack)
3. **Investigation**: Owner reviews failure reason
4. **Resolution**: 
   - Fix root cause (if systemic)
   - Manual replay (if one-off)
   - Cancel (if no longer needed)
5. **SLA**: DLQ items reviewed within 24 hours

### Escalation Criteria

- DLQ backlog > 100 items
- Failure rate > 5% for any channel
- Circuit breaker open for > 1 hour
- Queue backlog > 1000 items

---

## Data Retention & Compliance

### Retention Policies

| Data Type | Retention Period | Rationale |
|-----------|------------------|------------|
| Notification Logs | 90 days | Operational debugging |
| Notification Entities (IN_APP) | 365 days | User access to notifications |
| Scheduled Notifications | 30 days after execution | Audit trail |
| Audit Logs | 7 years (2555 days) | Compliance requirements |
| Metrics | 90 days | Performance analysis |
| Idempotency Cache | 1 day (5 min TTL) | Prevent duplicates |

### GDPR Considerations

- **User Data Deletion**: 
  - Notification entities can be deleted on user request
  - Audit logs may need anonymization (not deletion)
  - Balance audit requirements vs. privacy rights

- **Data Minimization**:
  - Only store necessary data in logs
  - Don't log sensitive content (passwords, tokens)

- **Access Controls**:
  - Audit logs: Admin-only access
  - Notification history: User can access own data
  - Metrics: Admin-only access

---

## Idempotency Scope & Limitations

### Current Implementation

**Scope**: Per `correlationId + notificationType + channel + recipient`

**Key Characteristics**:
- **TTL**: 5 minutes (configurable)
- **Purpose**: Prevent duplicate sends within short time window
- **Granularity**: Channel-specific (SMS and Email are independent)

### Limitations

1. **Time Window**: After TTL expires, same notification can be sent again
2. **Different Correlation IDs**: Same notification with different correlationId will be sent
3. **Channel Independence**: SMS and Email are separate idempotency checks
4. **Redis Dependency**: If Redis fails, idempotency is best-effort (fail-open)

### When Duplicates Can Occur

- Same notification sent > 5 minutes apart
- Different correlationId for same event
- Redis unavailable during idempotency check
- Manual replay from DLQ

### Recommendations

- Document idempotency behavior clearly
- Monitor idempotency cache hit rate
- Alert if hit rate drops significantly
- Consider extending TTL for critical notifications

---

**Last Updated**: 2026-01-27
**Next Review**: After Phase 1 completion
**Reviewed By**: Staff Engineer / Architect
