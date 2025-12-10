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
import { Class } from '../entities/class.entity';
import { TypeSafeEventEmitter } from '@/shared/services/type-safe-event-emitter.service';
import { ClassEvents } from '@/shared/events/classes.events.enum';
import {
  ClassCreatedEvent,
  ClassUpdatedEvent,
  ClassDeletedEvent,
  ClassRestoredEvent,
} from '../events/class.events';
import { ClassAccessService } from './class-access.service';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';
import { Transactional } from '@nestjs-cls/transactional';

@Injectable()
export class ClassesService extends BaseService {
  constructor(
    private readonly classesRepository: ClassesRepository,
    private readonly classValidationService: ClassValidationService,
    private readonly paymentStrategyService: PaymentStrategyService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
    private readonly classAccessService: ClassAccessService,
  ) {
    super();
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
    return this.classesRepository.paginateClasses(paginateDto, actor.centerId!);
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
    const classEntity = await this.classesRepository.findClassWithRelations(
      classId,
      includeDeleted,
    );

    if (!classEntity) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.class',
        identifier: 't.resources.identifier',
        value: classId,
      });
    }

    // For STAFF: validate class access via ClassStaff assignment
    // For non-STAFF: no validation needed (ContextGuard ensures center access)
    if (actor.profileType === ProfileType.STAFF) {
      await this.classAccessService.validateClassAccess(
        actor.userProfileId,
        classId,
      );
    }

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
    // Validate class creation
    await this.classValidationService.validateClassCreation(
      createClassDto,
      actor,
      actor.centerId!,
    );

    // Extract payment strategies from DTO
    const { studentPaymentStrategy, teacherPaymentStrategy, ...classData } =
      createClassDto;

    // Create class entity
    const classEntity = await this.classesRepository.create({
      ...classData,
      centerId: actor.centerId!,
    });

    // Create payment strategies
    await this.paymentStrategyService.createStrategiesForClass(
      classEntity.id,
      studentPaymentStrategy,
      teacherPaymentStrategy,
    );

    // Load class with relations and emit event
    const classWithRelations =
      await this.classesRepository.findClassWithRelations(classEntity.id);

    if (!classWithRelations) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.class',
        identifier: 't.resources.identifier',
        value: classEntity.id,
      });
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
    // Fetch class for validation (basic fields only, no relations needed)
    const classEntity = await this.classesRepository.findOneOrThrow(classId);

    // Validate class update
    await this.classValidationService.validateClassUpdate(
      classId,
      data,
      actor,
      actor.centerId!,
      classEntity,
    );

    // Extract payment strategies from update data
    const {
      studentPaymentStrategy,
      teacherPaymentStrategy,
      ...classUpdateData
    } = data;

    await this.classesRepository.update(classId, classUpdateData);

    // Update payment strategies if provided
    await this.paymentStrategyService.updateStrategiesForClass(
      classId,
      studentPaymentStrategy,
      teacherPaymentStrategy,
    );

    // Fetch updated class with relations for return and event
    const classWithRelations =
      await this.classesRepository.findClassWithRelations(classId);

    if (!classWithRelations) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.class',
        identifier: 't.resources.identifier',
        value: classId,
      });
    }

    await this.typeSafeEventEmitter.emitAsync(
      ClassEvents.UPDATED,
      new ClassUpdatedEvent(classWithRelations, actor, actor.centerId!),
    );

    return classWithRelations;
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
    await this.classesRepository.findOneOrThrow(classId);
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
    const classEntity =
      await this.classesRepository.findOneSoftDeletedById(classId);

    if (!classEntity) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.class',
        identifier: 't.resources.identifier',
        value: classId,
      });
    }

    // For STAFF: validate class access via ClassStaff assignment
    // For non-STAFF: no validation needed (ContextGuard ensures center access)
    if (actor.profileType === ProfileType.STAFF) {
      await this.classAccessService.validateClassAccess(
        actor.userProfileId,
        classId,
      );
    }

    await this.classesRepository.restore(classId);

    await this.typeSafeEventEmitter.emitAsync(
      ClassEvents.RESTORED,
      new ClassRestoredEvent(classEntity, actor, actor.centerId!),
    );
  }
}
