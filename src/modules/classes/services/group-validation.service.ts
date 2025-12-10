import { Injectable } from '@nestjs/common';
import { ScheduleItemDto } from '../dto/schedule-item.dto';
import { ClassesRepository } from '../repositories/classes.repository';
import { GroupStudentsRepository } from '../repositories/group-students.repository';
import { ScheduleService } from './schedule.service';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { Class } from '../entities/class.entity';
import { ResourceNotFoundException } from '@/shared/common/exceptions/custom.exceptions';
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

  async validateGroup(
    classId: string,
    scheduleItems: ScheduleItemDto[] | undefined,
    actor: ActorUser,
    excludeGroupIds?: string[],
    groupId?: string,
  ): Promise<Class> {
    // Fetch class entity
    const classEntity = await this.classesRepository.findOne(classId);
    if (!classEntity) {
      throw new ResourceNotFoundException('t.messages.withIdNotFound', {
        resource: 't.resources.class',
        identifier: 't.resources.identifier',
        value: classId,
      });
    }

    // Validate schedule items if provided
    if (scheduleItems) {
      // Get student IDs if this is an update (excludeGroupIds provided means update)
      let studentIds: string[] | undefined;
      if (excludeGroupIds && excludeGroupIds.length > 0 && groupId) {
        const groupStudents =
          await this.groupStudentsRepository.findByGroupId(groupId);
        studentIds = groupStudents.map((gs) => gs.studentUserProfileId);
      }

      // Validate schedule items and check conflicts (both teacher and students if applicable)
      await this.scheduleService.validateScheduleConflicts(
        scheduleItems,
        classEntity.duration,
        {
          teacherUserProfileId: classEntity.teacherUserProfileId,
          studentIds:
            studentIds && studentIds.length > 0 ? studentIds : undefined,
          excludeGroupIds,
        },
      );
    }

    return classEntity;
  }

  async validateStudents(
    studentUserProfileIds: string[],
    actor: ActorUser,
  ): Promise<void> {
    // No validation needed - ContextGuard ensures center access
    // Students are validated at DTO level with @Exists decorator
  }
}
