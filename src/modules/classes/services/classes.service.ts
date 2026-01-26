import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { CreateClassDto } from '../dto/create-class.dto';
import { UpdateClassDto } from '../dto/update-class.dto';
import { PaginateClassesDto } from '../dto/paginate-classes.dto';
import { ClassesRepository } from '../repositories/classes.repository';
import { ClassValidationService } from './class-validation.service';
import { PaymentStrategyService } from './payment-strategy.service';
import { Pagination } from '@/shared/common/types/pagination.types';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ClassesErrors } from '../exceptions/classes.errors';
import { BaseService } from '@/shared/common/services/base.service';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { BranchAccessService } from '@/modules/centers/services/branch-access.service';
import { Class } from '../entities/class.entity';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { ClassEvents } from '@/shared/events/classes.events.enum';
import {
  ClassCreatedEvent,
  ClassUpdatedEvent,
  ClassDeletedEvent,
  ClassRestoredEvent,
  ClassStatusChangedEvent,
} from '../events/class.events';
import { ClassStatus } from '../enums/class-status.enum';
import { ClassStateMachine } from '../state-machines/class-state-machine';
import { ChangeClassStatusDto } from '../dto/change-class-status.dto';
import { ClassAccessService } from './class-access.service';
import { Transactional } from '@nestjs-cls/transactional';
import { BulkOperationService } from '@/shared/common/services/bulk-operation.service';
import { BulkOperationResult } from '@/shared/common/services/bulk-operation.service';
import { StudentPaymentStrategyDto } from '../dto/student-payment-strategy.dto';
import { TeacherPaymentStrategyDto } from '../dto/teacher-payment-strategy.dto';
import { TeacherPaymentUnit } from '../enums/teacher-payment-unit.enum';
import { TeacherPayoutService } from '@/modules/teacher-payouts/services/teacher-payout.service';
import { UserProfileService } from '@/modules/user-profile/services/user-profile.service';
import { CentersService } from '@/modules/centers/services/centers.service';
import { BranchesService } from '@/modules/centers/services/branches.service';
import { UserProfileErrors } from '@/modules/user-profile/exceptions/user-profile.errors';
import { CentersErrors } from '@/modules/centers/exceptions/centers.errors';

@Injectable()
export class ClassesService extends BaseService {
  private readonly logger = new Logger(ClassesService.name);

  constructor(
    private readonly classesRepository: ClassesRepository,
    private readonly classValidationService: ClassValidationService,
    private readonly paymentStrategyService: PaymentStrategyService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
    private readonly classAccessService: ClassAccessService,
    private readonly bulkOperationService: BulkOperationService,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly branchAccessService: BranchAccessService,
    private readonly classStateMachine: ClassStateMachine,
    private readonly teacherPayoutService: TeacherPayoutService,
    private readonly userProfileService: UserProfileService,
    private readonly centersService: CentersService,
    private readonly branchesService: BranchesService,
  ) {
    super();
  }

  async findOneOrThrow(classId: string): Promise<Class> {
    return this.classesRepository.findOneOrThrow(classId);
  }

  /**
   * Paginate classes for a center with filtering and search capabilities.
   *
   * @param paginateDto - Pagination and filter parameters
   * @param actor - The user performing the action
   * @returns Paginated list of classes with computed fields (groupsCount, studentsCount)
   */
  async paginateClasses(
    paginateDto: PaginateClassesDto,
    actor: ActorUser,
  ): Promise<Pagination<Class>> {
    // If no branchId specified, default to actor's branch to show only relevant classes
    const dtoWithDefaults = {
      ...paginateDto,
      branchId: paginateDto.branchId || actor.branchId,
    };

    return this.classesRepository.paginateClasses(dtoWithDefaults, actor);
  }

