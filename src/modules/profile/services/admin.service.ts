import { Injectable } from '@nestjs/common';
import { StaffRepository } from '../repositories/staff.repository';
import { UserProfileService } from './user-profile.service';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { LoggerService } from '@/shared/services/logger.service';
import { Staff } from '../entities/staff.entity';
import { ValidationFailedException } from '@/shared/common/exceptions/custom.exceptions';
import { Admin } from '../entities/admin.entity';
import { AdminRepository } from '../repositories/admin.repository';

@Injectable()
export class AdminService {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly userProfileService: UserProfileService,
    private readonly logger: LoggerService,
  ) {}

  async createAdminForUser(userId: string, adminData: Partial<Admin> = {}) {
    console.log(userId, adminData);
    // Check if user already has staff profile
    const existingAdminProfile =
      await this.userProfileService.findUserProfileByType(
        userId,
        ProfileType.ADMIN,
      );
    if (existingAdminProfile) {
      throw new ValidationFailedException('User already has a admin profile');
    }

    const admin = await this.adminRepository.create(adminData);
    console.log('-----------------ADMIN', admin);
    console.log('-----------------ADMIN', admin);

    // Create user profile linking to staff
    const userProfile = await this.userProfileService.createUserProfile(
      userId,
      ProfileType.ADMIN,
      admin.id,
    );

    this.logger.log(`Staff created for user: ${userId}`, 'StaffService', {
      userId,
      adminId: admin.id,
    });

    return userProfile;
  }

  async findStaffByUserId(userId: string): Promise<Staff | null> {
    const userProfile = await this.userProfileService.findUserProfileByType(
      userId,
      ProfileType.STAFF,
    );
    if (!userProfile) {
      return null;
    }
    return this.adminRepository.findOne(userProfile.profileRefId);
  }
}
