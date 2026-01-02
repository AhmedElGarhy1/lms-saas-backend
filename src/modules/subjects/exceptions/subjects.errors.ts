import {
  DomainException,
  BaseErrorHelpers,
} from '@/shared/common/exceptions/domain.exception';
import { SubjectErrorCode } from '../enums/subjects.codes';

/**
 * Subject module error helpers
 * Clean, simple, and maintainable error creation
 */
export class SubjectsErrors extends BaseErrorHelpers {
  // Basic subject errors
  static subjectNotFound(): DomainException {
    return this.createNoDetails(SubjectErrorCode.SUBJECT_NOT_FOUND);
  }
}
