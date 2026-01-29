import { Injectable, OnModuleInit } from '@nestjs/common';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationIntentResolver } from './interfaces/notification-intent-resolver.interface';
import { CenterCreatedResolver } from './resolvers/center-created.resolver';
import { CenterUpdatedResolver } from './resolvers/center-updated.resolver';
import { CenterDeletedResolver } from './resolvers/center-deleted.resolver';
import { CenterRestoredResolver } from './resolvers/center-restored.resolver';

// Branch resolvers
import { BranchCreatedResolver } from './resolvers/branches/branch-created.resolver';
import { BranchUpdatedResolver } from './resolvers/branches/branch-updated.resolver';
import { BranchDeletedResolver } from './resolvers/branches/branch-deleted.resolver';
import { BranchRestoredResolver } from './resolvers/branches/branch-restored.resolver';

// Attendance resolvers
import { StudentAbsentResolver } from './resolvers/attendance/student-absent.resolver';
import { OtpResolver } from './resolvers/otp.resolver';
import { PhoneVerifiedResolver } from './resolvers/phone-verified.resolver';
import { NewDeviceLoginResolver } from './resolvers/new-device-login.resolver';
import { PasswordChangedResolver } from './resolvers/password-changed.resolver';
import { LoginFailedResolver } from './resolvers/login-failed.resolver';
import { TwoFaDisabledResolver } from './resolvers/two-fa-disabled.resolver';
import { CenterAccessActivatedResolver } from './resolvers/access-control/center-access-activated.resolver';
import { CenterAccessDeactivatedResolver } from './resolvers/access-control/center-access-deactivated.resolver';
import { CenterAccessGrantedResolver } from './resolvers/access-control/center-access-granted.resolver';
import { CenterAccessRevokedResolver } from './resolvers/access-control/center-access-revoked.resolver';
import { RoleAssignedResolver } from './resolvers/access-control/role-assigned.resolver';
import { RoleRevokedResolver } from './resolvers/access-control/role-revoked.resolver';

// Session resolvers
import { SessionCreatedResolver } from './resolvers/sessions/session-created.resolver';
import { SessionUpdatedResolver } from './resolvers/sessions/session-updated.resolver';
import { SessionCanceledResolver } from './resolvers/sessions/session-canceled.resolver';
import { SessionFinishedResolver } from './resolvers/sessions/session-finished.resolver';
import { SessionDeletedResolver } from './resolvers/sessions/session-deleted.resolver';
import { SessionCheckedInResolver } from './resolvers/sessions/session-checked-in.resolver';
import { SessionConflictDetectedResolver } from './resolvers/sessions/session-conflict-detected.resolver';

// Class resolvers
import { ClassCreatedResolver } from './resolvers/classes/class-created.resolver';
import { ClassUpdatedResolver } from './resolvers/classes/class-updated.resolver';
import { ClassDeletedResolver } from './resolvers/classes/class-deleted.resolver';
import { ClassStatusChangedResolver } from './resolvers/classes/class-status-changed.resolver';
import { StaffAssignedToClassResolver } from './resolvers/classes/staff-assigned-to-class.resolver';
import { StaffRemovedFromClassResolver } from './resolvers/classes/staff-removed-from-class.resolver';

// Group resolvers
import { GroupCreatedResolver } from './resolvers/groups/group-created.resolver';
import { GroupUpdatedResolver } from './resolvers/groups/group-updated.resolver';
import { GroupDeletedResolver } from './resolvers/groups/group-deleted.resolver';
import { StudentAddedToGroupResolver } from './resolvers/groups/student-added-to-group.resolver';
import { StudentRemovedFromGroupResolver } from './resolvers/groups/student-removed-from-group.resolver';

// Student billing resolvers
import { ChargeCompletedResolver } from './resolvers/student-billing/charge-completed.resolver';
import { ChargeInstallmentPaidResolver } from './resolvers/student-billing/charge-installment-paid.resolver';
import { ChargeRefundedResolver } from './resolvers/student-billing/charge-refunded.resolver';

