import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CenterEvents } from '@/shared/events/center.events.enum';
import { BranchEvents } from '@/shared/events/branch.events.enum';
import { AttendanceEvents } from '@/shared/events/attendance.events.enum';
import { AuthEvents } from '@/shared/events/auth.events.enum';
import { AccessControlEvents } from '@/shared/events/access-control.events.enum';
import { SessionEvents } from '@/shared/events/sessions.events.enum';
import { ClassEvents } from '@/shared/events/classes.events.enum';
import { GroupEvents } from '@/shared/events/groups.events.enum';
import {
  CreateCenterEvent,
  UpdateCenterEvent,
  DeleteCenterEvent,
  RestoreCenterEvent,
} from '@/modules/centers/events/center.events';
import {
  BranchCreatedEvent,
  BranchUpdatedEvent,
  BranchDeletedEvent,
  BranchRestoredEvent,
} from '@/modules/centers/events/branch.events';
import { StudentsMarkedAbsentEvent } from '@/modules/attendance/events/attendance.events';
import {
  OtpEvent,
  PhoneVerifiedEvent,
  UserLoggedInEvent,
  PasswordChangedEvent,
  UserLoginFailedEvent,
  TwoFactorDisabledEvent,
} from '@/modules/auth/events/auth.events';
import {
  ActivateCenterAccessEvent,
  DeactivateCenterAccessEvent,
  GrantCenterAccessEvent,
  RevokeCenterAccessEvent,
  AssignRoleEvent,
  RevokeRoleEvent,
} from '@/modules/access-control/events/access-control.events';
import {
  SessionCreatedEvent,
  SessionUpdatedEvent,
  SessionCanceledEvent,
  SessionFinishedEvent,
  SessionDeletedEvent,
  SessionCheckedInEvent,
  SessionConflictDetectedEvent,
} from '@/modules/sessions/events/session.events';
import {
  ClassCreatedEvent,
  ClassUpdatedEvent,
  ClassDeletedEvent,
  ClassStatusChangedEvent,
} from '@/modules/classes/events/class.events';
import {
  StaffAssignedToClassEvent,
  StaffRemovedFromClassEvent,
} from '@/modules/classes/events/class-staff.events';
import {
  GroupCreatedEvent,
  GroupUpdatedEvent,
  GroupDeletedEvent,
} from '@/modules/classes/events/group.events';
import {
  StudentAddedToGroupEvent,
  StudentRemovedFromGroupEvent,
} from '@/modules/classes/events/group-student.events';
import { StudentBillingEvents } from '@/shared/events/student-billing.events.enum';
import { TeacherPayoutEvents } from '@/shared/events/teacher-payouts.events.enum';
import {
  StudentChargeCompletedEvent,
  StudentChargeInstallmentPaidEvent,
  StudentChargeRefundedEvent,
} from '@/modules/student-billing/events/student-billing.events';
import {
  TeacherPayoutCreatedEvent,
  TeacherPayoutPaidEvent,
  TeacherPayoutInstallmentPaidEvent,
} from '@/modules/teacher-payouts/events/teacher-payout.events';
import { ExpenseEvents } from '@/shared/events/expenses.events.enum';
import {
  ExpenseCreatedEvent,
  ExpenseRefundedEvent,
} from '@/modules/expenses/events/expense.events';
import { UserProfileEvents } from '@/shared/events/user-profile.events.enum';
import {
  UserProfileActivatedEvent,
  UserProfileDeactivatedEvent,
  UserProfileDeletedEvent,
  UserProfileRestoredEvent,
  UserProfileCreatedEvent,
} from '@/modules/user-profile/events/user-profile.events';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationIntentService } from '../services/notification-intent.service';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { RedisService } from '@/shared/modules/redis/redis.service';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { UserProfileRepository } from '@/modules/user-profile/repositories/user-profile.repository';

// Rate limit window for login failed notifications (15 minutes)
const LOGIN_FAILED_COOLDOWN_SECONDS = 15 * 60;

