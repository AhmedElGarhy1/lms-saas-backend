import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Profile, ProfileType } from '../entities/profile.entity';
import { User } from '../entities/user.entity';
import { UserRepository } from '../repositories/user.repository';
import { LoggerService } from 'src/shared/services/logger.service';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    private readonly userRepository: UserRepository,
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

  // User profile management methods
  async updateUserProfile(
    userId: string,
    dto: { phone?: string; address?: string },
  ) {
    const user = await this.userRepository.findUserForProfile(userId);
    if (!user) {
      this.logger.warn(`User not found: ${userId}`, 'ProfileService');
      throw new NotFoundException('User not found');
    }

    if (!user.profile) {
      throw new NotFoundException('User profile not found');
    }

    // Update base user profile fields only
    const profileUpdateData: Partial<Profile> = {};
    if ('phone' in dto && dto.phone !== undefined)
      profileUpdateData.phone = dto.phone;
    if ('address' in dto && dto.address !== undefined)
      profileUpdateData.address = dto.address;

    // Update profile
    await this.updateProfile(user.profile.id, profileUpdateData);

    // Return updated user
    const updated = await this.userRepository.findUserWithProfile(userId);

    this.logger.log(`Profile updated for user: ${userId}`, 'ProfileService', {
      userId,
      updates: profileUpdateData,
    });

    return updated;
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

  async getUserProfileWithRelations(
    userId: string,
    relations: string[] = [],
  ): Promise<User | null> {
    return this.userRepository.findUserWithProfile(userId);
  }
}
