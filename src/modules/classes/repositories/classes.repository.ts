import { Injectable } from '@nestjs/common';
import { Class } from '../entities/class.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { PaginateClassesDto } from '../dto/paginate-classes.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { ScheduleConflictQueryBuilder } from '../utils/schedule-conflict-query-builder';
import { Group } from '../entities/group.entity';
import { GroupStudent } from '../entities/group-student.entity';

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
      // Join relations for name fields only (not full entities)
      .leftJoin('class.level', 'level')
      .leftJoin('class.subject', 'subject')
      .leftJoinAndSelect('class.teacher', 'teacher')
      .leftJoin('teacher.user', 'teacherUser')
      .leftJoin('class.branch', 'branch')
      // Add name and id fields as selections
      .addSelect([
        'level.id',
        'level.name',
        'subject.id',
        'subject.name',
        'teacherUser.id',
        'teacherUser.name',
        'branch.id',
        'branch.location',
      ])
      // Add count subqueries
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(groups.id)', 'groupsCount')
            .from(Group, 'groups')
            .where('groups.classId = class.id')
            .andWhere('groups.deletedAt IS NULL'),
        'groupsCount',
      )
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(groupStudents.id)', 'studentsCount')
            .from(GroupStudent, 'groupStudents')
            .innerJoin('groupStudents.group', 'g')
            .where('g.classId = class.id')
            .andWhere('g.deletedAt IS NULL')
            .andWhere('groupStudents.deletedAt IS NULL'),
        'studentsCount',
      )
      .where('class.centerId = :centerId', { centerId });

    // Apply filters
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

    // Apply search filter (from base repository logic)
    if (paginateDto.search) {
      queryBuilder.andWhere('class.name ILIKE :search', {
        search: `%${paginateDto.search}%`,
      });
    }

    // Get paginated results with computed fields (counts)
    return await this.paginate(
      paginateDto,
      {
        searchableColumns: [
          'name',
          'level.name',
          'subject.name',
          'branch.location',
        ],
        sortableColumns: ['createdAt', 'updatedAt'],
        defaultSortBy: ['createdAt', 'DESC'],
      },
      '/classes',
      queryBuilder,
      {
        includeComputedFields: true,
        computedFieldsMapper: (entity: Class, raw: any) => {
          // Map computed counts from raw data
          const groupsCount = parseInt(raw.groupsCount || '0', 10);
          const studentsCount = parseInt(raw.studentsCount || '0', 10);

          // Return entity with computed fields added
          return {
            ...entity,
            groupsCount,
            studentsCount,
          } as any;
        },
      },
    );
  }

  async findClassWithRelations(id: string): Promise<Class | null> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('class')
      // Join relations for name fields only (not full entities)
      .leftJoin('class.level', 'level')
      .leftJoin('class.subject', 'subject')
      .leftJoinAndSelect('class.teacher', 'teacher')
      .leftJoin('teacher.user', 'teacherUser')
      .leftJoin('class.branch', 'branch')
      .leftJoin('class.center', 'center')
      // Load full payment strategies
      .leftJoinAndSelect(
        'class.studentPaymentStrategy',
        'studentPaymentStrategy',
      )
      .leftJoinAndSelect(
        'class.teacherPaymentStrategy',
        'teacherPaymentStrategy',
      )
      // Groups will be fetched separately to avoid relying on relations
      // Add name and id fields as selections
      .addSelect([
        'level.id',
        'level.name',
        'subject.id',
        'subject.name',
        'teacherUser.id',
        'teacherUser.name',
        'branch.id',
        'branch.location',
        'center.id',
        'center.name',
      ])
      // Add count subquery for total students (groupsCount not needed since we return all groups)
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(groupStudents.id)', 'studentsCount')
            .from(GroupStudent, 'groupStudents')
            .innerJoin('groupStudents.group', 'g')
            .where('g.classId = class.id')
            .andWhere('g.deletedAt IS NULL')
            .andWhere('groupStudents.deletedAt IS NULL'),
        'studentsCount',
      )
      .where('class.id = :id', { id })
      .andWhere('class.deletedAt IS NULL');

    const { entities, raw } = await queryBuilder.getRawAndEntities();

    if (!entities || entities.length === 0) {
      return null;
    }

    const entity = entities[0];
    const rawData = raw[0];

    // Map computed count from raw data (groupsCount not needed since we return all groups)
    const studentsCount = parseInt(rawData.studentsCount || '0', 10);

    // Fetch groups separately instead of relying on relation
    const groups = await this.getEntityManager()
      .createQueryBuilder(Group, 'group')
      .leftJoinAndSelect('group.scheduleItems', 'scheduleItems')
      .where('group.classId = :classId', { classId: id })
      .andWhere('group.deletedAt IS NULL')
      .getMany();

    // Add studentsCount to each group
    if (groups && groups.length > 0) {
      const groupIds = groups.map((g) => g.id);
      const groupStudentCounts = await this.getEntityManager()
        .createQueryBuilder(GroupStudent, 'gs')
        .select('gs.groupId', 'groupId')
        .addSelect('COUNT(gs.id)', 'studentsCount')
        .where('gs.groupId IN (:...groupIds)', { groupIds })
        .andWhere('gs.deletedAt IS NULL')
        .groupBy('gs.groupId')
        .getRawMany();

      interface GroupCountResult {
        groupId: string;
        studentsCount: string;
      }

      const countMap = new Map(
        (groupStudentCounts as GroupCountResult[]).map((item) => [
          item.groupId,
          parseInt(item.studentsCount || '0', 10),
        ]),
      );

      // Add studentsCount to each group
      groups.forEach((group) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (group as any).studentsCount = countMap.get(group.id) || 0;
      });
    }

    // Return entity with computed fields and groups attached (groupsCount not needed since we return all groups)
    return {
      ...entity,
      groups,
      studentsCount,
    } as any;
  }

  /**
   * Find teacher schedule conflicts in the database.
   * Pure data access method - returns conflict data if found, null otherwise.
   * No business logic interpretation.
   *
   * @param teacherUserProfileId - The teacher's user profile ID
   * @param newScheduleItems - Array of new schedule items to check for conflicts (with duration)
   * @param excludeGroupIds - Optional group IDs to exclude from conflict check
   * @returns Conflict data if found, null otherwise
   */
  async findTeacherScheduleConflicts(
    teacherUserProfileId: string,
    newScheduleItems: Array<{
      day: string;
      startTime: string;
      duration: number;
    }>,
    excludeGroupIds?: string[],
  ): Promise<{ conflictDay: string; conflictTime: string } | null> {
    if (newScheduleItems.length === 0) {
      return null;
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
      excludeGroupIds,
      params.length,
    );
    ScheduleConflictQueryBuilder.addExcludeParameter(params, excludeGroupIds);

    const query = `
      SELECT 
        existing.day as "conflictDay",
        existing."startTime" || '-' || 
        TO_CHAR(
          TO_TIMESTAMP(existing."startTime", 'HH24:MI') + (COALESCE(c.duration, 60) || ' minutes')::INTERVAL,
          'HH24:MI'
        ) as "conflictTime"
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

    const result = await this.getEntityManager().query<ConflictResult[]>(
      query,
      params,
    );

    if (result && result.length > 0) {
      return {
        conflictDay: result[0].conflictDay,
        conflictTime: result[0].conflictTime,
      };
    }

    return null;
  }
}