@Injectable()
export class NotificationListener implements OnModuleInit {
  private readonly logger: Logger = new Logger(NotificationListener.name);

  constructor(
    private readonly intentService: NotificationIntentService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
    private readonly redisService: RedisService,
    private readonly userProfileService: UserProfileService,
    private readonly userProfileRepository: UserProfileRepository,
  ) {}

  onModuleInit(): void {
    // Register type-safe event listeners
    // Using TypeSafeEventEmitter ensures compile-time type safety between event name and payload type
    this.typeSafeEventEmitter.on(CenterEvents.CREATED, (event) => {
      void this.handleCenterCreated(event);
    });
    this.typeSafeEventEmitter.on(CenterEvents.UPDATED, (event) => {
      void this.handleCenterUpdated(event);
    });
    this.typeSafeEventEmitter.on(CenterEvents.DELETED, (event) => {
      void this.handleCenterDeleted(event);
    });
    this.typeSafeEventEmitter.on(CenterEvents.RESTORED, (event) => {
      void this.handleCenterRestored(event);
    });

    // Branch events
    this.typeSafeEventEmitter.on(BranchEvents.CREATED, (event) => {
      void this.handleBranchCreated(event);
    });
    this.typeSafeEventEmitter.on(BranchEvents.UPDATED, (event) => {
      void this.handleBranchUpdated(event);
    });
    this.typeSafeEventEmitter.on(BranchEvents.DELETED, (event) => {
      void this.handleBranchDeleted(event);
    });
    this.typeSafeEventEmitter.on(BranchEvents.RESTORED, (event) => {
      void this.handleBranchRestored(event);
    });

    // Attendance events
    this.typeSafeEventEmitter.on(AttendanceEvents.MARKED_ABSENT, (event) => {
      void this.handleStudentsMarkedAbsent(event);
    });

    this.typeSafeEventEmitter.on(AuthEvents.OTP, (event) => {
      void this.handleOtp(event);
    });
    this.typeSafeEventEmitter.on(AuthEvents.PHONE_VERIFIED, (event) => {
      void this.handlePhoneVerified(event);
    });

    // New device login - only notify if device is new
    this.typeSafeEventEmitter.on(AuthEvents.USER_LOGGED_IN, (event) => {
      void this.handleUserLoggedIn(event);
    });

    // Password changed notification
    this.typeSafeEventEmitter.on(AuthEvents.PASSWORD_CHANGED, (event) => {
      void this.handlePasswordChanged(event);
    });

    // Login failed notification
    this.typeSafeEventEmitter.on(AuthEvents.USER_LOGIN_FAILED, (event) => {
      void this.handleLoginFailed(event);
    });

    // 2FA disabled notification (critical - sends SMS)
    this.typeSafeEventEmitter.on(AuthEvents.TWO_FA_DISABLED, (event) => {
      void this.handleTwoFaDisabled(event);
    });

    // Center access activation/deactivation
    this.typeSafeEventEmitter.on(
      AccessControlEvents.ACTIVATE_CENTER_ACCESS,
      (event) => {
        void this.handleCenterAccessActivated(event);
      },
    );
    this.typeSafeEventEmitter.on(
      AccessControlEvents.DEACTIVATE_CENTER_ACCESS,
      (event) => {
        void this.handleCenterAccessDeactivated(event);
      },
    );

    // Center access events
    this.typeSafeEventEmitter.on(
      AccessControlEvents.GRANT_CENTER_ACCESS,
      (event) => {
        void this.handleGrantCenterAccess(event);
      },
    );
    this.typeSafeEventEmitter.on(
      AccessControlEvents.REVOKE_CENTER_ACCESS,
      (event) => {
        void this.handleRevokeCenterAccess(event);
      },
    );

    // Role events
    this.typeSafeEventEmitter.on(AccessControlEvents.ASSIGN_ROLE, (event) => {
      void this.handleAssignRole(event);
    });
    this.typeSafeEventEmitter.on(AccessControlEvents.REVOKE_ROLE, (event) => {
      void this.handleRevokeRole(event);
    });

    // Session events
    this.typeSafeEventEmitter.on(SessionEvents.CREATED, (event) => {
      void this.handleSessionCreated(event);
    });
    this.typeSafeEventEmitter.on(SessionEvents.UPDATED, (event) => {
      void this.handleSessionUpdated(event);
    });
    this.typeSafeEventEmitter.on(SessionEvents.CANCELED, (event) => {
      void this.handleSessionCanceled(event);
    });
    this.typeSafeEventEmitter.on(SessionEvents.FINISHED, (event) => {
      void this.handleSessionFinished(event);
    });
    this.typeSafeEventEmitter.on(SessionEvents.DELETED, (event) => {
      void this.handleSessionDeleted(event);
    });
    this.typeSafeEventEmitter.on(SessionEvents.CHECKED_IN, (event) => {
      void this.handleSessionCheckedIn(event);
    });
    this.typeSafeEventEmitter.on(SessionEvents.CONFLICT_DETECTED, (event) => {
      void this.handleSessionConflictDetected(event);
    });

    // Class events
    this.typeSafeEventEmitter.on(ClassEvents.CREATED, (event) => {
      void this.handleClassCreated(event);
    });
    this.typeSafeEventEmitter.on(ClassEvents.UPDATED, (event) => {
      void this.handleClassUpdated(event);
    });
    this.typeSafeEventEmitter.on(ClassEvents.DELETED, (event) => {
      void this.handleClassDeleted(event);
    });
    this.typeSafeEventEmitter.on(ClassEvents.STATUS_CHANGED, (event) => {
      void this.handleClassStatusChanged(event);
    });
    this.typeSafeEventEmitter.on(ClassEvents.STAFF_ASSIGNED, (event) => {
      void this.handleStaffAssignedToClass(event);
    });
    this.typeSafeEventEmitter.on(ClassEvents.STAFF_REMOVED, (event) => {
      void this.handleStaffRemovedFromClass(event);
    });

    // Group events
    this.typeSafeEventEmitter.on(GroupEvents.CREATED, (event) => {
      void this.handleGroupCreated(event);
    });
    this.typeSafeEventEmitter.on(GroupEvents.UPDATED, (event) => {
      void this.handleGroupUpdated(event);
    });
    this.typeSafeEventEmitter.on(GroupEvents.DELETED, (event) => {
      void this.handleGroupDeleted(event);
    });
    this.typeSafeEventEmitter.on(GroupEvents.STUDENT_ADDED, (event) => {
      void this.handleStudentAddedToGroup(event);
    });
    this.typeSafeEventEmitter.on(GroupEvents.STUDENT_REMOVED, (event) => {
      void this.handleStudentRemovedFromGroup(event);
    });

    // Student billing events (skip CHARGE_CREATED – avoid double notification when create+pay same flow)
    this.typeSafeEventEmitter.on(
      StudentBillingEvents.CHARGE_COMPLETED,
      (event) => {
        void this.handleChargeCompleted(event);
      },
    );
    this.typeSafeEventEmitter.on(
      StudentBillingEvents.INSTALLMENT_PAID,
      (event) => {
        void this.handleChargeInstallmentPaid(event);
      },
    );
    this.typeSafeEventEmitter.on(
      StudentBillingEvents.CHARGE_REFUNDED,
      (event) => {
        void this.handleChargeRefunded(event);
      },
    );

    // Teacher payout events (skip PAYOUT_STATUS_UPDATED – use PAYOUT_PAID only)
    this.typeSafeEventEmitter.on(
      TeacherPayoutEvents.PAYOUT_CREATED,
      (event) => {
        void this.handlePayoutCreated(event);
      },
    );
    this.typeSafeEventEmitter.on(TeacherPayoutEvents.PAYOUT_PAID, (event) => {
      void this.handlePayoutPaid(event);
    });
    this.typeSafeEventEmitter.on(
      TeacherPayoutEvents.INSTALLMENT_PAID,
      (event) => {
        void this.handlePayoutInstallmentPaid(event);
      },
    );

    // Expense events (skip EXPENSE_UPDATED – metadata only)
    this.typeSafeEventEmitter.on(ExpenseEvents.CREATED, (event) => {
      void this.handleExpenseCreated(event);
    });
    this.typeSafeEventEmitter.on(ExpenseEvents.REFUNDED, (event) => {
      void this.handleExpenseRefunded(event);
    });

    // User profile lifecycle
    this.typeSafeEventEmitter.on(UserProfileEvents.ACTIVATED, (event) => {
      void this.handleUserProfileActivated(event);
    });
    this.typeSafeEventEmitter.on(UserProfileEvents.DEACTIVATED, (event) => {
      void this.handleUserProfileDeactivated(event);
    });
    this.typeSafeEventEmitter.on(UserProfileEvents.DELETED, (event) => {
      void this.handleUserProfileDeleted(event);
    });
    this.typeSafeEventEmitter.on(UserProfileEvents.RESTORED, (event) => {
      void this.handleUserProfileRestored(event);
    });
    this.typeSafeEventEmitter.on(UserProfileEvents.CREATED, (event) => {
      void this.handleUserProfileCreated(event);
    });
  }

