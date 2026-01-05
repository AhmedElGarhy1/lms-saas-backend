import { Injectable } from '@nestjs/common';
import { TeacherPayoutRecord, PaymentSource } from '../entities/teacher-payout-record.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { PaginateTeacherPayoutsDto } from '../dto/paginate-teacher-payouts.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { PayoutStatus } from '../enums/payout-status.enum';
import { ActorUser } from '@/shared/common/types/actor-user.type';

@Injectable()
export class TeacherPayoutRecordsRepository extends BaseRepository<TeacherPayoutRecord> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
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
    const queryBuilder = this.getRepository().createQueryBuilder('payout');

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
      {
        searchableColumns: [],
        sortableColumns: ['createdAt', 'unitPrice', 'unitCount'],
        defaultSortBy: ['createdAt', 'DESC'],
      },
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

  async findByTeacher(teacherUserProfileId: string): Promise<TeacherPayoutRecord[]> {
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

  async updateStatus(
    id: string,
    status: PayoutStatus,
    paymentId?: string,
    paymentSource?: PaymentSource
  ): Promise<TeacherPayoutRecord> {
    await this.getRepository().update(id, {
      status,
      ...(paymentId && { paymentId }),
      ...(paymentSource && { paymentSource }),
    });

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Payout with id ${id} not found`);
    }

    return updated;
  }

  async savePayout(payout: TeacherPayoutRecord): Promise<TeacherPayoutRecord> {
    return this.getRepository().save(payout);
  }

  async createPayout(payoutData: Partial<TeacherPayoutRecord>): Promise<TeacherPayoutRecord> {
    const payout = this.getRepository().create(payoutData);
    return this.savePayout(payout);
  }
}
