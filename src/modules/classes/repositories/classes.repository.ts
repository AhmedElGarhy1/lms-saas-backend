import { Injectable } from '@nestjs/common';
import { Class } from '../entities/class.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { PaginateClassesDto } from '../dto/paginate-classes.dto';
import { Pagination } from 'nestjs-typeorm-paginate';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { ScheduleConflictQueryBuilder } from '../utils/schedule-conflict-query-builder';

@Injectable()
export class ClassesRepository extends BaseRepository<Class> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof Class {
    return Class;
  }

  async paginateClasses(
    paginateDto: PaginateClassesDto,
    centerId: string,
  ): Promise<Pagination<Class>> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('class')
      .leftJoinAndSelect('class.level', 'level')
      .leftJoinAndSelect('class.subject', 'subject')
      .leftJoinAndSelect('class.teacher', 'teacher')
      .leftJoinAndSelect('class.branch', 'branch')
      .leftJoinAndSelect('class.center', 'center')
      .leftJoinAndSelect(
        'class.studentPaymentStrategy',
        'studentPaymentStrategy',
      )
      .leftJoinAndSelect(
        'class.teacherPaymentStrategy',
        'teacherPaymentStrategy',
      )
      .where('class.centerId = :centerId', { centerId });

    if (paginateDto.branchId) {
      queryBuilder.andWhere('class.branchId = :branchId', {
        branchId: paginateDto.branchId,
      });
    }

    if (paginateDto.levelId) {
      queryBuilder.andWhere('class.levelId = :levelId', {
        levelId: paginateDto.levelId,
      });
    }

    if (paginateDto.subjectId) {
      queryBuilder.andWhere('class.subjectId = :subjectId', {
        subjectId: paginateDto.subjectId,
      });
    }

    if (paginateDto.teacherUserProfileId) {
      queryBuilder.andWhere(
        'class.teacherUserProfileId = :teacherUserProfileId',
        {
          teacherUserProfileId: paginateDto.teacherUserProfileId,
        },
      );
    }

    return this.paginate(
      paginateDto,
      {
        searchableColumns: ['name'],
        sortableColumns: [
          'name',
          'startDate',
          'endDate',
          'createdAt',
          'updatedAt',
        ],
        defaultSortBy: ['createdAt', 'DESC'],
      },
      'classes',
      queryBuilder,
    );
  }

  async findClassWithRelations(id: string): Promise<Class | null> {
    return this.getRepository().findOne({
      where: { id },
      relations: [
        'level',
        'subject',
        'teacher',
        'branch',
        'center',
        'groups',
        'studentPaymentStrategy',
        'teacherPaymentStrategy',
      ],
    });
  }

  async findClassesByTeacher(teacherUserProfileId: string): Promise<Class[]> {
    return this.getRepository()
      .createQueryBuilder('class')
      .leftJoinAndSelect('class.groups', 'group')
      .leftJoinAndSelect('group.scheduleItems', 'scheduleItem')
      .where('class.teacherUserProfileId = :teacherUserProfileId', {
        teacherUserProfileId,
      })
      .andWhere('class.deletedAt IS NULL')
      .andWhere('(group.deletedAt IS NULL OR group.id IS NULL)')
      .getMany();
  }

  async hasTeacherScheduleConflict(
    teacherUserProfileId: string,
    newScheduleItems: Array<{
      day: string;
      startTime: string;
      endTime: string;
    }>,
    excludeGroupId?: string,
  ): Promise<{
    hasConflict: boolean;
    conflictDay?: string;
    conflictTime?: string;
  }> {
    if (newScheduleItems.length === 0) {
      return { hasConflict: false };
    }

    // Build parameters array using utility
    const params = ScheduleConflictQueryBuilder.buildParameters(
      teacherUserProfileId,
      newScheduleItems,
    );

    // Build conflict conditions using utility
    const conflictConditions =
      ScheduleConflictQueryBuilder.buildConflictConditions(newScheduleItems);

    // Build exclude condition using utility
    const excludeInfo = ScheduleConflictQueryBuilder.buildExcludeCondition(
      excludeGroupId,
      params.length,
    );
    ScheduleConflictQueryBuilder.addExcludeParameter(params, excludeGroupId);

    const query = `
      SELECT 
        existing.day as "conflictDay",
        existing."startTime" || '-' || existing."endTime" as "conflictTime"
      FROM schedule_items existing
      INNER JOIN groups g ON g.id = existing."groupId"
      INNER JOIN classes c ON c.id = g."classId"
      WHERE c."teacherUserProfileId" = $1
        AND c."deletedAt" IS NULL
        AND g."deletedAt" IS NULL
        AND existing."deletedAt" IS NULL
        ${excludeInfo.condition}
        AND (${conflictConditions})
      LIMIT 1
    `;

    interface ConflictResult {
      conflictDay: string;
      conflictTime: string;
    }

    const result = (await this.getEntityManager().query(
      query,
      params,
    )) as ConflictResult[];

    if (result && result.length > 0) {
      return {
        hasConflict: true,
        conflictDay: result[0].conflictDay,
        conflictTime: result[0].conflictTime,
      };
    }

    return { hasConflict: false };
  }
}
