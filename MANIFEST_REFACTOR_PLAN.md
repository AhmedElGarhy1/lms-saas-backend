# Manifest Refactoring Plan

## Overview
Refactor notification manifests to:
1. Unify `template` field for all channels (remove `whatsappTemplateName`)
2. Move `requiredVariables` to manifest top level
3. Remove `templateBase` completely

---

## Phase 1: Update Type Definitions

### Files to Modify:
1. **`src/modules/notifications/manifests/types/manifest.types.ts`**
   - Remove `whatsappTemplateName` from `ChannelManifest`
   - Make `template` required (not optional)
   - Remove `requiredVariables` from `ChannelManifest`
   - Add `requiredVariables` to `NotificationManifest` (top level, required)
   - Remove `templateBase` from `NotificationManifest`

---

## Phase 2: Update Services

### Files to Modify:
1. **`src/modules/notifications/services/payload-builder.service.ts`**
   - Change `channelConfig.whatsappTemplateName` to `channelConfig.template`
   - Update WhatsApp payload building logic

2. **`src/modules/notifications/manifests/registry/notification-manifest-resolver.service.ts`**
   - Remove `templateBase` resolution logic
   - Remove `resolveTemplatePath` method (or simplify)
   - Update `resolveChannelTemplate` to not derive from `templateBase`
   - Update `getChannelConfig` to use `template` directly

3. **`src/modules/notifications/renderer/notification-renderer.service.ts`**
   - Update to use `config.template` directly (no derivation)
   - Update `validateRequiredVariables` to use manifest-level `requiredVariables`

4. **`src/modules/notifications/validator/notification-validator.service.ts`**
   - Update validation to check `requiredVariables` at manifest level
   - Remove `whatsappTemplateName` validation
   - Update template path validation

5. **`src/modules/notifications/listeners/notification.listener.ts`**
   - Update `validateEventData` to use manifest-level `requiredVariables`

---

## Phase 3: Update All Manifests

### Files to Refactor:
1. **`src/modules/notifications/manifests/auth/otp.manifest.ts`**
2. **`src/modules/notifications/manifests/auth/password-reset.manifest.ts`**
3. **`src/modules/notifications/manifests/auth/email-verification.manifest.ts`**
4. **`src/modules/notifications/manifests/auth/phone-verified.manifest.ts`**
5. **`src/modules/notifications/manifests/center/center-created.manifest.ts`**
6. **`src/modules/notifications/manifests/center/center-updated.manifest.ts`**

### Changes per manifest:
- Remove `templateBase`
- Move `requiredVariables` from channels to top level (union of all audience needs)
- Change `whatsappTemplateName` to `template` for WhatsApp channels
- Ensure all channels have explicit `template` paths

---

## Phase 4: Update Tests and Fixtures

### Files to Update:
1. **`src/modules/notifications/test/fixtures/manifests.fixture.ts`**
2. **`src/modules/notifications/manifests/registry/notification-manifest-resolver.service.spec.ts`**
3. **`src/modules/notifications/services/payload-builder.service.spec.ts`**
4. Any other test files referencing old structure

---

## Phase 5: Update Default Manifest Generator

### Files to Modify:
1. **`src/modules/notifications/manifests/default-manifest.generator.ts`**
   - Remove `templateBase` generation
   - Add `requiredVariables` at top level

---

## Phase 6: Cleanup and Verification

### Tasks:
1. Remove `TemplateBasePath` type usage (if no longer needed)
2. Update template path generation script (if needed)
3. Run TypeScript compilation
4. Run linter
5. Update any documentation

---

## Summary of Changes

### Type Changes:
- `ChannelManifest.template`: Required, unified for all channels
- `ChannelManifest.whatsappTemplateName`: ❌ Removed
- `ChannelManifest.requiredVariables`: ❌ Removed
- `NotificationManifest.requiredVariables`: ✅ Added (top level, required)
- `NotificationManifest.templateBase`: ❌ Removed

### Service Changes:
- `PayloadBuilderService`: Use `config.template` for WhatsApp
- `NotificationManifestResolver`: Remove templateBase derivation
- `NotificationRenderer`: Use manifest-level `requiredVariables`
- `NotificationValidator`: Validate manifest-level `requiredVariables`

### Manifest Changes:
- All manifests: Remove `templateBase`, move `requiredVariables` to top, unify `template` field