  private async handleCenterCreated(event: CreateCenterEvent) {
    // Emit intent - resolver will handle all audiences (OWNER, ADMIN)
    // The processor loops through audiences and calls resolver for each
    await this.intentService.enqueue(NotificationType.CENTER_CREATED, {
      centerId: event.center.id,
      actorId: event.actor.userProfileId,
    });
  }

  private async handleCenterUpdated(event: UpdateCenterEvent) {
    // Emit intent - resolver will fetch center and resolve recipients
    await this.intentService.enqueue(NotificationType.CENTER_UPDATED, {
      centerId: event.centerId,
      actorId: event.actor.userProfileId,
    });
  }

  private async handleCenterDeleted(event: DeleteCenterEvent) {
    await this.intentService.enqueue(NotificationType.CENTER_DELETED, {
      centerId: event.centerId,
      actorId: event.actor.userProfileId,
    });
  }

  private async handleCenterRestored(event: RestoreCenterEvent) {
    await this.intentService.enqueue(NotificationType.CENTER_RESTORED, {
      centerId: event.centerId,
      actorId: event.actor.userProfileId,
    });
  }

  private async handleBranchCreated(event: BranchCreatedEvent) {
    await this.intentService.enqueue(NotificationType.BRANCH_CREATED, {
      branchId: event.branch.id,
      centerId: event.branch.centerId,
      actorId: event.actor.userProfileId,
    });
  }

