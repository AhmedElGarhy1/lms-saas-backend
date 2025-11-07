# Multi-Audience Notification System - Refactoring Plan

## Overview

This plan outlines the refactoring needed to support multi-audience notifications, where different audiences (e.g., ADMIN, OWNER, STAFF) can receive different channels, templates, and configurations for the same notification type.

## Goals

1. Support multiple audiences per notification type
2. Each audience can have different channels and configurations
3. Maintain backward compatibility with existing single-audience manifests
4. Add new `trigger()` method that accepts `audience` parameter
5. Update all related services to handle audience-based resolution

---

## Phase 1: Type System Updates

### 1.1 Update Manifest Types

**File**: `src/modules/notifications/manifests/types/manifest.types.ts`

**Changes**:
- Add `AudienceManifest` interface
- Update `NotificationManifest` to support both:
  - Legacy: `channels` (for backward compatibility)
  - New: `audiences` (for multi-audience support)
- Add type guards to distinguish between manifest formats

**New Types**:
```typescript
/**
 * Audience identifier (e.g., 'ADMIN', 'OWNER', 'STAFF')
 */
export type AudienceId = string;

/**
 * Configuration for a single audience
 * Defines channels and configurations specific to this audience
 */
export interface AudienceManifest {
  /** Channel-specific configurations for this audience */
  channels: {
    [NotificationChannel.EMAIL]?: ChannelManifest;
    [NotificationChannel.SMS]?: ChannelManifest;
    [NotificationChannel.WHATSAPP]?: ChannelManifest;
    [NotificationChannel.IN_APP]?: ChannelManifest;
    [NotificationChannel.PUSH]?: ChannelManifest;
  };
}

/**
 * Updated NotificationManifest supporting both formats
 */
export interface NotificationManifest {
  type: NotificationType;
  group: NotificationGroup;
  templateBase?: TemplateBasePath;
  priority?: number;
  localized?: boolean;
  requiresAudit?: boolean;
  
  // Legacy format (for backward compatibility)
  channels?: {
    [NotificationChannel.EMAIL]?: ChannelManifest;
    [NotificationChannel.SMS]?: ChannelManifest;
    [NotificationChannel.WHATSAPP]?: ChannelManifest;
    [NotificationChannel.IN_APP]?: ChannelManifest;
    [NotificationChannel.PUSH]?: ChannelManifest;
  };
  
  // New multi-audience format
  audiences?: {
    [audienceId: string]: AudienceManifest;
  };
}

/**
 * Type guard to check if manifest uses audiences format
 */
export function hasAudiences(manifest: NotificationManifest): manifest is NotificationManifest & { audiences: Record<string, AudienceManifest> } {
  return manifest.audiences !== undefined && Object.keys(manifest.audiences).length > 0;
}

/**
 * Type guard to check if manifest uses legacy channels format
 */
export function hasLegacyChannels(manifest: NotificationManifest): manifest is NotificationManifest & { channels: Record<NotificationChannel, ChannelManifest> } {
  return manifest.channels !== undefined && Object.keys(manifest.channels).length > 0;
}
```

---

## Phase 2: Manifest Resolver Updates

### 2.1 Update NotificationManifestResolver

**File**: `src/modules/notifications/manifests/registry/notification-manifest-resolver.service.ts`

**Changes**:
- Add `getAudienceConfig()` method
- Update `getChannelConfig()` to support both formats
- Add `getAvailableAudiences()` method
- Add `resolveManifestForAudience()` method

