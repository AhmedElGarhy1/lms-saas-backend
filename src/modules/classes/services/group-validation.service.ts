import { Injectable } from '@nestjs/common';
import { ScheduleItemDto } from '../dto/schedule-item.dto';
import { ClassesRepository } from '../repositories/classes.repository';
import { GroupStudentsRepository } from '../repositories/group-students.repository';
import { ScheduleService } from './schedule.service';
import { Class } from '../entities/class.entity';
import { BaseService } from '@/shared/common/services/base.service';

@Injectable()
export class GroupValidationService extends BaseService {
  constructor(
    private readonly classesRepository: ClassesRepository,
    private readonly groupStudentsRepository: GroupStudentsRepository,
    private readonly scheduleService: ScheduleService,
  ) {
    super();
  }

  /**
   * Validates schedule conflicts for teacher and students.
   *
   * @param classEntity - The class entity (must have duration and teacherUserProfileId)
   * @param scheduleItems - Schedule items to validate
   * @param excludeGroupIds - Group IDs to exclude from conflict checks
   * @param groupId - The group ID (for fetching student IDs during updates)
   * @param skipWarning - If true, student conflicts are silently skipped
   */
  async validateScheduleCore(
    classEntity: Class,
    scheduleItems: ScheduleItemDto[] | undefined,
    excludeGroupIds?: string[],
    groupId?: string,
    skipWarning?: boolean,
  ): Promise<void> {
    if (!scheduleItems) {
      return;
    }

    let studentIds: string[] | undefined;
    if (excludeGroupIds && excludeGroupIds.length > 0 && groupId) {
      const groupStudents =
        await this.groupStudentsRepository.findByGroupId(groupId);
      studentIds = groupStudents.map((gs) => gs.studentUserProfileId);
    }

    await this.scheduleService.validateScheduleConflicts(
      scheduleItems,
      classEntity.duration,
      {
        teacherUserProfileId: classEntity.teacherUserProfileId,
        studentIds:
          studentIds && studentIds.length > 0 ? studentIds : undefined,
        excludeGroupIds,
        skipWarning,
      },
    );
  }

  async validateGroupSchedule(
    classId: string,
    scheduleItems: ScheduleItemDto[] | undefined,
    excludeGroupIds?: string[],
    groupId?: string,
    skipWarning?: boolean,
  ): Promise<Class> {
    const classEntity = await this.classesRepository.findOneOrThrow(classId);

    await this.validateScheduleCore(
      classEntity,
      scheduleItems,
      excludeGroupIds,
      groupId,
      skipWarning,
    );

    return classEntity;
  }
}