// Teacher payout resolvers
import { PayoutCreatedResolver } from './resolvers/teacher-payout/payout-created.resolver';
import { PayoutPaidResolver } from './resolvers/teacher-payout/payout-paid.resolver';
import { PayoutInstallmentPaidResolver } from './resolvers/teacher-payout/payout-installment-paid.resolver';

// Expense resolvers
import { ExpenseCreatedResolver } from './resolvers/expenses/expense-created.resolver';
import { ExpenseRefundedResolver } from './resolvers/expenses/expense-refunded.resolver';

// User profile resolvers
import { UserProfileActivatedResolver } from './resolvers/user-profile/user-profile-activated.resolver';
import { UserProfileDeactivatedResolver } from './resolvers/user-profile/user-profile-deactivated.resolver';
import { UserProfileDeletedResolver } from './resolvers/user-profile/user-profile-deleted.resolver';
import { UserProfileRestoredResolver } from './resolvers/user-profile/user-profile-restored.resolver';
import { UserProfileCreatedResolver } from './resolvers/user-profile/user-profile-created.resolver';

/**
 * Registry service for notification intent resolvers
 * Maps NotificationType to resolver instances
 */
@Injectable()
export class NotificationIntentResolverRegistryService implements OnModuleInit {
  private resolvers = new Map<
    NotificationType,
    NotificationIntentResolver<NotificationType>
  >();

  constructor(
    private readonly centerCreatedResolver: CenterCreatedResolver,
    private readonly centerUpdatedResolver: CenterUpdatedResolver,
    private readonly centerDeletedResolver: CenterDeletedResolver,
    private readonly centerRestoredResolver: CenterRestoredResolver,
    private readonly branchCreatedResolver: BranchCreatedResolver,
    private readonly branchUpdatedResolver: BranchUpdatedResolver,
    private readonly branchDeletedResolver: BranchDeletedResolver,
    private readonly branchRestoredResolver: BranchRestoredResolver,
    private readonly studentAbsentResolver: StudentAbsentResolver,
    private readonly otpResolver: OtpResolver,
    private readonly phoneVerifiedResolver: PhoneVerifiedResolver,
    private readonly newDeviceLoginResolver: NewDeviceLoginResolver,
    private readonly passwordChangedResolver: PasswordChangedResolver,
    private readonly loginFailedResolver: LoginFailedResolver,
    private readonly twoFaDisabledResolver: TwoFaDisabledResolver,
    private readonly centerAccessActivatedResolver: CenterAccessActivatedResolver,
    private readonly centerAccessDeactivatedResolver: CenterAccessDeactivatedResolver,
    private readonly centerAccessGrantedResolver: CenterAccessGrantedResolver,
    private readonly centerAccessRevokedResolver: CenterAccessRevokedResolver,
    private readonly roleAssignedResolver: RoleAssignedResolver,
    private readonly roleRevokedResolver: RoleRevokedResolver,
    // Session resolvers
    private readonly sessionCreatedResolver: SessionCreatedResolver,
    private readonly sessionUpdatedResolver: SessionUpdatedResolver,
    private readonly sessionCanceledResolver: SessionCanceledResolver,
    private readonly sessionFinishedResolver: SessionFinishedResolver,
    private readonly sessionDeletedResolver: SessionDeletedResolver,
    private readonly sessionCheckedInResolver: SessionCheckedInResolver,
    private readonly sessionConflictDetectedResolver: SessionConflictDetectedResolver,
    // Class resolvers
    private readonly classCreatedResolver: ClassCreatedResolver,
    private readonly classUpdatedResolver: ClassUpdatedResolver,
    private readonly classDeletedResolver: ClassDeletedResolver,
    private readonly classStatusChangedResolver: ClassStatusChangedResolver,
    private readonly staffAssignedToClassResolver: StaffAssignedToClassResolver,
    private readonly staffRemovedFromClassResolver: StaffRemovedFromClassResolver,
    // Group resolvers
    private readonly groupCreatedResolver: GroupCreatedResolver,
    private readonly groupUpdatedResolver: GroupUpdatedResolver,
    private readonly groupDeletedResolver: GroupDeletedResolver,
    private readonly studentAddedToGroupResolver: StudentAddedToGroupResolver,
    private readonly studentRemovedFromGroupResolver: StudentRemovedFromGroupResolver,
    // Student billing resolvers
    private readonly chargeCompletedResolver: ChargeCompletedResolver,
    private readonly chargeInstallmentPaidResolver: ChargeInstallmentPaidResolver,
    private readonly chargeRefundedResolver: ChargeRefundedResolver,
    // Teacher payout resolvers
    private readonly payoutCreatedResolver: PayoutCreatedResolver,
    private readonly payoutPaidResolver: PayoutPaidResolver,
    private readonly payoutInstallmentPaidResolver: PayoutInstallmentPaidResolver,
    // Expense resolvers
    private readonly expenseCreatedResolver: ExpenseCreatedResolver,
    private readonly expenseRefundedResolver: ExpenseRefundedResolver,
    // User profile resolvers
    private readonly userProfileActivatedResolver: UserProfileActivatedResolver,
    private readonly userProfileDeactivatedResolver: UserProfileDeactivatedResolver,
    private readonly userProfileDeletedResolver: UserProfileDeletedResolver,
    private readonly userProfileRestoredResolver: UserProfileRestoredResolver,
    private readonly userProfileCreatedResolver: UserProfileCreatedResolver,
  ) {}

