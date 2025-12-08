import { Injectable } from '@nestjs/common';
import { BusinessLogicException } from '@/shared/common/exceptions/custom.exceptions';
import { ScheduleItemDto } from '../dto/schedule-item.dto';
import { DayOfWeek } from '../enums/day-of-week.enum';
import { BaseService } from '@/shared/common/services/base.service';
import { ClassesRepository } from '../repositories/classes.repository';
import { GroupStudentsRepository } from '../repositories/group-students.repository';
import {
  calculateEndTime,
  isEndTimeWithinSameDay,
} from '../utils/time-calculator.util';

@Injectable()
export class ScheduleService extends BaseService {
  constructor(
    private readonly classesRepository: ClassesRepository,
    private readonly groupStudentsRepository: GroupStudentsRepository,
  ) {
    super();
  }

  /**
   * Validates schedule items for format, time ranges, and overlaps.
   *
   * @param items - Array of schedule items to validate
   * @param duration - Duration in minutes (from class)
   * @throws BusinessLogicException if items are empty, invalid format, or have overlaps
   */
  validateScheduleItems(items: ScheduleItemDto[], duration: number): void {
    if (!items || items.length === 0) {
      throw new BusinessLogicException('t.messages.validationFailed', {
        reason: 'Schedule items are required',
      });
    }

    // Validate each item
    for (const item of items) {
      this.validateScheduleItem(item, duration);
    }

    // Check for overlaps
    this.checkOverlaps(items, duration);
  }

  private validateScheduleItem(item: ScheduleItemDto, duration: number): void {
    // Validate day
    if (!Object.values(DayOfWeek).includes(item.day)) {
      throw new BusinessLogicException('t.messages.validationFailed', {
        reason: `Invalid day: ${item.day}`,
      });
    }

    // Validate time format
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(item.startTime)) {
      throw new BusinessLogicException('t.messages.validationFailed', {
        reason: 'Start time must be in HH:mm format',
      });
    }

    // Validate duration
    if (!duration || duration <= 0) {
      throw new BusinessLogicException('t.messages.validationFailed', {
        reason: 'Duration must be a positive number',
      });
    }

    // Validate that end time doesn't exceed 24:00 (same-day validation)
    if (!isEndTimeWithinSameDay(item.startTime, duration)) {
      throw new BusinessLogicException('t.messages.validationFailed', {
        reason: 'Schedule item end time exceeds 24:00',
      });
    }
  }

  private checkOverlaps(items: ScheduleItemDto[], duration: number): void {
    // Group by day
    const itemsByDay = new Map<DayOfWeek, ScheduleItemDto[]>();
    for (const item of items) {
      if (!itemsByDay.has(item.day)) {
        itemsByDay.set(item.day, []);
      }
      itemsByDay.get(item.day)!.push(item);
    }

    // Check overlaps for each day
    for (const [day, dayItems] of itemsByDay.entries()) {
      for (let i = 0; i < dayItems.length; i++) {
        for (let j = i + 1; j < dayItems.length; j++) {
          if (this.itemsOverlap(dayItems[i], dayItems[j], duration)) {
            throw new BusinessLogicException('t.messages.validationFailed', {
              reason: `Overlapping time slots on ${day}`,
            });
          }
        }
      }
    }
  }

  private itemsOverlap(
    item1: ScheduleItemDto,
    item2: ScheduleItemDto,
    duration: number,
  ): boolean {
    const [start1Hours, start1Minutes] = item1.startTime.split(':').map(Number);
    const start1Total = start1Hours * 60 + start1Minutes;
    const end1Total = start1Total + duration;

    const [start2Hours, start2Minutes] = item2.startTime.split(':').map(Number);
    const start2Total = start2Hours * 60 + start2Minutes;
    const end2Total = start2Total + duration;

    // Check if they overlap: start1 < end2 AND start2 < end1
    return start1Total < end2Total && start2Total < end1Total;
  }

  checkScheduleConflicts(
    groupId: string,
    items: ScheduleItemDto[],
    duration: number,
  ): void {
    // This can be extended to check conflicts with other groups
    // For now, just validate the items themselves
    this.validateScheduleItems(items, duration);
  }

  /**
   * Check if two schedule items overlap (public method for external use)
   */
  scheduleItemsOverlap(
    item1: ScheduleItemDto,
    item2: ScheduleItemDto,
    duration: number,
  ): boolean {
    return this.itemsOverlap(item1, item2, duration);
  }

  /**
   * Check for teacher schedule conflicts across all groups.
   * Validates that a teacher's new schedule items don't overlap with existing schedules
   * in other groups they're assigned to.
   *
   * @param teacherUserProfileId - The teacher's user profile ID
   * @param scheduleItems - New schedule items to check for conflicts
   * @param duration - Duration in minutes (from class)
   * @param excludeGroupIds - Optional group ID(s) to exclude from conflict check (for updates)
   * @throws BusinessLogicException if a schedule conflict is detected
   */
  async checkTeacherScheduleConflicts(
    teacherUserProfileId: string,
    scheduleItems: ScheduleItemDto[],
    duration: number,
    excludeGroupIds?: string | string[],
  ): Promise<void> {
    const items = scheduleItems.map((item) => ({
      day: item.day,
      startTime: item.startTime,
      duration,
    }));

    // Normalize to array for repository method
    const groupIdsArray = excludeGroupIds
      ? Array.isArray(excludeGroupIds)
        ? excludeGroupIds
        : [excludeGroupIds]
      : undefined;

    // Get conflict data from repository (pure data access)
    const conflict = await this.classesRepository.findTeacherScheduleConflicts(
      teacherUserProfileId,
      items,
      groupIdsArray,
    );

    // Business logic: interpret the data and throw exception if conflict exists
    if (conflict) {
      throw new BusinessLogicException('t.messages.validationFailed', {
        reason: `Teacher has a schedule conflict on ${conflict.conflictDay} at ${conflict.conflictTime}`,
      });
    }
  }

  /**
   * Check for student schedule conflicts across all groups.
   * Validates that a student's new schedule items don't overlap with existing schedules
   * in other groups they're assigned to.
   *
   * @param studentUserProfileId - The student's user profile ID
   * @param newGroupScheduleItems - New schedule items from the group being assigned
   * @param duration - Duration in minutes (from class)
   * @param excludeGroupIds - Optional group ID(s) to exclude from conflict check (for updates)
   * @throws BusinessLogicException if a schedule conflict is detected
   */
  async checkStudentScheduleConflicts(
    studentUserProfileId: string,
    newGroupScheduleItems: ScheduleItemDto[],
    duration: number,
    excludeGroupIds?: string | string[],
  ): Promise<void> {
    const items = newGroupScheduleItems.map((item) => ({
      day: item.day,
      startTime: item.startTime,
      duration,
    }));

    // Normalize to array for repository method
    const groupIdsArray = excludeGroupIds
      ? Array.isArray(excludeGroupIds)
        ? excludeGroupIds
        : [excludeGroupIds]
      : undefined;

    // Get conflict data from repository (pure data access)
    const conflict =
      await this.groupStudentsRepository.findStudentScheduleConflicts(
        studentUserProfileId,
        items,
        groupIdsArray,
      );

    // Business logic: interpret the data and throw exception if conflict exists
    if (conflict) {
      throw new BusinessLogicException('t.messages.validationFailed', {
        reason: `Student has a schedule conflict on ${conflict.conflictDay || 'unknown'} at ${conflict.conflictTime || 'unknown'}`,
      });
    }
  }
}
