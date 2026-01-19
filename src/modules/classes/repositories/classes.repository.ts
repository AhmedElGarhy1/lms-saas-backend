import { Injectable } from '@nestjs/common';
import { Class } from '../entities/class.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { PaginateClassesDto } from '../dto/paginate-classes.dto';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { ScheduleConflictQueryBuilder } from '../utils/schedule-conflict-query-builder';
import { Group } from '../entities/group.entity';
import { GroupStudent } from '../entities/group-student.entity';
import { TeacherConflictDto } from '../dto/schedule-conflict.dto';
import { ClassesErrors } from '../exceptions/classes.errors';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { CLASS_PAGINATION_COLUMNS } from '@/shared/common/constants/pagination-columns';
import { ProfileType } from '@/shared/common/enums/profile-type.enum';

@Injectable()
export class ClassesRepository extends BaseRepository<Class> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    protected readonly accessControlHelperService: AccessControlHelperService,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof Class {
    return Class;
  }

  async paginateClasses(paginateDto: PaginateClassesDto, actor: ActorUser) {
    const centerId = actor.centerId!;
    const queryBuilder = this.getRepository()
      .createQueryBuilder('class')
      // Join relations for name fields only (not full entities)
      .leftJoin('class.level', 'level')
      .leftJoin('class.subject', 'subject')
      .leftJoinAndSelect('class.teacher', 'teacher')
      .leftJoin('teacher.user', 'teacherUser')
      .leftJoin('class.branch', 'branch')
      .leftJoinAndSelect(
        'class.studentPaymentStrategy',
        'studentPaymentStrategy',
      )
      .leftJoinAndSelect(
        'class.teacherPaymentStrategy',
        'teacherPaymentStrategy',
      )
      // Add name and id fields as selections
      .addSelect([
        'level.id',
        'level.name',
        'subject.id',
        'subject.name',
        'teacherUser.id',
        'teacherUser.name',
        'branch.id',
        'branch.city',
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
            .where('groupStudents.classId = class.id')
            .andWhere('groupStudents.leftAt IS NULL')
            .andWhere(
              'EXISTS (SELECT 1 FROM groups g WHERE g.id = "groupStudents"."groupId" AND g."deletedAt" IS NULL)',
            ),
        'studentsCount',
      )
      .where('class.centerId = :centerId', { centerId });

    // access control
    const canBypassCenterInternalAccess =
      await this.accessControlHelperService.bypassCenterInternalAccess(
        actor.userProfileId,
        centerId,
      );

    if (!canBypassCenterInternalAccess) {
      if (actor.profileType === ProfileType.STAFF) {
        queryBuilder.leftJoin('class.classStaff', 'classStaff');
        queryBuilder.andWhere('classStaff.userProfileId = :userProfileId', {
          userProfileId: actor.userProfileId,
        });
      } else if (actor.profileType === ProfileType.TEACHER) {
        queryBuilder.andWhere(
          'class.teacherUserProfileId = :teacherUserProfileId',
          {
            teacherUserProfileId: actor.userProfileId,
          },
        );
      } else {
        throw ClassesErrors.cannotAccessClasses();
      }
    }

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

    // Apply status filter
    if (paginateDto.status !== undefined && paginateDto.status !== null) {
      queryBuilder.andWhere('class.status = :status', {
        status: paginateDto.status,
      });
    }

    // Apply student payment type filter
    if (paginateDto.studentPaymentType) {
      switch (paginateDto.studentPaymentType) {
        case 'SESSION':
          queryBuilder.andWhere(
            'studentPaymentStrategy.includeSession = :includeSession',
            {
              includeSession: true,
            },
          );
          break;
        case 'MONTHLY':
          queryBuilder.andWhere(
            'studentPaymentStrategy.includeMonth = :includeMonth',
            {
              includeMonth: true,
            },
          );
          break;
        case 'CLASS':
          queryBuilder.andWhere(
            'studentPaymentStrategy.includeClass = :includeClass',
            {
              includeClass: true,
            },
          );
          break;
      }
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
      CLASS_PAGINATION_COLUMNS,
      '/classes',
      queryBuilder,
    );
  }

  async findClassWithRelations(
    id: string,
    includeDeleted = false,
  ): Promise<Class | null> {
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
        'branch.city',
        'center.id',
        'center.name',
      ])
      .where('class.id = :id', { id });

    if (!includeDeleted) {
      queryBuilder.andWhere('class.deletedAt IS NULL');
    } else {
      queryBuilder.withDeleted();
    }

    const result = await queryBuilder.getOne();

    const entity = result;

    // Fetch groups separately instead of relying on relation
    const groups = await this.getEntityManager()
      .createQueryBuilder(Group, 'group')
      .leftJoinAndSelect('group.scheduleItems', 'scheduleItems')
      .where('group.classId = :classId', { classId: id })
      .andWhere('group.deletedAt IS NULL')
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(groupStudents.id)', 'studentsCount')
            .from(GroupStudent, 'groupStudents')
            .where('groupStudents.groupId = group.id')
            .andWhere('groupStudents.leftAt IS NULL'),
        'studentsCount',
      )
      .getRawAndEntities()
      .then((result) =>
        result.entities.map((group, i) => ({
          ...group,
          studentsCount: parseInt(result.raw[i].studentsCount || '0', 10),
        })),
      );

    // Return entity with computed fields and groups attached (groupsCount not needed since we return all groups)
    return {
      ...entity,
      groups,
    } as any;
  }

  /**
   * Find all teacher schedule conflicts for duration update with aggregated data.
   * Pure data access method - returns all conflicts with teacher information.
   * All aggregation done at database level using JSON_AGG.
   *
   * @param teacherUserProfileId - The teacher's user profile ID
   * @param newScheduleItems - Array of new schedule items to check for conflicts (with duration)
   * @param excludeGroupIds - Optional group IDs to exclude from conflict check
   * @returns Teacher conflict data with all conflicts aggregated, or null if no conflicts
   */
  async findAllTeacherScheduleConflictsForDurationUpdate(
    teacherUserProfileId: string,
    newScheduleItems: Array<{
      day: string;
      startTime: string;
      duration: number;
    }>,
    excludeGroupIds?: string[],
  ): Promise<TeacherConflictDto | null> {
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
      WITH distinct_conflicts AS (
        SELECT DISTINCT
          c."teacherUserProfileId",
          u.name as "teacherName",
          existing.day,
          existing."startTime" || '-' || 
            TO_CHAR(
              TO_TIMESTAMP(existing."startTime", 'HH24:MI') + (COALESCE(c.duration, 60) || ' minutes')::INTERVAL,
              'HH24:MI'
            ) as "timeRange"
        FROM schedule_items existing
        INNER JOIN groups g ON g.id = existing."groupId"
        INNER JOIN classes c ON c.id = g."classId"
        INNER JOIN user_profiles up ON up.id = c."teacherUserProfileId"
        INNER JOIN users u ON u.id = up."userId"
        WHERE c."teacherUserProfileId" = $1
          AND c."deletedAt" IS NULL
          AND g."deletedAt" IS NULL
          ${excludeInfo.condition}
          AND (${conflictConditions})
      ),
      conflict_data AS (
        SELECT *
        FROM distinct_conflicts
        ORDER BY day, "timeRange"
      )
      SELECT 
        "teacherUserProfileId",
        "teacherName",
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'day', day,
            'timeRange', "timeRange"
          )
        ) as conflicts
      FROM conflict_data
      GROUP BY "teacherUserProfileId", "teacherName"
    `;

    interface ConflictResult {
      teacherUserProfileId: string;
      teacherName: string;
      conflicts: Array<{ day: string; timeRange: string }> | null;
    }

    const result = await this.getEntityManager().query<ConflictResult[]>(
      query,
      params,
    );

    if (result && result.length > 0 && result[0].conflicts) {
      return {
        teacherUserProfileId: result[0].teacherUserProfileId,
        teacherName: result[0].teacherName,
        conflicts: result[0].conflicts,
      };
    }

    return null;
  }

  /**
   * Find a class by ID with all relations loaded, throws if not found.
   * Pure data access method - no business logic.
   *
   * @param id - The class ID
   * @param includeDeleted - Whether to include soft-deleted classes
   * @returns Class with all relations
   * @throws ClassesErrors.classNotFound() if class not found
   */
  async findClassWithRelationsOrThrow(
    id: string,
    includeDeleted = false,
  ): Promise<Class> {
    const classEntity = await this.findClassWithRelations(id, includeDeleted);
    if (!classEntity) {
      throw ClassesErrors.classNotFound();
    }
    return classEntity;
  }

  async findClassByUniqueCombination(
    centerId: string,
    branchId: string,
    teacherUserProfileId: string,
    levelId: string,
    subjectId: string,
  ): Promise<Class | null> {
    return this.getRepository().findOne({
      where: {
        centerId,
        branchId,
        teacherUserProfileId,
        levelId,
        subjectId,
      },
    });
  }

  async countActiveTeachersForCenter(centerId: string): Promise<number> {
    const result = await this.getRepository()
      .createQueryBuilder('class')
      .select('COUNT(DISTINCT class.teacherUserProfileId)', 'count')
      .where('class.centerId = :centerId', { centerId })
      .andWhere('class.status = :status', { status: 'ACTIVE' })
      .andWhere('class.teacherUserProfileId IS NOT NULL')
      .getRawOne();

    return parseInt(result.count) || 0;
  }
}
