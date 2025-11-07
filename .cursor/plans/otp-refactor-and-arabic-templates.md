# Plan: Refactor OTP_SENT to OTP and Add Arabic Templates

## Overview

This plan covers two main tasks:

1. **Refactor `OTP_SENT` to `OTP`**: Rename all references from `otp-sent`/`OTP_SENT` to `otp`/`OTP`
2. **Add Arabic Templates**: Create Arabic language templates for all notification types

---

## Part 1: Refactor OTP_SENT → OTP

### 1.1 Update Enum and Type Definitions

- [ ] **File**: `src/modules/notifications/enums/notification-type.enum.ts`
  - Change `OTP_SENT = 'OTP_SENT'` → `OTP = 'OTP'`

### 1.2 Update Event Definitions

- [ ] **File**: `src/shared/events/auth.events.enum.ts`
  - Change `OTP_SENT = 'auth.otp.sent'` → `OTP = 'auth.otp.sent'` (keep event string the same for backward compatibility)
- [ ] **File**: `src/modules/auth/events/auth.events.ts`
  - Rename class `OtpSentEvent` → `OtpEvent`
  - Update all references to the class

### 1.3 Update Event Type Map

- [ ] **File**: `src/shared/events/event-type-map.ts`
  - Update `OtpSentEvent` → `OtpEvent` in imports and type map
  - Update `[AuthEvents.OTP_SENT]: OtpSentEvent` → `[AuthEvents.OTP]: OtpEvent`

### 1.4 Update Notification Configuration

- [ ] **File**: `src/modules/notifications/config/notifications.map.ts`
  - Change `[AuthEvents.OTP_SENT]` → `[AuthEvents.OTP]`
  - Change `type: NotificationType.OTP_SENT` → `type: NotificationType.OTP`

- [ ] **File**: `src/modules/notifications/config/required-events.registry.ts`
  - Change `AuthEvents.OTP_SENT` → `AuthEvents.OTP`

### 1.5 Update Manifest

- [ ] **Rename File**: `src/modules/notifications/manifests/auth/otp-sent.manifest.ts` → `otp.manifest.ts`
  - Update export name: `otpSentManifest` → `otpManifest`
  - Change `type: NotificationType.OTP_SENT` → `type: NotificationType.OTP`
  - Change `templateBase: 'auth/otp-sent'` → `templateBase: 'auth/otp'`
  - Update comments

- [ ] **File**: `src/modules/notifications/manifests/registry/notification-registry.ts`
  - Update import: `otpSentManifest` → `otpManifest`
  - Change `[NotificationType.OTP_SENT]` → `[NotificationType.OTP]`

### 1.6 Update Notification Listener

- [ ] **File**: `src/modules/notifications/listeners/notification.listener.ts`
  - Update import: `OtpSentEvent` → `OtpEvent`
  - Update handler: `handleOtpSent` → `handleOtp`
  - Change `@OnEvent(AuthEvents.OTP_SENT)` → `@OnEvent(AuthEvents.OTP)`
  - Update event parameter type: `OtpSentEvent` → `OtpEvent`
  - Update event mapping: `AuthEvents.OTP_SENT` → `AuthEvents.OTP`

### 1.7 Update Verification Service

- [ ] **File**: `src/modules/auth/services/verification.service.ts`
  - Update import: `OtpSentEvent` → `OtpEvent`
  - Update `new OtpSentEvent(...)` → `new OtpEvent(...)`
  - Update `AuthEvents.OTP_SENT` → `AuthEvents.OTP`

### 1.8 Rename Template Files

- [ ] **Rename Files**:
  - `src/i18n/notifications/en/sms/auth/otp-sent.txt` → `otp.txt`
  - `src/i18n/notifications/en/whatsapp/auth/otp-sent.txt` → `otp.txt`
  - `src/i18n/notifications/en/email/auth/otp-sent.hbs` → `otp.hbs`
  - `src/i18n/notifications/en/in-app/auth/otp-sent.json` → `otp.json`
  - `src/i18n/notifications/en/auth/otp-sent.hbs` → `otp.hbs`
  - `src/i18n/notifications/ar/auth/otp-sent.hbs` → `otp.hbs` (if exists)

### 1.9 Update Template Type Generation

- [ ] **File**: `scripts/generate-template-types.ts`
  - Update any hardcoded references to `otp-sent` → `otp`
  - Regenerate types: `npm run generate:template-types`

### 1.10 Update Documentation

- [ ] **Files**: All `.md` files in `docs/` directory
  - Search and replace `OTP_SENT` → `OTP`
  - Search and replace `otp-sent` → `otp`
  - Search and replace `OtpSentEvent` → `OtpEvent`
  - Search and replace `otpSent` → `otp`

