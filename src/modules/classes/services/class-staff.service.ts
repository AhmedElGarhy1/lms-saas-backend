import { Injectable } from '@nestjs/common';
import { ClassStaffRepository } from '../repositories/class-staff.repository';
import { ClassAccessService } from './class-access.service';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { BusinessLogicException } from '@/shared/common/exceptions/custom.exceptions';
import { BaseService } from '@/shared/common/services/base.service';
import { ClassStaff } from '../entities/class-staff.entity';
import { ClassStaffAccessDto } from '../dto/class-staff-access.dto';
import { BulkOperationService } from '@/shared/common/services/bulk-operation.service';
import { BulkOperationResult } from '@/shared/common/services/bulk-operation.service';
import { Transactional } from '@nestjs-cls/transactional';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { BranchAccessService } from '@/modules/centers/services/branch-access.service';
import { ClassesRepository } from '../repositories/classes.repository';

@Injectable()
export class ClassStaffService extends BaseService {
  constructor(
    private readonly classStaffRepository: ClassStaffRepository,
    private readonly classAccessService: ClassAccessService,
    private readonly bulkOperationService: BulkOperationService,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly branchAccessService: BranchAccessService,
    private readonly classesRepository: ClassesRepository,
  ) {
    super();
  }

  /**
   * Gets all staff assignments for a specific class.
   *
   * @param classId - The class ID
   * @param actor - The user performing the action
   * @returns Array of ClassStaff assignments
   * @throws ResourceNotFoundException if class doesn't exist
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
   * @throws ResourceNotFoundException if profile doesn't exist
   * @throws BusinessLogicException if profile is not STAFF, doesn't have center access, or already assigned
   */
  async assignStaffToClass(
    data: ClassStaffAccessDto,
    actor: ActorUser,
  ): Promise<ClassStaff> {
    const centerId = actor.centerId!;

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

    // Fetch class to get branchId for branch access validation
    const classEntity = await this.classesRepository.findOneOrThrow(
      data.classId,
    );

    // Validate actor has branch access to the class's branch
    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: centerId,
      branchId: classEntity.branchId,
    });

    // Validate target staff member has branch access to the class's branch
    await this.branchAccessService.validateBranchAccess({
      userProfileId: data.userProfileId,
      centerId: centerId,
      branchId: classEntity.branchId,
    });

    const canAccess = await this.classAccessService.canClassAccess(data);
    if (canAccess) {
      throw new BusinessLogicException('t.messages.alreadyIs', {
        resource: 't.resources.staff',
        state: 'assigned to class',
      });
    }

    const classStaff = await this.classStaffRepository.grantClassStaffAccess(
      data,
      centerId,
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
    const centerId = actor.centerId!;

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
   * @throws BusinessLogicException if userProfileIds array is empty
   */
  @Transactional()
  async bulkAssignStaffToClass(
    classId: string,
    userProfileIds: string[],
    actor: ActorUser,
  ): Promise<BulkOperationResult> {
    if (!userProfileIds || userProfileIds.length === 0) {
      throw new BusinessLogicException('t.messages.validationFailed');
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
   * @throws BusinessLogicException if userProfileIds array is empty
   */
  @Transactional()
  async bulkRemoveStaffFromClass(
    classId: string,
    userProfileIds: string[],
    actor: ActorUser,
  ): Promise<BulkOperationResult> {
    if (!userProfileIds || userProfileIds.length === 0) {
      throw new BusinessLogicException('t.messages.validationFailed');
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
