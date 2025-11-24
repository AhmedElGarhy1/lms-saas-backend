import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { BaseService } from '@/shared/common/services/base.service';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { User } from '@/modules/user/entities/user.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { UserService } from '@/modules/user/services/user.service';
import { VerificationService } from '@/modules/auth/services/verification.service';
import { UserProfileService } from './user-profile.service';
import { UserProfileRepository } from '../repositories/user-profile.repository';
import { AccessControlService } from '@/modules/access-control/services/access-control.service';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { VerificationType } from '@/modules/auth/enums/verification-type.enum';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { VerifyUserImportDto } from '../dto/verify-user-import.dto';
import { Config } from '@/shared/config/config';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { AuthEvents } from '@/shared/events/auth.events.enum';
import { OtpEvent } from '@/modules/auth/events/auth.events';
import { UserActivityType } from '@/modules/user/enums/user-activity-type.enum';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';

@Injectable()
export class UserProfileImportService extends BaseService {
  private readonly logger: Logger = new Logger(UserProfileImportService.name);

  constructor(
    private readonly userService: UserService,
    private readonly verificationService: VerificationService,
    @Inject(forwardRef(() => UserProfileService))
    private readonly userProfileService: UserProfileService,
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(forwardRef(() => AccessControlService))
    private readonly accessControlService: AccessControlService,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly activityLogService: ActivityLogService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
    private readonly i18n: I18nService<I18nTranslations>,
  ) {
    super();
  }

  /**
   * Send OTP to phone number for user import verification
   * @param phone Phone number to send OTP to
   * @throws NotFoundException if user doesn't exist
   */
  async sendImportOtp(phone: string): Promise<void> {
    const user = await this.findUserByPhone(phone);

    const verificationToken =
      await this.verificationService.getOrCreateVerificationToken({
        userId: user.id,
        type: VerificationType.OTP_VERIFICATION,
      });

    const expiresInMinutes = Config.auth.phoneVerificationExpiresMinutes;
    const now = new Date();
    const expiresAt = verificationToken.expiresAt;
    const remainingMinutes = Math.max(
      0,
      Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60)),
    );

    await this.typeSafeEventEmitter.emitAsync(
      AuthEvents.OTP,
      new OtpEvent(
        user.id,
        verificationToken.code!,
        remainingMinutes || expiresInMinutes,
        undefined,
        user.getPhone(),
      ),
    );
  }

  /**
   * Verify OTP and import user by creating profile (if needed) and granting center access
   * @param dto Verification and import data
   * @param actor Actor performing the action
   * @returns Object with userProfileId and centerAccessId
   */
  async verifyAndImportUser(dto: VerifyUserImportDto, actor: ActorUser) {
    const user = await this.findUserByPhone(dto.phone);
    await this.verifyOtpCode(dto.code, user.id);

    const centerId = dto.centerId ?? actor.centerId;

    // Check if user already has profile of the requested type
    const existingProfile = await this.userProfileService.findUserProfileByType(
      user.id,
      dto.profileType,
    );

    if (centerId) {
      // Case 1: centerId is provided
      return await this.handleImportWithCenterId(
        user.id,
        dto.profileType,
        centerId,
        existingProfile,
        actor,
      );
    } else {
      // Case 2: centerId is NOT provided (global access scenario)
      // This method throws an error, so we don't need to return
      this.handleImportWithoutCenterId(
        user.id,
        dto.profileType,
        existingProfile,
      );
    }
  }

  /**
   * Handle import when centerId is provided
   * @private
   */
  private async handleImportWithCenterId(
    userId: string,
    profileType: ProfileType,
    centerId: string,
    existingProfile: UserProfile | null,
    actor: ActorUser,
  ) {
    // Check if user has center access (only if profile exists)
    let hasCenterAccess = false;
    if (existingProfile) {
      hasCenterAccess = await this.accessControlHelperService.canCenterAccess({
        userProfileId: existingProfile.id,
        centerId,
      });
    }

    // If user has BOTH profile AND center access → throw error
    if (existingProfile && hasCenterAccess) {
      throw new ConflictException(
        'User already has a profile and access to this center',
      );
    }

    // Get or create user profile
    const userProfile = await this.getOrCreateUserProfile(userId, profileType);

    // Grant center access if it doesn't exist
    const centerAccess = await this.accessControlService.grantCenterAccess(
      { userProfileId: userProfile.id, centerId },
      actor,
    );

    await this.logUserImportActivity(userId, profileType, centerId, actor.id);

    return {
      userProfileId: userProfile.id,
      centerAccessId: centerAccess.id,
    };
  }

  /**
   * Handle import when centerId is NOT provided (global access scenario)
   * @private
   */
  private handleImportWithoutCenterId(
    userId: string,
    profileType: ProfileType,
    existingProfile: UserProfile | null,
  ): never {
    // If no centerId provided and user has profile → throw error
    // (because no centerId means global access, and they already have a profile)
    if (existingProfile) {
      throw new ConflictException(
        this.i18n.translate('t.errors.userAlreadyHasProfileCannotImport'),
      );
    }

    // If no centerId and no profile, we can't proceed
    // (need centerId to grant access)
    throw new ConflictException(
      this.i18n.translate('t.errors.centerIdRequired'),
    );
  }

  /**
   * Find user by phone number
   * @private
   */
  private async findUserByPhone(phone: string): Promise<User> {
    const user = await this.userService.findUserByPhone(phone);
    if (!user) {
      throw new NotFoundException(this.i18n.translate('t.errors.userNotFound'));
    }
    return user;
  }

  /**
   * Verify OTP code for user import
   * @private
   */
  private async verifyOtpCode(code: string, userId: string): Promise<void> {
    await this.verificationService.verifyCode(
      code,
      VerificationType.OTP_VERIFICATION,
      userId,
    );
  }

  /**
   * Get existing user profile or create new one if it doesn't exist
   * @private
   */
  private async getOrCreateUserProfile(
    userId: string,
    profileType: ProfileType,
  ): Promise<UserProfile> {
    const existingProfile = await this.userProfileService.findUserProfileByType(
      userId,
      profileType,
    );

    if (existingProfile) {
      return existingProfile;
    }

    const profileRefId =
      await this.userProfileRepository.createProfileRefEntity(profileType);

    return await this.userProfileService.createUserProfile(
      userId,
      profileType,
      profileRefId,
    );
  }

  /**
   * Log user import activity
   * @private
   */
  private async logUserImportActivity(
    targetUserId: string,
    profileType: ProfileType,
    centerId: string | undefined,
    importedBy: string,
  ): Promise<void> {
    await this.activityLogService.log(
      UserActivityType.USER_IMPORTED,
      {
        profileType,
        centerId,
        importedBy,
      },
      targetUserId,
    );
  }
}
