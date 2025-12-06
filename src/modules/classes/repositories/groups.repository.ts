import { Injectable } from '@nestjs/common';
import { Group } from '../entities/group.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { PaginateGroupsDto } from '../dto/paginate-groups.dto';
import { Pagination } from '@/shared/common/types/pagination.types';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { GroupStudent } from '../entities/group-student.entity';

@Injectable()
export class GroupsRepository extends BaseRepository<Group> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof Group {
    return Group;
  }

  async paginateGroups(
    paginateDto: PaginateGroupsDto,
    centerId: string,
  ): Promise<Pagination<Group>> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('group')
      // Join relations for id and name fields only (not full entities)
      .leftJoin('group.class', 'class')
      .leftJoin('group.branch', 'branch')
      .leftJoin('group.center', 'center')
      // Load full scheduleItems
      .leftJoinAndSelect('group.scheduleItems', 'scheduleItems')
      // Add id and name fields as selections
      .addSelect([
        'class.id',
        'class.name',
        'branch.id',
        'branch.location',
        'center.id',
        'center.name',
      ])
      // Add student count subquery
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(groupStudentsForCount.id)', 'studentsCount')
            .from(GroupStudent, 'groupStudentsForCount')
            .where('groupStudentsForCount.groupId = group.id')
            .andWhere('groupStudentsForCount.deletedAt IS NULL'),
        'studentsCount',
      )
      .where('group.centerId = :centerId', { centerId });

    if (paginateDto.classId) {
      queryBuilder.andWhere('group.classId = :classId', {
        classId: paginateDto.classId,
      });
    }

    if (paginateDto.branchId) {
      queryBuilder.andWhere('group.branchId = :branchId', {
        branchId: paginateDto.branchId,
      });
    }

    return this.paginate(
      paginateDto,
      {
        searchableColumns: ['name'],
        sortableColumns: ['name', 'createdAt', 'updatedAt'],
        defaultSortBy: ['createdAt', 'DESC'],
      },
      'groups',
      queryBuilder,
      {
        includeComputedFields: true,
        computedFieldsMapper: (entity: Group, raw: any) => {
          // Map computed student count from raw data
          const studentsCount = parseInt(raw.studentsCount || '0', 10);

          // Return entity with computed field added
          return {
            ...entity,
            studentsCount,
          } as any;
        },
      },
    );
  }

  async findGroupWithRelations(id: string): Promise<Group | null> {
    const queryBuilder = this.getRepository()
      .createQueryBuilder('group')
      // Join relations for id and name fields only (not full entities)
      .leftJoin('group.class', 'class')
      .leftJoin('group.branch', 'branch')
      .leftJoin('group.center', 'center')
      // Load full scheduleItems
      .leftJoinAndSelect('group.scheduleItems', 'scheduleItems')
      // Add id and name fields as selections
      .addSelect([
        'class.id',
        'class.name',
        'branch.id',
        'branch.location',
        'center.id',
        'center.name',
      ])
      // Add student count subquery
      .addSelect(
        (subQuery) =>
          subQuery
            .select('COUNT(groupStudentsForCount.id)', 'studentsCount')
            .from(GroupStudent, 'groupStudentsForCount')
            .where('groupStudentsForCount.groupId = group.id')
            .andWhere('groupStudentsForCount.deletedAt IS NULL'),
        'studentsCount',
      )
      .where('group.id = :id', { id })
      .andWhere('group.deletedAt IS NULL');

    const { entities, raw } = await queryBuilder.getRawAndEntities();

    if (!entities || entities.length === 0) {
      return null;
    }

    const entity = entities[0];
    const rawData = raw[0];

    // Map computed student count from raw data
    const studentsCount = parseInt(rawData.studentsCount || '0', 10);

    // Return entity with computed field added
    return {
      ...entity,
      studentsCount,
    } as any;
  }

  /**
   * Find all groups for a given class ID.
   * Pure data access method - no business logic.
   *
   * @param classId - The class ID
   * @returns Array of groups
   */
  async findGroupsByClassId(classId: string): Promise<Group[]> {
    return this.getRepository().find({
      where: { classId },
    });
  }

  /**
   * Find all groups for a given class ID with schedule items and students loaded.
   * Repository decides which relations to load - service layer doesn't specify relations.
   * Pure data access method - no business logic.
   *
   * @param classId - The class ID
   * @returns Array of groups with scheduleItems and groupStudents relations loaded
   */
  async findGroupsByClassIdWithScheduleAndStudents(
    classId: string,
  ): Promise<Group[]> {
    return this.getRepository().find({
      where: { classId },
      relations: ['scheduleItems', 'groupStudents'],
    });
  }
}
