<!-- 537c7f56-9112-4044-9c13-315fc908348b 55b06774-b249-4b7a-ba45-27f81bfef5e4 -->
# Notifications Config System Enhancements Plan

## Overview

Comprehensive improvements to the notifications configuration system to make it more flexible, robust, and feature-rich. This includes implementing profile-scoped channels, dynamic channel selection, template fallbacks, expanded priorities, richer metadata, analytics, security enhancements, and validation.

## Revised Implementation Order (Optimized Dependencies)

### Phase 1: Core Infrastructure (Foundation)

### Phase 2: Profile-Scoped Channels Implementation

### Phase 3: Dynamic Channel Selection (Moved earlier - needed for metadata)

### Phase 4: Template Fallbacks and Error Handling

### Phase 5: Expanded Priority System

### Phase 6: Richer Metadata and Security

### Phase 7: Analytics and Delivery Tracking

### Phase 8: Validation and Testing

### Phase 9: Future-Proofing

### Phase 10: Documentation and Migration

## Detailed Implementation Plan

### Phase 1: Core Infrastructure (Foundation)

#### 1.1 Enhanced NotificationEventMapping Interface

**File**: `src/modules/notifications/config/notifications.map.ts`

**Changes**:

- Add `expiryTime?: number` (in seconds) for time-limited notifications
- Add `actionType?: NotificationActionType` for IN_APP notification actions
- Add `context?: Record<string, any>` for analytics/metadata
- Add `requiresAudit?: boolean` for security events
- Add `defaultChannels?: NotificationChannel[]` for fallback when dynamic selection fails
- Expand priority range: `priority?: number` (1-10 instead of 1-3)

**New Interface**:

```typescript
export interface NotificationEventMapping {
  type: NotificationType;
  channels: NotificationChannel[] | Record<ProfileType, NotificationChannel[]>;
  template: string;
  group: NotificationGroup;
  priority?: number; // 1-10 (higher = more urgent)
  localized?: boolean;
  profileScoped?: boolean;
  expiryTime?: number; // in seconds for time-limited notifications
  actionType?: NotificationActionType; // for IN_APP notifications
  context?: Record<string, any>; // analytics/metadata
  requiresAudit?: boolean; // for security events
  defaultChannels?: NotificationChannel[]; // fallback for dynamic selection
}
```

#### 1.2 Default Notification Mapping with Severity Logging

**File**: `src/modules/notifications/config/notifications.map.ts`

**Changes**:

- Add `DEFAULT_NOTIFICATION_MAPPING` constant
- Use default mapping when event not found in map
- Log unmapped events with severity levels:
  - `INFO`: Low-risk events (user updates, general info)
  - `WARN`: Important events (deletions, security events)
  - `ERROR`: Critical system events (should never be unmapped)

**Implementation**:

```typescript
export const DEFAULT_NOTIFICATION_MAPPING: NotificationEventMapping = {
  type: NotificationType.SYSTEM,
  channels: [NotificationChannel.IN_APP],
  template: 'default',
  group: NotificationGroup.SYSTEM,
  priority: 1,
};

// Helper function to determine log severity
function getUnmappedEventSeverity(eventName: string): 'info' | 'warn' | 'error' {
  // Security events: WARN
  if (eventName.includes('AUTH') || eventName.includes('SECURITY')) return 'warn';
  // Deletions: WARN
  if (eventName.includes('DELETE')) return 'warn';
  // System critical: ERROR
  if (eventName.includes('SYSTEM') || eventName.includes('CRITICAL')) return 'error';
  // Default: INFO
  return 'info';
}
```

### Phase 2: Profile-Scoped Channels Implementation

#### 2.1 Update Management Event Mappings

**File**: `src/modules/notifications/config/notifications.map.ts`

**Changes**:

- Convert Center events to profile-scoped channels:
  - `ADMIN`: IN_APP + EMAIL (formal documentation)
  - `STAFF`: IN_APP + WHATSAPP (quick communication)
  - `ASSISTANT`: IN_APP only (basic notifications)
- Convert Branch events to profile-scoped channels:
  - `STAFF`: IN_APP + WHATSAPP
  - `ASSISTANT`: IN_APP only

**Example**:

```typescript
[CenterEvents.CREATE]: {
  type: NotificationType.CENTER_CREATED,
  channels: {
    [ProfileType.ADMIN]: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    [ProfileType.STAFF]: [NotificationChannel.IN_APP, NotificationChannel.WHATSAPP],
    [ProfileType.ASSISTANT]: [NotificationChannel.IN_APP],
  },
  template: 'center-created',
  group: NotificationGroup.MANAGEMENT,
  localized: true,
  profileScoped: true,
  defaultChannels: [NotificationChannel.IN_APP], // Fallback if profile type unknown
}
```

