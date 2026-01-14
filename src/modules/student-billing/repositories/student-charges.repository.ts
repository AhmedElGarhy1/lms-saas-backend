import { Injectable } from '@nestjs/common';
import { StudentCharge } from '../entities/student-charge.entity';
import { StudentChargeType, StudentChargeStatus } from '../enums';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { PaginateStudentBillingRecordsDto } from '../dto/paginate-student-billing-records.dto';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { STUDENT_BILLING_PAGINATION_COLUMNS } from '@/shared/common/constants/pagination-columns';

@Injectable()
export class StudentChargesRepository extends BaseRepository<StudentCharge> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    private readonly accessControlHelperService: AccessControlHelperService,
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
    paginateDto: PaginateStudentBillingRecordsDto, // Using any to avoid circular import
    actor: ActorUser,
  ): Promise<any> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('charge')
      .where('charge.centerId = :centerId', { centerId: actor.centerId });

    const canBypassCenterInternalAccess =
      await this.accessControlHelperService.bypassCenterInternalAccess(
        actor.userProfileId,
        actor.centerId,
      );

    if (!canBypassCenterInternalAccess) {
      // check staff access with target class
      queryBuilder.leftJoin('charge.class', 'class');
      queryBuilder.leftJoin('class.classStaff', 'classStaff');
      queryBuilder.andWhere('classStaff.userProfileId = :userProfileId', {
        userProfileId: actor.userProfileId,
      });
    }

    // Apply filters
    if (paginateDto.studentUserProfileId) {
      queryBuilder.andWhere('charge.studentUserProfileId = :studentId', {
        studentId: paginateDto.studentUserProfileId,
      });
    }

    if (paginateDto.chargeType) {
      queryBuilder.andWhere('charge.chargeType = :chargeType', {
        chargeType: paginateDto.chargeType,
      });
    }

    // Apply date filters to createdAt field
    if (paginateDto.dateFrom) {
      queryBuilder.andWhere('charge.createdAt >= :dateFrom', {
        dateFrom: paginateDto.dateFrom,
      });
    }

    if (paginateDto.dateTo) {
      queryBuilder.andWhere('charge.createdAt <= :dateTo', {
        dateTo: paginateDto.dateTo,
      });
    }

    return this.paginate(
      paginateDto,
      STUDENT_BILLING_PAGINATION_COLUMNS,
      `billing/students/records`,
      queryBuilder,
    );
  }
}
