import { Injectable } from '@nestjs/common';
import { BusinessLogicException } from '@/shared/common/exceptions/custom.exceptions';
import { ScheduleItemDto } from '../dto/schedule-item.dto';
import { DayOfWeek } from '../enums/day-of-week.enum';
import { BaseService } from '@/shared/common/services/base.service';
import { ClassesRepository } from '../repositories/classes.repository';
import { GroupStudentsRepository } from '../repositories/group-students.repository';

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
   * @throws BusinessLogicException if items are empty, invalid format, or have overlaps
   */
  validateScheduleItems(items: ScheduleItemDto[]): void {
    if (!items || items.length === 0) {
      throw new BusinessLogicException('t.errors.validationFailed', {
        reason: 'Schedule items are required',
      });
    }

    // Validate each item
    for (const item of items) {
      this.validateScheduleItem(item);
    }

    // Check for overlaps
    this.checkOverlaps(items);
  }

  private validateScheduleItem(item: ScheduleItemDto): void {
    // Validate day
    if (!Object.values(DayOfWeek).includes(item.day)) {
      throw new BusinessLogicException('t.errors.validationFailed', {
        reason: `Invalid day: ${item.day}`,
      });
    }

    // Validate time format
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(item.startTime) || !timeRegex.test(item.endTime)) {
      throw new BusinessLogicException('t.errors.validationFailed', {
        reason: 'Time must be in HH:mm format',
      });
    }

    // Validate startTime < endTime
    const [startHours, startMinutes] = item.startTime.split(':').map(Number);
    const [endHours, endMinutes] = item.endTime.split(':').map(Number);
    const startTotal = startHours * 60 + startMinutes;
    const endTotal = endHours * 60 + endMinutes;

    if (startTotal >= endTotal) {
      throw new BusinessLogicException('t.errors.validationFailed', {
        reason: 'Start time must be before end time',
      });
    }
  }

  private checkOverlaps(items: ScheduleItemDto[]): void {
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
          if (this.itemsOverlap(dayItems[i], dayItems[j])) {
            throw new BusinessLogicException('t.errors.validationFailed', {
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
  ): boolean {
    const [start1Hours, start1Minutes] = item1.startTime.split(':').map(Number);
    const [end1Hours, end1Minutes] = item1.endTime.split(':').map(Number);
    const start1Total = start1Hours * 60 + start1Minutes;
    const end1Total = end1Hours * 60 + end1Minutes;

    const [start2Hours, start2Minutes] = item2.startTime.split(':').map(Number);
    const [end2Hours, end2Minutes] = item2.endTime.split(':').map(Number);
    const start2Total = start2Hours * 60 + start2Minutes;
    const end2Total = end2Hours * 60 + end2Minutes;

    // Check if they overlap
    return start1Total < end2Total && start2Total < end1Total;
  }

  checkScheduleConflicts(groupId: string, items: ScheduleItemDto[]): void {
    // This can be extended to check conflicts with other groups
    // For now, just validate the items themselves
    this.validateScheduleItems(items);
  }

  /**
   * Check if two schedule items overlap (public method for external use)
   */
  scheduleItemsOverlap(
    item1: ScheduleItemDto,
    item2: ScheduleItemDto,
  ): boolean {
    return this.itemsOverlap(item1, item2);
  }

  /**
   * Check for teacher schedule conflicts across all groups.
   * Validates that a teacher's new schedule items don't overlap with existing schedules
   * in other groups they're assigned to.
   *
   * @param teacherUserProfileId - The teacher's user profile ID
   * @param scheduleItems - New schedule items to check for conflicts
   * @param excludeGroupId - Optional group ID to exclude from conflict check (for updates)
   * @throws BusinessLogicException if a schedule conflict is detected
   */
  async checkTeacherScheduleConflicts(
    teacherUserProfileId: string,
    scheduleItems: ScheduleItemDto[],
    excludeGroupId?: string,
  ): Promise<void> {
    const items = scheduleItems.map((item) => ({
      day: item.day,
      startTime: item.startTime,
      endTime: item.endTime,
    }));

    const conflict = await this.classesRepository.hasTeacherScheduleConflict(
      teacherUserProfileId,
      items,
      excludeGroupId,
    );

    if (conflict.hasConflict) {
      throw new BusinessLogicException('t.errors.validationFailed', {
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
   * @param excludeGroupId - Optional group ID to exclude from conflict check (for updates)
   * @throws BusinessLogicException if a schedule conflict is detected
   */
  async checkStudentScheduleConflicts(
    studentUserProfileId: string,
    newGroupScheduleItems: ScheduleItemDto[],
    excludeGroupId?: string,
  ): Promise<void> {
    const items = newGroupScheduleItems.map((item) => ({
      day: item.day,
      startTime: item.startTime,
      endTime: item.endTime,
    }));

    const conflict =
      await this.groupStudentsRepository.hasStudentScheduleConflict(
        studentUserProfileId,
        items,
        excludeGroupId,
      );

    if (conflict.hasConflict) {
      throw new BusinessLogicException('t.errors.studentScheduleConflict', {
        day: conflict.conflictDay || 'unknown',
        time: conflict.conflictTime || 'unknown',
      });
    }
  }
}
