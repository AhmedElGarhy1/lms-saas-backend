import { Injectable, Logger } from '@nestjs/common';
import { StudentPackageRepository } from '../repositories/student-package.repository';
import {
  StudentPackage,
  StudentPackageStatus,
} from '../entities/student-package.entity';
import { PurchaseStudentPackageDto } from '../dto/purchase-student-package.dto';
import { PackageSummaryDto } from '../dto/package-summary.dto';
import { BaseService } from '@/shared/common/services/base.service';
import {
  BusinessLogicException,
  InsufficientPermissionsException,
} from '@/shared/common/exceptions/custom.exceptions';
import { ClassPackageService } from './class-package.service';
import { ClassesService } from '@/modules/classes/services/classes.service';
import { PaymentService } from '@/modules/finance/services/payment.service';
import { WalletService } from '@/modules/finance/services/wallet.service';
import { Money } from '@/shared/common/utils/money.util';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { Transactional } from '@nestjs-cls/transactional';
import { PaymentReason } from '@/modules/finance/enums/payment-reason.enum';
import { PaymentSource } from '@/modules/finance/enums/payment-source.enum';
import { WalletOwnerType } from '@/modules/finance/enums/wallet-owner-type.enum';

@Injectable()
export class StudentPackageService extends BaseService {
  private readonly logger = new Logger(StudentPackageService.name);

  constructor(
    private readonly studentPackageRepository: StudentPackageRepository,
    private readonly classPackageService: ClassPackageService,
    private readonly classesService: ClassesService,
    private readonly paymentService: PaymentService,
  ) {
    super();
  }

  /**
   * Purchase a package for a student
   */
  @Transactional()
  async purchasePackage(
    dto: PurchaseStudentPackageDto,
    actor: ActorUser,
  ): Promise<StudentPackage> {
    const packageEntity = await this.classPackageService.getPackage(
      dto.packageId,
    );

    // Validate class access
    await this.classesService.getClass(packageEntity.classId, actor);

    const studentProfileId = dto.studentProfileId || actor.userProfileId;

    // For admin purchasing for others, check permissions
    if (dto.studentProfileId && dto.studentProfileId !== actor.userProfileId) {
      // TODO: Add admin permission check
    }

    // Create payment record
    const payment = await this.paymentService.createPayment(
      packageEntity.price,
      studentProfileId,
      actor.centerId!, // Center receives payment
      WalletOwnerType.CENTER, // receiver type
      PaymentReason.PACKAGE_PURCHASE,
      PaymentSource.WALLET,
      undefined, // referenceType
      undefined, // referenceId
      undefined, // correlationId
      dto.idempotencyKey,
    );

    // Complete the payment immediately (assuming sufficient funds)
    await this.paymentService.completePayment(payment.id);

    // Create student package
    const studentPackage = await this.studentPackageRepository.create({
      studentProfileId,
      packageId: dto.packageId,
      remainingSessions: packageEntity.sessionCount,
      expiresAt: dto.expiresAt,
      status: StudentPackageStatus.ACTIVE,
    });

    this.logger.log(
      `Student ${studentProfileId} purchased package ${dto.packageId} (${packageEntity.sessionCount} sessions)`,
    );

    return studentPackage;
  }

  /**
   * Get package summary for a student (aggregated by group)
   */
  async getStudentPackageSummary(
    studentProfileId: string,
  ): Promise<PackageSummaryDto[]> {
    const rawSummary =
      await this.studentPackageRepository.getStudentPackageSummary(
        studentProfileId,
      );

    return rawSummary.map((row) => ({
      classId: row.classId,
      className: row.className,
      subjectName: row.subjectName,
      branchName: row.branchName,
      centerName: row.centerName,
      totalAvailable: parseInt(row.totalAvailable) || 0,
    }));
  }

  /**
   * Consume package credits using FIFO logic
   */
  @Transactional()
  async consumePackageCredits(
    studentProfileId: string,
    classId: string,
    sessionsToConsume: number = 1,
  ): Promise<StudentPackage[]> {
    const consumedPackages: StudentPackage[] = [];
    let remainingToConsume = sessionsToConsume;

    // Find all active packages for this student and class, ordered by creation date (FIFO)
    const availablePackages =
      await this.studentPackageRepository.findActiveByStudentAndClass(
        studentProfileId,
        classId,
      );

    for (const packageEntity of availablePackages) {
      if (remainingToConsume <= 0) break;

      const availableSessions = packageEntity.remainingSessions;
      if (availableSessions <= 0) continue;

      const sessionsToConsumeFromPackage = Math.min(
        remainingToConsume,
        availableSessions,
      );

      // Update package (directly consume credits)
      await this.studentPackageRepository.updatePackageSessions(
        packageEntity.id,
        packageEntity.remainingSessions - sessionsToConsumeFromPackage,
      );

      remainingToConsume -= sessionsToConsumeFromPackage;
      consumedPackages.push(packageEntity);

      this.logger.log(
        `Consumed ${sessionsToConsumeFromPackage} sessions from package ${packageEntity.id} (${availableSessions - sessionsToConsumeFromPackage} remaining)`,
      );
    }

    if (remainingToConsume > 0) {
      throw new BusinessLogicException('t.messages.businessLogicError');
    }

    return consumedPackages;
  }

  /**
   * Restore consumed credits (admin refund for no-show with valid excuse)
   */
  @Transactional()
  async restorePackageCredits(
    studentPackageId: string,
    sessionsToRestore: number,
  ): Promise<StudentPackage> {
    const packageEntity =
      await this.studentPackageRepository.findOneOrThrow(studentPackageId);

    return this.studentPackageRepository.updatePackageSessions(
      packageEntity.id,
      packageEntity.remainingSessions + sessionsToRestore,
    );
  }

  /**
   * Check if student has sufficient credits for a class
   */
  async hasSufficientCredits(
    studentProfileId: string,
    classId: string,
    requiredSessions: number = 1,
  ): Promise<boolean> {
    const summary = await this.getStudentPackageSummary(studentProfileId);
    const classSummary = summary.find((s) => s.classId === classId);

    return classSummary
      ? classSummary.totalAvailable >= requiredSessions
      : false;
  }

  /**
   * Get active packages for a student
   */
  async getStudentActivePackages(
    studentProfileId: string,
  ): Promise<StudentPackage[]> {
    return this.studentPackageRepository.findActiveByStudentId(
      studentProfileId,
    );
  }

  /**
   * Expire packages that have passed their expiration date
   */
  @Transactional()
  async expirePackages(): Promise<number> {
    // TODO: Implement package expiration logic
    // This would be called by a cron job
    this.logger.log('Package expiration not yet implemented');
    return 0;
  }
}
