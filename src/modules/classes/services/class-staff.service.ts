import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ClassStaffRepository } from '../repositories/class-staff.repository';
import { ClassAccessService } from './class-access.service';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ClassesErrors } from '../exceptions/classes.errors';
import { BaseService } from '@/shared/common/services/base.service';
import { ClassStaff } from '../entities/class-staff.entity';
import { ClassStaffAccessDto } from '../dto/class-staff-access.dto';
import { BulkOperationService } from '@/shared/common/services/bulk-operation.service';
import { BulkOperationResult } from '@/shared/common/services/bulk-operation.service';
import { Transactional } from '@nestjs-cls/transactional';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { BranchAccessService } from '@/modules/centers/services/branch-access.service';
import { ClassesRepository } from '../repositories/classes.repository';
import { ClassStatus } from '../enums/class-status.enum';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { CentersService } from '@/modules/centers/services/centers.service';
import { BranchesService } from '@/modules/centers/services/branches.service';
import { UserProfileErrors } from '@/modules/user-profile/exceptions/user-profile.errors';
import { CentersErrors } from '@/modules/centers/exceptions/centers.errors';
import { SelfProtectionService } from '@/shared/common/services/self-protection.service';
import { RoleHierarchyService } from '@/shared/common/services/role-hierarchy.service';

@Injectable()
export class ClassStaffService extends BaseService {
  constructor(
    private readonly classStaffRepository: ClassStaffRepository,
    private readonly classAccessService: ClassAccessService,
    private readonly bulkOperationService: BulkOperationService,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly branchAccessService: BranchAccessService,
    private readonly classesRepository: ClassesRepository,
    private readonly userProfileService: UserProfileService,
    private readonly centersService: CentersService,
    private readonly branchesService: BranchesService,
    private readonly selfProtectionService: SelfProtectionService,
    private readonly roleHierarchyService: RoleHierarchyService,
  ) {
    super();
  }

