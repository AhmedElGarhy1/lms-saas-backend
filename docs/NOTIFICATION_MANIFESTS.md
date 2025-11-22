# Notification Manifests Guide

## Overview

The Manifest-Driven Notification System provides a type-safe, centralized way to configure notification templates and channels. This system replaces the old configuration-based approach with a more maintainable and type-safe solution. Variables must match exactly what templates expect - event data transformations are handled by `ensureTemplateData` before rendering.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Manifest Structure](#manifest-structure)
3. [Copy-Paste Skeleton](#copy-paste-skeleton)
4. [Best Practices](#best-practices)
5. [Variable Requirements](#variable-requirements)
6. [Channel Configuration](#channel-configuration)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Creating a New Notification Manifest

1. **Create the manifest file** in the appropriate directory:
   - Auth notifications: `src/modules/notifications/manifests/auth/`
   - Center notifications: `src/modules/notifications/manifests/center/`
   - User notifications: `src/modules/notifications/manifests/user/`
   - Branch notifications: `src/modules/notifications/manifests/branch/`

2. **Use the copy-paste skeleton** (see below)

3. **Add to the registry**: Import and add to `src/modules/notifications/manifests/registry/notification-registry.ts`

4. **Create the template**: Add `.hbs` template file in `src/i18n/notifications/en/`

5. **Validate**: Run `npm run validate:notification-manifests` to check for errors

---

## Manifest Structure

### ChannelManifest

```typescript
interface ChannelManifest {
  template: string; // Template path (without .hbs)
  subject?: string; // Required for EMAIL channel
  requiredVariables?: readonly string[]; // Variables template expects (must match template exactly)
  defaultLocale?: string; // Default locale (defaults to 'en')
}
```

### NotificationManifest

```typescript
interface NotificationManifest {
  type: NotificationType; // Notification type enum
  group: NotificationGroup; // Notification group enum
  priority?: number; // 1-10 (higher = more urgent)
  channels: {
    [NotificationChannel.EMAIL]?: ChannelManifest;
    [NotificationChannel.SMS]?: ChannelManifest;
    [NotificationChannel.WHATSAPP]?: ChannelManifest;
    [NotificationChannel.IN_APP]?: ChannelManifest;
    [NotificationChannel.PUSH]?: ChannelManifest;
  };
}
```

---

## Copy-Paste Skeleton

**Copy this skeleton and customize it for your notification type:**

```typescript
/**
 * Copy-paste skeleton for new notification manifests
 *
 * 1. Replace NotificationType.YOUR_TYPE with your type
 * 2. Replace NotificationGroup.YOUR_GROUP with your group
 * 3. Configure channels you need (EMAIL, SMS, WHATSAPP, IN_APP, PUSH)
 * 4. Set requiredVariables to match exactly what your template expects
 *    Note: Event data transformations (e.g., resetUrl → link) are handled by ensureTemplateData
 * 5. Add to NotificationRegistry
 */
import { NotificationManifest } from '../types/manifest.types';
import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationChannel } from '../../enums/notification-channel.enum';
import { NotificationGroup } from '../../enums/notification-group.enum';

export const yourTypeManifest: NotificationManifest = {
  type: NotificationType.YOUR_TYPE, // Replace with your type
  group: NotificationGroup.YOUR_GROUP, // Replace with your group
  priority: 3, // Optional: 1-10 (higher = more urgent)

  channels: {
    // EMAIL channel (required subject)
    [NotificationChannel.EMAIL]: {
      template: 'path/to/your-template', // Without .hbs extension
      subject: 'Your Email Subject', // Required for EMAIL
      requiredVariables: ['var1', 'var2'], // Variables template expects (must match exactly)
      defaultLocale: 'en', // Optional, defaults to 'en'
    },

    // SMS channel
    [NotificationChannel.SMS]: {
      template: 'path/to/your-template',
      requiredVariables: ['var1', 'var2'], // Must match template variable names exactly
      defaultLocale: 'en',
    },

    // WhatsApp channel
    [NotificationChannel.WHATSAPP]: {
      template: 'path/to/your-template',
      requiredVariables: ['var1', 'var2'],
      defaultLocale: 'en',
    },

    // IN_APP channel
    [NotificationChannel.IN_APP]: {
      template: 'path/to/your-template',
      requiredVariables: ['var1', 'var2'],
      defaultLocale: 'en',
    },

    // PUSH channel (requires title in payload, not in manifest)
    [NotificationChannel.PUSH]: {
      template: 'path/to/your-template',
      requiredVariables: ['var1', 'var2'],
      defaultLocale: 'en',
    },

    // Add other channels as needed...
  },
} as const;
```

---

## Best Practices

### 1. **Use Descriptive Template Paths**

```typescript
// ✅ Good
template: 'auth/otp';
template: 'center/center-created';

// ❌ Bad
template: 'template1';
template: 'notif';
```

### 2. **Always Specify Required Variables**

```typescript
// ✅ Good
requiredVariables: ['otp', 'expiresIn', 'userName'];

// ❌ Bad (missing variables will cause runtime errors)
requiredVariables: [];
```

### 3. **Variables Must Match Template Exactly**

```typescript
// ✅ Good - template uses {{otpCode}}, so requiredVariables includes 'otpCode'
requiredVariables: ['otpCode', 'expiresIn'];

// ✅ Good - ensureTemplateData transforms resetUrl → link, so use 'link'
requiredVariables: ['link', 'expiresIn', 'name'];

// ❌ Bad - template uses {{otpCode}} but manifest requires 'otp'
// This will fail validation because template expects 'otpCode'
requiredVariables: ['otp', 'expiresIn']; // Template uses {{otpCode}}, not {{otp}}
```

**Note:** Event data transformations (e.g., `resetUrl` → `link`, `verificationUrl` → `link`) are handled by `ensureTemplateData` before rendering. Use the final variable names that templates expect.

**For WhatsApp:** Variables are extracted directly from event data (no template rendering). The order in `requiredVariables` determines the order of template parameters sent to WhatsApp Business API.

### 4. **Set Appropriate Priority Levels**

```typescript
// Security events (OTP, password reset)
priority: 4 - 5;

// Important updates (center created, user registered)
priority: 3;

// Routine updates (center updated, branch created)
priority: 2;

// Low priority (reminders, notifications)
priority: 1;
```

### 5. **Use Consistent Locale Defaults**

```typescript
// ✅ Good - always specify defaultLocale
defaultLocale: 'en';

// ✅ Also acceptable - defaults to 'en' if omitted
// defaultLocale: 'en', // Optional
```

---

## Variable Requirements

Variables in `requiredVariables` must match exactly what your template expects. Event data transformations are handled by `ensureTemplateData` before rendering.

### How It Works

1. **Event emits data** with event-specific names (e.g., `resetUrl`, `verificationUrl`, `otpCode`)
2. **ensureTemplateData transforms** the data to template-friendly names:
   - `resetUrl` → `link`
   - `verificationUrl` → `link`
   - `otpCode` → `otpCode` (kept as-is, also creates `otp` for backward compatibility)
3. **Renderer validates** that required variables exist in the transformed data
4. **Template renders** using the transformed variable names

### Example: OTP Notification

**Template:**

```handlebars
Your OTP is:
{{otpCode}}
<!-- Template uses {{otpCode}} -->
Expires in:
{{expiresIn}}
minutes
```

**Manifest:**

```typescript
requiredVariables: ['otpCode', 'expiresIn']; // Must match template exactly
```

**Event Data (after ensureTemplateData):**

```typescript
{
  otpCode: '123456',  // Matches template {{otpCode}}
  expiresIn: 10,      // Matches template {{expiresIn}}
  name: 'User'
}
```

### Example: Password Reset

**Template:**

```handlebars
<a href='{{link}}'>Reset Password</a>
<!-- Template uses {{link}} -->
Expires in:
{{expiresIn}}
```

**Manifest:**

```typescript
requiredVariables: ['link', 'expiresIn', 'name']; // Use 'link', not 'resetUrl'
```

**Event Data (before ensureTemplateData):**

```typescript
{
  resetUrl: 'https://...',  // Event uses resetUrl
  expiresIn: '1 hour'
}
```

**Event Data (after ensureTemplateData):**

```typescript
{
  link: 'https://...',  // Transformed to 'link' for template
  resetUrl: 'https://...',  // Original kept for compatibility
  expiresIn: '1 hour',
  name: 'User'
}
```

---

## Channel Configuration

### EMAIL Channel

**Required:**

- `subject`: Email subject line
- `template`: Template path

**Example:**

```typescript
[NotificationChannel.EMAIL]: {
  template: 'auth/password-reset',
  subject: 'Password Reset Request',
  requiredVariables: ['resetUrl', 'expiresIn'],
  defaultLocale: 'en',
}
```

### SMS Channel

**Required:**

- `template`: Template path

**Example:**

```typescript
[NotificationChannel.SMS]: {
  template: 'auth/otp',
  requiredVariables: ['otpCode', 'expiresIn'], // Must match template variable names
  defaultLocale: 'en',
}
```

### WhatsApp Channel

**Required:**

- `whatsappTemplateName`: Pre-approved WhatsApp Business API template name
- `requiredVariables`: Variables that will be extracted from event data as template parameters

**Important Notes:**

- WhatsApp uses **template messages** (not free text) - templates must be pre-approved by WhatsApp Business API
- Template names in `whatsappTemplateName` must match exactly what is approved in your WhatsApp Business account
- Template files are **reference-only** and located in `whatsapp-templates/` at project root
- Variables are extracted from event data and sent as template parameters in the order defined by `requiredVariables`
- The `template` field is optional and only used for reference (not rendered)

**Example:**

```typescript
[NotificationChannel.WHATSAPP]: {
  whatsappTemplateName: 'otp_verification', // Must match approved template name
  requiredVariables: ['otpCode', 'expiresIn'], // Variables in order
  defaultLocale: 'en',
}
```

### IN_APP Channel

**Required:**

- `template`: Template path

**Note:** IN_APP notifications don't require a subject, but the payload should include `title` and `message`.

**Example:**

```typescript
[NotificationChannel.IN_APP]: {
  template: 'auth/otp',
  requiredVariables: ['otp', 'expiresIn'],
  defaultLocale: 'en',
}
```

### PUSH Channel

**Required:**

- `template`: Template path

**Note:** PUSH notifications require `title` in the payload (not in manifest).

**Example:**

```typescript
[NotificationChannel.PUSH]: {
  template: 'notifications/new-message',
  requiredVariables: ['message', 'senderName'],
  defaultLocale: 'en',
}
```

---

## Troubleshooting

### Error: "Missing manifest for type: X"

**Solution:** Add the manifest to `NotificationRegistry` in `notification-registry.ts`:

```typescript
import { yourTypeManifest } from '../path/to/your-manifest';

export const NotificationRegistry = {
  // ...
  [NotificationType.YOUR_TYPE]: yourTypeManifest,
  // ...
};
```

### Error: "Missing template: X:CHANNEL (template-path)"

**Solution:** Create the template file:

1. Create `src/i18n/notifications/en/template-path.hbs`
2. Ensure the template path in manifest matches the file path

### Error: "Missing required template variables: [var1, var2]"

**Solution:**

1. Check what variables your template actually uses (e.g., `{{otpCode}}`, `{{link}}`)
2. Ensure `requiredVariables` matches template variable names exactly
3. Remember that `ensureTemplateData` handles transformations (e.g., `resetUrl` → `link`)
4. Use the transformed variable names in `requiredVariables` (e.g., use `link`, not `resetUrl`)

**For WhatsApp:** Variables are extracted directly from event data. Ensure all variables in `requiredVariables` exist in the event data. The order matters - it determines the order of template parameters sent to WhatsApp.

### Error: "Channel X not supported for type Y"

**Solution:** Add the channel configuration to the manifest:

```typescript
channels: {
  [NotificationChannel.X]: {
    template: 'your-template',
    requiredVariables: ['var1'],
    defaultLocale: 'en',
  },
}
```

### Validation Warnings in CI

**Solution:**

- **Warnings** (non-blocking): Missing manifests for unmigrated types - expected
- **Errors** (blocking): Missing templates or invalid configurations - must fix

Run validation:

```bash
# Local dev (warn-only)
npm run validate:notification-manifests:warn

# CI (strict mode)
npm run validate:notification-manifests
```

---

## Examples

### Example 1: OTP Sent Notification

```typescript
export const otpManifest: NotificationManifest = {
  type: NotificationType.OTP,
  group: NotificationGroup.SECURITY,
  priority: 4,
  audiences: {
    DEFAULT: {
  channels: {
    [NotificationChannel.SMS]: {
      requiredVariables: ['otpCode', 'expiresIn'], // Template uses {{otpCode}}
        },
        [NotificationChannel.WHATSAPP]: {
          whatsappTemplateName: 'otp_verification', // Pre-approved template name
          requiredVariables: ['otpCode', 'expiresIn'], // Variables in order
    },
    [NotificationChannel.EMAIL]: {
      subject: 'Your Verification Code',
      requiredVariables: ['otpCode', 'expiresIn'], // Must match template exactly
        },
      },
    },
  },
} as const;
```

### Example 2: Center Created Notification

```typescript
export const centerCreatedManifest: NotificationManifest = {
  type: NotificationType.CENTER_CREATED,
  group: NotificationGroup.MANAGEMENT,
  priority: 3,
  channels: {
    [NotificationChannel.EMAIL]: {
      template: 'center-created',
      subject: 'New Center Created',
      requiredVariables: ['centerName', 'centerEmail'],
      defaultLocale: 'en',
    },
    [NotificationChannel.WHATSAPP]: {
      template: 'center-created',
      requiredVariables: ['centerName', 'centerEmail'],
      defaultLocale: 'en',
    },
  },
} as const;
```

---

## Migration Checklist

When migrating an existing notification type:

- [ ] Create manifest file in appropriate directory
- [ ] Define all channels used in `NotificationEventsMap`
- [ ] Check template file to see what variables it uses (e.g., `{{otpCode}}`, `{{link}}`)
- [ ] Set `requiredVariables` to match template variable names exactly
- [ ] Remember that `ensureTemplateData` handles transformations (use transformed names)
- [ ] Set appropriate `priority` flag
- [ ] Add manifest to `NotificationRegistry`
- [ ] Create/verify template file exists
- [ ] Run `npm run validate:notification-manifests`
- [ ] Test notification sending end-to-end
- [ ] Update this documentation if needed

---

## Related Files

- **Manifest Types**: `src/modules/notifications/manifests/types/manifest.types.ts`
- **Registry**: `src/modules/notifications/manifests/registry/notification-registry.ts`
- **Renderer**: `src/modules/notifications/renderer/notification-renderer.service.ts`
- **Validator**: `src/modules/notifications/validator/notification-validator.service.ts`
- **Templates**: `src/i18n/notifications/en/`
- **Validation Script**: `scripts/validate-notification-manifests.ts`

---

## Support

For questions or issues:

1. Check this documentation
2. Review existing manifest examples
3. Run validation script to identify errors
4. Check application logs for detailed error messages
