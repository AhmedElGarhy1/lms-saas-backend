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
  // TODO: fix this bad performance method
  async validateDurationUpdateConflicts(
    classId: string,
    newDuration: number,
    teacherUserProfileId: string,
    skipWarning?: boolean,
  ): Promise<void> {
    const groups =
      await this.groupsRepository.findGroupsByClassIdWithScheduleAndStudents(
        classId,
      );

    if (!groups || groups.length === 0) {
      return;
    }

    const allScheduleItems: ScheduleItemDto[] = [];
    const groupIds = groups.map((g) => g.id);

    for (const group of groups) {
      if (group.scheduleItems && group.scheduleItems.length > 0) {
        const scheduleItems: ScheduleItemDto[] = group.scheduleItems.map(
          (item) => ({
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

    const allGroupStudents = await Promise.all(
      groupIds.map((groupId) =>
        this.groupStudentsRepository.findByGroupId(groupId),
      ),
    );

    const studentIdsSet = new Set<string>();
    for (const groupStudents of allGroupStudents) {
      for (const groupStudent of groupStudents) {
        studentIdsSet.add(groupStudent.studentUserProfileId);
      }
    }

    const studentIds = Array.from(studentIdsSet);

    await this.scheduleService.validateScheduleConflicts(
      allScheduleItems,
      newDuration,
      {
        teacherUserProfileId,
        studentIds: studentIds.length > 0 ? studentIds : undefined,
        excludeGroupIds: groupIds,
        skipWarning,
      },
    );
  }
}