### Phase 3: Dynamic Channel Selection (Moved Earlier)

#### 3.1 Channel Selection Service

**New File**: `src/modules/notifications/services/channel-selection.service.ts`

**Purpose**: Determines optimal channels based on user activity, urgency, and context.

**Features**:

- Check user last activity (last login, last app open)
- If user inactive > 24h → prefer SMS/EMAIL over IN_APP
- For critical events (priority >= 8) → force SMS/EMAIL even if IN_APP enabled
- Context-aware selection based on event type
- **Performance**: Batch user activity checks to reduce database queries
- **Fallback**: Use `defaultChannels` from mapping if selection fails

**Methods**:

- `selectOptimalChannels(userId, baseChannels, eventContext, mapping): Promise<NotificationChannel[]>`
- `isUserActive(userId, hoursThreshold = 24): Promise<boolean>`
- `shouldForceUrgentChannel(priority, channels): boolean`
- `batchCheckUserActivity(userIds): Promise<Map<string, boolean>>` (for performance)

**Implementation Notes**:

- Cache user activity checks (TTL: 1 hour) to avoid repeated queries
- Use async processing for analytics to avoid blocking notification sending
- Batch multiple user activity checks in single query when possible

#### 3.2 Integrate with NotificationListener

**File**: `src/modules/notifications/listeners/notification.listener.ts`

**Changes**:

- Inject `ChannelSelectionService`
- Call `selectOptimalChannels()` after preference filtering
- Use dynamic selection result instead of static channels
- Fallback to `mapping.defaultChannels` or `mapping.channels` if selection fails

### Phase 4: Template Fallbacks and Error Handling

#### 4.1 Enhanced Template Service

**File**: `src/modules/notifications/services/notification-template.service.ts`

**Changes**:

- Add `loadTemplateWithFallback()` method:
  - Try requested locale
  - Fallback to English
  - Fallback to 'default' template
  - Return null if all fail (with logging)
- Add `renderTemplateSafe()` method:
  - Handle missing template gracefully
  - Handle missing data fields with defaults
  - **Log missing template variables per event type** (for debugging)
  - Return fallback content

**Implementation**:

```typescript
async loadTemplateWithFallback(
  templateName: string,
  locale: string = 'en',
): Promise<HandlebarsTemplateDelegate | null> {
  // Try locale -> en -> default -> null with logging
}

async renderTemplateSafe(
  templateName: string,
  data: Record<string, any>,
  locale: string = 'en',
  eventType?: string,
): Promise<string> {
  const template = await this.loadTemplateWithFallback(templateName, locale);
  if (!template) {
    return this.getFallbackContent(eventType);
  }
  
  // Detect missing variables
  const missingVars = this.detectMissingVariables(template, data);
  if (missingVars.length > 0) {
    this.logger.warn(
      `Missing template variables for ${eventType}: ${missingVars.join(', ')}`,
      'NotificationTemplateService',
      { eventType, templateName, locale, missingVars }
    );
  }
  
  // Render with defaults
  return this.renderWithDefaults(template, data, missingVars);
}

private detectMissingVariables(
  template: HandlebarsTemplateDelegate,
  data: Record<string, any>
): string[] {
  // Extract variables from template and check against data
  // Return array of missing variable names
}
```

#### 4.2 Data Field Fallbacks

**File**: `src/modules/notifications/listeners/notification.listener.ts`

**Changes**:

- Add `ensureTemplateData()` method:
  - Ensure `name` has fallback: `event.name || 'User'`
  - Ensure `link` has fallback for auth events
  - Ensure `expiresIn` has default
  - Add missing fields with sensible defaults
  - Log missing fields for debugging

### Phase 5: Expanded Priority System

#### 5.1 Priority Levels Documentation (1-10)

**New File**: `src/modules/notifications/config/PRIORITY_GUIDELINES.md`

**Priority Guidelines Table**:

| Priority | Level | Use Cases | Examples |

|----------|-------|-----------|----------|

| 1-3 | Normal | General updates, informational | User updates, center updates |

| 4-6 | Important | Business events, activations | User activated, center created |

| 7-8 | High | Critical changes, deletions | Center deleted, branch deleted |

| 9 | Critical | Security events | Password reset, OTP sent |

| 10 | Urgent | System alerts, emergencies | System failures, critical alerts |

**File**: `src/modules/notifications/config/notifications.map.ts`

**Update Existing Mappings**:

