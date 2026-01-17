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
      // Join relations for name fields only (not full entities)
      .leftJoin('subject.center', 'center')
      // Add name and id fields as selections
      .addSelect([
        'center.id',
        'center.name',
      ])
      .where('subject.centerId = :centerId', { centerId });

    return this.paginate(
      paginateDto,
      SUBJECT_PAGINATION_COLUMNS,
      'subjects',
      queryBuilder,
    );
  }

  /**
   * Find a subject with optimized relations loaded
   * Only loads id and name fields for center relation
   *
   * @param subjectId - Subject ID
   * @returns Subject with center.id and center.name only
   */
  async findSubjectWithRelations(subjectId: string): Promise<Subject | null> {
    return this.getRepository()
      .createQueryBuilder('subject')
      // Join relations for name fields only (not full entities)
      .leftJoin('subject.center', 'center')
      // Add name and id fields as selections
      .addSelect([
        'center.id',
        'center.name',
      ])
      .where('subject.id = :subjectId', { subjectId })
      .getOne();
  }

  /**
   * Find a subject with optimized relations loaded or throw if not found
   *
   * @param subjectId - Subject ID
   * @returns Subject with center.id and center.name only
   * @throws Subject not found error
   */
  async findSubjectWithRelationsOrThrow(subjectId: string): Promise<Subject> {
    const subject = await this.findSubjectWithRelations(subjectId);
    if (!subject) {
      throw new Error(`Subject with id ${subjectId} not found`);
    }
    return subject;
  }
}