**New Methods**:
```typescript
/**
 * Get audience configuration from a manifest
 * @param manifest - Notification manifest
 * @param audience - Audience identifier
 * @returns Audience manifest configuration
 * @throws Error if audience is not supported
 */
getAudienceConfig(
  manifest: NotificationManifest,
  audience: AudienceId,
): AudienceManifest {
  if (!hasAudiences(manifest)) {
    throw new Error(
      `Manifest for ${manifest.type} does not support audiences. Use legacy channels format.`,
    );
  }

  const audienceConfig = manifest.audiences[audience];
  if (!audienceConfig) {
    throw new Error(
      `Audience ${audience} not supported for type ${manifest.type}. Available: ${Object.keys(manifest.audiences).join(', ')}`,
    );
  }

  return audienceConfig;
}

/**
 * Get channel configuration for a specific audience
 * @param manifest - Notification manifest
 * @param audience - Audience identifier
 * @param channel - Notification channel
 * @returns Channel manifest configuration with resolved template path
 */
getChannelConfigForAudience(
  manifest: NotificationManifest,
  audience: AudienceId,
  channel: NotificationChannel,
): ChannelManifest {
  const audienceConfig = this.getAudienceConfig(manifest, audience);
  const config = audienceConfig.channels[channel];

  if (!config) {
    throw new Error(
      `Channel ${channel} not supported for audience ${audience} in type ${manifest.type}`,
    );
  }

  // Resolve template path (same logic as before)
  return this.resolveChannelTemplate(manifest, config);
}

/**
 * Get available audiences for a manifest
 * @param manifest - Notification manifest
 * @returns Array of audience IDs, or empty array if using legacy format
 */
getAvailableAudiences(manifest: NotificationManifest): AudienceId[] {
  if (hasAudiences(manifest)) {
    return Object.keys(manifest.audiences);
  }
  return [];
}

/**
 * Resolve manifest for a specific audience (converts to legacy format internally)
 * Used internally to normalize audience-based manifests
 */
resolveManifestForAudience(
  manifest: NotificationManifest,
  audience: AudienceId,
): NotificationManifest & { channels: Record<NotificationChannel, ChannelManifest> } {
  if (hasAudiences(manifest)) {
    const audienceConfig = this.getAudienceConfig(manifest, audience);
    return {
      ...manifest,
      channels: audienceConfig.channels,
    };
  }
  
  // Legacy format - return as-is
  if (hasLegacyChannels(manifest)) {
    return manifest as NotificationManifest & { channels: Record<NotificationChannel, ChannelManifest> };
  }
  
  throw new Error(`Manifest ${manifest.type} has neither channels nor audiences`);
}
```

---

## Phase 3: Service Layer Updates

### 3.1 Add `trigger()` Method to NotificationService

**File**: `src/modules/notifications/services/notification.service.ts`

**Changes**:
- Add new `trigger()` method that accepts `audience` parameter
- Update `processEvent()` to handle audience-based manifests
- Update `lookupMapping()` to support audience resolution
- Update `determineChannels()` to work with audience-specific channels

**New Interface**:
```typescript
interface TriggerOptions {
  audience?: AudienceId;
  event: NotificationEvent | Record<string, unknown>;
  recipients: RecipientInfo[];
  channels?: NotificationChannel[];
}
```

**New Method**:
```typescript
/**
 * Trigger a notification with optional audience specification
 * This is the new preferred method for sending notifications
 * 
 * @param type - Notification type
 * @param options - Trigger options including audience, event, recipients, and optional channels
 */
async trigger(
  type: NotificationType,
  options: TriggerOptions,
): Promise<void> {
  const { audience, event, recipients, channels } = options;
  
  // Get manifest
  const manifest = this.manifestResolver.getManifest(type);
  
  // Resolve manifest for audience if specified
  const resolvedManifest = audience
    ? this.manifestResolver.resolveManifestForAudience(manifest, audience)
    : manifest;
  
  // Use existing processEvent logic but with resolved manifest
  // We'll need to pass manifest through the pipeline
  await this.processEventWithManifest(
    type,
    event,
    recipients,
    resolvedManifest,
    channels,
  );
}
```

### 3.2 Update Processing Context

**File**: `src/modules/notifications/services/notification.service.ts`

**Changes**:
- Add `audience` to `NotificationProcessingContext`
- Update pipeline to use audience-resolved manifest

---

## Phase 4: Listener Updates

### 4.1 Update NotificationListener

