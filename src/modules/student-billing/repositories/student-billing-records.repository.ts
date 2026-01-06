import { Injectable } from '@nestjs/common';
import { StudentBillingRecord, StudentBillingType } from '../entities/student-billing-record.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { PaginateStudentBillingRecordsDto } from '../dto/paginate-student-billing-records.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';

@Injectable()
export class StudentBillingRecordsRepository extends BaseRepository<StudentBillingRecord> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    private readonly accessControlHelperService: AccessControlHelperService,
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
    const queryBuilder = this.getRepository()
      .createQueryBuilder('record')
      .leftJoin('record.strategy', 'strategy')
      .leftJoin('strategy.class', 'class')
      .leftJoin('class.classStaff', 'classStaff')
      .leftJoin('class.branches', 'branchAccess', 'branchAccess.userProfileId = :userProfileId AND branchAccess.isActive = true', { userProfileId: actor.userProfileId });

    // Access control: Filter by class staff and branch access for non-bypass users
    const canBypassCenterInternalAccess = await this.accessControlHelperService.bypassCenterInternalAccess(
      actor.userProfileId,
      actor.centerId,
    );

    if (!canBypassCenterInternalAccess) {
      queryBuilder.andWhere(
        '(classStaff.userProfileId = :userProfileId OR branchAccess.branchId IS NOT NULL)',
        { userProfileId: actor.userProfileId }
      );
    }

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
