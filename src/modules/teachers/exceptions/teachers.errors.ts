import {
  DomainException,
  BaseErrorHelpers,
} from '@/shared/common/exceptions/domain.exception';
import { TeacherErrorCode } from '../enums/teachers.codes';

/**
 * Teacher module error helpers
 * Clean, simple, and maintainable error creation
 */
export class TeachersErrors extends BaseErrorHelpers {
  // Basic teacher errors
  static teacherNotFound(): DomainException {
    return this.createNoDetails(TeacherErrorCode.TEACHER_NOT_FOUND);
  }
}
