import {
  DomainException,
  BaseErrorHelpers,
} from '@/shared/common/exceptions/domain.exception';
import { AdminErrorCode } from '../enums/admin.codes';

/**
 * Admin module error helpers
 * Clean, simple, and maintainable error creation
 */
export class AdminErrors extends BaseErrorHelpers {
  // Basic admin errors
  static adminNotFound(): DomainException {
    return this.createNoDetails(AdminErrorCode.ADMIN_NOT_FOUND);
  }
}
