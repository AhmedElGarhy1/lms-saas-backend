import { Injectable } from '@nestjs/common';
import {
  BusinessLogicException,
  ScheduleConflictException,
  ErrorDetail,
} from '@/shared/common/exceptions/custom.exceptions';
import { TranslationMessage } from '@/generated/i18n-type-map.generated';
import { ScheduleItemDto } from '../dto/schedule-item.dto';
import { DayOfWeek } from '../enums/day-of-week.enum';
import { BaseService } from '@/shared/common/services/base.service';
import { ClassesRepository } from '../repositories/classes.repository';
import { GroupStudentsRepository } from '../repositories/group-students.repository';
import {
  TeacherConflictDto,
  StudentConflictDto,
} from '../dto/schedule-conflict.dto';
import {
  areIntervalsOverlapping,
  parse,
  addMinutes,
  startOfWeek,
  addDays,
} from 'date-fns';
import { TimezoneService } from '@/shared/common/services/timezone.service';

@Injectable()
export class ScheduleService extends BaseService {
  constructor(
    private readonly classesRepository: ClassesRepository,
    private readonly groupStudentsRepository: GroupStudentsRepository,
  ) {
    super();
  }

  /**
   * Validates schedule items for overlaps.
   * Format and type validations are handled by DTO validators.
   *
   * @param items - Array of schedule items to validate
   * @param duration - Duration in minutes (from class)
   * @throws BusinessLogicException if items have overlaps
   */
  validateScheduleItems(items: ScheduleItemDto[], duration: number): void {
    const getReferenceDateForDay = (day: DayOfWeek): Date => {
      // Use timezone-aware anchor date for weekly pattern validation
      // This ensures validation uses center's calendar day, not server's
      const zonedNow = TimezoneService.getZonedNowFromContext();
      // Convert zoned date back to Date object for date-fns operations
      const weekStart = startOfWeek(zonedNow, { weekStartsOn: 1 });
      const dayMap: Record<DayOfWeek, number> = {
        [DayOfWeek.MON]: 0,
        [DayOfWeek.TUE]: 1,
        [DayOfWeek.WED]: 2,
        [DayOfWeek.THU]: 3,
        [DayOfWeek.FRI]: 4,
        [DayOfWeek.SAT]: 5,
        [DayOfWeek.SUN]: 6,
      };
      return addDays(weekStart, dayMap[day]);
    };

    const itemsByDay = new Map<DayOfWeek, ScheduleItemDto[]>();
    for (const item of items) {
      const dayItems = itemsByDay.get(item.day) || [];
      dayItems.push(item);
      itemsByDay.set(item.day, dayItems);
    }

    for (const [day, dayItems] of itemsByDay.entries()) {
      const referenceDate = getReferenceDateForDay(day);

      const createInterval = (item: ScheduleItemDto) => {
        const start = parse(item.startTime, 'HH:mm', referenceDate);
        return { start, end: addMinutes(start, duration) };
      };

      for (let i = 0; i < dayItems.length; i++) {
        const interval1 = createInterval(dayItems[i]);
        for (let j = i + 1; j < dayItems.length; j++) {
          if (areIntervalsOverlapping(interval1, createInterval(dayItems[j]))) {
            throw new BusinessLogicException('t.messages.validationFailed');
          }
        }
      }
    }
  }

  /**
   * Check for teacher schedule conflicts across all groups.
   * Returns structured conflict data with teacher information and all conflicts.
   *
   * @param teacherUserProfileId - The teacher's user profile ID
   * @param scheduleItems - New schedule items to check for conflicts
   * @param duration - Duration in minutes (from class)
   * @param excludeGroupIds - Optional group IDs to exclude from conflict check
   * @returns Teacher conflict data with all conflicts, or null if no conflicts
   */
  async checkTeacherScheduleConflicts(
    teacherUserProfileId: string,
    scheduleItems: ScheduleItemDto[],
    duration: number,
    excludeGroupIds?: string[],
  ): Promise<TeacherConflictDto | null> {
    const items = this.mapScheduleItemsWithDuration(scheduleItems, duration);

    return await this.classesRepository.findAllTeacherScheduleConflictsForDurationUpdate(
      teacherUserProfileId,
      items,
      excludeGroupIds,
    );
  }

