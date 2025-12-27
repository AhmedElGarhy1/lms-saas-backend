import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { UserProfile } from '../entities/user-profile.entity';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { BaseService } from '@/shared/common/services/base.service';
import {
  ResourceNotFoundException,
  ValidationFailedException,
  BusinessLogicException,
} from '@/shared/common/exceptions/custom.exceptions';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ProfileResponseDto } from '../dto/profile-response.dto';
import { UpdateUserDto } from '@/modules/user/dto/update-user.dto';
import { UpdateUserProfileDto } from '../dto/update-user-profile.dto';
import { CreateUserProfileDto } from '../dto/create-user-profile.dto';
import { UserService } from '@/modules/user/services/user.service';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { RolesService } from '@/modules/access-control/services/roles.service';
import { UserProfilePermissionService } from '@/modules/access-control/services/user-profile-permission.service';
import { UserProfileRepository } from '../repositories/user-profile.repository';
import { CentersService } from '@/modules/centers/services/centers.service';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { StaffEvents } from '@/shared/events/staff.events.enum';
import { StudentEvents } from '@/shared/events/student.events.enum';
import { TeacherEvents } from '@/shared/events/teacher.events.enum';
import { AdminEvents } from '@/shared/events/admin.events.enum';
import { CreateStaffEvent } from '@/modules/staff/events/staff.events';
import { CreateStudentEvent } from '@/modules/students/events/student.events';
import { CreateTeacherEvent } from '@/modules/teachers/events/teacher.events';
import { CreateAdminEvent } from '@/modules/admin/events/admin.events';
import { Staff } from '@/modules/staff/entities/staff.entity';
import { Student } from '@/modules/students/entities/student.entity';
import { Teacher } from '@/modules/teachers/entities/teacher.entity';
import { Admin } from '@/modules/admin/entities/admin.entity';
import { UserProfileCodeService } from './user-profile-code.service';

@Injectable()
export class UserProfileService extends BaseService {
  private readonly logger: Logger = new Logger(UserProfileService.name);

  constructor(
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    @Inject(forwardRef(() => AccessControlHelperService))
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly rolesService: RolesService,
    private readonly centerService: CentersService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
    private readonly userProfilePermissionService: UserProfilePermissionService,
    private readonly userProfileCodeService: UserProfileCodeService,
  ) {
    super();
  }

  async listProfiles(actorUser: ActorUser): Promise<UserProfile[]> {
    return this.userProfileRepository.findMany({
      where: { userId: actorUser.id },
    });
  }

