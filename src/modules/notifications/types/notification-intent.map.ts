import { NotificationType } from '../enums/notification-type.enum';

/**
 * Type mapping from NotificationType to its intent structure
 * Intents contain only the minimal IDs needed to resolve recipients and template variables
 *
 * Intents are tiny DTOs that represent "what happened" in notification language,
 * not full domain events. The Intent Resolver will enrich these with full data.
 */
export type NotificationIntentMap = {
  [NotificationType.CENTER_CREATED]: {
    centerId: string;
    actorId: string;
  };
  [NotificationType.CENTER_UPDATED]: {
    centerId: string;
    actorId: string;
  };
  [NotificationType.CENTER_DELETED]: {
    centerId: string;
    actorId: string;
  };
  [NotificationType.CENTER_RESTORED]: {
    centerId: string;
    actorId: string;
  };
  [NotificationType.BRANCH_CREATED]: {
    branchId: string;
    centerId: string;
    actorId: string;
  };
  [NotificationType.BRANCH_UPDATED]: {
    branchId: string;
    centerId: string;
    actorId: string;
    changedFields?: string[];
  };
  [NotificationType.BRANCH_DELETED]: {
    branchId: string;
    centerId: string;
    actorId: string;
  };
  [NotificationType.BRANCH_RESTORED]: {
    branchId: string;
    centerId: string;
    actorId: string;
  };
  [NotificationType.OTP]: {
    userId: string;
    otpCode: string;
    expiresIn: number;
  };
  [NotificationType.PHONE_VERIFIED]: {
    userId: string;
  };
  [NotificationType.NEW_DEVICE_LOGIN]: {
    userId: string;
    deviceName: string;
  };
  [NotificationType.PASSWORD_CHANGED]: {
    userId: string;
  };
  [NotificationType.LOGIN_FAILED]: {
    userId: string;
  };
  [NotificationType.TWO_FA_DISABLED]: {
    userId: string;
  };
  [NotificationType.CENTER_ACCESS_ACTIVATED]: {
    userProfileId: string;
    centerId: string;
    actorId: string;
  };
  [NotificationType.CENTER_ACCESS_DEACTIVATED]: {
    userProfileId: string;
    centerId: string;
    actorId: string;
  };
  [NotificationType.CENTER_ACCESS_GRANTED]: {
    userProfileId: string;
    centerId: string;
    actorId: string;
  };
  [NotificationType.CENTER_ACCESS_REVOKED]: {
    userProfileId: string;
    centerId: string;
    actorId: string;
  };
  [NotificationType.ROLE_ASSIGNED]: {
    userProfileId: string;
    roleId: string;
    centerId?: string;
    actorId: string;
  };
  [NotificationType.ROLE_REVOKED]: {
    userProfileId: string;
    roleId: string;
    centerId?: string;
    actorId: string;
  };

  // Session notifications
  [NotificationType.SESSION_CREATED]: {
    sessionId: string;
    groupId: string;
    centerId: string;
    actorId: string;
  };
  [NotificationType.SESSION_UPDATED]: {
    sessionId: string;
    groupId: string;
    centerId: string;
    actorId: string;
    changedFields?: string[];
  };
  [NotificationType.SESSION_CANCELED]: {
    sessionId: string;
    groupId: string;
    centerId: string;
    actorId: string;
  };
  [NotificationType.SESSION_FINISHED]: {
    sessionId: string;
    groupId: string;
    centerId: string;
    actorId: string;
  };
  [NotificationType.SESSION_DELETED]: {
    sessionId: string;
    groupId: string;
    centerId: string;
    actorId: string;
  };
  [NotificationType.SESSION_CHECKED_IN]: {
    sessionId: string;
    groupId: string;
    centerId: string;
    actorId: string;
  };
  [NotificationType.SESSION_CONFLICT_DETECTED]: {
    groupId: string;
    scheduleItemId: string;
    centerId: string;
    conflictType: 'TEACHER' | 'GROUP';
    conflictingSessionId: string;
    proposedStartTime: Date;
    proposedEndTime: Date;
    actorId: string;
  };

  // Class notifications
  [NotificationType.CLASS_CREATED]: {
    classId: string;
    centerId: string;
    actorId: string;
  };
  [NotificationType.CLASS_UPDATED]: {
    classId: string;
    centerId: string;
    actorId: string;
    changedFields?: string[];
  };
  [NotificationType.CLASS_DELETED]: {
    classId: string;
    centerId: string;
    actorId: string;
  };
  [NotificationType.CLASS_STATUS_CHANGED]: {
    classId: string;
    centerId: string;
    oldStatus: string;
    newStatus: string;
    actorId: string;
  };
  [NotificationType.STAFF_ASSIGNED_TO_CLASS]: {
    staffUserProfileId: string;
    classId: string;
    centerId: string;
    actorId: string;
  };
  [NotificationType.STAFF_REMOVED_FROM_CLASS]: {
    staffUserProfileId: string;
    classId: string;
    className: string;
    centerId: string;
    actorId: string;
  };

  // Group notifications
  [NotificationType.GROUP_CREATED]: {
    groupId: string;
    classId: string;
    centerId: string;
    actorId: string;
  };
  [NotificationType.GROUP_UPDATED]: {
    groupId: string;
    classId: string;
    centerId: string;
    actorId: string;
    changedFields?: string[];
  };
  [NotificationType.GROUP_DELETED]: {
    groupId: string;
    classId: string;
    centerId: string;
    actorId: string;
  };
  [NotificationType.STUDENT_ADDED_TO_GROUP]: {
    studentUserProfileId: string;
    groupId: string;
    centerId: string;
    actorId: string;
  };
  [NotificationType.STUDENT_REMOVED_FROM_GROUP]: {
    studentUserProfileId: string;
    groupId: string;
    groupName: string;
    className: string;
    centerId: string;
    actorId: string;
  };

  // Attendance notifications
  [NotificationType.STUDENT_ABSENT]: {
    studentUserProfileId: string;
    sessionId: string;
    groupId: string;
    centerId: string;
    actorId: string;
  };

  // Student billing notifications
  [NotificationType.CHARGE_COMPLETED]: {
    chargeId: string;
    actorId: string;
  };
  [NotificationType.CHARGE_INSTALLMENT_PAID]: {
    chargeId: string;
    actorId: string;
  };
  [NotificationType.CHARGE_REFUNDED]: {
    chargeId: string;
    actorId: string;
    refundReason?: string;
  };

  // Teacher payout notifications
  [NotificationType.PAYOUT_CREATED]: {
    payoutId: string;
    actorId: string;
  };
  [NotificationType.PAYOUT_PAID]: {
    payoutId: string;
    actorId: string;
  };
  [NotificationType.PAYOUT_INSTALLMENT_PAID]: {
    payoutId: string;
    actorId: string;
  };

  // Expense notifications
  [NotificationType.EXPENSE_CREATED]: {
    expenseId: string;
    centerId: string;
    branchId: string;
    actorId: string;
  };
  [NotificationType.EXPENSE_REFUNDED]: {
    expenseId: string;
    centerId: string;
    branchId: string;
    actorId: string;
  };

  // User profile lifecycle
  [NotificationType.USER_PROFILE_ACTIVATED]: {
    userProfileId: string;
    actorId: string;
  };
  [NotificationType.USER_PROFILE_DEACTIVATED]: {
    userProfileId: string;
    actorId: string;
  };
  [NotificationType.USER_PROFILE_DELETED]: {
    userProfileId: string;
    actorId: string;
  };
  [NotificationType.USER_PROFILE_RESTORED]: {
    userProfileId: string;
    actorId: string;
  };
  [NotificationType.USER_PROFILE_CREATED]: {
    userProfileId: string;
    profileType?: string;
    centerId?: string;
    actorId: string;
  };
};

/**
 * Extract the intent type for a given notification type
 */
export type IntentForNotification<T extends NotificationType> =
  T extends keyof NotificationIntentMap ? NotificationIntentMap[T] : never;
