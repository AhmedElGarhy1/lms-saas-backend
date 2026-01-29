/**
 * Type Maps for Events
 *
 * Provides type safety for event emissions and listeners.
 * Uses enum values for type safety - ensures all keys match the enum definitions.
 */

import {
  UserCreatedEvent,
  UserUpdatedEvent,
  UserDeletedEvent,
  UserRestoredEvent,
  UserActivatedEvent,
  UserImportedEvent,
} from '@/modules/user/events/user.events';
import {
  UserLoggedInEvent,
  UserLoggedOutEvent,
  TokenRefreshedEvent,
  TwoFactorEnabledEvent,
  TwoFactorDisabledEvent,
  TwoFactorSetupEvent,
  PasswordChangedEvent,
  UserLoginFailedEvent,
} from '@/modules/auth/events/auth.events';
import {
  CreateRoleEvent,
  UpdateRoleEvent,
  DeleteRoleEvent,
  RestoreRoleEvent,
} from '@/modules/access-control/events/role.events';
import {
  CreateCenterEvent,
  UpdateCenterEvent,
  DeleteCenterEvent,
  RestoreCenterEvent,
  CreateCenterOwnerEvent,
  AssignCenterOwnerEvent,
  CreateCenterBranchEvent,
} from '@/modules/centers/events/center.events';
import {
  BranchCreatedEvent,
  BranchUpdatedEvent,
  BranchDeletedEvent,
  BranchRestoredEvent,
} from '@/modules/centers/events/branch.events';
import {
  GrantCenterAccessEvent,
  RevokeCenterAccessEvent,
  CenterAccessSoftRemovedEvent,
  CenterAccessRestoredEvent,
  GrantUserAccessEvent,
  AssignRoleEvent,
  RevokeRoleEvent,
  ActivateCenterAccessEvent,
  DeactivateCenterAccessEvent,
} from '@/modules/access-control/events/access-control.events';
import { CreateAdminEvent } from '@/modules/admin/events/admin.events';
import { CreateStaffEvent } from '@/modules/staff/events/staff.events';
import { CreateStudentEvent } from '@/modules/students/events/student.events';
import { CreateTeacherEvent } from '@/modules/teachers/events/teacher.events';
import {
  ClassCreatedEvent,
  ClassUpdatedEvent,
  ClassDeletedEvent,
  ClassRestoredEvent,
  ClassStatusChangedEvent,
} from '@/modules/classes/events/class.events';
import {
  GroupCreatedEvent,
  GroupUpdatedEvent,
  GroupDeletedEvent,
  GroupRestoredEvent,
} from '@/modules/classes/events/group.events';
import {
  StaffAssignedToClassEvent,
  StaffRemovedFromClassEvent,
} from '@/modules/classes/events/class-staff.events';
import {
  StudentAddedToGroupEvent,
  StudentRemovedFromGroupEvent,
} from '@/modules/classes/events/group-student.events';
import {
  PasswordResetRequestedEvent,
  RequestPhoneVerificationEvent,
  OtpEvent,
  PhoneVerifiedEvent,
} from '@/modules/auth/events/auth.events';
import {
  SessionCreatedEvent,
  SessionUpdatedEvent,
  SessionDeletedEvent,
  SessionCanceledEvent,
  SessionFinishedEvent,
  SessionCheckedInEvent,
  SessionsBulkDeletedEvent,
  SessionConflictDetectedEvent,
} from '@/modules/sessions/events/session.events';
import {
  StudentChargeCreatedEvent,
  StudentChargeCompletedEvent,
  StudentChargeInstallmentPaidEvent,
  StudentChargeRefundedEvent,
} from '@/modules/student-billing/events/student-billing.events';
import {
  ExpenseCreatedEvent,
  ExpenseUpdatedEvent,
  ExpenseRefundedEvent,
} from '@/modules/expenses/events/expense.events';
import {
  TeacherPayoutCreatedEvent,
  TeacherPayoutPaidEvent,
  TeacherPayoutInstallmentPaidEvent,
  TeacherPayoutStatusUpdatedEvent,
} from '@/modules/teacher-payouts/events/teacher-payout.events';
import { StudentsMarkedAbsentEvent } from '@/modules/attendance/events/attendance.events';
import {
  UserProfileActivatedEvent,
  UserProfileDeactivatedEvent,
  UserProfileDeletedEvent,
  UserProfileRestoredEvent,
  UserProfileCreatedEvent,
} from '@/modules/user-profile/events/user-profile.events';

