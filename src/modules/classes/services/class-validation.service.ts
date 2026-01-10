import { Injectable } from '@nestjs/common';
import { UpdateClassDto } from '../dto/update-class.dto';
import { ScheduleService } from './schedule.service';
import { GroupsRepository } from '../repositories/groups.repository';
import { GroupStudentsRepository } from '../repositories/group-students.repository';
import { ScheduleItemDto } from '../dto/schedule-item.dto';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { BaseService } from '@/shared/common/services/base.service';
import { Class } from '../entities/class.entity';
import { ClassesErrors } from '../exceptions/classes.errors';
import { ClassStatus } from '../enums/class-status.enum';
import { TimezoneService } from '@/shared/common/services/timezone.service';

@Injectable()
export class ClassValidationService extends BaseService {
  constructor(
    private readonly scheduleService: ScheduleService,
    private readonly groupsRepository: GroupsRepository,
    private readonly groupStudentsRepository: GroupStudentsRepository,
  ) {
    super();
  }

  async validateClassUpdate(
    classId: string,
    dto: UpdateClassDto,
    actor: ActorUser,
    centerId: string,
    currentClass: Class,
  ): Promise<void> {
    // Prevent updating startDate if class is not in NOT_STARTED status
    if (dto.startDate !== undefined) {
      // dto.startDate is already a UTC Date object (converted by @IsIsoDateTime decorator)
      const newStartDateUtc = dto.startDate;
      const currentStartDateUtc = currentClass.startDate; // Already UTC Date
      const startDateChanged =
        newStartDateUtc.getTime() !== currentStartDateUtc.getTime();
      if (startDateChanged && currentClass.status !== ClassStatus.NOT_STARTED) {
        throw ClassesErrors.classStartDateUpdateForbidden();
      }
    }

    if (dto.duration !== undefined) {
      if (dto.duration !== currentClass.duration) {
        await this.validateDurationUpdateConflicts(
          classId,
          dto.duration,
          currentClass.teacherUserProfileId,
          dto.skipWarning,
        );
      }
    }
  }

  /**
   * Validates that updating class duration won't cause schedule conflicts.
   * Uses optimized flow: check teacher conflicts first, only check students if teacher has no conflicts.
   *
   * @param classId - The class ID being updated
   * @param newDuration - The new duration value
   * @param teacherUserProfileId - The teacher's user profile ID
   * @param skipWarning - If true, student conflicts are silently skipped
   * @throws ClassesErrors.scheduleConflict() if schedule conflicts are detected
   */
  // Optimized: Reduced N+1 queries and improved performance
  async validateDurationUpdateConflicts(
    classId: string,
    newDuration: number,
    teacherUserProfileId: string,
    skipWarning?: boolean,
  ): Promise<void> {
    // Single query to get all groups with schedule items for this class
    const groups = await this.groupsRepository.findMany({
      where: { classId },
      relations: ['scheduleItems'],
    });

    if (!groups || groups.length === 0) {
      return;
    }

    // Collect all schedule items in one pass
    const allScheduleItems: ScheduleItemDto[] = [];
    for (const group of groups) {
      if (group.scheduleItems && group.scheduleItems.length > 0) {
        const scheduleItems: ScheduleItemDto[] = group.scheduleItems.map(
          (item: any) => ({
            day: item.day,
            startTime: item.startTime,
          }),
        );
        allScheduleItems.push(...scheduleItems);
      }
    }

    if (allScheduleItems.length === 0) {
      return;
    }

    // Single optimized query to get all students across all groups
    // Instead of N queries for N groups, use one query with IN clause
    const groupIds = groups.map((g: any) => g.id);
    const studentIds =
      await this.groupStudentsRepository.findStudentIdsByGroupIds(groupIds);

    await this.scheduleService.validateScheduleConflicts(
      allScheduleItems,
      newDuration,
      {
        teacherUserProfileId,
        studentIds:
          studentIds.length > 0 ? (studentIds as string[]) : undefined,
        excludeGroupIds: groupIds,
        skipWarning,
      },
    );
  }
}