  /**
   * Get a single class with all relations loaded.
   * Validates access based on actor profile type (staff vs non-staff).
   *
   * @param classId - The class ID
   * @param actor - The user performing the action
   * @param includeDeleted - Whether to include soft-deleted classes
   * @returns Class entity with all relations (groups, level, subject, teacher, etc.)
   * @throws ClassesErrors.classNotFound() if class doesn't exist
   * @throws InsufficientPermissionsException if actor doesn't have access
   */
  async getClass(
    classId: string,
    actor: ActorUser,
    includeDeleted = false,
  ): Promise<Class> {
    return this.findClassAndValidateAccess(classId, actor, includeDeleted);
  }

  /**
   * Create a new class with payment strategies.
   * Validates class data, creates class entity, and sets up payment strategies.
   *
   * @param createClassDto - Class creation data including payment strategies
   * @param actor - The user performing the action
   * @returns Created class entity with all relations loaded
   * @throws ClassesErrors.classValidationFailed() if validation fails
   */
  @Transactional()
  async createClass(
    createClassDto: CreateClassDto,
    actor: ActorUser,
  ): Promise<Class> {
    const centerId = actor.centerId!;

    // Validate actor has user access to target teacher (optional centerId)
    await this.accessControlHelperService.validateUserAccess({
      granterUserProfileId: actor.userProfileId,
      targetUserProfileId: createClassDto.teacherUserProfileId,
      centerId: centerId, // Optional - can be undefined
    });

    // Validate that teacherUserProfileId has center access
    await this.accessControlHelperService.validateCenterAccess({
      userProfileId: createClassDto.teacherUserProfileId,
      centerId: centerId,
    });

    // Validate teacher user profile is active
    const teacher = await this.userProfileService.findOne(
      createClassDto.teacherUserProfileId,
    );
    if (!teacher) {
      throw UserProfileErrors.userProfileNotFound();
    }
    if (!teacher.isActive) {
      throw UserProfileErrors.userProfileInactive();
    }

    // Validate center is active
    const center = await this.centersService.findCenterById(centerId, actor);
    if (!center.isActive) {
      throw CentersErrors.centerInactive();
    }

    // Determine target branch: use provided branchId or fallback to actor's branch
    const targetBranchId = createClassDto.branchId || actor.branchId;
    if (!targetBranchId) {
      throw ClassesErrors.classBranchRequired();
    }

    // Validate actor has branch access to the target branch
    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: centerId,
      branchId: targetBranchId,
    });

    // Validate branch is active
    const branch = await this.branchesService.getBranch(targetBranchId, actor);
    if (!branch.isActive) {
      throw CentersErrors.branchInactive();
    }

    // Check if a class with the same combination already exists
    const existingClass =
      await this.classesRepository.findClassByUniqueCombination(
        centerId,
        targetBranchId,
        createClassDto.teacherUserProfileId,
        createClassDto.levelId,
        createClassDto.subjectId,
      );

    if (existingClass) {
      throw ClassesErrors.classAlreadyExists();
    }

    const { studentPaymentStrategy, teacherPaymentStrategy, ...classData } =
      createClassDto;

    // Dates are already UTC Date objects from DTO (converted by @IsIsoDateTime decorator)
    const classDataWithUtcDates = {
      ...classData,
      centerId: actor.centerId!,
      branchId: targetBranchId,
    };

    const classEntity = await this.classesRepository.create(
      classDataWithUtcDates,
    );

    // Pass centerId (from actor) and branchId (from validated target branch) for snapshot
    await this.paymentStrategyService.createStrategiesForClass(
      classEntity.id,
      centerId,
      targetBranchId,
      studentPaymentStrategy,
      teacherPaymentStrategy,
    );

    const classWithRelations =
      await this.classesRepository.findClassWithRelationsOrThrow(
        classEntity.id,
      );

    // Create CLASS payout record if teacher payment strategy is CLASS
    if (teacherPaymentStrategy.per === TeacherPaymentUnit.CLASS) {
      try {
        await this.teacherPayoutService.createClassPayout(
          classWithRelations,
          teacherPaymentStrategy,
          actor,
          teacherPaymentStrategy.initialPaymentAmount,
          teacherPaymentStrategy.paymentMethod,
        );
      } catch (error) {
        // Log error but don't fail class creation
        this.logger.error(
          `Failed to create initial CLASS payout for class ${classEntity.id}:`,
          error,
        );
      }
    }

    await this.typeSafeEventEmitter.emitAsync(
      ClassEvents.CREATED,
      new ClassCreatedEvent(classWithRelations, actor, actor.centerId!),
    );

    return classWithRelations;
  }

  @Transactional()
  async updateClass(
    classId: string,
    data: UpdateClassDto,
    actor: ActorUser,
  ): Promise<Class> {
    const classEntity = await this.findClassAndValidateAccess(
      classId,
      actor,
      false,
    );

    // Validate related entities are active
    const classWithRelations =
      await this.classesRepository.findClassWithRelationsOrThrow(classId);
    if (classWithRelations.teacher && !classWithRelations.teacher.isActive) {
      throw UserProfileErrors.userProfileInactive();
    }
    if (classWithRelations.center && !classWithRelations.center.isActive) {
      throw CentersErrors.centerInactive();
    }
    if (classWithRelations.branch && !classWithRelations.branch.isActive) {
      throw CentersErrors.branchInactive();
    }

    await this.classValidationService.validateClassUpdate(
      classId,
      data,
      actor,
      actor.centerId!,
      classEntity,
    );

    // Extract skipWarning from DTO (not part of class data) - used in validation above
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { skipWarning, ...classUpdateData } = data;

    // Dates are already UTC Date objects from DTO (converted by @IsIsoDateTime decorator)
    const classUpdateDataWithUtcDates: Record<string, unknown> = {
      ...classUpdateData,
    };

    const changedFields: string[] = [];

    if (Object.keys(classUpdateDataWithUtcDates).length > 0) {
      await this.classesRepository.update(classId, classUpdateDataWithUtcDates);
      Object.assign(classEntity, classUpdateDataWithUtcDates);

      // Track which fields changed (exclude skipWarning)
      Object.keys(classUpdateData).forEach((key) => {
        const value = (classUpdateData as Record<string, unknown>)[key];
        if (value !== undefined) {
          changedFields.push(key);
        }
      });
    }

    await this.typeSafeEventEmitter.emitAsync(
      ClassEvents.UPDATED,
      new ClassUpdatedEvent(classEntity, actor, actor.centerId!, changedFields),
    );

    return classEntity;
  }

  /**
   * Update student payment strategy for a class.
   * Only updates existing strategy (throws error if missing).
   * Only allowed if class status is PENDING_TEACHER_APPROVAL or NOT_STARTED.
   *
   * @param classId - The class ID
   * @param studentStrategy - Student payment strategy data
   * @param actor - The user performing the action
   * @returns Updated class entity with all relations loaded
   * @throws ClassesErrors.classNotFound() if class doesn't exist
   * @throws ClassesErrors.paymentStrategyNotFound() if payment strategy doesn't exist
   * @throws ClassesErrors.paymentStrategyUpdateDenied() if class status doesn't allow payment updates
   */
  @Transactional()
  async updateStudentPaymentStrategy(
    classId: string,
    studentStrategy: StudentPaymentStrategyDto,
    actor: ActorUser,
  ): Promise<Class> {
    const classEntity =
      await this.classesRepository.findClassWithRelationsOrThrow(
        classId,
        false,
      );

    // Validate actor has branch access to the class's branch
    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId: classEntity.branchId,
    });

    await this.classAccessService.validateClassAccess({
      userProfileId: actor.userProfileId,
      classId: classEntity.id,
    });

    // Validate class status allows payment strategy updates
    if (
      classEntity.status !== ClassStatus.PENDING_TEACHER_APPROVAL &&
      classEntity.status !== ClassStatus.NOT_STARTED
    ) {
      throw ClassesErrors.paymentStrategyUpdateDenied();
    }

    // Update student payment strategy (throws error if doesn't exist)
    await this.paymentStrategyService.updateStudentStrategy(
      classId,
      studentStrategy,
    );

    // Return updated class with relations
    const updatedClass =
      await this.classesRepository.findClassWithRelationsOrThrow(
        classId,
        false,
      );

    return updatedClass;
  }

  /**
   * Update teacher payment strategy for a class.
   * Only updates existing strategy (throws error if missing).
   * Only allowed if class status is PENDING_TEACHER_APPROVAL or NOT_STARTED.
   *
   * @param classId - The class ID
   * @param teacherStrategy - Teacher payment strategy data
   * @param actor - The user performing the action
   * @returns Updated class entity with all relations loaded
   * @throws ClassesErrors.classNotFound() if class doesn't exist
   * @throws ClassesErrors.paymentStrategyNotFound() if payment strategy doesn't exist
   * @throws ClassesErrors.paymentStrategyUpdateDenied() if class status doesn't allow payment updates
   */
  @Transactional()
  async updateTeacherPaymentStrategy(
    classId: string,
    teacherStrategy: TeacherPaymentStrategyDto,
    actor: ActorUser,
  ): Promise<Class> {
    const classEntity = await this.findClassAndValidateAccess(
      classId,
      actor,
      false,
    );

    // Validate class status allows payment strategy updates
    if (
      classEntity.status !== ClassStatus.PENDING_TEACHER_APPROVAL &&
      classEntity.status !== ClassStatus.NOT_STARTED
    ) {
      throw ClassesErrors.paymentStrategyUpdateDenied();
    }

    // Update teacher payment strategy (throws error if doesn't exist)
    await this.paymentStrategyService.updateTeacherStrategy(
      classId,
      teacherStrategy,
    );

    // Return updated class with relations
    const updatedClass =
      await this.classesRepository.findClassWithRelationsOrThrow(
        classId,
        false,
      );

    return updatedClass;
  }

  /**
   * Soft delete a class.
   * Marks the class as deleted but preserves data for potential restoration.
   *
   * @param classId - The class ID to delete
   * @param actor - The user performing the action
   * @throws ClassesErrors.classNotFound() if class doesn't exist
   * @throws InsufficientPermissionsException if actor doesn't have access
   */
  async deleteClass(classId: string, actor: ActorUser): Promise<void> {
    const classEntity = await this.classesRepository.findOneOrThrow(classId);

    // Validate actor has branch access to the class's branch
    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId: classEntity.branchId,
    });

    await this.classAccessService.validateClassAccess({
      userProfileId: actor.userProfileId,
      classId: classEntity.id,
    });

    await this.classesRepository.softRemove(classId);

    await this.typeSafeEventEmitter.emitAsync(
      ClassEvents.DELETED,
      new ClassDeletedEvent(classId, actor, actor.centerId!),
    );
  }

  /**
   * Restore a soft-deleted class.
   * Recovers a previously deleted class and makes it active again.
   *
   * @param classId - The class ID to restore
   * @param actor - The user performing the action
   * @throws ClassesErrors.classNotFound() if class doesn't exist
   * @throws InsufficientPermissionsException if actor doesn't have access
   */
  async restoreClass(classId: string, actor: ActorUser): Promise<void> {
    const classEntity = await this.findSoftDeletedClassAndValidateAccess(
      classId,
      actor,
    );
    const centerId = actor.centerId!;

    await this.classesRepository.restore(classId);

    await this.typeSafeEventEmitter.emitAsync(
      ClassEvents.RESTORED,
      new ClassRestoredEvent(classEntity, actor, centerId),
    );
  }

  /**
   * Get available status transitions for a class.
   * Returns the list of statuses that the class can transition to from its current status.
   *
   * @param classId - The class ID
   * @param actor - The user performing the action
   * @returns Array of available ClassStatus values
   * @throws ClassesErrors.classNotFound() if class doesn't exist
   */
  async getAvailableStatuses(
    classId: string,
    actor: ActorUser,
  ): Promise<ClassStatus[]> {
    const classEntity = await this.getClass(classId, actor);
    return this.classStateMachine.getValidStatusesFrom(classEntity.status);
  }

  /**
   * Prepares update data for status changes, including date handling logic.
   * Handles date updates for ACTIVE, FINISHED, and CANCELED statuses.
   *
   * @param oldStatus - The current status of the class
   * @param newStatus - The new status to transition to
   * @param now - The current timestamp (timezone-aware)
   * @returns Update data object with status and date fields
   */
  private prepareStatusUpdateData(
    oldStatus: ClassStatus,
    newStatus: ClassStatus,
    now: Date,
  ): Record<string, any> {
    // Use Record<string, any> to allow null values for clearing fields
    const updateData: Record<string, any> = { status: newStatus };

    // Handle ACTIVE status: Force update startDate to now (even if in future)
    if (newStatus === ClassStatus.ACTIVE) {
      updateData.startDate = now;
    }

    // Handle FINISHED status: Set endDate to now
    if (newStatus === ClassStatus.FINISHED) {
      updateData.endDate = now;
    }

    // Handle CANCELED status: Set endDate to now
    if (newStatus === ClassStatus.CANCELED) {
      updateData.endDate = now;
    }

    // Handle reverting FINISHED/CANCELED → ACTIVE: Clear endDate
    // Use null instead of undefined because TypeORM's update() ignores undefined values
    // null explicitly sets the field to NULL in the database
    if (
      (oldStatus === ClassStatus.FINISHED ||
        oldStatus === ClassStatus.CANCELED) &&
      newStatus === ClassStatus.ACTIVE
    ) {
      updateData.endDate = null;
    }

    return updateData;
  }

  /**
   * Change the status of a class.
   * Validates the transition is allowed and emits a status changed event.
   *
   * @param classId - The class ID
   * @param changeStatusDto - DTO containing new status and optional reason
   * @param actor - The user performing the action
   * @returns Updated class entity
   * @throws ClassesErrors.classNotFound() if class doesn't exist
   * @throws ClassesErrors.classStatusTransitionInvalid() if transition is not allowed
   */
  @Transactional()
  async changeClassStatus(
    classId: string,
    changeStatusDto: ChangeClassStatusDto,
    actor: ActorUser,
  ): Promise<Class> {
    const classEntity = await this.getClass(classId, actor);
    const oldStatus = classEntity.status;
    const newStatus = changeStatusDto.status;
    const reason = changeStatusDto.reason;

    // Validate related entities are active
    const classWithRelations =
      await this.classesRepository.findClassWithRelationsOrThrow(classId);
    if (classWithRelations.teacher && !classWithRelations.teacher.isActive) {
      throw UserProfileErrors.userProfileInactive();
    }
    if (classWithRelations.center && !classWithRelations.center.isActive) {
      throw CentersErrors.centerInactive();
    }
    if (classWithRelations.branch && !classWithRelations.branch.isActive) {
      throw CentersErrors.branchInactive();
    }

    // Validate transition is allowed
    if (!this.classStateMachine.isValidTransition(oldStatus, newStatus)) {
      throw ClassesErrors.classStatusTransitionInvalid();
    }

    // Validate 24-hour grace period for reverting CANCELED/FINISHED to ACTIVE
    if (
      (oldStatus === ClassStatus.CANCELED ||
        oldStatus === ClassStatus.FINISHED) &&
      newStatus === ClassStatus.ACTIVE
    ) {
      const gracePeriodMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      const timeSinceUpdate = Date.now() - classEntity.updatedAt.getTime();

      if (timeSinceUpdate >= gracePeriodMs) {
        throw ClassesErrors.classStatusChangeGracePeriodExpired();
      }
    }

    // Prepare update data with status and date handling
    const updateData = this.prepareStatusUpdateData(
      oldStatus,
      newStatus,
      new Date(),
    );

    // Update class with status and dates using updateThrow to ensure it persists
    // updateThrow will throw an error if the update fails or no rows are affected
    const updatedClass = await this.classesRepository.updateThrow(
      classId,
      updateData,
    );

    // Emit status changed event
    await this.typeSafeEventEmitter.emitAsync(
      ClassEvents.STATUS_CHANGED,
      new ClassStatusChangedEvent(
        classId,
        oldStatus,
        newStatus,
        reason,
        actor,
        actor.centerId!,
      ),
    );

    return updatedClass;
  }

  /**
   * Deletes multiple classes in bulk.
   * This is a best-effort operation: individual errors are caught and aggregated.
   * The operation is not fully atomic - some classes may succeed while others fail.
   *
   * @param classIds - Array of class IDs to delete
   * @param actor - The user performing the action
   * @returns BulkOperationResult with success/failure details for each class
   * @throws CommonErrors.bulkOperationFailed() if classIds array is empty
   */
  @Transactional()
  async bulkDeleteClasses(
    classIds: string[],
    actor: ActorUser,
  ): Promise<BulkOperationResult> {
    if (!classIds || classIds.length === 0) {
      throw ClassesErrors.classValidationFailed();
    }

    return await this.bulkOperationService.executeBulk(
      classIds,
      async (classId: string) => {
        await this.deleteClass(classId, actor);
        return { id: classId };
      },
    );
  }

  /**
   * Restores multiple soft-deleted classes in bulk.
   * This is a best-effort operation: individual errors are caught and aggregated.
   * The operation is not fully atomic - some classes may succeed while others fail.
   *
   * @param classIds - Array of class IDs to restore
   * @param actor - The user performing the action
   * @returns BulkOperationResult with success/failure details for each class
   * @throws CommonErrors.bulkOperationFailed() if classIds array is empty
   */
  @Transactional()
  async bulkRestoreClasses(
    classIds: string[],
    actor: ActorUser,
  ): Promise<BulkOperationResult> {
    if (!classIds || classIds.length === 0) {
      throw ClassesErrors.classValidationFailed();
    }

    return await this.bulkOperationService.executeBulk(
      classIds,
      async (classId: string) => {
        await this.restoreClass(classId, actor);
        return { id: classId };
      },
    );
  }

  /**
   * Unified gatekeeper to ensure the actor has permission to access this class.
   * Validates: 1. Class existence, 2. Branch Access, 3. Class Staff Access (for STAFF users).
   *
   * @param classId - The class ID
   * @param actor - The user performing the action
   * @param includeDeleted - Whether to include soft-deleted classes (default: false)
   * @returns Class entity with all relations loaded
   * @throws ClassesErrors.classNotFound() if class doesn't exist
   * @throws InsufficientPermissionsException if actor doesn't have access
   */
  private async findClassAndValidateAccess(
    classId: string,
    actor: ActorUser,
    includeDeleted = false,
  ): Promise<Class> {
    const classEntity =
      await this.classesRepository.findClassWithRelationsOrThrow(
        classId,
        includeDeleted,
      );

    // 1. Branch Access (User must belong to the branch)
    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId: classEntity.branchId,
    });

    // 2. Class Access (If Staff, must be assigned to this specific class)
    await this.classAccessService.validateClassAccess({
      userProfileId: actor.userProfileId,
      classId: classEntity.id,
    });

    return classEntity;
  }

  /**
   * Gatekeeper for restoring soft-deleted classes.
   * Validates class exists (including soft-deleted), center ownership, branch access, and class access.
   *
   * @param classId - The class ID
   * @param actor - The user performing the action
   * @returns Class entity
   * @throws ClassesErrors.classNotFound() if class doesn't exist or doesn't belong to actor's center
   * @throws InsufficientPermissionsException if actor doesn't have access
   */
  private async findSoftDeletedClassAndValidateAccess(
    classId: string,
    actor: ActorUser,
  ): Promise<Class> {
    const classEntity =
      await this.classesRepository.findOneSoftDeletedById(classId);

    if (!classEntity) {
      throw ClassesErrors.classNotFound();
    }

    const centerId = actor.centerId;
    if (!centerId || classEntity.centerId !== centerId) {
      throw ClassesErrors.classAccessDenied();
    }

    // Branch Access
    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: centerId,
      branchId: classEntity.branchId,
    });

    // Class Access
    await this.classAccessService.validateClassAccess({
      userProfileId: actor.userProfileId,
      classId: classEntity.id,
    });

    return classEntity;
  }
}
