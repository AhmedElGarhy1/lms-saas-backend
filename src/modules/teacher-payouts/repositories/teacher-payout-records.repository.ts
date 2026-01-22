import { Injectable } from '@nestjs/common';
import { TeacherPayoutRecord } from '../entities/teacher-payout-record.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { PaginateTeacherPayoutsDto } from '../dto/paginate-teacher-payouts.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { PayoutStatus } from '../enums/payout-status.enum';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { PaymentMethod } from '@/modules/finance/enums/payment-method.enum';
import { TeacherPaymentUnit } from '@/modules/classes/enums/teacher-payment-unit.enum';
import { TeacherPayoutErrors } from '../exceptions/teacher-payout.errors';
import { TEACHER_PAYOUT_PAGINATION_COLUMNS } from '@/shared/common/constants/pagination-columns';
import { Money } from '@/shared/common/utils/money.util';

@Injectable()
export class TeacherPayoutRecordsRepository extends BaseRepository<TeacherPayoutRecord> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    private readonly accessControlHelperService: AccessControlHelperService,
  ) {
    super(txHost);
  }

  protected getEntityClass(): new () => TeacherPayoutRecord {
    return TeacherPayoutRecord;
  }

  async paginateTeacherPayouts(
    dto: PaginateTeacherPayoutsDto,
    actor: ActorUser,
  ): Promise<Pagination<TeacherPayoutRecord>> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('payout')
      // Join relations for name fields only (not full entities)
      .leftJoin('payout.teacher', 'teacher')
      .leftJoin('teacher.user', 'teacherUser')
      .leftJoin('payout.class', 'class')
      .leftJoin('payout.branch', 'branch')
      .leftJoin('payout.center', 'center')
      // Add name and id fields as selections
      .addSelect([
        'teacher.id',
        'teacherUser.id',
        'teacherUser.name',
        'class.id',
        'class.name',
        'branch.id',
        'branch.city',
        'center.id',
        'center.name',
      ])
      .where('payout.centerId = :centerId', { centerId: actor.centerId });

    // Access control: Filter by class staff and branch access for non-bypass users
    const canBypassCenterInternalAccess =
      await this.accessControlHelperService.bypassCenterInternalAccess(
        actor.userProfileId,
        actor.centerId,
      );

    if (!canBypassCenterInternalAccess) {
      queryBuilder
        .leftJoin('branch.branchAccess', 'branchAccess')
        .andWhere('branchAccess.userProfileId = :userProfileId', {
          userProfileId: actor.userProfileId,
        })
        .leftJoin('teacher.accessTarget', 'targetAccess')
        .andWhere('targetAccess.id = :userProfileId', {
          userProfileId: actor.userProfileId,
        });
    }

    // Apply filters
    if (dto.teacherUserProfileId) {
      queryBuilder.andWhere('payout.teacherUserProfileId = :teacherId', {
        teacherId: dto.teacherUserProfileId,
      });
    }

    if (dto.classId) {
      queryBuilder.andWhere('payout.classId = :classId', {
        classId: dto.classId,
      });
    }

    if (dto.branchId) {
      queryBuilder.andWhere('payout.branchId = :branchId', {
        branchId: dto.branchId,
      });
    }

    if (dto.status) {
      queryBuilder.andWhere('payout.status = :status', {
        status: dto.status,
      });
    }

    if (dto.unitType) {
      queryBuilder.andWhere('payout.unitType = :unitType', {
        unitType: dto.unitType,
      });
    }

    // Date range filters
    if (dto.dateFrom) {
      queryBuilder.andWhere('payout.createdAt >= :dateFrom', {
        dateFrom: dto.dateFrom,
      });
    }

    if (dto.dateTo) {
      queryBuilder.andWhere('payout.createdAt <= :dateTo', {
        dateTo: dto.dateTo,
      });
    }

    return this.paginate(
      dto,
      TEACHER_PAYOUT_PAGINATION_COLUMNS,
      `payouts/teachers`,
      queryBuilder,
    );
  }

  async findById(id: string): Promise<TeacherPayoutRecord | null> {
    return this.getRepository().findOne({
      where: { id },
      relations: ['teacher', 'class', 'session'],
    });
  }

  async findByTeacher(
    teacherUserProfileId: string,
  ): Promise<TeacherPayoutRecord[]> {
    return this.getRepository().find({
      where: { teacherUserProfileId },
      order: { createdAt: 'DESC' },
    });
  }

  async findPendingPayouts(): Promise<TeacherPayoutRecord[]> {
    return this.getRepository().find({
      where: { status: PayoutStatus.PENDING },
      relations: ['teacher', 'class'],
    });
  }

  async getPendingPayoutsForCenter(centerId: string): Promise<{ count: number; totalAmount: Money }> {
    // Calculate pending amounts based on payout status:
    // - PENDING: amount due = unitPrice
    // - INSTALLMENT: amount due = unitPrice - totalPaid

    const result = await this.getRepository()
      .createQueryBuilder('payout')
      .select('COUNT(payout.id)', 'count')
      .addSelect(`
        SUM(
          CASE
            WHEN payout.status = 'PENDING' THEN payout."unitPrice"
            WHEN payout.status = 'INSTALLMENT' THEN GREATEST(payout."unitPrice" - payout."totalPaid", 0)
            ELSE 100
          END
        )`, 'totalAmount')
      .where('payout.centerId = :centerId', { centerId })
      .andWhere('payout.status IN (:...statuses)', { statuses: [PayoutStatus.PENDING, PayoutStatus.INSTALLMENT] })
      .getRawOne();

    return {
      count: parseInt(result.count) || 0,
      totalAmount: new Money(parseFloat(result.totalAmount) || 0),
    };
  }


  async updateStatus(
    id: string,
    status: PayoutStatus,
  ): Promise<TeacherPayoutRecord> {
    await this.getRepository().update(id, {
      status,
    });

    const updated = await this.findById(id);
    if (!updated) {
      throw TeacherPayoutErrors.payoutNotFound();
    }

    return updated;
  }

  async savePayout(payout: TeacherPayoutRecord): Promise<TeacherPayoutRecord> {
    return this.getRepository().save(payout);
  }

  async createPayout(
    payoutData: Partial<TeacherPayoutRecord>,
  ): Promise<TeacherPayoutRecord> {
    const payout = this.getRepository().create(payoutData);
    return this.savePayout(payout);
  }

  // CLASS payout specific methods
  async getClassPayout(
    classId: string,
    teacherUserProfileId?: string,
  ): Promise<TeacherPayoutRecord | null> {
    const where: any = {
      classId,
      unitType: TeacherPaymentUnit.CLASS,
    };

    if (teacherUserProfileId) {
      where.teacherUserProfileId = teacherUserProfileId;
    }

    return this.getRepository().findOne({
      where,
      relations: ['teacher', 'class'],
    });
  }

  async getTeacherClassPayouts(
    teacherUserProfileId: string,
  ): Promise<TeacherPayoutRecord[]> {
    return this.getRepository().find({
      where: {
        teacherUserProfileId,
        unitType: TeacherPaymentUnit.CLASS,
      },
      relations: ['class'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find a teacher payout record with optimized relations loaded
   * Only loads id and name fields for related entities
   *
   * @param payoutId - Teacher payout record ID
   * @param includeDeleted - Reserved for future use (TeacherPayoutRecord doesn't have soft delete)
   * @returns TeacherPayoutRecord with optimized relations
   */
  async findTeacherPayoutWithRelations(payoutId: string, includeDeleted: boolean = false): Promise<TeacherPayoutRecord | null> {
    return this.getRepository()
      .createQueryBuilder('payout')
      // Join relations for name fields only (not full entities)
      .leftJoin('payout.teacher', 'teacher')
      .leftJoin('teacher.user', 'teacherUser')
      .leftJoin('payout.class', 'class')
      .leftJoin('payout.session', 'session')
      .leftJoin('payout.branch', 'branch')
      .leftJoin('payout.center', 'center')
      .leftJoinAndSelect('payout.payments', 'payments') // Include full payments for detailed view
      // Audit relations
      .leftJoin('payout.creator', 'creator')
      .leftJoin('creator.user', 'creatorUser')
      .leftJoin('payout.updater', 'updater')
      .leftJoin('updater.user', 'updaterUser')
      // Add name and id fields as selections
      .addSelect([
        'teacher.id',
        'teacherUser.id',
        'teacherUser.name',
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
      .where('payout.id = :payoutId', { payoutId })
      .getOne();
  }

  /**
   * Find a teacher payout record with optimized relations loaded or throw if not found
   *
   * @param payoutId - Teacher payout record ID
   * @param includeDeleted - Reserved for future use (TeacherPayoutRecord doesn't have soft delete)
   * @returns TeacherPayoutRecord with optimized relations
   * @throws Teacher payout not found error
   */
  async findTeacherPayoutWithRelationsOrThrow(payoutId: string, includeDeleted: boolean = false): Promise<TeacherPayoutRecord> {
    const payout = await this.findTeacherPayoutWithRelations(payoutId, includeDeleted);
    if (!payout) {
      throw new Error(`Teacher payout record with id ${payoutId} not found`);
    }
    return payout;
  }
}
