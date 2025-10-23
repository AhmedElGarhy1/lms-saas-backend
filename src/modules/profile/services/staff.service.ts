import { Injectable } from '@nestjs/common';
import { StaffRepository } from '../repositories/staff.repository';
import { UserProfileService } from './user-profile.service';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { LoggerService } from '@/shared/services/logger.service';
import { Staff } from '../entities/staff.entity';
import { ValidationFailedException } from '@/shared/common/exceptions/custom.exceptions';

@Injectable()
export class StaffService {
  constructor(
    private readonly staffRepository: StaffRepository,
    private readonly userProfileService: UserProfileService,
    private readonly logger: LoggerService,
  ) {}

  async createStaffRecord(staffData: Partial<Staff> = {}): Promise<Staff> {
    const savedStaff = await this.staffRepository.createAndSave(staffData);

    this.logger.log(
      `Staff record created with ID: ${savedStaff.id}`,
      'StaffService',
      {
        staffId: savedStaff.id,
      },
    );

    return savedStaff;
  }

  async createStaffForUser(
    userId: string,
    staffData: Partial<Staff> = {},
  ): Promise<Staff> {
    // Check if user already has staff profile
    const existingStaffProfile =
      await this.userProfileService.findUserProfileByType(
        userId,
        ProfileType.STAFF,
      );
    if (existingStaffProfile) {
      throw new ValidationFailedException('User already has a staff profile');
    }

    // Create staff record
    const staff = await this.createStaffRecord(staffData);

    // Create user profile linking to staff
    await this.userProfileService.createUserProfile(
      userId,
      ProfileType.STAFF,
      staff.id,
    );

    this.logger.log(`Staff created for user: ${userId}`, 'StaffService', {
      userId,
      staffId: staff.id,
    });

    return staff;
  }

  async findStaffByUserId(userId: string): Promise<Staff | null> {
    const userProfile = await this.userProfileService.findUserProfileByType(
      userId,
      ProfileType.STAFF,
    );
    if (!userProfile) {
      return null;
    }
    return this.staffRepository.findById(userProfile.profileRefId);
  }

  async updateStaff(staffId: string, staffData: Partial<Staff>): Promise<void> {
    await this.staffRepository.updateById(staffId, staffData);

    this.logger.log(`Staff updated: ${staffId}`, 'StaffService', {
      staffId,
    });
  }

  async deleteStaff(staffId: string): Promise<void> {
    await this.staffRepository.softDeleteById(staffId);

    this.logger.log(`Staff deleted: ${staffId}`, 'StaffService', {
      staffId,
    });
  }
}
