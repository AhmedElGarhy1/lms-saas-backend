import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserProfile } from '../../profile/entities/user-profile.entity';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { LoggerService } from '@/shared/services/logger.service';
import {
  ResourceNotFoundException,
  ValidationFailedException,
} from '@/shared/common/exceptions/custom.exceptions';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ProfileResponse } from '../interfaces/profile.interface';
import { UpdateUserDto } from '@/modules/user/dto/update-user.dto';
import { UserService } from '@/modules/user/services/user.service';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { UserRole } from '@/modules/access-control/entities/user-role.entity';
import { Admin } from '../entities/admin.entity';

@Injectable()
export class UserProfileService {
  constructor(
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly logger: LoggerService,
  ) {}

  async listProfiles(actorUser: ActorUser): Promise<UserProfile[]> {
    return this.userProfileRepository.findBy({
      userId: actorUser.id,
    });
  }

  async getCurrentUserProfile(actor: ActorUser): Promise<ProfileResponse> {
    // Get user with profile
    const user = await this.userService.findOne(actor.id);
    if (!user) {
      throw new ResourceNotFoundException('User not found');
    }

    this.logger.log(`Found user: ${user.id} - ${user.name}`);

    // Determine context based on centerId
    const returnData: ProfileResponse = {
      ...user,
      context: { role: null as unknown as UserRole },
      profileType: actor.profileType,
      profile: null as unknown as Admin,
    };

    if (!returnData.context.role) {
      const userGlobalRole = await this.accessControlHelperService.getUserRole(
        actor.id,
      );
      returnData.context.role = userGlobalRole as UserRole;
    }

    const profile = await this.findOne(actor.profileId);
    if (!profile) {
      throw new ResourceNotFoundException('Profile not found');
    }

    returnData.profile = profile;
    returnData.profileType = profile.profileType;

    this.logger.log(`Returning profile for user: ${actor.id}`);

    return returnData;
  }

  async updateUserProfile(actor: ActorUser, updateData: UpdateUserDto) {
    return this.userService.updateUser(actor.id, updateData, actor);
  }

  async findOne(profileId: string) {
    return this.userProfileRepository.findOneBy({ id: profileId });
  }

  async createUserProfile(
    userId: string,
    profileType: ProfileType,
    profileRefId: string,
  ): Promise<UserProfile> {
    // Check if user already has this profile type
    const existingProfile = await this.findUserProfileByType(
      userId,
      profileType,
    );
    if (existingProfile) {
      throw new ValidationFailedException(
        `User already has a ${profileType} profile`,
      );
    }

    const userProfile = this.userProfileRepository.create({
      userId,
      profileType,
      profileRefId,
    });

    const savedProfile = await this.userProfileRepository.save(userProfile);

    this.logger.log(
      `User profile created for user: ${userId}`,
      'UserProfileService',
      {
        userId,
        profileId: savedProfile.id,
        profileType,
        profileRefId,
      },
    );

    return savedProfile;
  }

  async findUserProfilesByUserId(userId: string): Promise<UserProfile[]> {
    return this.userProfileRepository.find({
      where: { userId },
    });
  }

  async findUserProfileByType(
    userId: string,
    profileType: ProfileType,
  ): Promise<UserProfile | null> {
    return this.userProfileRepository.findOne({
      where: { userId, profileType },
    });
  }

  async deleteUserProfile(userProfileId: string): Promise<void> {
    await this.userProfileRepository.softDelete(userProfileId);
  }

  async deleteUserProfilesByUserId(userId: string): Promise<void> {
    const userProfiles = await this.findUserProfilesByUserId(userId);
    for (const profile of userProfiles) {
      await this.deleteUserProfile(profile.id);
    }

    this.logger.log(
      `All user profiles deleted for user: ${userId}`,
      'UserProfileService',
      {
        userId,
        deletedCount: userProfiles.length,
      },
    );
  }
}
