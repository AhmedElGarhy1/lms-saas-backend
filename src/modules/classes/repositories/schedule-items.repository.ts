import { Injectable } from '@nestjs/common';
import { ScheduleItem } from '../entities/schedule-item.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { ScheduleItemDto } from '../dto/schedule-item.dto';

@Injectable()
export class ScheduleItemsRepository extends BaseRepository<ScheduleItem> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof ScheduleItem {
    return ScheduleItem;
  }

  async findByGroupId(groupId: string): Promise<ScheduleItem[]> {
    return this.getRepository().find({
      where: { groupId },
      order: { day: 'ASC', startTime: 'ASC' },
    });
  }

  async bulkCreate(
    groupId: string,
    items: ScheduleItemDto[],
  ): Promise<ScheduleItem[]> {
    const scheduleItems = items.map((item) =>
      this.getRepository().create({
        ...item,
        groupId,
      }),
    );
    return this.getRepository().save(scheduleItems);
  }

  /**
   * Delete all schedule items for a given group ID.
   * Pure data access method - no business logic.
   *
   * @param groupId - The group ID
   * @returns Promise that resolves when deletion is complete
   */
  async deleteByGroupId(groupId: string): Promise<void> {
    await this.getRepository().delete({ groupId });
  }
}
