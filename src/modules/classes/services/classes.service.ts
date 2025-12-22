import { Injectable } from '@nestjs/common';
import { CreateClassDto } from '../dto/create-class.dto';
import { UpdateClassDto } from '../dto/update-class.dto';
import { PaginateClassesDto } from '../dto/paginate-classes.dto';
import { ClassesRepository } from '../repositories/classes.repository';
import { ClassValidationService } from './class-validation.service';
import { PaymentStrategyService } from './payment-strategy.service';
import { Pagination } from '@/shared/common/types/pagination.types';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { ResourceNotFoundException } from '@/shared/common/exceptions/custom.exceptions';
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
import {
  getAvailableStatuses,
  isValidTransition,
} from '../utils/class-status-transition.util';
import { ChangeClassStatusDto } from '../dto/change-class-status.dto';
import { ClassAccessService } from './class-access.service';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { ClassStaffAccessDto } from '../dto/class-staff-access.dto';
import { Transactional } from '@nestjs-cls/transactional';
import { BulkOperationService } from '@/shared/common/services/bulk-operation.service';
import { BulkOperationResult } from '@/shared/common/services/bulk-operation.service';
import { BusinessLogicException } from '@/shared/common/exceptions/custom.exceptions';

@Injectable()
export class ClassesService extends BaseService {
  constructor(
    private readonly classesRepository: ClassesRepository,
    private readonly classValidationService: ClassValidationService,
    private readonly paymentStrategyService: PaymentStrategyService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
    private readonly classAccessService: ClassAccessService,
    private readonly bulkOperationService: BulkOperationService,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly branchAccessService: BranchAccessService,
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
    return this.classesRepository.paginateClasses(paginateDto, actor);
  }