**File**: `src/modules/notifications/listeners/notification.listener.ts`

**Changes**:
- Update `handleCenterCreated()` to use new `trigger()` method
- Add examples for other multi-audience events

**Example**:
```typescript
@OnEvent(CenterEvents.CREATED)
async handleCenterCreated(
  event: ValidateEvent<CreateCenterEvent, CenterEvents.CREATED>,
) {
  const owner: RecipientInfo = {
    userId: event.center.ownerId,
    email: event.center.ownerEmail,
    phone: event.center.ownerPhone,
    locale: event.center.ownerLocale || 'en',
    profileId: event.center.ownerProfileId,
    profileType: ProfileType.OWNER,
    centerId: event.center.id,
  };

  const admin: RecipientInfo = {
    userId: event.createdBy.id,
    email: event.createdBy.email,
    phone: event.createdBy.getPhone(),
    locale: event.createdBy.userInfo?.locale || 'en',
    profileId: event.createdBy.userProfileId,
    profileType: event.createdBy.profileType,
    centerId: event.center.id,
  };

  // Send to owner audience
  await this.notificationService.trigger(NotificationType.CENTER_CREATED, {
    audience: 'OWNER',
    event,
    recipients: [owner],
  });

  // Send to admin audience
  await this.notificationService.trigger(NotificationType.CENTER_CREATED, {
    audience: 'ADMIN',
    event,
    recipients: [admin],
  });
}
```

---

## Phase 5: Manifest Updates

### 5.1 Update Center Created Manifest

**File**: `src/modules/notifications/manifests/center/center-created.manifest.ts`

**Changes**:
- Convert to multi-audience format
- Define ADMIN and OWNER audiences with different channels

**New Manifest**:
```typescript
export const centerCreatedManifest: NotificationManifest = {
  type: NotificationType.CENTER_CREATED,
  group: NotificationGroup.MANAGEMENT,
  priority: 3,
  requiresAudit: true,
  templateBase: 'center/center-created',
  audiences: {
    ADMIN: {
      channels: {
        [NotificationChannel.IN_APP]: {
          requiredVariables: ['creatorName', 'centerName'],
        },
      },
    },
    OWNER: {
      channels: {
        [NotificationChannel.EMAIL]: {
          subject: 'Your new center is ready!',
          requiredVariables: ['centerName', 'ownerName'],
        },
        [NotificationChannel.IN_APP]: {
          requiredVariables: ['centerName'],
        },
      },
    },
  },
} as const;
```

### 5.2 Keep Existing Manifests (Backward Compatibility)

**Files**: All other manifest files

**Changes**:
- Keep existing manifests in legacy `channels` format
- They will continue to work without changes
- Can be migrated to audiences format later if needed

---

## Phase 6: Template Resolution Updates

### 6.1 Update NotificationRenderer

**File**: `src/modules/notifications/renderer/notification-renderer.service.ts`

**Changes**:
- Update to handle audience-based manifest resolution
- Ensure template paths resolve correctly for audiences

---

## Phase 7: Validation Updates

### 7.1 Update NotificationValidator

**File**: `src/modules/notifications/validator/notification-validator.service.ts`

**Changes**:
- Update to validate all audiences
- Check templates for each audience's channels
- Validate required variables per audience

**New Validation Logic**:
```typescript
// For each manifest
if (hasAudiences(manifest)) {
  // Validate each audience
  for (const [audienceId, audienceConfig] of Object.entries(manifest.audiences)) {
    for (const channel of Object.keys(audienceConfig.channels) as NotificationChannel[]) {
      // Validate template exists for all locales
      for (const locale of supportedLocales) {
        // Check template...
      }
    }
  }
} else if (hasLegacyChannels(manifest)) {
  // Existing validation logic
}
```

---

## Phase 8: Type Safety Enhancements

### 8.1 Create Audience Type Definitions

**File**: `src/modules/notifications/types/audience.types.ts` (new)

**Purpose**: Define known audience types for better type safety