// Import event enums for type safety
import { UserEvents } from '@/shared/events/user.events.enum';
import { AuthEvents } from '@/shared/events/auth.events.enum';
import { RoleEvents } from '@/shared/events/role.events.enum';
import { CenterEvents } from '@/shared/events/center.events.enum';
import { BranchEvents } from '@/shared/events/branch.events.enum';
import { AccessControlEvents } from '@/shared/events/access-control.events.enum';
import { AdminEvents } from '@/shared/events/admin.events.enum';
import { StaffEvents } from '@/shared/events/staff.events.enum';
import { StudentEvents } from '@/shared/events/student.events.enum';
import { TeacherEvents } from '@/shared/events/teacher.events.enum';
import { ClassEvents } from '@/shared/events/classes.events.enum';
import { GroupEvents } from '@/shared/events/groups.events.enum';
import { SessionEvents } from '@/shared/events/sessions.events.enum';
import { StudentBillingEvents } from '@/shared/events/student-billing.events.enum';
import { ExpenseEvents } from '@/shared/events/expenses.events.enum';
import { TeacherPayoutEvents } from '@/shared/events/teacher-payouts.events.enum';
import { AttendanceEvents } from '@/shared/events/attendance.events.enum';
import { UserProfileEvents } from '@/shared/events/user-profile.events.enum';

/**
 * Event Type Map
 * Maps event names to their event class types.
 * Events represent facts (what happened).
 *
 * Uses enum values for type safety - ensures all keys match the enum definitions.
 */
