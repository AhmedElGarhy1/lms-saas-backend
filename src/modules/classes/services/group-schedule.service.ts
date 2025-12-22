import { Injectable } from '@nestjs/common';
import { ScheduleItemsRepository } from '../repositories/schedule-items.repository';
import { ScheduleItemDto } from '../dto/schedule-item.dto';
import { BaseService } from '@/shared/common/services/base.service';
import { ScheduleItem } from '../entities/schedule-item.entity';

@Injectable()
export class GroupScheduleService extends BaseService {
  constructor(
    private readonly scheduleItemsRepository: ScheduleItemsRepository,
  ) {
    super();
  }

  /**
   * Updates schedule items for a group (delete then create pattern).
   * This ensures atomic replacement of all schedule items.
   *
   * @param groupId - The group ID
   * @param scheduleItems - New schedule items to set
   * @returns Object containing old and new schedule items
   */
  async updateScheduleItems(
    groupId: string,
    scheduleItems: ScheduleItemDto[],
  ): Promise<{ oldItems: ScheduleItem[]; newItems: ScheduleItem[] }> {
    // Fetch old items before deletion
    const oldItems = await this.scheduleItemsRepository.findByGroupId(groupId);

    // Delete then create pattern for atomic replacement
    await this.scheduleItemsRepository.deleteByGroupId(groupId);
    await this.scheduleItemsRepository.bulkCreate(groupId, scheduleItems);

    // Fetch new items after creation
    const newItems = await this.scheduleItemsRepository.findByGroupId(groupId);

    return { oldItems, newItems };
  }

  /**
   * Creates schedule items for a group.
   *
   * @param groupId - The group ID
   * @param scheduleItems - Schedule items to create
   * @returns Promise that resolves when creation is complete
   */
  async createScheduleItems(
    groupId: string,
    scheduleItems: ScheduleItemDto[],
  ): Promise<void> {
    await this.scheduleItemsRepository.bulkCreate(groupId, scheduleItems);
  }
}
