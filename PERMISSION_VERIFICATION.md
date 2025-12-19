# Permission Verification: GRANT\_\*\_ACCESS Permissions

## How It Works

### Flow for Granting User Access

1. **Request comes in** with `UserAccessDto`:

   ```typescript
   {
     granterUserProfileId: "user-who-will-grant-access",
     targetUserProfileId: "user-who-will-receive-access",  // ← This is checked
     centerId: "..."
   }
   ```

2. **`grantUserAccessValidate` is called**:

   ```typescript
   await this.userProfilePermissionService.canGrantUserAccess(
     actor, // The user making the request
     body.targetUserProfileId, // The TARGET user (who will receive access)
     centerId,
   );
   ```

3. **`canGrantUserAccess` resolves target's profile type**:
   - Fetches the target user's profile
   - Determines their profile type (STAFF, TEACHER, ADMIN, or STUDENT)

4. **Selects the appropriate permission key**:
   - If target is **STAFF** → checks `GRANT_STAFF_ACCESS`
   - If target is **TEACHER** → checks `GRANT_TEACHER_ACCESS`
   - If target is **ADMIN** → checks `GRANT_ADMIN_ACCESS`
   - If target is **STUDENT** → throws error (students can't grant access)

5. **Checks if actor has that permission**:
   - Uses `rolesService.hasPermission()` to check if actor has the required permission

## Example Scenarios

### Scenario 1: Actor has `GRANT_TEACHER_ACCESS` only

**Actor permissions:**

- ✅ `GRANT_TEACHER_ACCESS`

**Test cases:**

1. **Grant access to a TEACHER**:
   - Target profile type: TEACHER
   - Permission checked: `GRANT_TEACHER_ACCESS`
   - Result: ✅ **ALLOWED** (actor has this permission)

2. **Grant access to a STAFF**:
   - Target profile type: STAFF
   - Permission checked: `GRANT_STAFF_ACCESS`
   - Result: ❌ **DENIED** (actor doesn't have this permission)

3. **Grant access to an ADMIN**:
   - Target profile type: ADMIN
   - Permission checked: `GRANT_ADMIN_ACCESS`
   - Result: ❌ **DENIED** (actor doesn't have this permission)

### Scenario 2: Actor has `GRANT_STAFF_ACCESS` only

**Actor permissions:**

- ✅ `GRANT_STAFF_ACCESS`

**Test cases:**

1. **Grant access to a STAFF**:
   - Target profile type: STAFF
   - Permission checked: `GRANT_STAFF_ACCESS`
   - Result: ✅ **ALLOWED**

2. **Grant access to a TEACHER**:
   - Target profile type: TEACHER
   - Permission checked: `GRANT_TEACHER_ACCESS`
   - Result: ❌ **DENIED**

## ✅ Verification: It Works Correctly!

The implementation correctly:

1. ✅ Checks the **target user's profile type** (not actor's)
2. ✅ Uses the **appropriate permission** based on target type
3. ✅ Only allows granting access if actor has the **specific permission** for that profile type

## Answer to Your Question

**Q: If I have `grant_teacher_access` permission, will I be able to grant/revoke only teachers?**

**A: YES! ✅**

- You can grant/revoke access **ONLY** for teachers
- You **CANNOT** grant/revoke access for staff (need `GRANT_STAFF_ACCESS`)
- You **CANNOT** grant/revoke access for admins (need `GRANT_ADMIN_ACCESS`)

The permission check is based on the **target user's profile type**, not the actor's profile type.
