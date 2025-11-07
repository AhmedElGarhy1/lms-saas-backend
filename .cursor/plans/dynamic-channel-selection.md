# Plan: Dynamic Channel Selection for Notifications

## Overview
Add the ability to specify which channels to use when triggering a notification, with optional override of manifest defaults. If channels are not provided, use all channels from the manifest (current behavior).

## Goals
- ✅ Add optional `channels` parameter to notification processing
- ✅ Filter manifest channels if channels are explicitly provided
- ✅ Maintain backward compatibility (if channels not provided, use all from manifest)
- ✅ Validate that provided channels exist in manifest
- ✅ Support runtime flexibility for channel selection

---

## Part 1: Update Type Definitions

### 1.1 Add Optional Channels to ProcessEvent Method
- [ ] **File**: `src/modules/notifications/services/notification.service.ts`
  - Update `processEvent()` method signature to accept optional `channels?: NotificationChannel[]`
  - Pass channels through to `processEventForRecipient()`

### 1.2 Update Processing Context Interface
- [ ] **File**: `src/modules/notifications/services/notification.service.ts`
  - Add `requestedChannels?: NotificationChannel[]` to `NotificationProcessingContext` interface
  - This will store the optional channels provided by the caller

### 1.3 Update ProcessEventForRecipient Method
- [ ] **File**: `src/modules/notifications/services/notification.service.ts`
  - Update `processEventForRecipient()` method signature to accept optional `channels?: NotificationChannel[]`
  - Store channels in context: `context.requestedChannels = channels`

---

## Part 2: Modify Channel Determination Logic

### 2.1 Update determineChannels Method
- [ ] **File**: `src/modules/notifications/services/notification.service.ts`
  - Modify `determineChannels()` to check for `requestedChannels` in context
  - If `requestedChannels` is provided:
    - Get all channels from manifest
    - Filter to only include channels that exist in both `requestedChannels` and manifest
    - Validate that all requested channels exist in manifest (log warning if not)
    - Set `enabledChannels` to filtered list
  - If `requestedChannels` is not provided:
    - Use current behavior (all channels from manifest)

### 2.2 Add Channel Validation Helper
- [ ] **File**: `src/modules/notifications/services/notification.service.ts`
  - Create private method `validateRequestedChannels()`:
    - Takes `requestedChannels: NotificationChannel[]` and `manifest: NotificationManifest`
    - Returns filtered channels that exist in manifest
    - Logs warnings for channels that don't exist in manifest
    - Returns empty array if no valid channels found

---

## Part 3: Update Call Sites

### 3.1 Update NotificationListener
- [ ] **File**: `src/modules/notifications/listeners/notification.listener.ts`
  - Update `handleNotification()` method to accept optional `channels?: NotificationChannel[]`
  - Pass channels to `notificationService.processEvent()`
  - Keep backward compatibility (channels parameter is optional)

### 3.2 Update Event Handlers (Optional Enhancement)
- [ ] **File**: `src/modules/notifications/listeners/notification.listener.ts`
  - Consider if any specific event handlers need channel filtering
  - For now, all handlers will use default (all channels from manifest)
  - This can be extended later if needed

---

## Part 4: Add Public API Method (Optional)

### 4.1 Add Convenience Method for Direct Channel Selection
- [ ] **File**: `src/modules/notifications/services/notification.service.ts`
  - Add public method `triggerNotification()` or `sendNotification()`:
    ```typescript
    async triggerNotification(
      type: NotificationType,
      event: NotificationEvent,
      recipients: RecipientInfo[],
      options?: {
        channels?: NotificationChannel[];
      }
    ): Promise<void>
    ```
  - This method:
    - Looks up event mapping from NotificationType
    - Calls `processEvent()` with channels from options
    - Provides a cleaner API for external callers

---

## Part 5: Documentation and Examples

### 5.1 Update Service Documentation
- [ ] **File**: `src/modules/notifications/services/notification.service.ts`
  - Update JSDoc for `processEvent()` to document optional `channels` parameter
  - Add examples showing usage with and without channels

