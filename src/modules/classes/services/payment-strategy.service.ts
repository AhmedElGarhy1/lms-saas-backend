import { Injectable } from '@nestjs/common';
import { StudentPaymentStrategyDto } from '../dto/student-payment-strategy.dto';
import { TeacherPaymentStrategyDto } from '../dto/teacher-payment-strategy.dto';
import { StudentPaymentStrategyRepository } from '../repositories/student-payment-strategy.repository';
import { TeacherPaymentStrategyRepository } from '../repositories/teacher-payment-strategy.repository';
import { BusinessLogicException } from '@/shared/common/exceptions/custom.exceptions';
import { ResourceNotFoundException } from '@/shared/common/exceptions/custom.exceptions';
import { BaseService } from '@/shared/common/services/base.service';
import { TeacherPaymentUnit } from '../enums/teacher-payment-unit.enum';
import { StudentPaymentUnit } from '../enums/student-payment-unit.enum';

@Injectable()
export class PaymentStrategyService extends BaseService {
  constructor(
    private readonly studentPaymentStrategyRepository: StudentPaymentStrategyRepository,
    private readonly teacherPaymentStrategyRepository: TeacherPaymentStrategyRepository,
  ) {
    super();
  }

  /**
   * Create payment strategies for a class.
   * Creates both student and teacher payment strategies with validation.
   *
   * @param classId - The class ID
   * @param studentStrategy - Student payment strategy configuration
   * @param teacherStrategy - Teacher payment strategy configuration
   * @throws BusinessLogicException if payment strategy validation fails
   */
  async createStrategiesForClass(
    classId: string,
    studentStrategy: StudentPaymentStrategyDto,
    teacherStrategy: TeacherPaymentStrategyDto,
  ): Promise<void> {
    this.validatePaymentStrategies(studentStrategy, teacherStrategy);

    await this.studentPaymentStrategyRepository.create({
      classId,
      per: studentStrategy.per,
      amount: studentStrategy.amount,
    });

    await this.teacherPaymentStrategyRepository.create({
      classId,
      per: teacherStrategy.per,
      amount: teacherStrategy.amount,
    });
  }

  validatePaymentStrategies(
    studentPaymentStrategy: StudentPaymentStrategyDto,
    teacherPaymentStrategy: TeacherPaymentStrategyDto,
  ): void {
    if (
      !Object.values(TeacherPaymentUnit).includes(teacherPaymentStrategy.per)
    ) {
      throw new BusinessLogicException('t.messages.validationFailed');
    }

    if (
      typeof teacherPaymentStrategy.amount !== 'number' ||
      teacherPaymentStrategy.amount < 0
    ) {
      throw new BusinessLogicException('t.messages.validationFailed');
    }

    if (
      !Object.values(StudentPaymentUnit).includes(studentPaymentStrategy.per)
    ) {
      throw new BusinessLogicException('t.messages.validationFailed');
    }

    if (
      typeof studentPaymentStrategy.amount !== 'number' ||
      studentPaymentStrategy.amount < 0
    ) {
      throw new BusinessLogicException('t.messages.validationFailed');
    }
  }

  /**
   * Update student payment strategy for a class.
   * Only updates existing strategy (throws error if missing).
   * Used by the dedicated student payment endpoint.
   *
   * @param classId - The class ID
   * @param strategy - Student payment strategy data
   * @throws ResourceNotFoundException if payment strategy doesn't exist
   * @throws BusinessLogicException if validation fails
   */
  async updateStudentStrategy(
    classId: string,
    strategy: StudentPaymentStrategyDto,
  ): Promise<void> {
    const existingStrategy =
      await this.studentPaymentStrategyRepository.findByClassId(classId);

    if (!existingStrategy) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.studentPaymentStrategy',
        identifier: 't.resources.identifier',
        value: classId,
      });
    }

    // Validate student payment strategy
    if (!Object.values(StudentPaymentUnit).includes(strategy.per)) {
      throw new BusinessLogicException('t.messages.validationFailed');
    }

    if (typeof strategy.amount !== 'number' || strategy.amount < 0) {
      throw new BusinessLogicException('t.messages.validationFailed');
    }

    await this.studentPaymentStrategyRepository.update(existingStrategy.id, {
      per: strategy.per,
      amount: strategy.amount,
    });
  }

  /**
   * Update teacher payment strategy for a class.
   * Only updates existing strategy (throws error if missing).
   * Used by the dedicated teacher payment endpoint.
   *
   * @param classId - The class ID
   * @param strategy - Teacher payment strategy data
   * @throws ResourceNotFoundException if payment strategy doesn't exist
   * @throws BusinessLogicException if validation fails
   */
  async updateTeacherStrategy(
    classId: string,
    strategy: TeacherPaymentStrategyDto,
  ): Promise<void> {
    const existingStrategy =
      await this.teacherPaymentStrategyRepository.findByClassId(classId);

    if (!existingStrategy) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.teacherPaymentStrategy',
        identifier: 't.resources.identifier',
        value: classId,
      });
    }

    // Validate teacher payment strategy
    if (!Object.values(TeacherPaymentUnit).includes(strategy.per)) {
      throw new BusinessLogicException('t.messages.validationFailed');
    }

    if (typeof strategy.amount !== 'number' || strategy.amount < 0) {
      throw new BusinessLogicException('t.messages.validationFailed');
    }

    await this.teacherPaymentStrategyRepository.update(existingStrategy.id, {
      per: strategy.per,
      amount: strategy.amount,
    });
  }
}
