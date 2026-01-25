import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { ScheduleItem } from '../entities/schedule-item.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { ScheduleItemDto } from '../dto/schedule-item.dto';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { GroupsRepository } from './groups.repository';
import { ClassAccessService } from '../services/class-access.service';
import { ClassStaffAccessDto } from '../dto/class-staff-access.dto';

@Injectable()
export class ScheduleItemsRepository extends BaseRepository<ScheduleItem> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly groupsRepository: GroupsRepository,
    @Inject(forwardRef(() => ClassAccessService))
    private readonly classAccessService: ClassAccessService,
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
    classId: string,
    centerId: string,
    branchId: string,
    items: ScheduleItemDto[],
  ): Promise<ScheduleItem[]> {
    const scheduleItems = items.map((item) =>
      this.getRepository().create({
        ...item,
        groupId,
        classId,
        centerId,
        branchId,
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

  /**
   * Delete schedule items by their IDs.
   * Pure data access method - no business logic.
   *
   * @param ids - Array of schedule item IDs to delete
   * @returns Promise that resolves when deletion is complete
   */
  async deleteByIds(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    await this.getRepository().delete(ids);
  }

  /**
   * Get all schedule items.
   * @returns Promise that resolves when retrieval is complete
   */
  async getMany(
    {
      teacherProfileId,
      centerId,
      groupId,
      classId,
    }: {
      teacherProfileId?: string;
      centerId?: string;
      groupId?: string;
      classId?: string;
    },
    actor: ActorUser,
  ): Promise<ScheduleItem[]> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('scheduleItem')
      // Join relations to check if they're deleted
      .leftJoin('scheduleItem.group', 'group')
      .leftJoin('scheduleItem.class', 'class')
      .leftJoin('scheduleItem.branch', 'branch')
      .leftJoin('scheduleItem.center', 'center');

    if (teacherProfileId) {
      queryBuilder.where('scheduleItem.teacherProfileId = :teacherProfileId', {
        teacherProfileId,
      });
    }
    if (centerId) {
      await this.accessControlHelperService.validateCenterAccess({
        userProfileId: actor.userProfileId,
        centerId,
      });
      queryBuilder.where('scheduleItem.centerId = :centerId', { centerId });
    }
    if (groupId) {
      // Validate group access by fetching the group and validating class access
      const group = await this.groupsRepository.findByIdOrThrow(groupId, [
        'class',
      ]);
      await this.classAccessService.validateClassAccess({
        userProfileId: actor.userProfileId,
        classId: group.classId,
      } as ClassStaffAccessDto);
      queryBuilder.where('scheduleItem.groupId = :groupId', { groupId });
    }
    if (classId) {
      // Validate class access
      await this.classAccessService.validateClassAccess({
        userProfileId: actor.userProfileId,
        classId,
      } as ClassStaffAccessDto);
      queryBuilder.where('scheduleItem.classId = :classId', { classId });
    }

    // Filter out schedule items where related entities are deleted (check if entity exists)
    queryBuilder
      .andWhere('group.id IS NOT NULL')
      .andWhere('class.id IS NOT NULL')
      .andWhere('branch.id IS NOT NULL')
      .andWhere('center.id IS NOT NULL');

    return queryBuilder.getMany();
  }
}
