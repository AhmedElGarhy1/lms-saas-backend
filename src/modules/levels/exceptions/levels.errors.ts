import {
  DomainException,
  BaseErrorHelpers,
} from '@/shared/common/exceptions/domain.exception';
import { LevelErrorCode } from '../enums/levels.codes';

/**
 * Level module error helpers
 * Clean, simple, and maintainable error creation
 */
export class LevelsErrors extends BaseErrorHelpers {
  // Basic level errors
  static levelNotFound(): DomainException {
    return this.createNoDetails(LevelErrorCode.LEVEL_NOT_FOUND);
  }
}