  private async handleBranchUpdated(event: BranchUpdatedEvent) {
    await this.intentService.enqueue(NotificationType.BRANCH_UPDATED, {
      branchId: event.branchId,
      centerId: event.centerId,
      actorId: event.actor.userProfileId,
      changedFields: event.updates ? Object.keys(event.updates) : undefined,
    });
  }

  private async handleBranchDeleted(event: BranchDeletedEvent) {
    await this.intentService.enqueue(NotificationType.BRANCH_DELETED, {
      branchId: event.branchId,
      centerId: event.centerId,
      actorId: event.actor.userProfileId,
    });
  }

  private async handleBranchRestored(event: BranchRestoredEvent) {
    await this.intentService.enqueue(NotificationType.BRANCH_RESTORED, {
      branchId: event.branchId,
      centerId: event.centerId,
      actorId: event.actor.userProfileId,
    });
  }

  private async handleStudentsMarkedAbsent(event: StudentsMarkedAbsentEvent) {
    for (const studentUserProfileId of event.studentUserProfileIds) {
      await this.intentService.enqueue(NotificationType.STUDENT_ABSENT, {
        studentUserProfileId,
        sessionId: event.sessionId,
        groupId: event.groupId,
        centerId: event.centerId,
        actorId: event.actor.userProfileId,
      });
    }
  }

  private async handleOtp(event: OtpEvent) {
    // Emit intent with template variables (otpCode, expiresIn)
    // Resolver will fetch user and resolve recipients
    await this.intentService.enqueue(NotificationType.OTP, {
      userId: event.userId,
      otpCode: event.otpCode,
      expiresIn: event.expiresIn,
    });
  }

