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
      .addSelect(['center.id', 'center.name'])
      .where('subject.centerId = :centerId', { centerId })
      // Filter out subjects where related entities are deleted (check if entity exists)
      .andWhere('center.id IS NOT NULL');

    return this.paginate(
      paginateDto,
      SUBJECT_PAGINATION_COLUMNS,
      'subjects',
      queryBuilder,
    );
  }

  /**
   * Find a subject by ID optimized for API responses.
   * Selects only necessary fields (id, name, etc.) from relations for serialization.
   * Use this method when returning data to API clients to minimize response size.
   *
   * @param subjectId - Subject ID
   * @param includeDeleted - Whether to include soft-deleted subjects
   * @returns Subject with selective relation fields, or null if not found
   */
  async findSubjectForResponse(
    subjectId: string,
    includeDeleted: boolean = false,
  ): Promise<Subject | null> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('subject')
      // Join relations for name fields only (not full entities)
      .leftJoin('subject.center', 'center')
      // Audit relations
      .leftJoin('subject.creator', 'creator')
      .leftJoin('creator.user', 'creatorUser')
      .leftJoin('subject.updater', 'updater')
      .leftJoin('updater.user', 'updaterUser')
      .leftJoin('subject.deleter', 'deleter')
      .leftJoin('deleter.user', 'deleterUser')
      // Add name and id fields as selections
      .addSelect([
        'center.id',
        'center.name',
        // Audit fields
        'creator.id',
        'creatorUser.id',
        'creatorUser.name',
        'updater.id',
        'updaterUser.id',
        'updaterUser.name',
        'deleter.id',
        'deleterUser.id',
        'deleterUser.name',
      ])
      .where('subject.id = :subjectId', { subjectId });

    if (includeDeleted) {
      queryBuilder.withDeleted();
    }

    return queryBuilder.getOne();
  }

  /**
   * Find a subject by ID optimized for API responses, throws if not found.
   * Selects only necessary fields (id, name, etc.) from relations for serialization.
   * Use this method when returning data to API clients to minimize response size.
   *
   * @param subjectId - Subject ID
   * @param includeDeleted - Whether to include soft-deleted subjects
   * @returns Subject with selective relation fields
   * @throws Error if subject not found
   */
  async findSubjectForResponseOrThrow(
    subjectId: string,
    includeDeleted: boolean = false,
  ): Promise<Subject> {
    const subject = await this.findSubjectForResponse(
      subjectId,
      includeDeleted,
    );
    if (!subject) {
      throw new Error(`Subject with id ${subjectId} not found`);
    }
    return subject;
  }

  /**
   * Find a subject by ID with full relations loaded for internal use.
   * Loads complete entity objects with all properties accessible (e.g., isActive, etc.).
   * Use this method for business logic that needs to access any property of related entities.
   *
   * @param subjectId - Subject ID
   * @param includeDeleted - Whether to include soft-deleted subjects
   * @returns Subject with full relations loaded, or null if not found
   */
  async findSubjectWithFullRelations(
    subjectId: string,
    includeDeleted: boolean = false,
  ): Promise<Subject | null> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('subject')
      // Load FULL entities using leftJoinAndSelect for all relations
      .leftJoinAndSelect('subject.center', 'center')
      .where('subject.id = :subjectId', { subjectId });

    if (includeDeleted) {
      queryBuilder.withDeleted();
    }

    return queryBuilder.getOne();
  }

  /**
   * Find a subject by ID with full relations loaded for internal use, throws if not found.
   * Loads complete entity objects with all properties accessible (e.g., isActive, etc.).
   * Use this method for business logic that needs to access any property of related entities.
   *
   * @param subjectId - Subject ID
   * @param includeDeleted - Whether to include soft-deleted subjects
   * @returns Subject with full relations loaded
   * @throws Error if subject not found
   */
  async findSubjectWithFullRelationsOrThrow(
    subjectId: string,
    includeDeleted: boolean = false,
  ): Promise<Subject> {
    const subject = await this.findSubjectWithFullRelations(
      subjectId,
      includeDeleted,
    );
    if (!subject) {
      throw new Error(`Subject with id ${subjectId} not found`);
    }
    return subject;
  }
}
