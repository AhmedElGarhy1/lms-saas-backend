import {
  DomainException,
  BaseErrorHelpers,
} from '@/shared/common/exceptions/domain.exception';
import { ClassErrorCode } from '../enums/classes.codes';

/**
 * Classes-specific error helpers
 * Clean, simple, and maintainable error creation for classes, groups, and scheduling
 */
export class ClassesErrors extends BaseErrorHelpers {
  // Class existence and lookup errors
  static classNotFound(): DomainException {
    return this.createNoDetails(ClassErrorCode.CLASS_NOT_FOUND);
  }

  // Class status and lifecycle errors
  static classStatusTransitionInvalid(): DomainException {
    return this.createNoDetails(ClassErrorCode.CLASS_STATUS_TRANSITION_INVALID);
  }

  static classCannotModifyCompleted(): DomainException {
    return this.createNoDetails(ClassErrorCode.CLASS_CANNOT_MODIFY_COMPLETED);
  }

  static classCannotModifyCancelled(): DomainException {
    return this.createNoDetails(ClassErrorCode.CLASS_CANNOT_MODIFY_CANCELLED);
  }

  static classStatusChangeGracePeriodExpired(): DomainException {
    return this.createNoDetails(
      ClassErrorCode.CLASS_STATUS_CHANGE_GRACE_PERIOD_EXPIRED,
    );
  }

  // Class access and permissions
  static classAccessDenied(): DomainException {
    return this.createNoDetails(ClassErrorCode.CLASS_ACCESS_DENIED);
  }

  static classStaffAlreadyAssigned(): DomainException {
    return this.createNoDetails(ClassErrorCode.CLASS_STAFF_ALREADY_ASSIGNED);
  }

  static classStaffNotAssigned(): DomainException {
    return this.createNoDetails(ClassErrorCode.CLASS_STAFF_NOT_ASSIGNED);
  }

  // Payment strategy errors
  static paymentStrategyNotFound(): DomainException {
    return this.createNoDetails(ClassErrorCode.PAYMENT_STRATEGY_NOT_FOUND);
  }

  static paymentStrategyUpdateDenied(): DomainException {
    return this.createNoDetails(ClassErrorCode.PAYMENT_STRATEGY_UPDATE_DENIED);
  }

  // Schedule errors
  static scheduleConflict(details?: any[]): DomainException {
    return details && details.length > 0
      ? this.createWithDetails(ClassErrorCode.SCHEDULE_CONFLICT, {
          conflicts: details,
        })
      : this.createNoDetails(ClassErrorCode.SCHEDULE_CONFLICT);
  }

  static scheduleOverlap(): DomainException {
    return this.createNoDetails(ClassErrorCode.SCHEDULE_OVERLAP);
  }

  // Detailed teacher schedule conflicts
  static teacherScheduleConflict(
    teacherName: string,
    teacherUserProfileId: string,
    conflicts: Array<{ day: string; timeRange: string }>,
  ): DomainException {
    return this.createWithDetails(ClassErrorCode.TEACHER_SCHEDULE_CONFLICT, {
      teacherName,
      teacherUserProfileId,
      conflicts,
    });
  }

  // Detailed student schedule conflicts
  static studentScheduleConflict(
    studentName: string,
    studentUserProfileId: string,
    conflicts: Array<{ day: string; timeRange: string }>,
  ): DomainException {
    return this.createWithDetails(ClassErrorCode.STUDENT_SCHEDULE_CONFLICT, {
      studentName,
      studentUserProfileId,
      conflicts,
    });
  }

  // Group errors
  static groupNotFound(): DomainException {
    return this.createNoDetails(ClassErrorCode.GROUP_NOT_FOUND);
  }

  static groupAlreadyExists(): DomainException {
    return this.createNoDetails(ClassErrorCode.GROUP_ALREADY_EXISTS);
  }

  static groupStudentAlreadyAssigned(): DomainException {
    return this.createNoDetails(ClassErrorCode.GROUP_STUDENT_ALREADY_ASSIGNED);
  }

  static groupStudentNotAssigned(): DomainException {
    return this.createNoDetails(ClassErrorCode.GROUP_STUDENT_NOT_ASSIGNED);
  }

  static studentInvalidTypeForGroupAssignment(): DomainException {
    return this.createNoDetails(
      ClassErrorCode.STUDENT_INVALID_TYPE_FOR_GROUP_ASSIGNMENT,
    );
  }

  static studentAlreadyAssignedToGroup(): DomainException {
    return this.createNoDetails(
      ClassErrorCode.STUDENT_ALREADY_ASSIGNED_TO_GROUP,
    );
  }

  static resourceAccessDenied(): DomainException {
    return this.createNoDetails(ClassErrorCode.RESOURCE_ACCESS_DENIED);
  }

  static cannotAccessClasses(): DomainException {
    return this.createNoDetails(ClassErrorCode.CANNOT_ACCESS_CLASSES);
  }

  static cannotAccessClass(): DomainException {
    return this.createNoDetails(ClassErrorCode.CANNOT_ACCESS_CLASS);
  }

  static classBranchRequired(): DomainException {
    return this.createNoDetails(ClassErrorCode.CLASS_BRANCH_REQUIRED);
  }

  static classStaffAccessNotFound(): DomainException {
    return this.createNoDetails(ClassErrorCode.CLASS_STAFF_ACCESS_NOT_FOUND);
  }

  // Validation errors
  static classValidationFailed(): DomainException {
    return this.createNoDetails(ClassErrorCode.CLASS_VALIDATION_FAILED);
  }

  static groupValidationFailed(): DomainException {
    return this.createNoDetails(ClassErrorCode.GROUP_VALIDATION_FAILED);
  }

  static classStartDateUpdateForbidden(): DomainException {
    return this.createNoDetails(
      ClassErrorCode.CLASS_START_DATE_UPDATE_FORBIDDEN,
    );
  }

  static classStatusDoesNotAllowStaffAssignment(): DomainException {
    return this.createNoDetails(
      ClassErrorCode.CLASS_STATUS_DOES_NOT_ALLOW_STAFF_ASSIGNMENT,
    );
  }

  static staffAlreadyAssignedToClass(): DomainException {
    return this.createNoDetails(ClassErrorCode.STAFF_ALREADY_ASSIGNED_TO_CLASS);
  }

  static groupCreationNotAllowedForClassStatus(): DomainException {
    return this.createNoDetails(
      ClassErrorCode.GROUP_CREATION_NOT_ALLOWED_FOR_CLASS_STATUS,
    );
  }
}