  async getCurrentUserProfile(actor: ActorUser): Promise<ProfileResponseDto> {
    // Get user with profile
    const user = await this.userService.findOne(actor.id);
    if (!user) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.user',
        identifier: 't.resources.identifier',
        value: actor.id,
      });
    }

    // Determine context based on centerId
    const returnData: ProfileResponseDto = {
      ...user,
      profileType: actor.profileType,
      profile: null,
    };

    if (!actor.userProfileId) return returnData;
    const userProfile = await this.findOne(actor.userProfileId);
    if (!userProfile) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.profile',
        identifier: 't.resources.identifier',
        value: actor.userProfileId,
      });
    }
    actor.userProfileId = userProfile.id;
    actor.profileType = userProfile.profileType;

    if (actor.centerId) {
      const profileRole = await this.accessControlHelperService.getProfileRole(
        actor.userProfileId,
        actor.centerId,
      );
      returnData.role = profileRole?.role?.name ?? null;
      returnData.center = await this.centerService.findCenterById(
        actor.centerId,
      );
    }
    if (!returnData.role) {
      const profileRole = await this.accessControlHelperService.getProfileRole(
        actor.userProfileId,
      );
      returnData.role = profileRole?.role?.name ?? null;
    }

    const profile = await this.userProfileRepository.getTargetProfile(
      actor.userProfileId,
      actor.profileType,
    );
    if (!profile) {
      throw new ResourceNotFoundException('t.messages.notFound', {
        resource: 't.resources.profile',
      });
    }

    returnData.profile = profile;
    returnData.profileType = actor.profileType;

    return returnData;
  }

  async activateProfileUser(
    userProfileId: string,
    isActive: boolean,
    actor: ActorUser,
  ) {
    // Get userProfile to determine profileType
    const userProfile = await this.findOne(userProfileId);
    if (!userProfile) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.profile',
        identifier: 't.resources.identifier',
        value: userProfileId,
      });
    }

    // Check permission based on profileType
    await this.userProfilePermissionService.canActivate(actor, userProfileId);

    await this.userProfileRepository.update(userProfileId, { isActive });

    return userProfile;
  }

  /**
   * Updates a user profile's basic information
   * @param userProfileId The profile ID to update
   * @param dto Update data
   * @param actor The user performing the action
   * @returns The updated User entity
   */
  async updateProfile(
    userProfileId: string,
    dto: UpdateUserProfileDto,
    actor: ActorUser,
  ) {
    // Get the user profile to find the profileType
    const userProfile = await this.findOne(userProfileId);
    if (!userProfile) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.profile',
        identifier: 't.resources.identifier',
        value: userProfileId,
      });
    }

    // Check permission based on profileType
    await this.userProfilePermissionService.canUpdate(actor, userProfileId);

    // 4. Convert profile update data to user update format
    const userUpdateData: UpdateUserDto = {
      name: dto.name,
      phone: dto.phone,
      isActive: dto.isActive,
      userInfo: {
        address: dto.userInfo?.address,
        dateOfBirth: dto.userInfo?.dateOfBirth
          ? new Date(dto.userInfo.dateOfBirth)
          : undefined,
        locale: dto.userInfo?.locale,
      },
    };

    // 5. Update User entity (this will emit UserUpdatedEvent)
    return await this.userService.updateUser(
      userProfile.userId,
      userUpdateData,
      actor,
    );
  }

  async findForUser(userId: string, userProfileId: string) {
    return this.userProfileRepository.findForUser(userId, userProfileId);
  }

  async findOne(
    userProfileId: string,
    actor?: ActorUser,
    includeDeleted = false,
  ) {
    const profile = includeDeleted
      ? await this.userProfileRepository.findOneSoftDeletedById(userProfileId)
      : await this.userProfileRepository.findOne(userProfileId);

    if (!profile) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.profile',
        identifier: 't.resources.identifier',
        value: userProfileId,
      });
    }

    // If actor is provided, validate user access (centerId is optional)
    if (actor) {
      await this.accessControlHelperService.validateUserAccess({
        granterUserProfileId: actor.userProfileId,
        targetUserProfileId: userProfileId,
        centerId: actor.centerId, // Optional - can be undefined
      });
    }

    return profile;
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
      throw new ValidationFailedException('t.messages.alreadyHas', [], {
        resource: 't.resources.user',
        what: `t.resources.${profileType.toLowerCase()}Profile`,
      });
    }

    const code = await this.userProfileCodeService.generate(profileType);
    const userProfile = await this.userProfileRepository.create({
      userId,
      profileType,
      profileRefId,
      code,
    });

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
    return this.userProfileRepository.findUserProfileByType(
      userId,
      profileType,
    );
  }

  async deleteUserProfile(
    userProfileId: string,
    actor: ActorUser,
  ): Promise<void> {
    // Get userProfile to determine profileType
    const userProfile = await this.findOne(userProfileId);
    if (!userProfile) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.profile',
        identifier: 't.resources.identifier',
        value: userProfileId,
      });
    }

    // Check permission based on profileType
    await this.userProfilePermissionService.canDelete(actor, userProfileId);

    await this.userProfileRepository.softRemove(userProfileId);
  }

  async restoreUserProfile(
    userProfileId: string,
    actor: ActorUser,
  ): Promise<void> {
    // First, fetch the soft-deleted profile to get its profileType
    const deletedProfile =
      await this.userProfileRepository.findOneSoftDeletedById(userProfileId);

    if (!deletedProfile) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.profile',
        identifier: 't.resources.identifier',
        value: userProfileId,
      });
    }

    if (!deletedProfile.deletedAt) {
      throw new BusinessLogicException('t.messages.actionNotAllowed', {
        action: 't.buttons.restore',
        resource: 't.resources.profile',
        reason: 'it is not deleted',
      });
    }

    // Check permission based on profileType
    await this.userProfilePermissionService.canRestore(actor, userProfileId);

    await this.userProfileRepository.restore(userProfileId);
  }

  async isAdmin(userProfileId: string) {
    return !!(await this.userProfileRepository.isAdmin(userProfileId));
  }

  async isStaff(userProfileId: string) {
    return !!(await this.userProfileRepository.isStaff(userProfileId));
  }

  /**
   * Creates a new user profile with all associated entities and access control
   * @param dto Profile creation data
   * @param actor The user performing the action
   * @param existingProfileRefId Optional: Use existing profileRefId instead of creating new entity
   * @returns The created UserProfile
   */
  async createProfile(
    dto: CreateUserProfileDto,
    actor: ActorUser,
  ): Promise<UserProfile> {
    // 1. Validate that actor has permission to create this profile type
    await this.userProfilePermissionService.canCreate(actor, dto.profileType);

    // 2. Create User entity (includes UserInfo creation)
    const createdUser = await this.userService.createUser(dto);

    // 3. Get or create profileRefEntity (Staff/Admin/Teacher) based on profileType
    // Use existing profileRefId if provided, otherwise create new one
    const profileRefId =
      await this.userProfileRepository.createProfileRefEntity(dto.profileType);

    // 4. Create UserProfile linking User to profileRefEntity
    const userProfile = await this.createUserProfile(
      createdUser.id,
      dto.profileType,
      profileRefId,
    );

    // 5. Emit domain events for STAFF, STUDENT, TEACHER and ADMIN profiles
    // Access control, UserCreatedEvent, and phone verification are handled by listeners
    if (dto.profileType === ProfileType.STAFF) {
      // Get the Staff entity
      const staff = (await this.userProfileRepository.getProfileRefEntity(
        profileRefId,
        ProfileType.STAFF,
      )) as Staff;

      const centerId = dto.centerId ?? actor.centerId;
      await this.typeSafeEventEmitter.emitAsync(
        StaffEvents.CREATE,
        new CreateStaffEvent(
          createdUser,
          userProfile,
          actor,
          staff,
          centerId,
          dto.roleId,
        ),
      );
    } else if (dto.profileType === ProfileType.STUDENT) {
      // Get the Student entity
      const student = (await this.userProfileRepository.getProfileRefEntity(
        profileRefId,
        ProfileType.STUDENT,
      )) as Student;

      const centerId = dto.centerId ?? actor.centerId;
      await this.typeSafeEventEmitter.emitAsync(
        StudentEvents.CREATE,
        new CreateStudentEvent(
          createdUser,
          userProfile,
          actor,
          student,
          centerId,
        ),
      );
    } else if (dto.profileType === ProfileType.TEACHER) {
      // Get the Teacher entity
      const teacher = (await this.userProfileRepository.getProfileRefEntity(
        profileRefId,
        ProfileType.TEACHER,
      )) as Teacher;

      const centerId = dto.centerId ?? actor.centerId;
      await this.typeSafeEventEmitter.emitAsync(
        TeacherEvents.CREATE,
        new CreateTeacherEvent(
          createdUser,
          userProfile,
          actor,
          teacher,
          centerId,
        ),
      );
    } else if (dto.profileType === ProfileType.ADMIN) {
      // Get the Admin entity
      const admin = (await this.userProfileRepository.getProfileRefEntity(
        profileRefId,
        ProfileType.ADMIN,
      )) as Admin;

      await this.typeSafeEventEmitter.emitAsync(
        AdminEvents.CREATE,
        new CreateAdminEvent(
          createdUser,
          userProfile,
          actor,
          admin,
          dto.roleId,
        ),
      );
    }

    return userProfile;
  }
}
