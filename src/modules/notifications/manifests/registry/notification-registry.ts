import { NotificationType } from '../../enums/notification-type.enum';
import { NotificationManifest } from '../types/manifest.types';

// Import manifests for verification notifications and center updates
import { otpManifest } from '../auth/otp.manifest';
import { passwordResetManifest } from '../auth/password-reset.manifest';
import { phoneVerifiedManifest } from '../auth/phone-verified.manifest';
import { newDeviceLoginManifest } from '../auth/new-device-login.manifest';
import { passwordChangedManifest } from '../auth/password-changed.manifest';
import { loginFailedManifest } from '../auth/login-failed.manifest';
import { twoFaDisabledManifest } from '../auth/two-fa-disabled.manifest';
import { centerUpdatedManifest } from '../center/center-updated.manifest';
import { centerCreatedManifest } from '../center/center-created.manifest';
import { centerDeletedManifest } from '../center/center-deleted.manifest';
import { centerRestoredManifest } from '../center/center-restored.manifest';
import { centerAccessActivatedManifest } from '../access-control/center-access-activated.manifest';
import { centerAccessDeactivatedManifest } from '../access-control/center-access-deactivated.manifest';
import { centerAccessGrantedManifest } from '../access-control/center-access-granted.manifest';
import { centerAccessRevokedManifest } from '../access-control/center-access-revoked.manifest';
import { roleAssignedManifest } from '../access-control/role-assigned.manifest';
import { roleRevokedManifest } from '../access-control/role-revoked.manifest';

// Session manifests
import { sessionCreatedManifest } from '../sessions/session-created.manifest';
import { sessionUpdatedManifest } from '../sessions/session-updated.manifest';
import { sessionCanceledManifest } from '../sessions/session-canceled.manifest';
import { sessionFinishedManifest } from '../sessions/session-finished.manifest';
import { sessionDeletedManifest } from '../sessions/session-deleted.manifest';
import { sessionCheckedInManifest } from '../sessions/session-checked-in.manifest';
import { sessionConflictDetectedManifest } from '../sessions/session-conflict-detected.manifest';

// Class manifests
import { classCreatedManifest } from '../classes/class-created.manifest';
import { classUpdatedManifest } from '../classes/class-updated.manifest';
import { classDeletedManifest } from '../classes/class-deleted.manifest';
import { classStatusChangedManifest } from '../classes/class-status-changed.manifest';
import { staffAssignedToClassManifest } from '../classes/staff-assigned-to-class.manifest';
import { staffRemovedFromClassManifest } from '../classes/staff-removed-from-class.manifest';

// Group manifests
import { groupCreatedManifest } from '../groups/group-created.manifest';
import { groupUpdatedManifest } from '../groups/group-updated.manifest';
import { groupDeletedManifest } from '../groups/group-deleted.manifest';
import { studentAddedToGroupManifest } from '../groups/student-added-to-group.manifest';
import { studentRemovedFromGroupManifest } from '../groups/student-removed-from-group.manifest';

// Branch manifests
import { branchCreatedManifest } from '../branches/branch-created.manifest';
import { branchUpdatedManifest } from '../branches/branch-updated.manifest';
import { branchDeletedManifest } from '../branches/branch-deleted.manifest';
import { branchRestoredManifest } from '../branches/branch-restored.manifest';

// Attendance manifests
import { studentAbsentManifest } from '../attendance/student-absent.manifest';

// Student billing manifests
import { chargeCompletedManifest } from '../student-billing/charge-completed.manifest';
import { chargeInstallmentPaidManifest } from '../student-billing/charge-installment-paid.manifest';
import { chargeRefundedManifest } from '../student-billing/charge-refunded.manifest';

// Teacher payout manifests
import { payoutCreatedManifest } from '../teacher-payout/payout-created.manifest';
import { payoutPaidManifest } from '../teacher-payout/payout-paid.manifest';
import { payoutInstallmentPaidManifest } from '../teacher-payout/payout-installment-paid.manifest';

// Expense manifests
import { expenseCreatedManifest } from '../expenses/expense-created.manifest';
import { expenseRefundedManifest } from '../expenses/expense-refunded.manifest';

// User profile manifests
import { userProfileActivatedManifest } from '../user-profile/user-profile-activated.manifest';
import { userProfileDeactivatedManifest } from '../user-profile/user-profile-deactivated.manifest';
import { userProfileDeletedManifest } from '../user-profile/user-profile-deleted.manifest';
import { userProfileRestoredManifest } from '../user-profile/user-profile-restored.manifest';
import { userProfileCreatedManifest } from '../user-profile/user-profile-created.manifest';

/**
 * Central registry of notification manifests
 *
 * All notification types are now migrated to the manifest system:
 * - Verification notifications (OTP, PASSWORD_RESET)
 * - Security notifications (NEW_DEVICE_LOGIN, PASSWORD_CHANGED, LOGIN_FAILED, TWO_FA_DISABLED)
 * - Center notifications (CENTER_CREATED, CENTER_UPDATED)
 *
 * Using `satisfies` ensures all types are required at compile time while preserving literal types.
 * TypeScript will error if any NotificationType is missing a manifest.
 */