  /**
   * Check for student schedule conflicts across all groups.
   * Returns structured conflict data for all students with conflicts.
   *
   * @param studentIds - Array of student user profile IDs to check
   * @param scheduleItems - New schedule items to check for conflicts
   * @param duration - Duration in minutes (from class)
   * @param excludeGroupIds - Optional group IDs to exclude from conflict check
   * @returns Array of student conflict data, each with student info and their conflicts
   */
  async checkStudentScheduleConflicts(
    studentIds: string[],
    scheduleItems: ScheduleItemDto[],
    duration: number,
    excludeGroupIds?: string[],
  ): Promise<StudentConflictDto[]> {
    const items = this.mapScheduleItemsWithDuration(scheduleItems, duration);

    return await this.groupStudentsRepository.findAllStudentScheduleConflictsForDurationUpdate(
      studentIds,
      items,
      excludeGroupIds,
    );
  }

  /**
   * Validates schedule items and checks for conflicts with teachers and/or students.
   * Teacher conflicts always throw errors (blocking).
   * Student conflicts throw errors unless skipWarning is true (non-blocking).
   *
   * @param scheduleItems - Schedule items to validate and check for conflicts
   * @param duration - Duration in minutes (from class)
   * @param options - Options for conflict checking
   * @param options.teacherUserProfileId - Optional teacher ID to check conflicts for
   * @param options.studentIds - Optional array of student IDs to check conflicts for
   * @param options.excludeGroupIds - Optional group IDs to exclude from conflict check
   * @param options.skipWarning - If true, student conflicts are silently skipped (not logged, not thrown)
   * @throws ScheduleConflictException if teacher conflicts are detected, or if student conflicts are detected and skipWarning is false/undefined
   */
  async validateScheduleConflicts(
    scheduleItems: ScheduleItemDto[],
    duration: number,
    options: {
      teacherUserProfileId?: string;
      studentIds?: string[];
      excludeGroupIds?: string[];
      skipWarning?: boolean;
    },
  ): Promise<void> {
    this.validateScheduleItems(scheduleItems, duration);

    const details: ErrorDetail[] = [];

    // Check teacher conflicts - always throw if found (blocking)
    if (options.teacherUserProfileId) {
      const teacherConflict = await this.checkTeacherScheduleConflicts(
        options.teacherUserProfileId,
        scheduleItems,
        duration,
        options.excludeGroupIds,
      );

      if (teacherConflict) {
        details.push({
          field: 'teacher',
          value: teacherConflict,
          message: {
            key: 't.messages.validationFailed',
            args: {},
          } as TranslationMessage,
        });
      }
    }

    // Check student conflicts - only throw if skipWarning is false/undefined
    if (options.studentIds && options.studentIds.length > 0) {
      const studentConflicts = await this.checkStudentScheduleConflicts(
        options.studentIds,
        scheduleItems,
        duration,
        options.excludeGroupIds,
      );

      if (studentConflicts.length > 0) {
        // If skipWarning is true, silently skip student conflicts (don't add to details)
        if (!options.skipWarning) {
          details.push(
            ...studentConflicts.map((conflict) => ({
              field: 'student',
              value: conflict,
              message: {
                key: 't.messages.validationFailed',
                args: {},
              } as TranslationMessage,
            })),
          );
        }
      }
    }

    // Throw if there are any conflicts (teacher conflicts always included, student conflicts only if skipWarning is false)
    if (details.length > 0) {
      throw new ScheduleConflictException(
        't.messages.validationFailed',
        details,
      );
    }
  }

  /**
   * Map schedule items to include duration for repository queries.
   */
  private mapScheduleItemsWithDuration(
    scheduleItems: ScheduleItemDto[],
    duration: number,
  ): Array<{ day: string; startTime: string; duration: number }> {
    return scheduleItems.map((item) => ({
      day: item.day,
      startTime: item.startTime,
      duration,
    }));
  }
}
