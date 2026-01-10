import { Injectable } from '@nestjs/common';
import {
  StudentCharge,
  StudentChargeType,
  StudentChargeStatus,
} from '../entities/student-charge.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { ActorUser } from '@/shared/common/types/actor-user.type';

@Injectable()
export class StudentChargesRepository extends BaseRepository<StudentCharge> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): new () => StudentCharge {
    return StudentCharge;
  }

  // Session-specific queries
  async findSessionChargeByStudentAndSession(
    studentUserProfileId: string,
    sessionId: string,
  ): Promise<StudentCharge | null> {
    return this.getRepository().findOne({
      where: {
        studentUserProfileId,
        sessionId,
        chargeType: StudentChargeType.SESSION,
        status: StudentChargeStatus.COMPLETED,
      },
    });
  }

  // Monthly subscription queries
  async findActiveMonthlySubscription(
    studentUserProfileId: string,
    classId: string,
    month: number,
    year: number,
  ): Promise<StudentCharge | null> {
    return this.getRepository().findOne({
      where: {
        studentUserProfileId,
        classId,
        chargeType: StudentChargeType.SUBSCRIPTION,
        month,
        year,
        status: StudentChargeStatus.COMPLETED,
      },
    });
  }

  // Find active class charge (for progress tracking) - includes INSTALLMENT status
  async findActiveClassChargeByStudentAndClass(
    studentUserProfileId: string,
    classId: string,
  ): Promise<StudentCharge | null> {
    return this.getRepository()
      .createQueryBuilder('charge')
      .where('charge.studentUserProfileId = :studentId', {
        studentId: studentUserProfileId,
      })
      .andWhere('charge.classId = :classId', { classId })
      .andWhere('charge.chargeType = :chargeType', {
        chargeType: StudentChargeType.CLASS,
      })
      .andWhere('charge.status IN (:...statuses)', {
        statuses: [
          StudentChargeStatus.COMPLETED,
          StudentChargeStatus.INSTALLMENT,
        ],
      })
      .getOne();
  }

  // Find all active charges for a student (for summary)
  async findActiveChargesByStudent(
    studentUserProfileId: string,
  ): Promise<StudentCharge[]> {
    return this.getRepository()
      .createQueryBuilder('charge')
      .where('charge.studentUserProfileId = :studentId', {
        studentId: studentUserProfileId,
      })
      .andWhere('charge.status IN (:...statuses)', {
        statuses: [
          StudentChargeStatus.COMPLETED,
          StudentChargeStatus.INSTALLMENT,
        ],
      })
      .getMany();
  }

  // Generic charge creation
  async createCharge(
    chargeData: Partial<StudentCharge>,
  ): Promise<StudentCharge> {
    const charge = this.getRepository().create(chargeData);
    return this.getRepository().save(charge);
  }

  async saveCharge(charge: StudentCharge): Promise<StudentCharge> {
    return this.getRepository().save(charge);
  }

  /**
   * Get paginated charges with filtering for a specific center
   */
  async getPaginatedChargesForCenter(
    centerId: string,
    paginateDto: any, // Using any to avoid circular import
    filters: any = {},
  ): Promise<any> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('charge')
      .where('charge.centerId = :centerId', { centerId });

    // Apply filters
    if (filters.studentUserProfileId) {
      queryBuilder.andWhere('charge.studentUserProfileId = :studentId', {
        studentId: filters.studentUserProfileId,
      });
    }

    if (filters.chargeType) {
      queryBuilder.andWhere('charge.chargeType = :chargeType', {
        chargeType: filters.chargeType,
      });
    }

    // Apply date filters to createdAt field
    if (filters.dateFrom) {
      queryBuilder.andWhere('charge.createdAt >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }

    if (filters.dateTo) {
      queryBuilder.andWhere('charge.createdAt <= :dateTo', {
        dateTo: filters.dateTo,
      });
    }

    return this.paginate(
      paginateDto,
      {
        searchableColumns: [],
        sortableColumns: ['createdAt', 'amount', 'chargeType'],
        defaultSortBy: ['createdAt', 'DESC'],
      },
      `billing/students/records`,
      queryBuilder,
    );
  }
}
