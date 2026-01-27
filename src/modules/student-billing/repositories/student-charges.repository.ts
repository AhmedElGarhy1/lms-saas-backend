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
import { StudentBillingErrors } from '../exceptions/student-billing.errors';

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
   * Find charge by idempotency key and student profile ID
   * Used to prevent duplicate charge creation on retries
   */
  async findByIdempotencyKey(
    idempotencyKey: string,
    studentUserProfileId: string,
  ): Promise<StudentCharge | null> {
    return this.getRepository().findOne({
      where: {
        idempotencyKey,
        studentUserProfileId,
      },
    });
  }

  async findByIdWithPayments(id: string): Promise<StudentCharge | null> {
    return this.getRepository().findOne({
      where: { id },
      relations: ['payments'],
    });
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
      // Join relations for name fields only (not full entities)
      .leftJoin('charge.student', 'student')
      .leftJoin('student.user', 'studentUser')
      .leftJoin('charge.class', 'class')
      .leftJoin('charge.branch', 'branch')
      .leftJoin('charge.center', 'center')
      // Add name and code fields as selections
      .addSelect([
        'student.id',
        'student.code',
        'studentUser.id',
        'studentUser.name',
        'class.id',
        'class.name',
        'branch.id',
        'branch.city',
        'center.id',
        'center.name',
      ])
      .where('charge.centerId = :centerId', { centerId: actor.centerId })
      // Filter out charges where related entities are deleted (check if entity exists)
      .andWhere('student.id IS NOT NULL')
      .andWhere('class.id IS NOT NULL')
      .andWhere('branch.id IS NOT NULL')
      .andWhere('center.id IS NOT NULL');

    const canBypassCenterInternalAccess =
      await this.accessControlHelperService.bypassCenterInternalAccess(
        actor.userProfileId,
        actor.centerId,
      );

    if (!canBypassCenterInternalAccess) {
      // check staff access with target class
      queryBuilder
        .leftJoin('class.classStaff', 'classStaff')
        .andWhere('classStaff.userProfileId = :userProfileId', {
          userProfileId: actor.userProfileId,
        })
        .leftJoin('branch.branchAccess', 'branchAccess')
        .andWhere('branchAccess.userProfileId = :userProfileId', {
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

    if (paginateDto.status) {
      queryBuilder.andWhere('charge.status = :status', {
        status: paginateDto.status,
      });
    }

    if (paginateDto.classId) {
      queryBuilder.andWhere('charge.classId = :classId', {
        classId: paginateDto.classId,
      });
    }

    if (paginateDto.branchId) {
      queryBuilder.andWhere('charge.branchId = :branchId', {
        branchId: paginateDto.branchId,
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

  /**
   * Find a student charge by ID optimized for API responses.
   * Selects only necessary fields (id, name, code, etc.) from relations for serialization.
   * Use this method when returning data to API clients to minimize response size.
   *
   * @param chargeId - Student charge ID
   * @param includeDeleted - Reserved for future use (StudentCharge doesn't have soft delete)
   * @returns StudentCharge with selective relation fields, or null if not found
   */
  async findStudentChargeForResponse(
    chargeId: string,
    includeDeleted: boolean = false,
  ): Promise<StudentCharge | null> {
    return (
      this.getRepository()
        .createQueryBuilder('charge')
        // Join relations for name/code fields only (not full entities)
        .leftJoin('charge.student', 'student')
        .leftJoin('student.user', 'studentUser')
        .leftJoin('charge.class', 'class')
        .leftJoin('charge.session', 'session')
        .leftJoin('charge.branch', 'branch')
        .leftJoin('charge.center', 'center')
        .leftJoinAndSelect('charge.payments', 'payments') // Include full payments for detailed view
        // Audit relations
        .leftJoin('charge.creator', 'creator')
        .leftJoin('creator.user', 'creatorUser')
        .leftJoin('charge.updater', 'updater')
        .leftJoin('updater.user', 'updaterUser')
        // Add name and id fields as selections
        .addSelect([
          'student.id',
          'student.code',
          'studentUser.id',
          'studentUser.name',
          'class.id',
          'class.name',
          'session.id',
          'branch.id',
          'branch.city',
          'center.id',
          'center.name',
          // Audit fields
          'creator.id',
          'creatorUser.id',
          'creatorUser.name',
          'updater.id',
          'updaterUser.id',
          'updaterUser.name',
        ])
        .where('charge.id = :chargeId', { chargeId })
        .getOne()
    );
  }

  /**
   * Find a student charge by ID optimized for API responses, throws if not found.
   * Selects only necessary fields (id, name, code, etc.) from relations for serialization.
   * Use this method when returning data to API clients to minimize response size.
   *
   * @param chargeId - Student charge ID
   * @param includeDeleted - Reserved for future use (StudentCharge doesn't have soft delete)
   * @returns StudentCharge with selective relation fields
   * @throws Error if student charge not found
   */
  async findStudentChargeForResponseOrThrow(
    chargeId: string,
    includeDeleted: boolean = false,
  ): Promise<StudentCharge> {
    const charge = await this.findStudentChargeForResponse(
      chargeId,
      includeDeleted,
    );
    if (!charge) {
      throw StudentBillingErrors.billingRecordNotFound();
    }
    return charge;
  }

  /**
   * Find a student charge by ID with full relations loaded for internal use.
   * Loads complete entity objects with all properties accessible (e.g., isActive, etc.).
   * Use this method for business logic that needs to access any property of related entities.
   *
   * @param chargeId - Student charge ID
   * @param includeDeleted - Reserved for future use (StudentCharge doesn't have soft delete)
   * @returns StudentCharge with full relations loaded, or null if not found
   */
  async findStudentChargeWithFullRelations(
    chargeId: string,
    includeDeleted: boolean = false,
  ): Promise<StudentCharge | null> {
    return (
      this.getRepository()
        .createQueryBuilder('charge')
        // Load FULL entities using leftJoinAndSelect for all relations
        .leftJoinAndSelect('charge.student', 'student')
        .leftJoinAndSelect('student.user', 'studentUser')
        .leftJoinAndSelect('charge.class', 'class')
        .leftJoinAndSelect('charge.session', 'session')
        .leftJoinAndSelect('charge.branch', 'branch')
        .leftJoinAndSelect('charge.center', 'center')
        .leftJoinAndSelect('charge.payments', 'payments')
        // Load full audit relations
        .leftJoinAndSelect('charge.creator', 'creator')
        .leftJoinAndSelect('creator.user', 'creatorUser')
        .leftJoinAndSelect('charge.updater', 'updater')
        .leftJoinAndSelect('updater.user', 'updaterUser')
        .where('charge.id = :chargeId', { chargeId })
        .getOne()
    );
  }

  /**
   * Find a student charge by ID with full relations loaded for internal use, throws if not found.
   * Loads complete entity objects with all properties accessible (e.g., isActive, etc.).
   * Use this method for business logic that needs to access any property of related entities.
   *
   * @param chargeId - Student charge ID
   * @param includeDeleted - Reserved for future use (StudentCharge doesn't have soft delete)
   * @returns StudentCharge with full relations loaded
   * @throws Error if student charge not found
   */
  async findStudentChargeWithFullRelationsOrThrow(
    chargeId: string,
    includeDeleted: boolean = false,
  ): Promise<StudentCharge> {
    const charge = await this.findStudentChargeWithFullRelations(
      chargeId,
      includeDeleted,
    );
    if (!charge) {
      throw StudentBillingErrors.billingRecordNotFound();
    }
    return charge;
  }
}