### 1.11 Update Validation Scripts

- [ ] **File**: `scripts/validate-notification-listeners.ts`
  - Update `'AuthEvents.OTP_SENT': AuthEvents.OTP_SENT` → `'AuthEvents.OTP': AuthEvents.OTP`

---

## Part 2: Add Arabic Templates

### 2.1 Create Arabic OTP Templates

- [ ] **File**: `src/i18n/notifications/ar/sms/auth/otp.txt`
  - Create SMS template in Arabic
- [ ] **File**: `src/i18n/notifications/ar/whatsapp/auth/otp.txt`
  - Create WhatsApp template in Arabic
- [ ] **File**: `src/i18n/notifications/ar/email/auth/otp.hbs`
  - Create Email template in Arabic (RTL support)
- [ ] **File**: `src/i18n/notifications/ar/in-app/auth/otp.json`
  - Create In-App template in Arabic

### 2.2 Create Arabic Password Reset Templates

- [ ] **File**: `src/i18n/notifications/ar/sms/auth/password-reset.txt`
  - Create SMS template in Arabic
- [ ] **File**: `src/i18n/notifications/ar/whatsapp/auth/password-reset.txt`
  - Create WhatsApp template in Arabic
- [ ] **File**: `src/i18n/notifications/ar/email/auth/password-reset.hbs`
  - Create Email template in Arabic (RTL support)
- [ ] **File**: `src/i18n/notifications/ar/in-app/auth/password-reset.json`
  - Create In-App template in Arabic

### 2.3 Create Arabic Email Verification Templates

- [ ] **File**: `src/i18n/notifications/ar/sms/auth/email-verification.txt`
  - Create SMS template in Arabic
- [ ] **File**: `src/i18n/notifications/ar/whatsapp/auth/email-verification.txt`
  - Create WhatsApp template in Arabic
- [ ] **File**: `src/i18n/notifications/ar/email/auth/email-verification.hbs`
  - Create Email template in Arabic (RTL support)
- [ ] **File**: `src/i18n/notifications/ar/in-app/auth/email-verification.json`
  - Create In-App template in Arabic

### 2.4 Create Arabic Center Created Templates

- [ ] **File**: `src/i18n/notifications/ar/sms/center-created.txt`
  - Create SMS template in Arabic
- [ ] **File**: `src/i18n/notifications/ar/whatsapp/center-created.txt`
  - Create WhatsApp template in Arabic
- [ ] **File**: `src/i18n/notifications/ar/email/center-created.hbs`
  - Create Email template in Arabic (RTL support)
- [ ] **File**: `src/i18n/notifications/ar/in-app/center-created.json`
  - Create In-App template in Arabic

### 2.5 Create Arabic Center Updated Templates

- [ ] **File**: `src/i18n/notifications/ar/sms/center-updated.txt`
  - Create SMS template in Arabic
- [ ] **File**: `src/i18n/notifications/ar/whatsapp/center-updated.txt`
  - Create WhatsApp template in Arabic
- [ ] **File**: `src/i18n/notifications/ar/email/center-updated.hbs`
  - Create Email template in Arabic (RTL support)
- [ ] **File**: `src/i18n/notifications/ar/in-app/center-updated.json`
  - Create In-App template in Arabic

---

## Part 3: Verification

### 3.1 Build and Type Check

- [ ] Run `npm run build` to ensure no TypeScript errors
- [ ] Run `npm run lint` to check for linting issues

### 3.2 Template Validation

- [ ] Run `npm run validate:notification-manifests` to verify all templates exist
- [ ] Ensure no validation errors for Arabic templates

### 3.3 Test Notification Flow

- [ ] Test OTP notification (formerly OTP_SENT) in both English and Arabic
- [ ] Test all other notification types in Arabic
- [ ] Verify templates render correctly with Arabic text

---

## Notes

### Arabic Translation Guidelines

- Use proper Arabic translations for all text
- For email templates, add `dir="rtl"` attribute for RTL support
- Maintain the same variable placeholders (e.g., `{{otpCode}}`, `{{expiresIn}}`)
- Keep the same JSON structure for in-app notifications
- Ensure SMS/WhatsApp templates are concise (character limits)

### Backward Compatibility

- The event string `'auth.otp.sent'` remains the same to maintain backward compatibility with any external systems
- Database records with `OTP_SENT` type will need migration if required (out of scope for this plan)

### Template Structure

- **SMS/WhatsApp**: Plain text, concise, variable placeholders
- **Email**: HTML with RTL support for Arabic, styled, includes variables
- **In-App**: JSON with title, message, priority fields