  private async handlePhoneVerified(event: PhoneVerifiedEvent) {
    // Emit intent - resolver will fetch user and resolve recipients
    await this.intentService.enqueue(NotificationType.PHONE_VERIFIED, {
      userId: event.userId,
    });
  }

  private async handleUserLoggedIn(event: UserLoggedInEvent) {
    // Only notify if device is new
    if (event.isNewDevice) {
      await this.intentService.enqueue(NotificationType.NEW_DEVICE_LOGIN, {
        userId: event.userId,
        deviceName: event.deviceName,
      });
    }
  }

  private async handlePasswordChanged(event: PasswordChangedEvent) {
    await this.intentService.enqueue(NotificationType.PASSWORD_CHANGED, {
      userId: event.userId,
    });
  }

  private async handleLoginFailed(event: UserLoginFailedEvent) {
    // Only notify if we have a userId (registered user)
    if (!event.userId) {
      return;
    }

    // Rate limit: only send one notification per 15 minutes per user
    // This prevents spam if user forgets password and tries many times
    const rateLimitKey = `login_failed_notif:${event.userId}`;
    const client = this.redisService.getClient();

    try {
      // SET NX (only if key doesn't exist) with 15 minute expiration
      const wasSet = await client.set(
        rateLimitKey,
        '1',
        'EX',
        LOGIN_FAILED_COOLDOWN_SECONDS,
        'NX',
      );

      // If key was set, this is the first failed attempt in the window - send notification
      if (wasSet) {
        await this.intentService.enqueue(NotificationType.LOGIN_FAILED, {
          userId: event.userId,
        });
      }
      // If key already existed, skip notification (already sent recently)
    } catch (error) {
      // On Redis error, send notification anyway (fail open)
      this.logger.error('Failed to check login failed rate limit', error);
      await this.intentService.enqueue(NotificationType.LOGIN_FAILED, {
        userId: event.userId,
      });
    }
  }

  private async handleTwoFaDisabled(event: TwoFactorDisabledEvent) {
    // Critical security notification - sends SMS
    await this.intentService.enqueue(NotificationType.TWO_FA_DISABLED, {
      userId: event.userId,
    });
  }

  private async handleCenterAccessActivated(event: ActivateCenterAccessEvent) {
    await this.intentService.enqueue(NotificationType.CENTER_ACCESS_ACTIVATED, {
      userProfileId: event.userProfileId,
      centerId: event.centerId,
      actorId: event.actor.userProfileId,
    });
  }

  private async handleCenterAccessDeactivated(
    event: DeactivateCenterAccessEvent,
  ) {
    await this.intentService.enqueue(
      NotificationType.CENTER_ACCESS_DEACTIVATED,
      {
        userProfileId: event.userProfileId,
        centerId: event.centerId,
        actorId: event.actor.userProfileId,
      },
    );
  }

  private async handleGrantCenterAccess(event: GrantCenterAccessEvent) {
    await this.intentService.enqueue(NotificationType.CENTER_ACCESS_GRANTED, {
      userProfileId: event.userProfileId,
      centerId: event.centerId,
      actorId: event.actor.userProfileId,
    });
  }

  private async handleRevokeCenterAccess(event: RevokeCenterAccessEvent) {
    await this.intentService.enqueue(NotificationType.CENTER_ACCESS_REVOKED, {
      userProfileId: event.userProfileId,
      centerId: event.centerId,
      actorId: event.actor.userProfileId,
    });
  }

  private async handleAssignRole(event: AssignRoleEvent) {
    await this.intentService.enqueue(NotificationType.ROLE_ASSIGNED, {
      userProfileId: event.userProfileId,
      roleId: event.roleId,
      centerId: event.centerId,
      actorId: event.actor.userProfileId,
    });
  }

