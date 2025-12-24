import { Injectable } from '@nestjs/common';
import { ScheduleItemsRepository } from '../repositories/schedule-items.repository';
import { ScheduleItemDto } from '../dto/schedule-item.dto';
import { BaseService } from '@/shared/common/services/base.service';
import { ScheduleItem } from '../entities/schedule-item.entity';
import { GroupsRepository } from '../repositories/groups.repository';

@Injectable()
export class GroupScheduleService extends BaseService {
  constructor(
    private readonly scheduleItemsRepository: ScheduleItemsRepository,
    private readonly groupsRepository: GroupsRepository,
  ) {
    super();
  }

  /**
   * Updates schedule items for a group using a smart diff-based approach.
   * Compares old vs new items and performs update/create/delete operations as needed.
   *
   * @param groupId - The group ID
   * @param scheduleItems - New schedule items to set
   * @returns Object containing old and new schedule items
   */
  async updateScheduleItems(
    groupId: string,
    scheduleItems: ScheduleItemDto[],
  ): Promise<{ oldItems: ScheduleItem[]; newItems: ScheduleItem[] }> {
    // Fetch old items and group metadata
    const oldItems = await this.scheduleItemsRepository.findByGroupId(groupId);
    const group = await this.groupsRepository.findByIdOrThrow(groupId);

    // Create maps for efficient comparison
    // Key: `${day}-${startTime}` (unique identifier for schedule items)
    const oldItemsMap = new Map<string, ScheduleItem>();
    for (const item of oldItems) {
      const key = `${item.day}-${item.startTime}`;
      oldItemsMap.set(key, item);
    }

    const newItemsMap = new Map<string, ScheduleItemDto>();
    for (const item of scheduleItems) {
      const key = `${item.day}-${item.startTime}`;
      newItemsMap.set(key, item);
    }

    // Determine which items to update, create, and delete
    const itemsToUpdate: Array<{ item: ScheduleItem; dto: ScheduleItemDto }> =
      [];
    const itemsToCreate: ScheduleItemDto[] = [];
    const itemsToDelete: ScheduleItem[] = [];

    // Find items to update (exist in both old and new)
    for (const [key, dto] of newItemsMap.entries()) {
      const oldItem = oldItemsMap.get(key);
      if (oldItem) {
        // Item exists in both - check if it needs updating
        // Since schedule items only have day and startTime (no other mutable fields),
        // we don't need to update if they match
        // But we'll keep the logic for future extensibility
        itemsToUpdate.push({ item: oldItem, dto });
      } else {
        // Item is new
        itemsToCreate.push(dto);
      }
    }

    // Find items to delete (exist in old but not in new)
    for (const [key, oldItem] of oldItemsMap.entries()) {
      if (!newItemsMap.has(key)) {
        itemsToDelete.push(oldItem);
      }
    }

    // Perform delete operations
    if (itemsToDelete.length > 0) {
      const idsToDelete = itemsToDelete.map((item) => item.id);
      await this.scheduleItemsRepository.deleteByIds(idsToDelete);
    }

    // Perform create operations
    if (itemsToCreate.length > 0) {
      await this.scheduleItemsRepository.bulkCreate(
        groupId,
        group.classId,
        group.centerId,
        group.branchId,
        itemsToCreate,
      );
    }

    // Note: Items that match exactly don't need updating since day and startTime are the only fields
    // If we add more mutable fields in the future, we would update them here

    // Fetch new items after all operations
    const newItems = await this.scheduleItemsRepository.findByGroupId(groupId);

    return { oldItems, newItems };
  }

  /**
   * Creates schedule items for a group.
   * Fetches group metadata (classId, centerId, branchId) from the group entity.
   *
   * @param groupId - The group ID
   * @param scheduleItems - Schedule items to create
   * @returns Promise that resolves when creation is complete
   */
  async createScheduleItems(
    groupId: string,
    scheduleItems: ScheduleItemDto[],
  ): Promise<void> {
    // Fetch group to get metadata (classId, centerId, branchId are denormalized columns)
    const group = await this.groupsRepository.findByIdOrThrow(groupId);

    await this.scheduleItemsRepository.bulkCreate(
      groupId,
      group.classId,
      group.centerId,
      group.branchId,
      scheduleItems,
    );
  }
}
