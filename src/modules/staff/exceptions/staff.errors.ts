import {
  DomainException,
  BaseErrorHelpers,
} from '@/shared/common/exceptions/domain.exception';
import { StaffErrorCode } from '../enums/staff.codes';

/**
 * Staff module error helpers
 * Clean, simple, and maintainable error creation
 */
export class StaffErrors extends BaseErrorHelpers {
  // Basic staff errors
  static staffNotFound(): DomainException {
    return this.createNoDetails(StaffErrorCode.STAFF_NOT_FOUND);
  }
}
