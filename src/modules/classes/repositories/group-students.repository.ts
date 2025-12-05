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

  async bulkAssign(
    groupId: string,
    studentUserProfileIds: string[],
  ): Promise<GroupStudent[]> {
    // Delete existing assignments
    await this.getRepository().delete({ groupId });

    // Create new assignments
    const groupStudents = studentUserProfileIds.map((studentUserProfileId) =>
      this.getRepository().create({
        groupId,
        studentUserProfileId,
      }),
    );
    return this.getRepository().save(groupStudents);
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
   * Checks if a student has schedule conflicts with their existing group assignments.
   * Uses an optimized SQL query to detect overlapping time slots in the database.
   *
   * @param studentUserProfileId - The student's user profile ID
   * @param newScheduleItems - Array of new schedule items to check for conflicts
   * @param excludeGroupId - Optional group ID to exclude from conflict check (useful for updates)
   * @returns Object indicating if conflict exists and details about the first conflict found
   */
  async hasStudentScheduleConflict(
    studentUserProfileId: string,
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
      studentUserProfileId,
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
      INNER JOIN group_students gs ON gs."groupId" = g.id
      WHERE gs."studentUserProfileId" = $1
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

  async isStudentInAnotherGroupOfSameClass(
    studentUserProfileId: string,
    classId: string,
    excludeGroupId?: string,
  ): Promise<{ isInAnotherGroup: boolean; existingGroupId?: string }> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('gs')
      .innerJoin('gs.group', 'g')
      .where('gs."studentUserProfileId" = :studentUserProfileId', {
        studentUserProfileId,
      })
      .andWhere('g."classId" = :classId', { classId })
      .andWhere('g."deletedAt" IS NULL')
      .andWhere('gs."deletedAt" IS NULL')
      .select('g.id', 'groupId');

    if (excludeGroupId) {
      queryBuilder.andWhere('g.id != :excludeGroupId', { excludeGroupId });
    }

    const result = await queryBuilder.getRawOne<{ groupId: string }>();

    if (result) {
      return {
        isInAnotherGroup: true,
        existingGroupId: result.groupId,
      };
    }

    return { isInAnotherGroup: false };
  }
}