  onModuleInit(): void {
    // Register all resolvers
    this.register(NotificationType.CENTER_CREATED, this.centerCreatedResolver);
    this.register(NotificationType.CENTER_UPDATED, this.centerUpdatedResolver);
    this.register(NotificationType.CENTER_DELETED, this.centerDeletedResolver);
    this.register(NotificationType.CENTER_RESTORED, this.centerRestoredResolver);
    this.register(NotificationType.BRANCH_CREATED, this.branchCreatedResolver);
    this.register(NotificationType.BRANCH_UPDATED, this.branchUpdatedResolver);
    this.register(NotificationType.BRANCH_DELETED, this.branchDeletedResolver);
    this.register(NotificationType.BRANCH_RESTORED, this.branchRestoredResolver);
    this.register(NotificationType.STUDENT_ABSENT, this.studentAbsentResolver);
    this.register(NotificationType.OTP, this.otpResolver);
    this.register(NotificationType.PHONE_VERIFIED, this.phoneVerifiedResolver);
    this.register(NotificationType.NEW_DEVICE_LOGIN, this.newDeviceLoginResolver);
    this.register(NotificationType.PASSWORD_CHANGED, this.passwordChangedResolver);
    this.register(NotificationType.LOGIN_FAILED, this.loginFailedResolver);
    this.register(NotificationType.TWO_FA_DISABLED, this.twoFaDisabledResolver);
    this.register(
      NotificationType.CENTER_ACCESS_ACTIVATED,
      this.centerAccessActivatedResolver,
    );
    this.register(
      NotificationType.CENTER_ACCESS_DEACTIVATED,
      this.centerAccessDeactivatedResolver,
    );
    this.register(
      NotificationType.CENTER_ACCESS_GRANTED,
      this.centerAccessGrantedResolver,
    );
    this.register(
      NotificationType.CENTER_ACCESS_REVOKED,
      this.centerAccessRevokedResolver,
    );
    this.register(NotificationType.ROLE_ASSIGNED, this.roleAssignedResolver);
    this.register(NotificationType.ROLE_REVOKED, this.roleRevokedResolver);

    // Session notifications
    this.register(NotificationType.SESSION_CREATED, this.sessionCreatedResolver);
    this.register(NotificationType.SESSION_UPDATED, this.sessionUpdatedResolver);
    this.register(NotificationType.SESSION_CANCELED, this.sessionCanceledResolver);
    this.register(NotificationType.SESSION_FINISHED, this.sessionFinishedResolver);
    this.register(NotificationType.SESSION_DELETED, this.sessionDeletedResolver);
    this.register(
      NotificationType.SESSION_CHECKED_IN,
      this.sessionCheckedInResolver,
    );
    this.register(
      NotificationType.SESSION_CONFLICT_DETECTED,
      this.sessionConflictDetectedResolver,
    );

    // Class notifications
    this.register(NotificationType.CLASS_CREATED, this.classCreatedResolver);
    this.register(NotificationType.CLASS_UPDATED, this.classUpdatedResolver);
    this.register(NotificationType.CLASS_DELETED, this.classDeletedResolver);
    this.register(
      NotificationType.CLASS_STATUS_CHANGED,
      this.classStatusChangedResolver,
    );
    this.register(
      NotificationType.STAFF_ASSIGNED_TO_CLASS,
      this.staffAssignedToClassResolver,
    );
    this.register(
      NotificationType.STAFF_REMOVED_FROM_CLASS,
      this.staffRemovedFromClassResolver,
    );

    // Group notifications
    this.register(NotificationType.GROUP_CREATED, this.groupCreatedResolver);
    this.register(NotificationType.GROUP_UPDATED, this.groupUpdatedResolver);
    this.register(NotificationType.GROUP_DELETED, this.groupDeletedResolver);
    this.register(
      NotificationType.STUDENT_ADDED_TO_GROUP,
      this.studentAddedToGroupResolver,
    );
    this.register(
      NotificationType.STUDENT_REMOVED_FROM_GROUP,
      this.studentRemovedFromGroupResolver,
    );

    // Student billing notifications
    this.register(
      NotificationType.CHARGE_COMPLETED,
      this.chargeCompletedResolver,
    );
    this.register(
      NotificationType.CHARGE_INSTALLMENT_PAID,
      this.chargeInstallmentPaidResolver,
    );
    this.register(NotificationType.CHARGE_REFUNDED, this.chargeRefundedResolver);

    // Teacher payout notifications
    this.register(
      NotificationType.PAYOUT_CREATED,
      this.payoutCreatedResolver,
    );
    this.register(NotificationType.PAYOUT_PAID, this.payoutPaidResolver);
    this.register(
      NotificationType.PAYOUT_INSTALLMENT_PAID,
      this.payoutInstallmentPaidResolver,
    );

    // Expense notifications
    this.register(
      NotificationType.EXPENSE_CREATED,
      this.expenseCreatedResolver,
    );
    this.register(
      NotificationType.EXPENSE_REFUNDED,
      this.expenseRefundedResolver,
    );

    // User profile lifecycle
    this.register(
      NotificationType.USER_PROFILE_ACTIVATED,
      this.userProfileActivatedResolver,
    );
    this.register(
      NotificationType.USER_PROFILE_DEACTIVATED,
      this.userProfileDeactivatedResolver,
    );
    this.register(
      NotificationType.USER_PROFILE_DELETED,
      this.userProfileDeletedResolver,
    );
    this.register(
      NotificationType.USER_PROFILE_RESTORED,
      this.userProfileRestoredResolver,
    );
    this.register(
      NotificationType.USER_PROFILE_CREATED,
      this.userProfileCreatedResolver,
    );
  }

  /**
   * Register a resolver for a notification type
   */
  private register<T extends NotificationType>(
    type: T,
    resolver: NotificationIntentResolver<T>,
  ): void {
    this.resolvers.set(type, resolver);
  }

  /**
   * Get resolver for a notification type
   */
  get<T extends NotificationType>(type: T) {
    return this.resolvers.get(type);
  }
}