### 5.2 Add Usage Examples
- [ ] **File**: `docs/NOTIFICATION_MODULE_GUIDE.md`
  - Add section on "Dynamic Channel Selection"
  - Show examples:
    ```typescript
    // Use all channels from manifest (default)
    await notificationService.processEvent(
      AuthEvents.OTP,
      event,
      recipients
    );

    // Use only specific channels
    await notificationService.processEvent(
      AuthEvents.OTP,
      event,
      recipients,
      [NotificationChannel.WHATSAPP, NotificationChannel.SMS]
    );
    ```

### 5.3 Update Type Definitions Documentation
- [ ] **File**: `docs/NOTIFICATION_SYSTEM_COMPLETE_GUIDE.md`
  - Document the new optional channels parameter
  - Explain the filtering logic
  - Show use cases (e.g., "send OTP via WhatsApp if available, fallback to SMS")

---

## Part 6: Testing Considerations

### 6.1 Unit Tests
- [ ] Test `determineChannels()` with:
  - No channels provided (should use all from manifest)
  - Valid channels provided (should filter correctly)
  - Invalid channels provided (should log warning and filter out)
  - Empty channels array provided (should result in no channels)

### 6.2 Integration Tests
- [ ] Test end-to-end notification flow with:
  - Default channels (all from manifest)
  - Specific channels (e.g., only WHATSAPP)
  - Multiple channels (e.g., SMS + EMAIL)
  - Invalid channels (should be filtered out gracefully)

---

## Implementation Details

### Channel Filtering Logic

```typescript
private determineChannels(
  context: Partial<NotificationProcessingContext>,
): void {
  const { manifest, requestedChannels } = context;
  if (!manifest) {
    context.enabledChannels = [];
    return;
  }

  // Get all channels from manifest
  const manifestChannels = this.getChannelsFromManifest(manifest) || [];

  // If specific channels requested, filter manifest channels
  if (requestedChannels && requestedChannels.length > 0) {
    const validChannels = this.validateRequestedChannels(
      requestedChannels,
      manifest,
    );
    context.enabledChannels = validChannels;
  } else {
    // Default: use all channels from manifest
    context.enabledChannels = manifestChannels;
  }
}

private validateRequestedChannels(
  requestedChannels: NotificationChannel[],
  manifest: NotificationManifest,
): NotificationChannel[] {
  const manifestChannels = this.getChannelsFromManifest(manifest) || [];
  const validChannels: NotificationChannel[] = [];
  const invalidChannels: NotificationChannel[] = [];

  for (const channel of requestedChannels) {
    if (manifestChannels.includes(channel)) {
      validChannels.push(channel);
    } else {
      invalidChannels.push(channel);
    }
  }

  // Log warnings for invalid channels
  if (invalidChannels.length > 0) {
    this.logger.warn(
      `Requested channels not available in manifest: ${invalidChannels.join(', ')}`,
      'NotificationService',
      {
        notificationType: manifest.type,
        requestedChannels,
        availableChannels: manifestChannels,
        invalidChannels,
      },
    );
  }

  return validChannels;
}
```

### Method Signature Updates

```typescript
// Main entry point
async processEvent(
  eventName: EventType,
  event: NotificationEvent,
  recipients: RecipientInfo[],
  channels?: NotificationChannel[], // NEW: Optional channels override
): Promise<void>

// Internal processing
private async processEventForRecipient(
  eventName: EventType | string,
  event: NotificationEvent | Record<string, unknown>,
  correlationId: string,
  recipientInfo: RecipientInfo,
  channels?: NotificationChannel[], // NEW: Optional channels override
): Promise<void>
```

---

## Backward Compatibility

✅ **Fully Backward Compatible**
- All existing code continues to work without changes
- `channels` parameter is optional
- If not provided, behavior is identical to current implementation
- No breaking changes to existing APIs

---

## Benefits

1. **Runtime Flexibility**: Choose channels at notification time, not just in manifest
2. **Conditional Logic**: "Send via WhatsApp if available, otherwise SMS"
3. **Cost Optimization**: Send only to necessary channels
4. **User Preferences**: Respect user channel preferences at runtime
5. **A/B Testing**: Test different channel combinations
6. **Emergency Overrides**: Force specific channels for critical notifications

---

## Future Enhancements (Out of Scope)

- Channel priority/fallback logic (e.g., try WhatsApp first, fallback to SMS)
- Per-recipient channel selection (different channels for different users)
- Channel availability checking (skip channels if provider is down)
- Smart channel selection based on message content (e.g., long messages → email only)

