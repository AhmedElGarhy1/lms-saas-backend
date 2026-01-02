import {
  DomainException,
  BaseErrorHelpers,
} from '@/shared/common/exceptions/domain.exception';
import { StudentErrorCode } from '../enums/students.codes';

/**
 * Student module error helpers
 * Clean, simple, and maintainable error creation
 */
export class StudentsErrors extends BaseErrorHelpers {
  // Basic student errors
  static studentNotFound(): DomainException {
    return this.createNoDetails(StudentErrorCode.STUDENT_NOT_FOUND);
  }
}