  private async handleRevokeRole(event: RevokeRoleEvent) {
    await this.intentService.enqueue(NotificationType.ROLE_REVOKED, {
      userProfileId: event.userProfileId,
      roleId: event.roleId,
      centerId: event.centerId,
      actorId: event.actor.userProfileId,
    });
  }

  // Session event handlers
  private async handleSessionCreated(event: SessionCreatedEvent) {
    await this.intentService.enqueue(NotificationType.SESSION_CREATED, {
      sessionId: event.session.id,
      groupId: event.session.groupId,
      centerId: event.centerId,
      actorId: event.actor.userProfileId,
    });
  }

  private async handleSessionUpdated(event: SessionUpdatedEvent) {
    await this.intentService.enqueue(NotificationType.SESSION_UPDATED, {
      sessionId: event.session.id,
      groupId: event.session.groupId,
      centerId: event.centerId,
      actorId: event.actor.userProfileId,
    });
  }

  private async handleSessionCanceled(event: SessionCanceledEvent) {
    await this.intentService.enqueue(NotificationType.SESSION_CANCELED, {
      sessionId: event.session.id,
      groupId: event.session.groupId,
      centerId: event.centerId,
      actorId: event.actor.userProfileId,
    });
  }

  private async handleSessionFinished(event: SessionFinishedEvent) {
    await this.intentService.enqueue(NotificationType.SESSION_FINISHED, {
      sessionId: event.session.id,
      groupId: event.session.groupId,
      centerId: event.centerId,
      actorId: event.actor.userProfileId,
    });
  }

  private async handleSessionDeleted(event: SessionDeletedEvent) {
    await this.intentService.enqueue(NotificationType.SESSION_DELETED, {
      sessionId: event.sessionId,
      groupId: event.groupId,
      centerId: event.centerId,
      actorId: event.actor.userProfileId,
    });
  }

  private async handleSessionCheckedIn(event: SessionCheckedInEvent) {
    await this.intentService.enqueue(NotificationType.SESSION_CHECKED_IN, {
      sessionId: event.session.id,
      groupId: event.session.groupId,
      centerId: event.centerId,
      actorId: event.actor.userProfileId,
    });
  }

  private async handleSessionConflictDetected(
    event: SessionConflictDetectedEvent,
  ) {
    await this.intentService.enqueue(
      NotificationType.SESSION_CONFLICT_DETECTED,
      {
        groupId: event.groupId,
        scheduleItemId: event.scheduleItemId,
        centerId: event.centerId,
        conflictType: event.conflictType,
        conflictingSessionId: event.conflictingSessionId,
        proposedStartTime: event.proposedStartTime,
        proposedEndTime: event.proposedEndTime,
        actorId: event.actor.userProfileId,
      },
    );
  }

  // Class event handlers
  private async handleClassCreated(event: ClassCreatedEvent) {
    await this.intentService.enqueue(NotificationType.CLASS_CREATED, {
      classId: event.classEntity.id,
      centerId: event.centerId,
      actorId: event.actor.userProfileId,
    });
  }

  private async handleClassUpdated(event: ClassUpdatedEvent) {
    await this.intentService.enqueue(NotificationType.CLASS_UPDATED, {
      classId: event.classEntity.id,
      centerId: event.centerId,
      actorId: event.actor.userProfileId,
      changedFields: event.changedFields,
    });
  }

  private async handleClassDeleted(event: ClassDeletedEvent) {
    await this.intentService.enqueue(NotificationType.CLASS_DELETED, {
      classId: event.classId,
      centerId: event.centerId,
      actorId: event.actor.userProfileId,
    });
  }

  private async handleClassStatusChanged(event: ClassStatusChangedEvent) {
    await this.intentService.enqueue(NotificationType.CLASS_STATUS_CHANGED, {
      classId: event.classId,
      centerId: event.centerId,
      oldStatus: event.oldStatus,
      newStatus: event.newStatus,
      actorId: event.actor.userProfileId,
    });
  }

  private async handleStaffAssignedToClass(event: StaffAssignedToClassEvent) {
    await this.intentService.enqueue(NotificationType.STAFF_ASSIGNED_TO_CLASS, {
      staffUserProfileId: event.staffUserProfileId,
      classId: event.classEntity.id,
      centerId: event.centerId,
      actorId: event.actor.userProfileId,
    });
  }

