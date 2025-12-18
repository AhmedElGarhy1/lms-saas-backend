import { Injectable } from '@nestjs/common';
import { StudentPaymentStrategyDto } from '../dto/student-payment-strategy.dto';
import { TeacherPaymentStrategyDto } from '../dto/teacher-payment-strategy.dto';
import { StudentPaymentStrategyRepository } from '../repositories/student-payment-strategy.repository';
import { TeacherPaymentStrategyRepository } from '../repositories/teacher-payment-strategy.repository';
import { BusinessLogicException } from '@/shared/common/exceptions/custom.exceptions';
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
      count: studentStrategy.count,
      amount: studentStrategy.amount,
    });

    await this.teacherPaymentStrategyRepository.create({
      classId,
      per: teacherStrategy.per,
      amount: teacherStrategy.amount,
    });
  }

  /**
   * Update payment strategies for a class.
   * Updates existing strategies or creates new ones if they don't exist.
   *
   * @param classId - The class ID
   * @param studentStrategy - Optional student payment strategy to update
   * @param teacherStrategy - Optional teacher payment strategy to update
   * @throws BusinessLogicException if payment strategy validation fails
   */
  async updateStrategiesForClass(
    classId: string,
    studentStrategy?: StudentPaymentStrategyDto,
    teacherStrategy?: TeacherPaymentStrategyDto,
  ): Promise<void> {
    if (studentStrategy && teacherStrategy) {
      this.validatePaymentStrategies(studentStrategy, teacherStrategy);
    }

    if (studentStrategy) {
      await this.updateStudentStrategy(classId, studentStrategy);
    }

    if (teacherStrategy) {
      await this.updateTeacherStrategy(classId, teacherStrategy);
    }
  }

  private async updateStudentStrategy(
    classId: string,
    strategy: StudentPaymentStrategyDto,
  ): Promise<void> {
    const existingStrategy =
      await this.studentPaymentStrategyRepository.findByClassId(classId);

    if (existingStrategy) {
      await this.studentPaymentStrategyRepository.update(existingStrategy.id, {
        per: strategy.per,
        count: strategy.count,
        amount: strategy.amount,
      });
    } else {
      await this.studentPaymentStrategyRepository.create({
        classId,
        per: strategy.per,
        count: strategy.count,
        amount: strategy.amount,
      });
    }
  }

  private async updateTeacherStrategy(
    classId: string,
    strategy: TeacherPaymentStrategyDto,
  ): Promise<void> {
    const existingStrategy =
      await this.teacherPaymentStrategyRepository.findByClassId(classId);

    if (existingStrategy) {
      await this.teacherPaymentStrategyRepository.update(existingStrategy.id, {
        per: strategy.per,
        amount: strategy.amount,
      });
    } else {
      await this.teacherPaymentStrategyRepository.create({
        classId,
        per: strategy.per,
        amount: strategy.amount,
      });
    }
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

    // Count required for SESSION, HOUR, and MONTH payment units
    if (
      (studentPaymentStrategy.per === StudentPaymentUnit.SESSION ||
        studentPaymentStrategy.per === StudentPaymentUnit.HOUR ||
        studentPaymentStrategy.per === StudentPaymentUnit.MONTH) &&
      (!studentPaymentStrategy.count || studentPaymentStrategy.count < 1)
    ) {
      throw new BusinessLogicException('t.messages.validationFailed');
    }
  }
}
