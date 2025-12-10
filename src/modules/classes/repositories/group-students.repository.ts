import { Injectable } from '@nestjs/common';
import { GroupStudent } from '../entities/group-student.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { ScheduleConflictQueryBuilder } from '../utils/schedule-conflict-query-builder';
import { StudentConflictDto } from '../dto/schedule-conflict.dto';

@Injectable()
export class GroupStudentsRepository extends BaseRepository<GroupStudent> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof GroupStudent {
    return GroupStudent;
  }

  async findByGroupId(groupId: string): Promise<GroupStudent[]> {
    return this.getRepository().find({
      where: { groupId },
      relations: ['student'],
    });
  }

  /**
   * Delete all group student assignments for a given group ID.
   * Pure data access method - no business logic.
   *
   * @param groupId - The group ID
   * @returns Promise that resolves when deletion is complete
   */
  async deleteByGroupId(groupId: string): Promise<void> {
    await this.getRepository().delete({ groupId });
  }

  async isStudentInGroup(
    groupId: string,
    studentUserProfileId: string,
  ): Promise<boolean> {
    const exists = await this.getRepository().exists({
      where: { groupId, studentUserProfileId },
    });
    return exists;
  }

  async findByGroupAndStudent(
    groupId: string,
    studentUserProfileId: string,
  ): Promise<GroupStudent | null> {
    return this.getRepository().findOne({
      where: { groupId, studentUserProfileId },
    });
  }

  /**
   * Find all group IDs for a student in a given class.
   * Pure data access method - returns data only, no business logic interpretation.
   * Uses denormalized classId field for better performance.
   *
   * @param studentUserProfileId - The student's user profile ID
   * @param classId - The class ID
   * @param excludeGroupId - Optional group ID to exclude from results
   * @returns Array of group IDs (empty if none found)
   */
  async findStudentGroupIdsByClassId(
    studentUserProfileId: string,
    classId: string,
    excludeGroupId?: string,
  ): Promise<string[]> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('gs')
      .innerJoin('gs.group', 'g')
      .where('gs."studentUserProfileId" = :studentUserProfileId', {
        studentUserProfileId,
      })
      .andWhere('gs."classId" = :classId', { classId })
      .andWhere('g."deletedAt" IS NULL')
      .select('g.id', 'groupId');

    if (excludeGroupId) {
      queryBuilder.andWhere('g.id != :excludeGroupId', { excludeGroupId });
    }

    const results = await queryBuilder.getRawMany<{ groupId: string }>();
    return results.map((r) => r.groupId);
  }

  /**
   * Find all student schedule conflicts for duration update with aggregated data.
   * Pure data access method - returns all conflicts for all students with student information.
   * All aggregation done at database level using JSON_AGG and GROUP BY.
   *
   * @param studentIds - Array of student user profile IDs to check
   * @param newScheduleItems - Array of new schedule items to check for conflicts (with duration)
   * @param excludeGroupIds - Optional group IDs to exclude from conflict check
   * @returns Array of student conflict data, each with student info and their conflicts
   */
  async findAllStudentScheduleConflictsForDurationUpdate(
    studentIds: string[],
    newScheduleItems: Array<{
      day: string;
      startTime: string;
      duration: number;
    }>,
    excludeGroupIds?: string[],
  ): Promise<StudentConflictDto[]> {
    if (newScheduleItems.length === 0 || studentIds.length === 0) {
      return [];
    }

    // Build parameters array - start with schedule items, then student IDs
    const params: (string | number)[] = [];
    newScheduleItems.forEach((item) => {
      params.push(item.day, item.startTime, item.duration);
    });

    // Build conflict conditions using utility
    // The utility expects params starting at $1, but we need to adjust for student IDs
    // Actually, we'll use a dummy user ID and build conflict conditions normally
    // Then adjust parameter indices
    const conflictConditions =
      ScheduleConflictQueryBuilder.buildConflictConditions(newScheduleItems);

    // Adjust conflict condition parameter indices
    // Utility expects schedule items at $2 (after user ID at $1)
    // But we're starting with schedule items at $1, so we need to subtract 1 from all indices
    let adjustedConflictConditions = conflictConditions;
    for (let i = 0; i < newScheduleItems.length; i++) {
      const oldBaseIndex = 2 + i * 3; // Original base index from utility (after $1 user ID)
      const newBaseIndex = 1 + i * 3; // New base index (starting at $1)
      adjustedConflictConditions = adjustedConflictConditions.replace(
        new RegExp(`\\$${oldBaseIndex}\\b`, 'g'),
        `$${newBaseIndex}`,
      );
      adjustedConflictConditions = adjustedConflictConditions.replace(
        new RegExp(`\\$${oldBaseIndex + 1}\\b`, 'g'),
        `$${newBaseIndex + 1}`,
      );
      adjustedConflictConditions = adjustedConflictConditions.replace(
        new RegExp(`\\$${oldBaseIndex + 2}\\b`, 'g'),
        `$${newBaseIndex + 2}`,
      );
    }

    // Add student IDs to params
    const studentIdsPlaceholders = studentIds
      .map((_, index) => `$${params.length + 1 + index}`)
      .join(', ');
    params.push(...studentIds);

    // Build exclude condition
    const excludeStartIndex = params.length;
    const excludeInfo = ScheduleConflictQueryBuilder.buildExcludeCondition(
      excludeGroupIds,
      excludeStartIndex,
    );
    if (excludeGroupIds && excludeGroupIds.length > 0) {
      const excludeIds = Array.isArray(excludeGroupIds)
        ? excludeGroupIds
        : [excludeGroupIds];
      params.push(...excludeIds);
    }

    const query = `
      WITH distinct_conflicts AS (
        SELECT DISTINCT
          gs."studentUserProfileId",
          u.name as "studentName",
          existing.day,
          existing."startTime" || '-' || 
            TO_CHAR(
              TO_TIMESTAMP(existing."startTime", 'HH24:MI') + (COALESCE(c.duration, 60) || ' minutes')::INTERVAL,
              'HH24:MI'
            ) as "timeRange"
        FROM schedule_items existing
        INNER JOIN groups g ON g.id = existing."groupId"
        INNER JOIN classes c ON c.id = g."classId"
        INNER JOIN group_students gs ON gs."groupId" = g.id
        INNER JOIN user_profiles up ON up.id = gs."studentUserProfileId"
        INNER JOIN users u ON u.id = up."userId"
        WHERE gs."studentUserProfileId" IN (${studentIdsPlaceholders})
          AND g."deletedAt" IS NULL
          ${excludeInfo.condition}
          AND (${adjustedConflictConditions})
      ),
      conflict_data AS (
        SELECT *
        FROM distinct_conflicts
        ORDER BY "studentUserProfileId", day, "timeRange"
      )
      SELECT 
        "studentUserProfileId",
        "studentName",
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'day', day,
            'timeRange', "timeRange"
          )
        ) as conflicts
      FROM conflict_data
      GROUP BY "studentUserProfileId", "studentName"
    `;

    interface ConflictResult {
      studentUserProfileId: string;
      studentName: string;
      conflicts: Array<{ day: string; timeRange: string }> | null;
    }

    const result = await this.getEntityManager().query<ConflictResult[]>(
      query,
      params,
    );

    if (!result || result.length === 0) {
      return [];
    }

    // Filter out entries with no conflicts (shouldn't happen due to WHERE clause, but be safe)
    return result
      .filter((r) => r.conflicts && r.conflicts.length > 0)
      .map((r) => ({
        studentUserProfileId: r.studentUserProfileId,
        studentName: r.studentName,
        conflicts: r.conflicts!,
      }));
  }
}