```typescript
/**
 * Known audience identifiers
 * Extend this as needed for new audiences
 */
export enum KnownAudience {
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
  STAFF = 'STAFF',
  TEACHER = 'TEACHER',
  PARENT = 'PARENT',
  STUDENT = 'STUDENT',
}

export type AudienceId = KnownAudience | string;
```

---

## Phase 9: Documentation Updates

### 9.1 Update Documentation

**Files**: 
- `docs/NOTIFICATION_MODULE_GUIDE.md`
- `docs/NOTIFICATION_MANIFESTS.md`

**Changes**:
- Add section on multi-audience notifications
- Document `trigger()` method
- Provide examples of audience-based manifests
- Explain backward compatibility

---

## Phase 10: Testing & Migration

### 10.1 Test Plan

1. **Unit Tests**:
   - Test `getAudienceConfig()` with valid/invalid audiences
   - Test `resolveManifestForAudience()` conversion
   - Test `trigger()` method with audiences
   - Test backward compatibility with legacy manifests

2. **Integration Tests**:
   - Test full notification flow with audiences
   - Test multiple audiences for same event
   - Test template resolution for audiences

3. **Migration Tests**:
   - Verify existing manifests still work
   - Verify new audience-based manifests work
   - Test mixed usage (some events with audiences, some without)

### 10.2 Migration Strategy

1. **Phase 1**: Deploy type system updates (backward compatible)
2. **Phase 2**: Deploy service updates (backward compatible)
3. **Phase 3**: Migrate one manifest (center-created) to test
4. **Phase 4**: Update listener for center-created event
5. **Phase 5**: Monitor and validate
6. **Phase 6**: Migrate other manifests as needed

---

## Implementation Order

1. ✅ **Phase 1**: Type System Updates
2. ✅ **Phase 2**: Manifest Resolver Updates
3. ✅ **Phase 3**: Service Layer Updates
4. ✅ **Phase 4**: Listener Updates
5. ✅ **Phase 5**: Manifest Updates (center-created)
6. ✅ **Phase 6**: Template Resolution Updates
7. ✅ **Phase 7**: Validation Updates
8. ✅ **Phase 8**: Type Safety Enhancements
9. ✅ **Phase 9**: Documentation Updates
10. ✅ **Phase 10**: Testing & Migration

---

## Backward Compatibility

- ✅ Existing manifests with `channels` continue to work
- ✅ Existing `processEvent()` calls continue to work
- ✅ New `trigger()` method is additive (doesn't break existing code)
- ✅ Type guards ensure runtime safety
- ✅ Gradual migration path (migrate manifests one at a time)

---

## Key Design Decisions

1. **Dual Format Support**: Support both `channels` and `audiences` formats for backward compatibility
2. **Type Guards**: Use type guards to safely distinguish between formats
3. **Internal Normalization**: Convert audience-based manifests to legacy format internally for processing
4. **Explicit Audience**: Require explicit audience parameter in `trigger()` for clarity
5. **Template Resolution**: Templates can be per-audience or shared via `templateBase`

---

## Risks & Mitigations

1. **Risk**: Breaking existing notifications
   - **Mitigation**: Maintain backward compatibility, extensive testing

2. **Risk**: Complex type system
   - **Mitigation**: Use type guards and clear interfaces

3. **Risk**: Template path confusion
   - **Mitigation**: Clear documentation and validation

4. **Risk**: Performance impact
   - **Mitigation**: Minimal overhead (just manifest resolution)

---

## Success Criteria

- ✅ Multi-audience manifests work correctly
- ✅ Legacy manifests continue to work
- ✅ `trigger()` method works as expected
- ✅ All templates validate correctly
- ✅ No breaking changes to existing code
- ✅ Documentation is updated
- ✅ Tests pass

---

## Notes

- Audience IDs are case-sensitive strings
- Each audience can have completely different channels
- Templates can be shared via `templateBase` or per-audience
- Required variables can differ per audience/channel
- Email subjects can differ per audience/channel


