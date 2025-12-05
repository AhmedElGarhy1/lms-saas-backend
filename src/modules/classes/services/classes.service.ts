import { Injectable } from '@nestjs/common';
import { CreateClassDto } from '../dto/create-class.dto';
import { UpdateClassDto } from '../dto/update-class.dto';
import { PaginateClassesDto } from '../dto/paginate-classes.dto';
import { ClassesRepository } from '../repositories/classes.repository';
import { ClassValidationService } from './class-validation.service';
import { PaymentStrategyService } from './payment-strategy.service';
import { Pagination } from 'nestjs-typeorm-paginate';
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

@Injectable()
export class ClassesService extends BaseService {
  constructor(
    private readonly classesRepository: ClassesRepository,
    private readonly classValidationService: ClassValidationService,
    private readonly paymentStrategyService: PaymentStrategyService,
    private readonly typeSafeEventEmitter: TypeSafeEventEmitter,
  ) {
    super();
  }

  async paginateClasses(
    paginateDto: PaginateClassesDto,
    actor: ActorUser,
  ): Promise<Pagination<Class>> {
    return this.classesRepository.paginateClasses(paginateDto, actor.centerId!);
  }

  async getClass(classId: string, actor: ActorUser): Promise<Class> {
    const classEntity =
      await this.classesRepository.findClassWithRelations(classId);
    this.validateResourceAccess(
      classEntity,
      classId,
      actor,
      't.common.resources.class',
    );
    return classEntity;
  }

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
    const classEntity = await this.createClassEntity(
      classData,
      actor.centerId!,
    );

    // Create payment strategies
    await this.paymentStrategyService.createStrategiesForClass(
      classEntity.id,
      studentPaymentStrategy,
      teacherPaymentStrategy,
    );

    // Load class with relations and emit event
    return this.loadClassWithRelationsAndEmit(
      classEntity.id,
      ClassEvents.CREATED,
      (classWithRelations) =>
        new ClassCreatedEvent(classWithRelations, actor, actor.centerId!),
    );
  }

  private async createClassEntity(
    classData: Omit<
      CreateClassDto,
      'studentPaymentStrategy' | 'teacherPaymentStrategy'
    >,
    centerId: string,
  ): Promise<Class> {
    return this.classesRepository.create({
      ...classData,
      centerId,
    });
  }

  private async loadClassWithRelationsAndEmit(
    classId: string,
    event: ClassEvents.CREATED | ClassEvents.UPDATED,
    eventFactory: (classEntity: Class) => ClassCreatedEvent | ClassUpdatedEvent,
  ): Promise<Class> {
    const classWithRelations =
      await this.classesRepository.findClassWithRelations(classId);

    if (!classWithRelations) {
      throw new ResourceNotFoundException('t.errors.notFound.withId', {
        resource: 't.common.resources.class',
        identifier: 'ID',
        value: classId,
      });
    }

    const eventInstance = eventFactory(classWithRelations);

    // Type-safe event emission - TypeScript can't infer the exact mapping,
    // but we know the eventFactory returns the correct type for the event
    if (event === ClassEvents.CREATED) {
      await this.typeSafeEventEmitter.emitAsync(
        ClassEvents.CREATED,
        eventInstance as ClassCreatedEvent,
      );
    } else {
      await this.typeSafeEventEmitter.emitAsync(
        ClassEvents.UPDATED,
        eventInstance as ClassUpdatedEvent,
      );
    }

    return classWithRelations;
  }

  async updateClass(
    classId: string,
    data: UpdateClassDto,
    actor: ActorUser,
  ): Promise<Class> {
    const classEntity = await this.getClass(classId, actor);

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

    // Update class entity
    await this.updateClassEntity(classId, classUpdateData);

    // Update payment strategies if provided
    await this.paymentStrategyService.updateStrategiesForClass(
      classId,
      studentPaymentStrategy,
      teacherPaymentStrategy,
    );

    // Load updated class with relations and emit event
    return this.loadClassWithRelationsAndEmit(
      classId,
      ClassEvents.UPDATED,
      (classWithRelations) =>
        new ClassUpdatedEvent(classWithRelations, actor, actor.centerId!),
    );
  }

  private async updateClassEntity(
    classId: string,
    classUpdateData: Omit<
      UpdateClassDto,
      'studentPaymentStrategy' | 'teacherPaymentStrategy'
    >,
  ): Promise<void> {
    const updatedClass = await this.classesRepository.update(
      classId,
      classUpdateData,
    );

    if (!updatedClass) {
      throw new ResourceNotFoundException('t.errors.notFound.withId', {
        resource: 't.common.resources.class',
        identifier: 'ID',
        value: classId,
      });
    }
  }

  async deleteClass(classId: string, actor: ActorUser): Promise<void> {
    await this.getClass(classId, actor);
    await this.classesRepository.softRemove(classId);

    await this.typeSafeEventEmitter.emitAsync(
      ClassEvents.DELETED,
      new ClassDeletedEvent(classId, actor, actor.centerId!),
    );
  }

  async restoreClass(classId: string, actor: ActorUser): Promise<void> {
    const classEntity =
      await this.classesRepository.findOneSoftDeletedById(classId);
    this.validateResourceAccess(
      classEntity,
      classId,
      actor,
      't.common.resources.class',
    );

    await this.classesRepository.restore(classId);

    const restoredClass = await this.classesRepository.findOne(classId);
    if (!restoredClass) {
      throw new ResourceNotFoundException('t.errors.notFound.withId', {
        resource: 't.common.resources.class',
        identifier: 'ID',
        value: classId,
      });
    }

    await this.typeSafeEventEmitter.emitAsync(
      ClassEvents.RESTORED,
      new ClassRestoredEvent(restoredClass, actor, actor.centerId!),
    );
  }
}