- Keep priority 1-3 as-is for normal notifications
- Security events: priority 9 (password reset, OTP, email verification)
- Critical deletions: priority 7 (center/branch deleted)
- System alerts: priority 10 (future use)

#### 5.2 Priority-Based Queue Processing

**File**: `src/modules/notifications/listeners/notification.listener.ts`

**Changes**:

- Use expanded priority (1-10) in BullMQ job options
- Ensure priority scales correctly (higher = more urgent)
- Document priority mapping in code comments

### Phase 6: Richer Metadata and Security

#### 6.1 Update Mappings with Metadata

**File**: `src/modules/notifications/config/notifications.map.ts`

**Changes**:

- Add `expiryTime` to security events (OTP: 600s, password reset: 3600s)
- Add `actionType` to IN_APP notifications
- Add `requiresAudit: true` to security events
- Add `context` metadata for analytics

**Example**:

```typescript
[AuthEvents.OTP_SENT]: {
  // ... existing fields
  expiryTime: 600, // 10 minutes
  actionType: NotificationActionType.COPY_TEXT,
  requiresAudit: true,
  context: { category: 'security', sensitive: true },
  defaultChannels: [NotificationChannel.SMS], // Fallback if dynamic selection fails
}
```

#### 6.2 Audit Logging for Security Events

**New File**: `src/modules/notifications/services/notification-audit.service.ts`

**Purpose**: Special audit logging for security-related notifications.

**Features**:

- Log security notification sends with full context
- Track link/token expiration
- Log access attempts to expired links
- **Automatic revocation**: Mark expired notifications as invalid
- Store audit trail in separate table
- Prevent replay attacks by tracking used tokens/links

**Methods**:

- `logSecurityNotification(notificationId, userId, eventType, context)`
- `checkExpiration(notificationId): boolean`
- `revokeExpired(notificationId): Promis

### To-dos

- [ ] Enhance NotificationEventMapping interface: add expiryTime, actionType, context, requiresAudit, defaultChannels fields. Expand priority to 1-10 range.
- [ ] Add DEFAULT_NOTIFICATION_MAPPING constant and use it when event not found in map. Log unmapped events for debugging.
- [ ] Update Center and Branch event mappings to use profile-scoped channels (ADMIN: EMAIL, STAFF: WHATSAPP, ASSISTANT: IN_APP only)
- [ ] Create ChannelSelectionService with methods: selectOptimalChannels(), isUserActive(), shouldForceUrgentChannel(). Check user activity and apply dynamic channel selection rules.
- [ ] Integrate ChannelSelectionService into NotificationListener. Apply dynamic channel selection after preference filtering.
- [ ] Add loadTemplateWithFallback() and renderTemplateSafe() methods to NotificationTemplateService. Implement locale -> en -> default -> null fallback chain. Handle missing data fields gracefully.
- [ ] Add ensureTemplateData() method to NotificationListener. Ensure all required template fields have defaults (name, link, expiresIn).
- [ ] Update existing mappings to use expanded priority range (1-10). Set security events to priority 9, critical deletions to 7, system alerts to 10.
- [ ] Add expiryTime, actionType, requiresAudit, and context fields to security and management event mappings in notifications.map.ts
- [ ] Create NotificationAuditService for security event logging. Track link/token expiration, access attempts, and store audit trail.
- [ ] Add expiration timestamp handling in NotificationListener. Include expiryTime in template data and NotificationLog metadata.
- [ ] Create NotificationAnalyticsService to track delivery success/failure, user engagement (opened, clicked, dismissed), and channel effectiveness.
- [ ] Add analytics tracking hooks in InAppAdapter and NotificationSenderService. Track delivery and engagement events.
- [ ] Create validate-config.ts script to validate notification mappings: templates exist, required fields present, no conflicting priorities, valid channels/enums.
- [ ] Create validate-templates.ts script to validate all templates exist, use valid Handlebars syntax, and document required variables.
- [ ] Create __tests__/notifications.map.spec.ts with tests for mappings, profile-scoped channels, default mapping, and priority ranges.
- [ ] Create TemplateEngine interface and abstraction to support multiple engines (Handlebars, Markdown, HTML) for future extensibility.
- [ ] Create BatchNotificationService for high-volume events: group similar notifications, send digests, rate limiting, batch template rendering.
- [ ] Update ADAPTERS_DOCUMENTATION.md and create NOTIFICATIONS_CONFIG_DOCUMENTATION.md with new features: profile-scoped channels, dynamic selection, template fallbacks, analytics.
- [ ] Create MIGRATION_GUIDE_NOTIFICATIONS.md with instructions for migrating to profile-scoped channels, adding new mappings, using metadata fields, and analytics.