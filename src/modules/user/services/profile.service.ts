import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Profile, ProfileType } from '../entities/profile.entity';
import { LoggerService } from 'src/shared/services/logger.service';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    private readonly logger: LoggerService,
  ) {}

  // Base user profile CRUD methods
  async updateProfile(
    profileId: string,
    profileData: Partial<Profile>,
  ): Promise<void> {
    await this.profileRepository.update(profileId, profileData);
  }

  async findProfileByUserId(userId: string): Promise<Profile | null> {
    return this.profileRepository.findOne({
      where: { userId, type: ProfileType.BASE_USER },
    });
  }

  async createProfile(
    userId: string,
    profileData: Partial<Profile>,
  ): Promise<Profile> {
    const profile = this.profileRepository.create({
      ...profileData,
      userId,
      type: ProfileType.BASE_USER,
    });
    return this.profileRepository.save(profile);
  }

  async deleteProfile(profileId: string): Promise<void> {
    await this.profileRepository.softDelete(profileId);
  }

  async createUserProfile(
    userId: string,
    profileData: Partial<Profile>,
  ): Promise<Profile> {
    const profile = await this.createProfile(userId, profileData);

    this.logger.log(`Profile created for user: ${userId}`, 'ProfileService', {
      userId,
      profileId: profile.id,
    });

    return profile;
  }

  async deleteUserProfile(userId: string): Promise<void> {
    const profile = await this.findProfileByUserId(userId);
    if (profile) {
      await this.deleteProfile(profile.id);

      this.logger.log(`Profile deleted for user: ${userId}`, 'ProfileService', {
        userId,
        profileId: profile.id,
      });
    }
  }
}
