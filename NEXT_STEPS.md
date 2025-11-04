# Next Steps for Notification System

## ✅ Completed

- [x] Redis module setup (global)
- [x] Notification entities (NotificationLog, NotificationPreference)
- [x] Adapter system (Email, SMS, WhatsApp, Push)
- [x] Template service with Handlebars
- [x] BullMQ queue and processor setup
- [x] Event listener integration
- [x] User preferences system
- [x] Notification sender service
- [x] All events converted to past tense
- [x] Event enums consolidated to shared folder

## 🔄 Immediate Next Steps

### 1. **Add Missing Events & Templates**

- [ ] Add `PASSWORD_RESET_REQUESTED` event to notification mapping
- [ ] Add `EMAIL_VERIFICATION_REQUESTED` event to notification mapping
- [ ] Create password reset template (`password-reset.hbs`)
- [ ] Create email verification template (`email-verification.hbs`)

### 2. **Migrate Existing Services**

- [ ] Update `PasswordResetService` to emit events instead of calling MailerService
- [ ] Update `EmailVerificationService` to emit events instead of calling MailerService
- [ ] Add event listeners for password reset and email verification events

### 3. **Configuration**

- [ ] Add Redis connection environment variables:
  ```env
  REDIS_HOST=localhost
  REDIS_PORT=6379
  REDIS_PASSWORD=  # Optional
  ```
- [ ] Ensure Redis is running locally or configure connection string
- [ ] Test Redis connection

### 4. **Database Setup**

- [ ] Run migrations or ensure TypeORM synchronize creates tables:
  - `notification_logs`
  - `notification_preferences`
- [ ] Verify indexes are created

### 5. **Testing**

- [ ] Test user creation event triggers notification (event: `user.created`)
- [ ] Test center creation event triggers notification (event: `center.created`)
- [ ] Test password reset email notification
- [ ] Test email verification notification
- [ ] Verify notification logs are being created
- [ ] Test user preferences (enable/disable notifications)

### 6. **Template Refinement**

- [ ] Add proper content to all templates
- [ ] Add Arabic templates (`src/i18n/notifications/ar/`)
- [ ] Add variables/data structure documentation for templates

### 7. **Optional Enhancements**

- [ ] Create notification preferences controller/endpoints
- [ ] Add notification history API endpoint
- [ ] Add notification metrics/dashboard
- [ ] Implement rate limiting per user/channel
- [ ] Add notification preview mode

## 📝 Migration Checklist

### Password Reset Service

- [ ] Replace `mailerService.sendPasswordReset()` with event emission
- [ ] Emit `PASSWORD_RESET_REQUESTED` event (already in past tense)
- [ ] Remove MailerService dependency from PasswordResetService

### Email Verification Service

- [ ] Replace `mailerService.sendMail()` with event emission
- [ ] Emit `EMAIL_VERIFICATION_REQUESTED` event (create if needed)
- [ ] Remove MailerService dependency from EmailVerificationService

### Auth Service

- [ ] Verify no direct MailerService calls remain
- [ ] Ensure all email sending goes through events

## 🚀 Quick Start Testing

1. **Start Redis** (if not running):

   ```bash
   redis-server
   ```

2. **Start the application**:

   ```bash
   npm run start:dev
   ```

3. **Test a notification**:
   - Create a user (should trigger `user.created` event)
   - Check notification logs table
   - Verify email was sent (if email config is set)

4. **Check BullMQ dashboard** (optional):
   - Install BullMQ dashboard or use Redis CLI to inspect queue

## 📋 Files to Update Next

1. `src/modules/auth/services/password-reset.service.ts` - Migrate to events
2. `src/modules/auth/services/email-verification.service.ts` - Migrate to events
3. `src/modules/notifications/config/notifications.map.ts` - Add auth events
4. `src/i18n/notifications/en/password-reset.hbs` - Create template
5. `src/i18n/notifications/en/email-verification.hbs` - Create template

## 📝 Event Naming Convention

All events are now in past tense:

- `user.created`, `user.updated`, `user.deleted`, `user.restored`, `user.activated`
- `center.created`, `center.updated`, `center.deleted`, `center.restored`, `center.created.branch`, `center.assigned.owner`
- `branch.created`, `branch.updated`, `branch.deleted`, `branch.restored`
- `staff.created`, `admin.created`
- `role.created`, `role.updated`, `role.deleted`
- `access.control.granted.*`, `access.control.revoked.*`, `access.control.assigned.role`, `access.control.revoked.role`

All event enums are now in `src/shared/events/` folder:

- `src/shared/events/user.events.enum.ts`
- `src/shared/events/center.events.enum.ts`
- `src/shared/events/branch.events.enum.ts`
- `src/shared/events/staff.events.enum.ts`
- `src/shared/events/admin.events.enum.ts`
- `src/shared/events/role.events.enum.ts`
- `src/shared/events/access-control.events.enum.ts`
- `src/shared/events/auth.events.enum.ts`

Event payload classes remain in their respective module folders:

- `src/modules/user/events/user.events.ts` - Event classes only
- `src/modules/centers/events/center.events.ts` - Event classes only
- etc.
