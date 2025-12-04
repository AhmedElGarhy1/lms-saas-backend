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

  async createStrategiesForClass(
    classId: string,
    studentStrategy: StudentPaymentStrategyDto,
    teacherStrategy: TeacherPaymentStrategyDto,
  ): Promise<void> {
    // Validate payment strategies
    this.validatePaymentStrategies(studentStrategy, teacherStrategy);

    // Create student payment strategy
    await this.studentPaymentStrategyRepository.create({
      classId,
      per: studentStrategy.per,
      count: studentStrategy.count,
      amount: studentStrategy.amount,
    });

    // Create teacher payment strategy
    await this.teacherPaymentStrategyRepository.create({
      classId,
      per: teacherStrategy.per,
      amount: teacherStrategy.amount,
    });
  }

  async updateStrategiesForClass(
    classId: string,
    studentStrategy?: StudentPaymentStrategyDto,
    teacherStrategy?: TeacherPaymentStrategyDto,
  ): Promise<void> {
    // Validate payment strategies if both are provided (for consistency check)
    // Note: Individual validation happens when creating/updating each strategy
    if (studentStrategy && teacherStrategy) {
      this.validatePaymentStrategies(studentStrategy, teacherStrategy);
    }

    // Update student payment strategy if provided
    if (studentStrategy) {
      await this.updateStudentStrategy(classId, studentStrategy);
    }

    // Update teacher payment strategy if provided
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
    // Validate teacher payment strategy
    if (
      !Object.values(TeacherPaymentUnit).includes(teacherPaymentStrategy.per)
    ) {
      throw new BusinessLogicException('t.errors.validationFailed', {
        reason: 'Invalid teacher payment unit',
      });
    }

    if (
      typeof teacherPaymentStrategy.amount !== 'number' ||
      teacherPaymentStrategy.amount < 0
    ) {
      throw new BusinessLogicException('t.errors.validationFailed', {
        reason: 'Teacher payment amount must be a non-negative number',
      });
    }

    // Validate student payment strategy
    if (
      !Object.values(StudentPaymentUnit).includes(studentPaymentStrategy.per)
    ) {
      throw new BusinessLogicException('t.errors.validationFailed', {
        reason: 'Invalid student payment unit',
      });
    }

    if (
      typeof studentPaymentStrategy.amount !== 'number' ||
      studentPaymentStrategy.amount < 0
    ) {
      throw new BusinessLogicException('t.errors.validationFailed', {
        reason: 'Student payment amount must be a non-negative number',
      });
    }

    // Validate count for SESSION, HOUR, and MONTH
    if (
      (studentPaymentStrategy.per === StudentPaymentUnit.SESSION ||
        studentPaymentStrategy.per === StudentPaymentUnit.HOUR ||
        studentPaymentStrategy.per === StudentPaymentUnit.MONTH) &&
      (!studentPaymentStrategy.count || studentPaymentStrategy.count < 1)
    ) {
      throw new BusinessLogicException('t.errors.validationFailed', {
        reason: 'Count is required for SESSION, HOUR, and MONTH payment units',
      });
    }
  }
}
