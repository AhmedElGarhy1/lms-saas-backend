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
import { RequestImportOtpDto } from '../dto/request-import-otp.dto';

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
   * Get import eligibility information (reusable for validation and import)
   * @param userId User ID to check
   * @param profileType Profile type to check
   * @param centerId Optional center ID
   * @returns Object with existingProfile and hasCenterAccess (if applicable)
   * @private
   */
  private async getImportEligibilityInfo(
    userId: string,
    profileType: ProfileType,
    centerId?: string,
  ): Promise<{
    existingProfile: UserProfile | null;
    hasCenterAccess: boolean;
  }> {
    // Check if user already has profile of requested type
    const existingProfile = await this.userProfileService.findUserProfileByType(
      userId,
      profileType,
    );

    // Check center access only if both profile and centerId exist
    let hasCenterAccess = false;
    if (existingProfile && centerId) {
      hasCenterAccess = await this.accessControlHelperService.canCenterAccess({
        userProfileId: existingProfile.id,
        centerId,
      });
    }

    return { existingProfile, hasCenterAccess };
  }

  /**
   * Validate import eligibility before sending OTP or verifying
   * Principle: Allow if there's work to do, reject if user already has everything
   * centerId is NEVER required - if not provided, we just create profile without center access
   *
   * @param userId User ID to validate
   * @param profileType Profile type to assign
   * @param centerId Optional center ID for validation (never required)
   * @throws ConflictException if user already has profile/access (nothing to do)
   */
  async validateImportEligibility(
    userId: string,
    profileType: ProfileType,
    centerId?: string,
  ): Promise<void> {
    const { existingProfile, hasCenterAccess } =
      await this.getImportEligibilityInfo(userId, profileType, centerId);

    if (centerId) {
      // Case 1: centerId is provided
      // If user has BOTH profile AND center access → throw error (nothing to do)
      if (existingProfile && hasCenterAccess) {
        throw new ConflictException(
          this.i18n.translate('t.errors.userAlreadyHasAccess'),
        );
      }
      // Otherwise OK: will create profile and/or add center access
    } else {
      // Case 2: centerId is NOT provided
      if (existingProfile) {
        // User already has profile → nothing to do (can't add center access without centerId)
        throw new ConflictException(
          this.i18n.translate('t.errors.userAlreadyHasProfileCannotImport'),
        );
      }
      // Otherwise OK: will create profile only (no center access)
    }
  }

  /**
   * Send OTP to phone number for user import verification
   * @param phone Phone number to send OTP to
   * @param profileType Profile type to assign to the imported user
   * @param centerId Optional center ID for validation (never required)
   * @throws NotFoundException if user doesn't exist
   * @throws ConflictException if import eligibility validation fails
   */
  async sendImportOtp(dto: RequestImportOtpDto): Promise<void> {
    const { phone, profileType, centerId } = dto;
    const user = await this.findUserByPhone(phone);

    // Validate import eligibility before sending OTP (same logic as verify step)
    await this.validateImportEligibility(user.id, profileType, centerId);

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
   * @returns Object with userProfileId and centerAccessId (if centerId provided)
   * @note Validation uses same logic as requestOtp - validates with dto.centerId (not resolved)
   */
  async verifyAndImportUser(dto: VerifyUserImportDto, actor: ActorUser) {
    const user = await this.findUserByPhone(dto.phone);
    await this.verifyOtpCode(dto.code, user.id);

    // Validate with dto.centerId first (what was sent in request-otp)
    // This ensures validation matches what was validated in requestOtp step
    await this.validateImportEligibility(
      user.id,
      dto.profileType,
      dto.centerId,
    );

    // Resolve centerId for actual import: use dto.centerId if provided, otherwise use actor.centerId
    // centerId is optional - if not provided, we'll just create profile without center access
    const resolvedCenterId = dto.centerId ?? actor.centerId;

    // Get eligibility info using resolved centerId (for import logic)
    const { existingProfile } = await this.getImportEligibilityInfo(
      user.id,
      dto.profileType,
      resolvedCenterId,
    );

    if (resolvedCenterId) {
      // Case 1: centerId is provided → create profile and grant center access
      return await this.handleImportWithCenterId(
        user.id,
        dto.profileType,
        resolvedCenterId,
        existingProfile,
        actor,
      );
    } else {
      // Case 2: No centerId provided → just create profile (no center access)
      const userProfile = await this.getOrCreateUserProfile(
        user.id,
        dto.profileType,
      );

      await this.logUserImportActivity(
        user.id,
        dto.profileType,
        undefined,
        actor.id,
      );

      return {
        userProfileId: userProfile.id,
        centerAccessId: null,
      };
    }
  }

  /**
   * Handle import when centerId is provided
   * @private
   * @note Validation already checked that user doesn't have both profile AND center access
   */
  private async handleImportWithCenterId(
    userId: string,
    profileType: ProfileType,
    centerId: string,
    existingProfile: UserProfile | null,
    actor: ActorUser,
  ) {
    // Get or create user profile
    const userProfile = await this.getOrCreateUserProfile(userId, profileType);

    // Grant center access (repository handles duplicate check gracefully)
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
    centerId: string | undefined | null,
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
