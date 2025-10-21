import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserProfile } from '../entities/user-profile.entity';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { LoggerService } from '@/shared/services/logger.service';
import { ValidationFailedException } from '@/shared/common/exceptions/custom.exceptions';

@Injectable()
export class UserProfileService {
  constructor(
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
    private readonly logger: LoggerService,
  ) {}

  // User profile CRUD methods
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
