import { Injectable } from '@nestjs/common';
import { GroupStudent } from '../entities/group-student.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { ScheduleConflictQueryBuilder } from '../utils/schedule-conflict-query-builder';

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
   * Find student schedule conflicts in the database.
   * Pure data access method - returns conflict data if found, null otherwise.
   * No business logic interpretation.
   *
   * @param studentUserProfileId - The student's user profile ID
   * @param newScheduleItems - Array of new schedule items to check for conflicts (with duration)
   * @param excludeGroupIds - Optional group IDs to exclude from conflict check
   * @returns Conflict data if found, null otherwise
   */
  async findStudentScheduleConflicts(
    studentUserProfileId: string,
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
      studentUserProfileId,
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
      INNER JOIN group_students gs ON gs."groupId" = g.id
      WHERE gs."studentUserProfileId" = $1
        AND g."deletedAt" IS NULL
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
}