  /**
   * Get a single class with all relations loaded.
   * Validates access based on actor profile type (staff vs non-staff).
   *
   * @param classId - The class ID
   * @param actor - The user performing the action
   * @param includeDeleted - Whether to include soft-deleted classes
   * @returns Class entity with all relations (groups, level, subject, teacher, etc.)
   * @throws ResourceNotFoundException if class doesn't exist
   * @throws InsufficientPermissionsException if actor doesn't have access
   */
  async getClass(
    classId: string,
    actor: ActorUser,
    includeDeleted = false,
  ): Promise<Class> {
    const classEntity =
      await this.classesRepository.findClassWithRelationsOrThrow(
        classId,
        includeDeleted,
      );

    // Validate actor has branch access to the class's branch
    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: actor.centerId!,
      branchId: classEntity.branchId,
    });

    return classEntity;
  }

  /**
   * Create a new class with payment strategies.
   * Validates class data, creates class entity, and sets up payment strategies.
   *
   * @param createClassDto - Class creation data including payment strategies
   * @param actor - The user performing the action
   * @returns Created class entity with all relations loaded
   * @throws BusinessLogicException if validation fails
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

    const { studentPaymentStrategy, teacherPaymentStrategy, ...classData } =
      createClassDto;

    const classEntity = await this.classesRepository.create({
      ...classData,
      centerId: actor.centerId!,
    });

    await this.paymentStrategyService.createStrategiesForClass(
      classEntity.id,
      studentPaymentStrategy,
      teacherPaymentStrategy,
    );

    const classWithRelations =
      await this.classesRepository.findClassWithRelationsOrThrow(
        classEntity.id,
      );

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

    await this.classValidationService.validateClassUpdate(
      classId,
      data,
      actor,
      actor.centerId!,
      classEntity,
    );

    const {
      studentPaymentStrategy,
      teacherPaymentStrategy,
      ...classUpdateData
    } = data;

    const changedFields: string[] = [];

    if (Object.keys(classUpdateData).length > 0) {
      await this.classesRepository.update(classId, classUpdateData);
      Object.assign(classEntity, classUpdateData);

      // Track which fields changed
      Object.keys(classUpdateData).forEach((key) => {
        const value = (classUpdateData as Record<string, unknown>)[key];
        if (value !== undefined) {
          changedFields.push(key);
        }
      });
    }

    if (studentPaymentStrategy || teacherPaymentStrategy) {
      await this.paymentStrategyService.updateStrategiesForClass(
        classId,
        studentPaymentStrategy,
        teacherPaymentStrategy,
      );
      const updatedClass =
        await this.classesRepository.findClassWithRelationsOrThrow(
          classId,
          false,
        );
      if (updatedClass) {
        Object.assign(classEntity, updatedClass);
      }
    }

    await this.typeSafeEventEmitter.emitAsync(
      ClassEvents.UPDATED,
      new ClassUpdatedEvent(classEntity, actor, actor.centerId!, changedFields),
    );

    return classEntity;
  }

  /**
   * Soft delete a class.
   * Marks the class as deleted but preserves data for potential restoration.
   *
   * @param classId - The class ID to delete
   * @param actor - The user performing the action
   * @throws ResourceNotFoundException if class doesn't exist
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
   * @throws ResourceNotFoundException if class doesn't exist
   * @throws InsufficientPermissionsException if actor doesn't have access
   */
  async restoreClass(classId: string, actor: ActorUser): Promise<void> {
    // Manual validation needed: BelongsToCenter only checks active classes
    const classEntity =
      await this.classesRepository.findOneSoftDeletedById(classId);

    if (!classEntity) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.class',
        identifier: 't.resources.identifier',
        value: classId,
      });
    }
    const centerId = actor.centerId;
    if (!centerId || classEntity.centerId !== centerId) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.class',
        identifier: 't.resources.identifier',
        value: classId,
      });
    }

    // Validate actor has branch access to the class's branch
    await this.branchAccessService.validateBranchAccess({
      userProfileId: actor.userProfileId,
      centerId: centerId,
      branchId: classEntity.branchId,
    });

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
   * @throws ResourceNotFoundException if class doesn't exist
   */
  async getAvailableStatuses(
    classId: string,
    actor: ActorUser,
  ): Promise<ClassStatus[]> {
    const classEntity = await this.getClass(classId, actor);

    return getAvailableStatuses(classEntity.status);
  }

  /**
   * Change the status of a class.
   * Validates the transition is allowed and emits a status changed event.
   *
   * @param classId - The class ID
   * @param changeStatusDto - DTO containing new status and optional reason
   * @param actor - The user performing the action
   * @returns Updated class entity
   * @throws ResourceNotFoundException if class doesn't exist
   * @throws BusinessLogicException if transition is not allowed
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

    // Validate transition is allowed
    if (!isValidTransition(oldStatus, newStatus)) {
      throw new BusinessLogicException(
        't.messages.invalidStatusTransition' as any,
        {
          resource: 't.resources.class',
          from: oldStatus,
          to: newStatus,
        } as any,
      );
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
        throw new BusinessLogicException(
          't.messages.gracePeriodExpired' as any,
          {
            resource: 't.resources.class',
            hours: 24,
          } as any,
        );
      }
    }

    // Update status
    await this.classesRepository.update(classId, { status: newStatus });
    classEntity.status = newStatus;

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

    return classEntity;
  }

  /**
   * Deletes multiple classes in bulk.
   * This is a best-effort operation: individual errors are caught and aggregated.
   * The operation is not fully atomic - some classes may succeed while others fail.
   *
   * @param classIds - Array of class IDs to delete
   * @param actor - The user performing the action
   * @returns BulkOperationResult with success/failure details for each class
   * @throws BusinessLogicException if classIds array is empty
   */
  @Transactional()
  async bulkDeleteClasses(
    classIds: string[],
    actor: ActorUser,
  ): Promise<BulkOperationResult> {
    if (!classIds || classIds.length === 0) {
      throw new BusinessLogicException('t.messages.validationFailed');
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
   * @throws BusinessLogicException if classIds array is empty
   */
  @Transactional()
  async bulkRestoreClasses(
    classIds: string[],
    actor: ActorUser,
  ): Promise<BulkOperationResult> {
    if (!classIds || classIds.length === 0) {
      throw new BusinessLogicException('t.messages.validationFailed');
    }

    return await this.bulkOperationService.executeBulk(
      classIds,
      async (classId: string) => {
        await this.restoreClass(classId, actor);
        return { id: classId };
      },
    );
  }
}
