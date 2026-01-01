import { Injectable } from '@nestjs/common';
import { StudentPaymentStrategyDto } from '../dto/student-payment-strategy.dto';
import { TeacherPaymentStrategyDto } from '../dto/teacher-payment-strategy.dto';
import { StudentPaymentStrategyRepository } from '../repositories/student-payment-strategy.repository';
import { TeacherPaymentStrategyRepository } from '../repositories/teacher-payment-strategy.repository';
import { ResourceNotFoundException } from '@/shared/common/exceptions/custom.exceptions';
import { BaseService } from '@/shared/common/services/base.service';

@Injectable()
export class PaymentStrategyService extends BaseService {
  constructor(
    private readonly studentPaymentStrategyRepository: StudentPaymentStrategyRepository,
    private readonly teacherPaymentStrategyRepository: TeacherPaymentStrategyRepository,
  ) {
    super();
  }

  /**
   * Get student payment strategy for a class.
   * Returns the pricing configuration for students in this class.
   *
   * @param classId - The class ID
   * @returns Student payment strategy or null if not found
   */
  async getStudentPaymentStrategyForClass(classId: string) {
    return this.studentPaymentStrategyRepository.findByClassId(classId);
  }

  /**
   * Create payment strategies for a class.
   * Creates both student and teacher payment strategies.
   * Validation is handled automatically by NestJS validation pipe via DTO decorators.
   *
   * @param classId - The class ID
   * @param centerId - Center ID (from actor, snapshot value)
   * @param branchId - Branch ID (from validated DTO, snapshot value)
   * @param studentStrategy - Student payment strategy configuration
   * @param teacherStrategy - Teacher payment strategy configuration
   */
  async createStrategiesForClass(
    classId: string,
    centerId: string,
    branchId: string,
    studentStrategy: StudentPaymentStrategyDto,
    teacherStrategy: TeacherPaymentStrategyDto,
  ): Promise<void> {
    await this.studentPaymentStrategyRepository.create({
      classId,
      centerId,
      branchId,
      includePackage: studentStrategy.includePackage,
      includeSession: studentStrategy.includeSession,
      sessionPrice: studentStrategy.sessionPrice,
      includeMonth: studentStrategy.includeMonth,
      monthPrice: studentStrategy.monthPrice,
    });

    await this.teacherPaymentStrategyRepository.create({
      classId,
      centerId,
      branchId,
      per: teacherStrategy.per,
      amount: teacherStrategy.amount,
    });
  }

  /**
   * Update student payment strategy for a class.
   * Only updates existing strategy (throws error if missing).
   * Used by the dedicated student payment endpoint.
   * Validation is handled automatically by NestJS validation pipe via DTO decorators.
   *
   * @param classId - The class ID
   * @param strategy - Student payment strategy data
   * @throws ResourceNotFoundException if payment strategy doesn't exist
   */
  async updateStudentStrategy(
    classId: string,
    strategy: StudentPaymentStrategyDto,
  ): Promise<void> {
    const existingStrategy =
      await this.studentPaymentStrategyRepository.findByClassId(classId);

    if (!existingStrategy) {
      throw new ResourceNotFoundException("Operation failed");
    }

    await this.studentPaymentStrategyRepository.update(existingStrategy.id, {
      includePackage: strategy.includePackage,
      includeSession: strategy.includeSession,
      sessionPrice: strategy.sessionPrice,
      includeMonth: strategy.includeMonth,
      monthPrice: strategy.monthPrice,
    });
  }

  /**
   * Update teacher payment strategy for a class.
   * Only updates existing strategy (throws error if missing).
   * Used by the dedicated teacher payment endpoint.
   * Validation is handled automatically by NestJS validation pipe via DTO decorators.
   *
   * @param classId - The class ID
   * @param strategy - Teacher payment strategy data
   * @throws ResourceNotFoundException if payment strategy doesn't exist
   */
  async updateTeacherStrategy(
    classId: string,
    strategy: TeacherPaymentStrategyDto,
  ): Promise<void> {
    const existingStrategy =
      await this.teacherPaymentStrategyRepository.findByClassId(classId);

    if (!existingStrategy) {
      throw new ResourceNotFoundException("Operation failed");
    }

    await this.teacherPaymentStrategyRepository.update(existingStrategy.id, {
      per: strategy.per,
      amount: strategy.amount,
    });
  }
}
