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
import { ProfileRole } from '@/modules/access-control/entities/profile-role.entity';
import { Admin } from '../entities/admin.entity';
import { UserProfileRepository } from '../repositories/user-profile.repository';
import { CentersService } from '@/modules/centers/services/centers.service';
import { Role } from '@/modules/access-control/entities/role.entity';

@Injectable()
export class UserProfileService {
  constructor(
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly centerService: CentersService,
    private readonly logger: LoggerService,
  ) {}

  async listProfiles(actorUser: ActorUser): Promise<UserProfile[]> {
    return this.userProfileRepository.findMany({
      where: { userId: actorUser.id },
    });
  }

  async getCurrentUserProfile(actor: ActorUser): Promise<ProfileResponse> {
    // Get user with profile
    const user = await this.userService.findOne(actor.id);
    if (!user) {
      throw new ResourceNotFoundException('User not found');
    }
    console.log(actor);

    this.logger.log(`Found user: ${user.id} - ${user.name}`);

    // Determine context based on centerId
    const returnData: ProfileResponse = {
      ...user,
      context: { role: null as unknown as Role },
      profileType: actor.profileType,
      profile: null as unknown as Admin,
    };

    if (actor.centerId) {
      const profileRole = await this.accessControlHelperService.getProfileRole(
        actor.userProfileId,
        actor.centerId,
      );
      returnData.context.role = profileRole?.role as Role;
      returnData.context.center = await this.centerService.findCenterById(
        actor.centerId,
      );
    }
    if (!returnData.context.role) {
      const profileRole = await this.accessControlHelperService.getProfileRole(
        actor.userProfileId,
      );
      returnData.context.role = profileRole?.role as Role;
    }

    const profile = await this.userProfileRepository.getTargetProfile(
      actor.userProfileId,
      actor.profileType,
    );
    if (!profile) {
      throw new ResourceNotFoundException('Profile not found');
    }

    returnData.profile = profile;
    returnData.profileType = actor.profileType;

    this.logger.log(`Returning profile for user: ${actor.id}`);

    return returnData;
  }

  async updateUserProfile(actor: ActorUser, updateData: UpdateUserDto) {
    return this.userService.updateUser(actor.id, updateData, actor);
  }

  async findOne(userProfileId: string) {
    return this.userProfileRepository.findOne(userProfileId);
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

    const userProfile = await this.userProfileRepository.create({
      userId,
      profileType,
      profileRefId,
    });

    this.logger.log(
      `User profile created for user: ${userId}`,
      'UserProfileService',
      {
        userId,
        userProfileId: userProfile.id,
        profileType,
        profileRefId,
      },
    );

    return userProfile;
  }

  async findUserProfilesByUserId(userId: string): Promise<UserProfile[]> {
    return this.userProfileRepository.findMany({
      where: { userId },
    });
  }

  async findUserProfileByType(
    userId: string,
    profileType: ProfileType,
  ): Promise<UserProfile | null> {
    return this.userProfileRepository.userProfileRepository.findOne({
      where: { userId, profileType },
    });
  }

  async deleteUserProfile(userProfileId: string): Promise<void> {
    await this.userProfileRepository.softRemove(userProfileId);
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
