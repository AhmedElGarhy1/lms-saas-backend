# Sessions Module - Frontend Integration Guide

## Overview

The Sessions Module manages class sessions in the Learning Management System. This guide explains how to integrate with the sessions API and use all available features correctly.

---

## Understanding Sessions

### What is a Session?

A **Session** represents a single class meeting. Each session has:

- A specific date and time (start and end)
- A group it belongs to
- A status (Scheduled, Conducting, Finished, or Canceled)
- An optional title/topic

### Two Types of Sessions

Sessions come in two types, each with different rules:

#### 1. Scheduled Sessions (System-Generated)

- **Created by**: The system automatically
- **When**: When a class becomes active or when schedules are updated
- **Purpose**: Represents the official curriculum schedule
- **Can be deleted?**: ❌ No - Only canceled
- **Can be canceled?**: ✅ Yes
- **Why this restriction?**: These are the "official record" - they must remain in the database for audit purposes (e.g., parent reports showing why a class didn't happen)

#### 2. Extra Sessions (Manual)

- **Created by**: Users (secretaries/admins) manually
- **When**: For makeup classes, workshops, or special events
- **Purpose**: One-off sessions that aren't part of the regular schedule
- **Can be deleted?**: ✅ Yes
- **Can be canceled?**: ✅ Yes
- **Why this flexibility?**: These are manually created and can be removed if created by mistake

---

## Core Features

### 1. Creating Sessions

#### Creating Extra Sessions

You can create manual/extra sessions through the API. These are useful for:

- Makeup classes
- Special workshops
- One-time events

**Important Notes:**

- The system will automatically check for conflicts (teacher or group conflicts)
- If a conflict is detected, the creation will fail with a clear error message
- Extra sessions are never automatically deleted or regenerated

#### Automatic Session Generation

Scheduled sessions are created automatically by the system:

- When a class transitions from "Not Started" to "Active"
- When a group's schedule items are updated
- Weekly maintenance to maintain a 4-week buffer

**You don't need to create scheduled sessions manually** - the system handles this.

### 2. Viewing Sessions

#### Pagination and Filtering

You can retrieve sessions with various filters:

- By group
- By class
- By status (Scheduled, Conducting, Finished, Canceled)
- By date range
- Search by title

Results are paginated for performance.

#### Single Session Details

You can retrieve a single session by its ID. The response includes:

- All session details (time, status, group, etc.)
- Whether it's an extra session or scheduled
- Related information (group, class)

### 3. Updating Sessions

#### What Can Be Updated?

Only **Scheduled** sessions can be updated. You can change:

- Title/topic
- Start time
- End time

#### Update Rules

1. **Status Check**: Only sessions with status "Scheduled" can be updated
2. **Conflict Validation**: If you change the time, the system will check for:
   - Teacher conflicts (teacher already has another session at that time)
   - Group conflicts (the same group already has a session at that time)
3. **Error Handling**: If a conflict is detected, the update will fail with a clear error message

#### Why Can't Other Statuses Be Updated?

- **Conducting**: Session is in progress - changes would be confusing
- **Finished**: Session is complete - changes would affect historical records
- **Canceled**: Session is canceled - use "restore" or create a new session instead

### 4. Deleting Sessions

#### Delete Rules

**Scheduled Sessions:**

- ❌ **Cannot be deleted**
- ✅ Must be **canceled** instead
- **Reason**: These are the official schedule record and must remain for audit purposes

**Extra Sessions:**

- ✅ **Can be deleted**
- ✅ Can also be canceled
- **Reason**: These are manually created and can be removed if created by mistake

#### When to Delete vs Cancel

**Use Delete when:**

- It's an extra session
- It was created by mistake
- You want to completely remove it from the system

**Use Cancel when:**

- It's a scheduled session (only option)
- It's an extra session but you want to keep a record that it was planned
- You want to show in reports that a class was canceled (not just deleted)

### 5. Canceling Sessions

#### Cancel Rules

- ✅ **Any session** can be canceled (scheduled or extra)
- ✅ Works for any status (Scheduled, Conducting, Finished)
- ✅ Preserves the record in the database
- ✅ Sets status to "Canceled"

#### Use Cases

- Teacher is sick - cancel the scheduled session
- Special event conflicts - cancel and reschedule
- Need to show in reports that a class was canceled (not just deleted)

---

## Conflict Detection

### What is a Conflict?

A conflict occurs when:

1. **Teacher Conflict**: The teacher already has another session at the same time
2. **Group Conflict**: The same group already has another session at the same time

### When Conflicts Are Checked

Conflicts are automatically checked when:

- Creating an extra session
- Updating a session's time
- The system generates sessions (conflicts are skipped, not errors)

### Conflict Handling

#### For Manual Operations (Create/Update)

If a conflict is detected:

- The operation **fails** with a clear error message
- The error message explains what type of conflict occurred
- You must resolve the conflict before proceeding

#### For Automatic Generation

When the system automatically generates sessions:

- Conflicts are **skipped** (not errors)
- The system logs which sessions were skipped due to conflicts
- You can view these in activity logs
- You can manually create those sessions later if needed

### Conflict Error Messages

When a conflict occurs, you'll receive an error message that includes:

- The type of conflict (teacher or group)
- The conflicting session details
- Clear guidance on how to resolve it

---

## Session Regeneration

### What is Regeneration?

Regeneration is when the system automatically:

1. Deletes future scheduled sessions
2. Creates new sessions based on updated schedule information

### When Does Regeneration Happen?

Regeneration occurs automatically when:

1. **Group Schedule Items Change**
   - Day of week changes
   - Start time changes
   - Schedule items are added/removed
   - **Note**: Changing only the group name does NOT trigger regeneration

2. **Class Duration Changes**
   - When the class duration (length in minutes) is updated
   - Affects all groups in that class
   - Updates session end times based on new duration

### What Gets Regenerated?

- ✅ Future scheduled sessions (status: Scheduled)
- ❌ Extra sessions are **preserved** (never regenerated)
- ❌ Past sessions are **preserved** (never regenerated)
- ❌ Sessions with other statuses (Conducting, Finished, Canceled) are **preserved**

### Regeneration Behavior

1. **Automatic**: Happens automatically - no API call needed
2. **Safe**: Only affects future scheduled sessions
3. **Preserves Manual Work**: Extra sessions you created are never touched
4. **Bulk Operations**: Uses efficient bulk operations for performance

### What You Need to Know

- Regeneration is **automatic** - you don't need to trigger it
- Your manually created extra sessions are **safe** - they're never regenerated
- Only scheduled sessions are affected
- The system maintains a 4-week buffer automatically

---

## Session Status Lifecycle

### Status Flow

```
Scheduled → Conducting → Finished
     ↓
 Canceled (can happen at any time)
```

### Status Meanings

1. **Scheduled**
   - Session is planned but hasn't started
   - Can be updated, canceled, or deleted (if extra)
   - Default status for new sessions

2. **Conducting**
   - Session is currently in progress
   - Typically set by attendance system
   - Cannot be updated or deleted

3. **Finished**
   - Session has completed
   - Historical record
   - Cannot be updated or deleted

4. **Canceled**
   - Session was canceled
   - Can happen at any stage
   - Preserved for audit purposes
   - Cannot be updated or deleted

### Status Transitions

- **Scheduled → Conducting**: Usually automatic (when attendance is marked)
- **Conducting → Finished**: Usually automatic (when session ends)
- **Any → Canceled**: Can be done manually at any time

---

## Best Practices

### 1. Creating Extra Sessions

✅ **Do:**

- Use for makeup classes, workshops, special events
- Check for conflicts before creating (system does this automatically)
- Use descriptive titles

❌ **Don't:**

- Create extra sessions to replace scheduled ones (use cancel + reschedule instead)
- Create sessions with conflicts (system will prevent this)

### 2. Updating Sessions

✅ **Do:**

- Update scheduled sessions when times need to change
- Check for conflicts before updating (system does this automatically)
- Update titles to reflect session topics

❌ **Don't:**

- Try to update non-scheduled sessions (will fail)
- Update times without checking for conflicts (system prevents this)

### 3. Deleting vs Canceling

✅ **Use Delete for:**

- Extra sessions created by mistake
- Extra sessions that are no longer needed

✅ **Use Cancel for:**

- Scheduled sessions (only option)
- Sessions you want to keep a record of
- When you need audit trail

### 4. Handling Conflicts

✅ **Do:**

- Show clear error messages to users
- Provide guidance on how to resolve conflicts
- Allow users to view conflicting sessions

❌ **Don't:**

- Ignore conflict errors
- Try to create/update with conflicts (will fail)

### 5. Understanding Regeneration

✅ **Do:**

- Trust the system to handle regeneration automatically
- Know that your extra sessions are safe
- Understand that regeneration only affects scheduled sessions

❌ **Don't:**

- Try to manually trigger regeneration (not needed)
- Worry about extra sessions being deleted (they're preserved)

---

## Error Handling

### Common Errors

#### 1. Cannot Delete Scheduled Session

**Error**: "Cannot delete scheduled session. Please cancel it instead."

**Cause**: Trying to delete a scheduled session (isExtraSession: false)

**Solution**: Use the cancel endpoint instead

#### 2. Schedule Conflict

**Error**: "Schedule conflict detected"

**Cause**: Teacher or group already has a session at that time

**Solution**:

- Check existing sessions
- Choose a different time
- Cancel or reschedule the conflicting session first

#### 3. Cannot Update Session

**Error**: "Cannot update session with status {status}"

**Cause**: Trying to update a non-scheduled session

**Solution**: Only scheduled sessions can be updated

#### 4. Session Not Found

**Error**: "Session not found"

**Cause**: Session ID doesn't exist or user doesn't have access

**Solution**: Verify the session ID and user permissions

### Error Response Format

All errors follow a consistent format:

- **Status Code**: HTTP status code (400, 404, etc.)
- **Message**: Human-readable error message
- **Translation Key**: For internationalization
- **Details**: Additional context when available

---

## Activity Logging

### What Gets Logged?

The system automatically logs:

- Session creation (individual and bulk)
- Session updates
- Session deletions
- Session cancellations
- Session regeneration
- Conflict detection (when sessions are skipped during generation)

### Viewing Activity Logs

Activity logs are available through the activity log API and include:

- What action was performed
- Who performed it
- When it happened
- Relevant session details

---

## Performance Considerations

### Pagination

Always use pagination when listing sessions:

- Default page size is reasonable
- Adjust page size based on your needs
- Use filters to reduce result sets

### Bulk Operations

The system uses efficient bulk operations internally:

- Bulk session creation
- Bulk session deletion
- Bulk event emission

**You don't need to worry about this** - it's handled automatically for performance.

### Caching Considerations

- Session data may change due to automatic regeneration
- Don't cache session lists for too long
- Refresh when schedules are updated

---

## Integration Checklist

### Before You Start

- [ ] Understand the difference between scheduled and extra sessions
- [ ] Know when to use delete vs cancel
- [ ] Understand conflict detection behavior
- [ ] Know what triggers regeneration

### When Creating Sessions

- [ ] Use extra sessions for manual creation
- [ ] Handle conflict errors gracefully
- [ ] Provide clear error messages to users
- [ ] Validate input before sending requests

### When Updating Sessions

- [ ] Check session status first (must be Scheduled)
- [ ] Handle conflict errors
- [ ] Validate time changes
- [ ] Update UI to reflect changes

### When Deleting/Canceling

- [ ] Check if session is extra or scheduled
- [ ] Use delete for extra sessions
- [ ] Use cancel for scheduled sessions
- [ ] Show appropriate confirmation dialogs

### Error Handling

- [ ] Handle all error cases
- [ ] Show user-friendly error messages
- [ ] Provide guidance on how to resolve errors
- [ ] Log errors for debugging

---

## Common Scenarios

### Scenario 1: Teacher is Sick

**Problem**: Need to cancel a scheduled session because teacher is sick

**Solution**:

1. Find the scheduled session
2. Use the cancel endpoint (not delete)
3. Session status becomes "Canceled"
4. Record is preserved for audit

### Scenario 2: Makeup Class

**Problem**: Need to schedule a makeup class

**Solution**:

1. Create an extra session with the makeup class time
2. System checks for conflicts automatically
3. If no conflicts, session is created
4. Extra session is never automatically deleted

### Scenario 3: Schedule Changed

**Problem**: Group schedule was updated (day/time changed)

**Solution**:

1. System automatically regenerates future scheduled sessions
2. Your extra sessions are preserved
3. New sessions match the updated schedule
4. No action needed from you

### Scenario 4: Wrong Time Entered

**Problem**: Created an extra session with wrong time

**Solution**:

1. If it's an extra session: Delete it
2. If it's a scheduled session: Cancel it, then create a new extra session with correct time
3. Or update it (if still Scheduled status)

### Scenario 5: Conflict Detected

**Problem**: Trying to create/update a session but conflict detected

**Solution**:

1. Show the error message to user
2. Display conflicting session details
3. Allow user to:
   - Choose a different time
   - Cancel/reschedule the conflicting session first
   - View both sessions side by side

---

## Summary

### Key Takeaways

1. **Two Types of Sessions**:
   - Scheduled (system-generated, can't delete)
   - Extra (manual, can delete)

2. **Delete vs Cancel**:
   - Delete: Extra sessions only
   - Cancel: Any session, preserves record

3. **Automatic Features**:
   - Session generation
   - Regeneration on schedule changes
   - Conflict detection
   - 4-week buffer maintenance

4. **Manual Features**:
   - Create extra sessions
   - Update scheduled sessions
   - Cancel any session
   - Delete extra sessions

5. **Safety Features**:
   - Extra sessions are never auto-deleted
   - Conflicts prevent invalid operations
   - Audit trail for all actions

### Quick Reference

| Action           | Scheduled Session     | Extra Session         |
| ---------------- | --------------------- | --------------------- |
| Create           | ❌ System only        | ✅ Manual             |
| Update           | ✅ Yes (if Scheduled) | ✅ Yes (if Scheduled) |
| Delete           | ❌ No                 | ✅ Yes                |
| Cancel           | ✅ Yes                | ✅ Yes                |
| Auto-Regenerated | ✅ Yes                | ❌ No                 |

---

## Support

For questions or issues:

1. Check error messages - they provide clear guidance
2. Review activity logs - see what happened
3. Understand the session type - scheduled vs extra
4. Check conflict details - understand why operations fail

Remember: The system is designed to prevent invalid operations and preserve data integrity. Error messages are your friend - they guide you to the correct solution.
