import {
  DomainException,
  BaseErrorHelpers,
} from '@/shared/common/exceptions/domain.exception';
import { SessionErrorCode } from '../enums/sessions.codes';

/**
 * Session module error helpers
 * Clean, simple, and maintainable error creation
 */
export class SessionsErrors extends BaseErrorHelpers {

  // Basic session errors
  static sessionNotFound(): DomainException {
    return this.createNoDetails(SessionErrorCode.SESSION_NOT_FOUND);
  }

  static sessionAlreadyExists(): DomainException {
    return this.createNoDetails(SessionErrorCode.SESSION_ALREADY_EXISTS);
  }

  static sessionInactive(): DomainException {
    return this.createNoDetails(SessionErrorCode.SESSION_INACTIVE);
  }

  static sessionDeleted(): DomainException {
    return this.createNoDetails(SessionErrorCode.SESSION_DELETED);
  }

  // Status transition errors
  static sessionStatusTransitionInvalid(): DomainException {
    return this.createNoDetails(SessionErrorCode.SESSION_STATUS_TRANSITION_INVALID);
  }

  static sessionCannotModifyCompleted(): DomainException {
    return this.createNoDetails(SessionErrorCode.SESSION_CANNOT_MODIFY_COMPLETED);
  }

  static sessionCannotModifyCancelled(): DomainException {
    return this.createNoDetails(SessionErrorCode.SESSION_CANNOT_MODIFY_CANCELLED);
  }

  // Time validation errors
  static sessionStartTimePast(): DomainException {
    return this.createNoDetails(SessionErrorCode.SESSION_START_TIME_PAST);
  }

  // Status and operation errors
  static sessionCancelFailed(): DomainException {
    return this.createNoDetails(SessionErrorCode.SESSION_CANCEL_FAILED);
  }

  static sessionClassNotActive(): DomainException {
    return this.createNoDetails(SessionErrorCode.SESSION_CLASS_NOT_ACTIVE);
  }

  static sessionScheduleConflict(): DomainException {
    return this.createNoDetails(SessionErrorCode.SESSION_SCHEDULE_CONFLICT);
  }

  static sessionCheckInInvalidStatus(): DomainException {
    return this.createNoDetails(SessionErrorCode.SESSION_CHECK_IN_INVALID_STATUS);
  }

  static sessionScheduleItemNotFound(): DomainException {
    return this.createNoDetails(SessionErrorCode.SESSION_SCHEDULE_ITEM_NOT_FOUND);
  }

  static sessionNotCheckedIn(): DomainException {
    return this.createNoDetails(SessionErrorCode.SESSION_NOT_CHECKED_IN);
  }

  static sessionStartInvalidStatus(): DomainException {
    return this.createNoDetails(SessionErrorCode.SESSION_START_INVALID_STATUS);
  }

  static sessionCannotUpdate(): DomainException {
    return this.createNoDetails(SessionErrorCode.SESSION_CANNOT_UPDATE);
  }

  static sessionStatusInvalidForOperation(): DomainException {
    return this.createNoDetails(SessionErrorCode.SESSION_STATUS_INVALID_FOR_OPERATION);
  }

  static sessionAccessDenied(): DomainException {
    return this.createNoDetails(SessionErrorCode.SESSION_ACCESS_DENIED);
  }

  static sessionScheduleItemInvalid(): DomainException {
    return this.createNoDetails(SessionErrorCode.SESSION_SCHEDULE_ITEM_INVALID);
  }

  static sessionInvalidIdFormat(): DomainException {
    return this.createNoDetails(SessionErrorCode.SESSION_INVALID_ID_FORMAT);
  }
}