  private async handleStaffRemovedFromClass(event: StaffRemovedFromClassEvent) {
    await this.intentService.enqueue(
      NotificationType.STAFF_REMOVED_FROM_CLASS,
      {
        staffUserProfileId: event.staffUserProfileId,
        classId: event.classId,
        className: event.className,
        centerId: event.centerId,
        actorId: event.actor.userProfileId,
      },
    );
  }

  // Group event handlers
  private async handleGroupCreated(event: GroupCreatedEvent) {
    await this.intentService.enqueue(NotificationType.GROUP_CREATED, {
      groupId: event.group.id,
      classId: event.group.classId,
      centerId: event.centerId,
      actorId: event.actor.userProfileId,
    });
  }

  private async handleGroupUpdated(event: GroupUpdatedEvent) {
    await this.intentService.enqueue(NotificationType.GROUP_UPDATED, {
      groupId: event.group.id,
      classId: event.group.classId,
      centerId: event.centerId,
      actorId: event.actor.userProfileId,
      changedFields: event.changedFields,
    });
  }

  private async handleGroupDeleted(event: GroupDeletedEvent) {
    await this.intentService.enqueue(NotificationType.GROUP_DELETED, {
      groupId: event.groupId,
      classId: event.classId,
      centerId: event.centerId,
      actorId: event.actor.userProfileId,
    });
  }

  private async handleStudentAddedToGroup(event: StudentAddedToGroupEvent) {
    await this.intentService.enqueue(NotificationType.STUDENT_ADDED_TO_GROUP, {
      studentUserProfileId: event.studentUserProfileId,
      groupId: event.group.id,
      centerId: event.centerId,
      actorId: event.actor.userProfileId,
    });
  }

  private async handleStudentRemovedFromGroup(
    event: StudentRemovedFromGroupEvent,
  ) {
    await this.intentService.enqueue(
      NotificationType.STUDENT_REMOVED_FROM_GROUP,
      {
        studentUserProfileId: event.studentUserProfileId,
        groupId: event.groupId,
        groupName: event.groupName,
        className: event.className,
        centerId: event.centerId,
        actorId: event.actor.userProfileId,
      },
    );
  }

  private async handleChargeCompleted(event: StudentChargeCompletedEvent) {
    await this.intentService.enqueue(NotificationType.CHARGE_COMPLETED, {
      chargeId: event.charge.id,
      actorId: event.actor.userProfileId,
    });
  }

  private async handleChargeInstallmentPaid(
    event: StudentChargeInstallmentPaidEvent,
  ) {
    await this.intentService.enqueue(NotificationType.CHARGE_INSTALLMENT_PAID, {
      chargeId: event.charge.id,
      actorId: event.actor.userProfileId,
    });
  }

  private async handleChargeRefunded(event: StudentChargeRefundedEvent) {
    await this.intentService.enqueue(NotificationType.CHARGE_REFUNDED, {
      chargeId: event.charge.id,
      actorId: event.actor.userProfileId,
      refundReason: event.refundReason ?? '',
    });
  }

  private async handlePayoutCreated(event: TeacherPayoutCreatedEvent) {
    await this.intentService.enqueue(NotificationType.PAYOUT_CREATED, {
      payoutId: event.payout.id,
      actorId: event.actor.userProfileId,
    });
  }

  private async handlePayoutPaid(event: TeacherPayoutPaidEvent) {
    await this.intentService.enqueue(NotificationType.PAYOUT_PAID, {
      payoutId: event.payout.id,
      actorId: event.actor.userProfileId,
    });
  }

  private async handlePayoutInstallmentPaid(
    event: TeacherPayoutInstallmentPaidEvent,
  ) {
    await this.intentService.enqueue(NotificationType.PAYOUT_INSTALLMENT_PAID, {
      payoutId: event.payout.id,
      actorId: event.actor.userProfileId,
    });
  }

