import { Injectable } from '@nestjs/common';
import { CommonErrors } from '../exceptions/common.errors';

@Injectable()
export class SelfProtectionService {
  /**
   * Validates that actor is not targeting themselves
   * Applies to ALL operations: delete, restore, update, activate, deactivate, assign, remove, etc.
   * @param actorUserProfileId - The actor's user profile ID
   * @param targetUserProfileId - The target user profile ID
   * @throws CommonErrors.cannotTargetSelf() if actor targets themselves
   */
  validateNotSelf(
    actorUserProfileId: string,
    targetUserProfileId: string,
  ): void {
    if (actorUserProfileId === targetUserProfileId) {
      throw CommonErrors.cannotTargetSelf();
    }
  }
}