export type EventTypeMap = {
  // User Events
  [UserEvents.CREATED]: UserCreatedEvent;
  [UserEvents.UPDATED]: UserUpdatedEvent;
  [UserEvents.DELETED]: UserDeletedEvent;
  [UserEvents.RESTORED]: UserRestoredEvent;
  [UserEvents.ACTIVATED]: UserActivatedEvent;
  [UserEvents.IMPORTED]: UserImportedEvent;

  // Auth Events
  [AuthEvents.USER_LOGGED_IN]: UserLoggedInEvent;
  [AuthEvents.USER_LOGGED_OUT]: UserLoggedOutEvent;
  [AuthEvents.USER_LOGIN_FAILED]: UserLoginFailedEvent;
  [AuthEvents.TOKEN_REFRESHED]: TokenRefreshedEvent;
  [AuthEvents.PASSWORD_CHANGED]: PasswordChangedEvent;
  [AuthEvents.TWO_FA_SETUP]: TwoFactorSetupEvent;
  [AuthEvents.TWO_FA_ENABLED]: TwoFactorEnabledEvent;
  [AuthEvents.TWO_FA_DISABLED]: TwoFactorDisabledEvent;

  // Role Events
  [RoleEvents.CREATED]: CreateRoleEvent;
  [RoleEvents.UPDATED]: UpdateRoleEvent;
  [RoleEvents.DELETED]: DeleteRoleEvent;
  [RoleEvents.RESTORED]: RestoreRoleEvent;

  // Center Events
  [CenterEvents.CREATED]: CreateCenterEvent;
  [CenterEvents.UPDATED]: UpdateCenterEvent;
  [CenterEvents.DELETED]: DeleteCenterEvent;
  [CenterEvents.RESTORED]: RestoreCenterEvent;
  [CenterEvents.CREATE_OWNER]: CreateCenterOwnerEvent;
  [CenterEvents.ASSIGN_OWNER]: AssignCenterOwnerEvent;
  [CenterEvents.CREATE_BRANCH]: CreateCenterBranchEvent;

  // Branch Events
  [BranchEvents.CREATED]: BranchCreatedEvent;
  [BranchEvents.UPDATED]: BranchUpdatedEvent;
  [BranchEvents.DELETED]: BranchDeletedEvent;
  [BranchEvents.RESTORED]: BranchRestoredEvent;

  // AccessControl Events
  [AccessControlEvents.GRANT_CENTER_ACCESS]: GrantCenterAccessEvent;
  [AccessControlEvents.REVOKE_CENTER_ACCESS]: RevokeCenterAccessEvent;
  [AccessControlEvents.CENTER_ACCESS_SOFT_REMOVED]: CenterAccessSoftRemovedEvent;
  [AccessControlEvents.CENTER_ACCESS_RESTORED]: CenterAccessRestoredEvent;
  [AccessControlEvents.GRANT_USER_ACCESS]: GrantUserAccessEvent;
  [AccessControlEvents.ASSIGN_ROLE]: AssignRoleEvent;
  [AccessControlEvents.REVOKE_ROLE]: RevokeRoleEvent;
  [AccessControlEvents.ACTIVATE_CENTER_ACCESS]: ActivateCenterAccessEvent;
  [AccessControlEvents.DEACTIVATE_CENTER_ACCESS]: DeactivateCenterAccessEvent;

  // Admin Events
  [AdminEvents.CREATE]: CreateAdminEvent;

  // Staff Events
  [StaffEvents.CREATE]: CreateStaffEvent;

  // Student Events
  [StudentEvents.CREATE]: CreateStudentEvent;

  // Teacher Events
  [TeacherEvents.CREATE]: CreateTeacherEvent;

  // Class Events
  [ClassEvents.CREATED]: ClassCreatedEvent;
  [ClassEvents.UPDATED]: ClassUpdatedEvent;
  [ClassEvents.DELETED]: ClassDeletedEvent;
  [ClassEvents.RESTORED]: ClassRestoredEvent;
  [ClassEvents.STATUS_CHANGED]: ClassStatusChangedEvent;
  [ClassEvents.STAFF_ASSIGNED]: StaffAssignedToClassEvent;
  [ClassEvents.STAFF_REMOVED]: StaffRemovedFromClassEvent;

  // Group Events
  [GroupEvents.CREATED]: GroupCreatedEvent;
  [GroupEvents.UPDATED]: GroupUpdatedEvent;
  [GroupEvents.DELETED]: GroupDeletedEvent;
  [GroupEvents.RESTORED]: GroupRestoredEvent;
  [GroupEvents.STUDENT_ADDED]: StudentAddedToGroupEvent;
  [GroupEvents.STUDENT_REMOVED]: StudentRemovedFromGroupEvent;

  // Additional Auth Events
  [AuthEvents.PASSWORD_RESET_REQUESTED]: PasswordResetRequestedEvent;
  [AuthEvents.PHONE_VERIFICATION_SEND_REQUESTED]: RequestPhoneVerificationEvent;
  [AuthEvents.OTP]: OtpEvent;
  [AuthEvents.PHONE_VERIFIED]: PhoneVerifiedEvent;

  // Session Events
  [SessionEvents.CREATED]: SessionCreatedEvent;
  [SessionEvents.UPDATED]: SessionUpdatedEvent;
  [SessionEvents.DELETED]: SessionDeletedEvent;
  [SessionEvents.CANCELED]: SessionCanceledEvent;
  [SessionEvents.CHECKED_IN]: SessionCheckedInEvent;
  [SessionEvents.FINISHED]: SessionFinishedEvent;
  [SessionEvents.BULK_DELETED]: SessionsBulkDeletedEvent;
  [SessionEvents.CONFLICT_DETECTED]: SessionConflictDetectedEvent;

  // Student Billing Events
  [StudentBillingEvents.CHARGE_CREATED]: StudentChargeCreatedEvent;
  [StudentBillingEvents.CHARGE_COMPLETED]: StudentChargeCompletedEvent;
  [StudentBillingEvents.INSTALLMENT_PAID]: StudentChargeInstallmentPaidEvent;
  [StudentBillingEvents.CHARGE_REFUNDED]: StudentChargeRefundedEvent;

  // Expense Events
  [ExpenseEvents.CREATED]: ExpenseCreatedEvent;
  [ExpenseEvents.UPDATED]: ExpenseUpdatedEvent;
  [ExpenseEvents.REFUNDED]: ExpenseRefundedEvent;

  // Teacher Payout Events
  [TeacherPayoutEvents.PAYOUT_CREATED]: TeacherPayoutCreatedEvent;
  [TeacherPayoutEvents.PAYOUT_PAID]: TeacherPayoutPaidEvent;
  [TeacherPayoutEvents.INSTALLMENT_PAID]: TeacherPayoutInstallmentPaidEvent;
  [TeacherPayoutEvents.PAYOUT_STATUS_UPDATED]: TeacherPayoutStatusUpdatedEvent;

  // Attendance Events
  [AttendanceEvents.MARKED_ABSENT]: StudentsMarkedAbsentEvent;

  // User Profile Events
  [UserProfileEvents.ACTIVATED]: UserProfileActivatedEvent;
  [UserProfileEvents.DEACTIVATED]: UserProfileDeactivatedEvent;
  [UserProfileEvents.DELETED]: UserProfileDeletedEvent;
  [UserProfileEvents.RESTORED]: UserProfileRestoredEvent;
  [UserProfileEvents.CREATED]: UserProfileCreatedEvent;
};

/**
 * Helper type to extract event name from EventTypeMap
 * Constrained to string values only to ensure type safety with EventEmitter2
 */
export type EventName = Extract<keyof EventTypeMap, string>;

/**
 * Helper type to extract payload type for a given event name
 */
export type EventPayload<T extends EventName> = EventTypeMap[T];
