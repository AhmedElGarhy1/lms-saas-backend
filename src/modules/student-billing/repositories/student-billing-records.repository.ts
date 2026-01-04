import { Injectable } from '@nestjs/common';
import { StudentBillingRecord, StudentBillingType } from '../entities/student-billing-record.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { PaginateStudentBillingRecordsDto } from '../dto/paginate-student-billing-records.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { ActorUser } from '@/shared/common/types/actor-user.type';

@Injectable()
export class StudentBillingRecordsRepository extends BaseRepository<StudentBillingRecord> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): new () => StudentBillingRecord {
    return StudentBillingRecord;
  }

  async paginateStudentBillingRecords(
    dto: PaginateStudentBillingRecordsDto,
    actor: ActorUser,
  ): Promise<Pagination<StudentBillingRecord>> {
    const queryBuilder = this.getRepository().createQueryBuilder('record');

    if (dto.studentUserProfileId) {
      queryBuilder.andWhere(
        'record.studentUserProfileId = :studentUserProfileId',
        {
          studentUserProfileId: dto.studentUserProfileId,
        },
      );
    }

    // Apply type filter if provided
    if (dto.type) {
      queryBuilder.andWhere('record.type = :type', { type: dto.type });
    }

    // Apply date filters to createdAt field
    if (dto.dateFrom) {
      queryBuilder.andWhere('record.createdAt >= :dateFrom', {
        dateFrom: dto.dateFrom,
      });
    }

    if (dto.dateTo) {
      queryBuilder.andWhere('record.createdAt <= :dateTo', {
        dateTo: dto.dateTo,
      });
    }

    return this.paginate(
      dto,
      {
        searchableColumns: [],
        sortableColumns: ['createdAt', 'amount', 'type'],
        defaultSortBy: ['createdAt', 'DESC'],
      },
      `billing/students/records`,
      queryBuilder,
    );
  }

  async createBillingRecord(
    data: Partial<StudentBillingRecord>,
  ): Promise<StudentBillingRecord> {
    const billingRecord = this.getRepository().create(data);
    return this.getRepository().save(billingRecord);
  }

  async saveBillingRecord(
    billingRecord: StudentBillingRecord,
  ): Promise<StudentBillingRecord> {
    return this.getRepository().save(billingRecord);
  }

  async findSessionBillingRecord(
    studentUserProfileId: string,
    strategyId: string,
  ): Promise<StudentBillingRecord | null> {
    return this.getRepository().findOne({
      where: {
        studentUserProfileId,
        refId: strategyId,
        type: StudentBillingType.SESSION,
      },
    });
  }
}
