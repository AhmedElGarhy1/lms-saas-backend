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
import { NotificationChannel } from '@/modules/notifications/enums/notification-channel.enum';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { VerifyUserImportDto } from '../dto/verify-user-import.dto';
import { CenterAccessDto } from '@/modules/access-control/dto/center-access.dto';
import { Config } from '@/shared/config/config';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { AuthEvents } from '@/shared/events/auth.events.enum';
import { OtpEvent } from '@/modules/auth/events/auth.events';
import { UserActivityType } from '@/modules/user/enums/user-activity-type.enum';

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
        channel: NotificationChannel.SMS,
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
    await this.verifyOtpCode(dto.code, dto.phone, user.id);

    const centerId = dto.centerId ?? actor.centerId;
    const userProfile = await this.getOrCreateUserProfile(
      user.id,
      dto.profileType,
    );

    if (centerId) {
      await this.ensureCenterAccessNotExists(userProfile.id, centerId);
    }

    if (centerId) {
      await this.accessControlService.grantCenterAccess(
        { userProfileId: userProfile.id, centerId },
        actor,
      );
    }

    await this.logUserImportActivity(
      user.id,
      dto.profileType,
      centerId,
      actor.id,
    );
  }

  /**
   * Find user by phone number
   * @private
   */
  private async findUserByPhone(phone: string): Promise<User> {
    const user = await this.userService.findUserByPhone(phone);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  /**
   * Verify OTP code for user import
   * @private
   */
  private async verifyOtpCode(
    code: string,
    phone: string,
    userId: string,
  ): Promise<void> {
    await this.verificationService.verifyCode(
      code,
      VerificationType.OTP_VERIFICATION,
      NotificationChannel.SMS,
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
   * Ensure user doesn't already have access to the center
   * @private
   */
  private async ensureCenterAccessNotExists(
    userProfileId: string,
    centerId: string,
  ): Promise<void> {
    const centerAccess = await this.accessControlHelperService.findCenterAccess(
      {
        userProfileId,
        centerId,
      },
    );

    if (centerAccess && !centerAccess.deletedAt) {
      throw new ConflictException('User already has access to this center');
    }
  }

  /**
   * Grant center access to user profile
   * @private
   */
  private async grantCenterAccessToProfile(
    userProfileId: string,
    centerId: string | undefined,
    actor: ActorUser,
  ) {
    // Use provided centerId or actor's centerId
    // Let grantCenterAccess handle validation if centerId is missing
    const finalCenterId = centerId ?? actor.centerId;

    const centerAccessDto: CenterAccessDto = {
      userProfileId,
      centerId: finalCenterId as string,
    };
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