  private async handleExpenseCreated(event: ExpenseCreatedEvent) {
    await this.intentService.enqueue(NotificationType.EXPENSE_CREATED, {
      expenseId: event.expense.id,
      centerId: event.expense.centerId,
      branchId: event.expense.branchId,
      actorId: event.actor.userProfileId,
    });
  }

  private async handleExpenseRefunded(event: ExpenseRefundedEvent) {
    await this.intentService.enqueue(NotificationType.EXPENSE_REFUNDED, {
      expenseId: event.expense.id,
      centerId: event.expense.centerId,
      branchId: event.expense.branchId,
      actorId: event.actor.userProfileId,
    });
  }

  private async handleUserProfileActivated(
    event: UserProfileActivatedEvent,
  ): Promise<void> {
    if (
      await this.shouldSkipUserProfileNotification(
        event.userProfileId,
        event.actor.userProfileId,
        false,
      )
    )
      return;
    await this.intentService.enqueue(NotificationType.USER_PROFILE_ACTIVATED, {
      userProfileId: event.userProfileId,
      actorId: event.actor.userProfileId,
    });
  }

  private async handleUserProfileDeactivated(
    event: UserProfileDeactivatedEvent,
  ): Promise<void> {
    if (
      await this.shouldSkipUserProfileNotification(
        event.userProfileId,
        event.actor.userProfileId,
        false,
      )
    )
      return;
    await this.intentService.enqueue(
      NotificationType.USER_PROFILE_DEACTIVATED,
      {
        userProfileId: event.userProfileId,
        actorId: event.actor.userProfileId,
      },
    );
  }

  private async handleUserProfileDeleted(
    event: UserProfileDeletedEvent,
  ): Promise<void> {
    if (
      await this.shouldSkipUserProfileNotification(
        event.userProfileId,
        event.actor.userProfileId,
        true,
      )
    )
      return;
    await this.intentService.enqueue(NotificationType.USER_PROFILE_DELETED, {
      userProfileId: event.userProfileId,
      actorId: event.actor.userProfileId,
    });
  }

  private async handleUserProfileRestored(
    event: UserProfileRestoredEvent,
  ): Promise<void> {
    if (
      await this.shouldSkipUserProfileNotification(
        event.userProfileId,
        event.actor.userProfileId,
        false,
      )
    )
      return;
    await this.intentService.enqueue(NotificationType.USER_PROFILE_RESTORED, {
      userProfileId: event.userProfileId,
      actorId: event.actor.userProfileId,
    });
  }

  private async handleUserProfileCreated(
    event: UserProfileCreatedEvent,
  ): Promise<void> {
    if (
      await this.shouldSkipUserProfileNotification(
        event.userProfileId,
        event.actor.userProfileId,
        false,
      )
    )
      return;
    await this.intentService.enqueue(NotificationType.USER_PROFILE_CREATED, {
      userProfileId: event.userProfileId,
      actorId: event.actor.userProfileId,
      profileType: event.profileType,
      centerId: event.centerId,
    });
  }

  /**
   * Actor exclusion: skip enqueue when actor is the target user.
   * @param targetUserProfileId - The profile that was acted upon
   * @param actorUserProfileId - The profile that performed the action
   * @param targetIsSoftDeleted - Use findOneSoftDeletedById for target (e.g. USER_PROFILE_DELETED)
   */
  private async shouldSkipUserProfileNotification(
    targetUserProfileId: string,
    actorUserProfileId: string,
    targetIsSoftDeleted: boolean,
  ): Promise<boolean> {
    const targetProfile = targetIsSoftDeleted
      ? await this.userProfileRepository.findOneSoftDeletedById(
          targetUserProfileId,
        )
      : await this.userProfileService.findOne(targetUserProfileId);
    if (!targetProfile) return true;

    let actorProfile = null;
    try {
      actorProfile = await this.userProfileService.findOne(actorUserProfileId);
    } catch {
      /* skip exclusion check, still enqueue */
    }
    return !!actorProfile && actorProfile.userId === targetProfile.userId;
  }
}
