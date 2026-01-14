import { Injectable } from '@nestjs/common';
import { Subject } from '../entities/subject.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { PaginateSubjectsDto } from '../dto/paginate-subjects.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { SUBJECT_PAGINATION_COLUMNS } from '@/shared/common/constants/pagination-columns';

@Injectable()
export class SubjectsRepository extends BaseRepository<Subject> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof Subject {
    return Subject;
  }

  async paginateSubjects(
    paginateDto: PaginateSubjectsDto,
    centerId: string,
  ): Promise<Pagination<Subject>> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('subject')
      .leftJoinAndSelect('subject.center', 'center')
      .where('subject.centerId = :centerId', { centerId });

    return this.paginate(
      paginateDto,
      SUBJECT_PAGINATION_COLUMNS,
      'subjects',
      queryBuilder,
    );
  }
}
