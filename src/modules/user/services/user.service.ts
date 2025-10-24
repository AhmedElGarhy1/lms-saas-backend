import { Injectable } from '@nestjs/common';
import {
  ResourceNotFoundException,
  InsufficientPermissionsException,
  ValidationFailedException,
  UserAlreadyExistsException,
} from '@/shared/common/exceptions/custom.exceptions';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../repositories/user.repository';
import { AccessControlService } from '@/modules/access-control/services/access-control.service';
import { RolesService } from '@/modules/access-control/services/roles.service';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { UserInfoService } from './user-info.service';
import { StaffService } from '@/modules/profile/services/staff.service';
import { UserProfileService } from '@/modules/profile/services/user-profile.service';
import { LoggerService } from '@/shared/services/logger.service';
import { CreateUserDto, CreateUserWithRoleDto } from '../dto/create-user.dto';
import { CreateStaffDto } from '../dto/create-staff.dto';
import { CreateTeacherDto } from '../dto/create-teacher.dto';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { CreateStudentDto } from '../dto/create-student.dto';
import {
  ChangePasswordParams,
  UserServiceResponse,
} from '../interfaces/user-service.interface';
import { User } from '../entities/user.entity';
import { CentersService } from '@/modules/centers/services/centers.service';
import { ProfileRole } from '@/modules/access-control/entities/profile-role.entity';
import { PaginateUsersDto } from '../dto/paginate-users.dto';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { PaginateAdminsDto } from '../dto/paginate-admins.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { ActivityLogService } from '@/shared/modules/activity-log/services/activity-log.service';
import { ActivityType } from '@/shared/modules/activity-log/entities/activity-log.entity';
import { Transactional } from 'typeorm-transactional';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { Locale } from '@/shared/common/enums/locale.enum';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly accessControlService: AccessControlService,
    private readonly rolesService: RolesService,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly userInfoService: UserInfoService,
    private readonly userProfileService: UserProfileService,
    private readonly staffService: StaffService,
    private readonly logger: LoggerService,
    private readonly centersService: CentersService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async changePassword(
    params: ChangePasswordParams,
  ): Promise<UserServiceResponse> {
    const { userId, dto } = params;
    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new ResourceNotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new ValidationFailedException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);

    // Update password
    await this.userRepository.update(userId, { password: hashedPassword });

    // Log password change activity
    await this.activityLogService.log(ActivityType.PASSWORD_CHANGED, {
      targetUserId: userId,
      email: user.email,
      isSelfChange: true, // This is a self-service password change
    });

    this.logger.log(`Password changed for user: ${userId}`);
    return { message: 'Password changed successfully', success: true };
  }

  async createUser(dto: CreateUserDto, actor: ActorUser): Promise<User> {
    // Validate that at least one of email or phone is provided
    dto.validateEmailOrPhone();

    // Check for existing user by email if email is provided
    if (dto.email) {
      const existingUser = await this.userRepository.findByEmail(dto.email);
      if (existingUser) {
        throw new UserAlreadyExistsException(dto.email);
      }
    }

    // Check for existing user by phone if phone is provided
    if (dto.phone) {
      const existingUser = await this.userRepository.findByPhone(dto.phone);
      if (existingUser) {
        throw new UserAlreadyExistsException(dto.phone);
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user
    const savedUser = await this.userRepository.create({
      email: dto.email?.toLowerCase(),
      password: hashedPassword, //TODO: do it in entity level
      name: dto.name,
      isActive: dto.isActive ?? true,
      phone: dto.phone,
    });

    // Create user info with provided details or default
    await this.userInfoService.createUserInfo(savedUser.id, {
      fullName: dto.fullName || savedUser.name,
      address: dto.address,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      locale: dto.locale || Locale.AR,
    });

    // Create staff for user
    await this.staffService.createStaffForUser(savedUser.id);

    await this.userRepository.update(savedUser.id, savedUser);

    return savedUser;
  }

  @Transactional()
  // TODO: implement this method
  async createUserWithRole(dto: CreateUserWithRoleDto, actor: ActorUser) {
    const centerId = (dto.centerId ?? actor.centerId)!;
    dto.centerId = centerId;
    const user = await this.createUser(dto, actor);

    // Create user profile for the new user
    const userProfile = await this.userProfileService.createUserProfile(
      user.id,
      ProfileType.STAFF, // Default to Staff for center users
      user.id, // Use user.id as profileRefId for now
    );

    // Grant center access to the new user
    if (centerId) {
      await this.accessControlService.grantCenterAccess(
        {
          userProfileId: userProfile.id,
          centerId,
        },
        actor,
      );
    }

    // Grant user access (granter can manage the new user)
    const bypassUserAccess =
      await this.accessControlHelperService.bypassCenterInternalAccess(
        actor.userProfileId,
        centerId,
      );
    if (!bypassUserAccess) {
      await this.accessControlService.grantUserAccess({
        granterUserProfileId: actor.userProfileId,
        targetUserProfileId: userProfile.id,
        centerId,
      });
    }

    // Assign role to the new user
    await this.rolesService.assignRole({
      userProfileId: userProfile.id,
      roleId: dto.roleId,
      centerId,
    });

    return user;
  }

  @Transactional()
  async createStaff(dto: CreateStaffDto, actor: ActorUser) {
    const centerId = (dto.centerId ?? actor.centerId)!;
    dto.centerId = centerId;
    const user = await this.createUser(dto, actor);

    // Create staff profile
    const staffProfile = await this.staffService.createStaff(user.id);
    const userProfile = await this.userProfileService.createUserProfile(
      user.id,
      ProfileType.STAFF,
      staffProfile.id,
    );

    // Apply access controls
    await this.applyUserAccessControls(
      userProfile,
      actor,
      centerId,
      dto.roleId,
    );

    return user;
  }

  @Transactional()
  async createTeacher(dto: CreateTeacherDto, actor: ActorUser) {
    const centerId = (dto.centerId ?? actor.centerId)!;
    dto.centerId = centerId;
    const user = await this.createUser(dto, actor);

    // Create teacher profile
    const teacherProfile = await this.staffService.createTeacher(user.id);
    const userProfile = await this.userProfileService.createUserProfile(
      user.id,
      ProfileType.TEACHER,
      teacherProfile.id,
    );

    // Apply access controls
    await this.applyUserAccessControls(
      userProfile,
      actor,
      centerId,
      dto.roleId,
    );

    return user;
  }

  @Transactional()
  async createAdmin(dto: CreateAdminDto, actor: ActorUser) {
    const centerId = (dto.centerId ?? actor.centerId)!;
    dto.centerId = centerId;
    const user = await this.createUser(dto, actor);

    // Create admin profile
    const adminProfile = await this.staffService.createAdmin(user.id);
    const userProfile = await this.userProfileService.createUserProfile(
      user.id,
      ProfileType.ADMIN,
      adminProfile.id,
    );

    // Apply access controls
    await this.applyUserAccessControls(
      userProfile,
      actor,
      centerId,
      dto.roleId,
    );

    return user;
  }

  @Transactional()
  async createStudent(dto: CreateStudentDto, actor: ActorUser) {
    const centerId = (dto.centerId ?? actor.centerId)!;
    dto.centerId = centerId;
    const user = await this.createUser(dto, actor);

    // Create student profile
    const studentProfile = await this.staffService.createStudent(user.id);
    const userProfile = await this.userProfileService.createUserProfile(
      user.id,
      ProfileType.STUDENT,
      studentProfile.id,
    );

    // Apply access controls
    await this.applyUserAccessControls(
      userProfile,
      actor,
      centerId,
      dto.roleId,
    );

    return user;
  }

  private async applyUserAccessControls(
    userProfile: any,
    actor: ActorUser,
    centerId: string,
    roleId: string,
  ) {
    // Grant center access to the new user
    if (centerId) {
      await this.accessControlService.grantCenterAccess(
        {
          userProfileId: userProfile.id,
          centerId,
        },
        actor,
      );
    }

    // Grant user access (granter can manage the new user)
    const bypassUserAccess =
      await this.accessControlHelperService.bypassCenterInternalAccess(
        actor.userProfileId,
        centerId,
      );
    if (!bypassUserAccess) {
      await this.accessControlService.grantUserAccess({
        granterUserProfileId: actor.userProfileId,
        targetUserProfileId: userProfile.id,
        centerId,
      });
    }

    // Assign role to the new user
    await this.rolesService.assignRole({
      userProfileId: userProfile.id,
      roleId,
      centerId,
    });
  }

  async paginateUsers(params: PaginateUsersDto, actor: ActorUser) {
    const centerId = params.centerId ?? actor.centerId;
    params.centerId = centerId;

    await this.accessControlHelperService.validateAdminAndCenterAccess({
      userProfileId: actor.userProfileId,
      centerId,
    });

    const result = await this.userRepository.paginateStaff(params, actor);

    return result;
  }

  async paginateStaff(params: PaginateUsersDto, actor: ActorUser) {
    const centerId = params.centerId ?? actor.centerId;
    params.centerId = centerId;

    await this.accessControlHelperService.validateAdminAndCenterAccess({
      userProfileId: actor.userProfileId,
      centerId,
    });

    const result = await this.userRepository.paginateStaff(params, actor);

    return result;
  }

  async paginateAdmins(params: PaginateAdminsDto, actor: ActorUser) {
    return this.userRepository.paginateAdmins(params, actor);
  }

  async deleteUser(userId: string, actor: ActorUser): Promise<void> {
    // First check if the user exists
    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new ResourceNotFoundException('User not found');
    }

    const isSuperAdmin = await this.accessControlHelperService.isSuperAdmin(
      actor.userProfileId,
    );
    if (!isSuperAdmin) {
      throw new InsufficientPermissionsException('Access denied to this user');
    }
    await this.userRepository.softRemove(userId);

    this.logger.log(`User deleted: ${userId} by ${actor.userProfileId}`);
  }

  async restoreUser(userId: string, actor: ActorUser): Promise<void> {
    // First check if the user exists
    const user = await this.userRepository.findOneSoftDeleted(userId);
    if (!user) {
      throw new ResourceNotFoundException('User not found');
    }

    const isSuperAdmin = await this.accessControlHelperService.isSuperAdmin(
      actor.userProfileId,
    );
    if (!isSuperAdmin) {
      throw new InsufficientPermissionsException('Access denied to this user');
    }

    // Restore user
    await this.userRepository.restore(userId);
  }

  async activateUser(
    userId: string,
    isActive: boolean,
    actor: ActorUser,
  ): Promise<void> {
    // First check if the user exists
    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new ResourceNotFoundException('User not found');
    }

    // Then check if current user can activate/deactivate the target user
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: actor.userProfileId, // Use actor's profileId for validation
    });

    // Update global activation status
    await this.userRepository.update(userId, { isActive });

    this.logger.log(
      `User activation status updated: ${userId} to ${isActive} by ${actor.userProfileId}`,
    );
  }

  // Auth-related methods

  async findUserByEmail(
    email: string,
    withSensitiveData: boolean = false,
  ): Promise<User | null> {
    if (withSensitiveData) {
      return this.userRepository.findByEmailWithSensitiveData(email);
    }
    return this.userRepository.findByEmail(email);
  }

  async findUserByPhone(
    phone: string,
    withSensitiveData: boolean = false,
  ): Promise<User | null> {
    if (withSensitiveData) {
      return this.userRepository.findByPhoneWithSensitiveData(phone);
    }
    return this.userRepository.findByPhone(phone);
  }

  async findOne(
    id: string,
    withSensitiveData: boolean = false,
  ): Promise<User | null> {
    if (withSensitiveData) {
      return this.userRepository.findOneWithSensitiveData(id);
    }
    return this.userRepository.findOne(id);
  }

  async findUserByProfileId(
    userProfileId: string,
    actor: ActorUser,
  ): Promise<User | null> {
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: userProfileId,
    });
    // Find user by profileId - need to get user from profile
    const userProfile = await this.userProfileService.findOne(userProfileId);
    if (!userProfile) {
      throw new ResourceNotFoundException('User profile not found');
    }
    return this.userRepository.findOne(userProfile.userId);
  }

  async updateFailedLoginAttempts(
    userProfileId: string,
    attempts: number,
  ): Promise<void> {
    // Find user by profileId
    const userProfile = await this.userProfileService.findOne(userProfileId);
    if (!userProfile) {
      throw new ResourceNotFoundException('User profile not found');
    }
    await this.userRepository.updateFailedLoginAttempts(
      userProfile.userId,
      attempts,
    );
  }

  async updateLockoutUntil(
    userProfileId: string,
    lockoutUntil: Date | null,
  ): Promise<void> {
    // Find user by profileId
    const userProfile = await this.userProfileService.findOne(userProfileId);
    if (!userProfile) {
      throw new ResourceNotFoundException('User profile not found');
    }
    await this.userRepository.updateFailedLoginAttempts(
      userProfile.userId,
      0,
      lockoutUntil || undefined,
    );
  }

  async updateUserTwoFactor(
    userProfileId: string,
    twoFactorSecret: string | null | undefined,
    twoFactorEnabled: boolean,
  ): Promise<void> {
    // Find user by profileId
    const userProfile = await this.userProfileService.findOne(userProfileId);
    if (!userProfile) {
      throw new ResourceNotFoundException('User profile not found');
    }
    await this.userRepository.updateUserTwoFactor(
      userProfile.userId,
      twoFactorSecret || null,
      twoFactorEnabled,
    );
  }

  async update(userId: string, updateData: Partial<User>): Promise<void> {
    await this.userRepository.update(userId, updateData);
  }

  @Transactional()
  async updateUser(
    userId: string,
    updateData: UpdateUserDto,
    actor: ActorUser,
  ): Promise<User> {
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: actor.userProfileId,
    });

    // Update user using repository
    // TODO: transaction
    const userInfoData: any = {};

    // Extract user info fields
    if (updateData.fullName) userInfoData.fullName = updateData.fullName;
    if (updateData.address) userInfoData.address = updateData.address;
    if (updateData.dateOfBirth)
      userInfoData.dateOfBirth = new Date(updateData.dateOfBirth);
    if (updateData.locale) userInfoData.locale = updateData.locale;

    // Update user info if there are user info fields
    if (Object.keys(userInfoData).length > 0) {
      await this.userInfoService.updateUserInfo(userId, userInfoData);
    }

    // Remove the fields we've processed from updateData
    delete (updateData as any).fullName;
    delete (updateData as any).address;
    delete (updateData as any).dateOfBirth;
    delete (updateData as any).locale;
    const user = await this.userRepository.update(userId, updateData as any);
    return user!;
  }
}