export const NotificationRegistry = {
  // Verification notifications
  [NotificationType.OTP]: otpManifest,
  [NotificationType.PASSWORD_RESET]: passwordResetManifest,
  [NotificationType.PHONE_VERIFIED]: phoneVerifiedManifest,

  // Security notifications
  [NotificationType.NEW_DEVICE_LOGIN]: newDeviceLoginManifest,
  [NotificationType.PASSWORD_CHANGED]: passwordChangedManifest,
  [NotificationType.LOGIN_FAILED]: loginFailedManifest,
  [NotificationType.TWO_FA_DISABLED]: twoFaDisabledManifest,

  // Center notifications
  [NotificationType.CENTER_CREATED]: centerCreatedManifest,
  [NotificationType.CENTER_UPDATED]: centerUpdatedManifest,
  [NotificationType.CENTER_DELETED]: centerDeletedManifest,
  [NotificationType.CENTER_RESTORED]: centerRestoredManifest,

  // Branch notifications
  [NotificationType.BRANCH_CREATED]: branchCreatedManifest,
  [NotificationType.BRANCH_UPDATED]: branchUpdatedManifest,
  [NotificationType.BRANCH_DELETED]: branchDeletedManifest,
  [NotificationType.BRANCH_RESTORED]: branchRestoredManifest,

  // Attendance notifications
  [NotificationType.STUDENT_ABSENT]: studentAbsentManifest,

  // Access Control notifications
  [NotificationType.CENTER_ACCESS_ACTIVATED]: centerAccessActivatedManifest,
  [NotificationType.CENTER_ACCESS_DEACTIVATED]: centerAccessDeactivatedManifest,
  [NotificationType.CENTER_ACCESS_GRANTED]: centerAccessGrantedManifest,
  [NotificationType.CENTER_ACCESS_REVOKED]: centerAccessRevokedManifest,
  [NotificationType.ROLE_ASSIGNED]: roleAssignedManifest,
  [NotificationType.ROLE_REVOKED]: roleRevokedManifest,

  // Session notifications
  [NotificationType.SESSION_CREATED]: sessionCreatedManifest,
  [NotificationType.SESSION_UPDATED]: sessionUpdatedManifest,
  [NotificationType.SESSION_CANCELED]: sessionCanceledManifest,
  [NotificationType.SESSION_FINISHED]: sessionFinishedManifest,
  [NotificationType.SESSION_DELETED]: sessionDeletedManifest,
  [NotificationType.SESSION_CHECKED_IN]: sessionCheckedInManifest,
  [NotificationType.SESSION_CONFLICT_DETECTED]: sessionConflictDetectedManifest,

  // Class notifications
  [NotificationType.CLASS_CREATED]: classCreatedManifest,
  [NotificationType.CLASS_UPDATED]: classUpdatedManifest,
  [NotificationType.CLASS_DELETED]: classDeletedManifest,
  [NotificationType.CLASS_STATUS_CHANGED]: classStatusChangedManifest,
  [NotificationType.STAFF_ASSIGNED_TO_CLASS]: staffAssignedToClassManifest,
  [NotificationType.STAFF_REMOVED_FROM_CLASS]: staffRemovedFromClassManifest,

  // Group notifications
  [NotificationType.GROUP_CREATED]: groupCreatedManifest,
  [NotificationType.GROUP_UPDATED]: groupUpdatedManifest,
  [NotificationType.GROUP_DELETED]: groupDeletedManifest,
  [NotificationType.STUDENT_ADDED_TO_GROUP]: studentAddedToGroupManifest,
  [NotificationType.STUDENT_REMOVED_FROM_GROUP]: studentRemovedFromGroupManifest,

  // Student billing notifications
  [NotificationType.CHARGE_COMPLETED]: chargeCompletedManifest,
  [NotificationType.CHARGE_INSTALLMENT_PAID]: chargeInstallmentPaidManifest,
  [NotificationType.CHARGE_REFUNDED]: chargeRefundedManifest,

  // Teacher payout notifications
  [NotificationType.PAYOUT_CREATED]: payoutCreatedManifest,
  [NotificationType.PAYOUT_PAID]: payoutPaidManifest,
  [NotificationType.PAYOUT_INSTALLMENT_PAID]: payoutInstallmentPaidManifest,

  // Expense notifications
  [NotificationType.EXPENSE_CREATED]: expenseCreatedManifest,
  [NotificationType.EXPENSE_REFUNDED]: expenseRefundedManifest,

  // User profile lifecycle
  [NotificationType.USER_PROFILE_ACTIVATED]: userProfileActivatedManifest,
  [NotificationType.USER_PROFILE_DEACTIVATED]: userProfileDeactivatedManifest,
  [NotificationType.USER_PROFILE_DELETED]: userProfileDeletedManifest,
  [NotificationType.USER_PROFILE_RESTORED]: userProfileRestoredManifest,
  [NotificationType.USER_PROFILE_CREATED]: userProfileCreatedManifest,
} as const satisfies Record<NotificationType, NotificationManifest>;