  /**
   * Gets all staff assignments for a specific class.
   *
   * @param classId - The class ID
   * @param actor - The user performing the action
   * @returns Array of ClassStaff assignments
   * @throws ClassesErrors.classNotFound() if class doesn't exist
   * @throws InsufficientPermissionsException if actor doesn't have permission
   */
  async getClassStaff(
    classId: string,
    actor: ActorUser,
  ): Promise<ClassStaff[]> {
    const classEntity = await this.classesRepository.findOneOrThrow(classId);

    // Validate actor has branch access to the class's branch
    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId: classEntity.branchId,
    });

    return this.classStaffRepository.findByClassId(classId);
  }

  /**
   * Assigns a staff member to a class.
   * Validates user access, profile type, center access, and creates class staff assignment.
   *
   * @param data - ClassStaffAccessDto containing userProfileId and classId
   * @param actor - The user performing the action (centerId is taken from actor)
   * @returns Created ClassStaff assignment
   * @throws AccessControlErrors.userProfileNotFound() if profile doesn't exist
   * @throws ClassesErrors.classStaffAlreadyAssigned() if already assigned
   */
  async assignStaffToClass(
    data: ClassStaffAccessDto,
    actor: ActorUser,
  ): Promise<ClassStaff> {
    // Self-protection check - applies to ALL operations
    this.selfProtectionService.validateNotSelf(
      actor.userProfileId,
      data.userProfileId,
    );

    const centerId = actor.centerId!;

    // Role hierarchy check (use actor.centerId, should always be available for class operations)
    await this.roleHierarchyService.validateCanOperateOnUser(
      actor.userProfileId,
      data.userProfileId,
      centerId, // Should always be available for class operations
    );

    // Validate actor has user access to target user (optional centerId)
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: data.userProfileId,
      centerId: centerId, // Optional - can be undefined
    });

    // Validate target user has center access
    await this.accessControlHelperService.validateCenterAccess({
      userProfileId: data.userProfileId,
      centerId: centerId,
    });

    // Validate user profile is active
    const userProfile = await this.userProfileService.findOne(
      data.userProfileId,
    );
    if (!userProfile) {
      throw UserProfileErrors.userProfileNotFound();
    }
    if (!userProfile.isActive) {
      throw UserProfileErrors.userProfileInactive();
    }

    // DTO validation (@BelongsToBranch decorator) already ensures class belongs to actor's branch
    // Fetch class to get branchId for snapshot and status check
    const classEntity = await this.classesRepository.findOneOrThrow(
      data.classId,
    );

    // Validate center is active
    const center = await this.centersService.findCenterById(
      classEntity.centerId,
      actor,
    );
    if (!center.isActive) {
      throw CentersErrors.centerInactive();
    }

    // Validate branch is active
    const branch = await this.branchesService.getBranch(
      classEntity.branchId,
      actor,
    );
    if (!branch.isActive) {
      throw CentersErrors.branchInactive();
    }

    // Block staff assignment if class status is CANCELED or FINISHED
    if (
      classEntity.status === ClassStatus.CANCELED ||
      classEntity.status === ClassStatus.FINISHED
    ) {
      throw ClassesErrors.classStatusDoesNotAllowStaffAssignment();
    }

    // Validate target staff member has branch access to the class's branch
    await this.branchAccessService.validateBranchAccess({
      userProfileId: data.userProfileId,
      centerId: centerId,
      branchId: classEntity.branchId,
    });

    const canAccess = await this.classAccessService.canClassAccess(data);
    if (canAccess) {
      throw ClassesErrors.staffAlreadyAssignedToClass();
    }

    // Extract branchId from validated class entity for snapshot
    const classStaff = await this.classStaffRepository.grantClassStaffAccess(
      data,
      centerId,
      classEntity.branchId,
    );

    return classStaff;
  }

  /**
   * Removes a staff member from a class.
   * Validates user access and removes class staff assignment.
   *
   * @param data - ClassStaffAccessDto containing userProfileId and classId
   * @param actor - The user performing the action (centerId is taken from actor)
   * @returns Removed ClassStaff assignment
   */
  async removeStaffFromClass(
    data: ClassStaffAccessDto,
    actor: ActorUser,
  ): Promise<ClassStaff> {
    // Self-protection check - applies to ALL operations
    this.selfProtectionService.validateNotSelf(
      actor.userProfileId,
      data.userProfileId,
    );

    const centerId = actor.centerId!;

    // Role hierarchy check (use actor.centerId, should always be available for class operations)
    await this.roleHierarchyService.validateCanOperateOnUser(
      actor.userProfileId,
      data.userProfileId,
      centerId, // Should always be available for class operations
    );

    // Validate actor has user access to target user (optional centerId)
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: data.userProfileId,
      centerId: centerId, // Optional - can be undefined
    });

    // Validate target user has center access
    await this.accessControlHelperService.validateCenterAccess({
      userProfileId: data.userProfileId,
      centerId: centerId,
    });

    // validateClassAccess already validates that the target user has class access
    // and implicitly validates branch access via the class
    await this.classAccessService.validateClassAccess(data);

    const result = await this.classStaffRepository.revokeClassStaffAccess(data);

    return result;
  }

  /**
   * Assigns multiple staff members to a class.
   * This is a best-effort operation: individual errors are caught and aggregated.
   * The operation is not fully atomic - some staff members may succeed while others fail.
   *
   * @param classId - The class ID to assign staff to
   * @param userProfileIds - Array of staff user profile IDs to assign
   * @param actor - The user performing the action
   * @returns BulkOperationResult with success/failure details for each staff member
   * @throws CommonErrors.bulkOperationFailed() if userProfileIds array is empty
   */
  @Transactional()
  async bulkAssignStaffToClass(
    classId: string,
    userProfileIds: string[],
    actor: ActorUser,
  ): Promise<BulkOperationResult> {
    if (!userProfileIds || userProfileIds.length === 0) {
      throw ClassesErrors.classValidationFailed();
    }

    return await this.bulkOperationService.executeBulk(
      userProfileIds,
      async (userProfileId: string) => {
        const classStaffAccessDto: ClassStaffAccessDto = {
          userProfileId,
          classId,
        };
        await this.assignStaffToClass(classStaffAccessDto, actor);
        return { id: userProfileId };
      },
    );
  }

  /**
   * Removes multiple staff members from a class.
   * This is a best-effort operation: individual errors are caught and aggregated.
   * The operation is not fully atomic - some staff members may succeed while others fail.
   *
   * @param classId - The class ID to remove staff from
   * @param userProfileIds - Array of staff user profile IDs to remove
   * @param actor - The user performing the action
   * @returns BulkOperationResult with success/failure details for each staff member
   * @throws CommonErrors.bulkOperationFailed() if userProfileIds array is empty
   */
  @Transactional()
  async bulkRemoveStaffFromClass(
    classId: string,
    userProfileIds: string[],
    actor: ActorUser,
  ): Promise<BulkOperationResult> {
    if (!userProfileIds || userProfileIds.length === 0) {
      throw ClassesErrors.classValidationFailed();
    }

    return await this.bulkOperationService.executeBulk(
      userProfileIds,
      async (userProfileId: string) => {
        const classStaffAccessDto: ClassStaffAccessDto = {
          userProfileId,
          classId,
        };
        await this.removeStaffFromClass(classStaffAccessDto, actor);
        return { id: userProfileId };
      },
    );
  }
}
